import express from 'express';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto'; 
import axios from 'axios'; 
// Note: We are removing HttpsProxyAgent and using a manual proxy config in Axios to fix 407.

// --- Configuration ---
const app = express();
const PORT = process.env.PORT || 3000;
const GA4_API_URL = 'https://www.google-analytics.com/mp/collect';

// --- Proxy and User-Agent Data ---

// 🛑 10 NEW PREMIUM AUTHENTICATED PROXY LIST 🛑
// Format: 'http://username:password@ip:port' - Proxies are duplicated for a larger effective pool.
let ALL_GLOBAL_PROXIES = [
    'http://bqcytpvz:399xb3kxqv6i@142.111.48.253:7030', 
    'http://bqcytpvz:399xb3kxqv6i@142.111.48.253:6997', 
    'http://bqcytpvz:399xb3kxqv6i@142.111.48.253:6754', 
    'http://bqcytpvz:399xb3kxqv6i@38.176.176.177:5572', 
    'http://bqcytpvz:399xb3kxqv6i@198.23.239.134:6540', 
    'http://bqcytpvz:399xb3kxqv6i@45.38.107.97:6014',  
    'http://bqcytpvz:399xb3kxqv6i@107.172.153.27:6543', 
    'http://bqcytpvz:399xb3kxqv6i@54.137.96.74:6641',  
    'http://bqcytpvz:399xb3kxqv6i@216.18.27.159:6837', 
    'http://bqcytpvz:399xb3kxqv6i@142.111.67.146:5611',
    'http://bqcytpvz:399xb3kxqv6i@142.147.128.93:6593', 
    
    // Duplicate for better randomization (Realism)
    'http://bqcytpvz:399xb3kxqv6i@142.111.48.253:7030', 
    'http://bqcytpvz:399xb3kxqv6i@142.111.48.253:6997',
    'http://bqcytpvz:399xb3kxqv6i@142.111.48.253:6754',
    'http://bqcytpvz:399xb3kxqv6i@38.176.176.177:5572',
    'http://bqcytpvz:399xb3kxqv6i@198.23.239.134:6540',
    'http://bqcytpvz:399xb3kxqv6i@45.38.107.97:6014', 
    'http://bqcytpvz:399xb3kxqv6i@107.172.153.27:6543',
    'http://bqcytpvz:399xb3kxqv6i@54.137.96.74:6641', 
    'http://bqcytpvz:399xb3kxqv6i@216.18.27.159:6837',
    'http://bqcytpvz:399xb3kxqv6i@142.111.67.146:5611',
    'http://bqcytpvz:399xb3kxqv6i@142.147.128.93:6593'
];

const GLOBAL_COUNTRIES = ["US", "IN", "CA", "GB", "AU", "DE", "FR", "JP", "BR", "SG", "AE", "ES", "IT", "MX", "NL"];

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0'
];

