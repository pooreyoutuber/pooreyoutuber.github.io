// index.js (FINAL CODE with ALL FIXES)

const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const fetch = require('node-fetch'); 
const cors = require('cors'); 
const fs = require('fs'); 

const app = express();
const PORT = process.env.PORT || 10000; 

// --- GEMINI KEY CONFIGURATION (Render Secret File) ---
let GEMINI_KEY;
try {
    // Reads key from Render Secret File at /etc/secrets/gemini
    GEMINI_KEY = fs.readFileSync('/etc/secrets/gemini', 'utf8').trim(); 
    console.log("Gemini Key loaded successfully from Secret File.");
} catch (e) {
    // Fallback if secret file fails
    GEMINI_KEY = process.env.GEMINI_API_KEY; 
    if (GEMINI_KEY) {
        console.log("Gemini Key loaded from Environment Variable.");
    } else {
        console.error("FATAL: Gemini Key could not be loaded. Insta Caption Tool will fail.");
    }
}

let ai;
if (GEMINI_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
} else {
    // Dummy AI object to prevent crashes if key is missing
    ai = { models: { generateContent: () => Promise.reject(new Error("AI Key Missing")) } };
}

// --- MIDDLEWARE & UTILITIES ---
app.use(cors({
    origin: 'https://pooreyoutuber.github.io', // Your Frontend URL
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).send('PooreYouTuber Combined API is running!');
});

// HUMAN-LIKE DELAY PARAMETERS 
const MIN_VIEW_DELAY = 5000; 
const MAX_VIEW_DELAY = 25000; 
function getRandomDelay() {
    return Math.random() * (MAX_VIEW_DELAY - MIN_VIEW_DELAY) + MIN_VIEW_DELAY; 
}

function getRandomEngagementTime() {
    // Session time between 45 seconds to 180 seconds (3 minutes)
    const MIN_ENG = 45000;
    const MAX_ENG = 180000;
    return Math.floor(Math.random() * (MAX_ENG - MIN_ENG) + MIN_ENG);
}

// Helper function definitions (Updated for country code parameter)
async function sendData(gaId, apiSecret, payload, currentViewId, eventType) {
    const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;

    try {
        const response = await fetch(gaEndpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.status === 204) { 
            // Successfully sent
            const countrySent = payload.events[0].params.country_code || 'N/A';
            console.log(`[View ${currentViewId}] SUCCESS ✅ | Event: ${eventType} | Country: ${countrySent}`);
            return { success: true };
        } else {
            const errorText = await response.text(); 
            console.error(`[View ${currentViewId}] FAILURE ❌ | Status: ${response.status}. GA4 Error: ${errorText.substring(0, 50)}`);
            return { success: false };
        }
    } catch (error) {
        console.error(`[View ${currentViewId}] CRITICAL ERROR ⚠️ | Connection Failed: ${error.message.substring(0, 50)}`);
        return { success: false };
    }
}

function generateCompensatedPlan(totalViews, items) {
    const viewPlan = [];
    
    if (items.length === 0 || totalViews < 1) {
        return [];
    }
    
    const viewsToAllocate = items.map(item => ({
        id: item.url || item.code,
        views: Math.floor(totalViews * (item.percent / 100)), 
        remainder: (totalViews * (item.percent / 100)) % 1 
    }));

    let sumOfViews = viewsToAllocate.reduce((sum, item) => sum + item.views, 0);
    let difference = totalViews - sumOfViews; 

    viewsToAllocate.sort((a, b) => b.remainder - a.remainder);

    for (let i = 0; i < difference && i < viewsToAllocate.length; i++) {
        viewsToAllocate[i].views++;
    }

    viewsToAllocate.sort((a, b) => {
        const indexA = items.findIndex(item => (item.url || item.code) === a.id);
        const indexB = items.findIndex(item => (item.url || item.code) === b.id);
        return indexA - indexB;
    });

    viewsToAllocate.forEach(item => {
        for (let i = 0; i < item.views; i++) {
            viewPlan.push(item.id);
        }
    });
    
    return viewPlan;
}


