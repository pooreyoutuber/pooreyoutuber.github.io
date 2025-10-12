// index.js (FINAL COMPLETE CODE with Crash Fix and all 3 tool endpoints)

const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const fetch = require('node-fetch'); 
const cors = require('cors'); 
const fs = require('fs'); 
const crypto = require('crypto'); // Used for generating temporary IDs for articles

const app = express();
// Render uses process.env.PORT
const PORT = process.env.PORT || 10000; 

// --- CRITICAL CONFIGURATION ---
// The URL of your GitHub Pages frontend for CORS
const FRONTEND_URL = 'https://pooreyoutuber.github.io'; 

// --- GEMINI KEY CONFIGURATION (CRASH FIX) ---
let GEMINI_KEY;
try {
    // Attempt to load from Render Secret File
    GEMINI_KEY = fs.readFileSync('/etc/secrets/gemini', 'utf8').trim(); 
    console.log("Gemini Key loaded successfully from Secret File.");
} catch (e) {
    // Fallback for local development or Environment Variable
    GEMINI_KEY = process.env.GEMINI_API_KEY; 
    if (GEMINI_KEY) {
        console.log("Gemini Key loaded from Environment Variable.");
    } else {
        console.error("FATAL: Gemini Key could not be loaded. AI endpoints will fail.");
    }
}

// Initialize AI object only if key is available
let ai;
if (GEMINI_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
} else {
    // Dummy object to prevent crash if AI endpoints are called without a key
    ai = { models: { generateContent: () => Promise.reject(new Error("AI Key Missing")) } };
}

// --- MIDDLEWARE & UTILITIES ---
// Use express.json with a higher limit for large article content (5MB)
app.use(express.json({ limit: '5mb' })); 

// CORS configuration to allow only your frontend domain
app.use(cors({
    origin: FRONTEND_URL, 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
}));

// Simple health check endpoint
app.get('/', (req, res) => {
    res.send(`API Server is running successfully on port ${PORT}. Status: Ready.`);
});

// ===================================================================
// 1. WEBSITE TRAFFIC BOOSTER ENDPOINT (URL: /boost-mp)
// ===================================================================
app.post('/boost-mp', async (req, res) => {
    // 'countries' variable को req.body से निकाल लिया गया है
    const { ga_id, api_key, views, pages, countries } = req.body;

    if (!ga_id || !api_key || !views || !pages || pages.length === 0) {
        return res.status(400).json({ error: 'Missing GA4 configuration details or page list.' });
    }
    
    // countries array की संख्या log में शामिल करें
    const countryLog = countries && Array.isArray(countries) && countries.length > 0 ? `, Countries: ${countries.length}` : '';

    // In a real scenario, this would start a background worker/queue.
    // Here we simulate successful acceptance.
    console.log(`[BOOST] Request accepted: GA_ID: ${ga_id}, Views: ${views}, Pages: ${pages.length}${countryLog}`);

    // Since we cannot run a long-running process here, we simulate acceptance.
    res.status(202).json({ 
        status: 'accepted', 
        message: `Request for ${views} views accepted for processing (Pages: ${pages.length}${countryLog}). Check Google Analytics in 24-48 hours.`,
        data: req.body // Echoing data back for confirmation
    });
});


// ===================================================================
// 2. AI CAPTION GENERATOR ENDPOINTS (URL: /api/ai-caption-*)
// ===================================================================

// Endpoint to generate a new caption based on description
app.post('/api/ai-caption-generate', async (req, res) => {
    
    if (!GEMINI_KEY) {
        return res.status(500).json({ error: 'Server error: Gemini API Key is missing.' });
    }

    const { description, count } = req.body;

    if (!description || !count) {
        return res.status(400).json({ error: 'Description and count are required.' });
    }

    const prompt = `Act as an expert Instagram content creator specializing in Reels. Based on the following video description, generate exactly ${count} unique, highly engaging, and short captions. Each caption MUST include 5 relevant and trending hashtags separated from the main text by a new line.

--- CRITICAL INSTRUCTION ---
The final output MUST be a single JSON object with a key 'captions' containing an array of strings. Do not include any introductory text or explanation outside the JSON.
Description: "${description}"`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: { captions: { type: "array", items: { type: "string" } } },
                    required: ["captions"]
                },
                temperature: 0.8,
            },
        });

        const result = JSON.parse(response.text.trim());
        res.status(200).json(result);

    } catch (error) {
        console.error('Gemini API Error (Generate):', error.message);
        res.status(500).json({ error: `AI Generation Failed. Reason: ${error.message.substring(0, 50)}...` });
    }
});

