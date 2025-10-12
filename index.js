const express = require('express');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Enable CORS for frontend access (important for GitHub Pages)
app.use((req, res, next) => {
    // Replace '*' with your GitHub Pages domain for production security
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

let ai;
let geminiApiKey;

// Function to load the API Key from the Render Secret File
function loadApiKey() {
    const secretPath = '/etc/secrets/gemini_api_key';
    try {
        // Read the API key from the secret file path provided by Render
        if (fs.existsSync(secretPath)) {
            geminiApiKey = fs.readFileSync(secretPath, 'utf8').trim();
            if (geminiApiKey) {
                ai = new GoogleGenAI({ apiKey: geminiApiKey });
                console.log("Gemini API Key loaded successfully from Secret File.");
            } else {
                console.error("Error: Secret file exists but is empty.");
            }
        } else {
            console.error("Error: Secret file path does not exist. Did you configure the Secret File on Render?");
        }
    } catch (error) {
        console.error("Error loading API Key:", error);
    }
}

// Load the key once on startup
loadApiKey();

// Middleware to check if AI is initialized
function checkAi(req, res, next) {
    if (!ai) {
        return res.status(503).json({ 
            error: "Service Unavailable. AI API Key not loaded or service is starting.",
            details: "Please check Render Secret File configuration and service logs."
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
        });

        const rawText = response.text.trim();
        
        // Simple splitting logic to extract individual captions
        const captions = rawText.split('\n').filter(line => line.trim().length > 0 && line.match(/^\s*\d+\.\s*/))
                                 .map(line => line.replace(/^\s*\d+\.\s*/, '').trim());

        if (captions.length === 0) {
            // Fallback if the model didn't use perfect numbering
            const fallbackCaptions = rawText.split(/\n\s*\n/).filter(c => c.trim().length > 0);
            return res.json({ captions: fallbackCaptions });
        }
        
        res.json({ captions: captions });
    } catch (error) {
        console.error("Gemini API Generation Error:", error.message);
        res.status(500).json({ error: "Failed to generate captions from AI API.", details: error.message });
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

    const prompt = `You are a professional social media editor. Refine the following original caption based on the requested change. The output should only be the new, improved caption text.

    Original Caption: "${originalCaption}"
    Requested Change: "${requestedChange}"
    
    New Caption:`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const editedCaption = response.text.trim();
        res.json({ editedCaption: editedCaption });
    } catch (error) {
        console.error("Gemini API Editing Error:", error.message);
        res.status(500).json({ error: "Failed to edit caption from AI API.", details: error.message });
    }
});


/**
 * Endpoint for Website Traffic Booster (Placeholder - Needs real logic in production)
 * Route: /boost-mp
 */
app.post('/boost-mp', (req, res) => {
    const { ga_id, api_secret, views, distribution } = req.body;

    if (!ga_id || !api_secret || !views || !distribution) {
        return res.status(400).json({ error: "Missing required fields for traffic boosting." });
    }

    // In a real production environment, this is where complex
    // logic would run to simulate GA4 Measurement Protocol hits.
    
    // For now, we simulate success and log the job details.
    console.log(`[TRAFFIC BOOST JOB STARTED]`);
    console.log(`GA ID: ${ga_id}`);
    console.log(`Views: ${views}`);
    console.log("Distribution:", distribution);
    console.log("---");

    // Send a success response immediately so the frontend knows the job started
    res.status(200).json({ 
        message: "Traffic boosting job successfully initiated and is running in the background.",
        jobId: Date.now() 
    });
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
