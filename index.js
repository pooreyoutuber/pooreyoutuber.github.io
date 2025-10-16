// index.js

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');
puppeteer.use(StealthPlugin()); // Anti-detection plugin

const app = express();
const port = 10000;

app.use(express.json());

// ======================= 1. कॉन्फ़िगरेशन और प्रॉक्सी डेटा ========================

// Environment Variables से लोड करें
const PROXY_LIST_STRING = process.env.PROXY_LIST;
const PROXY_USER = process.env.PROXY_USER || ""; // प्रॉक्सी यूज़रनेम (अगर है)
const PROXY_PASS = process.env.PROXY_PASS || ""; // प्रॉक्सी पासवर्ड (अगर है)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY; 

// प्रॉक्सी लिस्ट तैयार करें
let PROXIES = [];
if (PROXY_LIST_STRING) {
    // केवल http/https प्रॉक्सी को स्वीकार करें
    PROXIES = PROXY_LIST_STRING.split(',').filter(p => p.startsWith('http://') || p.startsWith('https://'));
}

if (PROXIES.length === 0) {
    console.error("PROXY_LIST is empty or invalid. Traffic tools will fail!");
}

let proxyIndex = 0;

// टारगेट कॉन्फ़िगरेशन (यूज़र को API के माध्यम से भेजना चाहिए)
// यहाँ उदाहरण के लिए एक डिफ़ॉल्ट वैल्यू सेट की गई है
const DEFAULT_TARGET_URL = 'https://www.google.com/'; // API में यूज़र से लेना बेहतर है
const DEFAULT_SEARCH_QUERY = 'Best website booster tool';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ======================= 2. एडवांस ट्रैफ़िक लॉजिक (Search, Click, Scroll) ========================

async function sendAdvancedTraffic(jobId, viewNumber, proxyUrl, targetUrl, searchQuery) {
    let browser;
    let authUrl = proxyUrl; 

    // अगर PROXY_USER/PASS है, तो प्रॉक्सी URL को बदलें
    if (PROXY_USER && PROXY_PASS) {
        // http://user:pass@ip:port फॉर्मेट तैयार करें
        const urlObj = new URL(proxyUrl);
        authUrl = `${urlObj.protocol}//${PROXY_USER}:${PROXY_PASS}@${urlObj.host}`;
    }

    try {
        console.log(`[🚀 ${jobId} View ${viewNumber}] Starting with Proxy: ${proxyUrl.split('@').pop()}`);

        // Puppeteer को प्रॉक्सी के साथ लॉन्च करें
        browser = await puppeteer.launch({
            headless: true,
            args: [
                `--proxy-server=${authUrl.replace('http://', '').replace('https://', '')}`, // Puppeteer को सिर्फ़ ip:port चाहिए (या auth के साथ)
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });
        const page = await browser.newPage();
        
        // 1. Authentication (अगर ज़रूरत हो)
        if (PROXY_USER && PROXY_PASS) {
            await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });
        }

        // 2. Search (खोजें) - Google पर जाएँ
        console.log(`[${jobId} View ${viewNumber}] Searching Google for: ${searchQuery}`);
        await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.type('textarea[name="q"]', searchQuery, { delay: 100 }); // धीरे-धीरे टाइप करें
        await page.keyboard.press('Enter');
        
        // 3. Click (क्लिक करें) - अपनी वेबसाइट ढूंढें
        await page.waitForTimeout(5000); 
        
        // अपनी वेबसाइट के डोमेन को सही ढंग से निकालने की कोशिश करें
        const targetDomain = new URL(targetUrl).hostname;
        
        // targetDomain वाले लिंक को ढूंढें और क्लिक करें
        const targetLinkSelector = `a[href*="${targetDomain}"]`;
        const targetLink = await page.$(targetLinkSelector);
        
        if (targetLink) {
            console.log(`[🟢 ${jobId} View ${viewNumber}] Target URL found. Clicking...`);
            await targetLink.click();
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }); // अपनी वेबसाइट पर नेविगेट करें और नेटवर्क शांत होने का इंतज़ार करें
        } else {
            console.log(`[🔴 ${jobId} View ${viewNumber}] Target URL not found on search page. Aborting view.`);
            await browser.close();
            return;
        }

        // 4. On-Page Interaction (स्क्रॉल करें और रुकें)
        console.log(`[${jobId} View ${viewNumber}] Landed. Starting deep interaction...`);
        
        const totalDuration = Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000; // 15-30 seconds
        const scrollCount = 4;
        const scrollDelay = totalDuration / scrollCount;

        for (let i = 1; i <= scrollCount; i++) {
            const scrollAmount = Math.floor(Math.random() * 500) + 100;
            await page.evaluate(y => { window.scrollBy(0, y); }, scrollAmount); 
            await page.waitForTimeout(scrollDelay * (Math.random() * 0.5 + 0.75)); 
        }

        // 5. Success
        await browser.close();
        console.log(`[✅ ${jobId} View ${viewNumber}] Full User Journey Complete.`);

    } catch (error) {
        console.error(`[❌ ${jobId} View ${viewNumber}] Job failed for proxy ${proxyUrl.split('@').pop()}:`, error.message);
        if (browser) await browser.close();
    }
}

