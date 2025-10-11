// index.js (Server-Side Node.js)

const express = require('express');
const cors = require('cors');
const path = require('path');

// Puppeteer for the Traffic Booster (CRITICAL for Render)
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// --- Hardcoded Proxy List ---
// *** ZAROORI: Agar aapki Proxyscrape proxies ko username/password chahiye, 
// toh 'user:pass@' ko apne asal credentials se replace karein. 
// Agar authentication IP based hai, toh isko ' ' rakhein.
const PROXY_CREDENTIALS = "user:pass@"; // Yahaan BADLEIN agar zaroori ho

const RAW_PROXIES = [
    // ... (All 100+ proxies from proxyscrape_premium_http_proxies.txt)
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


// --- Configuration ---
const PORT = process.env.PORT || 10000;
const MAX_SLOTS = 2; 

const TRAFFIC_CONFIG = {
    minDuration: 8, 
    maxDuration: 20, 
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
};

// --- State Management ---
let activeSlots = [];
let isTrafficRunning = false;

// --- Helper Functions ---
function generateRandomDuration() {
    return Math.floor(Math.random() * (TRAFFIC_CONFIG.maxDuration - TRAFFIC_CONFIG.minDuration + 1)) + TRAFFIC_CONFIG.minDuration;
}

function getRandomProxy() {
    if (HARDCODED_PROXIES.length === 0) return null;
    const index = Math.floor(Math.random() * HARDCODED_PROXIES.length);
    return HARDCODED_PROXIES[index];
}


// --- Puppeteer Logic (Main Traffic Generator) ---
async function runTrafficSlot(url, slotId) {
    let browser;
    let page;
    let proxy = getRandomProxy(); 
    let durationSec = generateRandomDuration();

    try {
        // --- 1. Launch Arguments (RENDER FIX) ---
        let launchArgs = [
            ...chromium.args, 
            '--disable-gpu', 
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process' // New: Added to fix ETXTBSY/Chromium issues on some Render instances
        ]; 
        
        if (proxy) {
            const proxyAddress = proxy.split('@').pop(); 
            launchArgs.push(`--proxy-server=${proxyAddress}`);
            console.log(`[SLOT ${slotId}] Using Proxy: ${proxyAddress} for ${durationSec}s`);
        }

        // --- 2. Browser Launch (CRITICAL RENDER FIX) ---
        browser = await puppeteer.launch({
            args: launchArgs,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(), 
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        // **FIX: Changed createIncognitoBrowserContext to browser.newPage()**
        // Since we are not using a shared context, a simple newPage is sufficient.
        page = await browser.newPage();
        
        await page.setUserAgent(TRAFFIC_CONFIG.userAgent);

        // --- 3. Proxy Authentication (if needed) ---
        if (proxy && proxy.includes('@')) {
            const [auth] = proxy.split('@');
            const [username, password] = auth.split(':');
            await page.authenticate({ username, password });
            console.log(`[SLOT ${slotId}] Authenticating proxy...`);
        }

        // --- 4. Navigation ---
        console.log(`[SLOT ${slotId}] Navigating to ${url}...`);
        
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 }); 
        
        // --- 5. User Activity Simulation ---
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
                        setTimeout(() => { window.scrollTo(0, scrollHeight / 2); resolve(); }, 500); 
                    }
                }, 500); 
            });
        });
        
        await new Promise(resolve => setTimeout(resolve, durationSec * 1000));
        
        console.log(`[SLOT ${slotId}] View complete.`);


    } catch (error) {
        console.error(`[SLOT ${slotId} ERROR] Failed to load/view: ${error.message.substring(0, 100)}`);
    } finally {
        if (browser) await browser.close();
        
        activeSlots = activeSlots.filter(s => s.id !== slotId);
        
        if (isTrafficRunning) {
             console.log(`[SLOT ${slotId}] Finished. Restarting in a new session. Active slots: ${activeSlots.length}.`);
             // Restart the slot recursively
             setTimeout(() => startTraffic(url), 2000); 
        } else if (activeSlots.length === 0) {
            console.log("Traffic successfully stopped. All slots closed.");
        }
    }
}

// --- Traffic Start/Stop Management (No change needed here) ---
function startTraffic(url) {
    if (!isTrafficRunning) return;
    if (HARDCODED_PROXIES.length === 0) {
        console.error("Cannot start traffic: No proxies found.");
        isTrafficRunning = false;
        return;
    }
    
    const slotId = Date.now() + Math.random();

    console.log(`[SLOT ${slotId}] Launching view...`);
    activeSlots.push({ id: slotId, url, proxy: 'Random' });
    
    runTrafficSlot(url, slotId); 
}

// --- Express App Setup & API Routes (No change needed here) ---
const app = express();
app.use(cors());
app.use(express.json());

// Serve static HTML/JS files 
app.use(express.static(path.join(__dirname, 'public'))); 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'booster_tool.html')); 
});

// 1. Traffic Booster Config
app.get('/api/booster/config', (req, res) => {
    res.json({
        status: 'success',
        config: TRAFFIC_CONFIG,
        maxSlots: MAX_SLOTS,
        proxyCount: HARDCODED_PROXIES.length,
        message: 'Configuration loaded successfully.'
    });
});

// 2. Traffic Booster START (Sare checks sahi hain)
app.post('/api/booster/start-traffic', (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ status: 'error', message: 'Target URL is required.' });
    }
    if (isTrafficRunning) {
         return res.status(400).json({ status: 'error', message: `Traffic is already running with ${activeSlots.length} slots.` });
    }
    if (HARDCODED_PROXIES.length === 0) {
         return res.status(500).json({ status: 'error', message: 'Proxy list is empty on the server. Cannot start traffic.' });
    }

    isTrafficRunning = true;
    activeSlots = [];

    for (let i = 0; i < MAX_SLOTS; i++) {
        startTraffic(url);
    }

    res.json({
        status: 'success',
        message: `Starting ${MAX_SLOTS} traffic slots using server-side Puppeteer and random proxies.`,
        slotCount: MAX_SLOTS
    });
});

// 3. Traffic Booster STOP
app.post('/api/booster/stop-traffic', (req, res) => {
    if (!isTrafficRunning) {
        return res.status(200).json({ status: 'success', message: 'Traffic was already stopped.' });
    }

    isTrafficRunning = false;

    res.json({
        status: 'success',
        message: `Stopping traffic. Active slots will finish their current run and close.`,
        slotsRemaining: activeSlots.length
    });
});


// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Traffic Booster API Server listening on port ${PORT}.`);
    console.log(`Concurrent Slot System Initialized. Max Slots: ${MAX_SLOTS}`);
    console.log(`Hardcoded Proxies Loaded: ${HARDCODED_PROXIES.length}`);
    console.log(`>>> Your service is live 🚀`);
});
