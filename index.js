// index.js (फाइनल, प्रॉक्सी ऑथेंटिकेशन बायपास के लिए संशोधित)

// --- Imports (Node.js Modules) ---
const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const nodeFetch = require('node-fetch'); 
const cors = require('cors'); 
const fs = require('fs'); 
const crypto = require('crypto'); 
const axios = require('axios'); 
const { HttpsProxyAgent } = require('https-proxy-agent'); // <-- HTTPS फिक्स के लिए

const app = express();
const PORT = process.env.PORT || 10000; 

// --- GEMINI KEY CONFIGURATION ---
let GEMINI_KEY;
try {
    // Attempt to read key from Render Secrets File
    GEMINI_KEY = fs.readFileSync('/etc/secrets/gemini', 'utf8').trim(); 
    console.log("Gemini Key loaded successfully from Secret File.");
} catch (e) {
    // Fallback to Environment Variables
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

// --- MIDDLEWARE & UTILITIES ---
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

// GA4 helper functions (unchanged)
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

// --- GA4 DATA SENDING (User-Agent FIX के साथ) ---
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

// Validation function (unchanged)
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
 * Simulates a single view session (unchanged)
 */
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

    let referrer = "direct"; 
    
    // 1. SESSION START EVENT (logic unchanged)
    let sessionStartEvents = [
        { name: "session_start", params: { session_id: session_id, _ss: 1, debug_mode: true } }
    ];
    // ... referrer logic ...
    const sessionStartPayload = { client_id: cid, user_properties: userProperties, events: sessionStartEvents };

    let allSuccess = true;
    console.log(`\n--- [View ${viewCount}] Starting session (${geo.country}). Session ID: ${session_id} ---`);
    let result = await sendData(gaId, apiSecret, sessionStartPayload, viewCount, 'session_start');
    if (!result.success) allSuccess = false;

    await new Promise(resolve => setTimeout(resolve, randomInt(1000, 3000)));

    // 2. PAGE VIEW EVENT (logic unchanged)
    const pageViewEvents = [
        { name: 'page_view', params: { page_location: url, page_title: searchKeyword ? `Search: ${searchKeyword}` : "Simulated Page View", page_referrer: referrer, session_id: session_id, debug_mode: true, language: "en-US" } }
    ];
    const pageViewPayload = { client_id: cid, user_properties: userProperties, events: pageViewEvents };
    result = await sendData(gaId, apiSecret, pageViewPayload, viewCount, 'page_view');
    if (!result.success) allSuccess = false;

    const firstWait = randomInt(3000, 8000);
    await new Promise(resolve => setTimeout(resolve, firstWait));

    // 3. SCROLL EVENT (logic unchanged)
    const scrollPayload = { client_id: cid, user_properties: userProperties, events: [{ name: "scroll", params: { session_id: session_id, debug_mode: true } }] };
    result = await sendData(gaId, apiSecret, scrollPayload, viewCount, 'scroll');
    if (!result.success) allSuccess = false;

    const secondWait = randomInt(3000, 8000);
    await new Promise(resolve => setTimeout(resolve, secondWait));

    // 4. USER ENGAGEMENT (logic unchanged)
    const engagementTime = firstWait + secondWait + randomInt(5000, 20000); 
    const engagementPayload = {
        client_id: cid,
        user_properties: userProperties, 
        events: [{ name: "user_engagement", params: { engagement_time_msec: engagementTime, session_id: session_id, interaction_type: "click_simulated", debug_mode: true } }]
    };
    result = await sendData(gaId, apiSecret, engagementPayload, viewCount, 'user_engagement');
    if (!result.success) allSuccess = false;

    console.log(`[View ${viewCount}] Completed session. Total Time: ${Math.round(engagementTime/1000)}s. (Success: ${allSuccess ? 'Yes' : 'No'})`);

    return allSuccess;
}

// --- VIEW PLAN GENERATION (unchanged) ---
function generateViewPlan(totalViews, pages) {
    const viewPlan = [];
    const totalPercentage = pages.reduce((sum, page) => sum + (parseFloat(page.percent) || 0), 0);
    
    if (totalPercentage < 99.9 || totalPercentage > 100.1) return [];
    
    pages.forEach(page => {
        const viewsForPage = Math.round(totalViews * (parseFloat(page.percent) / 100));
        for (let i = 0; i < viewsForPage; i++) {
            if (page.url) viewPlan.push(page.url);
        }
    });

    viewPlan.sort(() => Math.random() - 0.5);
    return viewPlan;
}


