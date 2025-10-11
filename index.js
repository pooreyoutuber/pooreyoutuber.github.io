// index.js (FINAL STABLE CODE - GA4 Booster & AI Caption Generator with 15 Countries)

const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const fetch = require('node-fetch'); 
const cors = require('cors'); 
const fs = require('fs'); 

const app = express();
// Render uses process.env.PORT
const PORT = process.env.PORT || 10000; 

// --- GEMINI KEY CONFIGURATION ---
let GEMINI_KEY;
try {
    // Correct path for Secret Files on Render
    // (Agar aap Render Secrets use karte hain, toh yeh chalega)
    GEMINI_KEY = fs.readFileSync('/etc/secrets/gemini', 'utf8').trim(); 
    console.log("Gemini Key loaded successfully from Secret File.");
} catch (e) {
    // Fallback for local development or Environment Variable
    GEMINI_KEY = process.env.GEMINI_API_KEY; 
    if (GEMINI_KEY) {
        console.log("Gemini Key loaded from Environment Variable.");
    } else {
        console.error("FATAL: Gemini Key could not be loaded. Insta Caption Tool will fail.");
    }
}

// Initialize AI object only if key is available
let ai;
if (GEMINI_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
} else {
    // Dummy object to prevent crash if AI endpoints are called without a key
    ai = { models: { generateContent: () => Promise.reject(new Error("AI Key Missing")) } };
}

// --- MIDDLEWARE & UTILITIES ---
app.use(cors({
    origin: 'https://pooreyoutuber.github.io', // Aapka Frontend URL
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).send('PooreYouTuber Combined API is running! (GA4 Booster & AI)');
});

const MIN_DELAY = 3000; // 3 seconds
const MAX_DELAY = 12000; // 12 seconds
// --- 15 DIVERSE COUNTRY LOCATIONS ---
const geoLocations = [
    { country: "United States", region: "California" },
    { country: "India", region: "Maharashtra" },
    { country: "Germany", region: "Bavaria" },
    { country: "Japan", region: "Tokyo" },
    { country: "Brazil", region: "Sao Paulo" },
    { country: "United Kingdom", region: "England" },
    { country: "Canada", region: "Ontario" },
    { country: "Australia", region: "New South Wales" },
    { country: "France", region: "Ile-de-France" },
    { country: "Singapore", region: "Central Region" },
    { country: "Mexico", region: "Mexico City" },
    { country: "Russia", region: "Moscow" },
    { country: "South Africa", region: "Gauteng" },
    { country: "Spain", region: "Madrid" },
    { country: "Netherlands", region: "North Holland" },
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
            console.log(`[View ${currentViewId}] SUCCESS ✅ | Event: ${eventType}`);
            return { success: true };
        } else {
            const errorText = await response.text(); 
            console.error(`[View ${currentViewId}] FAILURE ❌ | Status: ${response.status}. GA4 Error: ${errorText.substring(0, 50)}`);
            return { success: false };
        }
    } catch (error) {
        console.error(`[View ${currentViewId}] CRITICAL ERROR ⚠️ | Connection Failed: ${error.message}`);
        return { success: false };
    }
}

