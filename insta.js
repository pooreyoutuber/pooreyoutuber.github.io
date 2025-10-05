// TOP OF YOUR SERVER FILE (e.g., server.js or insta.js)
const express = require('express');
const { GoogleGenAI } = require('@google/genai'); // Import Gemini SDK
const cors = require('cors'); 
// const fetch = require('node-fetch'); // If you need node-fetch for your old booster tool

const app = express();
const port = process.env.PORT || 3000;

// Initialize the GoogleGenAI client (will look for GEMINI_API_KEY)
const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(cors()); // Allow all origins for simplicity, or specify your frontend URL
app.use(express.json());

// -------------------------------------------------------------------
// 1. YOUR EXISTING WEBSITE BOOSTER LOGIC HERE
// -------------------------------------------------------------------

// Example of your existing endpoint (KEEP THIS, DO NOT CHANGE IT)
// app.post('/api/booster', async (req, res) => {
//     // Your current insta.js logic for website boosting goes here...
//     // For example:
//     // const { url, cid } = req.body;
//     // await fetch(`https://www.google-analytics.com/collect?v=1&tid=UA-XXXXX-Y&cid=${cid}&t=pageview&dp=${url}`);
//     res.status(200).json({ message: "Booster request processed." });
// });


// -------------------------------------------------------------------
// 2. NEW GEMINI CAPTION GENERATOR ENDPOINT
// -------------------------------------------------------------------
app.post('/api/gemini/generate', async (req, res) => {
    // Check if the API key is available
    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY not found in Render secrets.' });
    }
    
    const { reelTitle } = req.body;

    if (!reelTitle) {
        return res.status(400).json({ error: 'Reel title is required.' });
    }

    // Detailed prompt for Gemini
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
        
        // Return generated captions
        res.status(200).json({ captions: captions });

    } catch (error) {
        console.error('Gemini API Error:', error.message);
        res.status(500).json({ 
            error: 'Failed to generate captions. Check API Key and server logs.',
        });
    }
});

// Start the server (Make sure this is the last part of your file)
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
