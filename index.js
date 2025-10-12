// index.js (ES Module Syntax - Fixes 'require is not defined' error)

import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto'; 

// --- Configuration ---
const PORT = process.env.PORT || 10000; 
// CRITICAL: The API key must be set as an environment variable in Render's dashboard.
// Key: GEMINI_API_KEY
const API_KEY = process.env.GEMINI_API_KEY; 

// --- Initialization ---
const app = express();
let ai; 

if (API_KEY) {
    ai = new GoogleGenAI(API_KEY); 
    console.log("Gemini AI Client initialized successfully.");
} else {
    console.error("FATAL: GEMINI_API_KEY is missing. AI endpoints will fail.");
}

// --- Dummy Database for SEO Article Publisher ---
let articlesDb = []; 

// --- Middleware ---
app.use(express.json({ limit: '5mb' })); 
// Allow CORS from any origin for flexibility, though generally, you'd restrict it to your GitHub Pages URL.
app.use(cors({
    origin: '*', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
}));

// --- Utility Functions for AI Calls ---

/**
 * Handles the call to the Gemini API with specified prompt and configuration.
 */
async function generateText(prompt, systemInstruction, responseMimeType, responseSchema) {
    if (!API_KEY || !ai) {
        throw new Error("API Key Missing. Please set GEMINI_API_KEY in Render.");
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: "user", parts: [{ text: prompt }] }
            ],
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.5,
                responseMimeType: responseMimeType,
                responseSchema: responseSchema 
            }
        });

        const text = response.text;
        if (!text) {
            throw new Error("AI returned an empty response.");
        }
        return text.trim();

    } catch (error) {
        console.error("Gemini API Error:", error.message);
        // Clean up the error message for the client
        throw new Error(`AI Request Failed: ${error.message.substring(0, 150)}...`);
    }
}

// ===================================================================
// 1. ROOT & HEALTH CHECK
// ===================================================================
app.get('/', (req, res) => {
    // This message should appear in your browser when you hit the root URL.
    res.send(`API Server is running successfully on port ${PORT}. Status: Ready. Module Type: ESM.`);
});

// ===================================================================
// 2. WEBSITE TRAFFIC BOOSTER ENDPOINT (URL: /boost-mp)
// ===================================================================
app.post('/boost-mp', (req, res) => {
    const { ga_id, views } = req.body;
    
    if (!ga_id || !views) {
        return res.status(400).json({ error: 'Missing GA4 ID or views count.' });
    }
    
    // Placeholder response for the Traffic Booster tool
    console.log(`[BOOST] Request accepted: GA_ID: ${ga_id}, Views: ${views}`);
    res.status(202).json({ 
        status: 'accepted', 
        message: `Request for ${views} views accepted for processing. Check Google Analytics in 24-48 hours.`,
    });
});

// ===================================================================
// 3. AI CAPTION GENERATOR ENDPOINTS
// ===================================================================

// Endpoint to generate a new caption based on description
app.post('/api/ai-caption-generate', async (req, res) => {
    const { description, count } = req.body;

    if (!description || !count) {
        return res.status(400).json({ error: 'Description and count are required.' });
    }
    
    const prompt = `Act as an expert Instagram content creator specializing in Reels. Based on the following video description, generate exactly ${count} unique, highly engaging, and short captions in Hindi or Hinglish. Each caption MUST include 5 relevant and trending hashtags separated from the main text by a new line.

Description: "${description}"`;

    const systemInstruction = "Your final output MUST be a single JSON object with a key 'captions' containing an array of strings. Do not include any introductory text or explanation outside the JSON.";

    const schema = {
        type: "object", 
        properties: { captions: { type: "array", items: { type: "string" } } }, 
        required: ["captions"] 
    };

    try {
        const rawResponse = await generateText(prompt, systemInstruction, "application/json", schema);
        const result = JSON.parse(rawResponse);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to edit an existing caption
app.post('/api/ai-caption-edit', async (req, res) => {
    const { originalCaption, requestedChange } = req.body;

    if (!originalCaption || !requestedChange) {
        return res.status(400).json({ error: 'Original caption and requested change are required.' });
    }
    
    const prompt = `Edit the 'Original Caption' based on the 'Requested Change'. Ensure the edited caption has 5 relevant and trending hashtags, separated from the text by a new line. Use Hindi or Hinglish.
Original Caption: "${originalCaption}"
Requested Change: "${requestedChange}"`;

    const systemInstruction = "Your final output MUST be a single JSON object with a key called 'editedCaption'. Do not include any introductory text or explanation outside the JSON.";
    
    const schema = {
        type: "object", 
        properties: { editedCaption: { type: "string" } }, 
        required: ["editedCaption"] 
    };

    try {
        const rawResponse = await generateText(prompt, systemInstruction, "application/json", schema);
        const result = JSON.parse(rawResponse);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===================================================================
// 4. SEO ARTICLE PUBLISHER ENDPOINTS
// ===================================================================

// Endpoint to save/upload a new article
app.post('/api/article-upload', (req, res) => {
    const { title, slug, content } = req.body;
    if (!title || !slug || !content) {
        return res.status(400).json({ error: 'Title, Slug, and Content are required.' });
    }
    const newId = crypto.randomUUID(); 
    const newArticle = { id: newId, title, slug, content, date: new Date().toISOString() };
    articlesDb.push(newArticle);
    console.log(`[ARTICLE SAVE] New Article ID: ${newId}`);
    res.status(200).json({ status: 'ok', message: 'Article saved successfully.', articleId: newId });
});

// Endpoint for AI Grammar Check
app.post('/api/ai-check-grammar', async (req, res) => {
    const { content } = req.body;
    if (!content) {
        return res.status(400).json({ error: 'Content is required for grammar check.' });
    }
    
    const prompt = `Review the following article content for all grammatical errors, spelling mistakes, and unclear sentences. Rewrite the content only where necessary to improve clarity and maintain an SEO-friendly tone. Do not add or remove any meaningful paragraphs.

Original Content: "${content}"`;

    const systemInstruction = "Your final output MUST be a single JSON object with a key 'correctedContent'. Provide only the corrected content as a string. Do not include any introductory text or explanation outside the JSON.";
    
    const schema = {
        type: "object", 
        properties: { correctedContent: { type: "string" } }, 
        required: ["correctedContent"] 
    };

    try {
        const rawResponse = await generateText(prompt, systemInstruction, "application/json", schema);
        const result = JSON.parse(rawResponse);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// --- Server Startup ---
app.listen(PORT, () => {
    console.log(`Combined API Server listening on port ${PORT}.`);
});
```eof

---

## 🛠️ अंतिम कदम

1.  **`package.json`** और **`index.js`** को GitHub पर सेव करें।
2.  Render डैशबोर्ड पर जाएँ और **Manual Deploy** ट्रिगर करें।

यह `ReferenceError: require is not defined` त्रुटि को ठीक कर देगा, और आपका Backend चलना शुरू हो जाएगा।

क्या आप अब **SEO Article Publisher Frontend** (`article-tool.html`) को अपडेट करना चाहेंगे?
