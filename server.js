import express from "express";
import multer from "multer";
import Tesseract from "tesseract.js";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());

const upload = multer({ dest: "uploads/" });

if (!process.env.GEMINI_API_KEY) {
  throw new Error("❌ GEMINI_API_KEY not defined in .env");
}
if (!process.env.GEMINI_PRO_API_KEY) {
  console.warn("⚠️ GEMINI_PRO_API_KEY missing — using GEMINI_API_KEY instead");
}

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiPro = new GoogleGenerativeAI(
  process.env.GEMINI_PRO_API_KEY || process.env.GEMINI_API_KEY
);

const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_PRO_MODEL = "gemini-2.0-flash";

const flashModel = ai.getGenerativeModel({ model: DEFAULT_MODEL });
const proModel = aiPro.getGenerativeModel({ model: DEFAULT_PRO_MODEL });

async function callGemini(model, prompt, exampleJson) {
  try {
    const fullPrompt = `
Perform the following action and respond ONLY with valid JSON (no markdown, no extra text).

PROMPT: ${prompt}

EXAMPLE OUTPUT FORMAT:
${JSON.stringify(exampleJson)}
`;

    const result = await model.generateContent(fullPrompt);

    const text =
      typeof result.response.text === "function"
        ? await result.response.text()
        : result.response.text;

    if (!text) throw new Error("Empty response from model.");

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1)
      throw new Error("No valid JSON block returned by model.");

    return JSON.parse(text.slice(start, end + 1));
  } catch (err) {
    console.error("[callGemini] Error:", err);
    throw new Error("Failed to get valid JSON from Gemini model.");
  }
}

app.post("/api/simplify-report", upload.single("reportImage"), async (req, res) => {
  console.log("\n--- NEW REQUEST RECEIVED ---");
  let rawText = "";
  const t1 = new Date();
  try {
    // 🧾 Step 1: Extract text (JSON / Text / Image)
    if (req.is("application/json")) {
      console.log("[Step 1] JSON input detected.");
      rawText = req.body.text;
    } else if (req.body && req.body.text) {
      console.log("[Step 1] Form text input detected.");
      rawText = req.body.text;
    } else if (req.file) {
      console.log("[Step 1] Image input detected. Running OCR...");
      const {
        data: { text },
      } = await Tesseract.recognize(req.file.path, "eng");
      rawText = text.trim();
      fs.unlink(req.file.path, (err) => err && console.error("File cleanup error:", err));
    }

    if (!rawText)
      return res.status(400).json({
        status: "error",
        message: "No text or image provided.",
      });

    console.log("--- Raw Extracted Text ---\n", rawText, "\n--------------------------");

    console.log("[Step 2+3] Extracting & normalizing test data...");
    const extractionNormalizationPrompt = `
From this medical report text, extract all test results, correct typos (e.g., "Hemglobin" → "Hemoglobin"), 
and normalize them into structured data with value, unit, status (low/normal/high), and reference range.

Text: "${rawText}"
`;

    const structuredData = await callGemini(proModel, extractionNormalizationPrompt, {
      tests: [
        {
          name: "Hemoglobin",
          value: 10.2,
          unit: "g/dL",
          status: "low",
          ref_range: { low: 12.0, high: 15.0 },
        },
      ],
    });

    if (!structuredData.tests?.length) {
      return res.status(400).json({
        status: "unprocessed",
        reason: "No valid medical tests found.",
      });
    }

    console.log("--- Structured Data ---", structuredData);

    console.log("[Step 4] Checking for hallucinated tests...");
    const originalText = rawText.toLowerCase();
    const hallucinated = structuredData.tests.filter(
      (t) => !originalText.includes(t.name.toLowerCase())
    );

    if (hallucinated.length > 0) {
      console.warn("[FAIL] Guardrail triggered: Hallucinated tests found!");
      return res.status(500).json({
        status: "unprocessed",
        reason: "AI generated tests not found in original text.",
      });
    }

    console.log("[Step 5] Generating summary...");
    const summaryPrompt = `
Create a simple, patient-friendly summary for these medical test results.
Do NOT give diagnosis — use cautious, plain-language explanations.
Tests: ${JSON.stringify(structuredData.tests)}
`;

    const summaryDataPromise = callGemini(flashModel, summaryPrompt, {
      summary: "Low hemoglobin and high white blood cell count.",
      explanations: [
        "Low hemoglobin may relate to anemia.",
        "High WBC can occur with infections.",
      ],
    });

    const summaryData = await summaryDataPromise;

    const finalResponse = {
      tests: structuredData.tests,
      summary: summaryData.summary,
      explanations: summaryData.explanations,
      status: "ok",
    };
    const t2 = new Date();
    console.log("[SUCCESS] Sending final processed response.", (t2-t1)/1000);
    res.json(finalResponse);
  } catch (error) {
    console.error("❌ Error during AI processing:", error);
    res.status(500).json({ status: "error", reason: error.message });
  }
});

app.listen(PORT, () =>
  console.log(`🩺 Medical Report Simplifier running on http://localhost:${PORT}`)
);
