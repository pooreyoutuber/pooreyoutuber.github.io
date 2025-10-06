// index.js (FINAL COMPLETE CODE with HUMAN-LIKE SIMULATION)

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

// HUMAN-LIKE DELAY PARAMETERS (Highly Random)
const MIN_VIEW_DELAY = 5000; // Minimum 5 seconds delay between two full user sessions
const MAX_VIEW_DELAY = 25000; // Maximum 25 seconds delay

function getRandomDelay() {
    return Math.random() * (MAX_VIEW_DELAY - MIN_VIEW_DELAY) + MIN_VIEW_DELAY; 
}

function getRandomEngagementTime() {
    // Session time between 45 seconds (45,000 ms) to 180 seconds (3 minutes - 180,000 ms)
    const MIN_ENG = 45000;
    const MAX_ENG = 180000;
    return Math.floor(Math.random() * (MAX_ENG - MIN_ENG) + MIN_ENG);
}

// Helper function definitions
async function sendData(gaId, apiSecret, payload, currentViewId, eventType) {
    const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;

    try {
        const response = await fetch(gaEndpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.status === 204) { 
            console.log(`[View ${currentViewId}] SUCCESS ✅ | Event: ${eventType} | Country: ${payload.user_properties.geo.value}`);
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

/**
 * Generates an item plan (e.g., countries or pages) based on percentage, 
 * ensuring the total items equals totalViews by compensating for rounding errors.
 */
function generateCompensatedPlan(totalViews, items) {
    const viewPlan = [];
    
    // Check for 100% total
    const totalPercentage = items.reduce((sum, item) => sum + (item.percent || 0), 0);
    if (totalPercentage < 99.9 || totalPercentage > 100.1) {
        console.error(`Distribution Failed: Total percentage is ${totalPercentage}%. Should be 100%.`);
        return [];
    }

    const viewsToAllocate = items.map(item => ({
        id: item.url || item.code,
        views: Math.floor(totalViews * (item.percent / 100)), // Start with floor
        remainder: (totalViews * (item.percent / 100)) % 1 // Calculate remainder
    }));

    // Calculate sum of rounded views and difference (views needed to reach totalViews)
    let sumOfViews = viewsToAllocate.reduce((sum, item) => sum + item.views, 0);
    let difference = totalViews - sumOfViews; 

    // Sort by remainder descending and add the difference views back (compensation)
    viewsToAllocate.sort((a, b) => b.remainder - a.remainder);

    for (let i = 0; i < difference; i++) {
        viewsToAllocate[i].views++;
    }

    // Now, build the final plan (maintain the original order from the input form)
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
    
    // Final check for plan size
    if (viewPlan.length !== totalViews) {
        console.error(`Plan size mismatch: Expected ${totalViews}, Got ${viewPlan.length}`);
    }

    return viewPlan;
}


// ===================================================================
// 1. WEBSITE BOOSTER ENDPOINT (API: /boost-mp) - SEQUENCE-BASED Multi-Country Logic
// ===================================================================
app.post('/boost-mp', async (req, res) => {
    const { ga_id, api_key, views, pages, countries } = req.body; 

    // --- Validation ---
    if (!ga_id || !api_key || !views || views < 1 || views > 500 || !Array.isArray(pages) || pages.length === 0 || !Array.isArray(countries) || countries.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Missing GA keys, Views (1-500), Page data, OR Country distribution data.' });
    }
    
    // Check 100% distribution for both pages and countries
    const pageTotalPercent = pages.reduce((sum, p) => sum + (p.percent || 0), 0);
    const countryTotalPercent = countries.reduce((sum, c) => sum + (c.percent || 0), 0);
    
    if (pageTotalPercent < 99.9 || pageTotalPercent > 100.1) {
         return res.status(400).json({ status: 'error', message: `Page URL distribution must total 100%, but it is ${pageTotalPercent}%.` });
    }
    if (countryTotalPercent < 99.9 || countryTotalPercent > 100.1) {
         return res.status(400).json({ status: 'error', message: `Country distribution must total 100%, but it is ${countryTotalPercent}%.` });
    }

    // --- Plan Generation (Compensated and Sequential) ---
    const totalViews = parseInt(views);
    const finalPageUrls = generateCompensatedPlan(totalViews, pages.filter(p => p.percent > 0)); 
    const countryPlan = generateCompensatedPlan(totalViews, countries.filter(c => c.percent > 0));
    
    // Combine Page URL and Country Code into a final plan
    const maxPlanLength = Math.min(finalPageUrls.length, countryPlan.length);
    let finalCombinedPlan = [];
    for (let i = 0; i < maxPlanLength; i++) {
        finalCombinedPlan.push({ 
            url: finalPageUrls[i], 
            country_code: countryPlan[i] 
        });
    }

    // --- Async Processing (Immediate Response) ---
    res.json({ 
        status: 'accepted', 
        message: `Request for ${finalCombinedPlan.length} human-like views accepted. Results expected within 24-48 hours.`
    });

    // Start views generation asynchronously
    (async () => {
        const totalViewsCount = finalCombinedPlan.length;
        console.log(`[BOOSTER START] Starting Human-Like View generation for ${totalViewsCount} views...`);

        // Process views sequentially (Ensures one view finishes before the next starts)
        for (let i = 0; i < finalCombinedPlan.length; i++) {
            const plan = finalCombinedPlan[i];
            const viewId = i + 1;
            
            // Generate human-like parameters for this single user session
            const CLIENT_ID = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
            const SESSION_ID = Date.now(); 
            const engagementTime = getRandomEngagementTime(); // Highly randomized time (45s to 3 mins)
            
            const commonUserProperties = { 
                geo: { value: plan.country_code } 
            };
            
            // 1. session_start event
            await sendData(ga_id, api_key, { 
                client_id: CLIENT_ID, 
                user_properties: commonUserProperties, 
                events: [{ name: 'session_start', params: { session_id: SESSION_ID, _ss: 1 } }] 
            }, viewId, 'session_start');

            // --- Real User Delay (Simulate time to load/think) ---
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000)); 

            // 2. page_view event
            const pageViewPayload = {
                client_id: CLIENT_ID,
                user_properties: commonUserProperties, 
                // CRITICAL: We pass the randomized engagementTime here
                events: [{ name: 'page_view', params: { page_location: plan.url, page_title: `PROJECT_PAGE_${viewId}`, session_id: SESSION_ID, engagement_time_msec: engagementTime } }]
            };
            await sendData(ga_id, api_key, pageViewPayload, viewId, 'page_view');

            // --- Real User Delay (Simulate scrolling/reading) ---
            // This small, random delay makes the event timings look real, not instantaneous.
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000)); 

            // 3. user_engagement event (Final event to close the session)
            await sendData(ga_id, api_key, { 
                client_id: CLIENT_ID, 
                user_properties: commonUserProperties, 
                events: [{ name: 'user_engagement', params: { session_id: SESSION_ID, engagement_time_msec: engagementTime } }] 
            }, viewId, 'user_engagement');

            // 4. MAIN DELAY before the NEXT country's view starts
            // This is the session-to-session gap (5s to 25s)
            await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
        }
        
        console.log(`[BOOSTER FINISH] All ${totalViewsCount} human-like views dispatched.`);

    })();
});


// ===================================================================
// 2. AI INSTA CAPTION GENERATOR ENDPOINT (API: /api/caption-generate)
// ===================================================================
app.post('/api/caption-generate', async (req, res) => { 
    // ... (This section remains unchanged) ...
    if (!GEMINI_KEY) {
        return res.status(500).json({ error: 'Server configuration error: Gemini API Key is missing.' });
    }
    
    const { reelTitle, style } = req.body;

    if (!reelTitle) {
        return res.status(400).json({ error: 'Reel topic (reelTitle) is required.' });
    }
    
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
    // ... (This section remains unchanged) ...
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
    
