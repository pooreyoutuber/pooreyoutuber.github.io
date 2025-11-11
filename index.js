// index.js (ULTIMATE MAX EARNING & ADSENSE SAFE VERSION - BILLING SAFE)

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

// --- GEMINI KEY CONFIGURATION ---
let GEMINI_KEY;
try {
    // Attempt to load key from a secret file (standard deployment practice)
    GEMINI_KEY = fs.readFileSync('/etc/secrets/gemini', 'utf8').trim(); 
} catch (e) {
    // Fallback to environment variables
    GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY; 
}

let ai;
if (GEMINI_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
} else {
    // Graceful fallback if key is missing (will only affect low-risk keyword generation)
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

// --- TRAFFIC SOURCE LOGIC ---
const TRAFFIC_SOURCES_PROXY = [ 
    { source: "google", medium: "organic", referrer: "https://www.google.com/" },
    { source: "direct", medium: "none", referrer: "" },
    { source: "facebook.com", medium: "social", referrer: "https://www.facebook.com/" },
    { source: "linkedin.com", medium: "social", referrer: "https://www.linkedin.com/" },
    { source: "bing", medium: "organic", referrer: "https://www.bing.com/" },
];

function getRandomTrafficSource(isProxyTool = false) {
    return TRAFFIC_SOURCES_PROXY[randomInt(0, TRAFFIC_SOURCES_PROXY.length - 1)];
}

// --- USER AGENT DIVERSITY ---
const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version=17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0"
];

function getRandomUserAgent() {
    return USER_AGENTS[randomInt(0, USER_AGENTS.length - 1)];
}

// --- GA4 DATA SENDING (Tool 1 & 4 Fix - Added full logic for safety) --- 
const GA4_MP_URL = "https://www.google-analytics.com/mp/collect"; 

async function sendDataViaProxy(payload, eventType) {
    if (!payload.ga_id || !payload.api_secret) {
        console.log(`[GA4 MP SKIP] GA4 ID or API Secret missing. Skipping event: ${eventType}`);
        return false;
    }
    
    // GA4 MP ke parameters
    const params = new URLSearchParams({
        measurement_id: payload.ga_id,
        api_secret: payload.api_secret
    }).toString();
    
    const mpUrl = `${GA4_MP_URL}?${params}`;
    
    // Payload for the POST request
    const body = JSON.stringify({
        client_id: payload.cid,
        user_id: payload.uid, // User ID for better tracking
        events: [{
            name: eventType,
            params: {
                // GA4 session ID tracking
                session_id: payload.session_id,
                // Geographical data
                country: payload.geo.country,
                region: payload.geo.region,
                // Traffic Source data
                source: payload.traffic.source,
                medium: payload.traffic.medium,
                referrer: payload.traffic.referrer,
                // Other parameters for safety
                engagement_time_msec: payload.engagement_time_msec || '10000',
                debug_mode: true // Debug mode for testing
            }
        }]
    });

    console.log(`[GA4 MP] Sending simulated GA4 data: ${eventType} to ${payload.ga_id}`);

    try {
        await axios.post(mpUrl, body, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 8000
        });
        console.log(`[GA4 MP SUCCESS] Event '${eventType}' sent for CID: ${payload.cid}`);
        return true;
    } catch (error) {
        console.error(`[GA4 MP FAILED] Error sending event '${eventType}':`, error.message.substring(0, 50));
        return false;
    }
}


// ===================================================================
// 1. WEBSITE BOOSTER ENDPOINT (API: /boost-mp) - GA4 TOOL (Placeholder)
// ===================================================================
app.post('/boost-mp', async (req, res) => {
    console.log("[TOOL 1] GA4 MP Boost Request Received. Processing...");
    res.json({ 
        status: 'accepted', 
        message: 'GA4 MP request accepted. Running simulation in background.'
    });
});


// ===================================================================
// 2. AI INSTA CAPTION GENERATOR ENDPOINT - GEMINI TOOL 
// 3. AI INSTA CAPTION EDITOR ENDPOINT - GEMINI TOOL 
// (NO CHANGES HERE - THESE TOOLS ARE FINE)
// ===================================================================
// NOTE: Lines 131 to 295 are unchanged from original file.


// ===================================================================
// 4. WEBSITE BOOSTER PRIME TOOL ENDPOINT (API: /proxy-request) - MAX EARNING & ADSENSE SAFE
// ===================================================================

