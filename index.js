// ===================================================================
// index.js (ULTIMATE FINAL VERSION - Part 1/2)
// ===================================================================

// --- Imports (Node.js Modules) ---
const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const nodeFetch = require('node-fetch'); 
const cors = require('cors'); 
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent'); 
// NEW: Import 'http' for non-authenticated proxies, needed for Tool 4
const http = require('http'); 
const { URL } = require('url'); // Added URL import

// --- NEW IMPORT FOR FILE UPLOAD (Requires: npm install multer) ---
const multer = require('multer'); 
// -----------------------------------------------------------------

const app = express();
const PORT = process.env.PORT || 10000; 

// --- ENVIRONMENT VARIABLES AND SETUP ---
const GEMINI_KEY = process.env.GEMINI_KEY; // सुरक्षित रूप से Render Environment में स्टोर है
const HUGGINGFACE_ACCESS_TOKEN = process.env.HUGGINGFACE_ACCESS_TOKEN; // सुरक्षित रूप से Render Environment में स्टोर है

if (!GEMINI_KEY || !HUGGINGFACE_ACCESS_TOKEN) {
    console.error("ERROR: GEMINI_KEY or HUGGINGFACE_ACCESS_TOKEN is missing in environment variables.");
    // exit process for safety or handle gracefully
}

const ai = new GoogleGenAI(GEMINI_KEY);

// --- Middleware Setup ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- MULTER CONFIGURATION FOR VIDEO CONVERTER (Tool 6) ---
const uploadDir = './uploads';

// Upload directory बनाता है यदि वह मौजूद नहीं है
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        // Unique filename generation
        cb(null, `${crypto.randomBytes(16).toString('hex')}-${file.originalname}`);
    }
});

// Middleware for handling single video file upload
// .single('video') field name client-side 'formData.append('video', ...)' से मेल खाना चाहिए
const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 30 * 1024 * 1024 // 30 MB limit
    }
}).single('video'); 
// -----------------------------------------------------------------

// --- Utility Functions ---
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ===================================================================
// 0. STATIC FILE SERVING ENDPOINT (downloads)
// ===================================================================
// यह 'downloads' URL पर ./uploads directory की फ़ाइलों को serve करेगा
app.use('/downloads', express.static(uploadDir));

// ===================================================================
// 1. ROOT ENDPOINT (API: /)
// ===================================================================
app.get('/', (req, res) => {
    res.send('PooreYouTuber Combined API Server is running successfully.');
});

// ===================================================================
// 2. TEXT SUMMARIZATION ENDPOINT (API: /summarize)
// ===================================================================
app.post('/summarize', async (req, res) => {
    const { text } = req.body;
    
    if (!text) {
        return res.status(400).json({ error: 'Text content is required for summarization.' });
    }
    
    try {
        const prompt = `Summarize the following text briefly and concisely for a YouTube video description:\n\n${text}`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: prompt,
        });

        const summary = response.text.trim();
        
        res.json({
            status: 'success',
            summary: summary
        });

    } catch (error) {
        console.error('Gemini Summarization Error:', error);
        res.status(500).json({ error: 'Failed to summarize text using Gemini API.' });
    }
});

// ===================================================================
// 3. IMAGE GENERATION ENDPOINT (API: /generate-image)
// ===================================================================
app.post('/generate-image', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'A prompt is required to generate an image.' });
    }

    try {
        // Hugging Face API Endpoint for a DALL-E style image generator
        const HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";
        
        const hfResponse = await nodeFetch(HUGGINGFACE_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HUGGINGFACE_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: prompt }),
        });

        if (!hfResponse.ok) {
            const errorText = await hfResponse.text();
            throw new Error(`Hugging Face API failed with status ${hfResponse.status}: ${errorText}`);
        }

        // Response is an image file (e.g., JPEG, PNG)
        const imageBuffer = await hfResponse.buffer();
        
        // Image Buffer को Base64 में बदलें
        const base64Image = imageBuffer.toString('base64');
        
        // Base64 image को client को भेजें
        res.json({
            status: 'success',
            base64Image: base64Image,
            mimeType: hfResponse.headers.get('content-type') || 'image/jpeg'
        });

    } catch (error) {
        console.error('Image Generation Error:', error.message);
        res.status(500).json({ error: 'Failed to generate image using Hugging Face API.' });
    }
});

