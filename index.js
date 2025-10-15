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

// ======================= 1. कॉन्फ़िगरेशन और प्रॉक्सी डेटा ========================

// Environment Variables (Render Secrets) से लोड करें
const PROXY_USER = process.env.PROXY_USER; // Should be 'bqctypvz-rotate'
const PROXY_PASS = process.env.PROXY_PASS; // Should be your Webshare password
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY; 

// 🚨 BEST PROXY METHOD: ROTATING PROXY ENDPOINT 
// यह सबसे स्थिर (stable) है।
const RAW_PROXY_LIST = [
    'p.webshare.io:80' 
];

// रैंडम Google Search Referrers
const SEARCH_QUERIES = [
    'best tools for traffic boosting', 'buy organic website traffic', 
    'how to increase website views fast', 'free website traffic generator', 
    'website booster tool review', 'organic traffic solution'
];

const getGoogleReferrer = (urlToHit) => {
    const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
    const encodedQuery = encodeURIComponent(query);
    return `https://www.google.com/search?q=${encodedQuery}&sourceid=chrome&ie=UTF-8&filter=0&url=${encodeURIComponent(urlToHit)}`;
};

// रैंडम यूज़र एजेंट और स्क्रीन साइज़
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.101 Mobile Safari/537.36',
];
const SCREEN_SIZES = ['1920x1080', '1366x768', '1440x900', '375x667', '414x896'];


// Middleware
app.use(cors());
app.use(express.json());

// ======================= 2. प्रॉक्सी लॉजिक (Sub-Function) ========================

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function sendGa4HitWithRetry(ga4Url, payload, userAgent) {
    if (!PROXY_USER || !PROXY_PASS) {
        throw new Error("Traffic Boost Failed. Missing Proxy Credentials in Render Environment Variables.");
    }

    let lastError = null;
    const MAX_RETRIES = 5; 
    const proxyIpPort = RAW_PROXY_LIST[0]; // Always p.webshare.io:80

    for (let i = 0; i < MAX_RETRIES; i++) {
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
                    headers: { 'User-Agent': userAgent || USER_AGENTS[0] }
                }
            );

            if (response.status === 204) {
                return response;
            }

            lastError = new Error(`HTTP Status ${response.status} from proxy: ${proxyIpPort}`);

        } catch (error) {
            const errorMessage = error.response ? `HTTP Status ${error.response.status}` : error.message;
            lastError = error;
            // console.warn(`Retry ${i+1}/${MAX_RETRIES} failed. Error: ${errorMessage}`);
            
            if (String(errorMessage).includes('407')) {
                 throw new Error("Proxy Authentication Failed (407). Check PROXY_USER/PASS in Render Secrets.");
            }
        }
        
        await wait(500);
    }

    if (lastError) {
        throw new Error(`Failed to send GA4 hit after trying all retries. Last network error: ${lastError.message}`);
    } else {
        throw new Error("Failed to send GA4 hit after trying all retries.");
    }
}

// ======================= 3. TRAFFIC BOOSTER LOGIC (Concurrent Dispatch) ========================

