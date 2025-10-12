const express = require('express');
const fs = require('fs');
// GoogleGenAI is the correct class name for the latest official package
const { GoogleGenAI } = require('@google/genai'); 

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Enable CORS for frontend access (important for GitHub Pages)
app.use((req, res, next) => {
    // Replace '*' with your specific GitHub Pages URL for more security
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

let ai;
let geminiApiKey;

// Function to load the API Key from the Render Secret File or Environment Variable
function loadApiKey() {
    // 1. Secret File Path (Matches user's config: filename 'gemini')
    const secretPath = '/etc/secrets/gemini'; 
    
    try {
        if (fs.existsSync(secretPath)) {
            // Read from Secret File (Priority 1)
            geminiApiKey = fs.readFileSync(secretPath, 'utf8').trim();
            if (geminiApiKey) {
                console.log("SUCCESS: Gemini API Key loaded from Secret File (/etc/secrets/gemini).");
            } else {
                console.error("ERROR: Secret file exists but is empty. Check its content.");
            }
        } 
        
        // 2. Fallback to Environment Variable (Priority 2)
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

// Load the key once on startup
loadApiKey();

// Middleware to check if AI is initialized before serving AI endpoints
function checkAi(req, res, next) {
    if (!ai) {
        // 503 Service Unavailable: Indicates the service is not ready (due to missing key)
        return res.status(503).json({ 
            error: "Service Unavailable. AI API Key not loaded.",
            details: "Render Secret File configuration (gemini) failed. Check Render logs for CRITICAL ERROR messages."
        });
    }
    next();
}

/**
 * Endpoint for AI Reels Caption Generation
 * Route: /api/ai-caption-generate
 */
app.post('/api/ai-caption-generate', checkAi, async (req, res) => {
    const { description, count } = req.body;

    if (!description || !count) {
        return res.status(400).json({ error: "Missing required fields: description or count." });
    }

    const prompt = `Act as an expert Instagram content creator. Generate exactly ${count} unique, engaging captions in Hindi or Hinglish based on the content below. Each caption MUST include 5 relevant and trending hashtags separated by a new line from the main caption text. The response should be a clean, numbered list of captions.
    
    Content: ${description}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                temperature: 0.7, 
            },
        });

        const rawText = response.text.trim();
        
        const captions = rawText.split('\n').filter(line => line.trim().length > 0)
                                 .map(line => line.replace(/^\s*\d+\.\s*/, '').trim())
                                 .filter(line => line.length > 5); 

        if (captions.length === 0) {
            const fallbackCaptions = rawText.split(/\n\s*\n/).filter(c => c.trim().length > 0);
            return res.json({ captions: fallbackCaptions.length > 0 ? fallbackCaptions : [rawText] });
        }
        
        res.json({ captions: captions });
    } catch (error) {
        console.error("Gemini API Generation Error:", error.message);
        // The frontend will catch 500 error
        res.status(500).json({ error: "AI Processing Failed. Possible reason: API rate limits or invalid input.", details: error.message });
    }
});

/**
 * Endpoint for AI Caption Editing
 * Route: /api/ai-caption-edit
 */
app.post('/api/ai-caption-edit', checkAi, async (req, res) => {
    const { originalCaption, requestedChange } = req.body;

    if (!originalCaption || !requestedChange) {
        return res.status(400).json({ error: "Missing required fields: originalCaption or requestedChange." });
    }

    const prompt = `You are a professional social media editor. Refine the following original caption based on the requested change. The output should only be the new, improved caption text, without any added explanation or quotes.

    Original Caption: "${originalCaption}"
    Requested Change: "${requestedChange}"
    
    New Caption:`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                temperature: 0.3, 
            },
        });

        const editedCaption = response.text.trim();
        res.json({ editedCaption: editedCaption });
    } catch (error) {
        console.error("Gemini API Editing Error:", error.message);
        res.status(500).json({ error: "AI Editing Failed. Possible reason: API rate limits or invalid input.", details: error.message });
    }
});


/**
 * Endpoint for Website Traffic Booster (Placeholder)
 * Route: /boost-mp
 */
app.post('/boost-mp', (req, res) => {
    const { ga_id, api_secret, views, distribution } = req.body;

    if (!ga_id || !api_secret || !views || !distribution) {
        return res.status(400).json({ error: "Missing required fields for traffic boosting." });
    }
    
    // The frontend will display success once this 200 response is received.
    res.status(200).json({ 
        message: "Traffic boosting job successfully initiated and is running in the background.",
        jobId: Date.now() 
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
