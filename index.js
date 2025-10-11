// index.js (Final Code: Allows Multiple Concurrent Users & Robustness)

const express = require('express');
const cors = require('cors');
const path = require('path');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// --- Configuration ---
const PORT = process.env.PORT || 10000;
const MAX_SERVER_SLOTS = 20; // Server-wide limit for all users (Adjust based on Render memory)
const SLOTS_PER_USER = 2; // Each user's request starts 2 slots
let activeSlots = []; // Stores all running slot processes from all users

const TRAFFIC_CONFIG = {
    minDuration: 5, 
    maxDuration: 20, 
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
};


// --- Hardcoded Proxy List (100+ Proxies) ---
const PROXY_CREDENTIALS = ""; 
const RAW_PROXIES = [
    // 100+ Proxies for Country Views in Google Analytics
    '45.3.49.4:3129', '209.50.164.165:3129', '216.26.232.247:3129', '65.111.3.145:3129', '209.50.168.254:3129', 
    '104.207.63.195:3129', '65.111.2.236:3129', '104.207.61.3:3129', '104.207.60.58:3129', '209.50.166.110:3129', 
    '209.50.170.93:3129', '216.26.254.100:3129', '209.50.164.168:3129', '104.207.57.162:3129', '65.111.15.170:3129', 
    '209.50.170.126:3129', '209.50.188.66:3129', '65.111.6.214:3129', '104.207.44.84:3129', '104.207.40.98:3129', 
    '65.111.24.172:3129', '216.26.254.110:3129', '45.3.42.225:3129', '45.3.55.246:3129', '65.111.15.15:3129', 
    '65.111.29.210:3129', '216.26.229.214:3129', '45.3.32.13:3129', '45.3.53.142:3129', '154.213.160.98:3129', 
    '65.111.1.33:3129', '216.26.237.142:3129', '104.207.36.219:3129', '45.3.39.66:3129', '45.3.44.176:3129', 
    '104.207.60.243:3129', '104.207.52.73:3129', '65.111.5.122:3129', '216.26.253.178:3129', '104.207.34.14:3129', 
    '154.213.166.61:3129', '209.50.171.188:3129', '65.111.7.44:3129', '65.111.4.124:3129', '216.26.228.120:3129', 
    '216.26.232.191:3129', '65.111.30.12:3129', '45.3.45.87:3129', '104.207.40.63:3129', '104.207.37.61:3129', 
    '216.26.253.33:3129', '104.207.36.147:3129', '45.3.32.221:3129', '154.213.161.220:3129', '65.111.8.148:3129', 
    '104.207.43.160:3129', '65.111.8.236:3129', '154.213.164.107:3129', '209.50.191.236:3129', '65.111.7.120:3129', 
    '209.50.179.65:3129', '65.111.13.25:3129', '104.207.47.183:3129', '65.111.26.13:3129', '216.26.250.229:3129', 
    '104.207.62.125:3129', '209.50.190.245:3129', '216.26.233.180:3129', '209.50.172.51:3129', '45.3.51.2:3129', 
    '209.50.166.230:3129', '104.207.45.3:3129', '104.207.42.200:3129', '45.3.41.231:3129', '104.207.49.44:3129', 
    '45.3.51.234:3129', '45.3.36.2:3129', '209.50.186.85:3129', '104.207.34.99:3129', '209.50.163.251:3129', 
    '216.26.231.232:3129', '209.50.178.133:3129', '45.3.45.19:3129', '65.111.12.11:3129', '65.111.12.100:3129', 
    '216.26.242.199:3129', '65.111.31.65:3129', '154.213.163.95:3129', '45.3.50.117:3129', '65.111.22.188:3129', 
    '104.207.37.202:3129', '154.213.160.201:3129', '209.50.160.27:3129', '65.111.28.111:3129', '104.207.33.105:3129', 
    '216.26.241.226:3129', '104.207.46.76:3129', '216.26.240.92:3129', '216.26.251.165:3129', '45.3.47.110:3129'
];

const HARDCODED_PROXIES = RAW_PROXIES.map(p => PROXY_CREDENTIALS + p);


// --- Helper Functions ---
function generateRandomDuration() {
    return Math.floor(Math.random() * (TRAFFIC_CONFIG.maxDuration - TRAFFIC_CONFIG.minDuration + 1)) + TRAFFIC_CONFIG.minDuration;
}

function getRandomProxy() {
    if (HARDCODED_PROXIES.length === 0) return null;
    const index = Math.floor(Math.random() * HARDCODED_PROXIES.length);
    return HARDCODED_PROXIES[index];
}


