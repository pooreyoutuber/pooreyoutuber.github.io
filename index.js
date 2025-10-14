// **Fix 1: Module Error** - CommonJS (require) सिंटैक्स का उपयोग करें
const express = require('express');
const rp = require('request-promise'); 
const { GoogleGenAI } = require('@google/genai'); 

const app = express();
const port = process.env.PORT || 10000;

// ------------------- प्रॉक्सी कॉन्फ़िगरेशन (ProxyScrape Premium) -------------------
// **ये मान Render Environment Variables (Secrets) से आने चाहिए।**
// 407 Auth Required एरर को ठीक करने के लिए Authentication अनिवार्य है।
const PROXY_USER = process.env.PROXY_USER; 
const PROXY_PASS = process.env.PROXY_PASS;
// ---------------------------------------------------------------------------------

// आपकी 'proxyscrape_premium_http_proxies (1).txt' फ़ाइल से पहले 10 प्रॉक्सी
// Format: IP:PORT
const RAW_PROXY_LIST = [
    '45.3.49.4:3129',
    '209.50.164.165:3129',
    '216.26.232.247:3129',
    '65.111.3.145:3129',
    '209.50.168.254:3129',
    '104.207.63.195:3129',
    '65.111.2.236:3129',
    '104.207.61.3:3129',
    '104.207.60.58:3129',
    '209.50.166.110:3129'
]; 

if (!PROXY_USER || !PROXY_PASS) {
    console.warn("WARNING: PROXY_USER or PROXY_PASS environment variables are missing. Proxy requests will likely fail with 407 (Auth Required).");
}

const SHUFFLED_PROXY_LIST = RAW_PROXY_LIST.sort(() => 0.5 - Math.random()); 

// Gemini API Key (Secret File या Environment Variable से लोड करें)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const ai = new GoogleGenAI(GEMINI_API_KEY);

app.use(express.json());

/**
 * प्रॉक्सी लिस्ट को Iterate करता है और पहला काम करने वाला प्रॉक्सी ढूंढता है
 */
async function sendHitWithRetry(ga4Url, payload) {
    let successfulResponse = null;
    let lastError = null;
    
    for (let i = 0; i < SHUFFLED_PROXY_LIST.length; i++) {
        const rawProxy = SHUFFLED_PROXY_LIST[i];
        
        // Authenticated Proxy URL बनाना
        const proxyUrl = `http://${PROXY_USER}:${PROXY_PASS}@${rawProxy}`;
        
        try {
            console.log(`Trying Proxy ${i + 1}/${SHUFFLED_PROXY_LIST.length}: ${rawProxy}`);
            
            const options = {
                method: 'POST',
                uri: ga4Url,
                proxy: proxyUrl, // Current Proxy URL
                json: true,
                body: payload,
                simple: false, 
                resolveWithFullResponse: true,
                timeout: 10000 // 10 सेकंड का timeout
            };

            const response = await rp(options);

            // GA4 Success Status Code 204 है, तो सफल (success) मानें
            if (response.statusCode === 204) {
                console.log(`SUCCESS: Hit sent successfully with Proxy ${rawProxy}`);
                successfulResponse = response;
                break; 
            }

            // 407 (Auth Required) या 400 (Bad Request) पर अगला प्रॉक्सी ट्राई करें
            console.warn(`Proxy ${rawProxy} failed with status: ${response.statusCode}. Moving to next.`);
            lastError = { statusCode: response.statusCode, message: `Proxy ${rawProxy} returned status ${response.statusCode}`, body: response.body };

        } catch (error) {
            // Network errors (ETIMEDOUT, ECONNREFUSED) यहाँ पकड़े जाते हैं।
            console.error(`Proxy ${rawProxy} failed with network error: ${error.message}. Moving to next.`);
            lastError = error;
        }
    }

    if (successfulResponse) {
        return successfulResponse;
    } else {
        // अगर सारे प्रॉक्सी फेल हो गए
        throw lastError;
    }
}

// ------------------------------------------------------------------

// API Endpoint 1: Website Traffic Booster
app.post('/api/boost-traffic', async (req, res) => {
    const { gaId, apiSecret, url } = req.body; 

    const ga4Url = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;

    const payload = {
        "client_id": "unique_visitor_id_" + Date.now().toString(36), 
        "events": [{
            "name": "page_view",
            "params": {
                "page_location": url,
                "session_id": "session_" + Date.now(),
                "engagement_time_msec": "5000"
            }
        }]
    };

    try {
        const response = await sendHitWithRetry(ga4Url, payload);
        
        return res.json({ success: true, message: "Traffic hit sent successfully after proxy rotation.", status: response.statusCode });

    } catch (error) {
        const statusCode = error.statusCode || (error.code === 'ETIMEDOUT' ? 504 : 500);
        const errorMessage = error.message || "All 10 proxies failed to connect or authenticate.";
        
        console.error("FINAL FAILURE: All proxies failed.", errorMessage);

        res.status(statusCode).json({ 
            success: false, 
            message: "Traffic Boost Failed. All 10 proxies failed (407, Timeout or Connection Error).", 
            detail: errorMessage 
        });
    }
});

// ------------------------------------------------------------------

// API Endpoint 2: AI Caption Generator (इसमें प्रॉक्सी की आवश्यकता नहीं है)
app.post('/api/generate-caption', async (req, res) => {
    const { reelTopic, captionStyle, numberOfCaptions } = req.body;
    
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ success: false, message: "GEMINI_API_KEY is not configured." });
    }

    try {
        const prompt = `Generate ${numberOfCaptions} catchy, viral captions in ${captionStyle} style for a reel about "${reelTopic}". Respond with a simple, numbered list of captions.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        
        const rawCaptions = response.text.trim().split('\n');
        const captions = rawCaptions.map(line => line.replace(/^\s*\d+\.\s*/, '').trim()).filter(line => line.length > 0);

        res.json({ success: true, captions: captions });
    } catch (error) {
        console.error("Gemini API Error:", error.message);
        res.status(500).json({ success: false, message: "Caption generation failed. Check Gemini API key.", detail: error.message });
    }
});

// ------------------------------------------------------------------

app.listen(port, () => {
  console.log(`Server running on port ${port} 🎉`);
});
