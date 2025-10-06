// index.js (FINAL COMBINED CODE for Single Render Service)

const express = require('express');
const { GoogleGenAI } = require('@google/genai'); // Gemini SDK
const fetch = require('node-fetch'); // Required for Website Booster
const cors = require('cors'); 

const app = express();
const PORT = process.env.PORT || 10000;

// Gemini Client Initialization
// Ensure GEMINI_API_KEY is set in Render secrets
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); 

// Middleware Setup
// Configure CORS to allow your GitHub Pages frontend (https://pooreyoutuber.github.io)
app.use(cors({
    origin: 'https://pooreyoutuber.github.io', 
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

// Basic Health Check Endpoint
app.get('/', (req, res) => {
    res.status(200).send('PooreYouTuber Combined API is running: Website Booster & Insta Caption Generator!');
});

// ===================================================================
// --- HELPER FUNCTIONS FOR WEBSITE BOOSTER ---
// ===================================================================

const MIN_DELAY = 3000; 
const MAX_DELAY = 12000; 

const geoLocations = [
    { country: "United States", region: "California" },
    { country: "India", region: "Maharashtra" },
    { country: "Germany", region: "Bavaria" },
    { country: "Japan", region: "Tokyo" },
    { country: "United Kingdom", region: "England" },
    { country: "Canada", region: "Ontario" },
    { country: "Brazil", region: "Sao Paulo" },
    { country: "France", region: "Paris" },
    { country: "Mexico", region: "Mexico City" },
];

function getRandomDelay() {
    return Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY; 
}

function getRandomGeo() {
    return geoLocations[Math.floor(Math.random() * geoLocations.length)];
}

async function sendData(gaId, apiSecret, payload, currentViewId) {
    const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;
    const eventName = payload.events[0].name;

    try {
        const response = await fetch(gaEndpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.status === 204) { 
            if (eventName === 'page_view') {
                console.log(`[View ${currentViewId}] SUCCESS ✅ | URL: ${payload.events[0].params.page_location}`);
            }
            return { success: true };
        } else {
            const errorText = await response.text(); 
            console.error(`[View ${currentViewId}] FAILURE ❌ | Status: ${response.status}. GA4 Error: ${errorText}`);
            return { success: false };
        }
    } catch (error) {
        console.error(`[View ${currentViewId}] CRITICAL ERROR ⚠️ | Connection Failed: ${error.message}`);
        return { success: false };
    }
}

function generateViewPlan(totalViews, pages) {
    const viewPlan = [];
    const totalPercentage = pages.reduce((sum, page) => sum + page.percent, 0);
    if (totalPercentage < 99.9 || totalPercentage > 100.1) {
        console.error("Distribution Failed: Total percentage is not 100.");
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

    // Validation
    if (!ga_id || !api_key || !views || views < 1 || views > 500 || !Array.isArray(pages) || pages.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Missing GA keys, Views (1-500), or Page data.' });
    }
    
    const viewPlan = generateViewPlan(parseInt(views), pages);
    if (viewPlan.length === 0) {
         return res.status(400).json({ status: 'error', message: 'View distribution failed. Ensure Total % is 100.' });
    }

    // Acknowledge the request immediately
    res.json({ status: 'processing', message: `Request for ${viewPlan.length} views accepted. Processing started in the background.` });

    // Background Processing 
    (async () => {
        let successfulViews = 0;
        const totalViews = viewPlan.length;

        for (let i = 0; i < totalViews; i++) {
            const targetUrl = viewPlan[i]; 
            const CLIENT_ID = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
            const SESSION_ID = Date.now(); 
            const geo = getRandomGeo();
            const engagementTime = 30000 + Math.floor(Math.random() * 90000); // 30s to 120s
            const commonUserProperties = { geo: { value: `${geo.country}, ${geo.region}` } };

            // 1. Session Start
            await sendData(ga_id, api_key, { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'session_start', params: { session_id: SESSION_ID, _ss: 1 } }] }, i + 1);

            // 2. Page View (with Engagement Time)
            const pageViewPayload = {
                client_id: CLIENT_ID,
                user_properties: commonUserProperties, 
                events: [{ name: 'page_view', params: { page_location: targetUrl, page_title: `PROJECT_PAGE_${i + 1}`, session_id: SESSION_ID, engagement_time_msec: engagementTime } }]
            };
            const pageViewResult = await sendData(ga_id, api_key, pageViewPayload, i + 1);
            if (pageViewResult.success) successfulViews++;

            // 3. User Engagement
            await sendData(ga_id, api_key, { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'user_engagement', params: { session_id: SESSION_ID, engagement_time_msec: engagementTime } }] }, i + 1);

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
    
    // Check if API Key is configured
    if (!process.env.GEMINI_API_KEY) {
        console.error('FATAL: GEMINI_API_KEY is not set.');
        return res.status(500).json({ error: 'Server configuration error: Gemini API Key is missing.' });
    }
    
    const { reelTitle, style } = req.body;

    if (!reelTitle) {
        return res.status(400).json({ error: 'Reel topic (reelTitle) is required.' });
    }
    
    const prompt = `Generate 10 unique, trending, and viral Instagram Reels captions in a mix of English and Hindi for the reel topic: "${reelTitle}". The style should be: "${style || 'Catchy and Funny'}". Each caption must be followed by 3-5 relevant, high-reach hashtags on a new line. The output MUST be a JSON array of objects, where each object has a single key called 'caption'.`;

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

        // The response text is a JSON string, which we parse
        const captions = JSON.parse(response.text.trim());
        res.status(200).json({ captions: captions });

    } catch (error) {
        console.error('Gemini API Error:', error.message);
        // Return 500 error if Gemini fails (e.g., rate limit, invalid key)
        res.status(500).json({ error: 'Failed to generate captions. Please check server logs or Gemini API Key status.' });
    }
});


// ===================================================================
// START THE SERVER
// ===================================================================
app.listen(PORT, () => {
    console.log(`Combined API Server listening on port ${PORT}.`);
});
