// ==============================================================
// index.js (ULTIMATE FINAL VERSION - Part 1/2)
// =============================================================
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
// --- Imports (Node.js Modules) ---
const express = require('express');
const nodeFetch = require('node-fetch'); 
const cors = require('cors'); 
const fs = require('fs'); 
const crypto = require('crypto');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent'); 
// NEW: Import 'http' for non-authenticated proxies, needed for Tool 4
const http = require('http'); 
const { URL } = require('url'); // Added URL import

let globalQueue = []; // Sabhi requests yahan jama hongi
let isWorkerRunning = false;

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
// --- DYNAMIC IMPORT FIX ---
let ai;
(async () => {
    try {
        // Hum yahan dynamic import use kar rahe hain taaki ESM error na aaye
        const { GoogleGenAI } = await import('@google/genai');

if (GEMINI_KEY) {
            ai = new GoogleGenAI(GEMINI_KEY); // Note: Sirf GEMINI_KEY pass karein ya {apiKey: GEMINI_KEY}
            console.log("✅ Gemini AI Initialized Successfully");
        } else {
            console.error("❌ AI Key Missing");
            ai = { getGenerativeModel: () => ({ generateContent: () => Promise.reject("AI Key Missing") }) };
        }
    } catch (err) {
        console.error("Failed to load GoogleGenAI:", err);
    }
})();
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
// ===================================================================
// 1. TOOL 
// =============================== 
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
 async function runGscTaskpop(keyword, url, viewNumber) {
     const ADVANCED_DEVICE_PROFILES = [
        // --- PC / DESKTOP ---
        { name: 'Windows PC - Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', view: { width: 1920, height: 1080 } },
        { name: 'Windows PC - Firefox', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0', view: { width: 1536, height: 864 } },
        { name: 'Windows PC - Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', view: { width: 1366, height: 768 } },
        { name: 'MacBook Pro - Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', view: { width: 1728, height: 1117 } },
        { name: 'Linux Desktop - Chrome', ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', view: { width: 1600, height: 900 } },
        { name: 'MacBook Air - Chrome', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36', view: { width: 1440, height: 900 } },

        // --- MOBILE ---
        { name: 'iPhone 15 Pro Max', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', view: { width: 430, height: 932 } },
        { name: 'iPhone 14', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1', view: { width: 390, height: 844 } },
        { name: 'Samsung Galaxy S23 Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', view: { width: 384, height: 854 } },
        { name: 'Google Pixel 8 Pro', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', view: { width: 448, height: 998 } },
        { name: 'OnePlus 11', ua: 'Mozilla/5.0 (Linux; Android 13; CPH2447) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36', view: { width: 360, height: 800 } },
        { name: 'Xiaomi 13 Pro', ua: 'Mozilla/5.0 (Linux; Android 13; 2210132G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36', view: { width: 393, height: 873 } },
        { name: 'Vivo V27', ua: 'Mozilla/5.0 (Linux; Android 13; V2231) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', view: { width: 388, height: 864 } },
        { name: 'Oppo Reno 10', ua: 'Mozilla/5.0 (Linux; Android 13; CPH2531) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Mobile Safari/537.36', view: { width: 360, height: 800 } },
        { name: 'Nothing Phone (2)', ua: 'Mozilla/5.0 (Linux; Android 13; A065) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', view: { width: 412, height: 919 } },
        { name: 'Motorola Edge 40', ua: 'Mozilla/5.0 (Linux; Android 13; XT2303-2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Mobile Safari/537.36', view: { width: 412, height: 919 } },
        { name: 'Sony Xperia 1 V', ua: 'Mozilla/5.0 (Linux; Android 13; XQ-DQ72) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36', view: { width: 384, height: 918 } },

        // --- TABLETS ---
        { name: 'iPad Pro 12.9', ua: 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', view: { width: 1024, height: 1366 } },
        { name: 'Samsung Galaxy Tab S9', ua: 'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36', view: { width: 800, height: 1280 } },
        { name: 'iPad Air', ua: 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1', view: { width: 820, height: 1180 } },
        { name: 'iPad Mini', ua: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', view: { width: 744, height: 1133 } },
        { name: 'Surface Pro 9', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0', view: { width: 1440, height: 960 } },
        { name: 'Amazon Fire HD 10', ua: 'Mozilla/5.0 (Linux; Android 9; KFTRWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/115.0.0.0 like Chrome/115.0.0.0 Safari/537.36', view: { width: 800, height: 1280 } },
        { name: 'Huawei MatePad', ua: 'Mozilla/5.0 (Linux; Android 10; BAH3-W09) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.181 Safari/537.36', view: { width: 800, height: 1280 } },
        { name: 'Lenovo Tab P11', ua: 'Mozilla/5.0 (Linux; Android 11; Lenovo TB-J606F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36', view: { width: 800, height: 1280 } }
    ];
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
        // ✅ YAHAN DALNA HAI: Alert handling logic
page.on('dialog', async dialog => {
    console.log(`[BOT] Alert detected: "${dialog.message()}". Dismissing...`);
    await dialog.dismiss(); 
});
        // 🔄 PICK RANDOM PROFILE
        const profile = ADVANCED_DEVICE_PROFILES[Math.floor(Math.random() * ADVANCED_DEVICE_PROFILES.length)];
        // SET VIEWPORT & UA
        await page.setViewport(profile.view);
        await page.setUserAgent(profile.ua);

        // 1. STAGE: Google Search Simulation (Organic Entry)
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
        await page.goto(googleUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, randomInt(3000, 6000)));

        // 2. STAGE: Visit Target Site (30-35s Total Stay)
        console.log(`[EARNING-MODE] View #${viewNumber} | URL: ${url} | Staying 35s...`);
        await page.goto(url, { 
            waitUntil: 'networkidle2', 
            timeout: 90000, 
            referer: googleUrl 
        });

        const startTime = Date.now();
        const targetStayTime = randomInt(30000, 50000); 
        let searchActionDone = false;
      
            
            // 🔍 NEW ACTION: Search Bar Interaction (0-9 Type)
            // Loop ke beech mein 40% chance par ye trigger hoga
        while (Date.now() - startTime < targetStayTime) {
            if (!searchActionDone && Math.random() < 0.4) {
                console.log(`[ACTION] Pausing scrolling to perform search...`);
                
                const searchSelectors = ['#shortUrl', 'input[type="text"]','input[type="text"]', 'input[name="s"]', 'input[placeholder*="Search"]', '#search', '.search-field'];
                let searchBar;

                for (let selector of searchSelectors) {
                    searchBar = await page.$(selector);
                    if (searchBar) break;
                }

                if (searchBar) {
                    const box = await searchBar.boundingBox();
                    if (box) {
                        // Mouse se search bar par ja kar click karna (Human-like)
                        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
                        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                        
                        // 0-9 random number typing
                        const randomDigit = Math.floor(Math.random() * 10).toString();
                        await new Promise(r => setTimeout(r, 1500)); // Click ke baad thoda wait
                        await page.keyboard.type(randomDigit, { delay: randomInt(150, 300) });
                        
                        console.log(`[ACTION] Typed "${randomDigit}" in search bar.`);
                        await new Promise(r => setTimeout(r, 1000));
                        await page.keyboard.press('Enter');
                        
                        searchActionDone = true;
                        console.log(`[ACTION] Search submitted. Resuming normal movement in 5s...`);
                        await new Promise(r => setTimeout(r, 5000)); // Action ke baad 5 sec ka pause
                    }
                } else {
                    searchActionDone = true; // Agar search bar na mile toh skip karein
                }
            }
            
    
            // Natural Scrolling
            const dist = randomInt(300, 600);
            await page.evaluate((d) => window.scrollBy(0, d), dist);
            
            // Mouse Movement (Bypass Bot Checks)
            await page.mouse.move(randomInt(100, 800), randomInt(100, 600), { steps: 10 });
            await new Promise(r => setTimeout(r, randomInt(3000, 5000)));

            // 🔥 HIGH-VALUE AD CLICKER (18% Probability)
            if (Math.random() < 0.12) { 
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

// Worker Function: Jo line se ek-ek view bhejega
async function startGlobalWorker() {
    if (isWorkerRunning) return; // Agar pehle se chal raha hai toh dubara start na karein
    isWorkerRunning = true;

    console.log("--- GLOBAL WORKER STARTED ---");

    while (globalQueue.length > 0) {
        // Queue se pehla task uthao
        const currentTask = globalQueue[0]; 

        if (currentTask.remainingViews > 0) {
            const currentViewNumber = currentTask.totalViews - currentTask.remainingViews + 1;
            const randomUrl = currentTask.urls[Math.floor(Math.random() * currentTask.urls.length)];

            console.log(`[QUEUE] User: ${currentTask.id} | View #${currentViewNumber} | URL: ${randomUrl}`);
            
            // Puppeteer task chalao
            await runGscTaskpop(currentTask.keyword, randomUrl, currentViewNumber);

            // Ek view kam karo
            currentTask.remainingViews--;

            // Is task ko queue ke peeche bhej do (Round Robin)
            globalQueue.shift(); // Aage se nikalo
            if (currentTask.remainingViews > 0) {
                globalQueue.push(currentTask); // Peeche daal do
            }

            // RAM ko rest dene ke liye chhota break
            await new Promise(r => setTimeout(r, 5000)); 
        } else {
            // Agar task poora ho gaya toh nikaal do
            globalQueue.shift();
        }
    }

    isWorkerRunning = false;
    console.log("--- ALL QUEUES CLEARED. WORKER ASLEEP ---");
}

// ===================================================================
// Tool 1 Endpoint (Updated for Multi-Site Rotation)
// ===================================================================
app.post('/popup', async (req, res) => {
    try {
        const { keyword, urls, views = 50 } = req.body;

        if (!keyword || !urls || !Array.isArray(urls)) {
            return res.status(400).json({ success: false, message: "Invalid Data!" });
        }

        // Naye task ko queue mein add karo
        const newTask = {
            id: Date.now(), // Unique ID pehchan ke liye
            keyword,
            urls,
            totalViews: parseInt(views),
            remainingViews: parseInt(views)
        };

        globalQueue.push(newTask);
        
        // Background worker ko jagao (agar so raha hai)
        startGlobalWorker();

        res.status(200).json({ 
            success: true, 
            message: `Request added to queue. Your ${views} views will be delivered in line.` 
        });

    } catch (err) {
        console.error("Endpoint Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ===================================================================
// 4. AI YOUTUBE api user tool
// ===================================================================
// ===================================================================
// 5. SMART YOUTUBE CHANNEL TOOL (NEW)
// ===================================================================
// B. Main Fetch Endpoint: Channel ki videos nikalne ke liye
app.post('/fetch-channel', async (req, res) => {
    const { channelHandle } = req.body;
    if (!YOUTUBE_API_KEY) return res.status(500).json({ success: false, message: "API Key Missing" });

    try {
        let channelId = "";
        let cleanHandle = channelHandle.trim();

        // Agar input direct Channel ID hai (UC...)
        if (cleanHandle.startsWith('UC') && cleanHandle.length > 20) {
            channelId = cleanHandle;
        } else {
            // Handle parsing logic
            if (cleanHandle.includes('@')) {
                cleanHandle = cleanHandle.split('@')[1].split(/[/?]/)[0];
                cleanHandle = '@' + cleanHandle;
            }
            
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(cleanHandle)}&key=${YOUTUBE_API_KEY}`;
            const searchRes = await axios.get(searchUrl);
            if (!searchRes.data.items.length) return res.json({ success: false, message: "Channel not found" });
            channelId = searchRes.data.items[0].id.channelId;
        }

        // Fetch 50 Latest Videos with Snippet and ContentDetails
        const videoUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=50&order=date&type=video&key=${YOUTUBE_API_KEY}`;
        const videoRes = await axios.get(videoUrl);

        const videos = videoRes.data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            // Shorts identify karne ke liye basic check
            isShort: item.snippet.title.toLowerCase().includes('#shorts') 
        }));

        // Channel info for preview
        const channelData = videoRes.data.items[0]?.snippet;

        res.json({
            success: true,
            channelTitle: channelData?.channelTitle || "Channel Found",
            thumbnail: `https://img.youtube.com/vi/${videos[0]?.id}/hqdefault.jpg`,
            totalVideos: videos.length,
            videos: videos // Poori list bhej rahe hain
        });
    } catch (error) {
        console.error("Fetch Error:", error.message);
        res.status(500).json({ success: false });
    }
});
//==================================================
// --- SERVER START ---
// ===================================================================
app.listen(PORT, () => {
    console.log(`PooreYouTuber Combined API Server is running on port ${PORT}`);
});
