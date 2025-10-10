// index.js (Server-Side Node.js)

const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

// Puppeteer for the Traffic Booster (CRITICAL for Render)
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// --- Configuration ---
const PORT = process.env.PORT || 10000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MAX_SLOTS = 2; // Maximum concurrent Puppeteer instances

// Traffic Booster Config (Defaults)
const TRAFFIC_CONFIG = {
    minDuration: 8, // seconds
    maxDuration: 20, // seconds
    // A robust, modern User Agent for realistic views
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
};

// --- State Management for Booster ---
let activeSlots = [];
let isTrafficRunning = false;


// --- Initialize AI (for other tools) ---
if (!GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY not found. AI tools will not work.");
}
const ai = new GoogleGenAI(GEMINI_API_KEY);


// --- Helper Functions ---
function generateRandomDuration() {
    return Math.floor(Math.random() * (TRAFFIC_CONFIG.maxDuration - TRAFFIC_CONFIG.minDuration + 1)) + TRAFFIC_CONFIG.minDuration;
}

function getRandomProxy(proxies) {
    if (!proxies || proxies.length === 0) return null;
    const index = Math.floor(Math.random() * proxies.length);
    return proxies[index];
}


// --- Puppeteer Logic (Main Traffic Generator) ---
async function runTrafficSlot(url, proxies, slotId) {
    let browser;
    let page;
    let proxy = getRandomProxy(proxies); // Pick a proxy for this run
    let durationSec = generateRandomDuration();

    try {
        let launchArgs = [...chromium.args, '--disable-gpu', '--no-sandbox']; 
        
        // 1. Proxy Setup (Pass address only to --proxy-server)
        if (proxy) {
            const proxyAddress = proxy.split('@').pop(); 
            launchArgs.push(`--proxy-server=${proxyAddress}`);
            console.log(`[SLOT ${slotId}] Using Proxy: ${proxyAddress} for ${durationSec}s`);
        }

        // 2. Browser Launch
        browser = await puppeteer.launch({
            args: launchArgs,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const context = await browser.createIncognitoBrowserContext();
        page = await context.newPage();
        
        // Set User Agent
        await page.setUserAgent(TRAFFIC_CONFIG.userAgent);

        // 3. Proxy Authentication (if needed)
        if (proxy && proxy.includes('@')) {
            const [auth] = proxy.split('@');
            const [username, password] = auth.split(':');
            await page.authenticate({ username, password });
            console.log(`[SLOT ${slotId}] Authenticating proxy...`);
        }

        // 4. Navigation
        console.log(`[SLOT ${slotId}] Navigating to ${url}...`);
        
        // Use networkidle0 for better loading simulation
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 }); 
        
        // 5. Scroll Simulation (Simulating user activity)
        await page.evaluate(() => {
            // Function to scroll smoothly
            function autoScroll() {
                return new Promise(resolve => {
                    let totalHeight = 0;
                    let distance = 300; // Scroll distance
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;

                        if (totalHeight >= scrollHeight) {
                            clearInterval(timer);
                            // Scroll back up half way
                            setTimeout(() => {
                                window.scrollTo(0, scrollHeight / 2);
                                resolve();
                            }, 500); 
                        }
                    }, 500); // Scroll every 500ms
                });
            }
            autoScroll();
        });
        
        // Wait for the full duration
        await new Promise(resolve => setTimeout(resolve, durationSec * 1000));
        
        console.log(`[SLOT ${slotId}] View complete.`);


    } catch (error) {
        console.error(`[SLOT ${slotId} ERROR] Failed: ${error.message.substring(0, 100)}`);
    } finally {
        if (browser) await browser.close();
        
        // Remove from active slots
        activeSlots = activeSlots.filter(s => s.id !== slotId);
        
        if (isTrafficRunning) {
             console.log(`[SLOT ${slotId}] Finished. Restarting in a new session. Active slots: ${activeSlots.length}.`);
             // Restart the slot recursively if traffic is still running
             // Use a slight delay before restarting
             setTimeout(() => startTraffic(url, proxies), 2000); 
        } else if (activeSlots.length === 0) {
            console.log("Traffic successfully stopped. All slots closed.");
        }
    }
}

// --- Traffic Start/Stop Management ---
function startTraffic(url, proxies) {
    if (!isTrafficRunning) return;
    
    // Generate a unique slot ID
    const slotId = Date.now() + Math.random();

    console.log(`[SLOT ${slotId}] Launching view...`);
    activeSlots.push({ id: slotId, url, proxy: 'Pending' });
    
    // Pass the full proxy list to runTrafficSlot so it can randomly pick one on each run
    runTrafficSlot(url, proxies, slotId); 
}

// --- Express App Setup ---
const app = express();
app.use(cors());
app.use(express.json());

// Serve static HTML/JS files (assuming your HTML is in a 'public' folder)
app.use(express.static(path.join(__dirname, 'public'))); 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// --- API Routes ---

// 1. Traffic Booster Config
app.get('/api/booster/config', (req, res) => {
    res.json({
        status: 'success',
        config: TRAFFIC_CONFIG,
        maxSlots: MAX_SLOTS,
        message: 'Configuration loaded successfully.'
    });
});

// 2. Traffic Booster START
app.post('/api/booster/start-traffic', (req, res) => {
    const { url, proxies } = req.body;

    if (!url || !proxies || proxies.length === 0) {
        return res.status(400).json({ status: 'error', message: 'URL and Proxy list are required.' });
    }
    if (isTrafficRunning) {
         return res.status(400).json({ status: 'error', message: `Traffic is already running with ${activeSlots.length} slots.` });
    }

    isTrafficRunning = true;
    activeSlots = [];

    // Start all max slots
    for (let i = 0; i < MAX_SLOTS; i++) {
        startTraffic(url, proxies);
    }

    res.json({
        status: 'success',
        message: `Starting ${MAX_SLOTS} traffic slots using server-side Puppeteer.`,
        slotCount: MAX_SLOTS
    });
});

// 3. Traffic Booster STOP
app.post('/api/booster/stop-traffic', (req, res) => {
    if (!isTrafficRunning) {
        return res.status(200).json({ status: 'success', message: 'Traffic was already stopped.' });
    }

    isTrafficRunning = false;
    // runTrafficSlot's finally block will detect isTrafficRunning=false and close the browsers.

    res.json({
        status: 'success',
        message: `Stopping traffic. Active slots will finish their current run and close.`,
        slotsRemaining: activeSlots.length // This count is approximate
    });
});

// 4. Placeholder for Caption Generator (or other tools)
app.post('/api/caption', async (req, res) => {
    if (!GEMINI_API_KEY) return res.status(503).json({ status: 'error', message: 'Gemini API Key is not configured on server.' });
    res.json({ status: 'success', caption: 'Caption tool is active, but logic is simplified here.' });
});


// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Traffic Booster API Server listening on port ${PORT}.`);
    console.log(`Concurrent Slot System Initialized. Max Slots: ${MAX_SLOTS}`);
    console.log(`>>> Your service is live 🚀`);
});