// ===================================================================
// 1. WEBSITE BOOSTER ENDPOINT (API: /boost-mp) - GA4 TOOL (unchanged)
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
           return res.status(400).json({ status: 'error', message: `❌ Validation Failed: ${validationResult.message}. Please check your GA ID and API Secret.` });
    }

    res.json({ status: 'accepted', message: `✨ Request accepted. Keys validated. Processing started in the background (~2 hours). CHECK DEBUGVIEW NOW!` });

    // Start the heavy, time-consuming simulation in the background
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
// 2. AI INSTA CAPTION GENERATOR ENDPOINT - GEMINI TOOL (unchanged)
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
// 3. AI INSTA CAPTION EDITOR ENDPOINT - GEMINI TOOL (unchanged)
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


// -------------------------------------------------------------------
// 🔥 NEW TOOL: WEBSITE PROXY/BOOSTER (URL LOADER)
// -------------------------------------------------------------------

// प्रॉक्सी लिस्ट को लोड करें (unchanged)
let proxies = [];
try {
    proxies = require('./proxies.json');
    console.log(`[PROXY TOOL] Loaded ${proxies.length} proxies.`);
} catch (e) {
    console.error("[PROXY TOOL] FATAL: proxies.json not found or invalid. Proxy tool will fail.");
}

// ===================================================================
// 4. PROXY LIST ENDPOINT (API: /api/proxies) - URL Proxy Tool (unchanged)
// ===================================================================
app.get('/api/proxies', (req, res) => {
    if (proxies.length === 0) {
        return res.status(500).json({ error: 'Proxy list not loaded on the server.' });
    }
    // 🔥 यहाँ हमने 'user' और 'pass' को हटा दिया है, ताकि फ्रंटएंड केवल IP:Port भेज सके
    const safeProxies = proxies.map((p, index) => ({
        id: index,
        ip: p.ip,
        port: p.port,
        country: p.country,
        fullString: `${p.ip}:${p.port}` // <-- केवल IP:Port भेजा जा रहा है
    }));
    res.json(safeProxies);
});

// ===================================================================
// 5. PROXY LOAD ENDPOINT (API: /api/load) - URL Proxy Tool (FINAL FIX)
// ===================================================================
app.post('/api/load', async (req, res) => {
  const { targetUrl, proxyString } = req.body;
  
  if (!targetUrl || !proxyString) {
    return res.status(400).json({ error: 'Target URL and Proxy are required' });
  }

  // 🔥 केवल IP और Port को पार्स करें (User/Pass को नज़रअंदाज़ करें)
  const [ip, port] = proxyString.split(':');
  
  console.log(`[PROXY LOAD] Attempting to load ${targetUrl} via public proxy: ${ip}:${port}`);
  
  // 🔥 कोई ऑथेंटिकेशन नहीं, केवल IP:Port
  const proxyUrl = `http://${ip}:${port}`;
  
  const agent = new HttpsProxyAgent(proxyUrl);

  try {
    const response = await axios.get(targetUrl, {
      httpsAgent: agent, // HTTPS
      httpAgent: agent,  // HTTP

      responseType: 'text', 
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36', // Update User-Agent
        'Accept-Encoding': 'identity', 
        'Host': new URL(targetUrl).host,
        'Connection': 'keep-alive' 
      },
      timeout: 15000, // टाइमआउट 15 सेकंड
      maxRedirects: 5
    });

    const usedProxy = proxies.find(p => p.ip === ip) || { country: 'Unknown' };
    console.log(`[PROXY LOAD] SUCCESS: ${targetUrl} loaded via ${usedProxy.country}`);

    res.json({
      htmlContent: response.data,
      usedProxy: {
        ip,
        port,
        country: usedProxy.country,
        fullString: proxyString
      }
    });

  } catch (error) {
    console.error(`[PROXY LOAD] Public Proxy Fetch Error: ${error.message}. Target URL: ${targetUrl}`);
    
    // विशिष्ट Axios त्रुटियों को कैप्चर करें
    let detailMessage = error.message;
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.message.includes('socket hang up')) {
        detailMessage = 'Proxy connection refused, reset, or hung up. Proxy is likely offline or blocking the request.';
    } else if (error.code === 'ETIMEDOUT') {
        detailMessage = 'Proxy connection timed out (15 seconds). Proxy is too slow or non-responsive.';
    } else if (error.response && error.response.status === 407) {
        // अब 407 (Authentication Required) का मतलब है कि यह प्रॉक्सी सार्वजनिक नहीं है!
        detailMessage = 'Proxy is not public and requires credentials. Please use a different proxy.';
    } else if (error.response && error.response.status === 403) {
        detailMessage = 'Target site blocked proxy (403 Forbidden).';
    }

    res.status(500).json({ 
      error: 'Proxy Load Failed. (Public Check)', 
      details: detailMessage 
    });
  }
});

// ===================================================================
// --- SERVER START (अंतिम और आवश्यक ब्लॉक) ---
// ===================================================================
app.listen(PORT, () => {
    console.log(`PooreYouTuber Combined API Server is running on port ${PORT}`);
});
