// Insta Caption Generator and Website Booster API Logic

const express = require('express');
// ⚠️ Gemini SDK को इम्पोर्ट करना ज़रूरी है
const { GoogleGenAI } = require('@google/genai'); 
const cors = require('cors'); 
// ⚠️ यदि आपके Booster Logic में node-fetch का उपयोग होता है, तो इसे अन-कमेंट करें
// const fetch = require('node-fetch'); 

const app = express();
const port = process.env.PORT || 3000;

// Gemini Client Initialization
// यह Render Secrets में रखी GEMINI_API_KEY का उपयोग करेगा।
const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);

// Middleware Setup
// CORS configuration to allow requests from your frontend
app.use(cors({
    origin: 'https://pooreyoutuber-github-io.onrender.com', // ⚠️ आपके frontend का URL
    methods: ['GET', 'POST'],
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
   इस सेक्शन में अपना मौजूदा Website Booster का 'app.post()' कोड पेस्ट करें। 
   उदाहरण के लिए, यदि आपका बूस्टर एंडपॉइंट '/api/booster' है:
   
   app.post('/api/booster', async (req, res) => {
       // Your existing logic using req.body and node-fetch
       // ...
       res.status(200).json({ status: "Booster request received." });
   });

   ----------------------------------------------------------
*/


// ===================================================================
// 2. NEW GEMINI CAPTION GENERATOR ENDPOINT
// ===================================================================
app.post('/api/gemini/generate', async (req, res) => {
    // Security and setup check
    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY not found.' });
    }
    
    const { reelTitle } = req.body;

    if (!reelTitle) {
        return res.status(400).json({ error: 'Reel topic (reelTitle) is required.' });
    }

    // Gemini Prompt with JSON Schema for reliable output
    const prompt = `Generate 10 trending, catchy, and viral Instagram Reels captions in a mix of English and Hindi for the reel topic: "${reelTitle}". Each caption must be followed by 3-5 relevant, high-reach hashtags on a new line. The output MUST be a JSON array of objects, where each object has a single key called 'caption'.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                // Force structured JSON output
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
                temperature: 0.8, // For creativity
            },
        });

        const captions = JSON.parse(response.text.trim());
        
        res.status(200).json({ captions: captions });

    } catch (error) {
        console.error('Gemini API Error:', error.message);
        res.status(500).json({ 
            error: 'Failed to generate captions. Please check your GEMINI_API_KEY and service logs.',
        });
    }
});


// ===================================================================
// START THE SERVER (Ensure this is at the end of the file)
// ===================================================================
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
