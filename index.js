// Load environment variables (from Render Secrets)
require('dotenv').config(); 
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai'); // Used for the Caption Generator
const { HttpsProxyAgent } = require('https-proxy-agent'); // CRITICAL for HTTPS traffic via proxy

const app = express();
const PORT = process.env.PORT || 5000;

// ======================= कॉन्फ़िगरेशन ========================

// Environment Variables (Render Secrets)
const PROXY_USER = process.env.PROXY_USER;
const PROXY_PASS = process.env.PROXY_PASS;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

// *** RENDER LOGS के लिए DEBUGGING LINE ***
console.log(`DEBUG: PROXY_USER loaded: ${!!PROXY_USER} | PROXY_PASS loaded: ${!!PROXY_PASS}`);

// **Webshare Direct Connection के 10 IPs:Port**
let RAW_PROXY_LIST = [
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
];

// Shuffle proxies once on startup for rotation
RAW_PROXY_LIST.sort(() => 0.5 - Math.random());

// Middleware
app.use(cors());
app.use(express.json());

// ======================= फ़ंक्शन लॉजिक (Proxy) ========================

async function sendGa4HitWithRetry(ga4Url, payload) {
    if (!PROXY_USER || !PROXY_PASS) {
        throw new Error("Traffic Boost Failed. Missing Proxy Credentials in Render Environment Variables.");
    }

    let lastError = null;

    for (let i = 0; i < RAW_PROXY_LIST.length; i++) {
        const proxyIpPort = RAW_PROXY_LIST[i];
        
        // 🚨 CRITICAL FIX: Creating the full authenticated proxy URL
        const proxyUrl = `http://${PROXY_USER}:${PROXY_PASS}@${proxyIpPort}`;
        
        // 🚨 CRITICAL FIX: Creating the HTTPS agent for the proxy
        const httpsAgent = new HttpsProxyAgent(proxyUrl);
        
        console.log(`Trying Proxy ${i + 1}/${RAW_PROXY_LIST.length}: ${proxyIpPort}`);

        try {
            const response = await axios.post(
                ga4Url,
                payload,
                {
                    // Use the custom agent to route traffic through the authenticated proxy
                    httpsAgent: httpsAgent,
                    // We must disable the default Axios proxy config to use the custom agent
                    proxy: false, 
                    timeout: 10000 // 10 second timeout
                }
            );

            // GA4 Success Status Code 204 है
            if (response.status === 204) {
                console.log(`SUCCESS: Hit sent successfully with Proxy ${proxyIpPort}`);
                return response;
            }

            console.log(`Proxy ${proxyIpPort} failed with status: ${response.status}. Retrying.`);
            lastError = new Error(`HTTP Status ${response.status} from proxy: ${proxyIpPort}`);

        } catch (error) {
            // Check for Axios specific errors (like ETIMEDOUT, ECONNRESET, etc.)
            const errorMessage = error.response ? `HTTP Status ${error.response.status}` : error.message;
            console.log(`Proxy ${proxyIpPort} failed with network error: ${errorMessage}`);
            lastError = error;
        }
    }

    // If all proxies failed
    if (lastError) {
        // If the last error was an HTTP response error (like 400), throw it specifically
        if (lastError.response && lastError.response.status) {
            throw new Error(`GA API returned HTTP ${lastError.response.status}. Detail: ${lastError.response.data || 'Bad Request'}`);
        }
        throw new Error(`Failed to send GA4 hit after trying all proxies. Last network error: ${lastError.message}`);
    } else {
        throw new Error("Failed to send GA4 hit after trying all proxies.");
    }
}

// ======================= API ENDPOINTS ========================

// Traffic Boost API: /api/boost-traffic
app.post('/api/boost-traffic', async (req, res) => {
    // Frontend is sending: ga_id, api_secret, distribution, etc.
    const { ga_id, api_secret, distribution } = req.body;
    
    let firstUrl = '';
    if (distribution && distribution.length > 0) {
        firstUrl = distribution[0].url;
    }

    if (!ga_id || !api_secret || !firstUrl) {
        return res.status(400).json({ success: false, message: "Missing required fields (ga_id, api_secret, or URL)." });
    }

    const ga4Url = `https://www.google-analytics.com/mp/collect?measurement_id=${ga_id}&api_secret=${api_secret}`;
    
    const payload = {
        "client_id": uuidv4(), 
        "events": [{
            "name": "page_view",
            "params": {
                "page_location": firstUrl,
                "session_id": String(Date.now()),
                "engagement_time_msec": "5000"
            }
        }]
    };

    try {
        const response = await sendGa4HitWithRetry(ga4Url, payload);
        
        return res.status(200).json({
            success: true, 
            message: "Traffic hit sent successfully after proxy rotation.", 
            status: response.status,
            simulation_mode: "Real Events" 
        });

    } catch (error) {
        console.error("Traffic Boost Error:", error.message);
        
        // Handle specific errors for frontend display
        let status = 500;
        if (error.message.includes('GA API returned HTTP 400')) status = 400; 

        return res.status(status).json({
            success: false,
            message: `Traffic Boost Failed. ${error.message}`,
            detail: error.message
        });
    }
});


// Caption Generator API: /api/generate-caption
app.post('/api/generate-caption', async (req, res) => {
    const { reelTopic, captionStyle, numberOfCaptions } = req.body;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ success: false, message: "GEMINI_API_KEY is not configured." });
    }

    try {
        // Use OpenAI's library with the GEMINI_API_KEY
        const openai = new OpenAI({ apiKey: GEMINI_API_KEY }); 
        
        const prompt = `Generate ${numberOfCaptions} catchy, viral captions in ${captionStyle} style for a reel about "${reelTopic}". Respond with a simple, numbered list of captions.`;
        
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", 
            messages: [{ role: "user", content: prompt }],
        });
        
        const rawCaptions = completion.choices[0].message.content.trim().split('\n');
        const captions = rawCaptions
            .map(line => line.replace(/^\s*\d+\.\s*/, '').trim()) 
            .filter(line => line.length > 0);

        return res.status(200).json({ success: true, captions: captions });
    
    } catch (error) {
        console.error("Caption Generation Error:", error.message);
        return res.status(500).json({ success: false, message: "Caption generation failed. Check API key.", detail: error.message });
    }
});


// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
