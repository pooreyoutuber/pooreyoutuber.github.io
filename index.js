// ===================================================================
// index.js (ULTIMATE FINAL VERSION - All 6 Tools)
//
// **NOTE:** This file requires external libraries:
// 1. npm install express @google/genai node-fetch cors axios crypto path url multer fluent-ffmpeg p-queue
// 2. You must ensure 'ffmpeg' is installed on your Render environment (via buildpack).
// ===================================================================

// --- Imports (Node.js Modules) ---
const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const nodeFetch = require('node-fetch'); 
const cors = require('cors'); 
const fs = require('fs'); 
const crypto = require('crypto');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent'); 
const http = require('http'); 
const { URL } = require('url'); 

// --- NEW IMPORTS FOR TOOL 6 (AI ANIME CONVERTER) ---
const multer = require('multer');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg'); 
const { default: PQueue } = require('p-queue'); 
// ---------------------------------------------------

const app = express();
const PORT = process.env.PORT || 10000; 

// --- GEMINI KEY CONFIGURATION ---
// IMPORTANT: Gemini API Key को Render Environment Variable 'GEMINI_API_KEY' में स्टोर करें।
let GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY; 

let ai;
if (GEMINI_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
} else {
    console.error("CRITICAL: Gemini API Key is missing. AI tools will not function.");
    ai = { models: { generateContent: () => Promise.reject(new Error("AI Key Missing")) } };
}

// --- MIDDLEWARE & UTILITIES ---
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json({ limit: '5mb' })); 

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/', (req, res) => {
    res.status(200).send('PooreYouTuber Combined API is running! Access tools via GitHub Pages.'); 
});

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// 🔥 CONSTANTS FOR EARNING LOGIC (Tool 4)
const HIGH_VALUE_ACTION_CHANCE = 0.40; 
const YOUTUBE_ENGAGEMENT_CHANCE = 0.35; 
const YOUTUBE_FULL_RETENTION_PERCENT = 0.25; 
const YOUTUBE_MID_RETENTION_PERCENT = 0.65; 

// --- GEOGRAPHIC DATA (Used for simulated_geo custom dimension) ---
const geoLocations = [
    { country: "United States", region: "California", timezone: "America/Los_Angeles" },
    { country: "India", region: "Maharashtra", timezone: "Asia/Kolkata" },
    { country: "Japan", region: "Tokyo", timezone: "Asia/Tokyo" },
    { country: "Australia", region: "New South Wales", timezone: "Australia/Sydney" },
    { country: "Germany", region: "Bavaria", timezone: "Europe/Berlin" },
];
function getRandomGeo() {
    return geoLocations[randomInt(0, geoLocations.length - 1)];
}

// 🔥 Client ID Generation (Simple, non-UUID style)
function generateClientId() {
    return Math.random().toString(36).substring(2, 12) + Date.now().toString(36); 
}

// --- TRAFFIC SOURCE LOGIC (Used by Tool 1, 4) ---
const TRAFFIC_SOURCES_GA4 = [ 
    { source: "google", medium: "organic", referrer: "https://www.google.com" },
    { source: "youtube", medium: "social", referrer: "https://www.youtube.com" },
    { source: "facebook", medium: "social", referrer: "https://www.facebook.com" },
    { source: "bing", medium: "organic", referrer: "https://www.bing.com" },
    { source: "reddit", medium: "referral", referrer: "https://www.reddit.com" },
    { source: "(direct)", medium: "(none)", referrer: "" }
];
const TRAFFIC_SOURCES_PROXY = [ 
    { source: "google", medium: "organic", referrer: "https://www.google.com/" },
    { source: "facebook.com", medium: "social", referrer: "https://www.facebook.com/" },
    { source: "linkedin.com", medium: "social", referrer: "https://www.linkedin.com/" },
    { source: "bing", medium: "organic", referrer: "https://www.bing.com/" },
    { source: "(direct)", medium: "(none)", referrer: "" }
];

function getRandomTrafficSource(isProxyTool = false) {
    if (isProxyTool) {
        if (Math.random() < 0.2) {
             return TRAFFIC_SOURCES_PROXY[4]; 
        }
        return TRAFFIC_SOURCES_PROXY[randomInt(0, TRAFFIC_SOURCES_PROXY.length - 2)];
    }
    if (Math.random() < 0.5) {
        return TRAFFIC_SOURCES_GA4[5]; 
    }
    return TRAFFIC_SOURCES_GA4[randomInt(0, TRAFFIC_SOURCES_GA4.length - 2)]; 
}