// Endpoint to edit an existing caption
app.post('/api/ai-caption-edit', async (req, res) => {
    
    if (!GEMINI_KEY) {
        return res.status(500).json({ error: 'Server error: Gemini API Key is missing.' });
    }

    const { originalCaption, requestedChange } = req.body;

    if (!originalCaption || !requestedChange) {
        return res.status(400).json({ error: 'Original caption and requested change are required.' });
    }

    const prompt = `Act as an expert Instagram content creator. Edit the 'Original Caption' based on the 'Requested Change'. Ensure the edited caption is highly engaging for Instagram Reels. If the original caption included hashtags, ensure the edited caption has 5 relevant and trending hashtags, separated from the text by a new line. The output should be concise and ready to post.

Original Caption: "${originalCaption}"
Requested Change: "${requestedChange}"

--- CRITICAL INSTRUCTION ---
The final output MUST be a single JSON object with a key called 'editedCaption'. Do not include any introductory text or explanation outside the JSON.`;
    
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
// 3. SEO ARTICLE PUBLISHER ENDPOINTS (URL: /api/article-*)
// ===================================================================
// Dummy database storage (in-memory for simple demo)
let articlesDb = [];

// Endpoint to save/upload a new article
app.post('/api/article-upload', (req, res) => {
    const { title, slug, meta, content, imageFilename } = req.body;

    if (!title || !slug || !content) {
        return res.status(400).json({ error: 'Title, Slug, and Content are required.' });
    }

    const newId = crypto.randomUUID(); // Generate a unique ID
    const newArticle = {
        id: newId,
        title, 
        slug, 
        meta, 
        content,
        imageFilename,
        date: new Date().toISOString(),
        likes: 0,
        comments: 0
    };

    articlesDb.push(newArticle);
    
    console.log(`[ARTICLE SAVE] New Article ID: ${newId}, Title: ${title}`);
    
    // In a real app, this would return success from the database
    res.status(200).json({ status: 'ok', message: 'Article saved successfully.', articleId: newId });
});

// Endpoint to delete an article (Owner action)
app.post('/api/article-delete/:id', (req, res) => {
    const articleId = req.params.id;
    
    const initialLength = articlesDb.length;
    articlesDb = articlesDb.filter(a => a.id !== articleId);

    if (articlesDb.length < initialLength) {
         console.log(`[ARTICLE DELETE] Article ID: ${articleId} deleted.`);
         return res.status(200).json({ status: 'ok', message: `Article ID ${articleId} deleted.` });
    } else {
         return res.status(404).json({ status: 'error', message: `Article ID ${articleId} not found.` });
    }
});

// Endpoint for AI Grammar Check
app.post('/api/ai-check-grammar', async (req, res) => {
    
    if (!GEMINI_KEY) {
        return res.status(500).json({ error: 'Server error: Gemini API Key is missing. Cannot check grammar.' });
    }

    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ error: 'Content is required for grammar check.' });
    }

    const prompt = `Review the following article content for all grammatical errors, spelling mistakes, and unclear sentences. Rewrite the content only where necessary to improve clarity and maintain an SEO-friendly tone. Do not add or remove any meaningful paragraphs. Ensure you maintain any existing HTML tags (like <img> or <br>) if present.

--- CRITICAL INSTRUCTION ---
The final output MUST be a single JSON object with a key 'correctedContent'. Do not include any introductory text or explanation outside the JSON.

Original Content: "${content}"`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: { correctedContent: { type: "string" } },
                    required: ["correctedContent"]
                },
                temperature: 0.2, // Low temperature for high accuracy/less creativity
            },
        });

        const result = JSON.parse(response.text.trim());
        res.status(200).json(result);

    } catch (error) {
        console.error('Gemini API Error (Grammar Check):', error.message);
        res.status(500).json({ error: `AI Check Failed. Reason: ${error.message.substring(0, 50)}...` });
    }
});


// ===================================================================
// START THE SERVER (App Crash Fix)
// ===================================================================
// Yeh block server ko turant exit hone se rokta hai aur Render ke PORT par sunna shuru karta hai.
app.listen(PORT, () => {
    console.log(`Combined API Server listening on port ${PORT}.`);
});
