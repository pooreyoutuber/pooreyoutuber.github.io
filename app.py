import os
from flask import Flask, render_template, request
from google import genai

# --- API Key को Render Secret File से पढ़ने का फ़ंक्शन ---
def load_api_key_from_secret_file():
    """Renders the API Key safely from the 'gemini' secret file."""
    SECRET_FILE_NAME = "gemini"
    secret_path = os.path.join("/etc/secrets", SECRET_FILE_NAME)
    
    try:
        # Render Secret File से Key को लोड करें
        with open(secret_path, 'r') as f:
            return f.read().strip() 
    except Exception:
        # अगर Secret File नहीं मिली, तो Environment Variable से Key लेने की कोशिश करें (Local Testing के लिए)
        return os.getenv("GEMINI_API_KEY")

# --- Flask App Configuration ---
app = Flask(__name__)

# --- AI API Key और क्लाइंट सेटअप ---
API_KEY = load_api_key_from_secret_file()

if not API_KEY:
    client = None
    print("FATAL: Gemini Client cannot be initialized because API Key is missing.")
else:
    client = genai.Client(api_key=API_KEY)


def generate_instagram_content(topic):
    """AI का उपयोग करके आकर्षक इंग्लिश कैप्शन और हैशटैग जेनरेट करता है।"""
    
    if not client:
        # अगर Key मिसिंग है
        return "Sorry! The AI service key is missing. Please contact the administrator. (Error: KEY_MISSING)"

    # SIMPLIFIED & EFFECTIVE ENGLISH PROMPT
    prompt = f"""
    You are an expert Instagram content strategist focused on generating viral English posts for high views and engagement.
    
    - Topic: {topic}
    
    Analyze the topic and generate highly optimized content. Automatically choose the most fitting tone (funny, inspirational, motivational, etc.) for the topic.
    
    Provide the output in the following structure, which must be strictly followed:
    
    1. CAPTION: Write a punchy, engaging English caption (4-5 sentences) with a strong hook, 3 relevant emojis, and a clear Call-to-Action (CTA).
    
    2. HASHTAGS: Provide exactly 10 high-performing, niche-relevant English hashtags separated by commas (e.g., #pubgmobile #mobilegaming #esports). Ensure a mix of small, medium, and large hashtags for maximum reach.
    
    Present the output clearly, with a blank line separating the CAPTION and HASHTAGS sections. Do not use any labels like 'CAPTION:' or 'HASHTAGS:'. The user should be able to copy the content directly.
    """
    
    try:
        # AI मॉडल से कंटेंट जेनरेट करें
        response = client.models.generate_content(
            model="gemini-2.5-flash", 
            contents=prompt
        )
        return response.text
        
    except Exception as e:
        # Quota Exceeded (फ्री टियर सीमा) एरर को संभालें
        if "Quota exceeded" in str(e):
            return "⚠️ Quota limit reached. The service will reset in 24 hours. Please try again tomorrow."
        else:
            return f"Sorry, an unexpected error occurred. Error: {e}"


# --- वेब रूट और लॉजिक ---
@app.route('/', methods=['GET', 'POST'])
def index():
    """वेबसाइट का मुख्य पेज जो GET और POST अनुरोधों को संभालता है।"""
    ai_caption = None
    topic = ""

    if request.method == 'POST':
        # फॉर्म डेटा प्राप्त करें
        topic = request.form.get('topic')
        
        if topic:
            # AI फंक्शन को कॉल करें
            ai_caption = generate_instagram_content(topic)

    # index.html को रेंडर करें
    return render_template('index.html', 
                           ai_caption=ai_caption, 
                           current_topic=topic)

# --- ऐप को शुरू करें (Render डिप्लॉयमेंट के लिए ज़रूरी) ---
if __name__ == '__main__':
    # Render, 'PORT' environment variable का उपयोग करेगा
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
    
