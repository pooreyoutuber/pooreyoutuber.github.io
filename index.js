// index.js (INSTA CAPTION TOOL - Optimized for Render Stability)

const express = require('express');
const cors = require('cors'); 
const { GoogleGenAI } = require('@google/genai'); 

const app = express();
const PORT = process.env.PORT || 10000; 

// --- 1. CONFIGURATION & SETUP ---

// ⭐ GEMINI SETUP: API Key from Environment Variables (Render)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
let ai;
if (GEMINI_API_KEY) {
    try {
        ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        console.log("Gemini API initialized successfully.");
    } catch (e) {
        console.error("Error initializing Gemini API:", e.message);
        ai = null;
    }
} else {
    console.error("CRITICAL: GEMINI_API_KEY not found. API service will not work.");
}

// --- 2. MIDDLEWARE & CORS ---

// Aapko ismein apne frontend ka URL (GitHub Pages) add karna hoga.
const allowedOrigins = ['https://pooreyoutuber.github.io', 'http://localhost:8000'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error('CORS blocked request from:', origin);
            callback(new Error('Not allowed by CORS'), false); 
        }
    },
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).send(`Insta Caption API running. Status: ${ai ? 'Active' : 'Missing Key'}.`);
});

// ===================================================================
// 3. MAIN ENDPOINT: /generate-caption
// ===================================================================
app.post('/generate-caption', async (req, res) => {
    
    if (!ai) {
        return res.status(503).json({ 
            status: 'error', 
            message: 'AI Service Unavailable: API Key is missing or invalid.' 
        });
    }

    const { topic, style } = req.body;
    
    if (!topic) {
        return res.status(400).json({ status: 'error', message: 'Please provide a topic for the caption.' });
    }

    // Prompt jo Insta Caption generate karega
    const systemInstruction = `You are a professional social media caption writer for Instagram. Your response must be creative, engaging, and ONLY contain the caption text and relevant hashtags. DO NOT include greetings, explanations, or any extra text.`;
    
    const userPrompt = `Create a short, engaging Instagram caption with relevant hashtags for a post about: "${topic}". The required tone/style is: "${style || 'fun and motivational'}".`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // Fast and effective model
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.8, // Thoda creative output ke liye
            }
        });

        // Response ko clean karke bhej rahe hain
        const caption = response.text.trim();
        
        res.json({ 
            status: 'success', 
            caption: caption 
        });

    } catch (error) {
        console.error(`Gemini API Error: ${error.message}`);
        res.status(500).json({ 
            status: 'error', 
            message: `Failed to generate caption. Please check the topic and try again.`
        });
    }
});


// ===================================================================
// 4. START THE SERVER 
// ===================================================================
app.listen(PORT, () => {
    console.log(`Insta Caption API Server listening on port ${PORT}.`);
});
