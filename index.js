// index.js (FINAL CODE - Geo & Source Payload Fix - No Proxy)

const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const fetch = require('node-fetch'); 
const cors = require('cors'); 
const fs = require('fs'); 

const app = express();
const PORT = process.env.PORT || 10000; 

// --- GEMINI KEY CONFIGURATION (Unchanged) ---
let GEMINI_KEY;
try {
    GEMINI_KEY = fs.readFileSync('/etc/secrets/gemini', 'utf8').trim(); 
} catch (e) {
    GEMINI_KEY = process.env.GEMINI_API_KEY; 
}
let ai;
if (GEMINI_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
} else {
    ai = { models: { generateContent: () => Promise.reject(new Error("AI Key Missing")) } };
}

// --- MIDDLEWARE & UTILITIES (Unchanged) ---
app.use(cors({ origin: 'https://pooreyoutuber.github.io', methods: ['GET', 'POST'], credentials: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).send('PooreYouTuber Combined API is running!');
});

const MIN_DELAY = 3000; 
const MAX_DELAY = 12000; 

// Country diversity list (Geo Fix)
const geoLocations = [
    { country: "United States", region: "California" },
    { country: "India", region: "Maharashtra" },
    { country: "Germany", region: "Bavaria" },
    { country: "Japan", region: "Tokyo" },
    { country: "United Kingdom", region: "England" },
    { country: "Brazil", region: "Sao Paulo" },
    { country: "Australia", region: "New South Wales" },
    { country: "Canada", region: "Ontario" },
    { country: "France", region: "Ile-de-France" },
    { country: "Singapore", region: "Central Region" },
];

// Realistic Traffic Source Referrers (Search/Social/Direct)
const REFERRERS = [
    'https://www.google.com/search?q=college+website+projects', 
    'https://t.co/', 
    'https://facebook.com/', 
    'https://linkedin.com/feed/', 
    'https://mail.google.com/', 
    'https://duckduckgo.com/?q=latest+projects',
    'https://pooreyoutuber.github.io' 
];

function getRandomDelay() {
    return Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY; 
}
function getRandomGeo() {
    return geoLocations[Math.floor(Math.random() * geoLocations.length)];
}
function getRandomReferrer() {
    return REFERRERS[Math.floor(Math.random() * REFERRERS.length)];
}

// --- sendData (Direct connection - No Proxy) ---
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

function generateViewPlan(totalViews, pages) {
    // ... (unchanged)
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
// 1. WEBSITE BOOSTER ENDPOINT (API: /boost-mp)
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

    res.json({ status: 'accepted', message: `Request for ${viewPlan.length} views accepted. Processing started in the background.` });

    // Start views generation asynchronously
    (async () => {
        const totalViews = viewPlan.length;

        const viewPromises = viewPlan.map((targetUrl, i) => {
            return (async () => {
                const CLIENT_ID = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
                const SESSION_ID = Date.now(); 
                const geo = getRandomGeo();
                const engagementTime = 30000 + Math.floor(Math.random() * 90000); 
                const referrer = getRandomReferrer(); 

                // 🚨 CRITICAL FIX: Separate 'country' and 'region' properties are required by GA4
                const commonUserProperties = { 
                    country: { value: geo.country }, 
                    region: { value: geo.region }
                };
                
                await new Promise(resolve => setTimeout(resolve, Math.random() * 5000)); 

                // 1. session_start
                await sendData(ga_id, api_key, { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'session_start', params: { session_id: SESSION_ID, _ss: 1 } }] }, i + 1, 'session_start');

                // 2. page_view (Source/Medium fix: page_referrer)
                const pageViewPayload = {
                    client_id: CLIENT_ID,
                    user_properties: commonUserProperties, 
                    events: [{ name: 'page_view', params: { 
                        page_location: targetUrl, 
                        page_title: `PROJECT_PAGE_${i + 1}`, 
                        session_id: SESSION_ID, 
                        engagement_time_msec: engagementTime,
                        page_referrer: referrer // 🚨 This is the Source/Medium Fix
                    } }]
                };
                const pageViewResult = await sendData(ga_id, api_key, pageViewPayload, i + 1, 'page_view');

                // 3. user_engagement (Scrolling/Reading time fix)
                await sendData(ga_id, api_key, { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'user_engagement', params: { session_id: SESSION_ID, engagement_time_msec: engagementTime } }] }, i + 1, 'user_engagement');

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


// (AI Sections remain unchanged)


// ===================================================================
// START THE SERVER 
// ===================================================================
app.listen(PORT, () => {
    console.log(`Combined API Server listening on port ${PORT}.`);
});
