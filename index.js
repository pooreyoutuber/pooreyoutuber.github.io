    // index.js

const express = require('express');
// BUG FIXED: 'require' was duplicated. Now it's correct:
const puppeteer = require('puppeteer-extra'); 
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { v4: uuidv4 } = require('uuid');
const url = require('url'); 

// Puppeteer setup for stealth and anti-bot detection
puppeteer.use(StealthPlugin());

const app = express();
// Use the PORT environment variable provided by Render
const port = process.env.PORT || 10000; 

app.use(express.json());

// ======================= 1. Configuration and Proxy Data (HARDCODED) ========================

// 🚨 Hardcoded Webshare Proxy Credentials
const PROXY_USER = "bqctypvz";
const PROXY_PASS = "399xb3kxqv6i";

// 10 Webshare IPs
const PROXY_LIST_STRING = "http://142.111.48.253:7030,http://31.59.20.176:6754,http://38.170.176.177:5572,http://198.23.239.134:6540,http://45.38.107.97:6014,http://107.172.163.27:6543,http://64.137.96.74:6641,http://216.10.27.159:6837,http://142.111.67.146:5611,http://142.147.128.93:6593"; 

let PROXIES = PROXY_LIST_STRING ? PROXY_LIST_STRING.split(',').filter(p => p.length > 0) : [];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ======================= 2. Advanced Traffic Logic (Puppeteer) ========================
// Function to handle a single view/traffic session

async function sendAdvancedTraffic(jobId, viewNumber, proxyUrl, targetUrl) {
    let browser;
    let finalProxyUrl = null; 

    // 1. Format Proxy URL with credentials
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

        // --- 2. Configure and Launch Browser ---
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
            // Launch attempt with high timeout for slow proxies
            browser = await puppeteer.launch({
                headless: true, // Run in headless mode (no visible browser window)
                args: launchArgs, 
                timeout: 45000 // 45 seconds to launch browser
            });
        } catch (e) {
            // CRITICAL ERROR HANDLING: Prevents the server from crashing when the proxy connection fails.
            console.error(`[❌ ${jobId} View ${viewNumber}] BROWSER LAUNCH FAILED (Proxy connection failed/Puppeteer Error). Error: ${e.message}. Skipping view.`);
            return; 
        }

        const page = await browser.newPage();
        
        // --- 3. Navigation and Interaction ---
        console.log(`[🟢 ${jobId} View ${viewNumber}] Navigating directly to: ${targetUrl}`);
        // Navigate attempt
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }); // 45 seconds for navigation
        
        // Simulate deep user interaction (scrolling and waiting)
        const totalDuration = Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000; // 15-30 seconds total session time
        const scrollCount = 4;
        const scrollDelay = totalDuration / scrollCount;

        for (let i = 1; i <= scrollCount; i++) {
            const scrollAmount = Math.floor(Math.random() * 500) + 100;
            await page.evaluate(y => { window.scrollBy(0, y); }, scrollAmount); 
            await page.waitForTimeout(scrollDelay * (Math.random() * 0.5 + 0.75)); 
        }

        console.log(`[✅ ${jobId} View ${viewNumber}] Full User Journey Complete.`);

    } catch (error) {
        // General error handling for navigation timeouts or other session issues
        console.error(`[❌ ${jobId} View ${viewNumber}] Job failed (Navigation/Interaction Timeout). Error: ${error.message}`);
    } finally {
        // Ensure browser is closed
        if (browser) {
            await browser.close();
        }
    }
}

// ----------------------------------------------------
// API ENDPOINT (PARALLEL EXECUTION)
// ----------------------------------------------------

app.post('/api/boost-traffic', async (req, res) => {
    // Only extract necessary data
    const { targetUrl, views } = req.body; 
    
    if (!targetUrl || !views || views > 500 || views < 1) {
        return res.status(400).json({ success: false, message: "Missing fields or views must be between 1 and 500." });
    }
    
    const jobId = uuidv4().substring(0, 8);
    const mode = PROXIES.length > 0 ? "Parallel Proxy Rotation (Max 8 concurrent views)" : "Direct Connection (Render IP)";
    
    // Set concurrency limit: Max 8 simultaneous views, limited by available proxies or requested views.
    const maxConcurrency = Math.min(views, PROXIES.length, 8); 

    // 1. Respond immediately (202 Accepted) to prevent client timeout
    res.status(202).json({
        success: true, 
        message: `Job ${jobId} accepted. ${views} views will be dispatched in parallel batches (Concurrency: ${maxConcurrency}).`, 
        simulation_mode: mode 
    });

    const tasks = [];
    const BATCH_SIZE = maxConcurrency;
    
    // 2. Start Parallel Background Processing
    for (let i = 1; i <= views; i++) {
        // Assign proxy in a round-robin fashion
        const proxyUrl = PROXIES[(i - 1) % PROXIES.length];
        
        // Create the promise for the traffic job
        const jobPromise = sendAdvancedTraffic(jobId, i, proxyUrl, targetUrl);
        tasks.push(jobPromise);
        
        // When the batch size is reached or it's the last view, execute the batch in parallel
        if (tasks.length >= BATCH_SIZE || i === views) {
            console.log(`--- [Batch ${Math.ceil(i / BATCH_SIZE)}] Dispatching ${tasks.length} views in parallel... ---`);
            await Promise.all(tasks); // This line runs all promises concurrently
            tasks.length = 0; // Clear the batch
            
            // Add a small delay between batches
            if (i < views) {
                const delay = 5000 + Math.random() * 5000; // 5 to 10 seconds delay
                console.log(`--- Waiting ${Math.round(delay / 1000)}s before next batch ---`);
                await wait(delay);
            }
        }
    }
    
    console.log(`--- Job ${jobId} Finished! All ${views} views delivered. ---`);
});


// Health check endpoint for Render service status
app.get('/', (req, res) => {
    res.send('Service is active and listening to /api/boost-traffic');
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
