import express from 'express';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto'; // For generating unique client_id (Node standard library)

// --- Configuration ---
const app = express();
const PORT = process.env.PORT || 3000;
const GA4_API_URL = 'https://www.google-analytics.com/mp/collect';

// Define the 15 countries for global traffic distribution
const GLOBAL_COUNTRIES = [
    "US", "IN", "CA", "GB", "AU", "DE", "FR", "JP", "BR", "SG", 
    "AE", "ES", "IT", "MX", "NL"
];

// Middleware
app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

let ai;
let geminiApiKey;

// Load API Key from Secret File (/etc/secrets/gemini) or Environment Variable
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

/**
 * Randomly selects a URL based on the percentage distribution provided by the user.
 */
function getUrlToHit(distribution) {
    let rand = Math.random() * 100;
    let cumulative = 0;
    for (const item of distribution) {
        // Ensure the item.url is present and percentage is valid
        if (item.url && item.percent > 0) {
            cumulative += item.percent;
            if (rand < cumulative) {
                return item.url;
            }
        }
    }
    // Fallback to the first valid URL if distribution logic fails (should not happen)
    return distribution[0]?.url || 'https://default-fallback.com/';
}

/**
 * Sends a single hit (with multiple events) to the Google Analytics 4 Measurement Protocol endpoint.
 */
async function sendGa4Hit(gaId, apiSecret, distribution, countryCode, realEvents) {
    // Generate a new unique Client ID for each session
    const clientId = crypto.randomUUID(); 
    const pageUrl = getUrlToHit(distribution);
    
    let events = [];
    
    // 1. Session Start (Crucial for a realistic user session)
    if (realEvents) {
        events.push({ name: 'session_start' });
    }
    
    // 2. Page View (The primary event)
    events.push({
        name: 'page_view',
        params: {
            page_location: pageUrl,
            page_title: `Simulated View from ${countryCode}`,
            // We use user_properties to simulate the geo context for logging/reporting
            user_properties: {
                geo_country: { value: countryCode } 
            }
        }
    });

    // 3. Additional Events for Realism (Scroll and Time on Page)
    if (realEvents) {
        // Simulate a scroll event
        events.push({ name: 'scroll', params: { direction: 'down' } });
        // Simulate engagement time (1 to 6 seconds)
        events.push({ name: 'engagement_time_msec', params: { engagement_time_msec: Math.floor(Math.random() * 5000) + 1000 } });
    }

    const payload = { client_id: clientId, events: events };
    const endpoint = `${GA4_API_URL}?measurement_id=${gaId}&api_secret=${apiSecret}`;

    // --- GA4 POST CALL ---
    const response = await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
    });

    if (response.status !== 204) {
        // Log error but don't stop the job
        console.error(`GA4 Hit failed for ${countryCode}. Status: ${response.status}. URL: ${pageUrl}`);
        // If Google rejects the hit, status is not 204.
    }
}

// --- AI Endpoints (Caption Generation) ---

/**
 * Route: /api/ai-caption-generate
 * Generates N captions using Gemini and forces JSON output.
 */
app.post('/api/ai-caption-generate', checkAi, async (req, res) => {
    const { description, count } = req.body;
    
    if (!description || !count) {
        return res.status(400).json({ error: "Missing required fields: description or count." });
    }
    
    const prompt = `Generate exactly ${count} highly engaging Instagram captions based on the following content description. Each caption must be a single string, use modern emojis, and include 3-5 relevant hashtags.
    Description: ${description}`;

    const config = {
        // Force the model to return a JSON object
        responseMimeType: "application/json",
        responseSchema: {
            type: "OBJECT",
            properties: {
                captions: {
                    type: "ARRAY",
                    description: `A list of exactly ${count} highly engaging Instagram captions.`,
                    items: { type: "STRING" }
                }
            },
        },
    };

    console.log(`AI: Generating ${count} captions for: ${description}`);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-05-20',
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config,
        });

        const jsonText = response.candidates?.[0]?.content?.parts?.[0]?.text;
        
        // Ensure the JSON is properly cleaned and parsed
        const result = JSON.parse(jsonText.trim());

        if (result && result.captions && result.captions.length > 0) {
            console.log(`AI: Successfully generated ${result.captions.length} captions.`);
            res.json({ captions: result.captions });
        } else {
            console.error("AI: Response empty or improperly formatted.", jsonText);
            res.status(500).json({ error: "AI response was empty or improperly formatted. Try refining the prompt." });
        }
        
    } catch (error) {
         console.error("AI Generation Failed:", error);
         res.status(500).json({ error: "AI failed to process the request.", details: error.message });
    }
});