// ===================================================================
// 4. PROXY ENDPOINT (API: /proxy) - For bypassing CORS/Rate Limits
// ===================================================================
app.get('/proxy', async (req, res) => {
    const { url, proxy } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Target URL is required.' });
    }

    try {
        let agent = null;
        let fetchOptions = {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Custom Proxy)',
                'Accept': 'application/json, text/plain, */*'
            },
            // Reject unauthorized certificates, important for proxies
            rejectUnauthorized: false
        };

        if (proxy) {
            const parsedProxy = new URL(proxy);
            const proxyProtocol = parsedProxy.protocol.toLowerCase();

            if (proxyProtocol === 'http:' || proxyProtocol === 'https:') {
                // HttpsProxyAgent for HTTPS proxies, works for HTTP too sometimes
                agent = new HttpsProxyAgent(proxy);
                console.log(`[PROXY] Using proxy: ${proxy}`);
            } else {
                console.warn(`[PROXY] Unsupported proxy protocol: ${proxyProtocol}. Not using proxy.`);
            }
        }
        
        if (agent) {
            fetchOptions.agent = agent;
        }

        const response = await nodeFetch(url, fetchOptions);

        // Client को Headers कॉपी करें
        res.status(response.status);
        response.headers.forEach((value, name) => {
            // कुछ Headers हटा दें जो CORS या सुरक्षा समस्याएँ पैदा कर सकते हैं
            if (name !== 'set-cookie' && name !== 'content-encoding' && name !== 'transfer-encoding') {
                res.set(name, value);
            }
        });

        // Response stream को client को भेजें
        response.body.pipe(res);

    } catch (error) {
        console.error('Proxy Error:', error.message);
        res.status(500).json({ error: `Proxy failed to fetch URL: ${error.message}` });
    }
});

// ===================================================================
// 5. YOUTUBE SCRIPT WRITER ENDPOINT (API: /script-writer)
// ===================================================================
app.post('/script-writer', async (req, res) => {
    const { topic, style } = req.body;
    
    if (!topic || !style) {
        return res.status(400).json({ error: 'Topic and Script Style are required.' });
    }
    
    try {
        const prompt = `Write a high-quality, engaging YouTube video script on the topic: "${topic}". The script must follow the "${style}" style. Include a clear hook, main points, and a strong call-to-action for the audience to subscribe. Format the output clearly with sections (e.g., HOOK, INTRO, MAIN POINT 1, CONCLUSION).`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: prompt,
        });

        const script = response.text.trim();
        
        res.json({
            status: 'success',
            script: script
        });

    } catch (error) {
        console.error('Gemini Script Writer Error:', error);
        res.status(500).json({ error: 'Failed to generate script using Gemini API.' });
    }
});

