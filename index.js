// index.js (The Main Router and Logic Container)

const express = require('express');
const cors = require('cors'); 
const fs = require('fs/promises');
const path = require('path');
const { GoogleGenAI } = require('@google/genai'); 

// --- CONFIGURATION & INIT ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const PORT = process.env.PORT || 10000; 
const OWNER_DELETE_KEY = process.env.OWNER_DELETE_KEY || 'default-secret'; 
const ARTICLES_FILE = path.join(__dirname, 'articles.json');

// Global AI setup
let ai;
if (GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    console.log("Gemini API initialized.");
} else {
    console.warn("WARNING: GEMINI_API_KEY not found. Some features will use fallbacks.");
}

const app = express();
app.use(cors({ origin: '*', methods: 'GET,POST,DELETE' })); 
app.use(express.json());


// --- FALLBACKS & HELPERS ---
const FALLBACK_UAS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.143 Mobile Safari/537.36'
];
const PROXY_LIST = [null]; // Proxy for Booster Tool (Client-side)

async function generateUserAgent() {
    if (!ai) return FALLBACK_UAS[Math.floor(Math.random() * FALLBACK_UAS.length)];
    // ... (Gemini UA generation logic) ...
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
        return response.text.trim().replace(/^[`"]|[`"]$/g, '');
    } catch (error) {
        return FALLBACK_UAS[Math.floor(Math.random() * FALLBACK_UAS.length)];
    }
}


// ----------------------------------------------------------------------
//                       A. ARTICLE TOOL LOGIC (API: /api/articles)
// ----------------------------------------------------------------------

async function getArticles() {
    try {
        const data = await fs.readFile(ARTICLES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        console.error("Error reading articles file:", error);
        return [];
    }
}

async function saveArticles(articles) {
    try {
        await fs.writeFile(ARTICLES_FILE, JSON.stringify(articles, null, 2), 'utf8');
    } catch (error) {
        console.error("Error writing articles file:", error);
        throw new Error("Failed to save article data.");
    }
}

app.get('/api/articles', async (req, res) => {
    const articles = await getArticles();
    res.json(articles);
});

app.post('/api/articles', async (req, res) => {
    const { author, title, content } = req.body;
    if (!author || !title || !content) return res.status(400).json({ status: 'error', message: 'All fields required.' });

    const newArticle = {
        author, title, content,
        timestamp: Date.now(),
        likes: 0,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9)
    };

    const articles = await getArticles();
    articles.unshift(newArticle);
    await saveArticles(articles);
    res.json({ status: 'success', message: 'Article published successfully!', article: newArticle });
});

app.delete('/api/articles/:id', async (req, res) => {
    const articleId = req.params.id;
    const { deleteKey } = req.body; 

    if (deleteKey !== OWNER_DELETE_KEY) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized. Invalid Owner Delete Key.' });
    }

    const articles = await getArticles();
    const newArticles = articles.filter(a => a.id !== articleId);

    if (newArticles.length === articles.length) {
        return res.status(404).json({ status: 'error', message: 'Article not found.' });
    }

    await saveArticles(newArticles);
    res.json({ status: 'success', message: 'Article deleted permanently.' });
});


// ----------------------------------------------------------------------
//                      B. WEBSITE BOOSTER LOGIC (API: /api/booster/config)
// ----------------------------------------------------------------------

app.get('/api/booster/config', async (req, res) => {
    const userAgent = await generateUserAgent();
    const proxy = PROXY_LIST[Math.floor(Math.random() * PROXY_LIST.length)];

    res.json({
        status: 'success',
        config: {
            userAgent: userAgent,
            proxy: proxy,
            maxSlots: 2,
            minDuration: 5, 
            maxDuration: 8  
        }
    });
});


// ----------------------------------------------------------------------
//                   C. INSTA CAPTION LOGIC (API: /api/caption)
// ----------------------------------------------------------------------

app.post('/api/caption', async (req, res) => {
    const { topic, style } = req.body;
    if (!topic || !style || !ai) {
        return res.status(400).json({ status: 'error', message: 'Topic, style required, and Gemini API must be configured.' });
    }

    try {
        const prompt = `Generate 5 unique, engaging Instagram captions based on the topic: "${topic}". The style should be: "${style}". Include relevant emojis and 5-7 popular hashtags. Return only the captions and hashtags, formatted cleanly.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [prompt],
            config: {
                systemInstruction: "You are a creative Instagram caption expert. Be concise and engaging.",
                temperature: 0.8,
                maxOutputTokens: 800
            }
        });
        
        res.json({
            status: 'success',
            caption: response.text
        });

    } catch (error) {
        console.error("Caption generation failed:", error);
        res.status(500).json({ status: 'error', message: 'Failed to generate caption due to a server or API error.' });
    }
});


// --- SERVER START ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`All-in-One API Server listening on port ${PORT}.`);
    console.log(`Endpoints: /api/articles, /api/booster/config, /api/caption`);
});
