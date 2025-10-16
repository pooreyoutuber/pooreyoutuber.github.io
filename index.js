// index.js

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');
const url = require('url'); 
puppeteer.use(StealthPlugin());

const app = express();
const port = 10000;

app.use(express.json());

// ======================= 1. कॉन्फ़िगरेशन और प्रॉक्सी डेटा (Environment Variables से लोड) ========================

// 🚨 ये तीनों Values Render Secrets से लोड होंगी।
// सुनिश्चित करें कि Render Secrets में PROXY_USER और PROXY_PASS सही हों।
const PROXY_LIST_STRING = process.env.PROXY_LIST; 
const PROXY_USER = process.env.PROXY_USER || ""; 
const PROXY_PASS = process.env.PROXY_PASS || ""; 

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY; 

// प्रॉक्सी लिस्ट तैयार करें
let PROXIES = [];
if (PROXY_LIST_STRING) {
    PROXIES = PROXY_LIST_STRING.split(',').filter(p => p.startsWith('http://') || p.startsWith('https://'));
}

if (PROXIES.length === 0) {
    console.error("PROXY_LIST is empty or invalid. Traffic tools will fail!");
}

let proxyIndex = 0;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ======================= 2. एडवांस ट्रैफ़िक लॉजिक (Direct Navigation for GA4) ========================

