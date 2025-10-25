// index.js

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { v4: uuidv4 } = require('uuid');
const url = require('url'); 
puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 10000; 

app.use(express.json());

// ======================= 1. Configuration and Proxy Data (HARDCODED) ========================

// 🚨 Hardcoded Webshare Proxy Credentials
const PROXY_USER = "bqctypvz";
const PROXY_PASS = "399xb3kxqv6i";

// Your Webshare IPs List (Ensure you have at least 8 unique IPs here)
const PROXY_LIST_STRING = "http://142.111.48.253:7030,http://31.59.20.176:6754,http://38.170.176.177:5572,http://198.23.239.134:6540,http://45.38.107.97:6014,http://107.172.163.27:6543,http://64.137.96.74:6641,http://216.10.27.159:6837,http://142.111.67.146:5611,http://142.147.128.93:6593"; 

let PROXIES = PROXY_LIST_STRING ? PROXY_LIST_STRING.split(',').filter(p => p.length > 0) : [];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ======================= 2. Advanced Traffic Logic (Puppeteer) ========================

async function sendAdvancedTraffic(jobId, viewNumber, proxyUrl, targetUrl) {
    let browser;
    let finalProxyUrl = null; 

    if (proxyUrl && PROXY_USER && PROXY_PASS) {
        try {
            const urlObj = new URL(proxyUrl);
            finalProxyUrl = `${urlObj.protocol}//${PROXY_USER}:${PROXY_PASS}@${urlObj.host}`;
        } catch (e) {
            console.error(`[${jobId}] View ${viewNumber}: Invalid Proxy URL. Error: ${e.message}`);
            finalProxyUrl = null; 
        }
    }
    
    try {
        const displayProxy = finalProxyUrl ? finalProxyUrl.split('@').pop() : 'Direct Connection (No Proxy)';
        console.log(`[🚀 ${jobId} View ${viewNumber}] Starting with: ${displayProxy}`);

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
            // CRITICAL: Prevent server crash on proxy failure
            console.error(`[❌ ${jobId} View ${viewNumber}] BROWSER LAUNCH FAILED. Error: ${e.message}. Skipping view.`);
            return; 
        }

        const page = await browser.newPage();
        
        // Navigation and Interaction
        console.log(`[🟢 ${jobId} View ${viewNumber}] Navigating directly to: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        
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
        console.error(`[❌ ${jobId} View ${viewNumber}] Job failed (Navigation/Interaction Timeout). Error: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// ----------------------------------------------------
// API ENDPOINT (PARALLEL EXECUTION)
// ----------------------------------------------------

app.post('/api/boost-traffic', async (req, res) => {
    const { targetUrl, views } = req.body; 
    
    if (!targetUrl || !views || views > 500) {
        return res.status(400).json({ success: false, message: "Missing fields or views > 500." });
    }
    
    const jobId = uuidv4().substring(0, 8);
    const mode = PROXIES.length > 0 ? "Parallel Proxy Rotation (Webshare Hardcoded)" : "Direct Connection (Render IP)";
    
    // The number of simultaneous parallel jobs will be limited by the number of views requested, 
    // and the number of available proxies (capped at 8 for efficiency and resource management).
    const maxConcurrency = Math.min(views, PROXIES.length, 8); 

    res.status(202).json({
        success: true, 
        message: `Job ${jobId} accepted. ${views} views will be dispatched in parallel batches (Concurrency: ${maxConcurrency}).`, 
        simulation_mode: mode 
    });

    const tasks = [];
    const BATCH_SIZE = maxConcurrency;
    
    // Create a pool of promises to run concurrently
    for (let i = 1; i <= views; i++) {
        const proxyUrl = PROXIES[(i - 1) % PROXIES.length];
        
        // Create the promise for the traffic job
        const jobPromise = sendAdvancedTraffic(jobId, i, proxyUrl, targetUrl);
        tasks.push(jobPromise);
        
        // Use Promise.all() to run a batch concurrently
        if (tasks.length >= BATCH_SIZE || i === views) {
            console.log(`--- [Batch ${Math.ceil(i / BATCH_SIZE)}] Dispatching ${tasks.length} views in parallel... ---`);
            await Promise.all(tasks);
            tasks.length = 0; // Clear the batch for the next set
            
            // Add a small, randomized delay between batches to reduce immediate load spikes
            if (i < views) {
                const delay = 5000 + Math.random() * 5000; // 5 to 10 seconds delay
                console.log(`--- Waiting ${Math.round(delay / 1000)}s before next batch ---`);
                await wait(delay);
            }
        }
    }
    
    console.log(`--- Job ${jobId} Finished! All ${views} views delivered. ---`);
});


// Health check endpoint
app.get('/', (req, res) => {
    res.send('Service is active and listening to /api/boost-traffic');
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
