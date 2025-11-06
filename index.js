// index.js (ULTIMATE FINAL VERSION - With Website Ads Booster Final & Weighted Traffic)

// --- Imports (Node.js Modules) ---
const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const nodeFetch = require('node-fetch'); 
const cors = require('cors'); 
const fs = require('fs'); 
const crypto = require('crypto');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent'); 
const http = require('http'); // Used for Tool 4 (Proxy Request)

const app = express();
const PORT = process.env.PORT || 10000; 

// --- GEMINI KEY CONFIGURATION ---
// Render Secrets या Environment Variables से Key लोड करें
let GEMINI_KEY;
try {
    // Render के Secret File Mount के लिए
    GEMINI_KEY = fs.readFileSync('/etc/secrets/gemini', 'utf8').trim(); 
} catch (e) {
    // Environment Variables के लिए
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
    // IMPORTANT: इसे अपने GitHub Pages फ्रंटएंड URL पर सेट करें
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
    res.status(200).send('PooreYouTuber Combined API is running! Access tools via GitHub Pages or /api/ads-booster-final.'); 
});

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// --- GEOGRAPHIC DATA (Simulated Geo) ---
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


// 🔥 Client ID Generation
function generateClientId() {
    return Math.random().toString(36).substring(2, 12) + Date.now().toString(36); 
}

// --- TRAFFIC SOURCE LOGIC (Weighted for Tool 1 & 5) ---
const TRAFFIC_SOURCES_GA4 = [ 
    // High Weightage for Organic Search (Approx 45%)
    { source: "google", medium: "organic", referrer: "https://www.google.com" },
    { source: "google", medium: "organic", referrer: "https://www.google.com" },
    { source: "google", medium: "organic", referrer: "https://www.google.com" },
    { source: "google", medium: "organic", referrer: "https://www.google.com" },
    { source: "bing", medium: "organic", referrer: "https://www.bing.com" },

    // High Weightage for Social Media (Approx 40%)
    { source: "facebook", medium: "social", referrer: "https://www.facebook.com" },
    { source: "instagram", medium: "social", referrer: "https://www.instagram.com" }, 
    { source: "instagram", medium: "social", referrer: "https://www.instagram.com" }, 
    { source: "reddit", medium: "social", referrer: "https://www.reddit.com" },
    
    // Low Weightage for Direct (Approx 15%)
    { source: "(direct)", medium: "(none)", referrer: "" },
    { source: "(direct)", medium: "(none)", referrer: "" }
];

const TRAFFIC_SOURCES_PROXY = [ 
    // Tool 4 (Proxy) के लिए साधारण रैंडम एरे
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
    
    // Tool 1 और Tool 5 के लिए, वेटेज्ड एरे से एक सोर्स चुनें
    return TRAFFIC_SOURCES_GA4[randomInt(0, TRAFFIC_SOURCES_GA4.length - 1)]; 
}

// --- UTILITIES (for Tool 1) ---
const getOptimalDelay = (totalViews) => {
    // 4 घंटे (14,400,000ms) की डिस्ट्रीब्यूशन विंडो
    const targetDurationMs = 14400000; 
    const avgDelayMs = totalViews > 0 ? targetDurationMs / totalViews : 0;
    const minDelay = Math.max(5000, avgDelayMs * 0.5); 
    const maxDelay = avgDelayMs * 1.5;
    const finalMaxDelay = Math.min(maxDelay, 1800000); 
    return randomInt(minDelay, finalMaxDelay);
};

// --- GA4 DATA SENDING (Central Function) ---
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

// Validation function 
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
 * Simulates a single view session with full attribution parameters. (Used by Tool 1 & Tool 5)
 */
