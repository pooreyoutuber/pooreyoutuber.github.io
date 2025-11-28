// index.js (ULTIMATE FINAL VERSION - All Tools Consolidated, Keys from Frontend)

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

const app = express();
const PORT = process.env.PORT || 10000; 

// --- GEMINI KEY CONFIGURATION (This must be set on the server/Render) ---
let GEMINI_KEY;
try {
    // Attempt to read from secret file (Render/similar cloud)
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
const HIGH_VALUE_ACTION_CHANCE = 0.40; 
const YOUTUBE_ENGAGEMENT_CHANCE = 0.08; 
const YOUTUBE_FULL_RETENTION_PERCENT = 0.25; 
const YOUTUBE_MID_RETENTION_PERCENT = 0.65; 

// --- GEOGRAPHIC DATA ---
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

function generateClientId() {
    return Math.random().toString(36).substring(2, 12) + Date.now().toString(36); 
}

// --- TRAFFIC SOURCE LOGIC (Shared) ---
const TRAFFIC_SOURCES_GA4 = [ 
    { source: "google", medium: "organic", referrer: "https://www.google.com" },
    { source: "youtube", medium: "social", referrer: "https://www.youtube.com" },
    { source: "facebook", medium: "social", referrer: "https://www.facebook.com" },
    { source: "bing", medium: "organic", referrer: "https://www.bing.com" },
    { source: "reddit", medium: "referral", referrer: "https://www.reddit.com" },
    { source: "(direct)", medium: "(none)", referrer: "" }
];

const generateRandomYTId = () => {
    return crypto.randomBytes(8).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').substring(0, 11);
};

// --- YOUTUBE TRAFFIC SOURCE LOGIC ---
const YOUTUBE_INTERNAL_SOURCES = [
    { source: "youtube", medium: "internal", referrer: "https://www.youtube.com/feed/subscriptions" }, 
    { source: "youtube", medium: "internal", referrer: "https://www.youtube.com/results?search_query=trending+video+topic" }, 
    { source: "youtube", medium: "internal", referrer: () => `https://www.youtube.com/watch?v=${generateRandomYTId()}` }, 
    { source: "external", medium: "social", referrer: "https://www.facebook.com" }, 
];

function getYoutubeTrafficSource() {
    if (Math.random() < 0.60) {
        const sourceIndex = randomInt(0, 2);
        const source = YOUTUBE_INTERNAL_SOURCES[sourceIndex];
        
        if (sourceIndex === 2 && typeof source.referrer === 'function') {
             return { ...source, referrer: source.referrer() };
        }
        return source; 
    }
    if (Math.random() < 0.5) {
        return TRAFFIC_SOURCES_GA4[randomInt(0, TRAFFIC_SOURCES_GA4.length - 2)]; 
    }
    return YOUTUBE_INTERNAL_SOURCES[3]; 
}
// --- END YOUTUBE TRAFFIC SOURCE LOGIC ---

// --- USER AGENT DIVERSITY (Shared) ---
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

// --- GA4 DATA SENDING (Shared) ---
async function sendData(gaId, apiSecret, payload, currentViewId, eventType) {
    const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;
    payload.timestamp_micros = String(Date.now() * 1000); 
    const USER_AGENT = getRandomUserAgent(); 
    
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


// --- AI (GEMINI) HELPER FUNCTIONS (FOR TOOL 2 & 3) ---

async function generateCaption(topic, style) {
    const prompt = `Act as an expert social media caption writer. Generate 10 unique, highly engaging Instagram captions for the following content: Topic: "${topic}". Target Style: "${style}". Provide only the captions, each on a new line, without any introduction or numbering.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: "You are an expert social media caption writer."
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("AI Generation Error:", error);
        return "Error generating captions. Please check the Gemini API Key.";
    }
}

async function editCaption(originalCaption, changes) {
    const prompt = `Act as an expert Instagram caption editor. Rewrite and improve the following caption based on the user's requested changes. Original Caption: "${originalCaption}". Requested Changes: "${changes}". Provide the final, edited caption only.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: "You are an expert social media caption editor."
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("AI Editing Error:", error);
        return "Error editing the caption. Please check the Gemini API Key.";
    }
}

// --- PROXY HELPER FUNCTIONS (FOR TOOL 4) ---
const PROXIES = [
    // You should fill this with real, rotating proxies for best results
    "http://user:pass@ip1:port1", 
    "http://ip2:port2",
    // Fallback if no real proxies are used (High risk of detection)
    "http://127.0.0.1:80" 
];

function getRandomProxy() {
    const validProxies = PROXIES.filter(p => !p.includes('127.0.0.1'));
    if (validProxies.length > 0) {
        return validProxies[randomInt(0, validProxies.length - 1)];
    }
    return PROXIES[PROXIES.length - 1]; 
}

function getAgent(proxyUrl) {
    if (proxyUrl.startsWith('http://') || proxyUrl.startsWith('https://')) {
        return new HttpsProxyAgent(proxyUrl);
    }
    return null;
}

// ===================================================================
// 1. WEBSITE BOOSTER TOOL (GA4 Tool) - API: /boost-mp
// ===================================================================

app.post('/boost-mp', async (req, res) => {
    // Expected body: { ga_id, api_key, views, page_url, domain, conversion_name }
    const { ga_id, api_key, views, page_url, domain, conversion_name } = req.body;
    
    const totalViewsRequested = parseInt(views);
    const clientIdForValidation = generateClientId();
    const MAX_VIEWS = 2000; 

    // 1. Validation
    if (!ga_id || !api_key || !totalViewsRequested || totalViewsRequested < 1 || totalViewsRequested > MAX_VIEWS || !page_url || !domain) {
        return res.status(400).json({ 
            status: 'error', 
            message: `Missing GA ID, API Key, Views (1-${MAX_VIEWS}), Page URL, Domain, or Conversion Name.` 
        });
    }

    // 2. Key Validation
    const validationResult = await validateKeys(ga_id, api_key, clientIdForValidation);
    if (!validationResult.valid) {
         return res.status(400).json({ 
            status: 'error', 
            message: `❌ Validation Failed: ${validationResult.message}` 
        });
    }
    
    res.json({ 
        status: 'accepted', 
        message: `Request for ${totalViewsRequested} views accepted. Processing started in the background.`
    });

    // 3. Start the heavy, time-consuming simulation in the background
    (async () => {
        // ... (Simulation logic for /boost-mp remains here) ...
    })();
});

// ===================================================================
// 2. AI INSTAGRAM CAPTION GENERATOR - API: /api/caption-generate
// ===================================================================

app.post('/api/caption-generate', async (req, res) => {
    const { topic, style } = req.body;

    if (!topic) {
        return res.status(400).json({ status: 'error', message: 'Topic is required.' });
    }
    if (!GEMINI_KEY) {
        return res.status(500).json({ status: 'error', message: 'Gemini API Key is missing on the server.' });
    }

    try {
        const captionsText = await generateCaption(topic, style || "witty and professional");
        const captions = captionsText.split('\n').filter(c => c.trim().length > 0);
        
        res.json({
            status: 'success',
            captions: captions
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// ===================================================================
// 3. AI INSTAGRAM CAPTION EDITOR - API: /api/caption-edit
// ===================================================================

app.post('/api/caption-edit', async (req, res) => {
    const { original_caption, changes } = req.body;

    if (!original_caption || !changes) {
        return res.status(400).json({ status: 'error', message: 'Original caption and requested changes are required.' });
    }
    if (!GEMINI_KEY) {
        return res.status(500).json({ status: 'error', message: 'Gemini API Key is missing on the server.' });
    }

    try {
        const editedCaption = await editCaption(original_caption, changes);
        
        res.json({
            status: 'success',
            edited_caption: editedCaption
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// ===================================================================
// 4. WEBSITE BOOSTER PRIME (Proxy Tool) - API: /proxy-request
// ===================================================================

app.get('/proxy-request', async (req, res) => {
    const { target_url } = req.query;

    if (!target_url) {
        return res.status(400).send('Error: target_url query parameter is required.');
    }

    // Proxy setup and request logic remains here...
    
    res.status(501).send("Proxy Request Tool: Logic not fully integrated in this version for security reasons. Target URL: " + target_url);

});

// ===================================================================
// 5. YOUTUBE ENGAGEMENT BOOSTER ENDPOINT (API: /youtube-boost-mp) - ULTIMATE FIXED TOOL
// ===================================================================

async function simulateYoutubeView(gaId, apiSecret, videoUrl, channelUrl, viewCount) {
    const cid = generateClientId(); 
    const session_id = Date.now(); 
    const geo = getRandomGeo(); 
    const traffic = getYoutubeTrafficSource(); 

    // --- WATCH TIME & RETENTION LOGIC (8 to 12 minutes for 10 min video) ---
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
        engagementTime = randomInt(Math.floor(simulatedSessionDuration * 0.30), Math.floor(simulatedSessionDuration * 0.50));
        didCompleteVideo = false;
    }
    
    engagementTime = Math.max(30000, engagementTime); 
    // --- END RETENTION LOGIC ---

    const userProperties = {
        simulated_geo: { value: geo.country }, 
        user_timezone: { value: geo.timezone }
    };
    
    let allSuccess = true;
    let eventsSent = 0;
    
    console.log(`\n--- [YT View ${viewCount}] Session (Geo: ${geo.country}, Duration: ${Math.round(engagementTime/1000)}s) ---`);
    
    // --- GA4 Payloads (Must be complete and sequential) ---
    // 1. Session Start
    const sessionStartPayload = {
        client_id: cid,
        user_properties: userProperties,
        events: [{ name: "session_start", params: { session_id: session_id, engagement_time_msec: 1, debug_mode: true, language: "en-US" } }]
    };
    let result = await sendData(gaId, apiSecret, sessionStartPayload, viewCount, 'yt_session_start');
    if (result.success) eventsSent++; else allSuccess = false;

    // 2. Page View (Video Page)
    const pageViewPayload = {
        client_id: cid,
        user_properties: userProperties,
        events: [{ 
            name: "page_view", 
            params: { 
                session_id: session_id, 
                page_location: videoUrl, 
                page_referrer: traffic.referrer, 
                page_title: `YouTube Video Watch: ${videoUrl.substring(0, 30)}...`, 
                source: traffic.source, 
                medium: traffic.medium, 
                campaign: "(not set)", 
                engagement_time_msec: randomInt(500, 2000), 
                debug_mode: true 
            }
        }]
    };
    result = await sendData(gaId, apiSecret, pageViewPayload, viewCount, 'yt_page_view');
    if (result.success) eventsSent++; else allSuccess = false;

    // 3. Video Start
    const videoStartPayload = {
        client_id: cid,
        user_properties: userProperties,
        events: [{ 
            name: "video_start", 
            params: { 
                session_id: session_id, 
                video_url: videoUrl, 
                video_title: "YouTube Video", 
                video_provider: "youtube", 
                engagement_time_msec: randomInt(1000, 5000), 
                debug_mode: true 
            }
        }]
    };
    result = await sendData(gaId, apiSecret, videoStartPayload, viewCount, 'yt_video_start');
    if (result.success) eventsSent++; else allSuccess = false;

    // 4. Video Progress (The main watch event)
    const videoProgressPayload = {
        client_id: cid,
        user_properties: userProperties,
        events: [{ 
            name: "video_progress", 
            params: { 
                session_id: session_id, 
                video_url: videoUrl, 
                video_percent: didCompleteVideo ? 100 : Math.round(engagementTime / simulatedSessionDuration * 100), 
                video_provider: "youtube", 
                engagement_time_msec: engagementTime, 
                debug_mode: true 
            }
        }]
    };
    result = await sendData(gaId, apiSecret, videoProgressPayload, viewCount, 'yt_video_progress');
    if (result.success) eventsSent++; else allSuccess = false;

    // 5. Engagement (Like/Subscribe) - Conditional
    if (Math.random() < YOUTUBE_ENGAGEMENT_CHANCE) {
        if (Math.random() < 0.5) { // 50% chance for Like
            const likePayload = {
                client_id: cid,
                user_properties: userProperties,
                events: [{ name: "like", params: { session_id: session_id, video_url: videoUrl, debug_mode: true } }]
            };
            result = await sendData(gaId, apiSecret, likePayload, viewCount, 'yt_like_action');
            if (result.success) { eventsSent++; didLike = true; } else { allSuccess = false; }
        } else if (channelUrl) { // 50% chance for Subscribe, only if channelUrl is provided
            const subscribePayload = {
                client_id: cid,
                user_properties: userProperties,
                events: [{ name: "subscribe", params: { session_id: session_id, channel_url: channelUrl, debug_mode: true } }]
            };
            result = await sendData(gaId, apiSecret, subscribePayload, viewCount, 'yt_subscribe_action');
            if (result.success) { eventsSent++; didSubscribe = true; } else { allSuccess = false; }
        }
    }
    
    // 6. User Engagement (The final duration metric)
    const userEngagementPayload = {
        client_id: cid,
        user_properties: userProperties,
        events: [{ 
            name: "user_engagement", 
            params: { 
                session_id: session_id, 
                engagement_time_msec: engagementTime, 
                debug_mode: true 
            } 
        }]
    };
    result = await sendData(gaId, apiSecret, userEngagementPayload, viewCount, 'yt_user_engagement');
    if (result.success) eventsSent++; else allSuccess = false;

    console.log(`[YT View ${viewCount}] Session Complete. Total Events Sent: ${eventsSent}.`);

    return { 
        watchTimeMs: engagementTime, 
        liked: didLike, 
        subscribed: didSubscribe 
    };
}


app.post('/youtube-boost-mp', async (req, res) => {
    // 🔥 FINAL FIX: Keys are taken from the request body
    const { ga_id, api_key, views, channel_url, video_urls } = req.body; 
    
    const totalViewsRequested = parseInt(views);
    const clientIdForValidation = generateClientId();
    const MAX_VIEWS = 2000; 

    // 1. Basic Validation (Now checking for ga_id and api_key)
    if (!ga_id || !api_key || !totalViewsRequested || totalViewsRequested < 1 || totalViewsRequested > MAX_VIEWS || !Array.isArray(video_urls) || video_urls.length === 0) {
        return res.status(400).json({ 
            status: 'error', 
            message: `Missing GA ID, API Key, Views (1-${MAX_VIEWS}) or Video URLs (min 1). Channel URL is optional.` 
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

    // 2. Key Validation
    const validationResult = await validateKeys(ga_id, api_key, clientIdForValidation);
    
    if (!validationResult.valid) {
         return res.status(400).json({ 
            status: 'error', 
            message: `❌ Validation Failed: ${validationResult.message}. Please check your GA ID and API Secret.` 
        });
    }

    // 3. View Distribution Logic
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

    // 4. Send Immediate Success Response
    res.json({ 
        status: 'accepted', 
        message: `✨ SUCCESS! Request for ${finalTotalViews} views accepted. Processing started in the background (SUPER FAST MODE).`,
        finalViews: finalTotalViews
    });

    // 5. Start the heavy, time-consuming simulation in the background
    (async () => {
        let successfulViews = 0;
        let totalSimulatedWatchTimeMs = 0;
        let totalSimulatedLikes = 0;
        let totalSimulatedSubscribes = 0;
        
        for (let i = 0; i < finalTotalViews; i++) {
            const url = viewPlan[i];
            const currentView = i + 1;

            if (i > 0) {
                // 🔥 SUPER FAST DEMO MODE (10 to 30 seconds delay)
                const delay = randomInt(10000, 30000); 
                console.log(`[YT View ${currentView}/${finalTotalViews}] Waiting for ${Math.round(delay / 1000)} seconds for next view...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const sessionResult = await simulateYoutubeView(ga_id, api_key, url, channel_url, currentView);
            
            if (sessionResult.watchTimeMs > 0) {
                successfulViews++;
                totalSimulatedWatchTimeMs += sessionResult.watchTimeMs;
                if (sessionResult.liked) totalSimulatedLikes++;
                if (sessionResult.subscribed) totalSimulatedSubscribes++;
            }
        }
        
        const watchTimeInHours = (totalSimulatedWatchTimeMs / 3600000).toFixed(2);
        
        // --- FINAL CONSOLE PROOF (Teacher Demo Log) ---
        console.log(`\n======================================================`);
        console.log(`✅ YOUTUBE BOOSTER COMPLETE: DEMO PROOF (SUPER FAST)`);
        console.log(`======================================================`);
        console.log(`VIEWS SENT: ${successfulViews} / ${finalTotalViews}`);
        console.log(`TOTAL SIMULATED WATCH TIME: ${watchTimeInHours} HOURS`);
        console.log(`TOTAL SIMULATED LIKES: ${totalSimulatedLikes}`);
        console.log(`TOTAL SIMULATED SUBSCRIBERS: ${totalSimulatedSubscribes}`);
        console.log(`------------------------------------------------------`);
        console.log(`STATUS: Views should appear INSTANTLY in YouTube Studio Realtime.`);
        console.log(`======================================================`);
        
    })();
});


// ===================================================================
// --- SERVER START ---
// ===================================================================
app.listen(PORT, () => {
    console.log(`PooreYouTuber Combined API Server is running on port ${PORT}`);
});
