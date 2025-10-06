// insta.js (FOR AI INSTA CAPTION GENERATOR SERVICE ONLY)

const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const cors = require('cors'); 

const app = express();
const PORT = process.env.PORT || 10000; // Render will use its own PORT env variable

// Gemini Client Initialization
// Ensure GEMINI_API_KEY is set in this new Render service's secrets.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Middleware Setup
app.use(cors({
    origin: 'https://pooreyoutuber.github.io', // Your frontend URL
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

// Basic Health Check Endpoint
app.get('/', (req, res) => {
    res.status(200).send('Insta Caption Generator API is running!');
});


// --- Insta Caption Generator Endpoint ---
app.post('/api/caption-generate', async (req, res) => { // Endpoint changed to /api/caption-generate
    
    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Server configuration error: Gemini API Key is missing.' });
    }
    
    const { reelTitle, style } = req.body;

    if (!reelTitle) {
        return res.status(400).json({ error: 'Reel topic (reelTitle) is required.' });
    }
    
    const prompt = `Generate 10 unique, trending, and viral Instagram Reels captions in a mix of English and Hindi for the reel topic: "${reelTitle}". The style should be: "${style || 'Catchy and Funny'}". Each caption must be followed by 3-5 relevant, high-reach hashtags on a new line. The output MUST be a JSON array of objects, where each object has a single key called 'caption'.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "array",
                    items: { type: "object", properties: { caption: { type: "string" } }, required: ["caption"] }
                },
                temperature: 0.8,
            },
        });

        const captions = JSON.parse(response.text.trim());
        res.status(200).json({ captions: captions });

    } catch (error) {
        console.error('Gemini API Error:', error.message);
        res.status(500).json({ error: 'Failed to generate captions. Please check server logs.' });
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Insta Caption API Server listening on port ${PORT}.`);
});
