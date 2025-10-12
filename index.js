    // index.js (Reads API Key from the Secret File named 'gemini')

import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto'; 
import fs from 'fs'; // Import the File System module
import path from 'path';
import { fileURLToPath } from 'url';

// --- Configuration ---
const PORT = process.env.PORT || 10000; 

// --- Secret File Configuration ---
// The secret file named 'gemini' is mounted by Render at this path
const SECRET_FILE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'gemini');

let API_KEY;
let ai; 

// --- Key Loading Logic ---
try {
    // 1. Try reading the file from the root directory (for non-Docker services)
    // The key is assumed to be the entire content of the file
    API_KEY = fs.readFileSync(SECRET_FILE_PATH, 'utf8').trim();
    
    // 2. Fallback check for the standard Render secrets path (optional, but good practice)
    // if (!API_KEY) {
    //     const RENDER_SECRET_PATH = '/etc/secrets/gemini';
    //     API_KEY = fs.readFileSync(RENDER_SECRET_PATH, 'utf8').trim();
    // }

    if (API_KEY) {
        ai = new GoogleGenAI(API_KEY); 
        console.log("Gemini AI Client initialized successfully from Secret File.");
    } else {
         console.error("FATAL: Secret File 'gemini' is empty.");
    }

} catch (e) {
    // If the file cannot be read (e.g., file not found or permission error)
    console.error(`FATAL: Failed to read Secret File 'gemini'. Error: ${e.message}`);
}

// --- Dummy Database for SEO Article Publisher ---
let articlesDb = []; 

// --- Initialization & Middleware ---
const app = express();
app.use(express.json({ limit: '5mb' })); 
app.use(cors({ origin: '*', methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', credentials: true }));

// --- Utility Functions for AI Calls ---

/**
 * Handles the call to the Gemini API with specified prompt and configuration.
 */
async function generateText(prompt, systemInstruction, responseMimeType, responseSchema) {
    if (!API_KEY || !ai) {
        throw new Error("API Key Missing or not initialized. Check server logs.");
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
        throw new Error(`AI Request Failed: ${error.message.substring(0, 150)}...`);
    }
}

// ===================================================================
// 1. ROOT & HEALTH CHECK
// ===================================================================
app.get('/', (req, res) => {
    const keyStatus = API_KEY ? 'Key Loaded' : 'Key Missing';
    res.send(`API Server is running successfully on port ${PORT}. Status: Ready. Key Status: ${keyStatus}`);
});

// ===================================================================
// 2. WEBSITE TRAFFIC BOOSTER ENDPOINT (URL: /boost-mp)
// ===================================================================
app.post('/boost-mp', (req, res) => {
    const { ga_id, views } = req.body;
    
    if (!ga_id || !views) {
        return res.status(400).json({ error: 'Missing GA4 ID or views count.' });
    }
    
    console.log(`[BOOST] Request accepted: GA_ID: ${ga_id}, Views: ${views}`);
    res.status(202).json({ 
        status: 'accepted', 
        message: `Request for ${views} views accepted for processing. Check Google Analytics in 24-48 hours.`,
    });
});

// ===================================================================
// 3. AI CAPTION GENERATOR ENDPOINTS (Uses Secret File Key)
// ===================================================================

app.post('/api/ai-caption-generate', async (req, res) => {
    const { description, count } = req.body;

    if (!description || !count) {
        return res.status(400).json({ error: 'Description and count are required.' });
    }
    
    const prompt = `Act as an expert Instagram content creator. Generate exactly ${count} unique, engaging captions in Hindi or Hinglish. Each MUST include 5 relevant hashtags separated by a new line. Description: "${description}"`;

    const systemInstruction = "Your final output MUST be a single JSON object with a key 'captions' containing an array of strings. Do not include any introductory text or explanation outside the JSON.";

    const schema = { type: "object", properties: { captions: { type: "array", items: { type: "string" } } }, required: ["captions"] };

    try {
        const rawResponse = await generateText(prompt, systemInstruction, "application/json", schema);
        const result = JSON.parse(rawResponse);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ai-caption-edit', async (req, res) => {
    const { originalCaption, requestedChange } = req.body;

    if (!originalCaption || !requestedChange) {
        return res.status(400).json({ error: 'Original caption and requested change are required.' });
    }
    
    const prompt = `Edit the 'Original Caption' based on the 'Requested Change'. Ensure the edited caption has 5 relevant and trending hashtags, separated from the text by a new line. Use Hindi or Hinglish.
Original Caption: "${originalCaption}"
Requested Change: "${requestedChange}"`;

    const systemInstruction = "Your final output MUST be a single JSON object with a key called 'editedCaption'. Do not include any introductory text or explanation outside the JSON.";
    
    const schema = { type: "object", properties: { editedCaption: { type: "string" } }, required: ["editedCaption"] };

    try {
        const rawResponse = await generateText(prompt, systemInstruction, "application/json", schema);
        const result = JSON.parse(rawResponse);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===================================================================
// 4. SEO ARTICLE PUBLISHER ENDPOINTS (Uses Secret File Key)
// ===================================================================

app.post('/api/article-upload', (req, res) => {
    const { title, slug, content } = req.body;
    if (!title || !slug || !content) {
        return res.status(400).json({ error: 'Title, Slug, and Content are required.' });
    }
    const newId = crypto.randomUUID(); 
    const newArticle = { id: newId, title, slug, content, date: new Date().toISOString() };
    articlesDb.push(newArticle);
    res.status(200).json({ status: 'ok', message: 'Article saved successfully.', articleId: newId });
});

app.post('/api/ai-check-grammar', async (req, res) => {
    const { content } = req.body;
    if (!content) {
        return res.status(400).json({ error: 'Content is required for grammar check.' });
    }
    
    const prompt = `Review the following article content for errors, spelling mistakes, and unclear sentences. Rewrite the content only where necessary to improve clarity and maintain an SEO-friendly tone. Do not add or remove any meaningful paragraphs.

Original Content: "${content}"`;

    const systemInstruction = "Your final output MUST be a single JSON object with a key 'correctedContent'. Provide only the corrected content as a string. Do not include any introductory text or explanation outside the JSON.";
    
    const schema = { type: "object", properties: { correctedContent: { type: "string" } }, required: ["correctedContent"] };

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
