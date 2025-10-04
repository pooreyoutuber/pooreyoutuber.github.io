const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 10000; 

// Body Parser and CORS Setup
app.use(cors({
    origin: 'https://pooreyoutuber.github.io', 
    methods: 'POST', 
    optionsSuccessStatus: 200 
}));
app.use(express.json()); // Essential for reading user input

// CONFIGURATION (NO PROXY LIST HERE)
const SEARCH_KEYWORDS = [
    "advanced project",
    "web traffic generation",
    "college project traffic" 
]; 

// Break between attempts: Reduced to 15 seconds for faster testing, but it can be blocked quicker.
const BREAK_BETWEEN_VIEWS_MS = 15000; 

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ----------------------------------------------------
// Core Logic: User Simulation Function (DIRECT Render IP)
// ----------------------------------------------------

async function simulateUserVisit(targetUrl, currentViewNumber) {
    let driver;
    const logPrefix = `[VIEW ${currentViewNumber} | DIRECT RENDER IP]`;

    let options = new chrome.Options();
    options.addArguments('--headless'); 
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    
    // 🚨 IMPORTANT: NO PROXY ARGUMENT IS ADDED HERE.
    
    // Bot Evasion Arguments
    options.addArguments('--disable-blink-features=AutomationControlled');
    options.excludeSwitches('enable-automation');
    options.addArguments('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    try {
        console.log(`${logPrefix} 🚀 Browser starting (Direct Connection). Target: ${targetUrl}`);
        
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();
            
        // 1. Go to Google
        await driver.get('https://www.google.com');
        await sleep(2000 + Math.random() * 2000); 

        // 2. Search Random Keyword (Sending Referrer as Google Search)
        const targetDomain = new URL(targetUrl).hostname;
        const currentSearchKeyword = SEARCH_KEYWORDS[Math.floor(Math.random() * SEARCH_KEYWORDS.length)] + " " + targetDomain.replace('www.', '');
        console.log(`${logPrefix} 🔎 Searching Google for: "${currentSearchKeyword}"`);
        let searchBox = await driver.findElement(By.name('q'));
        await searchBox.sendKeys(currentSearchKeyword, Key.RETURN);
        await sleep(4000 + Math.random() * 3000); 

        // 3. Click the Link 
        const targetLinkSelector = By.xpath(`//a[contains(@href, "${targetDomain}")]`);
        await driver.wait(until.elementLocated(targetLinkSelector), 20000); 
        let targetLink = await driver.findElement(targetLinkSelector);
        
        console.log(`${logPrefix} 🔗 Clicking link to: ${targetDomain}`);
        await targetLink.click();

        // 4. On-site Engagement 
        const visitDuration = 45 + Math.random() * 90; 
        console.log(`${logPrefix} ⏳ Staying on site for ${visitDuration.toFixed(0)} seconds...`);
        
        await driver.executeScript("window.scrollTo(0, document.body.scrollHeight * Math.random());");
        await sleep(visitDuration * 1000);

        console.log(`${logPrefix} ✅ Visit Successful!`);
        return true; 

    } catch (error) {
        console.error(`${logPrefix} ❌ CRITICAL ERROR: Visit failed. Render IP may be blocked or element not found.`);
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
    // Reading URL and Views from user input
    const targetUrl = req.body.url; 
    const viewsToGenerate = parseInt(req.body.views) || 500; 
    
    if (!targetUrl || !targetUrl.startsWith('http')) {
        return res.status(400).json({ status: 'error', message: 'Invalid URL. Please use http:// or https://.' });
    }
    
    // Immediate response to prevent timeout
    res.json({ status: 'processing', message: `Starting ${viewsToGenerate} views for ${targetUrl} via Direct Render IP. Check Render Logs for status.` });

    (async () => {
        let successfulViews = 0;
        for (let i = 0; i < viewsToGenerate; i++) {
            console.log(`\n-- Attempting View ${i + 1}/${viewsToGenerate} --`);
            // Calling simulation without proxy argument
            const success = await simulateUserVisit(targetUrl, i + 1); 
            if (success) {
                successfulViews++;
            }
            await sleep(BREAK_BETWEEN_VIEWS_MS + Math.random() * 10000); 
        }
        console.log(`\n--- BOOST FINISHED. Total success: ${successfulViews}/${viewsToGenerate} ---`);
    })(); 
});

// ----------------------------------------------------
// Server Start and Health Check
// ----------------------------------------------------

app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Traffic Booster API is running. Use /boost-url POST.' });
});

app.listen(PORT, () => {
  console.log(`\n🌐 Traffic Booster API running and ready on port ${PORT}. (No Proxy)`);
});
