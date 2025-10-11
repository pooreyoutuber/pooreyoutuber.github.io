// index.js (FINAL STABLE PUPPETEER CODE WITH PROXY & ENHANCED STATUS)

const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium'); 
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// --- CRITICAL CONFIGURATION ---
const MAX_SERVER_SLOTS = 5; // Render Free Tier par max 5 slots rakhein
const SLOTS_PER_USER = 1; // Ek user ek time par 1 continuous slot use kar sakta hai
let activeSlots = []; 
let globalLog = []; 
let totalSuccessViews = 0; // Total successful views counter

const TRAFFIC_CONFIG = {
    minDuration: 10, 
    maxDuration: 40,
    navigationTimeout: 60000, 
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
};

// --- PROXY LIST LOADING (from uploaded file) ---
const PROXY_CREDENTIALS = ""; 
let RAW_PROXIES = [];

try {
    // Assuming 'proxyscrape_premium_http_proxies.txt' is available in the deployment
    const proxyData = fs.readFileSync('proxyscrape_premium_http_proxies.txt', 'utf8');
    RAW_PROXIES = proxyData.trim().split('\r\n').filter(p => p.length > 0);
    console.log(`Loaded ${RAW_PROXIES.length} proxies from file.`);
} catch (e) {
    console.error("FATAL: Could not load proxy file. Using hardcoded backup list.");
    // Hardcoded backup list (add all 100+ proxies here for full functionality)
    RAW_PROXIES = [
        '45.3.49.4:3129', '209.50.164.165:3129', '216.26.232.247:3129', '65.111.3.145:3129', 
        '209.50.168.254:3129', '104.207.63.195:3129', '65.111.2.236:3129', '104.207.61.3:3129', 
        '104.207.60.58:3129', '209.50.166.110:3129'
    ];
}

const HARDCODED_PROXIES = RAW_PROXIES.map(p => PROXY_CREDENTIALS + p);


// --- Helper Functions ---
function pushToLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('en-IN', { hour12: false });
    globalLog.unshift({ timestamp, message, type });
    if (globalLog.length > 50) {
        globalLog.pop();
    }
}

function generateRandomDuration() {
    return Math.floor(Math.random() * (TRAFFIC_CONFIG.maxDuration - TRAFFIC_CONFIG.minDuration + 1)) + TRAFFIC_CONFIG.minDuration;
}

function getRandomProxy() {
    if (HARDCODED_PROXIES.length === 0) return null;
    const index = Math.floor(Math.random() * HARDCODED_PROXIES.length);
    return HARDCODED_PROXIES[index];
}

function getUserId(req) {
    // Use IP address as user ID for tracking
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'LOCAL-USER'; 
}


async function runTrafficSlot(url, slotId, userId) {
    let browser;
    let proxy = getRandomProxy(); 
    let durationSec = generateRandomDuration();
    
    // Add slot to active list
    const slotInfo = { id: slotId, url, userId, status: 'Starting', proxy: proxy, attempts: 0 };
    activeSlots.push(slotInfo);
    pushToLog(`[Slot ${slotId.slice(-4)}] New view requested via proxy.`, 'warning');

    try {
        let launchArgs = [
            ...chromium.args, 
            '--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', 
            '--single-process'
        ]; 
        
        if (!proxy) throw new Error("No available proxies.");

        const proxyAddress = proxy.split('@').pop(); 
        launchArgs.push(`--proxy-server=${proxyAddress}`);
        slotInfo.status = `Connecting via ${proxyAddress.split(':')[0]}`;

        browser = await puppeteer.launch({
            args: launchArgs, 
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(), 
            headless: chromium.headless, 
            ignoreHTTPSErrors: true,
        });
        
        let page = await browser.newPage(); 
        await page.setUserAgent(TRAFFIC_CONFIG.userAgent);
        
        if (proxy.includes('@')) {
            const [auth] = proxy.split('@');
            const [username, password] = auth.split(':');
            await page.authenticate({ username, password });
        }

        slotInfo.status = `Navigating to ${url.substring(0, 30)}...`;
        
        await page.goto(url, { 
            waitUntil: 'domcontentloaded', 
            timeout: TRAFFIC_CONFIG.navigationTimeout
        }); 

        // Simulate scrolling
        await page.evaluate(() => window.scrollBy(0, Math.floor(document.body.scrollHeight * 0.5)));
        
        slotInfo.status = `Viewing for ${durationSec}s (Proxy: ${proxyAddress.split(':')[0]})`;
        await new Promise(resolve => setTimeout(resolve, durationSec * 1000));
        
        // SUCCESS
        totalSuccessViews++; // Increment global counter
        pushToLog(`[Slot ${slotId.slice(-4)}] View SUCCESS. Proxy: ${proxyAddress.split(':')[0]} | Time: ${durationSec}s`, 'success');
        slotInfo.status = `SUCCESS: Viewed ${durationSec}s. Restarting...`;

    } catch (error) {
        pushToLog(`[Slot ${slotId.slice(-4)}] View FAILED: ${error.message.substring(0, 40)}...`, 'error');
        slotInfo.status = `FAILED: ${error.message.substring(0, 20)}...`;
    } finally {
        if (browser) {
            try { await browser.close(); } catch (e) { console.error(`[CLOSING ERROR]`, e.message.substring(0, 50)); }
        }
        
        // Remove completed slot
        activeSlots = activeSlots.filter(s => s.id !== slotId);
        
        const sessionActive = activeSlots.some(s => s.userId === userId);
        
        // Restart the slot if the user's session is still active
        if (sessionActive && activeSlots.length < MAX_SERVER_SLOTS) {
             // Pause briefly before starting next view
             setTimeout(() => startSlotSession(url, userId), 2000); 
             pushToLog(`[User ${userId.slice(-4)}] Slot finished. Scheduling next view...`, 'info');
        } else {
             pushToLog(`[User ${userId.slice(-4)}] Session stopped or Server full.`, 'info');
        }
    }
}

