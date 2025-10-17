// index.js (FINAL CODE - Latest Nodmaven Proxies + Advanced GA4 Fix)

const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const fetch = require('node-fetch'); 
const cors = require('cors'); 
const fs = require('fs'); 
// 🚨 PROXY AGENT REQUIRE करें: Nodmaven Proxies के लिए SocksProxyAgent का उपयोग
const { SocksProxyAgent } = require('socks-proxy-agent'); 

const app = express();
const PORT = process.env.PORT || 10000; 

// --- 1. PROXY CONFIGURATION: CONSOLIDATED NODEMAVEN IPs (From User Screenshots) ---
// Proxies are anonymous/free, so no credentials are required.
const PROXY_HOSTS = [
    // United States (SOCKS5/4)
    '98.186.47.132:4145',   
    '98.170.57.249:4145',   
    '98.190.239.43:4145',   
    '98.175.31.195:4145', 
    '98.182.171.161:4145',
    '98.181.137.80:4145',
    '98.176.72.21:10919',
    '98.167.92.115:4145',
    '98.182.152.126:4145',
    '98.182.152.126:4145', // Duplicates for more rotation capacity
    // Germany (SOCKS5)
    '89.58.45.94:36742',    
    '89.58.45.94:42441',    
    '89.58.45.94:36935',    
    '89.58.45.94:46486',
    '89.58.45.94:38121',
    '89.58.45.94:43663',
    '89.58.45.94:46022',
    // Indonesia (HTTPS/HTTP - Formatted as Socks URL for consistency)
    '8.215.3.250:6379',
    '8.215.3.250:8123',
    '8.215.3.250:4037',
    '8.215.3.250:9080',
    // United Kingdom (SOCKS4/5)
    '89.46.249.142:31415',  
    '89.46.249.170:12345',
    // Singapore (SOCKS4/5)
    '94.74.80.88:4145',     
    '8.219.160.188:1011',
    // Hong Kong (HTTPS)
    '94.74.96.240:3129',
    // France
    '94.23.222.122:14822',
    '152.67.65.250:8989', // Additional IP
    '8.219.167.110:8989', // Additional IP
];

// --- PROXY AGENT INITIALIZATION ---
const PROXY_AGENTS = PROXY_HOSTS.map(host => {
    // SOCKS5 प्रॉक्सी के लिए SocksProxyAgent का उपयोग
    const url = `socks5://${host}`; 
    return { host: host, agent: new SocksProxyAgent(url) };
});

function getRandomAgent() {
    if (PROXY_AGENTS.length === 0) return { host: 'Direct', agent: null };
    return PROXY_AGENTS[Math.floor(Math.random() * PROXY_AGENTS.length)];
}


// --- GEMINI KEY CONFIGURATION (Unchanged) ---
let GEMINI_KEY;
try {
    GEMINI_KEY = fs.readFileSync('/etc/secrets/gemini', 'utf8').trim(); 
} catch (e) {
    GEMINI_KEY = process.env.GEMINI_API_KEY; 
}

let ai;
if (GEMINI_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
} else {
    ai = { models: { generateContent: () => Promise.reject(new Error("AI Key Missing")) } };
}

// --- MIDDLEWARE & UTILITIES (Unchanged) ---
app.use(cors({ origin: 'https://pooreyoutuber.github.io', methods: ['GET', 'POST'], credentials: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).send('PooreYouTuber Combined API is running!');
});

const MIN_DELAY = 3000; 
const MAX_DELAY = 12000; 

// Country diversity list (Geo Fix)
const geoLocations = [
    { country: "United States", region: "California" },
    { country: "India", region: "Maharashtra" },
    { country: "Germany", region: "Bavaria" },
    { country: "Japan", region: "Tokyo" },
    { country: "United Kingdom", region: "England" },
    { country: "Brazil", region: "Sao Paulo" },
    { country: "Australia", region: "New South Wales" },
    { country: "Canada", region: "Ontario" },
    { country: "France", region: "Ile-de-France" },
    { country: "Singapore", region: "Central Region" },
];

// Realistic Traffic Source Referrers (Search/Social/Direct)
const REFERRERS = [
    'https://www.google.com/search?q=college+website+projects', 
    'https://t.co/', // Twitter/X
    'https://facebook.com/', 
    'https://linkedin.com/feed/', 
    'https://mail.google.com/', 
    'https://duckduckgo.com/?q=latest+projects',
    'https://pooreyoutuber.github.io' // Direct
];

function getRandomDelay() {
    return Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY; 
}
function getRandomGeo() {
    return geoLocations[Math.floor(Math.random() * geoLocations.length)];
}
function getRandomReferrer() {
    return REFERRERS[Math.floor(Math.random() * REFERRERS.length)];
}

// --- sendData (Proxy enabled and ready) ---
async function sendData(gaId, apiSecret, payload, currentViewId, eventType) {
    const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;
    
    const { host: proxyHost, agent: proxyAgent } = getRandomAgent();

    try {
        const fetchOptions = {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
            agent: proxyAgent 
        };
        
        const response = await fetch(gaEndpoint, fetchOptions);

        if (response.status === 204) { 
            console.log(`[View ${currentViewId}] SUCCESS ✅ | Event: ${eventType} | Proxy: ${proxyHost}`);
            return { success: true };
        } else {
            const errorText = await response.text(); 
            // 407 (Proxy Auth Required) या 403 (Forbidden) error तब आती है जब प्रॉक्सी काम नहीं करता
            console.error(`[View ${currentViewId}] FAILURE ❌ | Status: ${response.status}. GA4 Error: ${errorText.substring(0, 50)} | Proxy: ${proxyHost}`);
            return { success: false };
        }
    } catch (error) {
        // ETIMEDOUT error तब होगा जब प्रॉक्सी कनेक्ट नहीं हो रहा है (Dead Proxy)
        console.error(`[View ${currentViewId}] CRITICAL ERROR ⚠️ | Connection Failed: ${error.message} | Proxy: ${proxyHost}`);
        return { success: false };
    }
}

