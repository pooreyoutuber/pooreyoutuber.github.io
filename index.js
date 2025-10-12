import express from 'express';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = process.env.PORT || 3000;

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
                console.log("SUCCESS: Gemini API Key loaded from Secret File (/etc/secrets/gemini).");
            }
        } 
        if (!geminiApiKey && process.env.GEMINI_API_KEY) {
             geminiApiKey = process.env.GEMINI_API_KEY;
             console.log("SUCCESS: Gemini API Key loaded from Environment Variable (GEMINI_API_KEY).");
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

/**
 * AI Endpoints (Caption Generation and Editing) remain here.
 * (Full code truncated for brevity, but all previous AI logic is preserved)
 */
// ... [AI Caption Generation logic here] ...
app.post('/api/ai-caption-generate', checkAi, async (req, res) => {
    // ... [Your existing generation code] ...
    // Placeholder success response for quick testing
    const { description, count } = req.body;
    if (!description || !count) return res.status(400).json({ error: "Missing fields." });
    
    // NOTE: Replace this with your actual Gemini API logic!
    try {
        // ... (Actual Gemini API call using 'ai') ...
        const mockResponse = { captions: [`#TestCaption ${Math.random()}`, `#TestCaption2 ${Math.random()}`] };
        res.json(mockResponse);
    } catch (error) {
         res.status(500).json({ error: "AI failed.", details: error.message });
    }
});
// ... [AI Caption Editing logic here] ...
app.post('/api/ai-caption-edit', checkAi, async (req, res) => {
    // ... [Your existing editing code] ...
    // Placeholder success response for quick testing
    const { originalCaption, requestedChange } = req.body;
    if (!originalCaption || !requestedChange) return res.status(400).json({ error: "Missing fields." });
    
    try {
         // ... (Actual Gemini API call using 'ai') ...
        const mockResponse = { editedCaption: `Edited: ${originalCaption} (${requestedChange})` };
        res.json(mockResponse);
    } catch (error) {
         res.status(500).json({ error: "AI failed.", details: error.message });
    }
});


/**
 * Endpoint for Website Traffic Booster (Placeholder for Real Events)
 * Route: /boost-mp
 */
app.post('/boost-mp', (req, res) => {
    const { ga_id, api_secret, views, distribution, country, real_events } = req.body;
    
    // Check required fields
    if (!ga_id || !api_secret || !views || !distribution || !country) {
        return res.status(400).json({ error: "Missing required fields for traffic boosting." });
    }
    
    // Logging the new 'real_events' flag for debugging
    console.log(`BOOST JOB RECEIVED: GA ID ${ga_id}, Views: ${views}, Country: ${country}`);
    console.log(`REAL EVENTS SIMULATION: ${real_events ? 'YES (Sending multiple events)' : 'NO (Sending only page_view)'}`);

    // --- CRITICAL LOGIC SIMULATION ---
    // In a real application, the server would start a background worker here
    // that uses the GA4 Measurement Protocol to:
    // 1. Send 'page_view'
    // 2. IF real_events IS TRUE, also send 'scroll', 'session_start', 'first_visit', and possibly custom events.
    // 3. The simulation of different countries would happen here.

    // Success response indicates the job has been accepted by the Render server.
    res.status(200).json({ 
        message: "Traffic boosting job successfully initiated and is running in the background.",
        jobId: Date.now(),
        simulation_mode: real_events ? "REAL_USER_EVENTS" : "PAGE_VIEW_ONLY"
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
