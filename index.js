// index.js (FINAL CODE - MOST STABLE, SEQUENTIAL, AND ADS-OPTIMIZED)

const express = require('express');
const cors = require('cors'); 
const puppeteer = require('puppeteer-core'); 
const chromium = require('@sparticuz/chromium'); 

const app = express();
const PORT = process.env.PORT || 10000; 

// --- 1. CONFIGURATION & UTILITIES ---
const rateLimitMap = new Map();
const MAX_REQUESTS_PER_DAY = 4;
const MAX_VIEWS_PER_RUN = 20; 
const DAY_IN_MS = 24 * 60 * 60 * 1000;
app.set('trust proxy', 1);

// **OPTIMIZED PUPPETEER ARGS for Stability on Render**
const PUPPETEER_ARGS = [
    '--disable-gpu',
    '--disable-setuid-sandbox',
    '--no-sandbox', 
    '--single-process', // CRITICAL for low-memory hosts
    '--no-zygote',
    '--disable-dev-shm-usage', // Essential for Render
    '--user-data-dir=/tmp/user_data',
    '--ignore-certificate-errors',
    '--window-size=1920,1080'
];

// ⭐ PROXY LIST (Used for unique IP/Location)
const PROXY_LIST = [
    "http://104.207.63.195:3129", "http://104.207.61.3:3129", "http://104.207.60.58:3129",
    "http://216.26.254.100:3129", "http://104.207.57.162:3129", "http://209.50.188.66:3129",
    "http://65.111.24.172:3129", "http://216.26.254.110:3129", "http://45.3.42.225:3129",
    "http://45.3.55.246:246", "http://45.3.53.142:3129", "http://154.213.160.98:3129",
    "http://45.3.44.176:3129", "http://104.207.60.243:3129", "http://104.207.52.73:3129",
    "http://216.26.253.178:3129", "http://154.213.166.61:3129", "http://45.3.45.87:3129"
];

// USER AGENTS (Random selection for variety)
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
];

function getRandomProxy() {
    if (PROXY_LIST.length === 0) return null;
    return PROXY_LIST[Math.floor(Math.random() * PROXY_LIST.length)];
}

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Function to generate the URL plan based on equal distribution
function generateUrlPlan(totalViews, urls) {
    const plan = [];
    if (urls.length === 0 || totalViews < 1) return [];
    
    // Distribute views as equally as possible among the provided URLs
    for(let i = 0; i < totalViews; i++) {
        const urlIndex = i % urls.length;
        plan.push(urls[urlIndex]);
    }
    
    return plan;
}

// --- 2. CORS FIX ---
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
    res.status(200).send('PooreYouTuber Puppeteer API (Real User Booster) is running! 🚀');
});


// ===================================================================
// 3. REAL USER DIRECT TRAFFIC ENDPOINT: /boost-real - SEQUENTIAL MODE
// ===================================================================
app.post('/boost-real', async (req, res) => {
    
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    let clientData = rateLimitMap.get(clientIp) || { count: 0, lastReset: now };

    if (now - clientData.lastReset > DAY_IN_MS) { clientData.count = 0; clientData.lastReset = now; }

    if (clientData.count >= MAX_REQUESTS_PER_DAY) {
        return res.status(429).json({ status: 'error', message: `❌ Aap 24 ghante mein adhiktam ${MAX_REQUESTS_PER_DAY} baar hi is tool ka upyog kar sakte hain.` });
    }
    
    const totalViews = parseInt(req.body.views) || 0; 
    const urls = req.body.urls; 
    const refreshDelay = parseInt(req.body.refreshDelay) || 5000; 
    const totalSlots = 20; // Fixed number of slots

    if (totalViews < 1 || totalViews > MAX_VIEWS_PER_RUN || !Array.isArray(urls) || urls.length === 0) {
           return res.status(400).json({ status: 'error', message: `Invalid views (1-${MAX_VIEWS_PER_RUN}) or valid URL data missing.` });
    }

    clientData.count += 1;
    clientData.lastReset = now; 
    rateLimitMap.set(clientIp, clientData);
    
    const finalUrlPlan = generateUrlPlan(totalViews, urls);
    const loadsPerSlot = Math.ceil(finalUrlPlan.length / totalSlots);
    
    res.json({ 
        status: 'accepted', 
        message: `✅ Aapki ${finalUrlPlan.length} Page Loads ki request sweekar kar li gayi hai. (Sequential Mode: Optimized for Render)`,
        total_loads: finalUrlPlan.length,
        slots: totalSlots
    });

    // ⭐ SEQUENTIAL EXECUTION LOGIC: Slots will run one after the other.
    (async () => {
        let startIndex = 0;
        for(let slotIndex = 0; slotIndex < totalSlots; slotIndex++) {
            const loadsForSlot = finalUrlPlan.slice(startIndex, startIndex + loadsPerSlot);
            startIndex += loadsForSlot.length;
            
            if (loadsForSlot.length > 0) {
                // Pass refreshDelay to the runner function
                await runSlotTask(slotIndex + 1, loadsForSlot, refreshDelay); 
            }
        }
        console.log(`[BOOSTER FINISH] All sessions attempted sequentially.`);
    })();
});