// --- YOUTUBE TRAFFIC SOURCE LOGIC (Tool 5) ---
const YOUTUBE_INTERNAL_SOURCES = [
    { source: "youtube", medium: "internal", referrer: "https://www.youtube.com/feed/subscriptions" }, 
    { source: "youtube", medium: "internal", referrer: "https://www.youtube.com/results?search_query=trending+video+topic" },
    { source: "youtube", medium: "internal", referrer: "https://www.youtube.com/watch?v=suggestedVideoID" }, 
    { source: "external", medium: "social", referrer: "https://www.facebook.com" }, 
];

function getYoutubeTrafficSource() {
    if (Math.random() < 0.60) {
        return YOUTUBE_INTERNAL_SOURCES[randomInt(0, 2)];
    }
    if (Math.random() < 0.5) {
        return getRandomTrafficSource(false);
    }
    return YOUTUBE_INTERNAL_SOURCES[3];
}

// --- USER AGENT DIVERSITY ---
const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version=17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/2010101 Firefox/120.0"
];

function getRandomUserAgent() {
    return USER_AGENTS[randomInt(0, USER_AGENTS.length - 1)];
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

// --- GA4 DATA SENDING (for /boost-mp and /youtube-boost-mp) ---
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

// Validation function (for all GA4 tools)
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
    const traffic = getRandomTrafficSource(false); 
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
                campaign_source: traffic.source, 
                campaign_medium: traffic.medium,
                session_default_channel_group: (traffic.medium === "organic" || traffic.medium === "social") ? traffic.medium : "Direct",
                page_referrer: traffic.referrer, 
                _ss: 1, 
                debug_mode: true,
                language: "en-US"
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
        res.status(500).json({ error: `AI Editing Failed. Reason: ${error.message.substring(0, 50)}...` });
    }
});

// ===================================================================
// --- Tool 4 Helpers ---
// ===================================================================

// --- AI FUNCTION FOR KEYWORD GENERATION (Used by Tool 4) ---
async function generateSearchKeyword(targetUrl, isHighValue = false) {
    if (!ai || !GEMINI_KEY) { return null; }
    
    let urlPath;
    try {
        urlPath = new URL(targetUrl).pathname;
    } catch (e) {
        urlPath = targetUrl;
    }
    
    let prompt;
    if (isHighValue) {
        prompt = `Generate exactly 5 highly expensive, transactional search queries (keywords) for high-CPC niches like Finance, Insurance, Software, or Legal, which are still related to the topic/URL path: ${urlPath}. The goal is to maximize ad revenue. Queries can be a mix of Hindi and English. Format the output as a JSON array of strings.`;
    } else {
        prompt = `Generate exactly 5 realistic and highly relevant search queries (keywords) that an actual person might use to find a webpage with the topic/URL path: ${urlPath}. Queries can be a mix of Hindi and English. Format the output as a JSON array of strings.`;
    }
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "array",
                    items: { type: "string" }
                   },
                temperature: 0.9, 
            },
        });
        const keywords = JSON.parse(response.text.trim());
        if (Array.isArray(keywords) && keywords.length > 0) {
            return keywords[randomInt(0, keywords.length - 1)]; 
        }
    } catch (error) {
        console.error('Gemini Keyword Generation Failed:', error.message);
    }
    return null; 
}


// --- FUNCTION TO SIMULATE HIGH-VALUE CONVERSION (Used by Tool 4) ---
async function simulateConversion(targetUrl, proxyAgent, originalReferrer, userAgent) {
    const parsedUrl = new URL(targetUrl);
    const domain = parsedUrl.origin;
    
    console.log(`[ACTION 1] Simulating 2s mouse movement and pause (Human Interaction).`);
    await new Promise(resolve => setTimeout(resolve, randomInt(1500, 2500)));

    const conversionTarget = domain + '/random-page-' + randomInt(100, 999) + '.html'; 
    
    try {
        console.log(`[ACTION 2] Simulating Conversion: Loading second page (${conversionTarget}).`);
        
        await nodeFetch(conversionTarget, {
            method: 'GET',
            headers: { 
                'User-Agent': userAgent,
                'Referer': targetUrl 
            }, 
            agent: proxyAgent, 
            timeout: 5000 
        });
        console.log(`[CONVERSION SUCCESS] Second page loaded successfully (Simulated high-value action).`);
        return true;
    } catch (error) {
        console.log(`[CONVERSION FAIL] Simulated second page load failed: ${error.message}`);
        return false;
    }
}


