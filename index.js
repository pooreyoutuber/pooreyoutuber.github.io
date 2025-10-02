const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const express = require('express');
const cors = require('cors'); // CORS लाइब्रेरी को इम्पोर्ट करें
const app = express();
const PORT = process.env.PORT || 10000; 

// 🚨 CORS CONFIGURATION (कनेक्शन एरर को ठीक करने के लिए ज़रूरी) 🚨
// यह केवल आपकी GitHub Pages वेबसाइट को API कॉल करने की अनुमति देता है।
app.use(cors({
    origin: 'https://pooreyoutuber.github.io', 
    methods: 'POST', // हम केवल POST रिक्वेस्ट स्वीकार करते हैं
    optionsSuccessStatus: 200 
}));
// ------------------------------------

// Middleware for parsing JSON requests (इसे CORS के नीचे रखें)
app.use(express.json());

// ****************************************************
// 🔑 CONFIGURATION: Proxies (आपके वर्किंग प्रॉक्सी)
// ****************************************************

// 1. Search Keywords (यूजर के URL को Google पर क्लिक दिलाने के लिए)
const SEARCH_KEYWORDS = [
    "advanced project",
    "youtube project site",
    "traffic booster tool",
    "web traffic generation",
    "online utilities" 
]; 

// 2. 🌐 AUTHENTICATED PROXY LIST 
// फॉर्मेट: http://username:password@ip:port
const PROXY_LIST = [
    'http://bqcftypvz:399xb3kxxqv6i@142.111.48.253:7030', 
    'http://bqcftypvz:399xb3kxxqv6i@198.23.239.134:6540', 
    'http://bqcftypvz:399xb3kxxqv6i@45.38.107.97:6014',  
    'http://bqcftypvz:399xb3kxxqv6i@107.172.163.27:6543', 
    'http://bqcftypvz:399xb3kxxqv6i@64.137.96.74:6641',  
    'http://bqcftypvz:399xb3kxxqv6i@154.203.43.247:5536', 
    'http://bqcftypvz:399xb3kxxqv6i@84.247.60.125:6095', 
    'http://bqcftypvz:399xb3kxxqv6i@216.10.27.159:6837', 
    'http://bqcftypvz:399xb3kxxqv6i@142.111.67.146:5611', 
    'http://bqcftypvz:399xb3kxxqv6i@142.147.128.93:6593', 
];
const PROXY_RETRY_COUNT = 2; 
const BREAK_BETWEEN_VIEWS_MS = 60000; // 1 मिनट का ब्रेक (60 सेकंड)

let proxyIndex = 0;
let totalProxies = PROXY_LIST.length;
let requestCount = 0;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ----------------------------------------------------
// Core Logic: User Simulation Function (Dynamic URL)
// ----------------------------------------------------

async function simulateUserVisit(targetUrl, currentViewNumber, proxy) {
    let driver;
    // प्रॉक्सी में से Auth part हटाकर display करना
    const displayProxy = proxy.split('@').pop() || proxy; 
    const logPrefix = `[REQ ${currentViewNumber} | PROXY: ${displayProxy}]`;

    // Configure Chrome Options (Render पर ज़रूरी)
    let options = new chrome.Options();
    options.addArguments('--headless'); 
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    
    // PROXY CONFIGURATION
    const authPart = proxy.replace('http://', '').split('@')[0];
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
            
        // 🚨 PROXY AUTHENTICATION STEP (CDP) 🚨
        const client = await driver.getDevToolsClient();
        await client.send('Network.setExtraHTTPHeaders', {
             headers: {
                 'Proxy-Authorization': `Basic ${Buffer.from(authPart).toString('base64')}`
             }
        });

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
        console.error(`${logPrefix} ❌ ERROR: विज़िट विफल (Proxy/Timeout/Blocked).`);
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

    // लॉजिक को background में चलाएं
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