async function simulateView(gaId, apiSecret, url, searchKeyword, viewCount) {
    const cid = generateClientId(); 
    const session_id = Date.now(); 
    const geo = getRandomGeo(); 
    const traffic = getRandomTrafficSource(false); // Use GA4 specific traffic logic
    const engagementTime = randomInt(30000, 120000); // 30s to 120s

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

    // View और Engagement के बीच 20s से 40s का गैप (Simulating user reading/scrolling)
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


/**
 * NEW: Simulates an Ad Click event to ensure Monetag/Ad-Network earnings are recorded. (Used by Tool 5)
 */
async function sendClickEvent(gaId, apiSecret, cid, url, viewCount) {
    const session_id = Date.now(); 
    const geo = getRandomGeo(); 
    const engagementTime = randomInt(5000, 15000); // Click session is shorter
    
    const userProperties = { simulated_geo: { value: geo.country } };

    const clickPayload = {
        client_id: cid,
        user_properties: userProperties,
        events: [
            { 
                name: 'ad_click', // Custom event for ad click
                params: { 
                    page_location: url, 
                    session_id: session_id, 
                    debug_mode: true,
                    engagement_time_msec: engagementTime,
                    click_type: "monetag_simulated_ad" 
                } 
            },
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

    let result = await sendData(gaId, apiSecret, clickPayload, viewCount, 'ad_click');
    return result.success;
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
// 4. WEBSITE BOOSTER PRIME TOOL ENDPOINT (API: /proxy-request) 
// ===================================================================
app.get('/proxy-request', async (req, res) => {
    
    // 1. Get parameters from the frontend URL query
    const { target, ip, port, auth, uid, ga_id, api_secret } = req.query; 

    //  Basic validation check
    if (!target || !ip || !port || !uid) {
        return res.status(400).json({ status: 'FAILED', error: 'Missing required query parameters (target, ip, port, uid).' });
    }

    const isGaMpEnabled = ga_id && api_secret; 
    
    // --- Proxy Setup ---
    let proxyAgent;
    const proxyAddress = `${ip}:${port}`;
    
    // Check if 'auth' (username:password) is provided and not just empty/generic
    if (auth && auth.includes(':') && auth !== ':') {
        // Use HttpsProxyAgent for authenticated proxies
        const [username, password] = auth.split(':');
        const proxyUrl = `http://${username}:${password}@${proxyAddress}`;
        proxyAgent = new HttpsProxyAgent(proxyUrl);
        console.log(`[PROXY AGENT] Using Authenticated Proxy: ${ip}`);
    } else {
        // Use standard http.Agent for non-authenticated proxies
        // Note: For HTTPS target URLs, proxyAgent needs to be set up carefully
        proxyAgent = new http.Agent({ host: ip, port: port });
        console.log(`[PROXY AGENT] Using Non-Authenticated Proxy: ${ip}`);
    }
    
    // --- GA4 MP Session Data Generation ---
    const cid = uid; 
    const session_id = Date.now(); 
    const geo = getRandomGeo(); 
    const traffic = getRandomTrafficSource(true); // Use Proxy specific traffic logic
    const engagementTime = randomInt(30000, 120000); 

    const userProperties = {
        simulated_geo: { value: geo.country }, 
        user_timezone: { value: geo.timezone }
    };
    
    let eventCount = 0;

    // --- FUNCTION TO SEND DATA VIA PROXY ---
    async function sendDataViaProxy(payload, eventType) {
        if (!isGaMpEnabled) {
             console.log(`[PROXY MP SKIP] Keys missing. Skipped: ${eventType}.`);
             return false; 
        }
        
        const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${ga_id}&api_secret=${api_secret}`; 
        payload.timestamp_micros = String(Date.now() * 1000); 
        const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"; 
        
        try { const response = await nodeFetch(gaEndpoint, { 
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 
                    'Content-Type': 'application/json',
                    'User-Agent': USER_AGENT 
                },
                agent: proxyAgent // Use the dynamically determined agent
            });

            if (response.status === 204) { 
                console.log(`[PROXY MP SUCCESS] Sent: ${eventType} via ${ip}:${port}`);
                return true;
            } else {
                const errorText = await response.text(); 
                console.error(`[PROXY MP FAILURE] Status: ${response.status}. Event: ${eventType}. GA4 Error: ${errorText.substring(0, 100)}...`);
                return false;
            }
        } catch (error) {
            console.error(`[PROXY MP CRITICAL ERROR] Event: ${eventType}. Connection Failed (Code: ${error.code || 'N/A'}). Error: ${error.message}`);
            return false;
        }
    }
    // --- END: FUNCTION TO SEND DATA VIA PROXY ---

    try {
        if (isGaMpEnabled) {
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
                        page_referrer: traffic.referrer
                    } 
                }]
            };
            if (await sendDataViaProxy(sessionStartPayload, 'session_start')) eventCount++;
            
            // 2. PAGE VIEW EVENT
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
                        engagement_time_msec: engagementTime,
                        page_referrer: traffic.referrer 
                    } 
                }]
            };
            if (await sendDataViaProxy(pageViewPayload, 'page_view')) eventCount++;
            
            // 3. USER ENGAGEMENT (Added for better GA4 Realtime accuracy)
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
            if (await sendDataViaProxy(engagementPayload, 'user_engagement')) eventCount++;
        }
        
        // 4. Send success response back to the frontend
        const message = isGaMpEnabled ? 
                        `GA4 MP data sent successfully via proxy. Events: ${eventCount}.` : 
                        'Request sent (No GA MP keys provided. Check iframe for loading).';

        res.status(200).json({ 
            status: 'OK', 
            message: message,
            eventsSent: eventCount
        });
        
    } catch (error) {
        const errorCode = error.code || error.message;
        console.error(`[PROXY REQUEST HANDLER FAILED] Error:`, errorCode);
        
        res.status(502).json({ 
            status: 'FAILED', 
            error: 'Internal Server Error during request handling', 
            details: errorCode
        });
    }
});


// ===================================================================
// 5. WEBSITE ADS BOOSTER FINAL ENDPOINT (API: /api/ads-booster-final)
//    (Monetag Earning Simulation with Clicks and Original Traffic)
// ===================================================================
app.post('/api/ads-booster-final', async (req, res) => {
    const { url, gaId, apiKey, count } = req.body; 
    const totalViewsRequested = parseInt(count); 

    if (!url || !gaId || !apiKey || totalViewsRequested !== 400) {
        return res.status(400).json({ status: 'error', message: 'Missing URL, GA ID, API Key, or View Count is not 400.' });
    }
    
    // 1. Validation Check 
    const clientIdForValidation = generateClientId();
    const validationResult = await validateKeys(gaId, apiKey, clientIdForValidation);
    
    if (!validationResult.valid) {
         return res.status(400).json({ 
            status: 'error', 
            message: `❌ Validation Failed: ${validationResult.message}. Please check your GA ID and API Secret.` 
        });
    }

    // 2. Immediate Response (Render को जल्दी फ्री करने के लिए)
    // Views: 400, Clicks (5% CTR): Approx 20
    res.json({ 
        status: 'accepted', 
        message: '✨ Request accepted. Processing 400 views and simulating clicks in the background. CHECK DEBUGVIEW NOW!',
        viewsSent: 400,
        clicksEstimated: 20
    });

    // 3. Background Processing (The Core Earning Logic)
    (async () => {
        const totalViews = 400;
        let successfulViews = 0;
        let successfulClicks = 0;
        console.log(`\n[FINAL BOOSTER START] Starting 400-view simulation with 5% CTR goal for Earning.`);
        
        for (let i = 0; i < totalViews; i++) {
            const currentView = i + 1;
            const clickChance = Math.random(); 

            // --- 3.1 Simulate Page View Session (View Count for Monetag) ---
            const viewSuccess = await simulateView(gaId, apiKey, url, "monetag earnings test", currentView);
            if (viewSuccess) {
                successfulViews++;
            }
            
            // --- 3.2 Random Click Simulation (5% Chance for earning) ---
            // यह लॉजिक Monetzag/Adsense रिपोर्ट में Earning सुनिश्चित करता है।
            if (clickChance < 0.05) { 
                console.log(`[View ${currentView}] CLICK CHANCE! Simulating ad click...`);
                // Simulate a slight delay after viewing before clicking
                await new Promise(resolve => setTimeout(resolve, randomInt(1000, 3000))); 
                
                // Use a new Client ID for the click for distinct action
                const clickSuccess = await sendClickEvent(gaId, apiKey, generateClientId(), url, currentView);
                if (clickSuccess) {
                    successfulClicks++;
                }
            }

            // --- 3.3 Delay between Sessions ---
            // Delay is critical for Render stability and realistic session duration
            const delay = randomInt(5000, 10000); 
            console.log(`[View ${currentView}/${totalViews}] Waiting for ${Math.round(delay / 1000)}s before next session.`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        console.log(`\n[FINAL BOOSTER COMPLETE] Total Views: ${successfulViews}. Total Clicks Simulated: ${successfulClicks}.`);
    })();
});


// ===================================================================
// --- SERVER START ---
// ===================================================================
app.listen(PORT, () => {
    console.log(`PooreYouTuber Combined API Server is running on port ${PORT}`);
});
