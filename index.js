// index.js (यह आपका अंतिम, फिक्स किया हुआ और मर्ज किया हुआ कोड है)

// --- Imports (Node.js Modules) ---
const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const nodeFetch = require('node-fetch'); 
const cors = require('cors'); 
const fs = require('fs'); 
const crypto = require('crypto'); 
const axios = require('axios'); // Proxying ke liye
const { HttpsProxyAgent } = require('https-proxy-agent'); 

const app = express();
const PORT = process.env.PORT || 10000; 

// --- GEMINI KEY CONFIGURATION (ORIGINAL) ---
let GEMINI_KEY;
try {
    GEMINI_KEY = fs.readFileSync('/etc/secrets/gemini', 'utf8').trim(); 
    console.log("Gemini Key loaded successfully from Secret File.");
} catch (e) {
    GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY; 
    if (GEMINI_KEY) {
        console.log("Gemini Key loaded from Environment Variable (Fallback).");
    } else {
        console.error("FATAL: Gemini Key could not be loaded. AI Tools will fail.");
    }
}

let ai;
if (GEMINI_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
} else {
    ai = { models: { generateContent: () => Promise.reject(new Error("AI Key Missing")) } };
}

// --- MIDDLEWARE & UTILITIES (ORIGINAL) ---
app.use(cors({
    origin: 'https://pooreyoutuber.github.io', 
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json({ limit: '5mb' }));

app.get('/', (req, res) => {
    res.status(200).send('PooreYouTuber Combined API is running! Access tools via GitHub Pages.'); 
});

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// GA4 Helper functions (ORIGINAL)
const FIRST_NAMES = ["John", "Sarah", "David", "Emily", "Michael", "Jessica", "Robert", "Jennifer", "William", "Laura", "Thomas", "Lisa", "Chris", "Emma", "Paul", "Mary", "George", "Nicole", "Mark", "Olivia", "Charles", "Sophia", "Daniel", "Chloe"];
const LAST_NAMES = ["Smith", "Jones", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Clark", "Lewis", "Walker", "Hall", "Allen", "Young", "Scott", "Adams", "Baker"];
function generateRealName() {
    const firstName = FIRST_NAMES[randomInt(0, FIRST_NAMES.length - 1)];
    const lastName = LAST_NAMES[randomInt(0, LAST_NAMES.length - 1)];
    return { first_name: firstName, last_name: lastName };
}
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
    return crypto.randomUUID(); 
}
const getOptimalDelay = (totalViews) => {
    const targetDurationMs = 7200000; // 2 Hours
    const avgDelayMs = totalViews > 0 ? targetDurationMs / totalViews : 0;
    const minDelay = Math.max(1000, avgDelayMs * 0.7); 
    const maxDelay = avgDelayMs * 1.3;
    const finalMaxDelay = Math.min(maxDelay, 1200000); 
    return randomInt(minDelay, finalMaxDelay);
};

// --- GA4 DATA SENDING, Validation, simulateView, generateViewPlan functions (ORIGINAL) ---
// Note: Full GA4 functions (sendData, validateKeys, simulateView, generateViewPlan) 
// are assumed to be copied here from the previous full code block.

// sendData function
async function sendData(gaId, apiSecret, payload, currentViewId, eventType) {
    const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;
    payload.timestamp_micros = String(Date.now() * 1000); 
    const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36";

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
            return { success: false };
        }
    } catch (error) {
        console.error(`[View ${currentViewId}] CRITICAL ERROR ⚠️ | Event: ${eventType}. Connection Failed: ${error.message}`);
        return { success: false };
    }
}

