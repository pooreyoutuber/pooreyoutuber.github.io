// index.js (FINAL CODE - REAL USER DIRECT TRAFFIC BOOSTER)

const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const cors = require('cors'); 
const fs = require('fs'); 
const puppeteer = require('puppeteer-core'); 
const chromium = require('@sparticuz/chromium'); 

const app = express();
const PORT = process.env.PORT || 10000; 

// --- 1. CONFIGURATION & UTILITIES ---
const rateLimitMap = new Map();
const MAX_REQUESTS_PER_DAY = 4;
const MAX_VIEWS_PER_RUN = 400; // Total page loads
const DAY_IN_MS = 24 * 60 * 60 * 1000;
app.set('trust proxy', 1);

// Gemini Key (Optional: for AI tools, if used)
let GEMINI_KEY;
try {
    GEMINI_KEY = fs.readFileSync('/etc/secrets/gemini', 'utf8').trim(); 
} catch (e) {
    GEMINI_KEY = process.env.GEMINI_API_KEY; 
}
let ai;
if (GEMINI_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
} else {
    // Placeholder AI object to prevent errors if key is missing
    ai = { models: { generateContent: () => Promise.reject(new Error("AI Key Missing")) } };
}

// Puppeteer Arguments for Render/Chromium
const PUPPETEER_ARGS = [
    ...chromium.args, 
    '--no-sandbox', 
    '--disable-setuid-sandbox',
    '--single-process', // Important for memory constrained environments
];

// ⭐ PROXY LIST (Use your provided list)
const PROXY_LIST = [
    "http://104.207.63.195:3129", "http://104.207.61.3:3129", "http://104.207.60.58:3129",
    "http://216.26.254.100:3129", "http://104.207.57.162:3129", "http://209.50.188.66:3129",
    "http://65.111.24.172:3129", "http://216.26.254.110:3129", "http://45.3.42.225:3129",
    "http://45.3.55.246:3129", "http://45.3.53.142:3129", "http://154.213.160.98:3129",
    "http://45.3.44.176:3129", "http://104.207.60.243:3129", "http://104.207.52.73:3129",
    "http://216.26.253.178:3129", "http://154.213.166.61:3129", "http://45.3.45.87:3129"
];

// Random User Agents for diverse traffic
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

// Helper function for proportional view allocation (Ensures views sum up to totalViews)
function generateCompensatedPlan(totalViews, items) {
    const viewPlan = [];
    if (items.length === 0 || totalViews < 1) return [];
    
    const validItems = items.filter(item => item.url && item.percent > 0);
    const totalPercent = validItems.reduce((sum, item) => sum + item.percent, 0) || 100;
    
    // Calculate views and remainders
    let normalizedItems = validItems.map(item => {
        const exactViews = totalViews * (item.percent / totalPercent);
        return {
            url: item.url,
            views: Math.floor(exactViews),
            remainder: exactViews % 1
        };
    });

    let sumOfViews = normalizedItems.reduce((sum, item) => sum + item.views, 0);
    let difference = totalViews - sumOfViews; 

    // Distribute remaining views based on largest remainder
    normalizedItems.sort((a, b) => b.remainder - a.remainder);

    for (let i = 0; i < difference && i < normalizedItems.length; i++) {
        normalizedItems[i].views++;
    }

    // Create final URL list
    normalizedItems.forEach(item => {
        for (let i = 0; i < item.views; i++) {
            viewPlan.push(item.url);
        }
    });
    
    return viewPlan;
}

// --- 2. MIDDLEWARE & ROUTES ---
app.use(cors({
    origin: 'https://pooreyoutuber.github.io', 
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).send('PooreYouTuber Puppeteer API (Real User Booster) is running! 🚀');
});


// --- TIME CONSTANTS ---
// Target delivery window: 24 to 48 hours
const MIN_TOTAL_MS = 24 * 60 * 60 * 1000; 
const MAX_TOTAL_MS = 48 * 60 * 60 * 1000; 

// ===================================================================
// 3. REAL USER DIRECT TRAFFIC ENDPOINT: /boost-real
// ===================================================================
app.post('/boost-real', async (req, res) => {
    
    // --- Rate Limit Check ---
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    let clientData = rateLimitMap.get(clientIp) || { count: 0, lastReset: now };

    if (now - clientData.lastReset > DAY_IN_MS) {
        clientData.count = 0; clientData.lastReset = now;
    }

    if (clientData.count >= MAX_REQUESTS_PER_DAY) {
        return res.status(429).json({ status: 'error', message: `❌ Aap 24 ghante mein adhiktam ${MAX_REQUESTS_PER_DAY} baar hi is tool ka upyog kar sakte hain.` });
    }
    
    const totalViews = parseInt(req.body.views) || 0; 
    const pages = req.body.pages; 
    const totalSlots = 20; 

    if (totalViews < 1 || totalViews > MAX_VIEWS_PER_RUN || !Array.isArray(pages) || pages.length === 0) {
           return res.status(400).json({ status: 'error', message: `Invalid views (1-${MAX_VIEWS_PER_RUN}) or valid Page data missing.` });
    }

    // Apply Rate Limit
    clientData.count += 1;
    clientData.lastReset = now; 
    rateLimitMap.set(clientIp, clientData);
    
    // Calculate final plan
    const finalUrlPlan = generateCompensatedPlan(totalViews, pages);
    const loadsPerSlot = Math.ceil(finalUrlPlan.length / totalSlots);
    
    // --- Immediate Response ---
    res.json({ 
        status: 'accepted', 
        message: `✅ Aapki ${finalUrlPlan.length} Real User Page Loads ki request sweekar kar li gayi hai. Traffic 24-48 ghanton mein poora hoga.`,
        total_loads: finalUrlPlan.length,
        slots: totalSlots
    });

    // Start views generation asynchronously
    (async () => {
        const totalViewsCount = finalUrlPlan.length;
        console.log(`[BOOSTER START] Starting Real User Booster for ${totalViewsCount} Page Loads in ${totalSlots} parallel slots.`);
        
        const slotTasks = [];
        let startIndex = 0;

        for(let slotIndex = 0; slotIndex < totalSlots; slotIndex++) {
            // Distribute loads among 20 slots
            const loadsForSlot = finalUrlPlan.slice(startIndex, startIndex + loadsPerSlot);
            startIndex += loadsForSlot.length;

            if (loadsForSlot.length > 0) {
                // Pass the task to the runner function
                slotTasks.push(runSlotTask(slotIndex + 1, loadsForSlot));
            }
        }
        
        // Wait for all 20 slots to complete their assigned loads
        const results = await Promise.allSettled(slotTasks);
        
        let successfulLoads = results.reduce((sum, result) => {
            return sum + (result.status === 'fulfilled' ? result.value : 0);
        }, 0);
        
        console.log(`[BOOSTER FINISH] All ${totalViewsCount} loads attempted. Successfully recorded: ${successfulLoads}.`);

    })();
});