function generateViewPlan(totalViews, pages) {
    const viewPlan = [];
    const totalPercentage = pages.reduce((sum, page) => sum + (page.percent || 0), 0);
    
    if (totalPercentage < 99.9 || totalPercentage > 100.1) {
        console.error(`Distribution Failed: Total percentage is ${totalPercentage}%. Should be 100%.`);
        return [];
    }
    
    pages.forEach(page => {
        const viewsForPage = Math.round(totalViews * (page.percent / 100));
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
// 1. WEBSITE BOOSTER ENDPOINT (API: /boost-mp)
// ===================================================================
app.post('/boost-mp', async (req, res) => {
    const { ga_id, api_key, views, pages } = req.body; 

    if (!ga_id || !api_key || !views || views < 1 || views > 500 || !Array.isArray(pages) || pages.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Missing GA keys, Views (1-500), or Page data.' });
    }
    
    const viewPlan = generateViewPlan(parseInt(views), pages.filter(p => p.percent > 0)); 
    if (viewPlan.length === 0) {
         return res.status(400).json({ status: 'error', message: 'View distribution failed. Ensure Total % is 100 and URLs are provided.' });
    }

    res.json({ status: 'accepted', message: `Request for ${viewPlan.length} views accepted. Processing started in the background.` });

    // Start views generation asynchronously
    (async () => {
        const totalViews = viewPlan.length;

        const viewPromises = viewPlan.map((targetUrl, i) => {
            return (async () => {
                const CLIENT_ID = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
                const SESSION_ID = Date.now(); 
                const geo = getRandomGeo();
                const engagementTime = 30000 + Math.floor(Math.random() * 90000); 
                const referrer = getRandomReferrer(); 

                // 🚨 Geo-location Fix: Separate 'country' and 'region' properties
                const commonUserProperties = { 
                    country: { value: geo.country }, 
                    region: { value: geo.region }
                };
                
                await new Promise(resolve => setTimeout(resolve, Math.random() * 5000)); 

                // 1. session_start (Starts the session)
                await sendData(ga_id, api_key, { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'session_start', params: { session_id: SESSION_ID, _ss: 1 } }] }, i + 1, 'session_start');

                // 2. page_view (Source/Medium Fix: page_referrer)
                const pageViewPayload = {
                    client_id: CLIENT_ID,
                    user_properties: commonUserProperties, 
                    events: [{ name: 'page_view', params: { 
                        page_location: targetUrl, 
                        page_title: `PROJECT_PAGE_${i + 1}`, 
                        session_id: SESSION_ID, 
                        engagement_time_msec: engagementTime,
                        page_referrer: referrer // 🚨 Search/Social/Click Source Fix
                    } }]
                };
                const pageViewResult = await sendData(ga_id, api_key, pageViewPayload, i + 1, 'page_view');

                // 3. user_engagement (Scrolling/Reading time Fix)
                await sendData(ga_id, api_key, { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'user_engagement', params: { session_id: SESSION_ID, engagement_time_msec: engagementTime } }] }, i + 1, 'user_engagement');

                await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
                
                return pageViewResult.success;
            })();
        });

        Promise.all(viewPromises).then(results => {
            const finalSuccessCount = results.filter(r => r).length;
            console.log(`[BOOSTER FINISH] Total success: ${finalSuccessCount}/${totalViews}`);
        }).catch(err => {
            console.error(`[BOOSTER CRITICAL] An error occurred during view processing: ${err.message}`);
        });

    })();
});


// ===================================================================
// 2. AI INSTA CAPTION GENERATOR ENDPOINT (API: /api/caption-generate)
// ===================================================================
app.post('/api/caption-generate', async (req, res) => { 
    
    if (!GEMINI_KEY) {
        return res.status(500).json({ error: 'Server configuration error: Gemini API Key is missing.' });
    }
    
    const { reelTitle, style } = req.body;

    if (!reelTitle) {
        return res.status(400).json({ error: 'Reel topic (reelTitle) is required.' });
    }
    
    // Updated Prompt for Viral, Export, and View Increase Tags
    const prompt = `Generate 10 unique, highly trending, and viral Instagram Reels captions in a mix of English and Hindi for the reel topic: "${reelTitle}". The style should be: "${style || 'Catchy and Funny'}". 

--- CRITICAL INSTRUCTION ---
For each caption, provide exactly 5 trending, high-reach, and relevant hashtags. Include **latest viral Instagram marketing terms** like **#viralreel, #exportviews, #viewincrease, #reelsmarketing** only if they are relevant to the topic. Focus mainly on niche-specific and fast-trending tags to maximize virality. The final output MUST be a JSON array of objects, where each object has a single key called 'caption'.`;


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
// 3. AI INSTA CAPTION EDITOR ENDPOINT (API: /api/caption-edit)
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
Requested Change: "${requestedChange}"

--- CRITICAL INSTRUCTION ---
The final output MUST be a single JSON object with a key called 'editedCaption'. The caption should be highly engaging for Instagram Reels. If the original caption included hashtags, ensure the edited caption has 5 relevant and trending hashtags, separated from the text by a new line.`;
    
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
