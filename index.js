// index.js (FINAL STABLE CODE with English + Foreign Language AI Logic)

const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const nodeFetch = require('node-fetch'); 
const cors = require('cors'); 
const fs = require('fs'); 

const app = express();
const PORT = process.env.PORT || 10000; 

// --- GEMINI KEY CONFIGURATION (FIXED) ---
let GEMINI_KEY;
try {
    GEMINI_KEY = fs.readFileSync('/etc/secrets/gemini', 'utf8').trim(); 
    console.log("Gemini Key loaded successfully from Secret File.");
} catch (e) {
    GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY; 
    if (GEMINI_KEY) {
        console.log("Gemini Key loaded from Environment Variable (Fallback).");
    } else {
        console.error("FATAL: Gemini Key could not be loaded. AI Tools will fail.");
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
    origin: 'https://pooreyoutuber.github.io', 
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).send('PooreYouTuber Combined API is running!'); 
});

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomDelay = (min = 4000, max = 6000) => randomInt(min, max);

const geoLocations = [
    { country: "United States", region: "California" },
    { country: "India", region: "Maharashtra" },
    { country: "Germany", region: "Bavaria" },
    { country: "Japan", region: "Tokyo" },
];
function getRandomGeo() {
    return geoLocations[randomInt(0, geoLocations.length - 1)];
}


// --- GA4 DATA SENDING (STABLE) ---
async function sendData(gaId, apiSecret, payload, currentViewId, eventType) {
    const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;

    try {
        const response = await nodeFetch(gaEndpoint, { 
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

// --- VIEW PLAN GENERATION (Same) ---
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
// 1. WEBSITE BOOSTER ENDPOINT (API: /boost-mp) - Confirmed Stable
// ===================================================================
app.post('/boost-mp', async (req, res) => {
    const { ga_id, api_key, views, pages, search_keyword } = req.body; 

    if (!ga_id || !api_key || !views || views < 1 || views > 500 || !Array.isArray(pages) || pages.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Missing GA keys, Views (1-500), or Page data.' });
    }
    
    const viewPlan = generateViewPlan(parseInt(views), pages.filter(p => p.percent > 0)); 
    if (viewPlan.length === 0) {
         return res.status(400).json({ status: 'error', message: 'View distribution failed. Ensure Total % is 100 and URLs are provided.' });
    }

    res.json({ 
        status: 'accepted', 
        message: `Request for ${viewPlan.length} real-simulated views accepted. Processing started in the background (will be slow and stable).`
    });

    (async () => {
        const totalViews = viewPlan.length;
        console.log(`[BOOSTER START] Starting for ${totalViews} views. REAL SIMULATION ENABLED.`);

        const viewPromises = viewPlan.map((targetUrl, i) => {
            return (async () => {
                const CLIENT_ID = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
                const SESSION_ID = Date.now(); 
                const geo = getRandomGeo();
                const commonUserProperties = { geo: { value: `${geo.country}, ${geo.region}` } };
                
                await new Promise(resolve => setTimeout(resolve, randomInt(1000, 5000)));

                // STEP 1: Session Start
                await sendData(ga_id, api_key, { 
                    client_id: CLIENT_ID, 
                    user_properties: commonUserProperties, 
                    events: [{ 
                        name: 'session_start', 
                        params: { 
                            session_id: SESSION_ID, 
                            _ss: 1,
                            page_referrer: 'https://www.google.com/', 
                        } 
                    }] 
                }, i + 1, 'session_start');

                await new Promise(resolve => setTimeout(resolve, randomInt(2000, 5000)));

                // STEP 2: Actual Page View 
                const engagementTime = randomInt(30000, 90000); 
                const pageViewPayload = {
                    client_id: CLIENT_ID,
                    user_properties: commonUserProperties, 
                    events: [{ 
                        name: 'page_view', 
                        params: { 
                            page_location: targetUrl, 
                            page_title: `Simulated Landing: ${targetUrl.substring(0, 30)}`, 
                            session_id: SESSION_ID, 
                            engagement_time_msec: engagementTime 
                        } 
                    }]
                };
                const pageViewResult = await sendData(ga_id, api_key, pageViewPayload, i + 1, 'page_view');
                
                await new Promise(resolve => setTimeout(resolve, randomInt(3000, 7000)));

                // STEP 3: User Engagement 
                await sendData(ga_id, api_key, { 
                    client_id: CLIENT_ID, 
                    user_properties: commonUserProperties, 
                    events: [{ 
                        name: 'user_engagement', 
                        params: { 
                            session_id: SESSION_ID, 
                            engagement_time_msec: engagementTime 
                        } 
                    }] 
                }, i + 1, 'user_engagement');

                // FINAL DELAY 
                await new Promise(resolve => setTimeout(resolve, getRandomDelay())); 
                
                return pageViewResult.success;
            })();
        });

        Promise.all(viewPromises).then(results => {
            const finalSuccessCount = results.filter(r => r).length;
            console.log(`[BOOSTER FINISH] Total success: ${finalSuccessCount}/${totalViews}`);
        }).catch(err => {
            console.error(`[BOOSTER CRITICAL] An error occurred during view processing: ${err.message}`);
        });

    })();
});


// ===================================================================
// 2. AI INSTA CAPTION GENERATOR ENDPOINT (UPDATED LOGIC)
// ===================================================================
app.post('/api/caption-generate', async (req, res) => { 
    
    if (!GEMINI_KEY) {
        return res.status(500).json({ error: 'Server configuration error: Gemini API Key is missing.' });
    }
    
    const { description, style } = req.body;

    if (!description) {
        return res.status(400).json({ error: 'Reel topic (description) is required.' });
    }
    
    // *** FINAL PROMPT ***: 6 English + 4 Foreign Captions
    const prompt = `Generate exactly 10 unique, highly trending, and viral Instagram Reels captions. The reel topic is: "${description}". The style should be: "${style || 'Catchy and Funny'}". 

--- CRITICAL INSTRUCTION ---
1. Captions 1 through 6 MUST be STRICTLY in English.
2. Captions 7 through 10 MUST be in a foreign language (mix of Japanese and Chinese/Mandarin) to target international viewers.
3. For each caption, provide exactly 5 trending, high-reach, and relevant hashtags below the caption text, separated by a new line.
4. The final output MUST be a JSON array of 10 objects, where each object has a single key called 'caption'.`;


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
// 3. AI INSTA CAPTION EDITOR ENDPOINT (API: /api/caption-edit) - Same
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
Requested Change: "${requestedChange}"`;
    
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
