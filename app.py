import os
from flask import Flask, render_template, request
from google import genai

# --- Flask App Configuration ---
app = Flask(__name__)

# --- AI API Key और क्लाइंट सेटअप ---
# Render पर सेट किए गए GEMINI_API_KEY को सुरक्षित रूप से यहाँ लिया जाएगा
API_KEY = os.getenv("GEMINI_API_KEY")

# सुनिश्चित करें कि Key मौजूद है
if not API_KEY:
    # अगर Render पर Key सेट नहीं है, तो यह एरर देगा
    print("FATAL ERROR: GEMINI_API_KEY environment variable is not set. The app cannot run.")
    # यह सिर्फ लोकल टेस्टिंग के लिए है, Render पर यह काम करेगा
    # Production में जाने से पहले इसे ठीक करें!
    client = None
else:
    # Gemini क्लाइंट को कॉन्फ़िगर करें
    client = genai.Client(api_key=API_KEY)


def generate_instagram_content(topic, tone):
    """AI का उपयोग करके कैप्शन और हैशटैग जेनरेट करता है।"""
    
    if not client:
        return "माफ़ करें, AI Key सेटअप नहीं है। कृपया एडमिन से संपर्क करें।"

    # प्रॉम्प्ट इंजीनियरिंग: AI को स्पष्ट निर्देश दें
    prompt = f"""
    आप एक उच्च ट्रेंडिंग Instagram कंटेंट एक्सपर्ट हैं। आपका काम आकर्षक, वायरल कैप्शन और प्रभावी हैशटैग जेनरेट करना है।
    
    - विषय (Topic): {topic}
    - टोन (Tone/Vibe): {tone}
    
    मुझे एक ही आउटपुट में निम्नलिखित जानकारी चाहिए:
    1. एक आकर्षक कैप्शन (3-4 वाक्य), जिसमें एक इमोजी और एक मजेदार कॉल-टू-एक्शन (CTA) हो।
    2. विषय से संबंधित 10 सबसे ट्रेंडिंग और प्रासंगिक हैशटैग की एक सूची, जो कॉमा (,) से अलग किए गए हों।
    
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
        # अगर दैनिक सीमा पार हो गई (Quota Exceeded) तो यह एरर देगा
        if "Quota exceeded" in str(e):
            return "⚠️ **माफ़ करें! आज की AI उपयोग सीमा पूरी हो चुकी है।** कृपया कल फिर से प्रयास करें। (फ़्री टियर लिमिट)"
        else:
            return f"माफ़ करें, एक अप्रत्याशित त्रुटि आई: {e}"


# --- वेब रूट और लॉजिक ---
@app.route('/', methods=['GET', 'POST'])
def index():
    """वेबसाइट का मुख्य पेज, जो GET और POST अनुरोधों को संभालता है।"""
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

# --- ऐप को शुरू करें (Render के लिए ज़रूरी) ---
if __name__ == '__main__':
    # Render, 'PORT' environment variable का उपयोग करेगा
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