// --- Middleware and API Key Loading (Same as before, confirmed working) ---
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
            details: "Please check Render Secret File configuration (gemini)."
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
 * Parses the proxy URL (http://user:pass@ip:port) into Axios-compatible configuration.
 */
function parseProxyUrl(proxyUrl) {
    try {
        const url = new URL(proxyUrl);
        return {
            protocol: url.protocol.replace(':', ''),
            host: url.hostname,
            port: url.port,
            auth: {
                username: url.username,
                password: url.password,
            },
        };
    } catch (e) {
        console.error(`Invalid proxy URL format: ${proxyUrl}`, e);
        return null;
    }
}

/**
 * Sends a single GA4 hit using a Proxy, Real User-Agent, and Real Events.
 */
async function sendGa4Hit(gaId, apiSecret, distribution, countryCode, realEvents) {
    const clientId = crypto.randomUUID(); 
    const pageUrl = getUrlToHit(distribution);
    
    // --- 1. PROXY & USER-AGENT SETUP ---
    let proxyUrl = null;
    let proxyConfig = null;

    if (ALL_GLOBAL_PROXIES.length > 0) {
        // Select a random proxy from the global list
        const proxyIndex = Math.floor(Math.random() * ALL_GLOBAL_PROXIES.length);
        proxyUrl = ALL_GLOBAL_PROXIES[proxyIndex];
        // 🛑 FIX: Use custom parsing for explicit proxy authentication in Axios
        proxyConfig = parseProxyUrl(proxyUrl);
    } else {
        console.warn("WARNING: Proxy list is empty. Traffic will use Render IP.");
    }
    
    // Select a random User-Agent
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    // ------------------------------------

    let events = [];
    
    if (realEvents) {
        events.push({ name: 'session_start' });
    }
    
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

    if (realEvents) {
        events.push({ name: 'scroll', params: { direction: 'down' } });
        
        if (Math.random() < 0.5) { 
             events.push({ name: 'click_cta', params: { button_text: 'Read More' } });
        }
        
        events.push({ name: 'engagement_time_msec', params: { engagement_time_msec: Math.floor(Math.random() * 5000) + 1000 } });
    }

    const payload = { client_id: clientId, events: events };
    const endpoint = `${GA4_API_URL}?measurement_id=${gaId}&api_secret=${apiSecret}`;

    // --- AXIOS CONFIGURATION with Explicit Proxy ---
    const axiosConfig = {
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': userAgent 
        },
        validateStatus: status => true, 
        timeout: 10000, // Increased timeout to 10 seconds for stability
    };
    
    // Apply proxy configuration if available
    if (proxyConfig) {
        axiosConfig.proxy = proxyConfig;
    }

    // --- GA4 POST CALL ---
    try {
        const response = await axios.post(endpoint, payload, axiosConfig);

        // Check for 407 and other non-success status
        if (response.status === 407) {
            console.error(`GA4 Hit failed for ${countryCode}. Status: 407 (Auth Required). Removing proxy: ${proxyUrl}. This should be fixed now.`);
            
            const failedProxyIndex = ALL_GLOBAL_PROXIES.indexOf(proxyUrl);
            if (failedProxyIndex > -1) {
                ALL_GLOBAL_PROXIES.splice(failedProxyIndex, 1);
            }
        } else if (response.status !== 204) {
            console.error(`GA4 Hit failed for ${countryCode}. Status: ${response.status}. Proxy: ${proxyUrl || 'None'}. Response Data: ${JSON.stringify(response.data)}`);
        } else {
             // Success (Status 204)
        }
    } catch (error) {
        // Handle network errors (ETIMEDOUT, ECONNREFUSED, etc. from your logs)
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


// --- AI Endpoints (Same as before, confirmed working) ---
app.post('/api/ai-caption-generate', checkAi, async (req, res) => {
    const { description, count } = req.body;
    const style = req.body.style || "Catchy and Funny"; 

    if (!description || !count) {
        return res.status(400).json({ error: "Description and count are required." });
    }

    const prompt = `Generate exactly ${count} Instagram Reels captions (in Hindi/Hinglish if topic is popular, otherwise English) for a video about "${description}". The style should be ${style}. 
    
    For each caption, also suggest 5 to 7 highly relevant and trending Instagram/Reels hashtags.
    
    Format the output strictly as a list of strings. Each string must contain the caption followed by the hashtags. Example: ["Caption 1 #tag1 #tag2", "Caption 2 #tagA #tagB"]`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: prompt
        });

        const text = response.text.trim();
        let captions;
        try {
            captions = JSON.parse(text);
            if (!Array.isArray(captions)) throw new Error("Not an array");
        } catch {
             captions = text.split('\n')
                           .map(c => c.trim().replace(/^["\[\]\s]+|["\[\]\s]+$/g, ''))
                           .filter(c => c.length > 0);
        }

        console.log(`AI: Successfully generated ${captions.length} captions for: Style: ${style}, Topic: ${description.substring(0, 30)}...`);
        
        res.status(200).json({
            captions: captions
        });

    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ error: "Failed to generate captions from AI.", detail: error.message });
    }
});


// --- Website Booster Endpoint (Now with robust proxy handling) ---
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
    console.log(`SIMULATION MODE: ${real_events ? 'REAL_USER_EVENTS (Authenticated Proxy/UA)' : 'PAGE_VIEW_ONLY (Authenticated Proxy/UA)'}`);

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
            
            // Wait between 500ms and 1500ms for human-like pacing for realism
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        }
        console.log(`BOOST JOB COMPLETE: Successfully attempted ${successfulAttempts} views. Proxies remaining: ${ALL_GLOBAL_PROXIES.length}`);
    })();
    
    res.status(200).json({ 
        message: "Traffic boosting job successfully initiated and is running in the background.",
        jobId: Date.now(),
        simulation_mode: real_events ? "REAL_USER_EVENTS (Authenticated Proxy/UA)" : "PAGE_VIEW_ONLY (Authenticated Proxy/UA)",
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
