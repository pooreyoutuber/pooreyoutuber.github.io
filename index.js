import express from 'express';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto'; 
import axios from 'axios'; // For HTTP requests (Needs package.json update)
import { HttpsProxyAgent } from 'https-proxy-agent'; // For proxy support (Needs package.json update)

// --- Configuration ---
const app = express();
const PORT = process.env.PORT || 3000;
const GA4_API_URL = 'https://www.google-analytics.com/mp/collect';

// --- Proxy and User-Agent Data ---

// 🛑 100% CORRECTED PROXY LIST (with http:// prefix for HttpsProxyAgent) 🛑
// If you use proxies with authentication (user:pass), please update the format: 'http://user:pass@ip:port'
let ALL_GLOBAL_PROXIES = [
    'http://45.3.49.4:3129', 'http://209.50.164.165:3129', 'http://216.26.232.247:3129', 'http://65.111.3.145:3129',
    'http://209.50.168.254:3129', 'http://104.207.63.195:3129', 'http://65.111.2.236:3129', 'http://104.207.61.3:3129',
    'http://104.207.60.58:3129', 'http://209.50.166.110:3129', 'http://209.50.170.93:3129', 'http://216.26.254.100:3129',
    'http://209.50.164.168:3129', 'http://104.207.57.162:3129', 'http://65.111.15.170:3129', 'http://209.50.170.126:3129',
    'http://209.50.188.66:3129', 'http://65.111.6.214:3129', 'http://104.207.44.84:3129', 'http://104.207.40.98:3129',
    'http://65.111.24.172:3129', 'http://216.26.254.110:3129', 'http://45.3.42.225:3129', 'http://45.3.55.246:3129',
    'http://65.111.15.15:3129', 'http://65.111.29.210:3129', 'http://216.26.229.214:3129', 'http://45.3.32.13:3129',
    'http://45.3.53.142:3129', 'http://154.213.160.98:3129', 'http://65.111.1.33:3129', 'http://216.26.237.142:3129',
    'http://104.207.36.219:3129', 'http://45.3.39.66:3129', 'http://45.3.44.176:3129', 'http://104.207.60.243:3129',
    'http://104.207.52.73:3129', 'http://65.111.5.122:3129', 'http://216.26.253.178:3129', 'http://104.207.34.14:3129',
    'http://154.213.166.61:3129', 'http://209.50.171.188:3129', 'http://65.111.7.44:3129', 'http://65.111.4.124:3129',
    'http://216.26.228.120:3129', 'http://216.26.232.191:3129', 'http://65.111.30.12:3129', 'http://45.3.45.87:3129',
    'http://104.207.40.63:3129', 'http://104.207.37.61:3129', 'http://216.26.253.33:3129', 'http://104.207.36.147:3129',
    'http://45.3.32.221:3129', 'http://154.213.161.220:3129', 'http://65.111.8.148:3129', 'http://104.207.43.160:3129',
    'http://65.111.8.236:3129', 'http://154.213.164.107:3129', 'http://209.50.191.236:3129', 'http://65.111.7.120:3129',
    'http://209.50.179.65:3129', 'http://65.111.13.25:3129', 'http://104.207.47.183:3129', 'http://65.111.26.13:3129',
    'http://216.26.250.229:3129', 'http://104.207.62.125:3129', 'http://209.50.190.245:3129', 'http://216.26.233.180:3129',
    'http://209.50.172.51:3129', 'http://45.3.51.2:3129', 'http://209.50.166.230:3129', 'http://104.207.45.3:3129',
    'http://104.207.42.200:3129', 'http://45.3.41.231:3129', 'http://104.207.49.44:3129', 'http://45.3.51.234:3129',
    'http://45.3.36.2:3129', 'http://209.50.186.85:3129', 'http://104.207.34.99:3129', 'http://209.50.163.251:3129',
    'http://216.26.231.232:3129', 'http://209.50.178.133:3129', 'http://45.3.45.19:3129', 'http://65.111.12.11:3129',
    'http://65.111.12.100:3129', 'http://216.26.242.199:3129', 'http://65.111.31.65:3129', 'http://154.213.163.95:3129',
    'http://45.3.50.117:3129', 'http://65.111.22.188:3129', 'http://104.207.37.202:3129', 'http://154.213.160.201:3129',
    'http://209.50.160.27:3129', 'http://65.111.28.111:3129', 'http://104.207.33.105:3129', 'http://216.26.241.226:3129',
    'http://104.207.46.76:3129', 'http://216.26.240.92:3129', 'http://216.26.251.165:3129', 'http://45.3.47.110:3129'
];

const GLOBAL_COUNTRIES = ["US", "IN", "CA", "GB", "AU", "DE", "FR", "JP", "BR", "SG", "AE", "ES", "IT", "MX", "NL"];

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0'
];

