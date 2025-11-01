// index.js (यह आपका नया, मर्ज किया हुआ और फिक्स किया हुआ कोड है)

const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const nodeFetch = require('node-fetch'); 
const cors = require('cors'); 
const fs = require('fs'); 
const crypto = require('crypto'); 
const axios = require('axios');          // ✅ NEW: Proxy Fetching के लिए
const { HttpsProxyAgent } = require('https-proxy-agent'); // ✅ NEW: Proxy Agent के लिए

const app = express();
const PORT = process.env.PORT || 10000; 

// --- GEMINI KEY CONFIGURATION ---
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
const geoLocations = [
    { country: "United States", region: "California", timezone: "America/Los_Angeles" },
    { country: "India", region: "Maharashtra", timezone: "Asia/Kolkata" },
    { country: "Japan", region: "Tokyo", timezone: "Asia/Tokyo" },
    { country: "Australia", region: "New South Wales", timezone: "Australia/Sydney" },
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

// --- GA4 DATA SENDING ---
async function sendData(gaId, apiSecret, payload, currentViewId, eventType) {
    const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;

    payload.timestamp_micros = String(Date.now() * 1000); 

    try {
        const response = await nodeFetch(gaEndpoint, { 
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
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

// Validation function before starting the slow loop
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
 * Simulates a single view session with search, scroll, and engagement events.
 */
async function simulateView(gaId, apiSecret, url, searchKeyword, viewCount) {
    const cid = generateClientId(); 
    const geo = getRandomGeo(); 
    const session_id = Date.now(); 
    
    const userProperties = {
        country: { value: geo.country },
        region: { value: geo.region },
        user_timezone: { value: geo.timezone } 
    };

    let referrer = "direct"; 
    
    // 1. SESSION START EVENT
    let sessionStartEvents = [
        { 
            name: "session_start", 
            params: { 
                session_id: session_id, 
                _ss: 1, 
                debug_mode: true 
            } 
        }
    ];
    
    if (searchKeyword) {
        referrer = `https://www.google.com/search?q=${encodeURIComponent(searchKeyword)}`;
    } else if (Math.random() < 0.3) { 
        referrer = Math.random() < 0.5 ? "https://t.co/random" : "https://exampleblog.com/post-link";
    }

    const sessionStartPayload = {
        client_id: cid,
        user_properties: userProperties,
        events: sessionStartEvents
    };

    let allSuccess = true;
    
    console.log(`\n--- [View ${viewCount}] Starting session (${geo.country}). Session ID: ${session_id} ---`);

    // Send SESSION START
    let result = await sendData(gaId, apiSecret, sessionStartPayload, viewCount, 'session_start');
    if (!result.success) allSuccess = false;

    await new Promise(resolve => setTimeout(resolve, randomInt(1000, 3000)));


    // 2. PAGE VIEW EVENT
    const pageViewEvents = [
        { 
            name: 'page_view', 
            params: { 
                page_location: url, 
                page_title: searchKeyword ? `Search: ${searchKeyword}` : "Simulated Page View",
                page_referrer: referrer, 
                session_id: session_id, 
                debug_mode: true,
                language: "en-US" 
            } 
        }
    ];

    const pageViewPayload = {
        client_id: cid,
        user_properties: userProperties,
        events: pageViewEvents
    };

    // Send PAGE VIEW
    result = await sendData(gaId, apiSecret, pageViewPayload, viewCount, 'page_view');
    if (!result.success) allSuccess = false;

    const firstWait = randomInt(3000, 8000);
    await new Promise(resolve => setTimeout(resolve, firstWait));

    // 3. SCROLL EVENT
    const scrollPayload = {
        client_id: cid,
        user_properties: userProperties, 
        events: [{ name: "scroll", params: { session_id: session_id, debug_mode: true } }]
    };
    result = await sendData(gaId, apiSecret, scrollPayload, viewCount, 'scroll');
    if (!result.success) allSuccess = false;

    const secondWait = randomInt(3000, 8000);
    await new Promise(resolve => setTimeout(resolve, secondWait));

    // 4. USER ENGAGEMENT
    const engagementTime = firstWait + secondWait + randomInt(5000, 20000); 
    
    const engagementPayload = {
        client_id: cid,
        user_properties: userProperties, 
        events: [
            { 
                name: "user_engagement", 
                params: { 
                    engagement_time_msec: engagementTime, 
                    session_id: session_id,
                    interaction_type: "click_simulated",
                    debug_mode: true 
                } 
            }
        ]
    };
    result = await sendData(gaId, apiSecret, engagementPayload, viewCount, 'user_engagement');
    if (!result.success) allSuccess = false;

    console.log(`[View ${viewCount}] Completed session. Total Time: ${Math.round(engagementTime/1000)}s. (Success: ${allSuccess ? 'Yes' : 'No'})`);

    return allSuccess;
}


// --- VIEW PLAN GENERATION ---
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

    // 🔑 STEP 1: VALIDATE KEYS 
    const validationResult = await validateKeys(ga_id, api_key, clientIdForValidation);
    
    if (!validationResult.valid) {
         return res.status(400).json({ 
            status: 'error', 
            message: `❌ Validation Failed: ${validationResult.message}. Please check your GA ID and API Secret.` 
        });
    }

    // STEP 2: ACKNOWLEDGEMENT
    res.json({ 
        status: 'accepted', 
        message: `✨ Request accepted. Keys validated. Processing started in the background (~2 hours). CHECK DEBUGVIEW NOW!`
    });

    // STEP 3: Start the heavy, time-consuming simulation in the background
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
// 4. WEBSITE BOOSTER PROXY TOOL ENDPOINT (NEW: /proxy) - iFrame FIX
// ===================================================================
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    const proxyUri = req.query.proxy;

    if (!targetUrl || !proxyUri) {
        return res.status(400).send("URL और Proxy पैरामीटर आवश्यक हैं।");
    }

    try {
        // प्रॉक्सी एजेंट सेट करें
        const agent = new HttpsProxyAgent(proxyUri);
        
        // प्रॉक्सी के माध्यम से लक्ष्य URL को फ़ेच करें
        const response = await axios.get(targetUrl, {
            httpsAgent: agent,
            httpAgent: agent, // HTTP और HTTPS दोनों के लिए
            responseType: 'text', // HTML/Text के रूप में प्राप्त करें
            timeout: 15000 // 15 सेकंड का टाइमआउट
        });

        
        // 🔥 CRITICAL FIX: iFrame के अंदर नेविगेशन सक्षम करने के लिए
        
        // 1. ब्राउज़र को सुरक्षा हेडर्स भेजने से रोकें
        // (Render/Express HTTP HEADERS को अक्षम/हटा दें)
        delete response.headers['x-frame-options'];
        delete response.headers['content-security-policy'];
        delete response.headers['transfer-encoding']; 
        
        // 2. Content Type सेट करें
        if (response.headers['content-type']) {
            res.setHeader('Content-Type', response.headers['content-type']);
        }
        
        // 3. यदि सामग्री HTML है, तो एक BASE tag इंजेक्ट करें
        // यह आंतरिक लिंक (relative links) को ठीक से काम करने में मदद करता है।
        let data = response.data;
        if (typeof data === 'string' && data.toLowerCase().includes('<html')) {
            // BASE tag जोड़ें ताकि iFrame में सभी relative links सही URL पर जाएँ
            data = data.replace(/<\s*head/i, `<head><base href="${targetUrl}">`);
        }
        
        // प्राप्त कंटेंट क्लाइंट (आपके iframe) को भेजें
        res.send(data);

    } catch (error) {
        // प्रॉक्सी या फ़ेच में कोई त्रुटि होने पर
        console.error('Proxy Fetch Error:', error.message);
        const errorMessage = `Proxy Error (502): The proxy or target URL failed to respond. Details: ${error.message}`;
        res.status(502).send(errorMessage);
    }
});


// ===================================================================
// START THE SERVER
// ===================================================================
app.listen(PORT, () => {
    console.log(`Combined API Server listening on port ${PORT}.`);
});
