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

// **Webshare Backbone Connection (Single Entry)**
let RAW_PROXY_LIST = [
    'p.webshare.io:80' // Backbone Proxy Domain (Webshare Rotates IPs)
];

// Middleware
app.use(cors());
app.use(express.json());

// ======================= प्रॉक्सी लॉजिक (Sub-Function) ========================

async function sendGa4HitWithRetry(ga4Url, payload) {
    if (!PROXY_USER || !PROXY_PASS) {
        throw new Error("Traffic Boost Failed. Missing Proxy Credentials in Render Environment Variables.");
    }

    let lastError = null;
    const MAX_RETRIES = 5; // Retries reduced to 5 for efficiency

    for (let i = 0; i < MAX_RETRIES; i++) {
        const proxyIpPort = RAW_PROXY_LIST[0]; 
        
        const proxyUrl = `http://${PROXY_USER}:${PROXY_PASS}@${proxyIpPort}`;
        const httpsAgent = new HttpsProxyAgent(proxyUrl);
        
        try {
            const response = await axios.post(
                ga4Url,
                payload,
                {
                    httpsAgent: httpsAgent,
                    proxy: false, 
                    timeout: 15000 
                }
            );

            if (response.status === 204) {
                return response;
            }

            lastError = new Error(`HTTP Status ${response.status} from proxy: ${proxyIpPort}`);

        } catch (error) {
            const errorMessage = error.response ? `HTTP Status ${error.response.status}` : error.message;
            lastError = error;
            console.warn(`Retry ${i+1}/${MAX_RETRIES} failed. Error: ${errorMessage}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (lastError) {
        if (lastError.response && lastError.response.status) {
            throw new Error(`GA API returned HTTP ${lastError.response.status}. Detail: ${lastError.response.data || 'Bad Request'}`);
        }
        throw new Error(`Failed to send GA4 hit after trying all retries. Last network error: ${lastError.message}`);
    } else {
        throw new Error("Failed to send GA4 hit after trying all retries.");
    }
}

// ======================= ASYNC BACKGROUND JOB (REAL EVENTS) ========================

// एक छोटे समय के लिए डिले (delay) फ़ंक्शन
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function processTrafficJob(ga4Url, views, distribution) {
    console.log(`Starting REAL EVENTS background job for ${views} views.`);
    
    const urlToHit = distribution[0].url; 

    for (let i = 0; i < views; i++) {
        const client_id = uuidv4();
        const session_id = String(Date.now());
        
        // 1. Session Start (Engagement Events का बेस)
        const sessionStartPayload = {
            "client_id": client_id, 
            "events": [{
                "name": "session_start",
                "params": {
                    "page_location": urlToHit
                }
            }]
        };
        
        try {
            await sendGa4HitWithRetry(ga4Url, sessionStartPayload);
            console.log(`Job ${i + 1}: Session Started.`);
        } catch (error) {
            console.error(`Job ${i + 1}: Session Start failed. ${error.message}`);
        }
        
        await wait(500 + Math.random() * 500); // 0.5s to 1s delay
        
        // 2. Page View (सबसे ज़रूरी)
        const pageViewPayload = {
            "client_id": client_id, 
            "events": [{
                "name": "page_view",
                "params": {
                    "page_location": urlToHit,
                    "session_id": session_id,
                    "engagement_time_msec": String(5000 + Math.floor(Math.random() * 5000)) // 5s to 10s engagement
                }
            }]
        };

        try {
            await sendGa4HitWithRetry(ga4Url, pageViewPayload);
            console.log(`Job ${i + 1}: Page View sent successfully.`);
        } catch (error) {
            console.error(`Job ${i + 1}: Page View failed. ${error.message}`);
        }
        
        await wait(2000 + Math.random() * 1500); // 2s to 3.5s delay
        
        // 3. Scroll Event (Randomly 60% time भेजेंगे)
        if (Math.random() < 0.6) {
             const scrollPayload = {
                "client_id": client_id, 
                "events": [{
                    "name": "scroll",
                    "params": {
                        "page_location": urlToHit,
                        "session_id": session_id,
                        "percent_scrolled": 90 // मान लीजिए यूज़र 90% स्क्रॉल करता है
                    }
                }]
            };
            try {
                await sendGa4HitWithRetry(ga4Url, scrollPayload);
                console.log(`Job ${i + 1}: Scroll Event sent.`);
            } catch (error) {
                console.error(`Job ${i + 1}: Scroll failed. ${error.message}`);
            }
            await wait(1000 + Math.random() * 1000); // 1s to 2s delay
        }
        
        // 4. User Engagement (GA4 का डिफ़ॉल्ट एंगेजमेंट इवेंट)
        const engagementPayload = {
            "client_id": client_id, 
            "events": [{
                "name": "user_engagement",
                "params": {
                    "page_location": urlToHit,
                    "session_id": session_id,
                    "engagement_time_msec": String(15000 + Math.floor(Math.random() * 5000)) // Total session time 15-20s
                }
            }]
        };
        
        try {
            await sendGa4HitWithRetry(ga4Url, engagementPayload);
            console.log(`Job ${i + 1}: Engagement Event sent. **VIEW COMPLETE**`);
        } catch (error) {
            console.error(`Job ${i + 1}: Engagement failed. ${error.message}`);
        }
        
        // 5. Long Delay before Next User
        await wait(5000 + Math.random() * 3000); // 5s to 8s delay before the next user starts (for concurrency)
    }
    console.log(`Background job for ${views} views completed.`);
}

// ======================= API ENDPOINTS (No Change) ========================

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
    
    // Start the job in the background and DO NOT await it.
    processTrafficJob(ga4Url, views, distribution)
        .catch(err => {
            console.error(`Async Job Failed Unexpectedly: ${err.message}`);
        });

    // Send immediate response so the frontend knows the job started. (User can close tab)
    return res.status(200).json({
        success: true, 
        message: `Job accepted and processing ${views} REAL VIEWS in the background.`, 
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
