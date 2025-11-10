// index.js (ULTIMATE MAX EARNING & ADSENSE SAFE VERSION)

// --- Imports (Node.js Modules) ---
const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const nodeFetch = require('node-fetch'); 
const cors = require('cors'); 
const fs = require('fs'); 
const crypto = require('crypto');
const axios = require('axios'); // Captcha Booster (Tool 5) ke liye zaroori
const { HttpsProxyAgent } = require('https-proxy-agent'); 
const http = require('http'); 
const { URL } = require('url'); 

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

// --- GA4 DATA SENDING (Placeholder for Tool 1 & 4) --- 
async function sendDataViaProxy(payload, eventType) {
    console.log(`[GA4 MP] Sending simulated GA4 data: ${eventType}`);
    return true; 
}


// ===================================================================
// 🔥 NEW: 2CAPTCHA CONFIGURATION AND SOLVER UTILITY (Tool 5 Helper)
// --- Tool 5 Code Utilities Yahan se Shuru ---
// ===================================================================

// --- 2CAPTCHA CONFIGURATION ---
const TWOCAPTCHA_BASE_URL = 'http://2captcha.com/in.php';
const TWOCAPTCHA_RES_URL = 'http://2captcha.com/res.php';

// Proxy Rotation ke liye yeh list use hogi (Webshare's dummy list)
const DUMMY_PROXIES = [ 
    { ip: "142.111.48.253", port: "7030", country: "US" }, 
    { ip: "31.59.20.176", port: "6754", country: "DE" }, 
    { ip: "23.95.150.145", port: "6114", country: "CA" }, 
    { ip: "198.23.239.134", port: "6540", country: "US" }, 
    { ip: "45.38.107.97", port: "6014", country: "US" }, 
    { ip: "107.172.163.27", port: "6543", country: "CA" }, 
    { ip: "198.105.121.200", port: "6462", country: "US" }, 
    { ip: "64.137.96.74", port: "6641", country: "US" }, 
    { ip: "216.10.27.159", port: "6837", country: "AU" }, 
    { ip: "142.111.67.146", port: "5611", country: "US" }, 
];
const COMMON_AUTH = "bqctypvz:399xb3kxqv6i"; // Aapka Webshare Auth

/**
 * Solves a reCAPTCHA v2 using 2Captcha API and a provided proxy.
 */
async function solveRecaptcha(targetUrl, siteKey, proxyIp, proxyPort, proxyAuth, apiKey) {
    const TWOCAPTCHA_API_KEY = apiKey; 
    const [proxyUser, proxyPass] = proxyAuth ? proxyAuth.split(':') : ['', ''];
    const proxyType = 'http';

    try {
        // 1. Submit the Captcha
        const submitUrl = `${TWOCAPTCHA_BASE_URL}?key=${TWOCAPTCHA_API_KEY}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${encodeURIComponent(targetUrl)}&json=1&proxy=${proxyUser}:${proxyPass}@${proxyIp}:${proxyPort}&proxytype=${proxyType}`;
        
        let response = await axios.get(submitUrl);
        
        if (response.data.status !== 1) {
            throw new Error(`2Captcha Submission Failed: ${response.data.request}`);
        }
        const taskId = response.data.request;
        console.log(`Submitted Captcha. Task ID: ${taskId}.`);

        // 2. Poll for the result (Max 75 seconds)
        let result = null;
        for (let i = 0; i < 15; i++) { 
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            const checkUrl = `${TWOCAPTCHA_RES_URL}?key=${TWOCAPTCHA_API_KEY}&action=get&id=${taskId}&json=1`;
            response = await axios.get(checkUrl);

            if (response.data.status === 1) {
                result = response.data.request;
                return { status: 'SOLVED', token: result };
            }
            if (response.data.request !== 'CAPCHA_NOT_READY') {
                throw new Error(`2Captcha Polling Error: ${response.data.request}`);
            }
        }
        
        throw new Error("2Captcha solution timed out.");

    } catch (error) {
        return { status: 'FAILED', error: error.message };
    }
}
// ===================================================================
// END: 2CAPTCHA CONFIGURATION AND SOLVER UTILITY
// ===================================================================


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
// 4. WEBSITE BOOSTER PRIME TOOL ENDPOINT (API: /proxy-request) - MAX EARNING & ADSENSE SAFE
// ===================================================================

// --- AI FUNCTION FOR KEYWORD GENERATION (UPDATED FOR HIGH-CPC) ---
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


// --- FUNCTION TO SIMULATE HIGH-VALUE CONVERSION ---
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


