// Load environment variables (from Render Secrets)
require('dotenv').config(); 
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');
const { HttpsProxyAgent } = require('https-proxy-agent'); 

const app = express();
const PORT = process.env.PORT || 5000;

// ======================= कॉन्फ़िगरेशन और प्रॉक्सी डेटा ========================

// Environment Variables (Render Secrets) से लोड करें
const PROXY_USER = process.env.PROXY_USER;
const PROXY_PASS = process.env.PROXY_PASS;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

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

RAW_PROXY_LIST.sort(() => 0.5 - Math.random());

// Middleware
app.use(cors());
app.use(express.json());

// ======================= प्रॉक्सी लॉजिक (Sub-Function) ========================

async function sendGa4HitWithRetry(ga4Url, payload) {
    if (!PROXY_USER || !PROXY_PASS) {
        throw new Error("Traffic Boost Failed. Missing Proxy Credentials in Render Environment Variables.");
    }

    let lastError = null;

    for (let i = 0; i < RAW_PROXY_LIST.length; i++) {
        const proxyIpPort = RAW_PROXY_LIST[i];
        
        // Authenticated proxy URL
        const proxyUrl = `http://${PROXY_USER}:${PROXY_PASS}@${proxyIpPort}`;
        
        // HTTPS agent for proxying GA4 request
        const httpsAgent = new HttpsProxyAgent(proxyUrl);
        
        try {
            const response = await axios.post(
                ga4Url,
                payload,
                {
                    httpsAgent: httpsAgent,
                    proxy: false, 
                    timeout: 10000 // 10 second timeout
                }
            );

            if (response.status === 204) {
                return response;
            }

            lastError = new Error(`HTTP Status ${response.status} from proxy: ${proxyIpPort}`);

        } catch (error) {
            const errorMessage = error.response ? `HTTP Status ${error.response.status}` : error.message;
            lastError = error;
        }
    }

    if (lastError) {
        if (lastError.response && lastError.response.status) {
            throw new Error(`GA API returned HTTP ${lastError.response.status}. Detail: ${lastError.response.data || 'Bad Request'}`);
        }
        throw new Error(`Failed to send GA4 hit after trying all proxies. Last network error: ${lastError.message}`);
    } else {
        throw new Error("Failed to send GA4 hit after trying all proxies.");
    }
}

// ======================= ASYNC BACKGROUND JOB ========================

async function processTrafficJob(ga4Url, views, distribution) {
    console.log(`Starting background job for ${views} views.`);
    
    // Simplification: Hitting only the first URL for the full view count
    const urlToHit = distribution[0].url; 
    // In a real scenario, you would need to calculate a weighted list of URLs based on distribution percentage.

    for (let i = 0; i < views; i++) {
        const payload = {
            "client_id": uuidv4(), 
            "events": [{
                "name": "page_view",
                "params": {
                    "page_location": urlToHit,
                    "session_id": String(Date.now()), // New session for each hit
                    "engagement_time_msec": "5000"
                }
            }]
        };

        try {
            // Using await here to ensure we send one hit at a time
            await sendGa4HitWithRetry(ga4Url, payload);
            console.log(`Job Progress: View ${i + 1}/${views} sent successfully.`);
        } catch (error) {
            console.error(`Job Error on view ${i + 1}: ${error.message}. Continuing...`);
        }
        
        // Delay (1 to 2 seconds) between hits for realism and rate limit avoidance
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 500)); // 1.5s to 2.0s delay
    }
    console.log(`Background job for ${views} views completed.`);
}

// ======================= API ENDPOINTS ========================

// Traffic Boost API: /api/boost-traffic
app.post('/api/boost-traffic', async (req, res) => {
    const { ga_id, api_secret, views, distribution } = req.body;
    
    if (!ga_id || !api_secret || !views || !distribution || distribution.length === 0) {
        return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    if (views < 1 || views > 500) {
        return res.status(400).json({ success: false, message: "Views must be between 1 and 500." });
    }

    const ga4Url = `https://www.google-analytics.com/mp/collect?measurement_id=${ga_id}&api_secret=${api_secret}`;
    
    // 🚨 CRITICAL STEP: Start the job in the background and DO NOT await it.
    // This allows the server to immediately send the response to the frontend.
    processTrafficJob(ga4Url, views, distribution)
        .catch(err => {
            console.error(`Async Job Failed Unexpectedly: ${err.message}`);
        });

    // Send immediate response so the frontend knows the job started.
    return res.status(200).json({
        success: true, 
        message: `Job accepted and processing ${views} views in the background.`, 
        simulation_mode: "Real Events" 
    });
});


// Caption Generator API: /api/generate-caption
app.post('/api/generate-caption', async (req, res) => {
    const { reelTopic, captionStyle, numberOfCaptions } = req.body;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ success: false, message: "GEMINI_API_KEY is not configured." });
    }

    try {
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
