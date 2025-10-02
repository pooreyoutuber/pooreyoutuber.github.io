const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 10000; 

// 🚨 CORS CONFIGURATION 🚨
app.use(cors({
    origin: 'https://pooreyoutuber.github.io', // आपकी वेबसाइट का URL
    methods: 'POST', 
    optionsSuccessStatus: 200 
}));
// ------------------------------------

// Middleware for parsing JSON requests
app.use(express.json());

// ****************************************************
// 🔑 CONFIGURATION: Proxies and Settings
// ****************************************************

// 1. Search Keywords (CTR boost के लिए Google search simulation)
const SEARCH_KEYWORDS = [
    "advanced project",
    "youtube project site",
    "traffic booster tool",
    "web traffic generation",
    "online utilities" 
]; 

// 2. 🌐 NEW PROXY LIST (Elite Public Proxies from latest list)
// फॉर्मेट: http://ip:port
// हमने आपके पिछले Authenticated Proxies को बदल दिया है।
const PROXY_LIST = [
    // 1. Canada, Elite, ~435 ms
    'http://159.203.61.169:8080', 

    // 2. Russia - Seversk, Elite, ~498 ms
    'http://109.194.34.246:8082', 

    // 3. Kazakhstan - Almaty, Elite, ~824 ms
    'http://82.115.60.65:80',

    // 4. China - Beijing, Elite, ~2469 ms
    'http://8.130.39.117:8080', 

    // 5. China - Shenzhen, Elite, ~2479 ms
    'http://47.121.183.107:9080',

    // 6. China - Guangzhou, Elite, ~2569 ms
    'http://8.138.125.130:9098',

    // 7. United States, Elite, ~2374 ms
    'http://47.251.87.199:2083',

    // 8. Singapore, Elite, ~2440 ms
    'http://47.237.2.245:3128', 

    // 9. Canada, Elite, ~2150 ms
    'http://72.10.160.90:22615',

    // 10. Germany - Frankfurt, Elite, ~2064 ms 
    'http://8.209.96.245:80'
];

const PROXY_RETRY_COUNT = 2; 
const BREAK_BETWEEN_VIEWS_MS = 60000; 

let proxyIndex = 0;
let totalProxies = PROXY_LIST.length;
let requestCount = 0;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ----------------------------------------------------
// Core Logic: User Simulation Function
// ----------------------------------------------------

async function simulateUserVisit(targetUrl, currentViewNumber, proxy) {
    let driver;
    // Public proxy में username/password नहीं होता है, इसलिए displayProxy सीधे proxy होगा
    const displayProxy = proxy.replace('http://', ''); 
    const logPrefix = `[REQ ${currentViewNumber} | PROXY: ${displayProxy}]`;

    // Configure Chrome Options (Render पर ज़रूरी)
    let options = new chrome.Options();
    options.addArguments('--headless'); 
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    
    // PROXY CONFIGURATION
    options.addArguments(`--proxy-server=${displayProxy}`); 
    
    // Bot Detection से बचने के लिए
    options.addArguments('--disable-blink-features=AutomationControlled');
    options.excludeSwitches('enable-automation');
    options.addArguments('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    try {
        console.log(`${logPrefix} 🚀 ब्राउज़र शुरू हो रहा है. Target: ${targetUrl}`);
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();
            
        // 🚨 PROXY AUTHENTICATION CODE हटा दिया गया है 🚨
        // क्योंकि हम पब्लिक प्रॉक्सी का उपयोग कर रहे हैं (username/password के बिना)।
        
        // 1. Google पर जाएँ
        await driver.get('https://www.google.com');
        await sleep(2000 + Math.random() * 2000); 

        // 2. रैंडम कीवर्ड से सर्च करें 
        const targetDomain = new URL(targetUrl).hostname;
        const currentSearchKeyword = SEARCH_KEYWORDS[Math.floor(Math.random() * SEARCH_KEYWORDS.length)] + " " + targetDomain.replace('www.', '');
        console.log(`${logPrefix} 🔎 Google पर सर्च कर रहा है: "${currentSearchKeyword}"`);
        let searchBox = await driver.findElement(By.name('q'));
        await searchBox.sendKeys(currentSearchKeyword, Key.RETURN);
        await sleep(4000 + Math.random() * 3000); 

        // 3. यूजर की वेबसाइट के लिंक पर क्लिक करें
        const targetLinkSelector = By.xpath(`//a[contains(@href, "${targetDomain}")]`);
        await driver.wait(until.elementLocated(targetLinkSelector), 15000); 
        let targetLink = await driver.findElement(targetLinkSelector);
        
        console.log(`${logPrefix} 🔗 वेबसाइट पर क्लिक कर रहा है: ${targetDomain}`);
        await targetLink.click();

        // 4. साइट पर इंगेजमेंट (90 से 240 सेकंड)
        const visitDuration = 90 + Math.random() * 150;
        console.log(`${logPrefix} ⏳ साइट पर ${visitDuration.toFixed(0)} सेकंड के लिए रुका है...`);
        
        await driver.executeScript("window.scrollTo(0, document.body.scrollHeight * Math.random());");
        await sleep(visitDuration * 1000);

        console.log(`${logPrefix} ✅ विज़िट पूरी हुई!`);
        return true; 

    } catch (error) {
        // प्रॉक्सी फ़ेल होने पर स्पष्ट एरर मैसेज
        console.error(`${logPrefix} ❌ ERROR: विज़िट विफल (Proxy Blocked/Timeout/Failed).`);
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
    const targetUrl = req.body.url;
    const viewsToGenerate = parseInt(req.body.views) || 5; 
    
    // URL Validation
    if (!targetUrl || !targetUrl.startsWith('http')) {
        return res.status(400).json({ status: 'error', message: 'Invalid URL provided. Must start with http or https.' });
    }

    requestCount++;
    console.log(`\n--- NEW BOOST REQUEST #${requestCount} for ${targetUrl} (Views: ${viewsToGenerate}) ---`);

    // API तुरंत response दे: इसे background में चलाने के लिए
    res.json({ status: 'processing', message: `Starting ${viewsToGenerate} views for ${targetUrl} in background.` });

    // लॉजिक को background में चलाएं (API कॉल को ब्लॉक होने से रोकता है)
    (async () => {
        let successfulViews = 0;
        
        for (let i = 0; i < viewsToGenerate; i++) {
            const currentProxy = PROXY_LIST[proxyIndex];
            let attemptSuccess = false;
            
            for (let attempt = 1; attempt <= PROXY_RETRY_COUNT; attempt++) {
                console.log(`\n-- View ${i + 1}/${viewsToGenerate} on Proxy Index ${proxyIndex} --`);
                
                const success = await simulateUserVisit(targetUrl, requestCount, currentProxy);
                
                if (success) {
                    successfulViews++;
                    attemptSuccess = true;
                    break;
                } else {
                    console.log("Proxy failed. Trying next proxy or retry.");
                }
            }
            
            // प्रॉक्सी रोटेट करें
            proxyIndex = (proxyIndex + 1) % totalProxies;
            
            // ब्रेक दें
            await sleep(BREAK_BETWEEN_VIEWS_MS + Math.random() * 30000); // 1 से 1.5 मिनट
        }
        
        console.log(`\n--- BOOST REQUEST #${requestCount} FINISHED. Total success: ${successfulViews}/${viewsToGenerate} ---`);
    })(); 
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Traffic Booster API is running.' });
});

// ----------------------------------------------------
// Server Start
// ----------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n🌐 Traffic Booster API running and ready to accept commands on port ${PORT}.`);
});
