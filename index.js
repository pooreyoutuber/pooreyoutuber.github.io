// index.js (ULTIMATE FINAL VERSION - Consolidated and Fixed)

// --- Imports (Node.js Modules) ---
const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const nodeFetch = require('node-fetch'); 
const cors = require('cors'); 
const fs = require('fs'); 
const crypto = require('crypto');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent'); 
// NEW: Import 'http' for non-authenticated proxies, needed for Tool 4
const http = require('http'); 

const app = express();
const PORT = process.env.PORT || 10000; 

// --- GEMINI KEY CONFIGURATION ---
let GEMINI_KEY;
try {
    GEMINI_KEY = fs.readFileSync('/etc/secrets/gemini', 'utf8').trim(); 
} catch (e) {
    GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY; 
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
app.use(express.json({ limit: '5mb' }));

// General CORS headers
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/', (req, res) => {
    res.status(200).send('PooreYouTuber Combined API is running! Access tools via GitHub Pages.'); 
});

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// --- GEOGRAPHIC DATA (Used for simulated_geo custom dimension) ---
const geoLocations = [
    { country: "United States", region: "California", timezone: "America/Los_Angeles" },
    { country: "India", region: "Maharashtra", timezone: "Asia/Kolkata" },
    { country: "Japan", region: "Tokyo", timezone: "Asia/Tokyo" },
    { country: "Australia", region: "New South Wales", timezone: "Australia/Sydney" },
    { country: "Germany", region: "Bavaria", timezone: "Europe/Berlin" },
    { country: "France", region: "Ile-de-France", timezone: "Europe/Paris" },
    { country: "United Kingdom", region: "England", timezone: "Europe/London" },
    { country: "Canada", region: "Ontario", timezone: "America/Toronto" }
];
function getRandomGeo() {
    return geoLocations[randomInt(0, geoLocations.length - 1)];
}


// 🔥 REPLIT HACK 1: Client ID Generation (Simple, non-UUID style)
function generateClientId() {
    return Math.random().toString(36).substring(2, 12) + Date.now().toString(36); 
}

// --- TRAFFIC SOURCE LOGIC ---
// Used by Tool 1 (/boost-mp)
const TRAFFIC_SOURCES_GA4 = [ 
    { source: "google", medium: "organic", referrer: "https://www.google.com" },
    { source: "youtube", medium: "social", referrer: "https://www.youtube.com" },
    { source: "facebook", medium: "social", referrer: "https://www.facebook.com" },
    { source: "bing", medium: "organic", referrer: "https://www.bing.com" },
    { source: "reddit", medium: "referral", referrer: "https://www.reddit.com" },
    { source: "(direct)", medium: "(none)", referrer: "" }
];
// Used by Tool 4 (/proxy-request)
const TRAFFIC_SOURCES_PROXY = [ 
    { source: "google", medium: "organic", referrer: "https://www.google.com/" },
    { source: "direct", medium: "none", referrer: "" },
    { source: "facebook.com", medium: "social", referrer: "https://www.facebook.com/" },
    { source: "linkedin.com", medium: "social", referrer: "https://www.linkedin.com/" },
    { source: "bing", medium: "organic", referrer: "https://www.bing.com/" },
];

function getRandomTrafficSource(isProxyTool = false) {
    if (isProxyTool) {
        return TRAFFIC_SOURCES_PROXY[randomInt(0, TRAFFIC_SOURCES_PROXY.length - 1)];
    }
    // Logic for /boost-mp
    if (Math.random() < 0.5) {
        return TRAFFIC_SOURCES_GA4[5]; // (direct) / (none)
    }
    return TRAFFIC_SOURCES_GA4[randomInt(0, TRAFFIC_SOURCES_GA4.length - 2)]; 
}

// --- UTILITIES (for Tool 1) ---
const getOptimalDelay = (totalViews) => {
    const targetDurationMs = 14400000; 
    const avgDelayMs = totalViews > 0 ? targetDurationMs / totalViews : 0;
    const minDelay = Math.max(5000, avgDelayMs * 0.5); 
    const maxDelay = avgDelayMs * 1.5;
    const finalMaxDelay = Math.min(maxDelay, 1800000); 
    return randomInt(minDelay, finalMaxDelay);
};

