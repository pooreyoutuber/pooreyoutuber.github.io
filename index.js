// index.js (Backend: Proxy/UA Provider for Frontend)

const express = require('express');
const cors = require('cors'); 
const { GoogleGenAI } = require('@google/genai'); 

// --- CONFIGURATION ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const PORT = process.env.PORT || 10000; // RENDER DEFAULT PORT

// ⭐ PROXY LIST (Frontend mein direct proxy apply karna mushkil hai, yeh sirf jankari ke liye hai) ⭐
const PROXY_LIST = [
    null, // Direct connection (Default)
    // Aap yahan HTTPS proxies daal sakte hain, lekin unhe browser extension se hi apply karna padega.
]; 

// Fallback User Agents
const FALLBACK_UAS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.143 Mobile Safari/537.36'
];

let ai;
if (GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    console.log("Gemini API initialized.");
} else {
    console.warn("WARNING: GEMINI_API_KEY not found. Using small hardcoded User Agents list.");
}

const app = express();
// CORS enable kiya gaya hai taki aapki HTML file is API ko call kar sake
app.use(cors({
    origin: '*', // Sabhi origins ko allow karta hai
    methods: 'GET,POST'
})); 
app.use(express.json());


// --- Dynamic UA Generator (Gemini se UA generate karne ka logic) ---
async function generateUserAgent() {
    if (!ai) return FALLBACK_UAS[Math.floor(Math.random() * FALLBACK_UAS.length)];
    
    try {
        const prompt = "Generate one single, valid, modern, non-bot desktop or mobile browser User-Agent string. Only return the string itself, nothing else.";
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [prompt],
            config: {
                systemInstruction: "You are an expert in generating realistic and current browser User-Agent strings. Output only the requested string.",
                temperature: 0.9,
                maxOutputTokens: 200
            }
        });
        let userAgent = response.text.trim().replace(/^[`"]|[`"]$/g, '');
        return userAgent;
    } catch (error) {
        console.error("Gemini UA generation failed, using fallback.");
        return FALLBACK_UAS[Math.floor(Math.random() * FALLBACK_UAS.length)];
    }
}


// --- API ENDPOINT (Provide Configuration to Client) ---
app.get('/get-config', async (req, res) => {
    // Note: Frontend JS User Agent nahi badal sakta, yeh server se report hoga.
    // Lekin hum server-side UA fetch karke client ko bhejte hain.
    
    const userAgent = await generateUserAgent();
    const proxy = PROXY_LIST[Math.floor(Math.random() * PROXY_LIST.length)];

    res.json({
        status: 'success',
        config: {
            // Hum User Agent bhejh rahe hain, jise client display kar sake
            userAgent: userAgent, 
            proxy: proxy,
            maxSlots: 2,
            minDuration: 5, // 5 seconds (random pattern ki shuruwat)
            maxDuration: 8  // 8 seconds (random pattern ki aakhri limit)
        }
    });
});


// --- SERVER START ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Config Provider API Server listening on port ${PORT}.`);
});