// --- Middleware and API Key Loading ---
app.use(express.json());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

let ai;
let geminiApiKey;

function loadApiKey() {
    const secretPath = '/etc/secrets/gemini'; 
    try {
        if (fs.existsSync(secretPath)) {
            geminiApiKey = fs.readFileSync(secretPath, 'utf8').trim();
            if (geminiApiKey) {
                console.log("SUCCESS: Gemini API Key loaded from Secret File.");
            }
        } 
        if (!geminiApiKey && process.env.GEMINI_API_KEY) {
             geminiApiKey = process.env.GEMINI_API_KEY;
             console.log("SUCCESS: Gemini API Key loaded from Environment Variable.");
        }

        if (geminiApiKey) {
            ai = new GoogleGenAI({ apiKey: geminiApiKey });
        } else {
            console.error("CRITICAL ERROR: GEMINI_API_KEY is missing. AI endpoints will fail.");
        }
    } catch (error) {
        console.error("FATAL ERROR loading API Key:", error);
    }
}

loadApiKey();

function checkAi(req, res, next) {
    if (!ai) {
        return res.status(503).json({ 
            error: "Service Unavailable. AI API Key not loaded.",
            details: "Render Secret File configuration (gemini) failed."
        });
    }
    next();
}

// --- Website Booster Helper Functions ---

function getUrlToHit(distribution) {
    let rand = Math.random() * 100;
    let cumulative = 0;
    for (const item of distribution) {
        if (item.url && item.percent > 0) {
            cumulative += item.percent;
            if (rand < cumulative) {
                return item.url;
            }
        }
    }
    return distribution[0]?.url || 'https://default-fallback.com/';
}

/**
 * Sends a single GA4 hit using a Proxy, Real User-Agent, and Real Events.
 */
async function sendGa4Hit(gaId, apiSecret, distribution, countryCode, realEvents) {
    const clientId = crypto.randomUUID(); 
    const pageUrl = getUrlToHit(distribution);
    
    // --- 1. PROXY & USER-AGENT SETUP ---
    let proxyUrl = null;
    let agent = undefined;

    if (ALL_GLOBAL_PROXIES.length > 0) {
        // Select a random proxy from the global list
        const proxyIndex = Math.floor(Math.random() * ALL_GLOBAL_PROXIES.length);
        proxyUrl = ALL_GLOBAL_PROXIES[proxyIndex];
        agent = new HttpsProxyAgent(proxyUrl);
    } else {
        // Fallback to direct connection if no proxies are left
        console.warn("WARNING: Proxy list is empty. Traffic will use Render IP.");
    }
    
    // Select a random User-Agent
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    // ------------------------------------

    let events = [];
    
    // 1. Session Start (Crucial for realism)
    if (realEvents) {
        events.push({ name: 'session_start' });
    }
    
    // 2. Page View (Primary event)
    events.push({
        name: 'page_view',
        params: {
            page_location: pageUrl,
            page_title: `Simulated View from ${countryCode}`,
            user_properties: {
                geo_country: { value: countryCode } 
            }
        }
    });

    // 3. Additional Events for Realism (Scroll, Click, Time)
    if (realEvents) {
        events.push({ name: 'scroll', params: { direction: 'down' } });
        
        // Simulate a random click event for engagement (50% chance)
        if (Math.random() < 0.5) { 
             events.push({ name: 'click_cta', params: { button_text: 'Read More' } });
        }
        
        // Simulate engagement time (1 to 6 seconds)
        events.push({ name: 'engagement_time_msec', params: { engagement_time_msec: Math.floor(Math.random() * 5000) + 1000 } });
    }

    const payload = { client_id: clientId, events: events };
    const endpoint = `${GA4_API_URL}?measurement_id=${gaId}&api_secret=${apiSecret}`;

    // --- GA4 POST CALL using AXIOS and Proxy ---
    try {
        const response = await axios.post(endpoint, payload, {
            // Set proxy agent and User-Agent header
            httpsAgent: agent, 
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': userAgent // Set the realistic User-Agent
            },
            validateStatus: status => true, // Don't throw error on non-2xx status
            timeout: 5000 
        });

        if (response.status === 407) {
            // 🛑 FIX for 407 (Authentication Required) ERROR 🛑
            console.error(`GA4 Hit failed for ${countryCode}. Status: 407 (Auth Required). Removing proxy: ${proxyUrl}.`);
            
            // Remove the failed proxy from the list so it won't be used again
            const failedProxyIndex = ALL_GLOBAL_PROXIES.indexOf(proxyUrl);
            if (failedProxyIndex > -1) {
                ALL_GLOBAL_PROXIES.splice(failedProxyIndex, 1);
            }
        } else if (response.status !== 204) {
            console.error(`GA4 Hit failed for ${countryCode}. Status: ${response.status}. Proxy: ${proxyUrl || 'None'}.`);
        } else {
             // Success (Status 204)
        }
    } catch (error) {
        // Remove proxy if network error occurs (e.g., timeout, connection refused)
        if (proxyUrl) {
            console.error(`Network Error (Proxy or Connection) for ${countryCode} using ${proxyUrl}:`, error.message);
            const failedProxyIndex = ALL_GLOBAL_PROXIES.indexOf(proxyUrl);
            if (failedProxyIndex > -1) {
                 console.log(`Removing failed proxy due to network error: ${proxyUrl}`);
                 ALL_GLOBAL_PROXIES.splice(failedProxyIndex, 1);
            }
        } else {
             console.error(`Network Error (Direct Connection) for ${countryCode}:`, error.message);
        }
    }
}