async function sendAdvancedTraffic(jobId, viewNumber, proxyUrl, targetUrl) {
    let browser;
    let finalProxyUrl = proxyUrl; 

    // 🚨 ऑथेंटिकेशन फिक्स: user:pass को सीधे प्रॉक्सी URL में डालें
    if (PROXY_USER && PROXY_PASS) {
        try {
            const urlObj = new URL(proxyUrl);
            // Puppeteer को देने के लिए सही फ़ॉर्मेट: user:pass@ip:port
            finalProxyUrl = `${urlObj.protocol}//${PROXY_USER}:${PROXY_PASS}@${urlObj.host}`;
        } catch (e) {
            console.error("Invalid Proxy URL in list.");
            return;
        }
    }

    try {
        const displayProxy = proxyUrl.split('@').pop();
        console.log(`[🚀 ${jobId} View ${viewNumber}] Starting with Proxy: ${displayProxy}`);

        // --- 1. ब्राउज़र लॉन्च ---
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    `--proxy-server=${finalProxyUrl}`, 
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-gpu', 
                    '--window-size=1280,720' 
                ],
                timeout: 45000 // ब्राउज़र लॉन्च टाइमआउट
            });
        } catch (e) {
            console.error(`[❌ ${jobId} View ${viewNumber}] BROWSER LAUNCH FAILED (Proxy might be down/slow). Error: ${e.message}`);
            return; 
        }

        const page = await browser.newPage();
        
        // 2. Direct Navigation (सीधे जाएँ) - Search Console को बायपास करें
        console.log(`[🟢 ${jobId} View ${viewNumber}] Direct Navigation to: ${targetUrl} (GA4 Target)`);
        // टाइमआउट बढ़ाकर 45 सेकंड किया गया
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        
        // 3. On-Page Interaction (स्क्रॉल करें और रुकें)
        console.log(`[${jobId} View ${viewNumber}] Landed. Starting deep interaction...`);
        
        const totalDuration = Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000; // 15 से 30 सेकंड
        const scrollCount = 4;
        const scrollDelay = totalDuration / scrollCount;

        for (let i = 1; i <= scrollCount; i++) {
            const scrollAmount = Math.floor(Math.random() * 500) + 100;
            await page.evaluate(y => { window.scrollBy(0, y); }, scrollAmount); 
            await page.waitForTimeout(scrollDelay * (Math.random() * 0.5 + 0.75)); 
        }

        // 4. Success
        console.log(`[✅ ${jobId} View ${viewNumber}] Full User Journey Complete.`);

    } catch (error) {
        console.error(`[❌ ${jobId} View ${viewNumber}] Job failed (Network/Timeout). Error: ${error.message}`);

    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// ----------------------------------------------------
// API ENDPOINTS (Timed Dispatch Logic)
// ----------------------------------------------------

// Traffic Boost API: /api/boost-traffic
app.post('/api/boost-traffic', async (req, res) => {
    // searchQuery की अब ज़रूरत नहीं है, लेकिन इसे हटाना मुश्किल हो सकता है।
    const { targetUrl, searchQuery, views } = req.body; 
    
    // इनपुट वैलिडेशन
    if (!targetUrl || !views || views > 500 || PROXIES.length === 0) {
        return res.status(400).json({ 
            success: false, 
            message: "Missing fields, views > 500, or PROXY_LIST is empty." 
        });
    }
    if (!PROXY_USER || !PROXY_PASS) {
        return res.status(500).json({ 
            success: false, 
            message: "Proxy User/Pass are missing in Environment Variables. Fix secrets." 
        });
    }


    const jobId = uuidv4().substring(0, 8);
    const TOTAL_DISPATCH_TIME_HOURS = 24; 
    const TOTAL_DISPATCH_TIME_MS = TOTAL_DISPATCH_TIME_HOURS * 60 * 60 * 1000;
    
    // प्रति व्यू औसत डिले (मिलीसेकंड में)
    const BASE_DELAY_MS = TOTAL_DISPATCH_TIME_MS / views; 
    
    // सर्वर को तुरंत जवाब दें
    res.status(202).json({
        success: true, 
        message: `Job ${jobId} accepted. ${views} views will be dispatched over the next ${TOTAL_DISPATCH_TIME_HOURS} hours. Check logs for progress.`, 
        simulation_mode: "Timed Headless Browser Dispatch (Direct GA4 Views)" 
    });

    // 🚨 टाइमिंग लॉजिक: व्यूज़ को सीरियली भेजें
    for (let i = 1; i <= views; i++) {
        const currentProxy = PROXIES[proxyIndex];
        
        // प्रॉक्सी इंडेक्स को रोटेट करें
        proxyIndex = (proxyIndex + 1) % PROXIES.length;

        // व्यू को चलाएँ
        // अब searchQuery पैरामीटर नहीं भेजा जा रहा है
        await sendAdvancedTraffic(jobId, i, currentProxy, targetUrl);

        // 24 घंटे में फैलाने के लिए डिले कैलकुलेट करें 
        const randomVariation = Math.random() * 0.3 + 0.85; 
        const finalDelay = BASE_DELAY_MS * randomVariation;

        console.log(`[⏱️ ${jobId} View ${i}/${views}] Waiting for ${(finalDelay / 1000 / 60).toFixed(2)} minutes before next dispatch.`);
        
        // इंतज़ार करें
        await wait(finalDelay); 
    }
    
    console.log(`--- Job ${jobId} Finished! All ${views} views delivered over ${TOTAL_DISPATCH_TIME_HOURS} hours. ---`);
});


// Instagram Caption Generator API: /api/generate-caption
app.post('/api/generate-caption', async (req, res) => {
    const { reelTopic, captionStyle, numberOfCaptions } = req.body;
    if (!GEMINI_API_KEY) { return res.status(500).json({ success: false, message: "AI Key is not configured." }); }
    try {
        const openai = new OpenAI({ apiKey: GEMINI_API_KEY }); 
        const prompt = `Generate ${numberOfCaptions} catchy, viral captions in ${captionStyle} style for a reel about "${reelTopic}". Respond with a simple, numbered list of captions.`;
        const completion = await openai.chat.completions.create({ model: "gpt-3.5-turbo", messages: [{ role: "user", content: prompt }] });
        const captions = completion.choices[0].message.content.trim().split('\n').map(line => line.replace(/^\s*\d+\.\s*/, '').trim()).filter(line => line.length > 0);
        return res.status(200).json({ success: true, captions: captions });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Caption generation failed. Check API key." });
    }
});


// Article Generator API: /api/generate-article
app.post('/api/generate-article', async (req, res) => {
    const { topic, length, style } = req.body;
    if (!GEMINI_API_KEY) { return res.status(500).json({ success: false, message: "AI Key is not configured." }); }
    try {
        const openai = new OpenAI({ apiKey: GEMINI_API_KEY }); 
        const prompt = `Write a comprehensive article on "${topic}". The article should be ${length} words long and written in a ${style} tone. Include an introduction, 3-4 main sections with subheadings, and a conclusion.`;
        const completion = await openai.chat.completions.create({ model: "gpt-4", messages: [{ role: "user", content: prompt }] });
        const article = completion.choices[0].message.content.trim();
        return res.status(200).json({ success: true, article: article });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Article generation failed. Check API key." });
    }
});


// Health check endpoint
app.get('/', (req, res) => {
    res.send('Service is active.');
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
