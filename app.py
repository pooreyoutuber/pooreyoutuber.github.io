# app.py (Python Flask Backend)
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

# Webshare Credentials को यहाँ सेट करें
PROXY_AUTH = 'username:password'  # Webshare username:password से बदलें
PROXY_URL = f'http://{PROXY_AUTH}@domain.webshare.io:80'

# CORS Headers को सेट करने के लिए (यह Render पर जरूरी हो सकता है)
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

@app.route('/proxy', methods=['POST'])
def proxy_request():
    data = request.get_json()
    target_url = data.get('url')

    if not target_url:
        return jsonify({"error": "URL missing"}), 400

    proxies = {
        "http": PROXY_URL,
        "https": PROXY_URL,
    }

    try:
        # Webshare प्रॉक्सी का उपयोग करके रिक्वेस्ट भेजें
        response = requests.get(target_url, proxies=proxies, timeout=15)
        response.raise_for_status() # HTTP errors के लिए

        # HTML कंटेंट को वापस Frontend को भेजें
        return jsonify({"html": response.text})

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Proxy request failed: {str(e)}"}), 500

if __name__ == '__main__':
    # Render पर, पोर्ट को environment variable से लेना पड़ता है
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