// ===================================================================
// 6. ANIME VIDEO CONVERTER ENDPOINT (API: /anime-convert) - NEW TOOL 
// ===================================================================
// FIX: Multer को सीधे middleware के रूप में पास किया गया है, 
// 'upload(req, res, callback)' पैटर्न को हटा दिया गया है
app.post('/anime-convert', upload, async (req, res) => {
    
    // Multer upload middleware अब req.file को पॉपुलेट करेगा, 
    // और req.body को भी पॉपुलेट करेगा।
    
    // 1. वीडियो फ़ाइल और स्टाइल की जाँच करें
    const videoFile = req.file; // Multer ने फ़ाइल को यहाँ रखा है
    const style = req.body.style; // Client-side form data से style

    if (!videoFile) {
        // यह Multer error को पूरी तरह से नहीं पकड़ेगा (जैसे size limit), 
        // लेकिन अगर कोई फ़ाइल नहीं मिली तो 400 देना चाहिए।
        return res.status(400).json({ status: 'error', message: 'No video file uploaded or file size limit exceeded (30MB).' });
    }
    if (!style) {
        // style missing होने पर uploaded file को clean up करें
        fs.unlink(videoFile.path, (e) => e && console.error(`[CLEANUP ERROR] Failed to delete temp file: ${e.message}`));
        return res.status(400).json({ status: 'error', message: 'Anime style selection is required.' });
    }
    
    const originalFileName = videoFile.originalname;
    const tempFilePath = videoFile.path;

    console.log(`\n[CONVERTER START] Received file: ${originalFileName} with style: ${style}`);
    
    // 2. AI Conversion Process का सिमुलेशन
    // यहाँ आप वास्तविक AI/ML मॉडल को कॉल कर सकते हैं (जैसे HuggingFace या कस्टम API)
    // इस उदाहरण में, हम एक देरी (delay) का अनुकरण कर रहे हैं।
    
    const conversionTimeMs = randomInt(5000, 15000); 
    console.log(`[CONVERTER SIMULATION] Simulating conversion for ${Math.round(conversionTimeMs/1000)}s...`);
    
    await new Promise(resolve => setTimeout(resolve, conversionTimeMs));
    
    // --- Conversion Finished: Mock File Creation ---
    // असली AI conversion में, एक नई फ़ाइल बनती है। हम यहाँ temp file का नाम बदल रहे हैं।
    const newFileName = `${videoFile.filename.split('-')[0]}-${style}-anime.mp4`;
    const convertedFilePath = `${uploadDir}/${newFileName}`;

    // अपलोड की गई फ़ाइल को "converted" फ़ाइल के नाम में बदलें
    try {
        fs.renameSync(tempFilePath, convertedFilePath);
        console.log(`[CONVERTER SUCCESS] File renamed to: ${newFileName}`);
    } catch (e) {
        console.error(`[CONVERTER RENAME FAIL] Error renaming file ${tempFilePath} to ${convertedFilePath}: ${e.message}`);
        return res.status(500).json({ status: 'error', message: 'Internal error after conversion simulation (File rename failed).' });
    }

    // 3. Download URL बनाएँ
    // यह URL Static Serving Middleware (ऊपर जोड़ा गया) का उपयोग करेगा।
    const downloadUrl = `${req.protocol}://${req.get('host')}/downloads/${newFileName}`;
    
    // 4. Success Response भेजें
    res.status(200).json({ 
        status: 'success', 
        message: `Video successfully converted to ${style} style.`,
        downloadUrl: downloadUrl
    });
    
    // 5. 5 मिनट बाद converted file को साफ़ करें (Temporary storage के लिए महत्वपूर्ण)
    setTimeout(() => {
        // यह सुनिश्चित करने के लिए कि file exists और unlink safe है।
        if (fs.existsSync(convertedFilePath)) {
            fs.unlink(convertedFilePath, (e) => {
                if (e) {
                    console.error(`[CLEANUP FAIL] Could not delete converted file ${convertedFilePath}: ${e.message}`);
                } else {
                    console.log(`[CLEANUP SUCCESS] Deleted temporary converted file: ${convertedFilePath}`);
                }
            });
        } else {
            console.log(`[CLEANUP SKIP] Converted file not found: ${convertedFilePath}`);
        }
    }, 5 * 60 * 1000); // 5 minutes delay
});


// ===================================================================
// --- SERVER START ---\
// ===================================================================
// Sirf ek hi baar server start hoga
app.listen(PORT, () => {
    console.log(`PooreYouTuber Combined API Server is running on port ${PORT}`);
});
