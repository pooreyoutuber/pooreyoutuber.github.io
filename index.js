// index.js (FINAL CODE - OPTIMIZED FOR RENDER STABILITY AND REAL USER SCROLL)

const express = require('express');
const cors = require('cors'); 
const puppeteer = require('puppeteer-core'); 
const chromium = require('@sparticuz/chromium'); 

const app = express();
const PORT = process.env.PORT || 10000; 

// --- 1. CONFIGURATION & UTILITIES ---
const rateLimitMap = new Map();
const MAX_REQUESTS_PER_DAY = 4;
const MAX_VIEWS_PER_RUN = 400; 
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
    '--window-size=1920,1080' // Default viewport size
];

// ⭐ PROXY LIST (Used for unique IP/Location)
const PROXY_LIST = [
    "http://104.207.63.195:3129", "http://104.207.61.3:3129", "http://104.207.60.58:3129",
    "http://216.26.254.100:3129", "http://104.207.57.162:3129", "http://209.50.188.66:3129",
    "http://65.111.24.172:3129", "http://216.26.254.110:3129", "http://45.3.42.225:3129",
    "http://45.3.55.246:3129", "http://45.3.53.142:3129", "http://154.213.160.98:3129",
    "http://45.3.44.176:3129", "http://104.207.60.243:3129", "http://104.207.52.73:3129",
    "http://216.26.253.178:3129", "http://154.213.166.61:3129", "http://45.3.45.87:3129"
];

// USER AGENTS (Used for unique Browser/Device simulation)
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

function generateCompensatedPlan(totalViews, items) {
    const viewPlan = [];
    if (items.length === 0 || totalViews < 1) return [];
    
    const validItems = items.filter(item => item.url && item.percent > 0);
    const totalPercent = validItems.reduce((sum, item) => sum + item.percent, 0) || 100;
    
    let normalizedItems = validItems.map(item => {
        const exactViews = totalViews * (item.percent / totalPercent);
        return { url: item.url, views: Math.floor(exactViews), remainder: exactViews % 1 };
    });

    let sumOfViews = normalizedItems.reduce((sum, item) => sum + item.views, 0);
    let difference = totalViews - sumOfViews; 

    normalizedItems.sort((a, b) => b.remainder - a.remainder);

    for (let i = 0; i < difference && i < normalizedItems.length; i++) {
        normalizedItems[i].views++;
    }

    normalizedItems.forEach(item => {
        for (let i = 0; i < item.views; i++) {
            viewPlan.push(item.url);
        }
    });
    
    return viewPlan;
}

// --- 2. CORS FIX ---
// Allowing your GitHub Pages frontend to communicate with Render
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


// --- TIME CONSTANTS ---
const MIN_TOTAL_MS = 24 * 60 * 60 * 1000; 
const MAX_TOTAL_MS = 48 * 60 * 60 * 1000; 

// ===================================================================
// 3. REAL USER DIRECT TRAFFIC ENDPOINT: /boost-real
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
    const pages = req.body.pages; 
    const totalSlots = 20; 

    if (totalViews < 1 || totalViews > MAX_VIEWS_PER_RUN || !Array.isArray(pages) || pages.length === 0) {
           return res.status(400).json({ status: 'error', message: `Invalid views (1-${MAX_VIEWS_PER_RUN}) or valid Page data missing.` });
    }

    clientData.count += 1;
    clientData.lastReset = now; 
    rateLimitMap.set(clientIp, clientData);
    
    const finalUrlPlan = generateCompensatedPlan(totalViews, pages);
    const loadsPerSlot = Math.ceil(finalUrlPlan.length / totalSlots);
    
    res.json({ 
        status: 'accepted', 
        message: `✅ Aapki ${finalUrlPlan.length} Real User Page Loads ki request sweekar kar li gayi hai. Traffic 24-48 ghanton mein poora hoga.`,
        total_loads: finalUrlPlan.length,
        slots: totalSlots
    });

    (async () => {
        const slotTasks = [];
        let startIndex = 0;
        for(let slotIndex = 0; slotIndex < totalSlots; slotIndex++) {
            const loadsForSlot = finalUrlPlan.slice(startIndex, startIndex + loadsPerSlot);
            startIndex += loadsForSlot.length;
            if (loadsForSlot.length > 0) {
                slotTasks.push(runSlotTask(slotIndex + 1, loadsForSlot));
            }
        }
        await Promise.allSettled(slotTasks);
        console.log(`[BOOSTER FINISH] All sessions attempted.`);
    })();
});