// ===================================================================
// 4. WEBSITE BOOSTER PRIME TOOL ENDPOINT (API: /proxy-request) - FIXED
// ===================================================================
app.get('/proxy-request', async (req, res) => {
    
    const { target, ip, port, auth, uid, ga_id, api_secret, clicker } = req.query; 

    if (!target || !ip || !port || !uid) {
        return res.status(400).json({ status: 'FAILED', error: 'Missing required query parameters (target, ip, port, uid).' });
    }

    const isGaMpEnabled = ga_id && api_secret; 
    const USER_AGENT = getRandomUserAgent(); 
    
    // --- Proxy Setup (FIXED: Using HttpsProxyAgent) ---
    let proxyAgent;
    let proxyUrl;
    const proxyAddress = `${ip}:${port}`;
    
    if (auth && auth.includes(':') && auth !== ':') {
        const [username, password] = auth.split(':');
        proxyUrl = `http://${username}:${password}@${proxyAddress}`; 
        console.log(`[PROXY AGENT] Using Authenticated Proxy: ${ip}`);
    } else {
        proxyUrl = `http://${proxyAddress}`;
        console.log(`[PROXY AGENT] Using Non-Authenticated Proxy: ${ip}`);
    }
    
    try {
        proxyAgent = new HttpsProxyAgent(proxyUrl);
    } catch (e) {
        console.error("[PROXY SETUP ERROR] Failed to create proxy agent:", e.message);
        return res.status(500).json({ status: 'FAILED', error: 'Proxy setup failed due to internal error.' });
    }
    
    // --- EARNING CONTROL LOGIC ---
    let shouldRunConversion = false;
    let earningMode = 'ADSENSE SAFE (High Impression Mode)';
    let useHighCpcKeywords = false;
    
    if (clicker === '1') {
        if (Math.random() < HIGH_VALUE_ACTION_CHANCE) {
            shouldRunConversion = true;
            useHighCpcKeywords = true; 
            earningMode = 'MAX EARNING (High-CPC & Conversion Mode)';
        }
    }
    
    // --- GA4 MP Session Data Generation ---
    const cid = uid; 
    const session_id = Date.now(); 
    const geo = getRandomGeo(); 
    const traffic = getRandomTrafficSource(true); 
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
        const USER_AGENT_GA4 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"; 
        
        try { 
            const response = await nodeFetch(gaEndpoint, { 
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 
                    'Content-Type': 'application/json',
                    'User-Agent': USER_AGENT_GA4 
                },
                agent: proxyAgent 
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

    // --- START: CORE LOGIC ---
    try {
        
        // 🚀 STEP 0 - GEMINI AI Keyword Generation
        let searchKeyword = null;
        if (traffic.source === 'google' && GEMINI_KEY) { 
             if (useHighCpcKeywords) {
                searchKeyword = await generateSearchKeyword(target, true); 
                if (searchKeyword) {
                    traffic.referrer = `https://www.google.com/search?q=${encodeURIComponent(searchKeyword)}`;
                    console.log(`[GEMINI BOOST: MAX CPC] Generated Keyword: "${searchKeyword}"`);
                }
             } else if (Math.random() < 0.3) {
                 searchKeyword = await generateSearchKeyword(target, false); 
                 if (searchKeyword) {
                    traffic.referrer = `https://www.google.com/search?q=${encodeURIComponent(searchKeyword)}`;
                    console.log(`[GEMINI BOOST: REALISTIC] Generated Keyword: "${searchKeyword}"`);
                 }
             }
        }

        // 🔥 STEP 1: TARGET URL VISIT
        console.log(`[TARGET VISIT] Hitting target ${target}.`);
        
        const targetResponse = await nodeFetch(target, {
            method: 'GET', 
            headers: { 
                'User-Agent': USER_AGENT,
                'Referer': traffic.referrer 
            }, 
            agent: proxyAgent 
        });

        if (targetResponse.status < 200 || targetResponse.status >= 300) {
             throw new Error(`Target visit failed with status ${targetResponse.status}`);
        }
        console.log(`[TARGET VISIT SUCCESS] Target visited.`);

        // 💡 ADVANCED IDEA: REALISTIC WAIT TIME
        const waitTime = randomInt(20000, 40000); 
        console.log(`[WAIT] Simulating human behavior: Waiting for ${Math.round(waitTime/1000)} seconds.`);
        await new Promise(resolve => setTimeout(resolve, waitTime));


        // 🔥 STEP 2: SIMULATE CONVERSION/HIGH-VALUE ACTION
        if (shouldRunConversion) { 
            console.log(`[HIGH-VALUE ACTION] Conversion Mode is ON (Randomized Check Passed).`);
            await simulateConversion(target, proxyAgent, traffic.referrer, USER_AGENT);
        } else {
             console.log(`[ADSENSE SAFE MODE] Conversion Mode is OFF (Randomized Check Failed or Disabled). Skipping high-value action.`);
        }
        
        // 🔥 STEP 3: Send GA4 MP data
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
                        source: traffic.source,
                        medium: traffic.medium,
                        session_default_channel_group: traffic.medium === "organic" ? "Organic Search" : (traffic.medium === "social" ? "Social" : "Direct"), 
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
                        page_title: (traffic.medium === "organic" && searchKeyword) ? `Organic Search: ${searchKeyword}` : target, 
                        session_id: session_id, 
                        debug_mode: true,
                        language: "en-US",
                        engagement_time_msec: engagementTime,
                        page_referrer: traffic.referrer 
                    } 
                }]
            };
            
            if (await sendDataViaProxy(pageViewPayload, 'page_view')) eventCount++;
            
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
            if (await sendDataViaProxy(engagementPayload, 'user_engagement')) eventCount++;
        }

        
        // 4. Send success response back to the frontend
        const message = `✅ Success! Action simulated. Earning Status: ${earningMode}. GA4 Events Sent: ${eventCount}. CTR Check: ${shouldRunConversion ? 'HIT' : 'MISS'}.`;

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
            error: 'Connection ya Target URL se connect nahi ho paya. VPN/Proxy check karein.', 
            details: errorCode
        });
    }
});