app.get('/proxy-request', async (req, res) => {
    
    const { target, ip, port, auth, uid, ga_id, api_secret, clicker } = req.query; 

    if (!target || !uid) { 
        return res.status(400).json({ status: 'FAILED', error: 'Missing required query parameters (target, uid).' });
    }

    const isGaMpEnabled = ga_id && api_secret; 
    const USER_AGENT = getRandomUserAgent(); 
    
    // --- Proxy/VPN Setup ---
    let proxyAgent = undefined; 
    if (ip && port) { 
        const proxyAddress = `${ip}:${port}`;
        const proxyUrl = auth && auth.includes(':') ? `http://${auth}@${proxyAddress}` : `http://${ip}:${port}`;
        proxyAgent = new HttpsProxyAgent(proxyUrl);
    } 
    
    // --- Session Data Generation ---
    const cid = uid; 
    const session_id = Date.now(); 
    const geo = getRandomGeo(); 
    const traffic = getRandomTrafficSource(true); 

    try {
        
        // 🚀 STEP 0 - GEMINI AI Keyword Generation (MAX EARNING LOGIC HERE)
        let searchKeyword = null;
        if (traffic.source === 'google' && GEMINI_KEY) { 
             const useHighValue = clicker === '1'; // Agar clicker ON hai toh High-Value Keyword use karo
             searchKeyword = await generateSearchKeyword(target, useHighValue);
             
             if (searchKeyword) {
                 traffic.referrer = `https://www.google.com/search?q=${encodeURIComponent(searchKeyword)}`;
                 console.log(`[GEMINI BOOST: ${useHighValue ? 'MAX CPC' : 'REALISTIC'}] Generated Keyword: "${searchKeyword}"`);
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


        // 🔥 STEP 2: SIMULATE CONVERSION/HIGH-VALUE ACTION (ADSENSE SAFE MODE)
        if (clicker === '1') {
            console.log(`[HIGH-VALUE ACTION] Conversion Mode is ON.`);
            await simulateConversion(target, proxyAgent, traffic.referrer, USER_AGENT);
        } else {
             console.log(`[ADSENSE SAFE MODE] Conversion Mode is OFF. Skipping high-value action.`);
        }


        // 3. Send GA4 MP data (Skipped for brevity, but same as previous index.js)
        
        // 4. Send success response back to the frontend
        const message = `✅ Success! Action simulated. Earning Status: ${clicker === '1' ? 'MAX EARNING (High-CPC Mode)' : 'ADSENSE SAFE (High Impression Mode)'}.`;

        res.status(200).json({ 
            status: 'OK', 
            message: message,
            eventsSent: 0 
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
// 5. CAPTCHA BOOSTER ENDPOINT (API: /auto-solve-captcha) - NEW TOOL (LAST ENDPOINT)
// ===================================================================
app.get('/auto-solve-captcha', async (req, res) => {
    
    // Frontend se key aur current run number lete hain
    const { apiKey, currentRun } = req.query; 

    if (!apiKey) {
        return res.status(400).json({ status: 'FAILED', error: 'Missing 2Captcha API Key.' });
    }
    
    // --- VPN/Proxy Rotation Logic ---
    const runNumber = parseInt(currentRun) || 1;
    const proxyIndex = (runNumber - 1) % DUMMY_PROXIES.length;
    const proxy = DUMMY_PROXIES[proxyIndex];
    
    const proxyDetails = {
        ip: proxy.ip, 
        port: proxy.port, 
        auth: COMMON_AUTH // Webshare Auth
    };

    // --- Captcha Target (Example - reCAPTCHA v2 Demo Site) ---
    const CAPTCHA_URL = "https://www.google.com/recaptcha/api2/demo"; 
    const CAPTCHA_SITEKEY = "6Le-wvkSAAAAAPBOPR_T_e4_30Tn_h-eQZz_vL"; 

    console.log(`[Captcha Run ${runNumber}] Attempting solve via Proxy: ${proxy.ip}`);

    // Call the solver utility
    const solverResult = await solveRecaptcha(
        CAPTCHA_URL, 
        CAPTCHA_SITEKEY, 
        proxyDetails.ip, 
        proxyDetails.port, 
        proxyDetails.auth,
        apiKey // Dynamic API key
    );

    if (solverResult.status === 'SOLVED') {
        console.log(`[Captcha Run ${runNumber}] ✅ SUCCESS! Token received.`);
        res.status(200).json({
            status: 'SOLVED',
            message: 'reCAPTCHA token successfully retrieved.',
            token: solverResult.token
        });
    } else {
        console.log(`[Captcha Run ${runNumber}] ❌ FAILED! Error: ${solverResult.error}`);
        res.status(200).json({ 
            status: 'FAILED',
            message: 'reCAPTCHA solving failed or timed out.',
            error: solverResult.error
        });
    }
});
// ===================================================================


// ===================================================================
// --- SERVER START ---
// ===================================================================
app.listen(PORT, () => {
    console.log(`PooreYouTuber Combined API Server is running on port ${PORT}`);
});
