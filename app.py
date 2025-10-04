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
        # If the file is not found (e.g., local testing), try environment variable
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


def generate_instagram_content(topic, tone, category):
    """Generates high-quality, trending English caption and hashtags."""
    
    if not client:
        return "Sorry, the AI service is currently unavailable. (Error Code: Key Missing)"

    # IMPROVED ENGLISH PROMPT for better results
    prompt = f"""
    You are an expert Instagram content strategist specialized in driving high engagement and views.
    
    - Topic: {topic}
    - Tone/Style: {tone}
    - Content Category: {category}
    
    Your task is to generate highly optimized English content that will perform well on Instagram for the specified topic.
    
    Provide the output in the following structure, which must be strictly followed:
    
    1. CAPTION: Write a punchy, engaging English caption (3-5 sentences) suitable for a professional/trending Instagram post. Include 2-3 relevant emojis and a Call-to-Action (CTA).
    
    2. HASHTAGS: Provide exactly 15 high-performing, niche-relevant English hashtags separated by commas (e.g., #pubgmobile #mobilegaming #esports). Ensure a mix of small, medium, and large hashtags for maximum reach.
    
    Present the output clearly, with a blank line separating the CAPTION and HASHTAGS sections. Do not use any introductory phrases like 'Here is your caption'.
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash", 
            contents=prompt
        )
        return response.text
        
    except Exception as e:
        # Handle Quota Exceeded and other errors
        if "Quota exceeded" in str(e):
            return "⚠️ Quota limit reached. Please try again tomorrow. (Service reset in 24h)"
        else:
            return f"Sorry, an unexpected error occurred. Please check your inputs. Error: {e}"


# --- Web Routes and Logic ---
@app.route('/', methods=['GET', 'POST'])
def index():
    """Handles the main page and form submission."""
    ai_caption = None
    topic = ""
    tone = "Inspirational"
    category = "Gaming/Entertainment" # Default category

    if request.method == 'POST':
        # Get form data
        topic = request.form.get('topic')
        tone = request.form.get('tone')
        category = request.form.get('category')
        
        if topic:
            # Call AI function
            ai_caption = generate_instagram_content(topic, tone, category)

    # Render index.html with data
    return render_template('index.html', 
                           ai_caption=ai_caption, 
                           current_topic=topic, 
                           current_tone=tone,
                           current_category=category)

# --- Start App (For Render Deployment) ---
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
