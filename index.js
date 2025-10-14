// **Fix 1: Module Error** - CommonJS (require) सिंटैक्स का उपयोग करें
const express = require('express');
const rp = require('request-promise'); 
const { GoogleGenAI } = require('@google/genai'); 
const app = express();

const port = process.env.PORT || 10000;

// ------------------- प्रॉक्सी लिस्ट कॉन्फ़िगरेशन -------------------
// **Fix 2: 10 Proxy Rotation** - Webshare Backbone Connection Proxies
// ये क्रेडेंशियल्स आपके स्क्रीनशॉट से लिए गए हैं।
const PROXY_HOST = 'p.webshare.io';
const PROXY_PORT = '80';
const PROXY_LIST = [
    // Username (Example): bqctypvz-1 से bqctypvz-10 तक 
    { user: 'bqctypvz-1', pass: '399xb3kxqv6i' },
    { user: 'bqctypvz-2', pass: '399xb3kxqv6i' },
    { user: 'bqctypvz-3', pass: '399xb3kxqv6i' },
    { user: 'bqctypvz-4', pass: '399xb3kxqv6i' },
    { user: 'bqctypvz-5', pass: '399xb3kxqv6i' },
    { user: 'bqctypvz-6', pass: '399xb3kxqv6i' },
    { user: 'bqctypvz-7', pass: '399xb3kxqv6i' },
    { user: 'bqctypvz-8', pass: '399xb3kxqv6i' },
    { user: 'bqctypvz-9', pass: '399xb3kxqv6i' },
    { user: 'bqctypvz-10', pass: '399xb3kxqv6i' }
];
// -----------------------------------------------------------------

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const ai = new GoogleGenAI(GEMINI_API_KEY);

app.use(express.json());

/**
 * प्रॉक्सी लिस्ट को Iterate करता है और पहला काम करने वाला प्रॉक्सी ढूंढता है
 */
async function sendHitWithRetry(ga4Url, payload) {
    let successfulResponse = null;
    let lastError = null;

    for (let i = 0; i < PROXY_LIST.length; i++) {
        const proxy = PROXY_LIST[i];
        const proxyUrl = `http://${proxy.user}:${proxy.pass}@${PROXY_HOST}:${PROXY_PORT}`;

        try {
            console.log(`Trying Proxy ${i + 1}/${PROXY_LIST.length}: ${proxy.user}`);
            
            const options = {
                method: 'POST',
                uri: ga4Url,
                proxy: proxyUrl, // Current Proxy URL
                json: true,
                body: payload,
                simple: false, 
                resolveWithFullResponse: true 
            };

            const response = await rp(options);

            // अगर GA4 Success Status Code 204 है, तो तुरंत सफल (success) मानें और बाहर निकल जाएँ।
            if (response.statusCode === 204) {
                console.log(`SUCCESS: Hit sent successfully with Proxy ${i + 1}`);
                successfulResponse = response;
                break; 
            }

            // अगर 407 (Auth Required) या 400 (Bad Request) है, तो इसे फेल माना जाएगा और अगला प्रॉक्सी ट्राई किया जाएगा।
            console.warn(`Proxy ${i + 1} failed with status: ${response.statusCode}`);
            lastError = response;

        } catch (error) {
            // Network errors (ETIMEDOUT, ECONNREFUSED) यहाँ पकड़े जाते हैं।
            console.error(`Proxy ${i + 1} failed with network error: ${error.message}`);
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

    // GA4 Measurement Protocol URL
    const ga4Url = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;

    // Dynamic Payload
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
        // प्रॉक्सी रोटेशन फंक्शन को कॉल करें
        const response = await sendHitWithRetry(ga4Url, payload);
        
        // Success (204)
        return res.json({ success: true, message: "Traffic hit sent successfully after proxy rotation.", status: response.statusCode });

    } catch (error) {
        // Catch-all failure after trying all proxies
        const statusCode = error.statusCode || 500;
        const errorMessage = error.message || "All proxies failed to connect or authenticate.";
        
        console.error("FINAL FAILURE: All proxies failed.", errorMessage);

        res.status(statusCode).json({ 
            success: false, 
            message: "Traffic Boost Failed. All 10 proxies failed (407 or Timeout).", 
            detail: errorMessage 
        });
    }
});

// ------------------------------------------------------------------

// API Endpoint 2: AI Caption Generator
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
