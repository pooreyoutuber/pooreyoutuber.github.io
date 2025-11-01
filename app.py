# app.py (Python Flask Backend)
from flask import Flask, request, jsonify, send_from_directory
import requests
import os

app = Flask(__name__)

# --- Webshare Proxy Configuration (महत्वपूर्ण: इसे बदलें) ---
# **Webshare Proxy details को अपनी details से बदलें**
PROXY_USERNAME = os.environ.get('PROXY_USER', 'YOUR_WEBSHARE_USERNAME_HERE')
PROXY_PASSWORD = os.environ.get('PROXY_PASS', 'YOUR_WEBSHARE_PASSWORD_HERE')
PROXY_HOST = os.environ.get('PROXY_HOST', 'domain.webshare.io') # Webshare का Rotating Proxy Host
PROXY_PORT = os.environ.get('PROXY_PORT', '80')

PROXY_AUTH_URL = f'http://{PROXY_USERNAME}:{PROXY_PASSWORD}@{PROXY_HOST}:{PROXY_PORT}'

# CORS Headers को सेट करना (यह Render और फ्रंटएंड कम्युनिकेशन के लिए ज़रूरी है)
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

# Root Route (यह सुनिश्चित करता है कि Render पर '/' पर जाने पर index.html लोड हो)
@app.route('/')
def serve_frontend():
    # Render पर, आपको index.html को सर्व करने के लिए एक 'public' या 'static' फोल्डर बनाना पड़ सकता है
    # सुविधा के लिए, हम मान रहे हैं कि index.html root में है।
    return send_from_directory(os.getcwd(), 'index.html')


# मुख्य प्रॉक्सी API रूट
@app.route('/proxy', methods=['POST'])
def proxy_request():
    data = request.get_json()
    target_url = data.get('url')

    if not target_url:
        return jsonify({"error": "URL missing from request"}), 400

    proxies = {
        "http": PROXY_AUTH_URL,
        "https": PROXY_AUTH_URL,
    }

    try:
        print(f"Proxying request for: {target_url} using Webshare.")
        
        # Webshare प्रॉक्सी का उपयोग करके रिक्वेस्ट भेजें
        response = requests.get(
            target_url,
            proxies=proxies,
            timeout=20, # 20 सेकंड का टाइमआउट सेट करें
            headers={'User-Agent': 'Mozilla/5.0'} # वेबसाइट को सामान्य ब्राउज़र दिखाने के लिए
        )
        response.raise_for_status() # HTTP errors (4xx or 5xx) के लिए एक्सेप्शन उठाएं

        # HTML कंटेंट को वापस Frontend को भेजें
        return jsonify({"html": response.text})

    except requests.exceptions.RequestException as e:
        # प्रॉक्सी फेलियर या कनेक्शन एरर को हैंडल करना
        error_msg = f"Proxying failed. Error: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

if __name__ == '__main__':
    # लोकल टेस्टिंग के लिए
    app.run(host='0.0.0.0', port=5000, debug=True)
    
