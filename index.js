const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const nodeFetch = require('node-fetch'); 
const cors = require('cors'); 
const fs = require('fs'); 
// 🔑 Crypto मॉड्यूल को शामिल करें, जो generateClientId के लिए ज़रूरी है
const crypto = require('crypto'); 

const app = express();
const PORT = process.env.PORT || 10000; 

// --- GEMINI KEY CONFIGURATION ---
let GEMINI_KEY;
try {
    // यह तरीका Cloud Environment (जैसे Kubernetes Secrets) के लिए है
    GEMINI_KEY = fs.readFileSync('/etc/secrets/gemini', 'utf8').trim(); 
    console.log("Gemini Key loaded successfully from Secret File.");
} catch (e) {
    // Fallback: Environment Variables
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
    // Mock AI object if key is missing to prevent crash
    ai = { models: { generateContent: () => Promise.reject(new Error("AI Key Missing")) } };
}

// --- MIDDLEWARE & UTILITIES ---
// 🔒 CORS को सही ढंग से सेट करें
app.use(cors({
    // यदि आप लोकलहोस्ट पर परीक्षण कर रहे हैं, तो 'origin' को अपने लोकलहोस्ट URL में बदलें
    origin: 'https://pooreyoutuber.github.io', 
    methods: ['GET', 'POST'],
    credentials: true
}));
// 💾 बॉडी पार्सिंग (Payload size limit को 5MB तक बढ़ाया गया)
app.use(express.json({ limit: '5mb' }));

app.get('/', (req, res) => {
    res.status(200).send('PooreYouTuber Combined API is running!'); // Health Check
});

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const geoLocations = [
    { country: "United States", region: "California", timezone: "America/Los_Angeles" },
    { country: "India", region: "Maharashtra", timezone: "Asia/Kolkata" },
    { country: "United Kingdom", region: "London", timezone: "Europe/London" },
    { country: "Germany", region: "Bavaria", timezone: "Europe/Berlin" },
    { country: "Japan", region: "Tokyo", timezone: "Asia/Tokyo" },
];
function getRandomGeo() {
    return geoLocations[randomInt(0, geoLocations.length - 1)];
}

// Function to generate a unique Client ID for GA4 simulation (must be a UUID)
function generateClientId() {
    // 💡 सुनिश्चित करें कि आपने ऊपर 'const crypto = require('crypto');' जोड़ा है
    return crypto.randomUUID(); 
}

/**
 * Calculates the optimal random delay to ensure all views complete within 1 hour (3600 seconds).
 * @param {number} totalViews 
 * @returns {number} Delay in milliseconds.
 */
const getOptimalDelay = (totalViews) => {
    // Target 1 hour (3600 seconds) for all views to complete.
    const targetDurationMs = 3600000; 
    const avgDelayMs = totalViews > 0 ? targetDurationMs / totalViews : 0;
    
    // Set min/max bounds for natural variance
    const minDelay = Math.max(1000, avgDelayMs * 0.7); // Minimum 1 second delay
    const maxDelay = avgDelayMs * 1.3;
    
    // यदि totalViews बहुत कम है (जैसे 10), तो अधिकतम 10 मिनट प्रति व्यू तक कैप करें
    const finalMaxDelay = Math.min(maxDelay, 600000); 

    return randomInt(minDelay, finalMaxDelay);
};


