// index.js (FINAL COMPLETE CODE with Multi-Country Booster)

const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const fetch = require('node-fetch'); 
const cors = require('cors'); 
const fs = require('fs'); 

const app = express();
const PORT = process.env.PORT || 10000; 

// --- GEMINI KEY CONFIGURATION (Server Startup Fix) ---
let GEMINI_KEY;
try {
    // Reads key from Render Secret File
    GEMINI_KEY = fs.readFileSync('/etc/secrets/gemini', 'utf8').trim(); 
    console.log("Gemini Key loaded successfully from Secret File.");
} catch (e) {
    // Fallback
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

const MIN_DELAY = 3000; 
const MAX_DELAY = 12000; 

function getRandomDelay() {
    return Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY; 
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

function generateViewPlan(totalViews, items) {
    const viewPlan = [];
    const totalPercentage = items.reduce((sum, item) => sum + (item.percent || 0), 0);
    
    // Safety check for 100% total
    if (totalPercentage < 99.9 || totalPercentage > 100.1) {
        console.error(`Distribution Failed: Total percentage is ${totalPercentage}%. Should be 100%.`);
        return [];
    }
    
    items.forEach(item => {
        const viewsForItem = Math.round(totalViews * (item.percent / 100));
        for (let i = 0; i < viewsForItem; i++) {
            if (item.url || item.code) { 
                // item.url (for pages) or item.code (for countries)
                viewPlan.push(item.url || item.code); 
            }
        }
    });

    viewPlan.sort(() => Math.random() - 0.5); // Shuffle the plan
    return viewPlan;
}


// ===================================================================
// 1. WEBSITE BOOSTER ENDPOINT (API: /boost-mp) - Multi-Country FIX
// ===================================================================
app.post('/boost-mp', async (req, res) => {
    // New field 'countries' added here
    const { ga_id, api_key, views, pages, countries } = req.body; 

    // --- Validation ---
    if (!ga_id || !api_key || !views || views < 1 || views > 500 || !Array.isArray(pages) || pages.length === 0 || !Array.isArray(countries) || countries.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Missing GA keys, Views (1-500), Page data, OR Country distribution data.' });
    }
    
    const pageTotalPercent = pages.reduce((sum, p) => sum + (p.percent || 0), 0);
    const countryTotalPercent = countries.reduce((sum, c) => sum + (c.percent || 0), 0);
    
    if (pageTotalPercent < 99.9 || pageTotalPercent > 100.1) {
         return res.status(400).json({ status: 'error', message: `Page URL distribution must total 100%, but it is ${pageTotalPercent}%.` });
    }
    if (countryTotalPercent < 99.9 || countryTotalPercent > 100.1) {
         return res.status(400).json({ status: 'error', message: `Country distribution must total 100%, but it is ${countryTotalPercent}%.` });
    }

    // --- Plan Generation ---
    const totalViews = parseInt(views);
    const finalPageUrls = generateViewPlan(totalViews, pages.filter(p => p.percent > 0)); 
    
    // Generate Country Plan (returns array of country codes)
    const countryPlan = generateViewPlan(totalViews, countries.filter(c => c.percent > 0));
    
    // Combine Page URL and Country Code into a single plan
    let finalCombinedPlan = [];
    for (let i = 0; i < finalPageUrls.length; i++) {
        finalCombinedPlan.push({ 
            url: finalPageUrls[i], 
            country_code: countryPlan[i] // This is the country code string
        });
    }
    
    // --- Async Processing (Immediate Response) ---
    res.json({ 
        status: 'accepted', 
        message: `Request for ${finalCombinedPlan.length} views distributed across ${countries.length} countries accepted. Processing started in the background.`
    });

    // Start views generation asynchronously
    (async () => {
        const viewPromises = finalCombinedPlan.map((plan, i) => {
            return (async () => {
                const CLIENT_ID = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
                const SESSION_ID = Date.now(); 
                const engagementTime = 30000 + Math.floor(Math.random() * 90000); 
                
                // Use the dynamically selected country code for geo property
                const commonUserProperties = { 
                    geo: { 
                        value: plan.country_code // Use 2-letter code here
                    } 
                };
                
                // 1. Initial spread delay (load distribution)
                await new Promise(resolve => setTimeout(resolve, Math.random() * 5000)); 

                // 2. session_start event
                await sendData(ga_id, api_key, { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'session_start', params: { session_id: SESSION_ID, _ss: 1 } }] }, i + 1, 'session_start');

                // 3. page_view event
                const pageViewPayload = {
                    client_id: CLIENT_ID,
                    user_properties: commonUserProperties, 
                    events: [{ name: 'page_view', params: { page_location: plan.url, page_title: `PROJECT_PAGE_${i + 1}`, session_id: SESSION_ID, engagement_time_msec: engagementTime } }]
                };
                const pageViewResult = await sendData(ga_id, api_key, pageViewPayload, i + 1, 'page_view');

                // 4. user_engagement event
                await sendData(ga_id, api_key, { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'user_engagement', params: { session_id: SESSION_ID, engagement_time_msec: engagementTime } }] }, i + 1, 'user_engagement');

                // 5. Final delay before next view starts
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
// 2 & 3. AI INSTA CAPTION ENDPOINTS (Same as before, not shown here for brevity)
// NOTE: Make sure to include the full AI code from the previous reply.
// ===================================================================

// ===================================================================
// START THE SERVER 
// ===================================================================
app.listen(PORT, () => {
    console.log(`Combined API Server listening on port ${PORT}.`);
});
        