// यह फंक्शन एक सिंगल यूज़र के लिए सभी व्यूज़ को डिस्पैच करता है
async function processTrafficJob(jobId, ga4Url, views, distribution) {
    console.log(`\n--- Starting Concurrent Job: ${jobId} (Views: ${views}) ---`);
    const urlToHit = distribution[0].url; 
    
    // 24 घंटे में व्यूज डिस्पैच करें 
    const TOTAL_DISPATCH_TIME_HOURS = 24; 
    const TOTAL_DISPATCH_TIME_MS = TOTAL_DISPATCH_TIME_HOURS * 60 * 60 * 1000; 
    const BASE_DELAY_MS = TOTAL_DISPATCH_TIME_MS / views; 
    
    // हर व्यू के बीच कम से कम 1 मिनट का अंतर
    const MIN_DELAY_MS = 60000; 
    const effectiveBaseDelay = Math.max(BASE_DELAY_MS, MIN_DELAY_MS);


    for (let i = 0; i < views; i++) {
        const client_id = uuidv4();
        const session_id = String(Date.now());
        
        const document_referrer = getGoogleReferrer(urlToHit);
        const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        const screen_resolution = SCREEN_SIZES[Math.floor(Math.random() * SCREEN_SIZES.length)];
        const engagement_duration = 10000 + Math.floor(Math.random() * 10000); 

        // --- 1. Session Start + Page View ---
        const initialPayload = {
            "client_id": client_id, 
            "user_properties": { "screen_resolution": { "value": screen_resolution } },
            "events": [
                { "name": "session_start" },
                { "name": "page_view", "params": { "page_location": urlToHit, "document_referrer": document_referrer, "session_id": session_id, "engagement_time_msec": String(engagement_duration) } }
            ]
        };
        try { 
            await sendGa4HitWithRetry(ga4Url, initialPayload, userAgent);
            console.log(`[🟢 ${jobId}] View ${i+1}/${views}: Initial event complete (Green Tick).`);
        } catch (e) { 
            console.error(`[🔴 ${jobId}] View ${i+1}/${views}: Initial event failed. ${e.message}`); 
        }
        await wait(2000 + Math.random() * 1500); 

        // --- 2. Action Event (Click or Scroll) ---
        if (Math.random() < 0.7) { 
            let actionName = Math.random() < 0.5 ? "scroll" : "click";
            let actionParams = actionName === "scroll" ? { "percent_scrolled": 80 + Math.floor(Math.random() * 20) } : { "link_text": "read_more_button" }; 
            const actionPayload = {
                "client_id": client_id, 
                "events": [{ "name": actionName, "params": { ...actionParams, "page_location": urlToHit, "document_referrer": document_referrer, "session_id": session_id, "engagement_time_msec": String(engagement_duration) } }]
            };
            try { await sendGa4HitWithRetry(ga4Url, actionPayload, userAgent); } catch (e) { console.error(`[🔴 ${jobId}] View ${i+1}: Action failed.`); }
        }
        await wait(1000 + Math.random() * 1000); 

        // --- 3. User Engagement (Session End) ---
        const engagementPayload = {
            "client_id": client_id, 
            "events": [{ "name": "user_engagement", "params": { "page_location": urlToHit, "document_referrer": document_referrer, "session_id": session_id, "engagement_time_msec": String(engagement_duration) } }]
        };
        try { await sendGa4HitWithRetry(ga4Url, engagementPayload, userAgent); } catch (e) { console.error(`[🔴 ${jobId}] View ${i+1}: Engagement failed.`); }
        
        
        // --- 4. CONCURRENT DISPATCH DELAY (Long Break) ---
        // प्रतीक्षा समय: औसत देरी + 50% तक रैंडम वेरिएशन
        const randomVariance = Math.random() * effectiveBaseDelay * 0.5;
        const totalDelay = (effectiveBaseDelay + randomVariance) - 6000; // Subtract session time (approx 6s)
        
        // सुनिश्चित करें कि देरी 1 सेकंड से कम न हो
        const finalDelay = Math.max(1000, totalDelay);
        
        // Console में लंबी देरी (Pause) दिखाने की जरूरत नहीं है, क्योंकि यह लाखों मिलीसेकंड हो सकता है
        // console.log(`[${jobId}] Pausing for ${Math.round(finalDelay / 1000)} seconds before the next view.`);
        if (i < views - 1) {
            await wait(finalDelay);
        }
    }
    console.log(`--- Job ${jobId} COMPLETED ---`);
}


// ======================= 4. API ENDPOINTS ========================

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
    const jobId = uuidv4().substring(0, 8);
    
    // 🚨 CRITICAL: We start the job immediately and concurrently (without a global queue)
    // .catch() is used to handle errors without blocking the server thread
    processTrafficJob(jobId, ga4Url, views, distribution)
        .catch(err => {
            console.error(`Async Job ${jobId} Failed Unexpectedly: ${err.message}`);
        });

    return res.status(200).json({
        success: true, 
        message: `Job ${jobId} accepted. First view is being dispatched now. All views will be delivered over the next 24 hours.`, 
        simulation_mode: "Concurrent Dispatch (Green Tick Mode)" 
    });
});


// Instagram Caption Generator API: /api/generate-caption
app.post('/api/generate-caption', async (req, res) => {
    const { reelTopic, captionStyle, numberOfCaptions } = req.body;
    if (!GEMINI_API_KEY) { return res.status(500).json({ success: false, message: "API Key is not configured." }); }
    try {
        const openai = new OpenAI({ apiKey: GEMINI_API_KEY }); 
        const prompt = `Generate ${numberOfCaptions} catchy, viral captions in ${captionStyle} style for a reel about "${reelTopic}". Respond with a simple, numbered list of captions.`;
        const completion = await openai.chat.completions.create({ model: "gpt-3.5-turbo", messages: [{ role: "user", content: prompt }] });
        const captions = completion.choices[0].message.content.trim().split('\n').map(line => line.replace(/^\s*\d+\.\s*/, '').trim()).filter(line => line.length > 0);
        return res.status(200).json({ success: true, captions: captions });
    } catch (error) {
        console.error("Caption Generation Error:", error.message);
        return res.status(500).json({ success: false, message: "Caption generation failed. Check API key.", detail: error.message });
    }
});


// Article Generator API: /api/generate-article
app.post('/api/generate-article', async (req, res) => {
    const { topic, length, style } = req.body;
    if (!GEMINI_API_KEY) { return res.status(500).json({ success: false, message: "API Key is not configured." }); }
    try {
        const openai = new OpenAI({ apiKey: GEMINI_API_KEY }); 
        const prompt = `Write a comprehensive article on "${topic}". The article should be ${length} words long and written in a ${style} tone. Include an introduction, 3-4 main sections with subheadings, and a conclusion.`;
        const completion = await openai.chat.completions.create({ model: "gpt-4", messages: [{ role: "user", content: prompt }] });
        const article = completion.choices[0].message.content.trim();
        return res.status(200).json({ success: true, article: article });
    } catch (error) {
        console.error("Article Generation Error:", error.message);
        return res.status(500).json({ success: false, message: "Article generation failed. Check API key.", detail: error.message });
    }
});


// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