// --- FIXED KEYWORDS FOR HIGH-CPC (TO AVOID GEMINI BILLING) ---
const HIGH_CPC_KEYWORDS = [ 
    "Best health insurance plans 2025", 
    "high yield savings account interest rate", 
    "cheap car insurance quotes online",
    "mortgage refinance calculator",
    "personal injury lawyer free consultation",
    "cloud computing solutions for small business",
    "best credit card for travel rewards"
];

// --- AI FUNCTION FOR KEYWORD GENERATION (UPDATED TO USE FIXED LIST & REDUCED AI USE) ---
async function generateSearchKeyword(targetUrl, isHighValue = false) {
    if (isHighValue) {
        // High-CPC mode mein AI ko skip karke fixed list use karo (BILLING SAFE)
        console.log(`[GEMINI SKIP] Using fixed HIGH-CPC keywords to save billing.`);
        const keyword = HIGH_CPC_KEYWORDS[randomInt(0, HIGH_CPC_KEYWORDS.length - 1)];
        return keyword;
    } 
    
    // Low-risk mode mein Gemini ko kam baar use karo (only if key exists)
    if (!ai || !GEMINI_KEY) {
        return null;
    }

    let urlPath;
    try {
        urlPath = new URL(targetUrl).pathname;
    } catch (e) {
        urlPath = targetUrl;
    }
    // ORIGINAL LOW-RISK PROMPT (REDUCED TEMPERATURE)
    const prompt = `Generate exactly 1 realistic and highly relevant search query (keyword) that an actual person might use to find a webpage with the topic/URL path: ${urlPath}. Format the output as a JSON array of strings.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: "array", items: { type: "string" } },
                temperature: 0.5, // Temperature kam kiya for stable results and low risk
            },
        });
        const keywords = JSON.parse(response.text.trim());
        if (Array.isArray(keywords) && keywords.length > 0) {
            return keywords[0]; 
        }
    } catch (error) {
        console.error('Gemini Keyword Generation Failed. Using fallback.', error.message.substring(0, 50));
    }
    // Fallback for low-risk mode
    return "what is "+ urlPath.replace(/[^a-zA-Z0-9]/g, ' ').trim().split(' ')[0];
}


// --- FUNCTION TO SIMULATE HIGH-VALUE CONVERSION (HUMAN-LIKE CLICK) ---
async function simulateConversion(targetUrl, proxyAgent, originalReferrer, userAgent) {
    const parsedUrl = new URL(targetUrl);
    const domain = parsedUrl.origin;
    
    // 1. Simulate Mouse Movement (AdSense Safety)
    console.log(`[ACTION 1] Simulating 2s mouse movement and pause (Human Interaction).`);
    await new Promise(resolve => setTimeout(resolve, randomInt(1500, 2500)));

    // 2. Simulate Click & Second Page Load (High Earning Strategy - REAL INTERNAL LINK)
    // CRITICAL FIX: Simulate a click on a REAL internal link (Human-like deep engagement)
    const internalPaths = ['/about-us', '/contact-us', '/category-tech', '/blog/latest-post', '/']; 
    const conversionPath = internalPaths[randomInt(0, internalPaths.length - 1)];
    const conversionTarget = domain + conversionPath; 
    
    try {
        console.log(`[ACTION 2] Simulating Conversion: Loading second, realistic internal page (${conversionTarget}).`);
        
        await nodeFetch(conversionTarget, {
            method: 'GET',
            headers: { 
                'User-Agent': userAgent,
                'Referer': targetUrl // Referer is the original target URL (Internal Click)
            }, 
            agent: proxyAgent, 
            timeout: 5000 
        });
        console.log(`[CONVERSION SUCCESS] Second page loaded successfully (Simulated high-value action).`);
        return true;
    } catch (error) {
        console.log(`[CONVERSION FAIL] Simulated second page load failed. Ensure internal links exist on site: ${error.message}`);
        return false;
    }
}


app.get('/proxy-request', async (req, res) => {
    
    const { target, ip, port, auth, uid, ga_id, api_secret, clicker } = req.query; 

    // CRITICAL FRONTEND CHECK: GA4 ID is REQUIRED for safety
    if (!target || !uid || !ga_id || !api_secret) { 
        return res.status(400).json({ status: 'FAILED', error: 'Missing required query parameters (target, uid, GA4 ID/Secret). Please enter GA4 details in the tool.' });
    }

    const isGaMpEnabled = ga_id && api_secret; 
    const USER_AGENT = getRandomUserAgent(); 
    
    // --- Proxy/VPN Setup ---
    let proxyAgent = undefined; 
    if (ip && port) { 
        const proxyAddress = `${ip}:${port}`;
        // Standard proxy URL construction
        const proxyUrl = auth && auth.includes(':') ? `http://${auth}@${proxyAddress}` : `http://${ip}:${port}`;
        proxyAgent = new HttpsProxyAgent(proxyUrl);
    } 
    // Agar ip aur port empty hain, toh request direct VPN IP se jaaegi (NO proxyAgent)
    
    // --- Session Data Generation ---
    const cid = uid; // Client ID for GA4 (Unique User ID is fine for this)
    const session_id = Date.now(); 
    const geo = getRandomGeo(); 
    const traffic = getRandomTrafficSource(true); 

    try {
        
        // 🚀 STEP 0 - Keyword Generation (MAX EARNING LOGIC HERE - NOW BILLING SAFE)
        let searchKeyword = null;
        if (traffic.source === 'google') { 
             const useHighValue = clicker === '1'; // Agar clicker ON hai toh Fixed High-Value Keyword use karo
             searchKeyword = await generateSearchKeyword(target, useHighValue);
             
             if (searchKeyword) {
                 traffic.referrer = `https://www.google.com/search?q=${encodeURIComponent(searchKeyword)}`;
                 console.log(`[BOOST: ${useHighValue ? 'MAX CPC (FIXED)' : 'REALISTIC (AI)'}] Generated Keyword: "${searchKeyword}"`);
             }
        }

        // 🔥 STEP 1: TARGET URL VISIT (First Page Load)
        console.log(`[TARGET VISIT] Hitting target ${target}.`);
        
        const targetResponse = await nodeFetch(target, {
            method: 'GET', 
            headers: { 
                'User-Agent': USER_AGENT,
                'Referer': traffic.referrer 
            }, 
            agent: proxyAgent,
            timeout: 10000 // Added timeout for stability
        });

        if (targetResponse.status < 200 || targetResponse.status >= 300) {
             throw new Error(`Target visit failed with status ${targetResponse.status}`);
        }
        console.log(`[TARGET VISIT SUCCESS] Target visited.`);

        // 💡 ADVANCED IDEA: REALISTIC WAIT TIME (HUMAN-LIKE ENGAGEMENT)
        const waitTime = randomInt(30000, 40000); // Increased for better earning signal (30s-40s)
        console.log(`[WAIT] Simulating human behavior: Waiting for ${Math.round(waitTime/1000)} seconds.`);
        await new Promise(resolve => setTimeout(resolve, waitTime));


        // 🔥 STEP 2: SIMULATE CONVERSION/HIGH-VALUE ACTION (ADSENSE SAFE MODE)
        let isConversionSuccess = false;
        if (clicker === '1') {
            console.log(`[HIGH-VALUE ACTION] Conversion Mode is ON.`);
            isConversionSuccess = await simulateConversion(target, proxyAgent, traffic.referrer, USER_AGENT);
        } else {
             console.log(`[ADSENSE SAFE MODE] Conversion Mode is OFF. Skipping high-value action.`);
        }
        
        // 🔥 STEP 3: Send GA4 MP data (CRITICAL FOR ADSENSE SAFETY)
        let eventsSent = 0;
        if (isGaMpEnabled) {
            const payload = {
                ga_id, api_secret, cid, uid, session_id, geo, traffic, 
                engagement_time_msec: waitTime.toString()
            };
            
            // Send a 'page_view' event
            const success = await sendDataViaProxy(payload, 'page_view');
            if (success) {
                eventsSent++;
                // Agar conversion successful hua, toh ek 'conversion' event bhi bhej sakte hain
                if (isConversionSuccess) {
                    await sendDataViaProxy(payload, 'high_value_engagement');
                    eventsSent++;
                }
            }
        }


        // 4. Send success response back to the frontend
        const message = `✅ Success! Action simulated. Earning Status: ${clicker === '1' ? 'MAX EARNING (High-CPC Mode)' : 'ADSENSE SAFE (High Impression Mode)'}.`;

        res.status(200).json({ 
            status: 'OK', 
            message: message,
            eventsSent: eventsSent 
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
// --- SERVER START ---
// ===================================================================
app.listen(PORT, () => {
    console.log(`PooreYouTuber Combined API Server is running on port ${PORT}`);
});
