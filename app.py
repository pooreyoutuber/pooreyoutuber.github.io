import os
import json
from flask import Flask, render_template, request, jsonify
from google import genai  # make sure package 'google-genai' is installed

app = Flask(__name__)

# ---------------- Load Gemini API key from Render Secret ----------------
def load_api_key():
    secret_file = "/etc/secrets/gemini"
    try:
        with open(secret_file, "r") as f:
            return f.read().strip()
    except:
        return os.getenv("GEMINI_API_KEY")

API_KEY = load_api_key()
if not API_KEY:
    print("❌ ERROR: Gemini API Key not found in secrets.")
    client = None
else:
    client = genai.Client(api_key=API_KEY)


# ---------------- Generate Captions using Gemini ----------------
def generate_captions(topic):
    if not client:
        return None, "Server Error: API Key not configured."

    prompt = f"""
    You are a professional Instagram content strategist.
    Generate TEN (10) short and trendy Instagram captions for the topic: "{topic}".
    Each caption should include 5-8 relevant, trending hashtags.

    Output in **strict JSON format**:
    [
      {{"caption": "Caption text here", "hashtags": "#tag1,#tag2,#tag3"}},
      ...
    ]
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        raw = response.text.strip()

        # Try to parse JSON safely
        captions = json.loads(raw)
        results = []
        for item in captions:
            cap = item.get("caption", "")
            tags = item.get("hashtags", "")
            results.append(f"{cap}\n\n{tags}")

        return results[:10], None

    except json.JSONDecodeError:
        return None, "⚠️ AI response formatting issue. Please try again."
    except Exception as e:
        err = str(e)
        if "quota" in err.lower():
            return None, "⚠️ Quota limit reached. Try again later."
        return None, f"❌ Error: {err}"


# ---------------- Web Routes ----------------
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json()
    topic = data.get("topic", "").strip()

    if not topic:
        return jsonify({"error": "Please enter a topic!"}), 400

    captions, error = generate_captions(topic)
    if error:
        return jsonify({"error": error}), 500

    return jsonify({"captions": captions})


# ---------------- Run App ----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)))