// Helper: Generates a plan of which URL gets which view
function generateViewPlan(totalViews, pages) {
    const viewPlan = [];
    const totalPercentage = pages.reduce((sum, page) => sum + (page.percent || 0), 0);
    
    if (totalPercentage < 99.9 || totalPercentage > 100.1) {
        console.error(`Distribution Failed: Total percentage is ${totalPercentage}%. Should be 100%.`);
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
// 1. WEBSITE BOOSTER ENDPOINT (API: /boost-mp) - Concurrency
// ===================================================================
app.post('/boost-mp', async (req, res) => {
    const { ga_id, api_key, views, pages } = req.body; 

    if (!ga_id || !api_key || !views || views < 1 || views > 500 || !Array.isArray(pages) || pages.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Missing GA keys, Views (1-500), or Page data.' });
    }
    
    const viewPlan = generateViewPlan(parseInt(views), pages.filter(p => p.percent > 0)); 
    if (viewPlan.length === 0) {
         return res.status(400).json({ status: 'error', message: 'View distribution failed. Ensure Total % is 100 and URLs are provided.' });
    }

    // Immediately respond with 'accepted'
    // This allows the client (browser) to close immediately without waiting for all 500 views to process
    res.json({ 
        status: 'accepted', 
        message: `Request for ${viewPlan.length} views accepted. Processing started in the background.`
    });

    // Start views generation asynchronously
    (async () => {
        const totalViews = viewPlan.length;
        let successfulViews = 0;
        console.log(`[BOOSTER START] Starting for ${totalViews} views...`);

        const viewPromises = viewPlan.map((targetUrl, i) => {
            return (async () => {
                const CLIENT_ID = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
                const SESSION_ID = Date.now(); 
                const geo = getRandomGeo();
                // Real-type engagement time: 30 seconds to 120 seconds (1 minute)
                const engagementTime = 30000 + Math.floor(Math.random() * 90000); 
                const commonUserProperties = { geo: { value: `${geo.country}, ${geo.region}` } };
                
                // Initial spread delay to prevent all requests hitting at once
                await new Promise(resolve => setTimeout(resolve, Math.random() * 5000)); 

                // 1. Session Start Event (Crucial for GA4 Session metrics)
                await sendData(ga_id, api_key, { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'session_start', params: { session_id: SESSION_ID, _ss: 1 } }] }, i + 1, 'session_start');

                // 2. Page View Event (Primary view count)
                const pageViewPayload = {
                    client_id: CLIENT_ID,
                    user_properties: commonUserProperties, 
                    events: [{ name: 'page_view', params: { page_location: targetUrl, page_title: `PROJECT_PAGE_${i + 1}`, session_id: SESSION_ID, engagement_time_msec: engagementTime } }]
                };
                const pageViewResult = await sendData(ga_id, api_key, pageViewPayload, i + 1, 'page_view');
                if (pageViewResult.success) {
                    successfulViews++;
                }

                // 3. User Engagement Event (Ensures low bounce rate and high average engagement time)
                await sendData(ga_id, api_key, { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'user_engagement', params: { session_id: SESSION_ID, engagement_time_msec: engagementTime } }] }, i + 1, 'user_engagement');

                // Delay for next view to mimic natural user behavior
                await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
                
                return pageViewResult.success;
            })();
        });

        // Wait for all views to complete
        Promise.all(viewPromises).then(results => {
            console.log(`[BOOSTER FINISH] Job Ended. Total successful page_views: ${successfulViews}/${totalViews}`);
        }).catch(err => {
            console.error(`[BOOSTER CRITICAL] An error occurred during view processing: ${err.message}`);
        });

    })();
});


// ===================================================================
// 2. AI INSTA CAPTION GENERATOR ENDPOINT (API: /api/caption-generate)
// ===================================================================
app.post('/api/caption-generate', async (req, res) => { 
    
    if (!GEMINI_KEY) {
        return res.status(500).json({ error: 'Server configuration error: Gemini API Key is missing.' });
    }
    
    const { reelTitle, style } = req.body;

    if (!reelTitle) {
        return res.status(400).json({ error: 'Reel topic (reelTitle) is required.' });
    }
    
    // Prompt for Viral, Export, and View Increase Tags
    const prompt = `Generate 10 unique, highly trending, and viral Instagram Reels captions in a mix of English and Hindi for the reel topic: "${reelTitle}". The style should be: "${style || 'Catchy and Funny'}". 

--- CRITICAL INSTRUCTION ---
For each caption, provide exactly 5 trending, high-reach, and relevant hashtags. Include **latest viral Instagram marketing terms** like **#viralreel, #exportviews, #viewincrease, #reelsmarketing** only if they are relevant to the topic. Focus mainly on niche-specific and fast-trending tags to maximize virality. The final output MUST be a JSON array of objects, where each object has a single key called 'caption'.`;


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
        console.error('Gemini API Error:', error.message);
        res.status(500).json({ error: `AI Generation Failed. Reason: ${error.message.substring(0, 50)}...` });
    }
});


// ===================================================================
// 3. AI INSTA CAPTION EDITOR ENDPOINT (API: /api/caption-edit)
// ===================================================================
app.post('/api/caption-edit', async (req, res) => {
    
    if (!GEMINI_KEY) {
        return res.status(500).json({ error: 'Server configuration error: Gemini API Key is missing.' });
    }

    const { originalCaption, requestedChange } = req.body;

    if (!originalCaption || !requestedChange) {
        return res.status(400).json({ error: 'Original caption and requested change are required.' });
    }

    const prompt = `Rewrite and edit the following original caption based on the requested change. The output should be only the final, edited caption and its hashtags.

Original Caption: "${originalCaption}"
Requested Change: "${requestedChange}"

--- CRITICAL INSTRUCTION ---
The final output MUST be a single JSON object with a key called 'editedCaption'. The caption should be highly engaging for Instagram Reels. If the original caption included hashtags, ensure the edited caption has 5 relevant and trending hashtags, separated from the text by a new line.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: { editedCaption: { type: "string" } },
                    required: ["editedCaption"]
                },
                temperature: 0.7,
            },
        });

        const result = JSON.parse(response.text.trim());
        res.status(200).json(result);

    } catch (error) {
        console.error('Gemini API Error (Edit):', error.message);
        res.status(500).json({ error: `AI Editing Failed. Reason: ${error.message.substring(0, 50)}...` });
    }
});


// ===================================================================
// START THE SERVER 
// ===================================================================
app.listen(PORT, () => {
    console.log(`Combined API Server listening on port ${PORT}.`);
});
