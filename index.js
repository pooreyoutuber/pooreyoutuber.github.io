const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');
const url = require('url'); 
puppeteer.use(StealthPlugin());

const app = express();
// Render uses the PORT environment variable, not a fixed port like 10000
const port = process.env.PORT || 10000; 

app.use(express.json());

// ======================= 1. Configuration and Proxy Data (HARDCODED) ========================

// 🚨 Webshare Proxy Credentials (Hardcoded)
const PROXY_USER = "bqctypvz";
const PROXY_PASS = "399xb3kxqv6i";

// Your Webshare IPs List
const PROXY_LIST_STRING = "http://142.111.48.253:7030,http://31.59.20.176:6754,http://38.170.176.177:5572,http://198.23.239.134:6540,http://45.38.107.97:6014,http://107.172.163.27:6543,http://64.137.96.74:6641,http://216.10.27.159:6837,http://142.111.67.146:5611,http://142.147.128.93:6593"; 

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY; 

// Prepare Proxy List
let PROXIES = [];
if (PROXY_LIST_STRING) {
    PROXIES = PROXY_LIST_STRING.split(',').filter(p => p.length > 0);
}

let proxyIndex = 0;
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ======================= 2. Advanced Traffic Logic ========================

async function sendAdvancedTraffic(jobId, viewNumber, proxyUrl, targetUrl) {
    let browser;
    let finalProxyUrl = null; 

    if (proxyUrl && PROXY_USER && PROXY_PASS) {
        try {
            const urlObj = new URL(proxyUrl);
            finalProxyUrl = `${urlObj.protocol}//${PROXY_USER}:${PROXY_PASS}@${urlObj.host}`;
        } catch (e) {
            console.error(`[${jobId}] Invalid Proxy URL in list: ${proxyUrl}`);
            finalProxyUrl = null; 
        }
    }
    
    try {
        const displayProxy = finalProxyUrl ? finalProxyUrl.split('@').pop() : 'Direct Connection (No Proxy)';
        console.log(`[🚀 ${jobId} View ${viewNumber}] Starting with: ${displayProxy}`);

        // --- 1. Launch Browser ---
        let launchArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu', 
            '--window-size=1280,720' 
        ];

        if (finalProxyUrl) {
            launchArgs.push(`--proxy-server=${finalProxyUrl}`);
        }

        try {
            browser = await puppeteer.launch({
                headless: true,
                args: launchArgs, 
                timeout: 45000 
            });
        } catch (e) {
            console.error(`[❌ ${jobId} View ${viewNumber}] BROWSER LAUNCH FAILED (Proxy connection failed). Error: ${e.message}. Skipping this view.`);
            return; 
        }

        const page = await browser.newPage();
        
        // 2. Navigation
        console.log(`[🟢 ${jobId} View ${viewNumber}] Navigating directly to: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        
        // 3. Interaction
        console.log(`[${jobId} View ${viewNumber}] Landed. Starting deep interaction...`);
        const totalDuration = Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000; 
        const scrollCount = 4;
        const scrollDelay = totalDuration / scrollCount;

        for (let i = 1; i <= scrollCount; i++) {
            const scrollAmount = Math.floor(Math.random() * 500) + 100;
            await page.evaluate(y => { window.scrollBy(0, y); }, scrollAmount); 
            await page.waitForTimeout(scrollDelay * (Math.random() * 0.5 + 0.75)); 
        }

        console.log(`[✅ ${jobId} View ${viewNumber}] Full User Journey Complete.`);

    } catch (error) {
        console.error(`[❌ ${jobId} View ${viewNumber}] Job failed (Navigation/Timeout). Error: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// ----------------------------------------------------
// API ENDPOINTS 
// ----------------------------------------------------

app.post('/api/boost-traffic', async (req, res) => {
    const { targetUrl, searchQuery, views } = req.body; 
    
    if (!targetUrl || !views || views > 500) {
        return res.status(400).json({ success: false, message: "Missing fields or views > 500." });
    }
    
    const jobId = uuidv4().substring(0, 8);
    const TOTAL_DISPATCH_TIME_HOURS = 24; 
    const TOTAL_DISPATCH_TIME_MS = TOTAL_DISPATCH_TIME_HOURS * 60 * 60 * 1000;
    const BASE_DELAY_MS = TOTAL_DISPATCH_TIME_MS / views; 
    
    const mode = PROXIES.length > 0 ? "Proxy Rotation (Hardcoded)" : "Direct Connection (Render IP)";

    // Respond immediately (202 Accepted) to prevent client timeout
    res.status(202).json({
        success: true, 
        message: `Job ${jobId} accepted. ${views} views will be dispatched over the next ${TOTAL_DISPATCH_TIME_HOURS} hours. Mode: ${mode}`, 
        simulation_mode: mode 
    });

    // Start background processing
    for (let i = 1; i <= views; i++) {
        let currentProxy = null;
        
        if (PROXIES.length > 0) {
            currentProxy = PROXIES[proxyIndex];
            proxyIndex = (proxyIndex + 1) % PROXIES.length;
        }

        await sendAdvancedTraffic(jobId, i, currentProxy, targetUrl);

        const randomVariation = Math.random() * 0.3 + 0.85; 
        const finalDelay = BASE_DELAY_MS * randomVariation;

        console.log(`[⏱️ ${jobId} View ${i}/${views}] Waiting for ${(finalDelay / 1000 / 60).toFixed(2)} minutes before next dispatch.`);
        await wait(finalDelay); 
    }
    
    console.log(`--- Job ${jobId} Finished! All ${views} views delivered over ${TOTAL_DISPATCH_TIME_HOURS} hours. ---`);
});


// Other endpoints (omitted for brevity, they remain the same)
app.post('/api/generate-caption', async (req, res) => { res.status(501).json({ success: false, message: "AI services not implemented in this version." }); });
app.post('/api/generate-article', async (req, res) => { res.status(501).json({ success: false, message: "AI services not implemented in this version." }); });


// Health check endpoint (for Render to know the server is active)
app.get('/', (req, res) => {
    res.send('Service is active and listening to /api/boost-traffic');
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
