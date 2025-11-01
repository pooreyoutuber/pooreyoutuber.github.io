from flask import Flask, render_template, request, Response
import requests

app = Flask(__name__)

# ====================================================
# 🔒 आपकी Webshare प्रॉक्सी क्रेडेंशियल्स 🔒
# ====================================================
PROXY_HOST = 'p.webshare.io'
PROXY_PORT = '80'
PROXY_USERNAME = 'bqctypvz-rotate'
PROXY_PASSWORD = '399xb3kxqv6i'
# ====================================================

# Webshare प्रॉक्सी URL
PROXY_URL = f'http://{PROXY_USERNAME}:{PROXY_PASSWORD}@{PROXY_HOST}:{PROXY_PORT}'

@app.route('/', methods=['GET'])
def home():
    """यह मुख्य सर्च बार पेज को हैंडल करता है।"""
    target_url = request.args.get('url')
    
    if target_url:
        # URL को सैनिटाइज करें
        if not target_url.startswith(('http://', 'https://')):
            target_url = 'http://' + target_url

        try:
            # प्रॉक्सी के माध्यम से रिक्वेस्ट भेजें
            # verify=False HTTPS सर्टिफिकेट समस्याओं को नज़रअंदाज़ करता है
            response = requests.get(target_url, proxies={'http': PROXY_URL, 'https': PROXY_URL}, verify=False, timeout=30)
            
            # प्रॉक्सी से प्राप्त कंटेंट को iframe में सुरक्षित रूप से लोड करने के लिए
            # हम सीधे HTML कंटेंट को टेम्पलेट में पास करेंगे।
            # Python में URL Rewriting PHP की तरह ही जटिल है, इसलिए हम सरल डेमो पर टिके रहेंगे।
            
            # Response object बनाकर भेजते हैं (यह सुनिश्चित करने के लिए कि Content-Type सही हो)
            return render_template('index.html', 
                                   content_to_render=response.text, 
                                   target_url=target_url,
                                   error=None)
            
        except requests.exceptions.RequestException as e:
            # यदि प्रॉक्सी या कनेक्शन में कोई त्रुटि हो
            error_message = f"Proxy Connection Error or Request Failed: {e}"
            return render_template('index.html', 
                                   content_to_render=None, 
                                   target_url=target_url, 
                                   error=error_message)

    # यदि कोई URL नहीं दिया गया है या पहली बार पेज लोड हो रहा है
    return render_template('index.html', content_to_render=None, target_url=None, error=None)

if __name__ == '__main__':
    # Render, gunicorn जैसे WSGI सर्वर का उपयोग करेगा, लेकिन लोकल टेस्टिंग के लिए
    # हम सीधे Flask को चलाते हैं।
    app.run(debug=True)
