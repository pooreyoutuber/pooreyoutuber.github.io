const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 10000; 

// 🚨 CORS CONFIGURATION 🚨
// यह सुनिश्चित करता है कि आपकी GitHub वेबसाइट API को एक्सेस कर सके।
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

// 2. 🌐 FINAL ROTATING PROXY ENDPOINT
// इसे अपने नए और काम करने वाले Residential Rotating Proxy से बदलें।
// फॉर्मेट: http://username:password@domain:port
const PROXY_LIST = [
    // Webshare Rotating Proxy (अगर यह काम नहीं करता, तो इसे बदलें)
    `http://bqctypvz-rotate:399xb3kxfd6j@p.webshare.io:80` 
];

const PROXY_RETRY_COUNT = 1; // Rotating Proxy के लिए
const BREAK_BETWEEN_VIEWS_MS = 60000; // 1 मिनट का न्यूनतम ब्रेक

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
    // प्रॉक्सी स्ट्रिंग से Authentication (username:password) और Endpoint (domain:port) निकालें
    const authPart = proxy.split('//')[1].split('@')[0]; 
    const displayProxy = proxy.split('@')[1]; 
    const logPrefix = `[REQ ${currentViewNumber} | PROXY: ROTATING / ${displayProxy}]`;

    // Chrome Options: Render/Cloud Environment के लिए ज़रूरी
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
        // Username और Password के साथ प्रॉक्सी के लिए ज़रूरी
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
        // प्रॉक्सी या Google ब्लॉकिंग विफल होने पर एरर
        console.error(`${logPrefix} ❌ ERROR: विज़िट विफल (Rotating Proxy failed or Google blocked).`);
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
    
    if (!targetUrl || !targetUrl.startsWith('http')) {
        return res.status(400).json({ status: 'error', message: 'Invalid URL provided. Must start with http or https.' });
    }

    requestCount++;
    console.log(`\n--- NEW BOOST REQUEST #${requestCount} for ${targetUrl} (Views: ${viewsToGenerate}) ---`);

    // API तुरंत response दे ताकि वेबसाइट ब्लॉक न हो
    res.json({ status: 'processing', message: `Starting ${viewsToGenerate} views for ${targetUrl} in background.` });

    // लॉजिक को background में चलाएं
    (async () => {
        let successfulViews = 0;
        
        for (let i = 0; i < viewsToGenerate; i++) {
            const currentProxy = PROXY_LIST[proxyIndex]; 
            
            console.log(`\n-- View ${i + 1}/${viewsToGenerate} on Rotating Proxy --`);
            
            const success = await simulateUserVisit(targetUrl, requestCount, currentProxy);
            
            if (success) {
                successfulViews++;
            } else {
                console.log("Rotating Proxy failed. Stopping further attempts for this request.");
                break; 
            }
            
            // व्यूज के बीच ब्रेक दें
            await sleep(BREAK_BETWEEN_VIEWS_MS + Math.random() * 30000); 
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
