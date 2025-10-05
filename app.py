import os
from flask import Flask, render_template, request
from google import genai

app = Flask(__name__)

# Load Gemini API key (from Secret file or env)
def load_api_key():
    secret_path = "/etc/secrets/gemini"
    if os.path.exists(secret_path):
        with open(secret_path, "r") as f:
            return f.read().strip()
    return os.getenv("GEMINI_API_KEY")

API_KEY = load_api_key()

if not API_KEY:
    print("❌ ERROR: Gemini API Key not found!")
    client = None
else:
    client = genai.Client(api_key=API_KEY)


def generate_captions(topic):
    if not client:
        return None, "⚠️ API key missing or invalid."

    prompt = f"""
    You are an expert Instagram content strategist.
    Generate 10 short, viral English captions with engaging tone and trending hashtags
    for the topic: "{topic}".

    Each caption should:
    - Be 1 to 3 sentences long
    - Include 5 to 8 relevant hashtags
    - Be ready to post on Instagram

    Format example:
    1️⃣ Caption text here #hashtag1 #hashtag2 #hashtag3 ...
    """

    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        return response.text, None
    except Exception as e:
        print("🔥 Gemini API Error:", e)
        return None, f"Server error: {e}"


@app.route("/", methods=["GET", "POST"])
def index():
    captions = None
    error_message = None
    topic = ""

    if request.method == "POST":
        topic = request.form.get("topic")
        if topic:
            captions, error_message = generate_captions(topic)

    return render_template(
        "index.html",
        captions=captions,
        error_message=error_message,
        current_topic=topic
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
