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

// ======================= 1. कॉन्फ़िगरेशन और प्रॉक्सी डेटा (HARDCODED) ========================

// 🚨 Webshare Proxy Credentials को सीधे यहाँ डाला गया है।
const PROXY_USER = "bqctypvz";
const PROXY_PASS = "399xb3kxqv6i";

// आपके Webshare IPs की पूरी लिस्ट (पहला IP: 142.111.48.253:7030)
const PROXY_LIST_STRING = "http://142.111.48.253:7030,http://31.59.20.176:6754,http://38.170.176.177:5572,http://198.23.239.134:6540,http://45.38.107.97:6014,http://107.172.163.27:6543,http://64.137.96.74:6641,http://216.10.27.159:6837,http://142.111.67.146:5611,http://142.147.128.93:6593"; 

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY; 

// प्रॉक्सी लिस्ट तैयार करें
let PROXIES = [];
if (PROXY_LIST_STRING) {
    PROXIES = PROXY_LIST_STRING.split(',').filter(p => p.length > 0);
}

if (PROXIES.length === 0) {
    console.warn("PROXY_LIST is empty. The application will use Direct Connection (Render's IP).");
}

let proxyIndex = 0;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ======================= 2. एडवांस ट्रैफ़िक लॉजिक (GA4 Direct Views) ========================

async function sendAdvancedTraffic(jobId, viewNumber, proxyUrl, targetUrl) {
    let browser;
    let finalProxyUrl = null; 

    // प्रॉक्सी ऑथेंटिकेशन और URL फ़ॉर्मेटिंग
    if (proxyUrl && PROXY_USER && PROXY_PASS) {
        try {
            const urlObj = new URL(proxyUrl);
            // Puppeteer के लिए सही फ़ॉर्मेट: user:pass@ip:port
            finalProxyUrl = `${urlObj.protocol}//${PROXY_USER}:${PROXY_PASS}@${urlObj.host}`;
        } catch (e) {
            console.error(`[${jobId}] Invalid Proxy URL in list: ${proxyUrl}`);
            finalProxyUrl = null; 
        }
    }
    
    try {
        const displayProxy = finalProxyUrl ? finalProxyUrl.split('@').pop() : 'Direct Connection (No Proxy)';
        console.log(`[🚀 ${jobId} View ${viewNumber}] Starting with: ${displayProxy}`);

        // --- 1. ब्राउज़र लॉन्च ---
        let launchArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu', 
            '--window-size=1280,720' 
        ];

        if (finalProxyUrl) {
            // प्रॉक्सी सर्वर आर्गुमेंट जोड़ें
            launchArgs.push(`--proxy-server=${finalProxyUrl}`);
        }

        try {
            browser = await puppeteer.launch({
                headless: true,
                args: launchArgs, 
                timeout: 45000 
            });
        } catch (e) {
            console.error(`[❌ ${jobId} View ${viewNumber}] BROWSER LAUNCH FAILED. Error: ${e.message}`);
            return; 
        }

        const page = await browser.newPage();
        
        // 2. Direct Navigation (सीधे जाएँ)
        console.log(`[🟢 ${jobId} View ${viewNumber}] Navigating directly to: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        
        // 3. On-Page Interaction (स्क्रॉल करें और रुकें)
        console.log(`[${jobId} View ${viewNumber}] Landed. Starting deep interaction...`);
        
        const totalDuration = Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000; 
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
    const { targetUrl, searchQuery, views } = req.body; 
    
    if (!targetUrl || !views || views > 500) {
        return res.status(400).json({ 
            success: false, 
            message: "Missing fields or views > 500." 
        });
    }
    
    const hasProxy = PROXIES.length > 0;
    if (hasProxy && (!PROXY_USER || !PROXY_PASS)) {
        // यह चेक अब सिर्फ़ सुरक्षा के लिए है, क्योंकि हमने वैल्यू हार्डकोड कर दी हैं।
        return res.status(500).json({ 
            success: false, 
            message: "Proxy list found, but User/Pass are missing in Environment Variables. Fix secrets." 
        });
    }


    const jobId = uuidv4().substring(0, 8);
    const TOTAL_DISPATCH_TIME_HOURS = 24; 
    const TOTAL_DISPATCH_TIME_MS = TOTAL_DISPATCH_TIME_HOURS * 60 * 60 * 1000;
    const BASE_DELAY_MS = TOTAL_DISPATCH_TIME_MS / views; 
    
    const mode = hasProxy ? "Proxy Rotation (Hardcoded)" : "Direct Connection (Render IP)";

    res.status(202).json({
        success: true, 
        message: `Job ${jobId} accepted. ${views} views will be dispatched over the next ${TOTAL_DISPATCH_TIME_HOURS} hours. Mode: ${mode}`, 
        simulation_mode: mode 
    });

    for (let i = 1; i <= views; i++) {
        let currentProxy = null;
        
        if (hasProxy) {
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