// --- AI Endpoints (Caption Generation: Updated for Hashtags) ---
app.post('/api/ai-caption-generate', checkAi, async (req, res) => {
    const { description, count } = req.body;
    const style = req.body.style || "Catchy and Funny"; 

    if (!description || !count) {
        return res.status(400).json({ error: "Description and count are required." });
    }

    // 🛑 FIX: UPDATED PROMPT TO INCLUDE VIRAL HASHTAGS 🛑
    const prompt = `Generate exactly ${count} Instagram Reels captions (in Hindi/Hinglish if topic is popular, otherwise English) for a video about "${description}". The style should be ${style}. 
    
    For each caption, also suggest 5 to 7 highly relevant and trending Instagram/Reels hashtags.
    
    Format the output strictly as a list of strings. Each string must contain the caption followed by the hashtags. Example: ["Caption 1 #tag1 #tag2", "Caption 2 #tagA #tagB"]`;
    // ----------------------------------------------------

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: prompt
        });

        const text = response.text.trim();
        const captions = text.split('\n').filter(c => c.trim().length > 0);

        console.log(`AI: Successfully generated ${captions.length} captions for: Style: ${style}, Topic: ${description.substring(0, 30)}...`);
        
        res.status(200).json({
            captions: captions
        });

    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ error: "Failed to generate captions from AI.", detail: error.message });
    }
});


// --- Website Booster Endpoint (Now fully integrated with Proxy and Real Events) ---
app.post('/boost-mp', async (req, res) => {
    const { ga_id, api_secret, views, distribution, country, real_events } = req.body;
    
    if (!ga_id || !api_secret || !views || !distribution || !country) {
        return res.status(400).json({ error: "Missing required fields for traffic boosting." });
    }
    
    let targetCountries = (country === "All_15_Global") ? GLOBAL_COUNTRIES : [country];
    
    if (ALL_GLOBAL_PROXIES.length === 0) {
        console.warn("CRITICAL: PROXY LIST IS EMPTY. Traffic boosting will use Render IP.");
    }
    
    console.log(`BOOST JOB RECEIVED: GA ID ${ga_id}, Views: ${views}`);
    console.log(`TARGETING ${targetCountries.length} COUNTRIES: ${targetCountries.join(', ')}`);
    console.log(`SIMULATION MODE: ${real_events ? 'REAL_USER_EVENTS (Proxy/UA)' : 'PAGE_VIEW_ONLY (Proxy/UA)'}`);

    // Runs Asynchronously in the background
    (async () => {
        let successfulAttempts = 0;
        for (let i = 0; i < views; i++) {
            const countryCode = targetCountries[Math.floor(Math.random() * targetCountries.length)];
            
            try {
                await sendGa4Hit(ga_id, api_secret, distribution, countryCode, real_events);
                successfulAttempts++;
            } catch (error) {
                // Error is already logged inside sendGa4Hit
            }
            
            // Wait between 500ms and 1500ms for human-like pacing
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        }
        console.log(`BOOST JOB COMPLETE: Successfully attempted ${successfulAttempts} views. Proxies remaining: ${ALL_GLOBAL_PROXIES.length}`);
    })();
    
    res.status(200).json({ 
        message: "Traffic boosting job successfully initiated and is running in the background.",
        jobId: Date.now(),
        simulation_mode: real_events ? "REAL_USER_EVENTS (Proxy/UA)" : "PAGE_VIEW_ONLY (Proxy/UA)",
        countries_targeted: targetCountries.length,
        proxies_used: ALL_GLOBAL_PROXIES.length > 0 ? "YES" : "NO"
    });
});


// Simple root route to check server health
app.get('/', (req, res) => {
    res.status(200).send("Render Backend is running. AI Status: " + (ai ? "Active" : "Key Missing/Loading"));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