// ===================================================================
// 1. WEBSITE BOOSTER ENDPOINT (API: /boost-mp)
// ===================================================================
app.post('/boost-mp', async (req, res) => {
    const { ga_id, api_key, views, pages } = req.body; 

    // --- HARDCODED 18 COUNTRY DISTRIBUTION LIST ---
    const HARDCODED_COUNTRIES = [
        { code: 'US', percent: 22 }, { code: 'AU', percent: 10 }, { code: 'CH', percent: 8 }, 
        { code: 'NO', percent: 7 }, { code: 'NZ', percent: 6 }, { code: 'CA', percent: 6 }, 
        { code: 'DE', percent: 5 }, { code: 'DK', percent: 5 }, { code: 'GB', percent: 5 }, 
        { code: 'NL', percent: 4 }, { code: 'FI', percent: 3 }, { code: 'SE', percent: 3 }, 
        { code: 'AT', percent: 3 }, { code: 'BE', percent: 2 }, { code: 'FR', percent: 2 }, 
        { code: 'SG', percent: 2 }, { code: 'JP', percent: 1.5 }, { code: 'KR', percent: 1.5 }
    ];
    // ------------------------------------------------------------------

    // --- Validation ---
    const totalViews = parseInt(views) || 0;

    if (!ga_id || !api_key || totalViews < 1 || totalViews > 500 || !Array.isArray(pages)) {
        return res.status(400).json({ status: 'error', message: 'Missing GA keys, Views (1-500), or valid Page data.' });
    }
    
    const pageTotalPercent = pages.reduce((sum, p) => sum + (p.percent || 0), 0);
    
    if (pageTotalPercent < 99.9 || pageTotalPercent > 100.1) {
         return res.status(400).json({ status: 'error', message: `Page URL distribution must total 100%, but it is ${pageTotalPercent.toFixed(1)}%.` });
    }

    // --- Plan Generation ---
    const finalPageUrls = generateCompensatedPlan(totalViews, pages.filter(p => p.percent > 0)); 
    const countryPlan = generateCompensatedPlan(totalViews, HARDCODED_COUNTRIES);
    
    const maxPlanLength = Math.min(finalPageUrls.length, countryPlan.length);
    let finalCombinedPlan = [];
    for (let i = 0; i < maxPlanLength; i++) {
        finalCombinedPlan.push({ 
            url: finalPageUrls[i], 
            country_code: countryPlan[i]
        });
    }

    if (finalCombinedPlan.length === 0) {
         return res.status(400).json({ status: 'error', message: `Request accepted but plan length is 0 views. Ensure Page URLs are valid and total views > 0.` });
    }

    // --- Async Processing (Immediate Response) ---
    res.json({ 
        status: 'accepted', 
        message: `Request for ${finalCombinedPlan.length} human-like views accepted. Traffic will be distributed across 18 countries (server-side). Results expected within 24-48 hours.`
    });

    // Start views generation asynchronously
    (async () => {
        const totalViewsCount = finalCombinedPlan.length;
        console.log(`[BOOSTER START] Starting Human-Like View generation for ${totalViewsCount} views. Target 18 countries.`);

        // Process views sequentially 
        for (let i = 0; i < finalCombinedPlan.length; i++) {
            const plan = finalCombinedPlan[i];
            const viewId = i + 1;
            
            const CLIENT_ID = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
            const SESSION_ID = Date.now(); 
            const engagementTime = getRandomEngagementTime(); 
            
            // 🚨 FIX 2: Removed problematic user_properties: { geo: { value: ... } }
            const commonUserProperties = {}; 
            
            // 1. session_start event (FIX: Country Code as event parameter)
            await sendData(ga_id, api_key, { 
                client_id: CLIENT_ID, 
                user_properties: commonUserProperties, 
                events: [{ 
                    name: 'session_start', 
                    params: { 
                        session_id: SESSION_ID, 
                        _ss: 1, 
                        country_code: plan.country_code 
                    } 
                }] 
            }, viewId, 'session_start');

            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000)); 

            // 2. page_view event (FIX: Country Code as event parameter)
            const pageViewPayload = {
                client_id: CLIENT_ID,
                user_properties: commonUserProperties, 
                events: [{ 
                    name: 'page_view', 
                    params: { 
                        page_location: plan.url, 
                        page_title: `PROJECT_PAGE_${viewId}`, 
                        session_id: SESSION_ID, 
                        engagement_time_msec: engagementTime,
                        country_code: plan.country_code
                    } 
                }]
            };
            await sendData(ga_id, api_key, pageViewPayload, viewId, 'page_view');

            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000)); 

            // 3. user_engagement event (FIX: Country Code as event parameter)
            await sendData(ga_id, api_key, { 
                client_id: CLIENT_ID, 
                user_properties: commonUserProperties, 
                events: [{ 
                    name: 'user_engagement', 
                    params: { 
                        session_id: SESSION_ID, 
                        engagement_time_msec: engagementTime,
                        country_code: plan.country_code
                    } 
                }] 
            }, viewId, 'user_engagement');

            // 4. MAIN DELAY
            await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
        }
        
        console.log(`[BOOSTER FINISH] All ${totalViewsCount} human-like views dispatched.`);

    })();
});


// ===================================================================
// 2. AI INSTA CAPTION GENERATOR ENDPOINT (Uses Gemini Key)
// ===================================================================
app.post('/api/caption-generate', async (req, res) => {
    // This is a placeholder for your AI functionality, ensuring the Gemini Key is used.
    if (!GEMINI_KEY) {
        return res.status(500).json({ error: 'Gemini API Key is missing on the server.' });
    }
    
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
    }

    try {
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: [{ role: "user", parts: [{ text: `Generate an engaging Instagram caption in Hindi/Hinglish based on the following: ${prompt}` }] }],
            config: {
                maxOutputTokens: 500,
            }
        });
        res.json({ status: 'success', caption: result.text.trim() });
    } catch (e) {
        console.error("AI Generation Error:", e);
        res.status(500).json({ status: 'error', message: 'AI generation failed due to a server or API error.' });
    }
});


// ===================================================================
// 3. AI INSTA CAPTION EDITOR ENDPOINT 
// ===================================================================
app.post('/api/caption-edit', async (req, res) => {
    // This is a placeholder for your AI functionality.
     res.status(500).json({ error: 'AI endpoint is active but simplified code block is not included for brevity.' });
});


// ===================================================================
// START THE SERVER 
// ===================================================================
app.listen(PORT, () => {
    console.log(`Combined API Server listening on port ${PORT}.`);
});
