// index.js (FINAL COMPLETE CODE for Combined Service)

const express = require('express');
const { GoogleGenAI } = require('@google/genai'); // Gemini SDK
const fetch = require('node-fetch'); // Required for Website Booster
const cors = require('cors'); 
const fs = require('fs'); // Required to read Secret File

const app = express();
const PORT = process.env.PORT || 10000;

// ===================================================================
// --- GEMINI KEY CONFIGURATION (Reads from Secret File 'gemini') ---
// ===================================================================
let GEMINI_KEY;
try {
    // Attempt to read the key from the Secret File path
    GEMINI_KEY = fs.readFileSync('/etc/secrets/gemini', 'utf8').trim();
    console.log("Gemini Key loaded successfully from Secret File."); // Log is critical for debugging
} catch (e) {
    // Fallback to Environment Variable or failure
    GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (GEMINI_KEY) {
        console.log("Gemini Key loaded successfully from Environment Variable.");
    } else {
        console.error("FATAL: Gemini Key could not be loaded. Insta Caption Tool will fail.");
    }
}

// Gemini Client Initialization
const ai = new GoogleGenAI({ apiKey: GEMINI_KEY }); 

// ===================================================================
// --- MIDDLEWARE & HEALTH CHECK ---
// ===================================================================
app.use(cors({
    origin: 'https://pooreyoutuber.github.io', 
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
    // This confirms the server is awake and helps with the Free Tier issue.
    res.status(200).send('PooreYouTuber Combined API is running!');
});

// ===================================================================
// --- WEBSITE BOOSTER FUNCTIONS (With improved logging) ---
// ===================================================================

const MIN_DELAY = 3000; 
const MAX_DELAY = 12000; 
const geoLocations = [
    { country: "United States", region: "California" },
    { country: "India", region: "Maharashtra" },
    { country: "Germany", region: "Bavaria" },
    { country: "Japan", region: "Tokyo" },
];

function getRandomDelay() {
    return Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY; 
}

function getRandomGeo() {
    return geoLocations[Math.floor(Math.random() * geoLocations.length)];
}

async function sendData(gaId, apiSecret, payload, currentViewId, eventType) {
    const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;

    try {
        const response = await fetch(gaEndpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.status === 204) { 
            // 🌟 IMPROVED LOGGING FOR GREEN TICK 🌟
            console.log(`[View ${currentViewId}] SUCCESS ✅ | Event: ${eventType} | Client ID: ${payload.client_id.substring(0, 5)}...`);
            return { success: true };
        } else {
            const errorText = await response.text(); 
            console.error(`[View ${currentViewId}] FAILURE ❌ | Event: ${eventType} | Status: ${response.status}. GA4 Error: ${errorText}`);
            return { success: false };
        }
    } catch (error) {
        console.error(`[View ${currentViewId}] CRITICAL ERROR ⚠️ | Event: ${eventType} | Connection Failed: ${error.message}`);
        return { success: false };
    }
}

function generateViewPlan(totalViews, pages) {
    // ... (logic to create viewPlan array remains the same)
    const viewPlan = [];
    const totalPercentage = pages.reduce((sum, page) => sum + page.percent, 0);
    
    if (totalPercentage < 99.9 || totalPercentage > 100.1) {
        console.error(`Distribution Failed: Total percentage is ${totalPercentage}%. Should be 100%.`);
        return [];
    }
    
    pages.forEach(page => {
        const viewsForPage = Math.round(totalViews * (page.percent / 100));
        for (let i = 0; i < viewsForPage; i++) {
            viewPlan.push(page.url);
        }
    });

    viewPlan.sort(() => Math.random() - 0.5);
    return viewPlan;
}

// ===================================================================
// 1. WEBSITE BOOSTER ENDPOINT (API: /boost-mp)
// ===================================================================
app.post('/boost-mp', async (req, res) => {
    const { ga_id, api_key, views, pages } = req.body; 

    if (!ga_id || !api_key || !views || views < 1 || views > 500 || !Array.isArray(pages) || pages.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Missing GA keys, Views (1-500), or Page data.' });
    }
    
    const viewPlan = generateViewPlan(parseInt(views), pages);
    if (viewPlan.length === 0) {
         return res.status(400).json({ status: 'error', message: 'View distribution failed. Ensure Total % is 100.' });
    }

    res.json({ status: 'processing', message: `Request for ${viewPlan.length} views accepted. Processing started in the background.` });

    // Background Processing 
    (async () => {
        let successfulViews = 0;
        const totalViews = viewPlan.length;
        console.log(`Starting Website Booster for ${totalViews} views...`);

        for (let i = 0; i < totalViews; i++) {
            const targetUrl = viewPlan[i]; 
            const CLIENT_ID = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
            const SESSION_ID = Date.now(); 
            const geo = getRandomGeo();
            const engagementTime = 30000 + Math.floor(Math.random() * 90000); 
            const commonUserProperties = { geo: { value: `${geo.country}, ${geo.region}` } };

            // 1. session_start
            await sendData(ga_id, api_key, { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'session_start', params: { session_id: SESSION_ID, _ss: 1 } }] }, i + 1, 'session_start');

            // 2. page_view (The main view event)
            const pageViewPayload = {
                client_id: CLIENT_ID,
                user_properties: commonUserProperties, 
                events: [{ name: 'page_view', params: { page_location: targetUrl, page_title: `PROJECT_PAGE_${i + 1}`, session_id: SESSION_ID, engagement_time_msec: engagementTime } }]
            };
            const pageViewResult = await sendData(ga_id, api_key, pageViewPayload, i + 1, 'page_view');
            if (pageViewResult.success) successfulViews++;

            // 3. user_engagement
            await sendData(ga_id, api_key, { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'user_engagement', params: { session_id: SESSION_ID, engagement_time_msec: engagementTime } }] }, i + 1, 'user_engagement');

            // Delay for realistic traffic
            await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
        }
        console.log(`--- WEBSITE BOOST FINISHED. Total success: ${successfulViews}/${totalViews} ---`);
    })();
});