// ===================================================================
// 4. SLOT RUNNER FUNCTION (Core Puppeteer Logic)
// ===================================================================
async function runSlotTask(slotId, urlList) {
    const totalLoads = urlList.length;
    let loadsCompleted = 0;
    
    // Calculate required delay to fit views within 24-48 hours
    const targetDuration = Math.random() * (MAX_TOTAL_MS - MIN_TOTAL_MS) + MIN_TOTAL_MS;
    const requiredFixedDelayPerLoad = Math.floor(targetDuration / totalLoads);
    
    for (let i = 0; i < totalLoads; i++) {
        const loadId = `${slotId}-${i + 1}`;
        const targetURL = urlList[i];
        let browser = null;

        try {
            // --- 1. Browser launch with NEW Proxy (for true IP and context change) ---
            const proxyUrl = getRandomProxy();
            if (!proxyUrl) throw new Error('Proxy list empty.');
            
            const ipPort = proxyUrl.replace('http://', ''); 
            const proxyArgs = [
                ...PUPPETEER_ARGS,
                `--proxy-server=${ipPort}` 
            ];

            browser = await puppeteer.launch({
                args: proxyArgs, 
                executablePath: await chromium.executablePath(), 
                headless: chromium.headless,
            });
            
            let page = await browser.newPage();
            
            // --- 2. Set Random User Agent and Headers ---
            const userAgent = getRandomUserAgent();
            await page.setUserAgent(userAgent);
            await page.setViewport({ width: 1366, height: 768 });
            await page.setExtraHTTPHeaders({
                // Using Google as a natural referrer for "Direct" traffic reporting
                'Referer': 'https://www.google.com/', 
            });
            
            console.log(`[Load ${loadId}] Navigating to: ${targetURL} with Proxy: ${proxyUrl}`);
            
            // --- 3. Page Navigate (Load) ---
            await page.goto(targetURL, { waitUntil: 'networkidle0', timeout: 60000 });
            
            // --- 4. Engagement (Scroll & Random Wait: 4s-7s) ---
            // 4-5 seconds wait ke liye, hum 4000ms se 7000ms ka random time lenge.
            const engagementTime = Math.floor(Math.random() * (7000 - 4000) + 4000); 
            
            const scrollHeight = await page.evaluate(() => {
                return document.body ? document.body.scrollHeight : 0; 
            });
            
            if (scrollHeight > 0) {
                // Random Scroll percentage (50% to 95%)
                const scrollPercent = Math.random() * (0.95 - 0.5) + 0.5;
                const targetScroll = Math.min(scrollHeight * scrollPercent, scrollHeight - 10);
                
                await page.evaluate((targetScroll) => {
                    window.scrollBy(0, targetScroll);
                }, targetScroll);
                
                console.log(`[Load ${loadId}] Scroll simulated. Staying for ${Math.round(engagementTime/1000)}s.`);
            } else {
                console.warn(`[Load ${loadId}] WARNING: No scroll. Staying for ${Math.round(engagementTime/1000)}s.`);
            }

            await new Promise(resolve => setTimeout(resolve, engagementTime)); 
            
            loadsCompleted++;

        } catch (pageError) {
            console.error(`[Load ${loadId}] FAILURE ❌ | Error during load: ${pageError.message.substring(0, 100)}...`);
        } finally {
            // Har load ke baad browser close karna to free up resources and ensure proxy change
            if (browser) {
                await browser.close();
            }
        }
        
        // --- 5. MAIN DELAY ---
        const totalDelay = requiredFixedDelayPerLoad;
        console.log(`[Delay] Waiting for ${Math.round(totalDelay/1000)}s before next load in Slot ${slotId}.`);
        await new Promise(resolve => setTimeout(resolve, totalDelay));
    }

    return loadsCompleted;
}


// ===================================================================
// 5. AI ENDPOINTS (PLACEHOLDERS)
// ===================================================================
// AI endpoints ko yahan simplified rakha gaya hai
app.post('/api/caption-generate', (req, res) => {
    if (!GEMINI_KEY) return res.status(500).json({ error: 'AI Key Missing.' });
    res.status(500).json({ error: 'AI generation not fully implemented in this version.' });
});

app.post('/api/caption-edit', (req, res) => {
    if (!GEMINI_KEY) return res.status(500).json({ error: 'AI Key Missing.' });
    res.status(500).json({ error: 'AI editing not fully implemented in this version.' });
});


// ===================================================================
// 6. START THE SERVER 
// ===================================================================
app.listen(PORT, () => {
    console.log(`Combined API Server listening on port ${PORT}.`);
});
