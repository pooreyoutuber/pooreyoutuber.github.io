// =================================================================
// index.js (ULTIMATE FINAL VERSION - Part 1/2)
// =============================================================

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
const { URL } = require('url'); // Added URL import

const app = express();
const PORT = process.env.PORT || 10000; 

// --- GEMINI KEY CONFIGURATION ---
let GEMINI_KEY;
try {
    // Attempt to read from Replit secret store (preferred method)
    GEMINI_KEY = fs.readFileSync('/etc/secrets/gemini', 'utf8').trim(); 
} catch (e) {
    // Fallback to environment variables
    GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY; 
}

let ai;
if (GEMINI_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
} else {
    // Fallback in case AI key is missing
    ai = { models: { generateContent: () => Promise.reject(new Error("AI Key Missing")) } };
}

// --- MIDDLEWARE & UTILITIES ---
// Updated CORS to allow all for simplicity in deployment
app.use(cors({
    origin: '*', 
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

// 🔥 NEW CONSTANT FOR EARNING LOGIC (Gemini/Clicker Cost Control)
const HIGH_VALUE_ACTION_CHANCE = 0.40; // 40% chance to run high-value conversion/click

// --- NEW YOUTUBE CONSTANTS (For Realistic Human Simulation) ---
const YOUTUBE_ENGAGEMENT_CHANCE = 0.35; // 35% chance to Like/Subscribe (30-40% range)
const YOUTUBE_FULL_RETENTION_PERCENT = 0.25; // 25% chance for 100% completion (20-25% range)
const YOUTUBE_MID_RETENTION_PERCENT = 0.65; // 65% chance for 70-90% completion

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

// --- TRAFFIC SOURCE LOGIC (Used by Tool 1) ---
const TRAFFIC_SOURCES_GA4 = [ 
    { source: "google", medium: "organic", referrer: "https://www.google.com" },
    { source: "youtube", medium: "social", referrer: "https://www.youtube.com" },
    { source: "facebook", medium: "social", referrer: "https://www.facebook.com" },
    { source: "bing", medium: "organic", referrer: "https://www.bing.com" },
    { source: "reddit", medium: "referral", referrer: "https://www.reddit.com" },
    { source: "(direct)", medium: "(none)", referrer: "" }
];
// Used by Tool 4 (/proxy-request) - Preferring higher value organic/referral traffic
const TRAFFIC_SOURCES_PROXY = [ 
    { source: "google", medium: "organic", referrer: "https://www.google.com/" },
    { source: "facebook.com", medium: "social", referrer: "https://www.facebook.com/" },
    { source: "linkedin.com", medium: "social", referrer: "https://www.linkedin.com/" },
    { source: "bing", medium: "organic", referrer: "https://www.bing.com/" },
    { source: "(direct)", medium: "(none)", referrer: "" }
];

function getRandomTrafficSource(isProxyTool = false) {
    if (isProxyTool) {
        // Reduced direct traffic chance for Proxy Tool to simulate better sources
        if (Math.random() < 0.2) {
             return TRAFFIC_SOURCES_PROXY[4]; // (direct) / (none)
        }
        return TRAFFIC_SOURCES_PROXY[randomInt(0, TRAFFIC_SOURCES_PROXY.length - 2)];
    }
    // Logic for /boost-mp (Tool 1)
    if (Math.random() < 0.5) {
        return TRAFFIC_SOURCES_GA4[5]; // (direct) / (none)
    }
    return TRAFFIC_SOURCES_GA4[randomInt(0, TRAFFIC_SOURCES_GA4.length - 2)]; 
}

// --- YOUTUBE TRAFFIC SOURCE LOGIC (FIXED FOR TOOL 5) ---
const YOUTUBE_INTERNAL_SOURCES = [
    // High-value YouTube Internal/Owned sources
    { source: "youtube", medium: "internal", referrer: "https://www.youtube.com/feed/subscriptions" }, 
    { source: "youtube", medium: "internal", referrer: "https://www.youtube.com/results?search_query=trending+video+topic" }, // YouTube Search
    { source: "youtube", medium: "internal", referrer: "https://www.youtube.com/watch?v=suggestedVideoID" }, // Suggested Videos
    // Lower value but still relevant social/external
    { source: "external", medium: "social", referrer: "https://www.facebook.com" }, // External Social (Fallback)
];

function getYoutubeTrafficSource() {
    // 60% chance for internal YouTube traffic (most realistic for YouTube content)
    if (Math.random() < 0.60) {
        // Pick from internal sources (0, 1, 2)
        return YOUTUBE_INTERNAL_SOURCES[randomInt(0, 2)];
    }
    // 40% chance for External Social/Direct/General GA4 sources
    if (Math.random() < 0.5) {
        return getRandomTrafficSource(false); // Use existing GA4 logic (Direct/Google/Bing/Reddit/Facebook)
    }
    return YOUTUBE_INTERNAL_SOURCES[3]; // External Social (Facebook)
}
// --- END YOUTUBE TRAFFIC SOURCE LOGIC ---

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
    const traffic = getRandomTrafficSource(false); // Use GA4 specific traffic logic
    const engagementTime = randomInt(30000, 120000); 

    // User Properties are crucial for custom dimensions like geo
    const userProperties = {
        simulated_geo: { value: geo.country }, 
        user_timezone: { value: geo.timezone }
    };
    
    let allSuccess = true;
    
    console.log(`\n--- [View ${viewCount}] Session (Geo: ${geo.country}, Source/Medium: ${traffic.source}/${traffic.medium}) ---`);

    // 1. SESSION START EVENT (The primary event for traffic attribution)
    let sessionStartEvents = [
        { 
            name: "session_start", 
            params: { 
                session_id: session_id, 
                campaign_source: traffic.source, 
                campaign_medium: traffic.medium,
                session_default_channel_group: (traffic.medium === "organic" || traffic.medium === "social") ? traffic.medium : "Direct",
                page_referrer: traffic.referrer, // The referrer URL
                
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
// --- END OF PART 1 ---
// ===================================================================
// index.js (ULTIMATE FINAL VERSION - Part 2/2)
// --- Tool 4 Helpers, Tool 4, Tool 5, and Server Start ---
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
        // High-CPC Prompt (Max Earning Intent)
        prompt = `Generate exactly 5 highly expensive, transactional search queries (keywords) for high-CPC niches like Finance, Insurance, Software, or Legal, which are still related to the topic/URL path: ${urlPath}. The goal is to maximize ad revenue. Queries can be a mix of Hindi and English. Format the output as a JSON array of strings.`;
    } else {
        // Safe and Realistic Prompt (Default Mode)
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
    
    // 1. Simulate Mouse Movement (AdSense Safety)
    console.log(`[ACTION 1] Simulating 2s mouse movement and pause (Human Interaction).`);
    await new Promise(resolve => setTimeout(resolve, randomInt(1500, 2500)));

    // 2. Simulate Click & Second Page Load (High Earning Strategy)
    const conversionTarget = domain + '/random-page-' + randomInt(100, 999) + '.html'; 
    
    try {
        console.log(`[ACTION 2] Simulating Conversion: Loading second page (${conversionTarget}).`);
        
        await nodeFetch(conversionTarget, {
            method: 'GET',
            headers: { 
                'User-Agent': userAgent,
                'Referer': targetUrl 
            }, 
            agent: proxyAgent, // Use the proxy agent for the second request too
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
    
    // 1. Get parameters from the frontend URL query
    const { target, ip, port, auth, uid, ga_id, api_secret, clicker } = req.query; 

    // Basic validation check
    if (!target || !ip || !port || !uid) {
        return res.status(400).json({ status: 'FAILED', error: 'Missing required query parameters (target, ip, port, uid).' });
    }

    const isGaMpEnabled = ga_id && api_secret; 
    const USER_AGENT = getRandomUserAgent(); 
    
    // --- Proxy Setup (FIXED: Using HttpsProxyAgent) ---
    let proxyAgent;
    let proxyUrl;
    const proxyAddress = `${ip}:${port}`;
    
    // Determine the proxy URL format (authenticated or unauthenticated)
    if (auth && auth.includes(':') && auth !== ':') {
        const [username, password] = auth.split(':');
        // Use 'http' protocol for the proxy URL
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
    // --- END Proxy Setup (FIXED) ---
    
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
                searchKeyword = await generateSearchKeyword(target, true); // true = HighValue (Max Earning)
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
// 5. GSC & ADSENSE REVENUE BOOSTER (MULTI-URL & AUTO-CLICKER)
// ===================================================================
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
async function runGscTask(keyword, url, viewNumber) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        
        // Anti-Bot: Set Random User Agent
        await page.setUserAgent(USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]);

        // 1. STAGE: Google Search Simulation (Organic Entry)
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
        await page.goto(googleUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, 3000)); 

        // 2. STAGE: Visit Target Site (30-35s Total Stay)
        console.log(`[EARNING-MODE] View #${viewNumber} | URL: ${url} | Staying 35s...`);
        await page.goto(url, { 
            waitUntil: 'networkidle2', 
            timeout: 90000, 
            referer: googleUrl 
        });

        const startTime = Date.now();
        const targetStayTime = randomInt(30000, 35000); 

        // 3. STAGE: Realistic Behavior & Ad-Clicker Loop
        while (Date.now() - startTime < targetStayTime) {
            // Natural Scrolling
            const dist = randomInt(300, 600);
            await page.evaluate((d) => window.scrollBy(0, d), dist);
            
            // Mouse Movement (Bypass Bot Checks)
            await page.mouse.move(randomInt(100, 800), randomInt(100, 600), { steps: 10 });
            await new Promise(r => setTimeout(r, randomInt(3000, 5000)));

            // 🔥 HIGH-VALUE AD CLICKER (18% Probability)
            if (Math.random() < 0.18) { 
                const ads = await page.$$('ins.adsbygoogle, iframe[id^="aswift"], iframe[src*="googleads"]');
                if (ads.length > 0) {
                    const targetAd = ads[Math.floor(Math.random() * ads.length)];
                    const box = await targetAd.boundingBox();

                    if (box && box.width > 50 && box.height > 50) {
                        console.log(`\x1b[42m%s\x1b[0m`, `[AD-CLICK] Target Found! Clicking...`);
                        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
                        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                        console.log(`\x1b[44m%s\x1b[0m`, `[SUCCESS] Ad Clicked! ✅ Revenue Generated.`);
                        
                        // Advertiser site par 15s wait (Necessary for valid CTR)
                        await new Promise(r => setTimeout(r, 15000));
                        break; 
                    }
                }
            }
        }
        console.log(`[DONE] View #${viewNumber} Finished Successfully. ✅`);

    } catch (error) {
        console.error(`[ERROR] View #${viewNumber}: ${error.message}`);
    } finally {
        if (browser) {
            const pages = await browser.pages();
            for (const p of pages) await p.close().catch(() => {});
            await browser.close().catch(() => {});
        }
    }
}

// ===================================================================
// Tool 5 Endpoint (Updated for Multi-Site Rotation)
// ===================================================================
app.post('/start-task', async (req, res) => {
    try {
        const { keyword, urls, views = 1000 } = req.body;

        // Frontend se 'urls' array aa raha hai, use validate karein
        if (!keyword || !urls || !Array.isArray(urls) || urls.length === 0) {
            console.log("[FAIL] Invalid Request Body");
            return res.status(400).json({ success: false, message: "Keyword and URLs are required!" });
        }

        const totalViews = parseInt(views);

        // Immediate Success Response taaki frontend hang na ho
        res.status(200).json({ 
            success: true, 
            message: `Task Started: ${totalViews} Views Distributing across ${urls.length} sites.` 
        });

        // Background Worker
        (async () => {
            console.log(`--- STARTING MULTI-SITE REVENUE TASK ---`);
            for (let i = 1; i <= totalViews; i++) {
                // Randomly ek URL chunna rotation ke liye
                const randomUrl = urls[Math.floor(Math.random() * urls.length)];
                
                console.log(`[QUEUE] View #${i} | Active URL: ${randomUrl}`);
                await runGscTask(keyword, randomUrl, i); 

                if (i < totalViews) {
                    // RAM management break
                    const restTime = i % 5 === 0 ? 25000 : 12000; 
                    console.log(`[REST] Waiting ${restTime/1000}s...`);
                    await new Promise(r => setTimeout(r, restTime));
                }
            }
            console.log("--- ALL SESSIONS COMPLETED ---");
        })();

    } catch (err) {
        console.error("Endpoint Error:", err);
        if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
    }
});
// ===================================================================
// NEW TOOL 6: Proxyium Web Proxy Automation Logic
// ===================================================================
async function runProxyiumTask(keyword, url, viewNumber) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent(USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]);

        // 1. Proxyium Website par jana
        console.log(`[PROXYIUM] View #${viewNumber} | Opening Proxyium...`);
        await page.goto('https://proxyium.com/', { waitUntil: 'networkidle2', timeout: 60000 });

        // 2. Search bar mein URL daalna
        const searchInputSelector = 'input[placeholder*="Put a URL"]';
        await page.waitForSelector(searchInputSelector);
        await page.type(searchInputSelector, url, { delay: 100 });
        await page.keyboard.press('Enter');

        // 3. Wait for navigation to the proxied site
        console.log(`[PROXYIUM] Loading Target Site: ${url}`);
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 90000 }).catch(() => console.log("Timeout waiting for navigation, continuing..."));

        // 4. Pop-up ya Ads ko hatane ki koshish (Basic Logic)
        await page.evaluate(() => {
            const commonPopups = ['button[aria-label="Close"]', '.close-button', '#close-icon', '.modal-close'];
            commonPopups.forEach(selector => {
                const el = document.querySelector(selector);
                if (el) el.click();
            });
        });

        // 5. Realistic Behavior: Scrolling aur Mouse Movement
        const stayTime = randomInt(30000, 60000); // 30-60 seconds random time
        const startTime = Date.now();
        console.log(`[PROXYIUM] Staying for ${stayTime/1000}s and simulating behavior...`);

        while (Date.now() - startTime < stayTime) {
            // Natural Scrolling
            const scrollDist = randomInt(200, 500);
            await page.evaluate((d) => window.scrollBy(0, d), scrollDist);
            
            // Random Mouse Movement
            await page.mouse.move(randomInt(100, 1000), randomInt(100, 700), { steps: 5 });
            
            await new Promise(r => setTimeout(r, randomInt(4000, 7000)));
        }

        console.log(`[DONE] Proxyium View #${viewNumber} completed. ✅`);

    } catch (error) {
        console.error(`[PROXYIUM ERROR] View #${viewNumber}: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close().catch(() => {});
        }
    }
}
// ===================================================================
// Tool 6: Proxyium Revenue Booster Endpoint
// ===================================================================
app.post('/start-Proxyium', async (req, res) => {
    try {
        const { keyword, urls, views = 1000 } = req.body;

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ success: false, message: "URLs are required!" });
        }

        const totalViews = parseInt(views);

        // Success response turant bhej rahe hain taaki Render timeout na ho
        res.status(200).json({ 
            success: true, 
            message: `Proxyium Task Started: ${totalViews} views for ${urls.length} sites.` 
        });

        // Background worker loop - 1 by 1 views processing
        (async () => {
            console.log(`--- PROXYIUM MULTI-SITE START ---`);
            for (let i = 1; i <= totalViews; i++) {
                const targetUrl = urls[Math.floor(Math.random() * urls.length)];
                
                // 1 by 1 execution to prevent Render crash
                await runProxyiumTask(keyword, targetUrl, i);

                if (i < totalViews) {
                    // RAM clear karne ke liye bada ak har session ke baad
                    const restTime = 15000; // 15 seconds gap
                    console.log(`[WAIT] Sleeping ${restTime/1000}s before next view...`);
                    await new Promise(r => setTimeout(r, restTime));
                }
            }
            console.log("--- PROXYIUM ALL SESSIONS FINISHED ---");
        })();

    } catch (err) {
        console.error("Proxyium Endpoint Error:", err);
        if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
    }
}); 

// ===================================================================
// 7. TOOL POPUP (UPDATED: 50% SOCIAL REFERRAL & 25+ DEVICE MODELS)
// =============================== 
 // --- TOOL 7 HELPERS: Device & Referral Config ---
const DEVICE_PROFILES = [
    { name: 'Desktop Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', view: { width: 1920, height: 1080 } },
    { name: 'Desktop Firefox', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0', view: { width: 1536, height: 864 } },
    { name: 'Desktop Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15', view: { width: 1440, height: 900 } },
    { name: 'Mobile Android', ua: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36', view: { width: 360, height: 800 } },
    { name: 'Mobile iPhone', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1', view: { width: 390, height: 844 } },
    { name: 'Tablet iPad', ua: 'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1', view: { width: 810, height: 1080 } }
];

const SOCIAL_REFERRERS = [
    'https://www.facebook.com/',
    'https://t.co/', // X (Twitter)
    'https://www.pinterest.com/',
    'https://www.reddit.com/',
    'https://www.blogger.com/'
];

// ===================================================================
// 7. TOOL POPUP (UPDATED: Mobile/Tablet/PC + Social Referral 50%)
// ===================================================================
async function runGscTaskpop(keyword, url, viewNumber) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-blink-features=AutomationControlled']
        });

        const page = await browser.newPage();
        
        // 1. SELECT RANDOM DEVICE (PC, Mobile, Tablet)
        const profile = DEVICE_PROFILES[Math.floor(Math.random() * DEVICE_PROFILES.length)];
        await page.setUserAgent(profile.ua);
        await page.setViewport(profile.view);

        // 2. REFERRAL LOGIC: Har 10 mein se 5 views (50%) Social Referral honge
        let referral = "";
        if (viewNumber % 2 === 0) { // Every even view (10 me se 5 average)
            referral = SOCIAL_REFERRERS[Math.floor(Math.random() * SOCIAL_REFERRERS.length)];
        }

        console.log(`[VIEW #${viewNumber}] Device: ${profile.name} | Referral: ${referral || 'Direct/Proxy'}`);

        // 3. Proxyium Navigation
        await page.goto('https://proxyium.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        await page.waitForSelector('input[name="url"]', { visible: true, timeout: 60000 });
        await page.type('input[name="url"]', url, { delay: 100 });
        
        // Referral spoofing (if applicable)
        if (referral) {
            await page.setExtraHTTPHeaders({ 'Referer': referral });
        }

        await Promise.all([
            page.keyboard.press('Enter'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => null)
        ]);

        await new Promise(r => setTimeout(r, 15000)); 

        const startTime = Date.now();
        const targetStayTime = randomInt(40000, 60000); 

        // Ad Click Logic (Keep as is in your original tool)
        const shouldClickAd = Math.random() < 0.20; 
        let adClickedInThisSession = false;

        while (Date.now() - startTime < targetStayTime) {
            await page.evaluate(() => window.scrollBy(0, Math.floor(Math.random() * 400)));
            await page.mouse.move(randomInt(50, 300), randomInt(50, 300), { steps: 5 });

            if (shouldClickAd && !adClickedInThisSession) {
                const adSelector = 'ins.adsbygoogle, iframe[src*="googleads"], a[href*="smartlink"]';
                const foundAd = await page.$(adSelector);
                if (foundAd) {
                    const box = await foundAd.boundingBox();
                    if (box && box.width > 10) {
                        await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
                        adClickedInThisSession = true;
                        console.log(`\x1b[42m[SUCCESS]\x1b[0m Ad Clicked on ${profile.name}`);
                        await new Promise(r => setTimeout(r, 10000));
                    }
                }
            }
            await new Promise(r => setTimeout(r, 7000));
        }

    } catch (error) {
        console.error(`[ERROR] Tool 7: ${error.message}`);
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}
// --- ENDPOINT FOR TOOL 7 (/popup) ---
app.post('/popup', async (req, res) => {
    try {
        const { keyword, urls, views = 1000 } = req.body;

        if (!keyword || !urls || !Array.isArray(urls)) {
            return res.status(400).json({ success: false, message: "Keyword and URLs (Array) are required." });
        }

        // Response immediately to frontend
        res.status(200).json({ 
            success: true, 
            message: `Task started for ${urls.length} sites with pop-up rotation logic.` 
        });

        // Background Processing
        (async () => {
            console.log(`\n--- STARTING POP-UP REVENUE TASK ---`);
            for (let i = 1; i <= views; i++) {
                const currentUrl = urls[(i - 1) % urls.length]; // Rotation between sites
                await runGscTaskpop(keyword, currentUrl, i);

                // RAM Management & Anti-Spam break
                const breakTime = i % 5 === 0 ? 30000 : 10000;
                await new Promise(r => setTimeout(r, breakTime));
            }
        })();

    } catch (err) {
        console.error("Endpoint Error:", err);
        if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
    }
});
// ===================================================================
// UPDATED TOOL 8 ADVANCED MULTI-FORMAT AD CLICKER
// ===================================================================
// ===================================================================
// UPDATED TOOL 8: STABLE MULTI-FORMAT AD CLICKER (BANNER, PUSH, POP)
// ===================================================================

async function runUltimateRevenueTask(keyword, url, viewNumber) {
    let browser;
    try {
        // Ek time mein ek hi browser chale isliye hum await ka use kar rahe hain
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();
        // Timeout 60s tak rakha hai heavy ads load hone ke liye
        page.setDefaultNavigationTimeout(60000); 
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent(USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]);

        console.log(`[VIEW #${viewNumber}] Target: ${url}`);
        
        // Step 1: Visit Target Site
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Random Page Stay Time: 30 to 50 seconds (User request ke mutabik)
        const targetStayTime = randomInt(30000, 50000); 
        const startTime = Date.now();
        let actionTaken = false;

        // Click Rotation: 6, 12, aur 18 view par click hoga
        const clickCycle = viewNumber % 20; 

        while (Date.now() - startTime < targetStayTime) {
            // Natural Scroll behavior
            await page.evaluate(() => window.scrollBy(0, Math.floor(Math.random() * 400)));
            await new Promise(r => setTimeout(r, 4000));

            // Ads Click Logic
            if (!actionTaken && [6, 12, 18].includes(clickCycle)) {
                console.log(`[SEARCHING ADS] View #${viewNumber} - Identifying Ad Format...`);
                
                // --- ADVANCED IFRAME & ELEMENT DETECTION ---
                const frames = page.frames();
                let adFound = false;

                for (const frame of frames) {
                    try {
                        // Har tarah ke format ke selectors (Monetag/Adsterra/Adsense)
                        const adSelector = 'ins.adsbygoogle, iframe[src*="googleads"], a[href*="smartlink"], .ad-notification, #container-ad1288ee73006596cffbc44a44b97c80, [class*="banner"]';
                        const adElement = await frame.$(adSelector);

                        if (adElement) {
                            const box = await adElement.boundingBox();
                            if (box && box.width > 5 && box.height > 5) {
                                console.log(`\x1b[42m[AD-FOUND]\x1b[0m Format detected in frame.`);
                                
                                // Scroll and Click
                                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
                                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                                
                                adFound = true;
                                actionTaken = true;
                                console.log(`\x1b[44m[SUCCESS]\x1b[0m Ad Clicked! Staying 15s for conversion...`);
                                await new Promise(r => setTimeout(r, 15000)); // Stay after click for valid CTR
                                break;
                            }
                        }
                    } catch (fErr) { continue; }
                }

                // Fallback: Agar koi format na mile toh body click (Popunder trigger)
                if (!adFound && clickCycle === 18) {
                    await page.click('body');
                    actionTaken = true;
                    console.log(`[FALLBACK] Body click triggered for Popunder.`);
                    await new Promise(r => setTimeout(r, 10000));
                }
            }
        }
        
        console.log(`[DONE] View #${viewNumber} completed.`);

    } catch (error) {
        console.error(`[CRITICAL ERROR] View #${viewNumber}: ${error.message}`);
    } finally {
        if (browser) {
            // RAM Cleanup: Pehle saare pages close karein phir browser
            const openPages = await browser.pages();
            await Promise.all(openPages.map(p => p.close().catch(() => {})));
            await browser.close().catch(() => {});
            console.log(`[CLEANUP] Browser closed for View #${viewNumber}`);
        }
    }
}

// ===================================================================
// Tool 8 Endpoint: Fixed Background Loop
// ===================================================================
app.post('/ultimate', async (req, res) => {
    try {
        const { keyword, urls, views = 1000 } = req.body;
        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ success: false, message: "URLs are required!" });
        }

        const totalViews = parseInt(views);
        res.status(200).json({ success: true, message: `Task Started: ${totalViews} Views. Single-browser mode active.` });

        // Background Worker (Awaited loop taaki RAM crash na ho)
        (async () => {
            for (let i = 1; i <= totalViews; i++) {
                const randomUrl = urls[Math.floor(Math.random() * urls.length)];
                
                // "await" yahan zaroori hai taaki ek khatam hone par hi dusra shuru ho
                await runUltimateRevenueTask(keyword, randomUrl, i); 

                // Chhota break next browser session se pehle
                await new Promise(r => setTimeout(r, 5000));
            }
        })();
    } catch (err) {
        if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
    }
});

// ===================================================================
// Tool 8 Endpoint (Updated for Multi-Site Rotation)
// ===================================================================
app.post('/ultimate', async (req, res) => {
    try {
        const { keyword, urls, views = 1000 } = req.body;

        // Frontend se 'urls' array aa raha hai, use validate karein
        if (!keyword || !urls || !Array.isArray(urls) || urls.length === 0) {
            console.log("[FAIL] Invalid Request Body");
            return res.status(400).json({ success: false, message: "Keyword and URLs are required!" });
        }

        const totalViews = parseInt(views);

        // Immediate Success Response taaki frontend hang na ho
        res.status(200).json({ 
            success: true, 
            message: `Task Started: ${totalViews} Views Distributing across ${urls.length} sites.` 
        });

        // Background Worker
        (async () => {
            console.log(`--- STARTING MULTI-SITE REVENUE TASK ---`);
            for (let i = 1; i <= totalViews; i++) {
                // Randomly ek URL chunna rotation ke liye
                const randomUrl = urls[Math.floor(Math.random() * urls.length)];
                
                console.log(`[QUEUE] View #${i} | Active URL: ${randomUrl}`);
                await runUltimateRevenueTask(keyword, randomUrl, i); 

                if (i < totalViews) {
                    // RAM management break
                    const restTime = i % 5 === 0 ? 25000 : 12000; 
                    console.log(`[REST] Waiting ${restTime/1000}s...`);
                    await new Promise(r => setTimeout(r, restTime));
                }
            }
            console.log("--- ALL SESSIONS COMPLETED ---");
        })();

    } catch (err) {
        console.error("Endpoint Error:", err);
        if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
    }
});
//==================================================
// --- SERVER START ---
// ===================================================================
app.listen(PORT, () => {
    console.log(`PooreYouTuber Combined API Server is running on port ${PORT}`);
});
