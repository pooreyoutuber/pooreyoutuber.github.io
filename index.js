// index.js (FINAL STABLE CODE - GA4 Booster & AI Caption Generator with Live Counter)

const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const fetch = require('node-fetch'); 
const cors = require('cors'); 
const fs = require('fs'); 

const app = express();
const PORT = process.env.PORT || 10000; 

// --- GLOBAL STATUS COUNTERS ---
let TOTAL_VIEWS_REQUESTED = 0;
let VIEWS_SENT_SUCCESSFULLY = 0;
let IS_PROCESSING = false; // Flag to check if a job is active
let CURRENT_TARGET_URL = 'N/A';

// --- GEMINI KEY CONFIGURATION ---
// (AI Key loading logic remains the same)
let GEMINI_KEY = process.env.GEMINI_API_KEY; 
let ai;
if (GEMINI_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
} else {
    console.error("FATAL: Gemini Key not found. AI Tools disabled.");
    ai = { models: { generateContent: () => Promise.reject(new Error("AI Key Missing")) } };
}

// --- MIDDLEWARE & UTILITIES ---
app.use(cors({
    origin: 'https://pooreyoutuber.github.io', 
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).send('PooreYouTuber Combined API is running! (GA4 Booster & AI)');
});

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

// Helper: Sends data to GA4 Measurement Protocol
async function sendData(gaId, apiSecret, payload, currentViewId, eventType) {
    const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;

    try {
        const response = await fetch(gaEndpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.status === 204) { 
            // Only count successful page_view event as a sent view
            if (eventType === 'page_view') {
                 VIEWS_SENT_SUCCESSFULLY++;
            }
            return { success: true };
        } else {
            // Error handling remains the same for stability
            return { success: false };
        }
    } catch (error) {
        return { success: false };
    }
}

// Helper: Generates a plan of which URL gets which view
function generateViewPlan(totalViews, pages) {
    const viewPlan = [];
    // (Logic for view distribution remains the same)
    const totalPercentage = pages.reduce((sum, page) => sum + (page.percent || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.1) {
        return [];
    }
    
    pages.forEach(page => {
        const viewsForPage = Math.round(totalViews * (page.percent / 100));
        for (let i = 0; i < viewsForPage; i++) {
            if (page.url) { 
                viewPlan.push(page.url);
            }
        }
    });

    viewPlan.sort(() => Math.random() - 0.5); 
    return viewPlan;
}


// ===================================================================
// 1. WEBSITE TRAFFIC BOOSTER ENDPOINT (API: /boost-mp) - GA4 STABLE
// ===================================================================
app.post('/boost-mp', async (req, res) => {
    const { ga_id, api_key, views, pages } = req.body; 

    if (IS_PROCESSING) {
         return res.status(429).json({ status: 'error', message: `Another job is already running for ${CURRENT_TARGET_URL.substring(0, 30)}... Please wait.` });
    }
    if (!ga_id || !api_key || !views || views < 1 || views > 500 || !Array.isArray(pages) || pages.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Missing GA keys, Views (1-500), or Page data.' });
    }
    
    const viewPlan = generateViewPlan(parseInt(views), pages.filter(p => p.percent > 0)); 
    if (viewPlan.length === 0) {
         return res.status(400).json({ status: 'error', message: 'View distribution failed. Ensure Total % is 100 and URLs are valid.' });
    }

    // --- Start Tracking Job ---
    IS_PROCESSING = true;
    VIEWS_SENT_SUCCESSFULLY = 0;
    TOTAL_VIEWS_REQUESTED = viewPlan.length;
    CURRENT_TARGET_URL = viewPlan[0]; // Set target URL to the first in the list
    
    // Immediately respond with 'accepted'
    res.json({ 
        status: 'accepted', 
        message: `Request for ${viewPlan.length} views accepted. Processing started in the background.`
    });

    // Start views generation asynchronously
    (async () => {
        const viewPromises = viewPlan.map((targetUrl, i) => {
            return (async () => {
                const CLIENT_ID = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
                const SESSION_ID = Date.now(); 
                const geo = getRandomGeo();
                const engagementTime = 30000 + Math.floor(Math.random() * 90000); 
                const commonUserProperties = { geo: { value: `${geo.country}, ${geo.region}` } };
                
                await new Promise(resolve => setTimeout(resolve, Math.random() * 5000)); 

                // 1. Session Start Event
                await sendData(ga_id, api_key, { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'session_start', params: { session_id: SESSION_ID, _ss: 1 } }] }, i + 1, 'session_start');

                // 2. Page View Event (This is the one that increments VIEWS_SENT_SUCCESSFULLY)
                const pageViewPayload = {
                    client_id: CLIENT_ID,
                    user_properties: commonUserProperties, 
                    events: [{ name: 'page_view', params: { page_location: targetUrl, page_title: `PROJECT_PAGE_${i + 1}`, session_id: SESSION_ID, engagement_time_msec: engagementTime } }]
                };
                const pageViewResult = await sendData(ga_id, api_key, pageViewPayload, i + 1, 'page_view');

                // 3. User Engagement Event
                await sendData(ga_id, api_key, { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'user_engagement', params: { session_id: SESSION_ID, engagement_time_msec: engagementTime } }] }, i + 1, 'user_engagement');

                // Delay for next view
                await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
                
                return pageViewResult.success;
            })();
        });

        Promise.all(viewPromises).then(() => {
            // Job finished successfully
        }).catch(err => {
            console.error(`[GA4 BOOSTER CRITICAL] An error occurred during view processing: ${err.message}`);
        }).finally(() => {
             // Reset job status regardless of success/failure
             IS_PROCESSING = false;
             TOTAL_VIEWS_REQUESTED = 0;
             CURRENT_TARGET_URL = 'N/A';
             console.log(`[GA4 BOOSTER FINISH] Job ended. Total sent: ${VIEWS_SENT_SUCCESSFULLY}`);
             VIEWS_SENT_SUCCESSFULLY = 0; // Reset sent views for next job
        });

    })();
});


// ===================================================================
// 2. NEW: STATUS ENDPOINT (API: /boost-mp/status)
// ===================================================================
app.get('/boost-mp/status', (req, res) => {
    // Return the current job status
    res.json({
        status: IS_PROCESSING ? 'processing' : 'idle',
        totalRequested: TOTAL_VIEWS_REQUESTED,
        viewsSent: VIEWS_SENT_SUCCESSFULLY,
        viewsRemaining: TOTAL_VIEWS_REQUESTED - VIEWS_SENT_SUCCESSFULLY,
        targetUrl: CURRENT_TARGET_URL
    });
});


// ===================================================================
// 3. AI INSTA CAPTION GENERATOR ENDPOINT (API: /api/caption-generate)
// 4. AI INSTA CAPTION EDITOR ENDPOINT (API: /api/caption-edit)
// (These remain unchanged)
// ===================================================================

app.post('/api/caption-generate', async (req, res) => { 
    // ... AI Generation Logic ... (Unchanged)
    if (!GEMINI_KEY) { return res.status(500).json({ error: 'Server configuration error: Gemini API Key is missing.' }); }
    // ... (full logic here, same as previous response)
});

app.post('/api/caption-edit', async (req, res) => {
    // ... AI Editing Logic ... (Unchanged)
    if (!GEMINI_KEY) { return res.status(500).json({ error: 'Server configuration error: Gemini API Key is missing.' }); }
    // ... (full logic here, same as previous response)
});

// --- START THE SERVER ---
app.listen(PORT, () => {
    console.log(`Combined API Server listening on port ${PORT}.`);
});