// --- GA4 DATA SENDING (STABLE) ---
async function sendData(gaId, apiSecret, payload, currentViewId, eventType) {
    const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;

    // Payload में 'timestamp_micros' जोड़ें ताकि यह सुनिश्चित हो सके कि Event Order सही है 
    payload.timestamp_micros = String(Date.now() * 1000); 

    try {
        const response = await nodeFetch(gaEndpoint, { 
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.status === 204) { 
            // SUCCESS: Google accepted the data
            console.log(`[View ${currentViewId}] SUCCESS ✅ | Sent: ${eventType}`);
            return { success: true };
        } else {
            const errorText = await response.text(); 
            // FAILURE: Google returned an error (e.g., bad key or ID)
            console.error(`[View ${currentViewId}] FAILURE ❌ | Status: ${response.status}. Event: ${eventType}. GA4 Error: ${errorText.substring(0, 100)}...`);
            return { success: false };
        }
    } catch (error) {
        console.error(`[View ${currentViewId}] CRITICAL ERROR ⚠️ | Event: ${eventType}. Connection Failed: ${error.message}`);
        return { success: false };
    }
}

/**
 * Simulates a single view session with search, scroll, and engagement events.
 */
async function simulateView(gaId, apiSecret, url, searchKeyword, viewCount) {
    const cid = generateClientId(); // Unique Client ID for the session
    const geo = getRandomGeo(); // Random geographical location
    
    // User Properties जो हर Event के साथ जाते हैं
    const userProperties = {
        country: { value: geo.country },
        region: { value: geo.region },
        // 👍 टाइमज़ोन जोड़ें, जो GA4 के लिए एक अच्छा संकेत है
        user_timezone: { value: geo.timezone } 
    };

    // 1. SESSION START / PAGE VIEW EVENT
    let referrer = "direct"; 
    let events = [
        // CRITICAL FIX: Adding debug_mode: true to force events into DebugView
        { name: "session_start", params: { debug_mode: true } },
        { name: "page_view", params: { page_location: url } }
    ];
    
    if (searchKeyword) {
        // Simulate organic search traffic from Google
        referrer = `https://www.google.com/search?q=${encodeURIComponent(searchKeyword)}`;
        events[1].params.page_referrer = referrer;
        events[1].params.page_title = searchKeyword; // Set title to keyword for search context
    } else {
         // Add a standard referrer if not search (e.g., from a blog or social)
         if (Math.random() < 0.3) { 
            referrer = Math.random() < 0.5 ? "https://t.co/random" : "https://exampleblog.com/post-link";
            events[1].params.page_referrer = referrer;
         }
    }


    const pageViewPayload = {
        client_id: cid,
        user_properties: userProperties,
        events: events
    };

    let allSuccess = true;
    
    console.log(`\n--- [View ${viewCount}] Starting session (${geo.country}) on ${url}. ---`);

    // Send the first payload (session_start and page_view)
    let result = await sendData(gaId, apiSecret, pageViewPayload, viewCount, 'session_start/page_view');
    if (!result.success) allSuccess = false;

    // Simulate 3-8 seconds of user reading time on the page
    const firstWait = randomInt(3000, 8000);
    await new Promise(resolve => setTimeout(resolve, firstWait));
    // console.log(`[View ${viewCount}] Waited ${firstWait/1000}s.`);

    // 2. SCROLL EVENT
    const scrollPayload = {
        client_id: cid,
        user_properties: userProperties, // हर Event में user_properties भेजना अच्छा अभ्यास है
        events: [{ name: "scroll" }]
    };
    result = await sendData(gaId, apiSecret, scrollPayload, viewCount, 'scroll');
    if (!result.success) allSuccess = false;

    // Simulate another 3-8 seconds of user interaction
    const secondWait = randomInt(3000, 8000);
    await new Promise(resolve => setTimeout(resolve, secondWait));
    // console.log(`[View ${viewCount}] Waited ${secondWait/1000}s.`);


    // 3. USER ENGAGEMENT (Simulates a click and a session duration > 10s)
    const engagementTime = firstWait + secondWait + randomInt(5000, 20000); // सुनिश्चित करें कि 15s से अधिक हो
    
    const engagementPayload = {
        client_id: cid,
        user_properties: userProperties, // हर Event में user_properties भेजना अच्छा अभ्यास है
        events: [
            { 
                name: "user_engagement", 
                params: { 
                    engagement_time_msec: engagementTime, 
                    // 💡 interaction_type एक अच्छा कस्टम पैरामीटर है
                    interaction_type: "click_simulated" 
                } 
            }
        ]
    };
    result = await sendData(gaId, apiSecret, engagementPayload, viewCount, 'user_engagement');
    if (!result.success) allSuccess = false;

    console.log(`[View ${viewCount}] Completed session. Total Time: ${Math.round(engagementTime/1000)}s. (Success: ${allSuccess ? 'Yes' : 'No'})`);

    return allSuccess;
}

// --- VIEW PLAN GENERATION (Same) ---
function generateViewPlan(totalViews, pages) {
    const viewPlan = [];
    const totalPercentage = pages.reduce((sum, page) => sum + (parseFloat(page.percent) || 0), 0);
    
    // 💡 Percentages के लिए थोड़ी सी टॉलरेंस (Tolerance) रखें (99.9% से 100.1%)
    if (totalPercentage < 99.9 || totalPercentage > 100.1) {
        console.error(`Distribution Failed: Total percentage is ${totalPercentage.toFixed(1)}%. Should be 100%.`);
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
// 1. WEBSITE BOOSTER ENDPOINT (API: /boost-mp) - NON-BLOCKING
// ===================================================================
app.post('/boost-mp', async (req, res) => {
    const { ga_id, api_key, views, pages, search_keyword } = req.body; 
    const totalViewsRequested = parseInt(views);

    if (!ga_id || !api_key || !totalViewsRequested || totalViewsRequested < 1 || totalViewsRequested > 500 || !Array.isArray(pages) || pages.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Missing GA keys, Views (1-500), or Page data.' });
    }
    
    const viewPlan = generateViewPlan(totalViewsRequested, pages.filter(p => p.percent > 0)); 
    if (viewPlan.length === 0) {
         return res.status(400).json({ status: 'error', message: 'View distribution failed. Ensure Total % is 100 and URLs are provided.' });
    }

    // 📣 ACKNOWLEDGEMENT तुरंत भेजें (यही कारण है कि क्लाइंट "reloading" दिखाना बंद कर देगा)
    res.json({ 
        status: 'accepted', 
        message: `Request for ${viewPlan.length} high-engagement views accepted. Processing started in the background. Estimated completion time: ~1 hour. CHECK DEBUGVIEW NOW!`
    });

    // 🖥️ Start the heavy, time-consuming simulation in the background (NON-BLOCKING)
    (async () => {
        const totalViews = viewPlan.length;
        console.log(`\n=================================================`);
        console.log(`[BOOSTER START] Starting real simulation for ${totalViews} views.`);
        console.log(`=================================================`);


        for (let i = 0; i < totalViews; i++) {
            const url = viewPlan[i];
            const currentView = i + 1;

            // 1. Run the engagement simulation
            await simulateView(ga_id, api_key, url, search_keyword, currentView);

            // 2. Wait for the optimal, calculated delay before starting the next view
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
// 2. AI INSTA CAPTION GENERATOR ENDPOINT (STABLE)
// ===================================================================
app.post('/api/caption-generate', async (req, res) => { 
    
    if (!GEMINI_KEY) {
        return res.status(500).json({ error: 'Server configuration error: Gemini API Key is missing.' });
    }
    
    const { description, style } = req.body;

    if (!description) {
        return res.status(400).json({ error: 'Reel topic (description) is required.' });
    }
    
    // 📝 प्रॉम्प्ट में एक छोटा सा सुधार - इसे और स्पष्ट बनाना
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
// 3. AI INSTA CAPTION EDITOR ENDPOINT (STABLE)
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
// START THE SERVER
// ===================================================================
app.listen(PORT, () => {
    console.log(`Combined API Server listening on port ${PORT}.`);
});
                
