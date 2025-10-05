# app.py
import os
import json
from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__, static_folder='static', template_folder='templates')

# Read API key and model from environment
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY environment variable not set")

# Helper to call Gemini / Generative Language API (REST)
def call_gemini_generate(prompt_text, max_output_tokens=80, temperature=0.8):
    """
    Uses Google Generative Language endpoint to generate text.
    Uses x-goog-api-key header to authenticate with the API key stored server-side.
    """
    # Endpoint pattern (v1beta - example). Docs show generateContent / generate endpoint usage.
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

    headers = {
        "Content-Type": "application/json",
        # Use API key in header -- Google SDKs use x-goog-api-key header for API key usage.
        "x-goog-api-key": GEMINI_API_KEY
    }

    body = {
        "prompt": {
            "text": prompt_text
        },
        # Basic parameters (may be adjusted based on model support)
        "maxOutputTokens": max_output_tokens,
        "temperature": temperature
    }

    resp = requests.post(endpoint, headers=headers, json=body, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    # Response parsing: handle a few possible shapes. The official SDK returns structured fields.
    # Try to extract generated text robustly:
    text = None
    # common fields used by various doc examples:
    if isinstance(data, dict):
        # new-style responses often include 'candidates' or 'output'
        # check nested keys
        if "candidates" in data and isinstance(data["candidates"], list) and len(data["candidates"]) > 0:
            text = data["candidates"][0].get("output", None) or data["candidates"][0].get("content", None)
        elif "output" in data and isinstance(data["output"], list):
            # sometimes output is list of dicts with 'content' or 'text'
            contents = []
            for item in data["output"]:
                if isinstance(item, dict) and "content" in item:
                    # content may be a list of pieces or a string
                    content = item["content"]
                    if isinstance(content, list):
                        for c in content:
                            if isinstance(c, dict) and "text" in c:
                                contents.append(c["text"])
                            elif isinstance(c, str):
                                contents.append(c)
                    elif isinstance(content, str):
                        contents.append(content)
                elif isinstance(item, str):
                    contents.append(item)
            if contents:
                text = " ".join(contents)
        elif "generatedText" in data:
            text = data["generatedText"]
        else:
            # Try find first string value in response heuristically
            for v in data.values():
                if isinstance(v, str) and len(v) > 0:
                    text = v
                    break

    if not text:
        # fallback: pretty-print entire JSON for debugging (but normally won't be shown to end-user)
        text = json.dumps(data)[:1500]  # limit length

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
        f"You're an Instagram caption writer. Create 6 short Instagram captions for this photo/topic:\n\n"
        f"Topic / description: {prompt}\n"
        f"Tone: {tone}\n"
        f"Style: {style}\n\n"
        f"Return each caption on a new line, no extra commentary."
    )

    try:
        gen_text = call_gemini_generate(composed, max_output_tokens=220, temperature=0.9)
    except requests.HTTPError as e:
        return jsonify({"error": "API request failed", "details": str(e), "response_text": getattr(e.response, "text", "")}), 502
    except Exception as e:
        return jsonify({"error": "Unexpected error", "details": str(e)}), 500

    # Split the output into lines and trim
    lines = [line.strip() for line in gen_text.splitlines() if line.strip()]
    # If only one long paragraph returned, try to split by sentences into multiple captions
    if len(lines) == 1:
        import re
        sentences = re.split(r'(?<=[.!?])\s+', lines[0])
        lines = [s.strip() for s in sentences if s.strip()][:6]

    # Limit to 6 captions
    captions = lines[:6] if lines else [gen_text]

    return jsonify({"captions": captions})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
