import os
import json
from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__, static_folder='static', template_folder='templates')

# Read API key and model from environment
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

if not GEMINI_API_KEY:
    # Render पर, आपको यह कुंजी Environment Variables या Secret Files में सेट करनी होगी।
    raise RuntimeError("GEMINI_API_KEY environment variable not set")

# Helper to call Gemini / Generative Language API (REST)
def call_gemini_generate(prompt_text, max_output_tokens=220, temperature=0.9): # max_output_tokens increased
    """
    Uses Google Generative Language endpoint to generate text.
    """
    # Gemini API के लिए सही endpoint
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

    headers = {
        "Content-Type": "application/json",
        # API key को header में उपयोग करना सही है (x-goog-api-key)
        "x-goog-api-key": GEMINI_API_KEY
    }

    # FIX 1: API Payload का सही फॉर्मेट
    body = {
        "contents": [{
            "parts": [{"text": prompt_text}]
        }],
        "config": {
            "maxOutputTokens": max_output_tokens,
            "temperature": temperature
        }
    }

    resp = requests.post(endpoint, headers=headers, json=body, timeout=30)
    resp.raise_for_status() # HTTP error code (4xx, 5xx) होने पर exception उठाता है
    data = resp.json()

    # FIX 2: Gemini API response से text निकालने का सही और सरल तरीका
    text = None
    try:
        # Standard structure: data.candidates[0].content.parts[0].text
        candidate = data.get("candidates", [])[0]
        text = candidate.get("content", {}).get("parts", [])[0].get("text", "")
        
        # Check for block reason (अगर text नहीं मिला और finish reason STOP नहीं है)
        if not text and candidate.get("finishReason") != "STOP":
            return f"Error: Content was blocked due to safety settings or response length. Reason: {candidate.get('finishReason', 'UNKNOWN')}"

    except (IndexError, AttributeError, TypeError, KeyError):
        # Parsing में कोई भी Error आने पर raw data return करें
        return f"Error parsing response. Raw Data (Partial): {json.dumps(data, indent=2)[:500]}..."


    if not text:
        # अंतिम जाँच (Final check)
        return "Content generation returned no valid text."

    return text

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/generate", methods=["POST"])
def generate():
    payload = request.get_json() or {}
    prompt = payload.get("prompt", "")
    tone = payload.get("tone", "funny")  # optional tone param
    style = payload.get("style", "short")  # optional style param

    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    # Compose a user-facing prompt for Gemini
    composed = (
        f"You are an expert Instagram caption writer. Create 6 distinct, high-quality, English Instagram captions for this content. "
        f"Return each caption on a new line. Do not include numbering, bullet points, or any introductory commentary. "
        f"Topic/Description: {prompt}\n"
        f"Tone: {tone}\n"
        f"Style: {style} (e.g., Short, Detailed, With hashtags)"
    )

    try:
        # max_output_tokens को 220 कर दिया गया है ताकि 6 captions के लिए जगह हो
        gen_text = call_gemini_generate(composed, max_output_tokens=220, temperature=0.9)
        
        # अगर Error string return हुई है (safety block, parsing error, etc.)
        if gen_text.startswith(("Error:", "Content generation returned")):
            return jsonify({"error": gen_text}), 500
            
    except requests.HTTPError as e:
        return jsonify({"error": "API request failed", "details": f"HTTP Error: {e.response.status_code}. Please check your API key."}), 502
    except Exception as e:
        return jsonify({"error": "Unexpected server error", "details": str(e)}), 500

    # Split the output into lines and trim
    lines = [line.strip() for line in gen_text.splitlines() if line.strip()]
    
    # If only one long paragraph returned, try to split by sentences into multiple captions
    if len(lines) == 1:
        import re
        # Sentence splitting logic
        sentences = re.split(r'(?<=[.!?])\s+', lines[0])
        lines = [s.strip() for s in sentences if s.strip()][:6]

    # Limit to 6 captions
    captions = lines[:6] if lines else [gen_text] # Fallback to raw text if no lines found

    return jsonify({"captions": captions})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
