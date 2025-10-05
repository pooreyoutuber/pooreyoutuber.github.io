const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const cors = require('cors');

// Load environment variables (dotenv is primarily for local testing)
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize the GoogleGenAI client
// It automatically uses the GEMINI_API_KEY from Render environment variables.
if (!process.env.GEMINI_API_KEY) {
    console.error("FATAL: GEMINI_API_KEY is not set in environment variables.");
    // In a production app, you might crash the process here.
}
const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);

// Middleware
// CORS Configuration: ONLY allows requests from your specific frontend domain for security
app.use(cors({
    origin: 'https://pooreyoutuber-github-io.onrender.com', 
    methods: ['POST'],
}));
app.use(express.json());

// ----------------------------------------------------
// Health Check Endpoint
// ----------------------------------------------------
app.get('/', (req, res) => {
    res.status(200).send('Caption Generator API is running successfully!');
});


// ----------------------------------------------------
// Main Caption Generation Endpoint
// ----------------------------------------------------
app.post('/api/generate', async (req, res) => {
    const { reelTitle } = req.body;

    if (!reelTitle) {
        return res.status(400).json({ error: 'Reel title is required.' });
    }

    // Detailed prompt instructing Gemini on format and content
    const prompt = `Generate 10 trending, catchy, and viral Instagram Reels captions in a mix of English and Hindi for the reel topic: "${reelTitle}". Each caption must be followed by 3-5 relevant, high-reach hashtags on a new line. The output MUST be a JSON array of objects, where each object has a single key called 'caption'.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                // Force the model to return a valid JSON structure
                responseMimeType: "application/json",
                responseSchema: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            caption: {
                                type: "string",
                                description: "A catchy Instagram reel caption with relevant hashtags."
                            }
                        },
                        required: ["caption"]
                    }
                },
                temperature: 0.8, // Slightly higher temperature for creative captions
            },
        });

        // The response text is a JSON string, which we parse
        const captions = JSON.parse(response.text.trim());
        
        // Return the captions array to the frontend
        res.status(200).json({ captions: captions });

    } catch (error) {
        console.error('Gemini API Error:', error.message);
        // Send a generic error message back to the frontend
        res.status(500).json({ 
            error: 'Failed to generate captions. Check the server logs for details.',
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
