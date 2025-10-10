// index.js (2-Slot Concurrent System for Render)

const express = require('express');
const cors = require('cors'); 
const puppeteer = require('puppeteer-core'); 
const { GoogleGenAI } = require('@google/genai'); 
const { createRequire } = require('module');
const customRequire = createRequire(__filename);

// --- CONFIGURATION ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const PORT = process.env.PORT || 10000; // RENDER DEFAULT PORT
const MAX_CONCURRENT_SLOTS = 2; 
const DELAY_BETWEEN_VIEWS_MS = 1000; 

// ⭐ PROXY LIST - APNE PROXY YAHAN DAALEIN ⭐
const PROXY_LIST = [
    null, // Slot 1: Direct connection (ya koi proxy)
    // 'http://user:pass@ip:port', 
    // 'http://another.proxy.com:8080' 
]; 

// Puppeteer arguments (CRITICAL FIX for environment)
const PUPPETEER_ARGS = [
    '--no-sandbox', 
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--single-process',
    '--no-zygote',
    '--incognito'
];

// Fallback User Agents
const FALLBACK_UAS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.143 Mobile Safari/537.36'
];

// --- QUEUE SYSTEM ---
const requestQueue = []; 
let activeSlots = 0;

const app = express();
app.use(cors()); 
app.use(express.json());

let ai;
if (GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    console.log("Gemini API initialized.");
} else {
    console.warn("WARNING: GEMINI_API_KEY not found. Using small hardcoded User Agents list.");
}


// --- Dynamic UA Generator ---
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
        let userAgent = response.text.trim();
        if (userAgent.startsWith('`') || userAgent.startsWith('"')) {
            userAgent = userAgent.replace(/^[`"]|[`"]$/g, '');
        }
        return userAgent;
    } catch (error) {
        console.error("Gemini UA generation failed, using fallback.");
        return FALLBACK_UAS[Math.floor(Math.random() * FALLBACK_UAS.length)];
    }
}


// --- CORE PUPPETEER LOGIC ---
async function runSlot(taskItem) {
    const { url, duration, viewIndex } = taskItem;
    let browser;
    let page;
    
    const proxy = PROXY_LIST[viewIndex % PROXY_LIST.length];
    const launchArgs = [...PUPPETEER_ARGS];
    if (proxy) launchArgs.push(`--proxy-server=${proxy}`);

    const userAgent = await generateUserAgent();
    
    activeSlots++;
    console.log(`[SLOT ${activeSlots}/${MAX_CONCURRENT_SLOTS}] Launching view ${viewIndex + 1}...`);

    try {
        // RENDER FIX: Puppeteer ko chrome binary ka path chahiye
        browser = await puppeteer.launch({
            args: launchArgs, 
            headless: true, 
            executablePath: '/usr/bin/google-chrome', 
            timeout: 35000, 
        });

        page = await browser.newPage();
        await page.setUserAgent(userAgent);
        page.setDefaultNavigationTimeout(duration + 10000); 

        console.log(`[VIEW ${viewIndex + 1}] Navigating to ${url}. Proxy: ${proxy || 'Direct'}`);

        const startTime = Date.now();
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const loadTime = Date.now() - startTime;
        const remainingTime = duration - loadTime;

        if (remainingTime > 1000) {
            console.log(`[VIEW ${viewIndex + 1}] Viewing for ${Math.round(remainingTime/1000)}s.`);
            await new Promise(resolve => setTimeout(resolve, remainingTime));
        }

        return { status: 'success', duration: Math.round((Date.now() - startTime) / 1000) };

    } catch (error) {
        console.error(`[VIEW ${viewIndex + 1} ERROR] Failed to load/view: ${error.message.substring(0, 80)}`);
        return { status: 'error', error: error.message };
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
        activeSlots--;
        console.log(`[SLOT] View ${viewIndex + 1} finished. Active slots: ${activeSlots}`);
        setTimeout(processQueue, 100); 
    }
}


// --- ASYNCHRONOUS QUEUE PROCESSOR (Concurrency handler) ---
async function processQueue() {
    while (activeSlots < MAX_CONCURRENT_SLOTS && requestQueue.length > 0) {
        const nextTask = requestQueue.shift();
        
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_VIEWS_MS));
        
        runSlot(nextTask).catch(err => {
            console.error("Critical runSlot error:", err);
        });
    }
}


// --- API ENDPOINT (Task Submission) ---
app.post('/submit-task', async (req, res) => {
    const { url, duration, totalViews } = req.body;
    
    if (!url || typeof duration !== 'number' || typeof totalViews !== 'number' || totalViews < 1 || totalViews > 100) {
        return res.status(400).json({ status: 'error', message: 'Invalid input. URL, duration (7-15 sec), and totalViews (max 100) required.' });
    }

    const durationMs = duration * 1000;
    
    for (let i = 0; i < totalViews; i++) {
        requestQueue.push({ 
            url, 
            duration: durationMs, 
            viewIndex: i, 
        });
    }

    processQueue();
    
    const viewsPerSlot = Math.ceil(totalViews / MAX_CONCURRENT_SLOTS);
    const totalTimeEstimate = viewsPerSlot * (durationMs + 5000); 

    res.json({
        status: 'queued',
        message: `${totalViews} views accepted. Processing with ${MAX_CONCURRENT_SLOTS} slots.`,
        queueLength: requestQueue.length,
        estimatedTime: `Approx. ${Math.round(totalTimeEstimate / 60000)} minutes.`
    });
});


// --- SERVER START ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Traffic Booster API Server listening on port ${PORT}.`);
    console.log(`Concurrent Slot System Initialized. Max Slots: ${MAX_CONCURRENT_SLOTS}.`);
    
    setInterval(() => {
        if (requestQueue.length > 0 && activeSlots < MAX_CONCURRENT_SLOTS) {
            processQueue();
        }
    }, 10000); 
});