// ----------------------------------------------------
// API ENDPOINTS (Concurrent Dispatch)
// ----------------------------------------------------

// Traffic Boost API: /api/boost-traffic
app.post('/api/boost-traffic', async (req, res) => {
    const { targetUrl, searchQuery, views } = req.body;
    
    // इनपुट वैलिडेशन
    if (!targetUrl || !searchQuery || !views || views > 30 || PROXIES.length === 0) {
        return res.status(400).json({ 
            success: false, 
            message: "Missing fields, views > 30, or PROXY_LIST is empty. Max 30 views allowed due to Render Free Plan limits." 
        });
    }

    const jobId = uuidv4().substring(0, 8);
    
    res.status(202).json({
        success: true, 
        message: `Job ${jobId} accepted. ${views} views will be dispatched immediately. Check logs for progress (Green Tick).`, 
        simulation_mode: "Advanced Headless Browser (GSC/GA4 Focus)" 
    });

    const viewPromises = [];
    for (let i = 1; i <= views; i++) {
        const currentProxy = PROXIES[proxyIndex];
        
        // प्रॉक्सी इंडेक्स को रोटेट करें
        proxyIndex = (proxyIndex + 1) % PROXIES.length;

        // सभी व्यूज़ को एक साथ (Concurrent) चलाएँ
        viewPromises.push(sendAdvancedTraffic(jobId, i, currentProxy, targetUrl, searchQuery));

        // 2-5 सेकंड का छोटा ब्रेक ताकि सर्वर ओवरलोड न हो
        await wait(Math.random() * 3000 + 2000); 
    }
    
    // सभी व्यूज़ के खत्म होने का इंतज़ार करें
    await Promise.all(viewPromises);
    console.log(`--- Job ${jobId} Finished! ---`);
});


// Instagram Caption Generator API: /api/generate-caption (AI part for completeness)
app.post('/api/generate-caption', async (req, res) => {
    const { reelTopic, captionStyle, numberOfCaptions } = req.body;
    if (!GEMINI_API_KEY) { return res.status(500).json({ success: false, message: "AI Key is not configured." }); }
    // ... (AI generation logic) ...
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


// Article Generator API: /api/generate-article (AI part for completeness)
app.post('/api/generate-article', async (req, res) => {
    const { topic, length, style } = req.body;
    if (!GEMINI_API_KEY) { return res.status(500).json({ success: false, message: "AI Key is not configured." }); }
    // ... (AI generation logic) ...
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


// Health check endpoint (Render Sleep Fix)
app.get('/', (req, res) => {
    res.send('Service is active.');
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
