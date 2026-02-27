// =================================================================
// index.js (ULTIMATE FINAL VERSION - Part 1/2)
// =============================================================
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
// --- Imports (Node.js Modules) ---
const express = require('express');
const nodeFetch = require('node-fetch'); 
const app = express();
const PORT = process.env.PORT || 10000; 
// ===================================================================
// 1. TOOL 
// =============================== 
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
 async function runGscTaskpop(keyword, url, viewNumber) {
     const ADVANCED_DEVICE_PROFILES = [
        // --- PC / DESKTOP ---
        { name: 'Windows PC - Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', view: { width: 1920, height: 1080 } },
        { name: 'Windows PC - Firefox', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0', view: { width: 1536, height: 864 } },
        { name: 'Windows PC - Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', view: { width: 1366, height: 768 } },
        { name: 'MacBook Pro - Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', view: { width: 1728, height: 1117 } },
        { name: 'Linux Desktop - Chrome', ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', view: { width: 1600, height: 900 } },
        { name: 'MacBook Air - Chrome', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36', view: { width: 1440, height: 900 } },

        // --- MOBILE ---
        { name: 'iPhone 15 Pro Max', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', view: { width: 430, height: 932 } },
        { name: 'iPhone 14', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1', view: { width: 390, height: 844 } },
        { name: 'Samsung Galaxy S23 Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', view: { width: 384, height: 854 } },
        { name: 'Google Pixel 8 Pro', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', view: { width: 448, height: 998 } },
        { name: 'OnePlus 11', ua: 'Mozilla/5.0 (Linux; Android 13; CPH2447) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36', view: { width: 360, height: 800 } },
        { name: 'Xiaomi 13 Pro', ua: 'Mozilla/5.0 (Linux; Android 13; 2210132G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36', view: { width: 393, height: 873 } },
        { name: 'Vivo V27', ua: 'Mozilla/5.0 (Linux; Android 13; V2231) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', view: { width: 388, height: 864 } },
        { name: 'Oppo Reno 10', ua: 'Mozilla/5.0 (Linux; Android 13; CPH2531) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Mobile Safari/537.36', view: { width: 360, height: 800 } },
        { name: 'Nothing Phone (2)', ua: 'Mozilla/5.0 (Linux; Android 13; A065) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', view: { width: 412, height: 919 } },
        { name: 'Motorola Edge 40', ua: 'Mozilla/5.0 (Linux; Android 13; XT2303-2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Mobile Safari/537.36', view: { width: 412, height: 919 } },
        { name: 'Sony Xperia 1 V', ua: 'Mozilla/5.0 (Linux; Android 13; XQ-DQ72) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36', view: { width: 384, height: 918 } },

        // --- TABLETS ---
        { name: 'iPad Pro 12.9', ua: 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', view: { width: 1024, height: 1366 } },
        { name: 'Samsung Galaxy Tab S9', ua: 'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36', view: { width: 800, height: 1280 } },
        { name: 'iPad Air', ua: 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1', view: { width: 820, height: 1180 } },
        { name: 'iPad Mini', ua: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', view: { width: 744, height: 1133 } },
        { name: 'Surface Pro 9', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0', view: { width: 1440, height: 960 } },
        { name: 'Amazon Fire HD 10', ua: 'Mozilla/5.0 (Linux; Android 9; KFTRWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/115.0.0.0 like Chrome/115.0.0.0 Safari/537.36', view: { width: 800, height: 1280 } },
        { name: 'Huawei MatePad', ua: 'Mozilla/5.0 (Linux; Android 10; BAH3-W09) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.181 Safari/537.36', view: { width: 800, height: 1280 } },
        { name: 'Lenovo Tab P11', ua: 'Mozilla/5.0 (Linux; Android 11; Lenovo TB-J606F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36', view: { width: 800, height: 1280 } }
    ];
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();
        // 🔄 PICK RANDOM PROFILE
        const profile = ADVANCED_DEVICE_PROFILES[Math.floor(Math.random() * ADVANCED_DEVICE_PROFILES.length)];
        // SET VIEWPORT & UA
        await page.setViewport(profile.view);
        await page.setUserAgent(profile.ua);

        // 1. STAGE: Google Search Simulation (Organic Entry)
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
        await page.goto(googleUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, randomInt(3000, 6000)));

        // 2. STAGE: Visit Target Site (30-35s Total Stay)
        console.log(`[EARNING-MODE] View #${viewNumber} | URL: ${url} | Staying 35s...`);
        await page.goto(url, { 
            waitUntil: 'networkidle2', 
            timeout: 90000, 
            referer: googleUrl 
        });

        const startTime = Date.now();
        const targetStayTime = randomInt(30000, 50000); 

        // 3. STAGE: Realistic Behavior & Ad-Clicker Loop
        while (Date.now() - startTime < targetStayTime) {
            // Natural Scrolling
            const dist = randomInt(300, 600);
            await page.evaluate((d) => window.scrollBy(0, d), dist);
            
            // Mouse Movement (Bypass Bot Checks)
            await page.mouse.move(randomInt(100, 800), randomInt(100, 600), { steps: 10 });
            await new Promise(r => setTimeout(r, randomInt(3000, 5000)));

            // 🔥 HIGH-VALUE AD CLICKER (18% Probability)
            if (Math.random() < 0.18) { 
                const ads = await page.$$('ins.adsbygoogle, iframe[id^="aswift"], iframe[src*="googleads"]');
                if (ads.length > 0) {
                    const targetAd = ads[Math.floor(Math.random() * ads.length)];
                    const box = await targetAd.boundingBox();

                    if (box && box.width > 50 && box.height > 50) {
                        console.log(`\x1b[42m%s\x1b[0m`, `[AD-CLICK] Target Found! Clicking...`);
                        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
                        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                        console.log(`\x1b[44m%s\x1b[0m`, `[SUCCESS] Ad Clicked! ✅ Revenue Generated.`);
                        
                        // Advertiser site par 15s wait (Necessary for valid CTR)
                        await new Promise(r => setTimeout(r, 15000));
                        break; 
                    }
                }
            }
        }
        console.log(`[DONE] View #${viewNumber} Finished Successfully. ✅`);

    } catch (error) {
        console.error(`[ERROR] View #${viewNumber}: ${error.message}`);
    } finally {
        if (browser) {
            const pages = await browser.pages();
            for (const p of pages) await p.close().catch(() => {});
            await browser.close().catch(() => {});
        }
    }
}


// ===================================================================
// Tool 7 Endpoint (Updated for Multi-Site Rotation)
// ===================================================================
app.post('/popup', async (req, res) => {
    try {
        const { keyword, urls, views = 1000 } = req.body;

        // Frontend se 'urls' array aa raha hai, use validate karein
        if (!keyword || !urls || !Array.isArray(urls) || urls.length === 0) {
            console.log("[FAIL] Invalid Request Body");
            return res.status(400).json({ success: false, message: "Keyword and URLs are required!" });
        }

        const totalViews = parseInt(views);

        // Immediate Success Response taaki frontend hang na ho
        res.status(200).json({ 
            success: true, 
            message: `Task Started: ${totalViews} Views Distributing across ${urls.length} sites.` 
        });

        // Background Worker
        (async () => {
            console.log(`--- STARTING MULTI-SITE REVENUE TASK ---`);
            for (let i = 1; i <= totalViews; i++) {
                // Randomly ek URL chunna rotation ke liye
                const randomUrl = urls[Math.floor(Math.random() * urls.length)];
                
                console.log(`[QUEUE] View #${i} | Active URL: ${randomUrl}`);
                await runGscTaskpop(keyword, randomUrl, i); 

                if (i < totalViews) {
                    // RAM management break
                    const restTime = i % 5 === 0 ? 25000 : 12000; 
                    console.log(`[REST] Waiting ${restTime/1000}s...`);
                    await new Promise(r => setTimeout(r, restTime));
                }
            }
            console.log("--- ALL SESSIONS COMPLETED ---");
        })();

    } catch (err) {
        console.error("Endpoint Error:", err);
        if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
    }
});

//==================================================
// --- SERVER START ---
// ===================================================================
app.listen(PORT, () => {
    console.log(`PooreYouTuber Combined API Server is running on port ${PORT}`);
});
