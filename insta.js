// Insta Caption Generator and Website Booster API Logic

const express = require('express');
const { GoogleGenAI } = require('@google/genai'); // Gemini SDK Import
const cors = require('cors'); 
// const fetch = require('node-fetch'); // If needed for your booster logic

const app = express();
const port = process.env.PORT || 3000;

// Gemini Client Initialization
const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);

// Middleware Setup
// Configure CORS to allow your GitHub Pages frontend (https://pooreyoutuber.github.io)
app.use(cors({
    origin: 'https://pooreyoutuber.github.io', 
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

// Basic Health Check Endpoint
app.get('/', (req, res) => {
    res.status(200).send('API service is running and ready for both tools!');
});


// ===================================================================
// 1. YOUR EXISTING WEBSITE BOOSTER LOGIC (PASTE HERE)
// ===================================================================

/* ----------------------------------------------------------
   *** महत्वपूर्ण ***: 
   कृपया अपना मौजूदा Website Booster का 'app.post()' कोड यहाँ पेस्ट करें। 
   
   उदाहरण (इसे अपने कोड से बदलें):
   
   app.post('/api/booster', async (req, res) => {
       // Your existing logic to handle traffic boosting...
       res.status(200).json({ status: "Booster request received." });
   });

   ----------------------------------------------------------
*/


// ===================================================================
// 2. NEW GEMINI CAPTION GENERATOR ENDPOINT
// ===================================================================
app.post('/api/gemini/generate', async (req, res) => {
    // Check for API Key presence
    if (!process.env.GEMINI_API_KEY) {
        console.error('FATAL: GEMINI_API_KEY is not set in Render secrets.');
        return res.status(500).json({ error: 'Server configuration error: Gemini API Key is missing.' });
    }
    
    const { reelTitle } = req.body;

    if (!reelTitle) {
        return res.status(400).json({ error: 'Reel topic (reelTitle) is required.' });
    }

    // Gemini Prompt with forced JSON Schema
    const prompt = `Generate 10 trending, catchy, and viral Instagram Reels captions in a mix of English and Hindi for the reel topic: "${reelTitle}". Each caption must be followed by 3-5 relevant, high-reach hashtags on a new line. The output MUST be a JSON array of objects, where each object has a single key called 'caption'.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            caption: {
                                type: "string"
                            }
                        },
                        required: ["caption"]
                    }
                },
                temperature: 0.8,
            },
        });

        const captions = JSON.parse(response.text.trim());
        
        res.status(200).json({ captions: captions });

    } catch (error) {
        console.error('Gemini API Error:', error.message);
        res.status(500).json({ 
            error: 'Failed to generate captions. Check server logs for API details.',
        });
    }
});


// ===================================================================
// START THE SERVER
// ===================================================================
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
