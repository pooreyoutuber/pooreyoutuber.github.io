import os
from flask import Flask, render_template, request
from google import genai

# --- API Key को Render Secret File से पढ़ने का फ़ंक्शन ---
def load_api_key_from_secret_file():
    """Render Secret File (named 'gemini') से API Key को सुरक्षित रूप से लोड करता है।"""
    
    # Secret File का नाम
    SECRET_FILE_NAME = "gemini"
    # Render फ़ाइल को /etc/secrets/ में रखता है
    secret_path = os.path.join("/etc/secrets", SECRET_FILE_NAME)
    
    try:
        # फ़ाइल को खोलें और Key पढ़ें
        with open(secret_path, 'r') as f:
            # Key को पढ़ने के बाद आगे और पीछे के whitespace हटाएँ
            return f.read().strip() 
    except FileNotFoundError:
        print("ERROR: Secret file not found. Check Render Secret Files setting.")
        return None
    except Exception as e:
        print(f"Error reading secret file: {e}")
        return None

# --- Flask App Configuration ---
app = Flask(__name__)

# --- AI API Key और क्लाइंट सेटअप ---
# Key को Secret File से लोड करें
API_KEY = load_api_key_from_secret_file()

if not API_KEY:
    # अगर Key लोड नहीं हो पाई
    client = None
    print("FATAL: Gemini Client cannot be initialized because API Key is missing.")
else:
    # Gemini क्लाइंट को कॉन्फ़िगर करें
    client = genai.Client(api_key=API_KEY)


def generate_instagram_content(topic, tone):
    """AI का उपयोग करके कैप्शन और हैशटैग जेनरेट करता है।"""
    
    if not client:
        return "माफ़ करें, AI Key सेटअप नहीं है। (त्रुटि कोड: KEY_MISSING)"

    # प्रॉम्प्ट इंजीनियरिंग: AI को स्पष्ट, उच्च-गुणवत्ता वाले निर्देश दें
    prompt = f"""
    आप एक उच्च ट्रेंडिंग Instagram कंटेंट एक्सपर्ट हैं। आपका काम आकर्षक, वायरल कैप्शन और प्रभावी हैशटैग जेनरेट करना है।
    
    - विषय (Topic): {topic}
    - टोन (Tone/Vibe): {tone}
    
    मुझे एक ही आउटपुट में निम्नलिखित जानकारी चाहिए:
    1. एक आकर्षक कैप्शन (3-4 वाक्य), जिसमें एक इमोजी और एक मजेदार कॉल-टू-एक्शन (CTA) हो।
    2. अंत में, विषय से संबंधित 10 सबसे ट्रेंडिंग और प्रासंगिक हैशटैग की एक सूची, जो एक-दूसरे से और कैप्शन से एक खाली लाइन द्वारा अलग किए गए हों। हैशटैग को कॉमा (,) से अलग करें।
    
    आउटपुट को HTML फॉर्मेटिंग के बिना, सीधे टेक्स्ट के रूप में दें।
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
            return "⚠️ **माफ़ करें! आज की AI उपयोग सीमा पूरी हो चुकी है।** (फ़्री टियर लिमिट)। कृपया कल फिर से प्रयास करें।"
        else:
            return f"माफ़ करें, एक अप्रत्याशित त्रुटि आई: {e}"


# --- वेब रूट और लॉजिक ---
@app.route('/', methods=['GET', 'POST'])
def index():
    """वेबसाइट का मुख्य पेज"""
    ai_caption = None
    topic = ""
    tone = "Inspirational"

    if request.method == 'POST':
        # फॉर्म डेटा प्राप्त करें
        topic = request.form.get('topic')
        tone = request.form.get('tone')
        
        if topic:
            # AI फंक्शन को कॉल करें
            ai_caption = generate_instagram_content(topic, tone)

    # index.html को रेंडर करें और डेटा पास करें
    return render_template('index.html', ai_caption=ai_caption, current_topic=topic, current_tone=tone)

# --- ऐप को शुरू करें (Render डिप्लॉयमेंट के लिए ज़रूरी) ---
if __name__ == '__main__':
    # Render, 'PORT' environment variable का उपयोग करेगा
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
