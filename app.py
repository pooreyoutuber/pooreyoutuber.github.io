```python:Final Working GA4 and Caption API:app.py
import os
import random
import json
from flask import Flask, request, jsonify
import requests
from google import genai
import uuid

# ======================= कॉन्फ़िगरेशन ========================

app = Flask(__name__)

# Environment Variables (Render Secrets) से लोड करें
# **PROXY_USER, PROXY_PASS, और GEMINI_API_KEY Render Secrets में होने चाहिए**
PROXY_USER = os.environ.get('PROXY_USER')
PROXY_PASS = os.environ.get('PROXY_PASS')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')

# *** RENDER LOGS के लिए DEBUGGING LINE ***
# यह लाइन Render Logs में बताएगी कि PROXY_USER और PROXY_PASS लोड हुए या नहीं
# अगर यह 'False | False' दिखाता है, तो Render Secrets में गलती है।
print(f"DEBUG: PROXY_USER loaded: {bool(PROXY_USER)} | PROXY_PASS loaded: {bool(PROXY_PASS)}")

# **Webshare Direct Connection के 10 IPs:Port**
# अगर 'Failed to fetch' आता है, तो Webshare डैशबोर्ड से नए IPs जनरेट करके यहाँ अपडेट करें।
RAW_PROXY_LIST = [
    '142.111.48.253:7030',
    '31.59.20.176:6754',
    '38.170.176.177:5572',
    '198.23.239.134:6540',
    '45.38.107.97:6014',
    '107.172.163.27:6543',
    '64.137.96.74:6641',
    '216.10.27.159:6837',
    '142.111.67.146:5611',
    '142.147.128.93:6593'
] 

random.shuffle(RAW_PROXY_LIST)

# ======================= फ़ंक्शन लॉजिक ========================

def send_ga4_hit_with_retry(ga4_url, payload):
    """
    प्रॉक्सी लिस्ट को रोटेट करके GA4 हिट भेजता है।
    """
    if not PROXY_USER or not PROXY_PASS:
        # अगर Secrets सेट नहीं हैं तो यह एक्सेप्शन 'Traffic Boost Failed. Missing Proxy Credentials' देगा।
        raise ValueError("Proxy authentication credentials (PROXY_USER/PROXY_PASS) are missing from Render Environment Variables.")

    last_error = None

    # हर प्रॉक्सी IP को बारी-बारी से ट्राई करें
    for i, proxy_ip_port in enumerate(RAW_PROXY_LIST):
        # Authenticated Proxy URL बनाना
        proxy_url = f"http://{PROXY_USER}:{PROXY_PASS}@{proxy_ip_port}"
        proxies = {
            "http": proxy_url,
            "https": proxy_url
        }
        
        try:
            print(f"Trying Proxy {i + 1}/{len(RAW_PROXY_LIST)}: {proxy_ip_port}")
            
            # Timeout और प्रॉक्सी के साथ request भेजें
            response = requests.post(
                ga4_url, 
                json=payload, 
                proxies=proxies, 
                timeout=10 # 10 सेकंड का Timeout
            )

            # GA4 Success Status Code 204 है
            if response.status_code == 204:
                print(f"SUCCESS: Hit sent successfully with Proxy {proxy_ip_port}")
                return response
            
            # Network/HTTP errors पर अगला प्रॉक्सी ट्राई करें
            print(f"Proxy {proxy_ip_port} failed with status: {response.status_code}. Retrying.")
            last_error = response

        except requests.exceptions.RequestException as e:
            # Network errors (Timeout, Connection Refused)
            print(f"Proxy {proxy_ip_port} failed with network error: {e}")
            last_error = e

    # अगर सभी प्रॉक्सी फेल हो गए
    if isinstance(last_error, requests.Response):
        # HTTP Error (जैसे 400 Bad Request)
        raise requests.exceptions.HTTPError(f"All proxies failed. Last HTTP Status: {last_error.status_code}", response=last_error)
    elif last_error:
        # Network Error
        raise last_error
    else:
        raise Exception("Failed to send GA4 hit after trying all proxies.")

# ======================= API ENDPOINTS ========================

@app.route('/api/boost-traffic', methods=['POST'])
def boost_traffic():
    data = request.get_json()
    ga_id = data.get('gaId')
    api_secret = data.get('apiSecret')
    url = data.get('url')

    if not all([ga_id, api_secret, url]):
        return jsonify({"success": False, "message": "Missing required fields (gaId, apiSecret, url)."}), 400

    ga4_url = f"[https://www.google-analytics.com/mp/collect?measurement_id=](https://www.google-analytics.com/mp/collect?measurement_id=){ga_id}&api_secret={api_secret}"

    payload = {
        "client_id": str(uuid.uuid4()), 
        "events": [{
            "name": "page_view",
            "params": {
                "page_location": url,
                "session_id": str(int(os.times()[4] * 1000)),
                "engagement_time_msec": "5000"
            }
        }]
    }

    try:
        response = send_ga4_hit_with_retry(ga4_url, payload)
        
        return jsonify({
            "success": True, 
            "message": "Traffic hit sent successfully after proxy rotation.", 
            "status": response.status_code
        }), 200

    except requests.exceptions.HTTPError as e:
        return jsonify({
            "success": False, 
            "message": f"Traffic Boost Failed. Proxy returned HTTP Error. Last Status: {e.response.status_code}", 
            "status": e.response.status_code, 
            "detail": str(e)
        }), 500
        
    except ValueError as e:
        # Missing Credentials error
        return jsonify({
            "success": False, 
            "message": "Traffic Boost Failed. Missing Proxy Credentials in Render Secrets.", 
            "detail": str(e)
        }), 500
        
    except Exception as e:
        # Network or All proxies failed error
        return jsonify({
            "success": False, 
            "message": "Traffic Boost Failed. All proxies failed to connect or timed out.", 
            "detail": str(e)
        }), 500


@app.route('/api/generate-caption', methods=['POST'])
def generate_caption():
    data = request.get_json()
    reel_topic = data.get('reelTopic')
    caption_style = data.get('captionStyle')
    number_of_captions = data.get('numberOfCaptions')

    if not GEMINI_API_KEY:
        return jsonify({"success": False, "message": "GEMINI_API_KEY is not configured."}), 500

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        prompt = f"Generate {number_of_captions} catchy, viral captions in {caption_style} style for a reel about \"{reel_topic}\". Respond with a simple, numbered list of captions."
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        
        raw_captions = response.text.strip().split('\n')
        captions = [line.lstrip('0123456789. \t').strip() for line in raw_captions if line.strip()]

        return jsonify({"success": True, "captions": captions}), 200
    
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return jsonify({"success": False, "message": "Caption generation failed. Check Gemini API key.", "detail": str(e)}), 500


# ======================= सर्वर स्टार्ट ========================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
```eof
