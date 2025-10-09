// index.js (FINAL CODE: SIMULTANEOUS, PROXY, GEMINI UA)

const express = require('express');
const cors = require('cors'); 
const puppeteer = require('puppeteer-core'); 
const chromium = require('@sparticuz/chromium'); 
const { GoogleGenAI } = require('@google/genai'); 

const app = express();
const PORT = process.env.PORT || 10000; 

// --- 1. CONFIGURATION & UTILITIES ---

// ** Puppeteer Args **
const PUPPETEER_ARGS = [
    '--disable-gpu',
    '--disable-setuid-sandbox',
    '--no-sandbox', 
    '--single-process', 
    '--no-zygote',
    '--disable-dev-shm-usage', 
    '--user-data-dir=/tmp/user_data',
    '--ignore-certificate-errors',
    '--window-size=1920,1080'
];

// ⭐ GEMINI SETUP: Key from Environment Variables (Render)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
let ai;
if (GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    console.log("Gemini API initialized for generating unique User Agents.");
} else {
    console.warn("WARNING: GEMINI_API_KEY not found. Using a small hardcoded User Agent list.");
}

// ⭐ PROXY LIST (Used for unique IP/Location) ⭐
const PROXY_LIST = [
    // --- LARGE PROXY LIST FOR MAXIMUM COVERAGE ---
    "http://143.244.52.174:8080", "http://157.245.244.92:3128", "http://143.244.52.173:8080", 
    "http://143.244.52.175:8080", "http://167.99.129.215:3128", "http://143.244.52.176:8080", 
    "http://137.184.184.237:3128", "http://143.244.52.177:8080", "http://137.184.183.197:3128",
    "http://137.184.183.199:3128", "http://165.22.92.203:3128", "http://157.245.242.172:3128",
    "http://137.184.183.196:3128", "http://137.184.183.198:3128", "http://157.245.242.173:3128",
    "http://45.3.44.176:3129", "http://104.207.60.243:3129", "http://216.26.253.178:3129", 
    "http://154.213.166.61:3129", "http://45.3.45.87:3129", "http://104.207.63.195:3129", 
    "http://104.207.61.3:3129", "http://103.111.168.106:3128", "http://103.111.168.108:3128",
    "http://103.111.168.107:3128", "http://103.111.168.109:3128", "http://103.111.168.110:3128",
    "http://103.111.168.111:3128", "http://103.111.168.112:3128", "http://103.111.168.113:3128",
    "http://103.111.168.114:3128", "http://103.111.168.115:3128", "http://103.111.168.116:3128",
    "http://103.111.168.117:3128", "http://103.111.168.118:3128", "http://103.111.168.119:3128",
    "http://103.111.168.120:3128", "http://103.111.168.121:3128", "http://103.111.168.122:3128",
    "http://103.111.168.123:3128", "http://103.111.168.124:3128", "http://103.111.168.125:3128",
    "http://103.111.168.126:3128", "http://103.111.168.127:3128", "http://103.111.168.128:3128",
    "http://103.111.168.129:3128", "http://103.111.168.130:3128", "http://103.111.168.131:3128",
    "http://103.111.168.132:3128", "http://103.111.168.133:3128", "http://103.111.168.134:3128"
];

// Fallback User Agents if Gemini fails or Key is missing
const FALLBACK_USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
]; 

function getRandomProxy() {
    if (PROXY_LIST.length === 0) return null;
    return PROXY_LIST[Math.floor(Math.random() * PROXY_LIST.length)];
}

/**
 * Generates a realistic User Agent string using Gemini API or falls back.
 */
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
        
        const generatedText = response.text.trim();
        if (generatedText) {
            return generatedText.replace(/['"]+/g, ''); 
        }

    } catch (error) {
        console.error("Gemini UA generation failed, falling back:", error.message.substring(0, 50));
        return FALLBACK_USER_AGENTS[Math.floor(Math.random() * FALLBACK_USER_AGENTS.length)];
    }
}


// --- 2. CORS FIX & MIDDLEWARE ---
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
    let proxyUsed = '';
    let userAgentUsed = '';

    // Check input validity
    if (!targetURL || !targetURL.startsWith('http')) {
        return res.status(400).json({ status: 'error', message: 'Invalid URL provided.' });
    }

    try {
        // --- 1. Get Proxy/UA ---
        const proxyUrl = getRandomProxy();
        if (!proxyUrl) throw new Error('Proxy list is empty.');
        
        proxyUsed = proxyUrl;
        userAgentUsed = await getRandomUserAgent(); 

        const ipPort = proxyUrl.replace('http://', ''); 
        const proxyArgs = [
            ...PUPPETEER_ARGS,
            `--proxy-server=${ipPort}` 
        ];

        const chromiumExecutable = await chromium.executablePath(); 

        // --- 2. Launch Browser ---
        browser = await puppeteer.launch({
            args: proxyArgs, 
            executablePath: chromiumExecutable, 
            headless: chromium.headless,
            timeout: 30000, 
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
        
        // --- 4. Engagement (View Time + Scroll) ---
        const totalEngagementTime = durationMs; 
        const numScrolls = Math.floor(Math.random() * 3) + 2; 
        const scrollDelay = Math.floor(totalEngagementTime / numScrolls); 
        
        for (let s = 0; s < numScrolls; s++) {
            const scrollHeight = await page.evaluate(() => {
                return Math.max(
                    document.body ? document.body.scrollHeight : 0, 
                    document.documentElement ? document.documentElement.scrollHeight : 0
                ); 
            });
            
            if (scrollHeight > 1000) { 
                const scrollPercent = Math.random() * (0.9 - 0.3) + 0.3; 
                const targetScroll = Math.min(scrollHeight * scrollPercent, scrollHeight - 100);
                
                await page.evaluate((targetScroll) => {
                    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
                }, targetScroll);

                await new Promise(resolve => setTimeout(resolve, scrollDelay)); 
            } else {
                // If the page is short, wait the remaining time
                await new Promise(resolve => setTimeout(resolve, totalEngagementTime - (scrollDelay * s)));
                break;
            }
        }
        
        res.json({ 
            status: 'success', 
            message: `View complete for ${targetURL}`,
            proxy: proxyUsed,
            userAgent: userAgentUsed 
        });

    } catch (pageError) {
        console.error(`[SLOT ERROR] Proxy: ${proxyUsed}. Error: ${pageError.message.substring(0, 100)}...`);
        
        res.status(500).json({ 
            status: 'error', 
            message: `Load Failed: ${pageError.message.substring(0, 50)}`,
            proxy: proxyUsed || 'N/A',
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
