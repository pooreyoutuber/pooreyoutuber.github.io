// index.js (FINAL VERSION - 4 Tools: Booster, Caption Gen, Caption Edit, Iframe Proxy)

// --- Imports (Node.js Modules) ---
const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const nodeFetch = require('node-fetch'); 
const cors = require('cors'); 
const fs = require('fs'); 
const crypto = require('crypto');
const axios = require('axios');
const path = require('path'); // index.html सर्व करने के लिए

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

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// --- GEOGRAPHIC DATA (Used for simulated_geo custom dimension in Tool 1) ---
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


// 🔥 Client ID Generation (Simple, non-UUID style)
function generateClientId() {
    return Math.random().toString(36).substring(2, 12) + Date.now().toString(36); 
}

// --- TRAFFIC SOURCE LOGIC (Used for Tool 1) ---
const TRAFFIC_SOURCES_GA4 = [ 
    { source: "google", medium: "organic", referrer: "https://www.google.com" },
    { source: "youtube", medium: "social", referrer: "https://www.youtube.com" },
    { source: "facebook", medium: "social", referrer: "https://www.facebook.com" },
    { source: "bing", medium: "organic", referrer: "https://www.bing.com" },
    { source: "reddit", medium: "referral", referrer: "https://www.reddit.com" },
    { source: "(direct)", medium: "(none)", referrer: "" }
];

function getRandomTrafficSource(isProxyTool = false) {
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

// --- GA4 DATA SENDING (for Tool 1) ---
async function sendData(gaId, apiSecret, payload, currentViewId, eventType, proxyAgent = null) {
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
            },
            agent: proxyAgent 
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

// Validation function (for Tool 1)
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
 * Simulates a single view session with full attribution parameters. (Used by Tool 1)
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


// --- VIEW PLAN GENERATION (for Tool 1) ---
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
// TOOL 1: WEBSITE BOOSTER ENDPOINT (API: /boost-mp) - GA4 TOOL 
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
// TOOL 2: AI INSTA CAPTION GENERATOR ENDPOINT - GEMINI TOOL 
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
// TOOL 3: AI INSTA CAPTION EDITOR ENDPOINT - GEMINI TOOL 
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
// TOOL 4: Iframe Proxy Loader (API: /load) - NEW TOOL
// ===================================================================

// --- प्रॉक्सी डेटा और रोटेशन लॉजिक (Tool 4 Specific) ---
// आपकी प्रीमियम प्रॉक्सी सूची (IP:PORT:USERNAME:PASSWORD)
const proxyList = [
    "142.111.48.253:7030:bqctypvz:399xb3kxqv6i",
    "31.59.20.176:6754:bqctypvz:399xb3kxqv6i",
    "23.95.150.145:6114:bqctypvz:399xb3kxqv6i",
    "198.23.239.134:6540:bqctypvz:399xb3kxqv6i",
    "45.38.107.97:6014:bqctypvz:399xb3kxqv6i",
    "107.172.163.27:6543:bqctypvz:399xb3kxqv6i",
    "198.105.121.200:6462:bqctypvz:399xb3kxqv6i",
    "64.137.96.74:6641:bqctypvz:399xb3kxqv6i",
    "216.10.27.159:6837:bqctypvz:399xb3kxqv6i",
    "142.111.67.146:5611:bqctypvz:399xb3kxqv6i"
];

let currentProxyIndex = 0;

function getNextProxy() {
    if (proxyList.length === 0) {
        return null;
    }
    // प्रॉक्सी को रोटेट करें (बारी-बारी से अगली प्रॉक्सी चुनें)
    const proxy = proxyList[currentProxyIndex];
    currentProxyIndex = (currentProxyIndex + 1) % proxyList.length;
    return proxy;
}
// --------------------------------------------------------------------


// 1. फ्रंटेंड सर्व करना (Serving the Frontend)
// जब यूजर मुख्य URL पर जाए, तो index.html भेजें
app.get('/', (req, res) => {
    // index.html फ़ाइल को भेजें
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. प्रॉक्सी एंडपॉइंट (The Proxy Endpoint)
// Iframes इस एंडपॉइंट को कॉल करेंगे: /load?url=...
app.get('/load', async (req, res) => {
    const targetUrl = req.query.url;
    const slotIndex = req.query.slot || 'N/A'; 

    if (!targetUrl) {
        return res.status(400).send("URL query parameter is missing.");
    }
    
    // Tool 4 के अंदर डिफाइन किए गए फ़ंक्शन का उपयोग करें
    const proxyString = getNextProxy(); 
    if (!proxyString) {
        return res.status(503).send("No proxies available.");
    }

    const [host, port, authUsername, authPassword] = proxyString.split(':');

    console.log(`Slot ${slotIndex}: Loading ${targetUrl} using proxy ${host}:${port}`);

    try {
        const response = await axios({
            method: 'get',
            url: targetUrl,
            // प्रॉक्सी सेटिंग्स
            proxy: {
                host: host,
                port: parseInt(port),
                auth: {
                    username: authUsername,
                    password: authPassword
                }
            },
            // Iframe में दिखाने के लिए responseType 'arraybuffer' रखें
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (compatible; ProxyBot/1.0)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'identity', 
                'Connection': 'keep-alive',
            }
        });

        // X-Frame-Options और Content-Security-Policy जैसे हेडर को हटा दें ताकि Iframe में लोड हो सके
        const headers = response.headers;
        delete headers['x-frame-options'];
        delete headers['content-security-policy'];
        
         // प्राप्त हेडर और डेटा वापस भेजें
        res.set(headers);
        res.set('Content-Type', response.headers['content-type'] || 'text/html');
        res.set('X-Frame-Options', 'ALLOWALL'); 
        res.status(response.status).send(response.data);

    } catch (error) {
        console.error(`Slot ${slotIndex}: Proxy Error for ${targetUrl}:`, error.message);
        // Iframe में दिखाने के लिए HTML एरर मैसेज
        const errorHtml = `
            <html>
                <body style="text-align: center; color: red;">
                    <h3 style="margin-top: 50px;">प्रॉक्सी/लोडिंग एरर</h3>
                    <p>URL: ${targetUrl}</p>
                    <p>प्रॉक्सी: ${host}:${port}</p>
                    <p>यह URL लोड होने से मना कर रहा है या प्रॉक्सी विफल है।</p>
                    <p style="font-size: small;">एरर: ${error.message}</p>
                </body>
            </html>
        `;
        // Iframe को 200 ओके भेजें ताकि वह एरर मैसेज दिखा सके
        res.status(200).send(errorHtml);
    }
});


// ===================================================================
// --- SERVER START ---
// ===================================================================
app.listen(PORT, () => {
    console.log(`PooreYouTuber Combined API Server is running on port ${PORT}`);
});