// --- GA4 DATA SENDING (for /boost-mp) ---
async function sendData(gaId, apiSecret, payload, currentViewId, eventType) {
    const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;
    payload.timestamp_micros = String(Date.now() * 1000); 
    const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"; 
    
    try {
        const response = await nodeFetch(gaEndpoint, { 
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': USER_AGENT 
            }
        });

        if (response.status === 204) { 
            console.log(`[View ${currentViewId}] SUCCESS ✅ | Sent: ${eventType}`);
            return { success: true };
        } else {
            const errorText = await response.text(); 
            console.error(`[View ${currentViewId}] FAILURE ❌ | Status: ${response.status}. Event: ${eventType}. GA4 Error: ${errorText.substring(0, 100)}...`);
            return { success: false, error: errorText };
        }
    } catch (error) {
        console.error(`[View ${currentViewId}] CRITICAL ERROR ⚠️ | Event: ${eventType}. Connection Failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Validation function (for /boost-mp)
async function validateKeys(gaId, apiSecret, cid) {
    const validationEndpoint = `https://www.google-analytics.com/debug/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;
    const testPayload = {
        client_id: cid,
        events: [{ name: "test_event", params: { debug_mode: true, language: "en-US" } }]
    };
    try {
        const response = await nodeFetch(validationEndpoint, {
            method: 'POST',
            body: JSON.stringify(testPayload),
            headers: { 'Content-Type': 'application/json' }
        });
        const responseData = await response.json();
        if (responseData.validationMessages && responseData.validationMessages.length > 0) {
            const errors = responseData.validationMessages.filter(msg => msg.validationCode !== 'VALIDATION_SUCCESS');
            if (errors.length > 0) {
                const message = errors[0].description;
                if (message.includes("Invalid measurement_id") || message.includes("API Secret is not valid")) {
                    return { valid: false, message: "GA ID or API Secret is invalid. Please check keys." };
                }
                return { valid: false, message: `Validation Error: ${message.substring(0, 80)}` };
            }
        }
        console.log("[VALIDATION SUCCESS] Keys and basic payload passed Google's check.");
        return { valid: true };
    } catch (error) {
        console.error('Validation Connection Error:', error.message);
        return { valid: false, message: `Could not connect to Google validation server: ${error.message}` };
    }
}


/**
 * Simulates a single view session with full attribution parameters. (Used by /boost-mp)
 */
async function simulateView(gaId, apiSecret, url, searchKeyword, viewCount) {
    const cid = generateClientId(); 
    const session_id = Date.now(); 
    const geo = getRandomGeo(); 
    const traffic = getRandomTrafficSource(false); // Use GA4 specific traffic logic
    const engagementTime = randomInt(30000, 120000); 

    const userProperties = {
        simulated_geo: { value: geo.country }, 
        user_timezone: { value: geo.timezone }
    };
    
    let allSuccess = true;
    
    console.log(`\n--- [View ${viewCount}] Session (Geo: ${geo.country}, Source/Medium: ${traffic.source}/${traffic.medium}) ---`);

    // 1. SESSION START EVENT
    let sessionStartEvents = [
        { 
            name: "session_start", 
            params: { 
                session_id: session_id, 
                _ss: 1, 
                debug_mode: true,
                language: "en-US",
                session_default_channel_group: (traffic.medium === "organic" || traffic.medium === "social") ? traffic.medium : "Direct",
                source: traffic.source,
                medium: traffic.medium,
                page_referrer: traffic.referrer
            } 
        }
    ];

    const sessionStartPayload = {
        client_id: cid,
        user_properties: userProperties,
        events: sessionStartEvents
    };

    let result = await sendData(gaId, apiSecret, sessionStartPayload, viewCount, 'session_start');
    if (!result.success) allSuccess = false;

    await new Promise(resolve => setTimeout(resolve, randomInt(1000, 3000)));


    // 2. PAGE VIEW EVENT
    const pageViewEvents = [
        { 
            name: 'page_view', 
            params: { 
                page_location: url, 
                page_title: (traffic.medium === "organic" && searchKeyword) ? `Organic Search: ${searchKeyword}` : "Simulated Content View",
                session_id: session_id, 
                debug_mode: true,
                language: "en-US",
                engagement_time_msec: engagementTime,
                page_referrer: traffic.referrer 
            } 
        }
    ];

    const pageViewPayload = {
        client_id: cid,
        user_properties: userProperties,
        events: pageViewEvents
    };

    result = await sendData(gaId, apiSecret, pageViewPayload, viewCount, 'page_view');
    if (!result.success) allSuccess = false;

    await new Promise(resolve => setTimeout(resolve, randomInt(20000, 40000)));

    // 3. USER ENGAGEMENT
    const engagementPayload = {
        client_id: cid,
        user_properties: userProperties, 
        events: [
            { 
                name: "user_engagement", 
                params: { 
                    engagement_time_msec: engagementTime, 
                    session_id: session_id,
                    debug_mode: true 
                } 
            }
        ]
    };
    result = await sendData(gaId, apiSecret, engagementPayload, viewCount, 'user_engagement');
    if (!result.success) allSuccess = false;

    console.log(`[View ${viewCount}] Completed session. Total Engagement Time: ${Math.round(engagementTime/1000)}s.`);

    return allSuccess;
}


// --- VIEW PLAN GENERATION (for /boost-mp) ---
function generateViewPlan(totalViews, pages) {
    const viewPlan = [];
    const totalPercentage = pages.reduce((sum, page) => sum + (parseFloat(page.percent) || 0), 0);
    
    if (totalPercentage < 99.9 || totalPercentage > 100.1) {
        return [];
    }
    
    pages.forEach(page => {
        const viewsForPage = Math.round(totalViews * (parseFloat(page.percent) / 100));
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
// 1. WEBSITE BOOSTER ENDPOINT (API: /boost-mp) - GA4 TOOL 
// ===================================================================
app.post('/boost-mp', async (req, res) => {
    const { ga_id, api_key, views, pages, search_keyword } = req.body; 
    const totalViewsRequested = parseInt(views);
    const clientIdForValidation = generateClientId();

    if (!ga_id || !api_key || !totalViewsRequested || totalViewsRequested < 1 || totalViewsRequested > 500 || !Array.isArray(pages) || pages.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Missing GA keys, Views (1-500), or Page data.' });
    }
    
    const viewPlan = generateViewPlan(totalViewsRequested, pages.filter(p => p.percent > 0)); 
    if (viewPlan.length === 0) {
         return res.status(400).json({ status: 'error', message: 'View distribution failed. Ensure Total % is 100 and URLs are provided.' });
    }

    const validationResult = await validateKeys(ga_id, api_key, clientIdForValidation);
    
    if (!validationResult.valid) {
         return res.status(400).json({ 
            status: 'error', 
            message: `❌ Validation Failed: ${validationResult.message}. Please check your GA ID and API Secret.` 
        });
    }

    res.json({ 
        status: 'accepted', 
        message: `✨ Request accepted. Keys validated. Processing started in the background (Approximate run time: ${Math.round(getOptimalDelay(totalViewsRequested) * totalViewsRequested / 3600000)} hours). CHECK DEBUGVIEW NOW!`
    });

    // Start the heavy, time-consuming simulation in the background
    (async () => {
        const totalViews = viewPlan.length;
        console.log(`\n[BOOSTER START] Starting real simulation for ${totalViews} views.`);
        
        for (let i = 0; i < totalViews; i++) {
            const url = viewPlan[i];
            const currentView = i + 1;

            if (i > 0) {
                const delay = getOptimalDelay(totalViews);
                console.log(`[View ${currentView}/${totalViews}] Waiting for ${Math.round(delay / 1000)}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            await simulateView(ga_id, api_key, url, search_keyword, currentView);
        }
        
        console.log(`\n[BOOSTER COMPLETE] Successfully finished ${totalViews} view simulations.`);
    })();
});


// ===================================================================
// 2. AI INSTA CAPTION GENERATOR ENDPOINT - GEMINI TOOL 
// ===================================================================
app.post('/api/caption-generate', async (req, res) => { 
    if (!GEMINI_KEY) {
        return res.status(500).json({ error: 'Server configuration error: Gemini API Key is missing.' });
    }
    
    const { description, style } = req.body;

    if (!description) {
        return res.status(400).json({ error: 'Reel topic (description) is required.' });
    }
    
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
// 3. AI INSTA CAPTION EDITOR ENDPOINT - GEMINI TOOL 
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
        res.status(500).json({ error: `AI Editing Failed. Reason: ${error.message.substring(0, 50)}...` }
    );
    }
});


// ===================================================================
// 4. WEBSITE BOOSTER PRIME TOOL ENDPOINT (API: /proxy-request) - WEBSITE BOOSTER ADS TRAFFIC (NEW)
// ===================================================================
app.get('/proxy-request', async (req, res) => {
    
    // 1. Get parameters from the frontend URL query
    // NEW PARAMS: sessionDuration, referrer, clicker, clickDelay
    const { target, ip, port, auth, uid, ga_id, api_secret, sessionDuration, referrer, clicker, clickDelay } = req.query; 

    // Basic validation check
    if (!target || !ip || !port || !uid) {
        return res.status(400).json({ status: 'FAILED', error: 'Missing required query parameters (target, ip, port, uid).' });
    }

    const isGaMpEnabled = ga_id && api_secret; 
    const sessionDurationMs = parseInt(sessionDuration || 30) * 1000;
    const clickerEnabled = clicker === '1';
    const clickDelayMs = parseInt(clickDelay || 15) * 1000;

    // --- 2. IMMEDIATE RESPONSE (to avoid frontend timeout) ---
    // Frontend ko turant OK response dega
    const message = isGaMpEnabled ? 
                        `GA4 MP data will be sent in background via proxy. Session Duration: ${sessionDuration}s.` : 
                        'Request accepted (No GA MP keys provided).';

    res.status(200).json({ 
        status: 'ACCEPTED', 
        message: message
    });
    
    // --- 3. START HEAVY LIFTING IN BACKGROUND (IIFE) ---
    // Session ko background mein shuru karega
    (async () => {
        
        // --- Proxy Setup (FIXED) ---
        let proxyAgent;
        const proxyAddress = `${ip}:${port}`;
        
        // Authenticated vs Non-Authenticated Proxy Agent
        if (auth && auth.includes(':') && auth !== ':') {
            const [username, password] = auth.split(':');
            const proxyUrl = `http://${username}:${password}@${proxyAddress}`;
            proxyAgent = new HttpsProxyAgent(proxyUrl);
            console.log(`[PROXY AGENT] Using Authenticated Proxy: ${ip}`);
        } else {
            proxyAgent = new http.Agent({ host: ip, port: port });
            console.log(`[PROXY AGENT] Using Non-Authenticated Proxy: ${ip}`);
        }
        
        // --- GA4 MP Session Data Generation ---
        const cid = uid; 
        const session_id = Date.now(); 
        const geo = getRandomGeo(); 
        const traffic = getRandomTrafficSource(true); 
        const initialEngagementTime = randomInt(5000, 15000); // First page view duration

        const userProperties = {
            simulated_geo: { value: geo.country }, 
            user_timezone: { value: geo.timezone }
        };
        
        let eventCount = 0;
        let totalTimeWaited = 0;
        
        // --- FUNCTION TO SEND DATA VIA PROXY ---
        async function sendDataViaProxy(payload, eventType) {
            if (!isGaMpEnabled) {
                 return false; 
            }
            
            const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${ga_id}&api_secret=${api_secret}`; 
            payload.timestamp_micros = String(Date.now() * 1000); 
            const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"; 
            
            try { 
                const response = await nodeFetch(gaEndpoint, { 
                    method: 'POST',
                    body: JSON.stringify(payload),
                    headers: { 
                        'Content-Type': 'application/json',
                        'User-Agent': USER_AGENT 
                    },
                    agent: proxyAgent 
                });

                if (response.status === 204) { 
                    console.log(`[PROXY ${ip}] SUCCESS ✅ | Sent: ${eventType}`);
                    return true;
                } else {
                    const errorText = await response.text(); 
                    console.error(`[PROXY ${ip}] FAILURE ❌ | Status: ${response.status}. Event: ${eventType}. GA4 Error: ${errorText.substring(0, 100)}...`);
                    return false;
                }
            } catch (error) {
                console.error(`[PROXY ${ip}] CRITICAL ERROR ⚠️ | Event: ${eventType}. Connection Failed: ${error.message}`);
                return false;
            }
        }
        // --- END: FUNCTION TO SEND DATA VIA PROXY ---
        
        try {
            console.log(`\n--- [PROXY ${ip}] Session Start (Duration: ${sessionDuration}s, Clicker: ${clickerEnabled}) ---`);
            
            // --- PHASE 1: SESSION START & INITIAL PAGE VIEW ---
            
            // 1. SESSION START EVENT
            const sessionStartPayload = {
                client_id: cid,
                user_properties: userProperties,
                events: [{ 
                    name: "session_start", 
                    params: { 
                        session_id: session_id, 
                        _ss: 1, 
                        debug_mode: true,
                        language: "en-US",
                        session_default_channel_group: traffic.medium === "organic" ? "Organic Search" : (traffic.medium === "social" ? "Social" : "Direct"), 
                        source: traffic.source,
                        medium: traffic.medium,
                        page_referrer: referrer || traffic.referrer // Use provided referrer if available
                    } 
                }]
            };
            if (await sendDataViaProxy(sessionStartPayload, 'session_start')) eventCount++;
            
            // 2. INITIAL PAGE VIEW EVENT
            const pageViewPayload = {
                client_id: cid,
                user_properties: userProperties,
                events: [{ 
                    name: 'page_view', 
                    params: { 
                        page_location: target, 
                        page_title: target, 
                        session_id: session_id, 
                        debug_mode: true,
                        language: "en-US",
                        engagement_time_msec: initialEngagementTime,
                        page_referrer: referrer || traffic.referrer 
                    } 
                }]
            };
            if (await sendDataViaProxy(pageViewPayload, 'page_view (Initial)')) eventCount++;
            totalTimeWaited += initialEngagementTime;

            
            // --- PHASE 2: SMART CLICKER SIMULATION (Optional) ---
            if (clickerEnabled) {
                console.log(`[PROXY ${ip}] Smart Clicker: Waiting for ${Math.round(clickDelayMs/1000)}s for internal click...`);
                await new Promise(resolve => setTimeout(resolve, clickDelayMs));
                totalTimeWaited += clickDelayMs;
                
                // 3. SECOND PAGE VIEW (Simulated Internal Click)
                // New random internal URL for the click
                const internalUrl = `${target}/internal-page-click-${Math.random().toString(36).substring(2, 6)}`;
                const internalPageViewPayload = {
                    client_id: cid,
                    user_properties: userProperties,
                    events: [{ 
                        name: 'page_view', 
                        params: { 
                            page_location: internalUrl, 
                            page_title: 'Internal Page Click', 
                            session_id: session_id, 
                            debug_mode: true,
                            language: "en-US",
                            engagement_time_msec: randomInt(5000, 15000), 
                            page_referrer: target // Referrer is the main page
                        } 
                    }]
                };
                if (await sendDataViaProxy(internalPageViewPayload, 'page_view (Internal Click)')) eventCount++;
                console.log(`[PROXY ${ip}] Smart Clicker: Internal Click Registered.`);
            }
            
            // --- PHASE 3: SESSION ENGAGEMENT & SLEEP ---
            
            // Calculate remaining sleep time: Full duration - total time waited so far - safety margin (1s)
            const remainingTimeMs = Math.max(1000, sessionDurationMs - totalTimeWaited - 1000); 
            console.log(`[PROXY ${ip}] Sleeping for ${Math.round(remainingTimeMs/1000)}s to complete ${sessionDuration}s session.`);
            await new Promise(resolve => setTimeout(resolve, remainingTimeMs));
            
            // --- PHASE 4: END SESSION / USER ENGAGEMENT ---
            
            // The total time of the session
            const totalEngagementTime = sessionDurationMs + randomInt(0, 1000); 

            const engagementPayload = {
                client_id: cid,
                user_properties: userProperties, 
                events: [
                    { 
                        name: "user_engagement", 
                        params: { 
                            engagement_time_msec: totalEngagementTime, 
                            session_id: session_id,
                            debug_mode: true 
                        } 
                    }
                ]
            };
            if (await sendDataViaProxy(engagementPayload, 'user_engagement')) eventCount++;

            console.log(`[PROXY ${ip}] Session Complete. Total Events: ${eventCount}.`);
            
        } catch (error) {
            console.error(`[PROXY ${ip}] Session Aborted due to critical error:`, error.message);
        }
    })();
});


// ===================================================================
// --- SERVER START ---
// ===================================================================
// Sirf ek hi baar server start hoga
app.listen(PORT, () => {
    console.log(`PooreYouTuber Combined API Server is running on port ${PORT}`);
});