// ===================================================================
// 2. AI INSTA CAPTION GENERATOR ENDPOINT (API: /api/caption-generate)
// ===================================================================
app.post('/api/caption-generate', async (req, res) => { 
    
    // Check if key was successfully loaded
    if (!GEMINI_KEY) {
        console.error('Gemini API call failed because key is missing.');
        return res.status(500).json({ error: 'Server configuration error: Gemini API Key is missing or invalid on the server.' });
    }
    
    const { reelTitle, style } = req.body;

    if (!reelTitle) {
        return res.status(400).json({ error: 'Reel topic (reelTitle) is required.' });
    }
    
    // 🚀 IMPROVED PROMPT FOR VIRAL TAGS 🚀
    const prompt = `Generate 10 unique, highly trending, and viral Instagram Reels captions in a mix of English and Hindi for the reel topic: "${reelTitle}". The style should be: "${style || 'Catchy and Funny'}". 

--- CRITICAL INSTRUCTION ---
For each caption, provide exactly 5 trending, high-reach, and relevant hashtags. These hashtags must be separated from the caption by a new line. Do not use generic tags like #reels or #instagram. Focus only on niche-specific and fast-trending tags to maximize virality. The final output MUST be a JSON array of objects, where each object has a single key called 'caption'.`;


    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "array",
                    items: { type: "object", properties: { caption: { type: "string" } }, required: ["caption"] }
                },
                temperature: 0.8,
            },
        });

        const captions = JSON.parse(response.text.trim());
        res.status(200).json({ captions: captions });

    } catch (error) {
        // This handles errors if the key is invalid or API quota is hit
        console.error('Gemini API Error:', error.message);
        res.status(500).json({ error: `AI Generation Failed. Reason: ${error.message.substring(0, 50)}... Please check the Gemini API dashboard.` });
    }
});


// ===================================================================
// START THE SERVER
// =================================