function startSlotSession(url, userId) {
    const userSlots = activeSlots.filter(s => s.userId === userId).length;
    
    // Check if user is allowed more slots and if server has capacity
    if (userSlots < SLOTS_PER_USER && activeSlots.length < MAX_SERVER_SLOTS) {
        const slotId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        runTrafficSlot(url, slotId, userId);
    } 
}


// --- Express App Setup & API Routes ---
app.use(cors());
app.use(express.json());

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

// 2. Traffic Booster START
app.post('/api/booster/start-traffic', (req, res) => {
    const { url } = req.body;
    const userId = getUserId(req); 
    let userSlotsRunning = activeSlots.filter(s => s.userId === userId).length;
    
    if (!url) { return res.status(400).json({ status: 'error', message: 'Target URL is required.' }); }
    
    if (userSlotsRunning >= SLOTS_PER_USER) {
        pushToLog(`User ${userId.slice(-4)} attempted START, but session is already running.`, 'warning');
        return res.json({ status: 'warning', message: `Your session is already running on ${SLOTS_PER_USER} continuous slot.`, slotCount: userSlotsRunning, slotsRunning: activeSlots.length });
    } else if (activeSlots.length >= MAX_SERVER_SLOTS) {
        return res.json({ status: 'warning', message: `Server is at maximum capacity (${MAX_SERVER_SLOTS} slots). Try again later.`, slotCount: 0, slotsRunning: activeSlots.length });
    } else {
        startSlotSession(url, userId);
        pushToLog(`*** NEW SESSION STARTED for ${url.substring(0, 30)}... by User ${userId.slice(-4)} ***`, 'info');
        return res.json({ status: 'success', message: `Starting continuous view session on ${SLOTS_PER_USER} slot.`, slotCount: SLOTS_PER_USER, slotsRunning: activeSlots.length + 1 });
    }
});

// 3. Traffic Booster STOP
app.post('/api/booster/stop-traffic', (req, res) => {
    const userId = getUserId(req);
    // Filters out all slots belonging to this user ID, which stops the restart chain
    activeSlots = activeSlots.filter(s => s.userId !== userId); 
    pushToLog(`*** SESSION STOPPED for User ${userId.slice(-4)} ***`, 'info');

    res.json({
        status: 'success',
        message: `Your traffic session is stopped. Active view will close after current job finishes.`,
        slotsRunning: activeSlots.length
    });
});

// 4. Traffic Booster Status
app.get('/api/booster/status', (req, res) => {
    res.json({
        status: 'success',
        totalSuccessViews: totalSuccessViews, // Global counter for all users
        currentActiveSlots: activeSlots.map(s => ({ 
            id: s.id.slice(-4), 
            status: s.status, 
            proxy: s.proxy.split(':')[0] 
        })),
        log: globalLog.slice(0, 15) // Last 15 log entries
    });
});


// --- Server Start ---
// Note: You might have AI routes (Gemini) also defined here. Ensure they are kept.
app.listen(PORT, () => {
    console.log(`Traffic Booster API Server listening on port ${PORT}.`);
});
