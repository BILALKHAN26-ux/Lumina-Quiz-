import os
import json
import random
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from pypdf import PdfReader
from google import genai
from google.genai import types

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize Gemini Client
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

def extract_text_from_pdf(file_stream):
    """Extracts raw text page by page from the uploaded PDF."""
    reader = PdfReader(file_stream)
    extracted_text = []
    for idx, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            extracted_text.append(f"[Page {idx + 1}]\n{text.strip()}")
    return "\n\n".join(extracted_text)

def generate_quiz_from_gemini(document_text):
    """Prompts Gemini with temperature and random chunk sampling to prevent duplicates."""
    max_chunk_length = 7000
    total_length = len(document_text)

    if total_length > max_chunk_length:
        max_start = total_length - max_chunk_length
        start_index = random.randint(0, max_start)
        selected_text = document_text[start_index : start_index + max_chunk_length]
    else:
        selected_text = document_text

    prompt = f"""
    You are an academic assessment engine. Based ONLY on the following textbook content, generate 5 UNIQUE and DIVERSE multiple-choice questions.
    Focus on different sub-topics, definitions, algorithms, or problem applications across the passage so questions do not repeat.

    For each question, provide 4 options, the exact correct answer, a detailed explanation, and the exact source quote directly taken from the text.

    Format your response STRICTLY as a JSON array matching this schema:
    [
      {{
        "id": 1,
        "question": "Question text here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Option B",
        "explanation": "Detailed explanation of why this answer is correct.",
        "source_quote": "Direct sentence or excerpt from the provided text verifying the answer."
      }}
    ]

    Textbook Content:
    {selected_text}
    """

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.85,
            top_p=0.95
        )
    )
    return json.loads(response.text)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/generate-quiz', methods=['POST'])
def process_pdf():
    if 'pdf' not in request.files:
        return jsonify({"error": "No file uploaded."}), 400

    file = request.files['pdf']
    filename = file.filename.lower()

    if not (filename.endswith('.pdf') or filename.endswith('.txt')):
        return jsonify({"error": "Please upload a valid .pdf or .txt file."}), 400

    try:
        if filename.endswith('.pdf'):
            parsed_text = extract_text_from_pdf(file.stream)
        else:
            parsed_text = file.stream.read().decode('utf-8', errors='ignore')

        if not parsed_text.strip():
            return jsonify({"error": "The uploaded file is empty or unreadable."}), 400

        quiz_data = generate_quiz_from_gemini(parsed_text)
        return jsonify({"quiz": quiz_data})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)