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

// रैंडम Google Search Referrers (dr parameter के लिए)
const SEARCH_QUERIES = [
    'best tools for traffic boosting',
    'buy organic website traffic',
    'how to increase website views fast',
    'free website traffic generator',
    'website booster tool review'
];

const getGoogleReferrer = (urlToHit) => {
    // Randomly select a search query
    const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
    const encodedQuery = encodeURIComponent(query);
    
    // Construct a realistic Google Search URL
    return `https://www.google.com/search?q=${encodedQuery}&sourceid=chrome&ie=UTF-8&filter=0&url=${encodeURIComponent(urlToHit)}`;
};


// रैंडम यूज़र एजेंट (Real User Agent Strings)
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.101 Mobile Safari/537.36',
    'Mozilla/5.0 (iPad; CPU OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/605.1.15'
];

// रैंडम स्क्रीन साइज़
const SCREEN_SIZES = [
    '1920x1080', '1366x768', '1440x900', '375x667', '414x896'
];

// Middleware
app.use(cors());
app.use(express.json());

// ======================= प्रॉक्सी लॉजिक (Sub-Function) ========================

async function sendGa4HitWithRetry(ga4Url, payload, userAgent) {
    if (!PROXY_USER || !PROXY_PASS) {
        throw new Error("Traffic Boost Failed. Missing Proxy Credentials in Render Environment Variables.");
    }

    let lastError = null;
    const MAX_RETRIES = 5; 

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
                    timeout: 15000, 
                    headers: {
                        'User-Agent': userAgent || USER_AGENTS[0] 
                    }
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
            if (String(errorMessage).includes('407')) {
                 throw new Error("Proxy Authentication Failed (407). Check PROXY_USER/PASS in Render Secrets.");
            }
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

// ======================= ASYNC BACKGROUND JOB (SEARCH TRAFFIC + REALISM) ========================

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function processTrafficJob(ga4Url, views, distribution) {
    console.log(`Starting SEARCH TRAFFIC job for ${views} views.`);
    
    const urlToHit = distribution[0].url; 
    
    for (let i = 0; i < views; i++) {
        const client_id = uuidv4();
        const session_id = String(Date.now());
        
        // CRITICAL: Get the Search Referrer URL
        const document_referrer = getGoogleReferrer(urlToHit);
        
        // Randomly select User-Agent and Screen Size for this user
        const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        const screen_resolution = SCREEN_SIZES[Math.floor(Math.random() * SCREEN_SIZES.length)];
        const engagement_duration = 10000 + Math.floor(Math.random() * 10000); // 10s to 20s engagement

        // --- 1. Session Start + Page View (The Start) ---
        const initialPayload = {
            "client_id": client_id, 
            "user_properties": {
                "screen_resolution": { "value": screen_resolution }
            },
            "events": [
                { "name": "session_start" },
                { 
                    "name": "page_view",
                    "params": {
                        "page_location": urlToHit, 
                        "document_referrer": document_referrer, // <--- CRITICAL: Search Referrer
                        "session_id": session_id,
                        "engagement_time_msec": String(engagement_duration)
                    }
                }
            ]
        };
        
        try {
            await sendGa4HitWithRetry(ga4Url, initialPayload, userAgent);
            console.log(`Job ${i + 1}: Session Start & Page View (from Search) sent.`);
        } catch (error) {
            console.error(`Job ${i + 1}: Initial events failed. ${error.message}`);
        }
        
        await wait(2000 + Math.random() * 1500); // 2s to 3.5s delay

        // --- 2. Action Event (Click or Scroll) ---
        if (Math.random() < 0.7) { 
            let actionName;
            let actionParams;

            if (Math.random() < 0.5) {
                // Scroll
                actionName = "scroll";
                actionParams = { "percent_scrolled": 80 + Math.floor(Math.random() * 20) }; 
                console.log(`Job ${i + 1}: Sending Scroll.`);
            } else {
                // Click 
                actionName = "click";
                actionParams = { "link_text": "read_more_button" }; 
                console.log(`Job ${i + 1}: Sending Click.`);
            }

            const actionPayload = {
                "client_id": client_id, 
                "events": [{
                    "name": actionName,
                    "params": {
                        ...actionParams,
                        "page_location": urlToHit,
                        "document_referrer": document_referrer, // <--- CRITICAL: Referrer sent again
                        "session_id": session_id,
                        "engagement_time_msec": String(engagement_duration)
                    }
                }]
            };

            try {
                await sendGa4HitWithRetry(ga4Url, actionPayload, userAgent);
            } catch (error) {
                console.error(`Job ${i + 1}: Action failed. ${error.message}`);
            }
        }
        
        await wait(1000 + Math.random() * 1000); // 1s to 2s delay

        // --- 3. User Engagement (The End of the Session) ---
        const engagementPayload = {
            "client_id": client_id, 
            "events": [{
                "name": "user_engagement",
                "params": {
                    "page_location": urlToHit,
                    "document_referrer": document_referrer, // <--- CRITICAL: Referrer sent again
                    "session_id": session_id,
                    "engagement_time_msec": String(engagement_duration) 
                }
            }]
        };
        
        try {
            await sendGa4HitWithRetry(ga4Url, engagementPayload, userAgent);
            console.log(`Job ${i + 1}: Engagement Event sent. **VIEW COMPLETE**`);
        } catch (error) {
            console.error(`Job ${i + 1}: Engagement failed. ${error.message}`);
        }
        
        // 4. Long Delay before Next User
        await wait(6000 + Math.random() * 4000); // 6s to 10s delay before the next user starts
    }
    console.log(`Background job for ${views} views completed.`);
}

// ======================= API ENDPOINTS (No Change) ========================

// Traffic Boost API: /api/boost-traffic
app.post('/api/boost-traffic', async (req, res) => {
    // ... (rest of the API POST code remains the same) ...

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
        message: `Job accepted and processing ${views} SEARCH VIEWS in the background.`, 
        simulation_mode: "Search Traffic + Maximum Realism" 
    });
});

// Caption Generator API: /api/generate-caption
app.post('/api/generate-caption', async (req, res) => {
    // ... (rest of the Caption API code remains the same) ...
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
