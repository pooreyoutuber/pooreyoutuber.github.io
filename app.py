import os
from flask import Flask, render_template, request
from google import genai

# --- API Key को Render Secret File से पढ़ने का फ़ंक्शन ---
def load_api_key_from_secret_file():
    """Renders the API Key safely from the 'gemini' secret file."""
    SECRET_FILE_NAME = "gemini"
    secret_path = os.path.join("/etc/secrets", SECRET_FILE_NAME)
    
    try:
        with open(secret_path, 'r') as f:
            return f.read().strip() 
    except Exception:
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
    """AI से दो अलग-अलग आकर्षक इंग्लिश कैप्शन और हैशटैग सेट जेनरेट करवाता है।"""
    
    if not client:
        return None, "Sorry! The AI service key is missing. Please contact the administrator. (Error: KEY_MISSING)"

    # NEW PROMPT: Generate two distinct options
    prompt = f"""
    You are an expert Instagram content strategist. Your task is to generate TWO (2) distinct, high-performing English content options for the topic: '{topic}'.
    
    Both options must be optimized for views and engagement, but must have a different style/approach.
    
    Strict Output Format:
    
    --- OPTION 1 ---
    CAPTION: Write an engaging 4-5 sentence caption with a Call-to-Action.
    HASHTAGS: Provide 10 trending, niche-relevant hashtags, comma-separated.
    
    --- OPTION 2 ---
    CAPTION: Write a punchy, short 2-3 sentence caption with a different Call-to-Action than Option 1.
    HASHTAGS: Provide 10 different trending hashtags, comma-separated.
    
    Do NOT include any other text or labels (like 'CAPTION:' or 'HASHTAGS:') in the output. The options must be clearly separated by '--- OPTION 1 ---' and '--- OPTION 2 ---'.
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash", 
            contents=prompt
        )
        
        # आउटपुट को दो ऑप्शंस में स्प्लिट करें
        raw_output = response.text
        if "--- OPTION 2 ---" in raw_output:
            option1_data = raw_output.split("--- OPTION 2 ---")[0].replace("--- OPTION 1 ---", "").strip()
            option2_data = raw_output.split("--- OPTION 2 ---")[1].strip()
            return option1_data, option2_data
        
        # अगर आउटपुट फॉर्मेट सही नहीं आया
        return None, "Error: Could not parse AI output into two options. Try a different topic."
        
    except Exception as e:
        if "Quota exceeded" in str(e):
            return None, "⚠️ Quota limit reached. Please try again tomorrow. (Service reset in 24h)"
        else:
            return None, f"Sorry, an unexpected error occurred. Error: {e}"


# --- वेब रूट और लॉजिक ---
@app.route('/', methods=['GET', 'POST'])
def index():
    """वेबसाइट का मुख्य पेज जो GET और POST अनुरोधों को संभालता है।"""
    option1 = None
    option2 = None
    error_message = None
    topic = ""

    if request.method == 'POST':
        topic = request.form.get('topic')
        
        if topic:
            # AI फंक्शन को कॉल करें
            option1, option2 = generate_instagram_content(topic)
            if option1 is None and option2:
                error_message = option2 # अगर एरर आई तो option2 में एरर मैसेज होगा
                option2 = None
            
    # index.html को रेंडर करें
    return render_template('index.html', 
                           option1=option1, 
                           option2=option2, 
                           error_message=error_message,
                           current_topic=topic)

# ... (बाकी app.py कोड वही रहेगा) ...