// ===================================================================
// 4. SLOT RUNNER FUNCTION (Core Puppeteer Logic) - ROBUST SCROLL/DELAY
// ===================================================================
async function runSlotTask(slotId, urlList, refreshDelay) {
    const totalLoads = urlList.length;
    let loadsCompleted = 0;
    
    const chromiumExecutable = await chromium.executablePath(); 

    for (let i = 0; i < totalLoads; i++) {
        const loadId = `${slotId}-${i + 1}`;
        const targetURL = urlList[i];
        let browser = null;

        try {
            // --- 1. Browser launch with NEW Proxy/User Agent ---
            const proxyUrl = getRandomProxy();
            if (!proxyUrl) throw new Error('Proxy list empty.');
            
            const ipPort = proxyUrl.replace('http://', ''); 
            const proxyArgs = [
                ...PUPPETEER_ARGS,
                `--proxy-server=${ipPort}` 
            ];

            browser = await puppeteer.launch({
                args: proxyArgs, 
                executablePath: chromiumExecutable, 
                headless: chromium.headless,
                timeout: 60000, 
            });
            
            let page = await browser.newPage();
            
            // ⭐ Unique User Agent for every load
            await page.setUserAgent(getRandomUserAgent());
            await page.setViewport({ width: 1920, height: 1080 }); 
            await page.setExtraHTTPHeaders({'Referer': 'https://www.google.com/'});
            
            // --- 3. Page Navigate (Load) ---
            await page.goto(targetURL, { 
                waitUntil: 'domcontentloaded', // Fast load signal
                timeout: 120000 // Long timeout for slow proxies
            });
            
            // --- 4. Engagement (Ads View Time + Scroll) ---
            
            // ⭐ ADS VIEW TIME: 7 to 9 seconds
            const adsViewTime = Math.floor(Math.random() * (9000 - 7000) + 7000); 
            
            // Wait for ads view time
            await new Promise(resolve => setTimeout(resolve, adsViewTime)); 

            // ⭐ SCROLL LOGIC: Multiple scrolls (2-4 times)
            const numScrolls = Math.floor(Math.random() * 3) + 2; // 2 to 4 scrolls
            
            for (let s = 0; s < numScrolls; s++) {
                 // SCROLL HEIGHT CALCULATION: Robust check to avoid "null" error
                const scrollHeight = await page.evaluate(() => {
                    return Math.max(
                        document.body ? document.body.scrollHeight : 0, 
                        document.documentElement ? document.documentElement.scrollHeight : 0
                    ); 
                });
                
                if (scrollHeight > 1000) { 
                    // Scroll 50% to 95% of the page
                    const scrollPercent = Math.random() * (0.95 - 0.5) + 0.5; 
                    const targetScroll = Math.min(scrollHeight * scrollPercent, scrollHeight - 100);
                    
                    await page.evaluate((targetScroll) => {
                        window.scrollTo({ top: targetScroll, behavior: 'smooth' });
                    }, targetScroll);

                    // Wait 500ms before scrolling again (real user behavior)
                    await new Promise(resolve => setTimeout(resolve, 500)); 
                }
            }
            
            loadsCompleted++;

        } catch (pageError) {
            console.error(`[Load ${loadId}] FAILURE ❌ | Error: ${pageError.message.substring(0, 100)}...`);
        } finally {
            if (browser) {
                try {
                    // Browser close karke memory release karo
                    await browser.close();
                } catch(e) {
                    console.error(`[Load ${loadId}] WARNING: Error closing browser: ${e.message}`);
                }
            }
        }
        
        // --- 5. MAIN DELAY (Refresh Delay logic) ---
        // Wait for the user defined refresh delay before the next sequential load
        const totalDelay = refreshDelay;
        await new Promise(resolve => setTimeout(resolve, totalDelay));
    }

    return loadsCompleted;
}


// ===================================================================
// 6. START THE SERVER 
// ===================================================================
app.listen(PORT, () => {
    console.log(`Combined API Server listening on port ${PORT}.`);
});
