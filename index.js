// index.js (FINAL CODE: PROXY REMOVED FOR STABILITY)

const express = require('express');
const cors = require('cors'); 
const puppeteer = require('puppeteer-core'); 
const chromium = require('@sparticuz/chromium'); 
const { GoogleGenAI } = require('@google/genai'); 

const app = express();
const PORT = process.env.PORT || 10000; 

// --- 1. CONFIGURATION & UTILITIES ---

// ** Puppeteer Args - Optimized for stability **
const PUPPETEER_ARGS = [
    '--disable-gpu',
    '--disable-setuid-sandbox',
    '--no-sandbox', 
    '--single-process', 
    '--no-zygote',
    '--disable-dev-shm-usage', 
    '--shm-size=128mb', 
    '--user-data-dir=/tmp/user_data',
    '--ignore-certificate-errors',
    '--window-size=1920,1080',
    '--disable-web-security' 
    // PROXY ARGUMENTS REMOVED HERE
];

// ⭐ GEMINI SETUP: Key from Environment Variables (Render)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
let ai;
if (GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
} else {
    console.warn("WARNING: GEMINI_API_KEY not found. Using a small hardcoded User Agent list.");
}

// ⭐ PROXY LIST REMOVED - Using Render's own IP for stability.

const FALLBACK_USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
]; 

// getRandomProxy function removed

async function getRandomUserAgent() {
    if (!ai) {
        return FALLBACK_USER_AGENTS[Math.floor(Math.random() * FALLBACK_USER_AGENTS.length)];
    }
    
    try {
        const prompt = "Generate a single, realistic, and unique user agent string for a modern browser (Chrome, Firefox, Safari) on a desktop or mobile OS. Return ONLY the user agent string and nothing else.";
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: prompt,
            config: {
                systemInstruction: "You are a specialized tool for generating browser User Agent strings. You must return only a single string.",
                temperature: 0.9, 
            }
        });
        return response.text.trim().replace(/['"]+/g, ''); 
    } catch (error) {
        console.error(`Gemini UA generation failed, falling back: ${error.message.substring(0, 50)}...`);
        return FALLBACK_USER_AGENTS[Math.floor(Math.random() * FALLBACK_USER_AGENTS.length)];
    }
}


// --- 2. CORS FIX & MIDDLEWARE (No Change) ---
const allowedOrigins = ['https://pooreyoutuber.github.io', 'http://localhost:8000'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
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
    res.status(200).send(`PooreYouTuber API running. Gemini status: ${ai ? 'Active' : 'Fallback Mode'}.`);
});


// ===================================================================
// 3. SINGLE SLOT RUNNER ENDPOINT: /run-slot
// ===================================================================
app.post('/run-slot', async (req, res) => {
    
    const targetURL = req.body.url;
    const durationMs = parseInt(req.body.duration) || 9000; 
    let browser = null;
    let userAgentUsed = '';

    if (!targetURL || !targetURL.startsWith('http')) {
        return res.status(400).json({ status: 'error', message: 'Invalid URL provided.' });
    }

    try {
        // --- 1. Get UA ---
        userAgentUsed = await getRandomUserAgent(); 

        const chromiumExecutable = await chromium.executablePath(); 

        // --- 2. Launch Browser (WITHOUT PROXY) ---
        browser = await puppeteer.launch({
            args: PUPPETEER_ARGS, // Now only includes stability arguments
            executablePath: chromiumExecutable, 
            headless: chromium.headless,
            timeout: 35000, 
        });
        
        let page = await browser.newPage();
        
        await page.setUserAgent(userAgentUsed); 
        await page.setViewport({ width: 1920, height: 1080 }); 
        await page.setExtraHTTPHeaders({'Referer': 'https://www.google.com/'});
        
        // --- 3. Page Navigate (Load) ---
        await page.goto(targetURL, { 
            waitUntil: 'domcontentloaded', 
            timeout: 60000 
        });
        
        // --- 4. Engagement (Improved Scroll Logic - UNCHANGED) ---
        const totalEngagementTime = durationMs; 
        const scrollPoints = 3; 
        const scrollDelay = Math.floor(totalEngagementTime / scrollPoints); 
        
        const scrollHeight = await page.evaluate(() => {
            return Math.max(
                document.body ? document.body.scrollHeight : 0, 
                document.documentElement ? document.documentElement.scrollHeight : 0
            ); 
        });

        if (scrollHeight > 1000) { 
            // 1. Scroll to the middle (randomize 40% to 60%)
            let targetScroll = Math.floor(scrollHeight * (Math.random() * (0.6 - 0.4) + 0.4));
            await page.evaluate((targetScroll) => {
                window.scrollTo({ top: targetScroll, behavior: 'smooth' });
            }, targetScroll);
            await new Promise(resolve => setTimeout(resolve, scrollDelay)); 
            
            // 2. Scroll to the top (0)
            await page.evaluate(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            await new Promise(resolve => setTimeout(resolve, scrollDelay)); 

            // 3. Scroll to a random bottom position (70% to 90%)
            targetScroll = Math.floor(scrollHeight * (Math.random() * (0.9 - 0.7) + 0.7));
            await page.evaluate((targetScroll) => {
                window.scrollTo({ top: targetScroll, behavior: 'smooth' });
            }, targetScroll);
            await new Promise(resolve => setTimeout(resolve, scrollDelay)); 

        } else {
            await new Promise(resolve => setTimeout(resolve, totalEngagementTime));
        }
        
        res.json({ 
            status: 'success', 
            message: `View complete for ${targetURL}`,
            proxy: 'N/A (Direct Load)', // Proxy information removed
            userAgent: userAgentUsed 
        });

    } catch (pageError) {
        if (pageError.message.includes('ETXTBSY')) {
            console.error(`[CRITICAL ERROR]: Spawn ETXTBSY. Render resource issue. (Direct Load)`);
        } else {
            console.error(`[SLOT ERROR] Error: ${pageError.message.substring(0, 100)}...`);
        }
        
        res.status(500).json({ 
            status: 'error', 
            message: `Load Failed: ${pageError.message.substring(0, 50)}`,
            proxy: 'N/A (Direct Load)',
            userAgent: userAgentUsed || 'N/A (Error)'
        });
        
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch(e) {
                console.error(`[CLEANUP WARNING]: Error closing browser: ${e.message}`);
            }
        }
    }
});


// ===================================================================
// 4. START THE SERVER 
// ===================================================================
app.listen(PORT, () => {
    console.log(`Combined API Server listening on port ${PORT}.`);
});
