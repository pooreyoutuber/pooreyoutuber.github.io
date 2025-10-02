const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 10000; 

// 🚨 CORS CONFIGURATION 🚨
app.use(cors({
    origin: 'https://pooreyoutuber.github.io', 
    methods: 'POST', 
    optionsSuccessStatus: 200 
}));
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

// 2. 🌐 PROXY LIST (अपनी ORIGINAL Authenticated Proxies यहाँ भरें)
// फॉर्मेट: http://username:password@ip:port
// आपको इन्हें अपनी प्रोवाइडर लिस्ट से कॉपी करना होगा (जैसे image_d8ad88.png से)
const PROXY_LIST = [
    // EXAMPLE: इसे अपनी असली प्रॉक्सी से बदलें
    'http://bqctypvz:399xb3kxfd6j@142.111.48.253:7030', // <--- अपनी पहली प्रॉक्सी
    'http://bqctypvz:399xb3kxfd6j@198.23.239.134:6540', // <--- अपनी दूसरी प्रॉक्सी
    // अपनी बाकी की 8 प्रॉक्सी यहाँ जोड़ें
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
    // प्रॉक्सी स्ट्रिंग को तोड़ें: 'http://username:password@ip:port'
    const authPart = proxy.split('//')[1].split('@')[0]; // username:password
    const displayProxy = proxy.split('@')[1]; // ip:port
    const logPrefix = `[REQ ${currentViewNumber} | PROXY: ${displayProxy}]`;

    let options = new chrome.Options();
    options.addArguments('--headless'); 
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    
    // PROXY CONFIGURATION
    options.addArguments(`--proxy-server=http://${displayProxy}`); 
    
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
        // यह कोड Username/Password वाले प्रॉक्सी के लिए ज़रूरी है
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
        console.error(`${logPrefix} ❌ ERROR: विज़िट विफल (Proxy Blocked/Timeout/Failed).`);
        // console.error(error); // Detailed error
        return false; 
    } finally {
        if (driver) {
            await driver.quit();
        }
    }
}

// ... (Rest of the code remains the same: /boost-url endpoint and server start) ...

app.post('/boost-url', async (req, res) => {
    const targetUrl = req.body.url;
    const viewsToGenerate = parseInt(req.body.views) || 5; 
    
    if (!targetUrl || !targetUrl.startsWith('http')) {
        return res.status(400).json({ status: 'error', message: 'Invalid URL provided. Must start with http or https.' });
    }

    requestCount++;
    console.log(`\n--- NEW BOOST REQUEST #${requestCount} for ${targetUrl} (Views: ${viewsToGenerate}) ---`);

    res.json({ status: 'processing', message: `Starting ${viewsToGenerate} views for ${targetUrl} in background.` });

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
            
            proxyIndex = (proxyIndex + 1) % totalProxies;
            await sleep(BREAK_BETWEEN_VIEWS_MS + Math.random() * 30000); 
        }
        
        console.log(`\n--- BOOST REQUEST #${requestCount} FINISHED. Total success: ${successfulViews}/${viewsToGenerate} ---`);
    })(); 
});

app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Traffic Booster API is running.' });
});

app.listen(PORT, () => {
  console.log(`\n🌐 Traffic Booster API running and ready to accept commands on port ${PORT}.`);
});