// --- Puppeteer Logic (Traffic Generator) ---
async function runTrafficSlot(url, slotId, userId) {
    let browser;
    let page;
    let proxy = getRandomProxy(); 
    let durationSec = generateRandomDuration();

    // Check server-wide limit before launch
    if (activeSlots.length >= MAX_SERVER_SLOTS) {
        // If limit is reached, log and exit, but don't add to activeSlots
        console.warn(`[SERVER LIMIT] Slot ${slotId} for User ${userId} denied. Server is full (${MAX_SERVER_SLOTS}).`);
        return; 
    }
    
    // Add slot to activeSlots list immediately
    activeSlots.push({ id: slotId, url, userId });

    try {
        // --- 1. Launch Arguments (Render stability fixes) ---
        let launchArgs = [
            ...chromium.args, 
            '--disable-gpu', 
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process' 
        ]; 
        
        if (proxy) {
            const proxyAddress = proxy.split('@').pop(); 
            launchArgs.push(`--proxy-server=${proxyAddress}`);
            console.log(`[USER ${userId} | SLOT ${slotId}] Proxy: ${proxyAddress} | Duration: ${durationSec}s`);
        }

        // --- 2. Browser Launch ---
        browser = await puppeteer.launch({
            args: launchArgs,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(), 
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        page = await browser.newPage();
        await page.setUserAgent(TRAFFIC_CONFIG.userAgent);

        // --- 3. Proxy Authentication ---
        if (proxy && proxy.includes('@')) {
            const [auth] = proxy.split('@');
            const [username, password] = auth.split(':');
            await page.authenticate({ username, password });
        }

        // --- 4. Navigation (Increased Timeout for proxies) ---
        console.log(`[USER ${userId} | SLOT ${slotId}] Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); 
        
        // --- 5. User Activity Simulation (Scrolling) ---
        await page.evaluate(() => {
            return new Promise(resolve => {
                let totalHeight = 0;
                let distance = 300; 
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        setTimeout(resolve, 500);
                    }
                }, 500); 
            });
        });
        
        // Wait for the specified duration (5-20 seconds)
        await new Promise(resolve => setTimeout(resolve, durationSec * 1000));
        
        console.log(`[USER ${userId} | SLOT ${slotId}] View complete.`);


    } catch (error) {
        console.error(`[USER ${userId} | SLOT ${slotId} ERROR] Failed to load/view: ${error.message.substring(0, 100)}`);
    } finally {
        if (browser) await browser.close();
        
        // Remove the finished slot from the active list
        activeSlots = activeSlots.filter(s => s.id !== slotId);
        
        // Check if this user's session is still active (i.e., they haven't pressed STOP)
        const sessionActive = activeSlots.some(s => s.userId === userId);

        if (sessionActive && activeSlots.length < MAX_SERVER_SLOTS) {
             console.log(`[USER ${userId} | SLOT ${slotId}] Restarting in 2s. Total active: ${activeSlots.length}.`);
             // Restart the slot recursively
             setTimeout(() => startSlotSession(url, userId), 2000); 
        } else if (!sessionActive) {
             console.log(`[USER ${userId} | SLOT ${slotId}] Session stopped by user. Total active: ${activeSlots.length}.`);
        } else {
             console.warn(`[USER ${userId} | SLOT ${slotId}] Restart denied. Server limit reached.`);
        }
    }
}


// --- Traffic Start/Stop Management (Per-User Logic) ---
function startSlotSession(url, userId) {
    const userSlots = activeSlots.filter(s => s.userId === userId).length;

    // Check if user limit is reached
    if (userSlots >= SLOTS_PER_USER) {
        return; 
    }
    
    // Check if server limit is reached
    if (activeSlots.length < MAX_SERVER_SLOTS) {
        const slotId = Date.now() + Math.random();
        runTrafficSlot(url, slotId, userId);
    } else {
        console.warn(`[USER ${userId}] Slot request denied. Server at max capacity (${MAX_SERVER_SLOTS}).`);
    }
}


// --- Express App Setup & API Routes ---
const app = express();
app.use(cors());
app.use(express.json());

// Helper to get a unique ID for the user based on IP
function getUserId(req) {
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress || `USER-${Date.now()}`; 
}

// Serving the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'website-booster.html')); 
});


// 1. Traffic Booster Config
app.get('/api/booster/config', (req, res) => {
    res.json({
        status: 'success',
        config: TRAFFIC_CONFIG,
        maxSlots: MAX_SERVER_SLOTS,
        slotsPerUser: SLOTS_PER_USER,
        proxyCount: HARDCODED_PROXIES.length,
        message: 'Configuration loaded successfully.'
    });
});

// 2. Traffic Booster START (Allows Multiple Users)
app.post('/api/booster/start-traffic', (req, res) => {
    const { url } = req.body;
    const userId = getUserId(req); 
    const userSlotsRunning = activeSlots.filter(s => s.userId === userId).length;

    if (!url) {
        return res.status(400).json({ status: 'error', message: 'Target URL is required.' });
    }
    
    // Check if this specific user already has slots running
    if (userSlotsRunning > 0) {
         return res.status(400).json({ status: 'error', message: `${SLOTS_PER_USER} slots are already running for your session. Please STOP before starting a new session.` });
    }
    
    if (HARDCODED_PROXIES.length === 0) {
         return res.status(500).json({ status: 'error', message: 'Proxy list is empty on the server. Cannot start traffic.' });
    }
    
    // Launch slots for this user up to the per-user limit
    for (let i = 0; i < SLOTS_PER_USER; i++) {
        startSlotSession(url, userId);
    }

    res.json({
        status: 'success',
        message: `Starting ${SLOTS_PER_USER} slots for your session.`,
        slotCount: SLOTS_PER_USER,
        slotsRunning: activeSlots.length,
        maxSlots: MAX_SERVER_SLOTS
    });
});

// 3. Traffic Booster STOP
app.post('/api/booster/stop-traffic', (req, res) => {
    const userId = getUserId(req);
    
    // Filter out the user's slots to stop their session
    const slotsBeforeStop = activeSlots.length;
    activeSlots = activeSlots.filter(s => s.userId !== userId);

    // Any running slots will complete their current view cycle and then stop permanently 
    // because the filter check (sessionActive) will fail in the finally block.
    
    console.log(`[USER ${userId}] Stop command received. Removing session. Total active: ${activeSlots.length}.`);

    res.json({
        status: 'success',
        message: `Your traffic session is stopped. Active slots will close after current view completes.`,
        slotsRunning: activeSlots.length,
        maxSlots: MAX_SERVER_SLOTS
    });
});


// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Traffic Booster API Server listening on port ${PORT}.`);
    console.log(`Concurrent Slot System Initialized. MAX Server Slots: ${MAX_SERVER_SLOTS}.`);
});