// ===================================================================
// 5. YOUTUBE ENGAGEMENT BOOSTER ENDPOINT (API: /youtube-boost-mp) - FIXED TOOL
// ===================================================================

/**
 * Simulates a single highly-realistic YouTube session with variable retention and engagement.
 */
async function simulateYoutubeView(gaId, apiSecret, videoUrl, channelUrl, viewCount) {
    const cid = generateClientId(); 
    const session_id = Date.now(); 
    const geo = getRandomGeo(); 
    const traffic = getYoutubeTrafficSource(); 

    // --- WATCH TIME & RETENTION LOGIC ---
    const simulatedSessionDuration = randomInt(480000, 720000); 
    const retentionRoll = Math.random(); 
    let engagementTime; 
    let didCompleteVideo = false;
    let didLike = false;
    let didSubscribe = false;

    if (retentionRoll < YOUTUBE_FULL_RETENTION_PERCENT) { 
        engagementTime = simulatedSessionDuration;
        didCompleteVideo = true;
    } else if (retentionRoll < (YOUTUBE_FULL_RETENTION_PERCENT + YOUTUBE_MID_RETENTION_PERCENT)) { 
        engagementTime = randomInt(Math.floor(simulatedSessionDuration * 0.70), Math.floor(simulatedSessionDuration * 0.90));
        didCompleteVideo = false;
    } else { 
        engagementTime = randomInt(Math.floor(simulatedSessionDuration * 0.10), Math.floor(simulatedSessionDuration * 0.20));
        didCompleteVideo = false;
    }
    
    engagementTime = Math.max(30000, engagementTime); 

    const userProperties = {
        simulated_geo: { value: geo.country }, 
        user_timezone: { value: geo.timezone }
    };
    
    let allSuccess = true;
    let eventsSent = 0;
    
    console.log(`\n--- [YT View ${viewCount}] Session (Geo: ${geo.country}, Duration: ${Math.round(engagementTime/1000)}s) ---`);
    
    // 1. SESSION START EVENT
    const sessionStartPayload = {
        client_id: cid,
        user_properties: userProperties, 
        events: [{ 
            name: "session_start", 
            params: { 
                session_id: session_id, 
                campaign_source: traffic.source, 
                campaign_medium: traffic.medium,
                session_default_channel_group: traffic.medium === "organic" ? "Organic Search" : (traffic.medium === "social" ? "Social" : "Direct"),
                page_referrer: traffic.referrer, 
                page_location: videoUrl, 
                _ss: 1, 
                debug_mode: true,
                language: "en-US"
            } 
        }]
    };

    let result = await sendData(gaId, apiSecret, sessionStartPayload, viewCount, 'yt_session_start');
    if (result.success) eventsSent++; else allSuccess = false;

    await new Promise(resolve => setTimeout(resolve, randomInt(1000, 3000)));

    // 2. PAGE VIEW EVENT (Video Page Load)
    const pageViewPayload = {
        client_id: cid,
        user_properties: userProperties, 
        events: [{ 
            name: 'page_view', 
            params: { 
                page_location: videoUrl, 
                page_title: "Simulated YouTube Video Page",
                session_id: session_id, 
                debug_mode: true,
                language: "en-US",
                page_referrer: traffic.referrer,
                engagement_time_msec: randomInt(300, 800) 
            } 
        }]
    };

    result = await sendData(gaId, apiSecret, pageViewPayload, viewCount, 'page_view');
    if (result.success) eventsSent++; else allSuccess = false;

    await new Promise(resolve => setTimeout(resolve, randomInt(500, 1500)));
    
    // 3. VIDEO START EVENT
    const videoStartPayload = {
        client_id: cid,
        user_properties: userProperties, 
        events: [{ 
            name: 'video_start', 
            params: { 
                video_url: videoUrl, 
                session_id: session_id,
                debug_mode: true,
                video_provider: 'youtube'
            } 
        }]
    };
    result = await sendData(gaId, apiSecret, videoStartPayload, viewCount, 'video_start');
    if (result.success) eventsSent++; else allSuccess = false;

    await new Promise(resolve => setTimeout(resolve, randomInt(500, 1000)));

    // 4. VIDEO COMPLETE/PROGRESS EVENT
    if (didCompleteVideo) {
         const videoCompletePayload = {
            client_id: cid,
            user_properties: userProperties, 
            events: [{ 
                name: 'video_complete', 
                params: { 
                    video_url: videoUrl, 
                    session_id: session_id,
                    debug_mode: true,
                    video_provider: 'youtube'
                } 
            }]
        };
        result = await sendData(gaId, apiSecret, videoCompletePayload, viewCount, 'video_complete');
        if (result.success) eventsSent++; else allSuccess = false;
    } else if (engagementTime > simulatedSessionDuration * 0.5) {
        // VIDEO PROGRESS (For mid-retention, signal 50% progress)
        const videoProgressPayload = {
            client_id: cid,
            user_properties: userProperties, 
            events: [{ 
                name: 'video_progress', 
                params: { 
                    video_url: videoUrl, 
                    session_id: session_id,
                    debug_mode: true,
                    video_provider: 'youtube',
                    video_percent: 50 
                } 
            }]
        };
        result = await sendData(gaId, apiSecret, videoProgressPayload, viewCount, 'video_progress (50%)');
        if (result.success) eventsSent++; else allSuccess = false;
    }
    
    // 5. LIKE & SUBSCRIBE ACTION (35% Chance)
    if (Math.random() < YOUTUBE_ENGAGEMENT_CHANCE) { 
        
        // 5a. LIKE VIDEO EVENT
        if (Math.random() < 0.5) { 
             const likeVideoPayload = {
                client_id: cid,
                user_properties: userProperties, 
                events: [{ 
                    name: 'like_video', 
                    params: { 
                        video_url: videoUrl, 
                        session_id: session_id,
                        debug_mode: true
                    } 
                }]
            };
            result = await sendData(gaId, apiSecret, likeVideoPayload, viewCount, 'like_video');
            if (result.success) {
                 eventsSent++;
                 didLike = true; 
             } else allSuccess = false;
        }
        
        // 5b. SUBSCRIBE TO CHANNEL EVENT
        if (Math.random() < 0.3) { 
             const subscribePayload = {
                client_id: cid,
                user_properties: userProperties, 
                events: [{ 
                    name: 'subscribe', 
                    params: { 
                        channel_url: channelUrl, 
                        session_id: session_id,
                        debug_mode: true
                    } 
                }]
            };
            result = await sendData(gaId, apiSecret, subscribePayload, viewCount, 'subscribe');
            if (result.success) {
                 eventsSent++;
                 didSubscribe = true; 
             } else allSuccess = false;
        }
    }
          // 6. USER ENGAGEMENT
    const engagementPayload = {
        client_id: cid,
        user_properties: userProperties, 
        events: [{ 
            name: "user_engagement", 
            params: { 
                engagement_time_msec: engagementTime, 
                session_id: session_id,
                debug_mode: true 
            } 
        }]
    };
    result = await sendData(gaId, apiSecret, engagementPayload, viewCount, 'user_engagement');
    if (result.success) eventsSent++; else allSuccess = false;

    console.log(`[YT View ${viewCount}] Session Complete. Total Events Sent: ${eventsSent}.`);

    return { 
        watchTimeMs: engagementTime, 
        liked: didLike, 
        subscribed: didSubscribe 
    };
}


