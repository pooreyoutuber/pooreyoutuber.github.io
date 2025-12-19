import os
import threading
import time
import random
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

app = Flask(__name__)
CORS(app) # Frontend se connect karne ke liye zaruri hai

# Gemini Setup
genai.configure(api_key=os.environ.get("GEMINI_KEY"))
model = genai.GenerativeModel('gemini-pro')

def get_smart_delay():
    return random.randint(45, 90) # Drip-feed logic for GSC

def run_traffic_task(url, keyword):
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36")

    for i in range(400):
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        try:
            # Google Search Simulation
            driver.get("https://www.google.com")
            time.sleep(2)
            search_box = driver.find_element("name", "q")
            search_box.send_keys(keyword)
            search_box.send_keys(Keys.ENTER)
            time.sleep(5)

            # Click on target site
            links = driver.find_elements("xpath", "//a[@href]")
            for link in links:
                if url in str(link.get_attribute("href")):
                    link.click()
                    time.sleep(random.randint(20, 40)) # Stay on page
                    break
        except Exception as e:
            print(f"Error in view {i}: {e}")
        finally:
            driver.quit()
        
        time.sleep(get_smart_delay())

@app.route('/start-task', methods=['POST'])
def start_task():
    data = request.json
    url = data.get('url')
    keyword = data.get('keyword')
    
    if not url or not keyword:
        return jsonify({"error": "Missing data"}), 400

    # Start background thread
    thread = threading.Thread(target=run_traffic_task, args=(url, keyword))
    thread.start()
    
    return jsonify({"status": "Success", "message": "Task started in background"})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=10000)