/**
 * Route: /api/ai-caption-edit
 * Edits a caption using Gemini.
 */
app.post('/api/ai-caption-edit', checkAi, async (req, res) => {
    const { originalCaption, requestedChange } = req.body;
    
    if (!originalCaption || !requestedChange) {
        return res.status(400).json({ error: "Missing required fields for editing." });
    }

    const prompt = `Rewrite and edit the following original caption based on the requested change. Only return the final, edited caption text, without any introductory phrases or explanations.
    Original Caption: "${originalCaption}"
    Requested Change: "${requestedChange}"`;

    console.log(`AI: Editing caption: ${requestedChange}`);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-05-20',
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const editedCaption = response.candidates?.[0]?.content?.parts?.[0]?.text.trim();
        
        if (editedCaption) {
            res.json({ editedCaption });
        } else {
            res.status(500).json({ error: "AI failed to return an edited caption." });
        }
        
    } catch (error) {
         console.error("AI Editing Failed:", error);
         res.status(500).json({ error: "AI editing failed.", details: error.message });
    }
});


/**
 * Route: /boost-mp
 * Sends ACTUAL hits to Google Analytics 4 Measurement Protocol.
 */
app.post('/boost-mp', async (req, res) => {
    const { ga_id, api_secret, views, distribution, country, real_events } = req.body;
    
    // Check required fields
    if (!ga_id || !api_secret || !views || !distribution || !country) {
        return res.status(400).json({ error: "Missing required fields for traffic boosting." });
    }
    
    // Determine target countries
    let targetCountries = [];
    if (country === "All_15_Global") {
        targetCountries = GLOBAL_COUNTRIES;
    } else {
        targetCountries = [country]; // Fallback if single country is sent
    }

    console.log(`BOOST JOB RECEIVED: GA ID ${ga_id}, Views: ${views}`);
    console.log(`TARGETING ${targetCountries.length} COUNTRIES: ${targetCountries.join(', ')}`);
    console.log(`REAL EVENTS SIMULATION: ${real_events ? 'YES (Sending multiple events)' : 'NO (Sending only page_view)'}`);

    // --- CRITICAL GA4 HIT LOGIC (Runs Asynchronously in the background) ---
    // We run the heavy lifting in a separate async function and immediately return a 200 response
    // to prevent the client connection from timing out.
    (async () => {
        let successfulHits = 0;
        for (let i = 0; i < views; i++) {
            // Select a country randomly from the target list
            const countryCode = targetCountries[Math.floor(Math.random() * targetCountries.length)];
            
            try {
                // Send the GA4 hit (page_view + events)
                await sendGa4Hit(ga_id, api_secret, distribution, countryCode, real_events);
                successfulHits++;
            } catch (error) {
                console.error(`Error sending view ${i+1}:`, error.message);
            }
            
            // Wait between 500ms and 1500ms to simulate realistic human traffic flow
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        }
        console.log(`BOOST JOB COMPLETE: Successfully attempted ${successfulHits} views.`);
    })();
    
    // Success response indicates the job has been accepted by the Render server.
    // The actual work is happening asynchronously above this line.
    res.status(200).json({ 
        message: "Traffic boosting job successfully initiated and is running in the background.",
        jobId: Date.now(),
        simulation_mode: real_events ? "REAL_USER_EVENTS" : "PAGE_VIEW_ONLY",
        countries_targeted: targetCountries.length
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
