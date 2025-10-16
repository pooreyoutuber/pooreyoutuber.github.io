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

// ======================= 1. कॉन्फ़िगरेशन और प्रॉक्सी डेटा (प्रॉक्सी को अनदेखा किया गया) ========================

// 🚨 प्रॉक्सी को पूरी तरह से डिसेबल किया गया है ताकि कम से कम 1 व्यू आ सके।
const PROXY_LIST_STRING = null; // प्रॉक्सी लिस्ट को खाली सेट करें
const PROXY_USER = null;
const PROXY_PASS = null; 

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY; 

let PROXIES = []; // लिस्ट खाली रहेगी

let proxyIndex = 0;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ======================= 2. एडवांस ट्रैफ़िक लॉजिक (Direct Connection) ========================

async function sendAdvancedTraffic(jobId, viewNumber, proxyUrl, targetUrl, searchQuery) {
    let browser;
    // proxyUrl और finalProxyUrl को इस्तेमाल नहीं किया जाएगा।

    try {
        console.log(`[🚀 ${jobId} View ${viewNumber}] Starting with Direct Connection (No Proxy) for testing.`);

        browser = await puppeteer.launch({
            headless: true,
            args: [
                // प्रॉक्सी आर्गुमेंट अब नहीं दिए जाएँगे
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu', 
                '--window-size=1280,720' 
            ],
            timeout: 45000 
        });

        const page = await browser.newPage();
        
        // 2. Search (खोजें) - Google पर जाएँ
        console.log(`[${jobId} View ${viewNumber}] Searching Google for: ${searchQuery}`);
        await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.type('textarea[name="q"]', searchQuery, { delay: 100 }); 
        await page.keyboard.press('Enter');
        
        // 3. Click (क्लिक करें) - अपनी वेबसाइट ढूंढें
        await page.waitForTimeout(5000 + Math.random() * 2000); 
        
        const targetDomain = new URL(targetUrl).hostname;
        const targetLinkSelector = `a[href*="${targetDomain}"]`;
        const targetLink = await page.$(targetLinkSelector);
        
        if (targetLink) {
            console.log(`[🟢 ${jobId} View ${viewNumber}] Target URL found. Clicking...`);
            await targetLink.click();
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 45000 }); 
        } else {
            console.log(`[🔴 ${jobId} View ${viewNumber}] Target URL not found on search page. Aborting view.`);
        }

        // 4. On-Page Interaction (स्क्रॉल करें और रुकें)
        console.log(`[${jobId} View ${viewNumber}] Landed. Starting deep interaction...`);
        
        const totalDuration = Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000;
        const scrollCount = 4;
        const scrollDelay = totalDuration / scrollCount;

        for (let i = 1; i <= scrollCount; i++) {
            const scrollAmount = Math.floor(Math.random() * 500) + 100;
            await page.evaluate(y => { window.scrollBy(0, y); }, scrollAmount); 
            await page.waitForTimeout(scrollDelay * (Math.random() * 0.5 + 0.75)); 
        }

        // 5. Success
        console.log(`[✅ ${jobId} View ${viewNumber}] Full User Journey Complete.`);

    } catch (error) {
        console.error(`[❌ ${jobId} View ${viewNumber}] Job failed (Direct Connection Error): ${error.message}`);
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
    
    // इनपुट वैलिडेशन
    if (!targetUrl || !searchQuery || !views || views > 500) {
        return res.status(400).json({ 
            success: false, 
            message: "Missing fields or views > 500." 
        });
    }

    // टेस्ट के लिए सिर्फ़ एक व्यू चलाएँ
    const viewsToRun = 1;
    const jobId = uuidv4().substring(0, 8);
    
    // सर्वर को तुरंत जवाब दें
    res.status(202).json({
        success: true, 
        message: `Job ${jobId} accepted. Running 1 test view directly (without proxy). Check logs for result.`, 
        simulation_mode: "Direct Headless Browser Test" 
    });

    // व्यू को चलाएँ
    await sendAdvancedTraffic(jobId, 1, null, targetUrl, searchQuery);
    
    console.log(`--- Job ${jobId} Finished! 1 test view delivered. ---`);
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