// validateKeys function
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
                console.error(`[VALIDATION FAILED] Key/ID Invalid. Google says: ${message}`);
                return { valid: false, message: (message.includes("Invalid measurement_id") || message.includes("API Secret is not valid")) ? "GA ID or API Secret is invalid. Please check keys." : `Validation Error: ${message.substring(0, 80)}` };
            }
        }
        console.log("[VALIDATION SUCCESS] Keys and basic payload passed Google's check.");
        return { valid: true };

    } catch (error) {
        console.error('Validation Connection Error:', error.message);
        return { valid: false, message: `Could not connect to Google validation server: ${error.message}` };
    }
}

// simulateView function
async function simulateView(gaId, apiSecret, url, searchKeyword, viewCount) {
    const cid = generateClientId(); 
    const geo = getRandomGeo(); 
    const name = generateRealName(); 
    const session_id = Date.now(); 
    
    const userProperties = {
        country: { value: geo.country },
        region: { value: geo.region },
        user_timezone: { value: geo.timezone },
        first_name: { value: name.first_name },
        last_name: { value: name.last_name }
    };
    let referrer = searchKeyword ? `https://www.google.com/search?q=${encodeURIComponent(searchKeyword)}` : (Math.random() < 0.3 ? (Math.random() < 0.5 ? "https://t.co/random" : "https://exampleblog.com/post-link") : "direct");

    let sessionStartEvents = [{name: "session_start", params: { session_id: session_id, _ss: 1, debug_mode: true }}];
    const sessionStartPayload = { client_id: cid, user_properties: userProperties, events: sessionStartEvents };

    let allSuccess = true;
    console.log(`\n--- [View ${viewCount}] Starting session (${geo.country}, User: ${name.first_name} ${name.last_name}). Session ID: ${session_id} ---`);

    let result = await sendData(gaId, apiSecret, sessionStartPayload, viewCount, 'session_start');
    if (!result.success) allSuccess = false;
    await new Promise(resolve => setTimeout(resolve, randomInt(1000, 3000)));

    const pageViewEvents = [{ name: 'page_view', params: { page_location: url, page_title: searchKeyword ? `Search: ${searchKeyword}` : "Simulated Page View", page_referrer: referrer, session_id: session_id, debug_mode: true, language: "en-US" }}];
    const pageViewPayload = { client_id: cid, user_properties: userProperties, events: pageViewEvents };

    result = await sendData(gaId, apiSecret, pageViewPayload, viewCount, 'page_view');
    if (!result.success) allSuccess = false;

    const firstWait = randomInt(3000, 8000);
    await new Promise(resolve => setTimeout(resolve, firstWait));

    const scrollPayload = { client_id: cid, user_properties: userProperties, events: [{ name: "scroll", params: { session_id: session_id, debug_mode: true } }] };
    result = await sendData(gaId, apiSecret, scrollPayload, viewCount, 'scroll');
    if (!result.success) allSuccess = false;

    const secondWait = randomInt(3000, 8000);
    await new Promise(resolve => setTimeout(resolve, secondWait));

    const engagementTime = firstWait + secondWait + randomInt(5000, 20000);
    const engagementPayload = { client_id: cid, user_properties: userProperties, events: [{ name: "user_engagement", params: { engagement_time_msec: engagementTime, session_id: session_id, interaction_type: "click_simulated", debug_mode: true } }] };
    
    result = await sendData(gaId, apiSecret, engagementPayload, viewCount, 'user_engagement');
    if (!result.success) allSuccess = false;

    console.log(`[View ${viewCount}] Completed session. Total Time: ${Math.round(engagementTime/1000)}s. (Success: ${allSuccess ? 'Yes' : 'No'})`);
    return allSuccess;
}

