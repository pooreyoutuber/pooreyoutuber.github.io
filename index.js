const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 10000; 

// Make sure to install these dependencies in package.json:
// "dependencies": {
//   "selenium-webdriver": "^4.0.0",
//   "express": "^4.17.1",
//   "cors": "^2.8.5"
// }

// ****************************************************
// 🔑 CONFIGURATION: Target and Settings
// ****************************************************

// 1. Target URL (Your Website)
const TARGET_URL = 'https://pooreyoutuber.github.io/';

// 2. Search Keywords (To generate Search Console Clicks)
const SEARCH_KEYWORDS = [
    "advanced project",
    "youtube project site",
    "traffic booster tool",
    "web traffic generation"
]; 

// 3. 🌐 FREE PROXY LIST (No Authentication)
// 🚨 IMPORTANT: Replace these with fresh, low-latency free proxies from your source. 
// These proxies WILL fail often.
const PROXY_LIST = [
    "203.203.1.252:8080",  // Example from the list
    "103.197.106.196:8080", // Example
    // Add more fresh free proxies here.
];

const BREAK_BETWEEN_VIEWS_MS = 60000; // 1 minute break between views

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ----------------------------------------------------
// Core Logic: User Simulation Function (with FREE Proxy)
// ----------------------------------------------------

async function simulateUserVisit(targetUrl, currentViewNumber, proxy) {
    let driver;
    const logPrefix = `[VIEW ${currentViewNumber} | PROXY: ${proxy}]`;

    let options = new chrome.Options();
    options.addArguments('--headless'); 
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    
    // Set Proxy Server (No Auth needed for Free Proxies)
    options.addArguments(`--proxy-server=${proxy}`); 
    
    // Bot Evasion Arguments
    options.addArguments('--disable-blink-features=AutomationControlled');
    options.excludeSwitches('enable-automation');
    options.addArguments('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    try {
        console.log(`${logPrefix} 🚀 ब्राउज़र शुरू हो रहा है. Target: ${targetUrl}`);
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();
            
        // 1. Go to Google
        await driver.get('https://www.google.com');
        await sleep(2000 + Math.random() * 2000); 

        // 2. Search Random Keyword (This is key for Search Console results)
        const targetDomain = new URL(targetUrl).hostname;
        const currentSearchKeyword = SEARCH_KEYWORDS[Math.floor(Math.random() * SEARCH_KEYWORDS.length)] + " " + targetDomain.replace('www.', '');
        console.log(`${logPrefix} 🔎 Google पर सर्च कर रहा है: "${currentSearchKeyword}"`);
        let searchBox = await driver.findElement(By.name('q'));
        await searchBox.sendKeys(currentSearchKeyword, Key.RETURN);
        await sleep(4000 + Math.random() * 3000); 

        // 3. Click the Link (Locate the link containing your domain)
        const targetLinkSelector = By.xpath(`//a[contains(@href, "${targetDomain}")]`);
        await driver.wait(until.elementLocated(targetLinkSelector), 15000); 
        let targetLink = await driver.findElement(targetLinkSelector);
        
        console.log(`${logPrefix} 🔗 वेबसाइट पर क्लिक कर रहा है: ${targetDomain}`);
        await targetLink.click();

        // 4. On-site Engagement (Long duration for good GA metrics)
        const visitDuration = 90 + Math.random() * 150;
        console.log(`${logPrefix} ⏳ साइट पर ${visitDuration.toFixed(0)} सेकंड के लिए रुका है...`);
        
        await driver.executeScript("window.scrollTo(0, document.body.scrollHeight * Math.random());");
        await sleep(visitDuration * 1000);

        console.log(`${logPrefix} ✅ विज़िट पूरी हुई!`);
        return true; 

    } catch (error) {
        // Log the failure (which is common with free/datacenter proxies)
        console.error(`${logPrefix} ❌ ERROR: विज़िट विफल (Proxy Dead/Blocked).`);
        return false; 
    } finally {
        if (driver) {
            await driver.quit();
        }
    }
}

// ----------------------------------------------------
// 🌐 API ENDPOINT (/boost-url)
// ----------------------------------------------------

app.post('/boost-url', async (req, res) => {
    // We ignore the URL from the body, as it's always the same in this setup
    const targetUrl = TARGET_URL; 
    const viewsToGenerate = parseInt(req.body.views) || 5; 
    
    if (PROXY_LIST.length === 0) {
        return res.status(503).json({ status: 'error', message: 'No proxy configured. Update PROXY_LIST.' });
    }

    // Send processing message back immediately to the frontend
    res.json({ status: 'processing', message: `Starting ${viewsToGenerate} views for ${targetUrl} in background.` });

    // Start the boosting process asynchronously
    (async () => {
        let successfulViews = 0;
        
        for (let i = 0; i < viewsToGenerate; i++) {
            // Cycle through the available proxies
            const currentProxy = PROXY_LIST[i % PROXY_LIST.length]; 
            
            console.log(`\n-- Attempting View ${i + 1}/${viewsToGenerate} --`);
            
            const success = await simulateUserVisit(targetUrl, i + 1, currentProxy);
            
            if (success) {
                successfulViews++;
            }
            
            // Wait between views
            await sleep(BREAK_BETWEEN_VIEWS_MS + Math.random() * 30000); 
        }
        
        console.log(`\n--- BOOST FINISHED. Total success: ${successfulViews}/${viewsToGenerate} ---`);
    })(); 
});

// ----------------------------------------------------
// Server Start and Health Check
// ----------------------------------------------------
// CORS configuration to allow your GitHub frontend to call this API
app.use(cors({
    origin: 'https://pooreyoutuber.github.io', 
    methods: 'POST', 
    optionsSuccessStatus: 200 
}));
app.use(express.json());

// Health check endpoint (Used to wake the Render service up)
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Traffic Booster API is running. Use /boost-url POST.' });
});

app.listen(PORT, () => {
  console.log(`\n🌐 Traffic Booster API running and ready to accept commands on port ${PORT}.`);
});
