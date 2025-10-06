🚀 Features

🧾 OCR (Tesseract.js) — Extract text from uploaded medical report images.

🤖 AI Processing (Gemini APIs) — Use Gemini Flash and Pro models for:

Test extraction and normalization

Patient-friendly summarization

🛡️ Guardrails — Detect and block hallucinated or fabricated test results.

🧠 Dual Model System — Pro model for structured extraction, Flash model for summary generation.

🧹 Auto-cleanup — Uploaded files are deleted after OCR extraction.


🧩 Architecture Overview

<img width="1024" height="1536" alt="ChatGPT Image Oct 6, 2025, 11_08_56 PM" src="https://github.com/user-attachments/assets/fe712302-7505-4f57-a18d-85c4e3286215" />



⚙️ Setup Instructions
1️⃣ Clone Repository
git clone https://github.com/<your-username>/medical-report-simplifier.git
cd medical-report-simplifier

2️⃣ Install Dependencies
npm install

3️⃣ Create .env File
touch .env


Add your Gemini API keys:

GEMINI_API_KEY=your_gemini_flash_api_key
GEMINI_PRO_API_KEY=your_gemini_pro_api_key
PORT=3000

4️⃣ Run Server
npm run server.js


Server should start at:
🩺 Medical Report Simplifier running on http://localhost:3000

📡 API Endpoints
1️⃣ GET /

Health check for deployment.

http://localhost:3000/

Response:

<h1>Backend is running</h1>

2️⃣ POST /api/simplify-report

Simplify a report (JSON or Image).

🧪 Option A: JSON Input
curl -X POST http://localhost:3000/api/simplify-report \
  -H "Content-Type: application/json" \
  -d '{"text": "CBC: Hemoglobin 10.2 g/dL (Low), WBC 11,200 /uL (High)"}'


🧪 Option B: Image Upload
curl -X POST http://localhost:3000/api/simplify-report \
  -F "reportImage=@sample_report.jpg"


✅ Response Example:

Same as JSON example — after OCR extraction.

🧠 Prompts Used & Refinements
From this medical report text, extract all test results. Correct obvious typos 
(e.g., "Hemglobin" → "Hemoglobin") and normalize the data into structured JSON 
including the following fields: test name, value, unit, status (low/normal/high), 
and reference range. 

Ensure that:
- Only tests mentioned in the input are returned.
- Numerical values are parsed correctly (e.g., "10.2 g/dL").
- Reference ranges are included when possible.
- The JSON output is valid and parseable.
- Supports both direct text input and OCR-extracted text from images.

✅ Refinement:

Corrected medical test typos

Added reference ranges

Filtered hallucinated or non-existent test names

🧩 Step 5: Summary Generation
Create a simple, patient-friendly summary for these medical test results.
Do NOT give diagnosis — use cautious, plain-language explanations.


✅ Refinement:

Avoids diagnostic claims

Keeps explanations simple and factual

Provides list-style explanations for clarity

🧠 Data & State Handling
Component	Responsibility
multer	Handles file upload (temporary storage in /uploads)
Tesseract.js	Converts uploaded image to text
Gemini Pro Model	Extracts structured data from text
Gemini Flash Model	Summarizes structured data
Guardrails	Validates that no hallucinated tests appear
fs	Deletes uploaded files after OCR

<img width="1437" height="997" alt="Screenshot 2025-10-06 224236" src="https://github.com/user-attachments/assets/9c4f453d-4b28-4964-8eb0-bb73c5995186" />
<img width="1442" height="947" alt="Screenshot 2025-10-06 224254" src="https://github.com/user-attachments/assets/271f6ba7-8aee-4fa0-8f66-45848734ebd3" />
<img width="1581" height="832" alt="image" src="https://github.com/user-attachments/assets/deeadab2-02ce-4f37-a911-8e1c1eba5025" />


Using Postman:

Postman Test (JSON Input)
Shows response with structured tests & summary.

Image Upload Example
Displays OCR extraction + AI-generated summary.

⚠️ Known Issues & Potential Improvements
Issue	Description	Potential Fix
⏱️ Latency	OCR + dual AI calls can take 10–15s	Use parallel model calls or caching
🧠 Gemini occasionally mislabels tests	Context refinement or regex-based post-validation	
🧾 OCR noise	Preprocess image (contrast, blur removal)	
🧬 Add multilingual OCR (Hindi, French, etc.)
📊 Include visual charts of test results
🧠 Introduce medical terminology glossary