// generateViewPlan function
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
// 1. WEBSITE BOOSTER ENDPOINT (API: /boost-mp) - GA4 TOOL (ORIGINAL)
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
        message: `✨ Request accepted. Keys validated. Processing started in the background (~2 hours). CHECK DEBUGVIEW NOW!`
    });

    (async () => {
        const totalViews = viewPlan.length;
        console.log(`\n=================================================`);
        console.log(`[BOOSTER START] Starting real simulation for ${totalViews} views.`);
        console.log(`=================================================`);

        for (let i = 0; i < totalViews; i++) {
            const url = viewPlan[i];
            const currentView = i + 1;

            await simulateView(ga_id, api_key, url, search_keyword, currentView);

            const delay = getOptimalDelay(totalViews);
            console.log(`[View ${currentView}/${totalViews}] Waiting for ${Math.round(delay / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        console.log(`\n=================================================`);
        console.log(`[BOOSTER COMPLETE] Successfully finished ${totalViews} view simulations.`);
        console.log(`=================================================\n`);
    })();
});


// ===================================================================
// 2. AI INSTA CAPTION GENERATOR ENDPOINT - GEMINI TOOL (ORIGINAL)
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
// 3. AI INSTA CAPTION EDITOR ENDPOINT - GEMINI TOOL (ORIGINAL)
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

// ***********************************************
// 🚀 4. WEBSITE BOOSTER PRIME (PROXY ROTATOR) LOGIC - NEW AND FIXED
// ***********************************************

// PROXY LIST
const PROXIES = [
    { ip: '142.111.48.253', port: 7030, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'US' },
    { ip: '31.59.20.176', port: 6754, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'UK' },
    { ip: '23.95.150.145', port: 6114, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'US' },
    { ip: '198.23.239.134', port: 6540, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'US' },
    { ip: '45.38.107.97', port: 6014, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'UK' },
    { ip: '107.172.163.27', port: 6543, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'US' },
    { ip: '64.137.96.74', port: 6641, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'Spain' },
    { ip: '216.10.27.159', port: 6837, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'US' },
    { ip: '142.111.67.146', port: 5611, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'Japan' },
    { ip: '142.147.128.93', port: 6593, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'US' }
];

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    const proxyIndex = req.query.index; 
    
    if (!targetUrl) {
        return res.status(400).send("<h1>Error 400: URL parameter missing.</h1>");
    }

    let selectedProxy;
    
    // Proxy Selection Logic
    if (proxyIndex && PROXIES[parseInt(proxyIndex)] !== undefined) {
        selectedProxy = PROXIES[parseInt(proxyIndex)];
    } else {
        selectedProxy = PROXIES[randomInt(0, PROXIES.length - 1)];
    }

    const proxyAuth = `${selectedProxy.user}:${selectedProxy.pass}`;
    const proxyUrl = `http://${proxyAuth}@${selectedProxy.ip}:${selectedProxy.port}`;
    const agent = new HttpsProxyAgent(proxyUrl);
    
    console.log(`[PROXY START] Loading ${targetUrl} via ${selectedProxy.country} (${selectedProxy.ip})`);

    try {
        // 1. Proxy ke zariye request bhejna
        const response = await axios({
            method: 'get',
            url: targetUrl,
            httpsAgent: agent, 
            httpAgent: agent,  
            timeout: 25000, 
            responseType: 'text', // ✅ FIXED: 'arraybuffer' se 'text' kiya
            maxRedirects: 5,
            validateStatus: (status) => status >= 200 && status < 400, 
            headers: {
                'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0'
            }
        });

        // 🛑 GA4/IFRAME FIX: Headers remove karna
        let responseHeaders = response.headers;
        delete responseHeaders['content-encoding']; 
        delete responseHeaders['content-security-policy']; 
        delete responseHeaders['x-frame-options'];         
        delete responseHeaders['transfer-encoding'];        
        delete responseHeaders['connection'];  
        
        // ✅ FIX: Content Type ko confirm karna taaki JS/Ads chal sakein
        if (!responseHeaders['content-type'] || !responseHeaders['content-type'].includes('text/html')) {
            responseHeaders['content-type'] = 'text/html; charset=utf-8';
        }

        // Headers set karna aur content wapas bhejna
        res.status(response.status);
        res.set(responseHeaders); 
        res.send(respo