app.post('/youtube-boost-mp', async (req, res) => {
    const { ga_id, api_key, views, channel_url, video_urls } = req.body; 
    const totalViewsRequested = parseInt(views);
    const clientIdForValidation = generateClientId();
    
    const MAX_VIEWS = 2000; 

    if (!ga_id || !api_key || !totalViewsRequested || totalViewsRequested < 1 || totalViewsRequested > MAX_VIEWS || !channel_url || !Array.isArray(video_urls) || video_urls.length === 0) {
        return res.status(400).json({ 
            status: 'error', 
            message: `Missing GA keys, Views (1-${MAX_VIEWS}), Channel URL, or Video URLs (min 1).` 
        });
    }

    const validVideoUrls = video_urls.filter(url => 
        url && (url.includes('youtube.com/watch') || url.includes('youtu.be/'))
    );

    if (validVideoUrls.length === 0) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'At least one valid YouTube Video URL is required.' 
        });
    }

    const validationResult = await validateKeys(ga_id, api_key, clientIdForValidation);
    
    if (!validationResult.valid) {
         return res.status(400).json({ 
            status: 'error', 
            message: `❌ Validation Failed: ${validationResult.message}. Please check your GA ID and API Secret.` 
        });
    }

    const viewPlan = [];
    const numTargets = validVideoUrls.length;
    const baseViewsPerTarget = Math.floor(totalViewsRequested / numTargets);
    let remainder = totalViewsRequested % numTargets;

    validVideoUrls.forEach(url => {
        let viewsForUrl = baseViewsPerTarget;
        if (remainder > 0) {
            viewsForUrl++; 
            remainder--;
        }
        for (let i = 0; i < viewsForUrl; i++) {
            viewPlan.push(url);
        }
    });
    
    viewPlan.sort(() => Math.random() - 0.5); 
    const finalTotalViews = viewPlan.length;


    res.json({ 
        status: 'accepted', 
        message: `✨ Request accepted. Keys validated. Processing ${finalTotalViews} views across ${numTargets} video(s) started in the background.`
    });

    // Start the heavy, time-consuming simulation in the background
    (async () => {
        const finalTotalViews = viewPlan.length;
        let successfulViews = 0;
        let totalSimulatedWatchTimeMs = 0;
        let totalSimulatedLikes = 0;
        let totalSimulatedSubscribes = 0;
        
        console.log(`\n[YOUTUBE BOOSTER START] Starting real simulation for ${finalTotalViews} views across ${numTargets} URLs.`);
        
        for (let i = 0; i < finalTotalViews; i++) {
            const url = viewPlan[i];
            const currentView = i + 1;

            if (i > 0) {
                const delay = randomInt(180000, 300000); 
                console.log(`[YT View ${currentView}/${finalTotalViews}] Waiting for ${Math.round(delay / 60000)} minutes...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const sessionResult = await simulateYoutubeView(ga_id, api_key, url, channel_url, currentView);
            
            if (sessionResult && sessionResult.watchTimeMs > 0) {
                successfulViews++;
                totalSimulatedWatchTimeMs += sessionResult.watchTimeMs;
                if (sessionResult.liked) totalSimulatedLikes++;
                if (sessionResult.subscribed) totalSimulatedSubscribes++;
            }
        }
        
        const watchTimeInHours = (totalSimulatedWatchTimeMs / 3600000).toFixed(2);
        
        console.log(`\n======================================================`);
        console.log(`✅ YOUTUBE BOOSTER COMPLETE: DEMO PROOF`);
        console.log(`VIEWS SENT: ${successfulViews} / ${finalTotalViews}`);
        console.log(`TOTAL SIMULATED WATCH TIME: ${watchTimeInHours} HOURS`);
        console.log(`TOTAL SIMULATED LIKES: ${totalSimulatedLikes}`);
        console.log(`TOTAL SIMULATED SUBSCRIBERS: ${totalSimulatedSubscribes}`);
        console.log(`======================================================`);
        
    })();
});


// ===================================================================
// 6. AI ANIME VIDEO CONVERTER ENDPOINT - GEMINI/NODE.JS TOOL (ULTRA ADVANCED)
// ===================================================================
// --- UPLOAD CONFIGURATION (Multer) ---
const uploadDir = path.join(__dirname, 'temp_uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const jobId = crypto.randomBytes(8).toString('hex');
        const jobDir = path.join(uploadDir, jobId);
        if (!fs.existsSync(jobDir)) {
            fs.mkdirSync(jobDir, { recursive: true });
        }
        req.jobDir = jobDir;
        cb(null, jobDir);
    },
    filename: (req, file, cb) => {
        cb(null, 'original_video.mp4');
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for safety
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'video/mp4' || file.mimetype === 'video/quicktime' || file.mimetype === 'video/x-msvideo') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only MP4, MOV, or AVI video files are allowed.'), false);
        }
    }
});


// --- ASYNC QUEUE FOR CONVERSION JOBS ---
// Limits concurrent conversions to 1 to prevent high memory usage on a single Render instance.
const conversionQueue = new PQueue({ concurrency: 1 });


// --- FRAME CONVERSION FUNCTION (Gemini) ---
async function convertFrameToAnime(framePath, stylePrompt, jobId) {
    let uploadedFile;
    try {
        // 1. फ़्रेम को Gemini पर अपलोड करें
        uploadedFile = await ai.files.upload({
            file: framePath,
            mimeType: 'image/jpeg' 
        });
        // console.log(`[JOB ${jobId}] Uploaded frame: ${uploadedFile.name}`);
    } catch (e) {
        throw new Error("Gemini File Upload Failed.");
    }

    // 2. इमेज जनरेशन प्रॉम्प्ट
    const prompt = `Convert this image into a high-quality, detailed anime style. Apply the following aesthetic style strictly: "${stylePrompt}". Focus on making the characters and background realistic within that anime style. Output only the modified image.`;

    try {
        // 3. Gemini Image-to-Image कन्वर्ज़न
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001', // FIX: Model name changed from 3.0 to 4.0 to resolve MODEL_NOT_FOUND error (404).
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '16:9',
                // For image-to-image with Imagen, provide the uploaded file as an image input
                imageInputs: [{ image: uploadedFile }] 
            },
        });

        // 4. नई एनीमे फ़्रेम को सेव करें
        const base64Image = response.generatedImages[0].image.imageBytes;
        const newFramePath = path.join(path.dirname(framePath), `anime-${path.basename(framePath)}`);
        fs.writeFileSync(newFramePath, Buffer.from(base64Image, 'base64'));
        
        // 5. अपलोड की गई फ़ाइल को डिलीट करें
        await ai.files.delete({ name: uploadedFile.name });

        return newFramePath;

    } catch (error) {
        console.error(`[JOB ${jobId}] CRITICAL FAILURE ❌: Gemini Image Generation Failed: ${error.message}`);
        
        // Ensure uploaded file is deleted even if conversion fails
        if (uploadedFile) {
            try {
                await ai.files.delete({ name: uploadedFile.name });
            } catch (e) {
                console.error(`[JOB ${jobId}] Failed to delete temporary uploaded file: ${e.message}`);
            }
        }
        throw new Error(`Gemini Conversion Failed: ${error.message.substring(0, 100)}...`);
    }
}


// --- MAIN ASYNC JOB FUNCTION ---
async function runAnimeConversionJob(jobId, originalFilePath, email, stylePrompt) {
    const jobDir = path.dirname(originalFilePath);
    const frameDir = path.join(jobDir, 'frames');
    const outputVideoPath = path.join(jobDir, `final_anime_video_${jobId}.mp4`);
    
    try {
        console.log(`[JOB ${jobId}] STARTED: Video-to-Anime Conversion for ${email}`);
        
        // 1. वीडियो से फ़्रेम निकालें (Extract Frames)
        if (!fs.existsSync(frameDir)) {
            fs.mkdirSync(frameDir, { recursive: true });
        }
        
        console.log(`[JOB ${jobId}] Step 1/4: Extracting frames...`);
        const frameExtractionPromise = new Promise((resolve, reject) => {
            ffmpeg(originalFilePath)
                .outputOptions([
                    '-r 10', // 10 frames per second
                    '-q:v 2' // high quality
                ])
                .save(path.join(frameDir, 'frame-%06d.jpeg'))
                .on('end', () => {
                    console.log(`[JOB ${jobId}] Frame extraction finished.`);
                    resolve();
                })
                .on('error', (err) => {
                    console.error(`[JOB ${jobId}] Frame extraction error: ${err.message}`);
                    reject(new Error(`Frame extraction failed: ${err.message}`));
                });
        });
        await frameExtractionPromise;

        const framePaths = fs.readdirSync(frameDir)
            .filter(file => file.endsWith('.jpeg'))
            .map(file => path.join(frameDir, file));
        
        if (framePaths.length === 0) {
            throw new Error("No frames were extracted from the video.");
        }

        let estimatedHours = Math.round(framePaths.length * 10 / 3600) || 1;
        console.log(`[JOB ${jobId}] Total frames: ${framePaths.length}. Estimated time: ${estimatedHours} hours.`);
        
        // 2. फ़्रेम को एनीमे में बदलना (Conversion) - (LONG PROCESS)
        console.log(`[JOB ${jobId}] Step 2/4: Starting frame conversion queue...`);
        const frameConversionPromises = framePaths.map(inputFramePath => 
            conversionQueue.add(async () => {
                try {
                    const animeFramePath = await convertFrameToAnime(inputFramePath, stylePrompt, jobId);
                    // Delete original frame to save disk space immediately
                    fs.unlinkSync(inputFramePath); 
                    return animeFramePath;
                } catch (e) {
                    console.error(`[JOB ${jobId}] Single frame conversion failed: ${e.message}`);
                    return null; // Continue with other frames
                }
            })
        );
        
        // Wait for all conversions to complete
        const animeFramePaths = (await Promise.all(frameConversionPromises)).filter(p => p !== null);

        if (animeFramePaths.length === 0) {
            throw new Error("All anime frame conversions failed.");
        }

        // 3. एनीमे फ़्रेम को वापस वीडियो में मिलाना (Re-assemble Video)
        console.log(`[JOB ${jobId}] Step 3/4: Re-assembling video...`);
        const reassemblyPromise = new Promise((resolve, reject) => {
            ffmpeg(path.join(frameDir, 'anime-frame-%06d.jpeg'))
                .inputOptions(['-r 10']) // 10 frames per second input
                .outputOptions([
                    '-c:v libx264',
                    '-pix_fmt yuv420p',
                    '-preset medium',
                    '-crf 23'
                ])
                .save(outputVideoPath)
                .on('end', () => {
                    console.log(`[JOB ${jobId}] Video re-assembly finished. Output: ${outputVideoPath}`);
                    resolve();
                })
                .on('error', (err) => {
                    console.error(`[JOB ${jobId}] Video re-assembly error: ${err.message}`);
                    reject(new Error(`Video re-assembly failed: ${err.message}`));
                });
        });
        await reassemblyPromise;
        
        // 4. सफलता का ईमेल भेजें (Simulated)
        const downloadLink = `${RENDER_BASE_URL}/download-anime?jobId=${jobId}&email=${email}`; // FIX: Use RENDER_BASE_URL
        console.log(`[JOB ${jobId}] Step 4/4: Success! Simulated Email Sent to ${email}. Download Link: ${downloadLink}`);
        
        // Cleanup (Keep output video, but remove frames and original)
        fs.unlinkSync(originalFilePath);
        fs.rmdirSync(frameDir, { recursive: true });

    } catch (error) {
        console.error(`[JOB ${jobId}] JOB FAILED: ${error.message}`);
        // Send failure email (Simulated)
        console.log(`[JOB ${jobId}] FAILED: Simulated Failure Email Sent to ${email}. Reason: ${error.message}`);

        // Final Cleanup attempt
        try {
            if (fs.existsSync(originalFilePath)) fs.unlinkSync(originalFilePath);
            if (fs.existsSync(frameDir)) fs.rmdirSync(frameDir, { recursive: true });
            // Keep jobDir until we are certain, but remove original parts
        } catch (e) {
            console.error(`[JOB ${jobId}] Cleanup during failure failed: ${e.message}`);
        }

    } finally {
        console.log(`[JOB ${jobId}] Conversion job finished in FINALLY block.`);
    }
}


// --- UPLOAD ENDPOINT (Tool 6) ---
app.post('/submit-anime-job', upload.single('videoFile'), (req, res) => {
    // req.file Multer द्वारा इंजेक्ट किया जाता है यदि अपलोड सफल होता है
    if (!req.file || !req.body.emailId || !req.body.animeStyle) {
        console.log(`[UPLOAD FAIL] Missing video file, email, or anime style. Email: ${req.body.emailId}, Style: ${req.body.animeStyle}`); 
        return res.status(400).json({ status: 'FAILED', message: 'Missing video file, email, or anime style selection.' });
    }

    const { emailId, animeStyle } = req.body;
    const jobId = path.basename(req.jobDir); // Multer storage uses jobId as directory name
    const originalFilePath = req.file.path;
    
    console.log(`[UPLOAD SUCCESS] Job ID: ${jobId}. File: ${req.file.filename}. Email: ${emailId}. Style: ${animeStyle}.`);

    res.status(202).json({ 
        status: 'ACCEPTED', 
        jobId: jobId,
        message: `✨ आपका अनुरोध स्वीकार कर लिया गया है। जॉब ID: ${jobId}. पूरा होने पर ${emailId} पर एक ईमेल भेजा जाएगा। यह प्रक्रिया अनुमानित ${animeStyle.includes('detailed') ? '4-8 घंटे' : '2-4 घंटे'} ले सकती है।` 
    });

    // बैकग्राउंड जॉब शुरू करें
    // Node.js इस काम को बैकग्राउंड में शुरू कर देगा।
    runAnimeConversionJob(jobId, originalFilePath, emailId, animeStyle);
});


// --- DOWNLOAD ENDPOINT (Simplified for Demo) ---
app.get('/download-anime', (req, res) => {
    const { jobId } = req.query;
    if (!jobId) {
        return res.status(400).send("Job ID is missing.");
    }
    
    // Safety check path traversal
    const safeJobId = path.basename(jobId); 
    
    const videoPath = path.join(uploadDir, safeJobId, `final_anime_video_${safeJobId}.mp4`);
    
    if (fs.existsSync(videoPath)) {
        res.download(videoPath, `anime_converted_${safeJobId}.mp4`);
    } else {
        res.status(404).send("वीडियो अभी तक तैयार नहीं हुआ है या फ़ाइल हटा दी गई है।");
    }
});


// ===================================================================
// START SERVER
// ===================================================================
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    if (ai.models.generateContent === undefined) {
        console.log("WARNING: AI tools are DISABLED due to missing API Key.");
    }
});