// ===================================================================
// 4. SLOT RUNNER FUNCTION (Core Puppeteer Logic) - OPTIMIZED LAUNCH
// ===================================================================
async function runSlotTask(slotId, urlList) {
    const totalLoads = urlList.length;
    let loadsCompleted = 0;
    
    const targetDuration = Math.random() * (MAX_TOTAL_MS - MIN_TOTAL_MS) + MIN_TOTAL_MS;
    const requiredFixedDelayPerLoad = Math.floor(targetDuration / totalLoads);
    
    // Chromium executable path ko pehle hi fetch kar lete hain
    const chromiumExecutable = await chromium.executablePath(); 

    for (let i = 0; i < totalLoads; i++) {
        const loadId = `${slotId}-${i + 1}`;
        const targetURL = urlList[i];
        let browser = null;

        try {
            // --- 1. Browser launch with NEW Proxy ---
            const proxyUrl = getRandomProxy();
            if (!proxyUrl) throw new Error('Proxy list empty.');
            
            const ipPort = proxyUrl.replace('http://', ''); 
            const proxyArgs = [
                ...PUPPETEER_ARGS,
                `--proxy-server=${ipPort}` 
            ];

            // ⭐ OPTIMIZED LAUNCH CONFIGURATION for Render Low Memory ⭐
            browser = await puppeteer.launch({
                args: proxyArgs, 
                executablePath: chromiumExecutable, // Path explicitly set for stability
                headless: chromium.headless,
                timeout: 60000, 
            });
            
            let page = await browser.newPage();
            
            // Set high resolution and User Agent
            await page.setViewport({ width: 1920, height: 1080 }); 
            await page.setUserAgent(getRandomUserAgent());
            await page.setExtraHTTPHeaders({'Referer': 'https://www.google.com/'});
            
            // --- 3. Page Navigate (Load) ---
            await page.goto(targetURL, { 
                waitUntil: 'networkidle2', 
                timeout: 90000 
            });
            
            // --- 4. Engagement (Scroll & Random Wait: 4s-7s) ---
            const engagementTime = Math.floor(Math.random() * (7000 - 4000) + 4000); 
            await new Promise(resolve => setTimeout(resolve, 2000)); 

            // SCROLL FIX: Real user-like scrolling
            const scrollHeight = await page.evaluate(() => {
                return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight); 
            });
            
            if (scrollHeight > 1000) { 
                const scrollPercent = Math.random() * (0.95 - 0.5) + 0.5; 
                const targetScroll = Math.min(scrollHeight * scrollPercent, scrollHeight - 100);
                
                await page.evaluate((targetScroll) => {
                    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
                }, targetScroll);

                await new Promise(resolve => setTimeout(resolve, 500)); 
            }

            await new Promise(resolve => setTimeout(resolve, engagementTime)); 
            
            loadsCompleted++;

        } catch (pageError) {
            console.error(`[Load ${loadId}] FAILURE ❌ | Error: ${pageError.message.substring(0, 100)}...`);
        } finally {
            if (browser) {
                // Browser ko gracefully close karein, taaki memory release ho
                try {
                    await browser.close();
                } catch(e) {
                    console.error(`[Load ${loadId}] WARNING: Error closing browser: ${e.message}`);
                }
            }
        }
        
        // --- 5. MAIN DELAY ---
        const totalDelay = requiredFixedDelayPerLoad;
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
