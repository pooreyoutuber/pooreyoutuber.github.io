const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());
const app = express();
const PORT = process.env.PORT || 10000;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

app.use(cors());
app.use(express.json());

// --- AI BRAIN: Generates Random Human Actions ---
async function getAiBehavior(url, keyword) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `Act as a human browsing a website about ${keyword}. 
        Provide a JSON response with:
        1. "searchQuery": A random related word to type in a search bar.
        2. "scrollDepth": A random number between 1000 and 4000.
        3. "pauseTime": Random milliseconds between 2000 and 5000.
        4. "interactionType": Either "click_text" or "move_mouse".`;
        
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
    } catch (e) {
        // Fallback agar AI fail ho jaye
        return { searchQuery: "latest news", scrollDepth: 1500, pauseTime: 3000 };
    }
}

async function runAiGscTask(keyword, url, viewNumber) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
        });

        const page = await browser.newPage();
        
        // 1. AI Persona & Plan
        const aiPlan = await getAiBehavior(url, keyword);
        console.log(`[AI-PLAN] View #${viewNumber} initialized with query: ${aiPlan.searchQuery}`);

        // 2. Navigation
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // 3. HUMAN ACTION: Search Bar Interaction
        try {
            const searchSelectors = ['input[type="text"]', 'input[type="search"]', '.search-field'];
            for (let selector of searchSelectors) {
                const searchBar = await page.$(selector);
                if (searchBar) {
                    await searchBar.click();
                    await page.keyboard.type(aiPlan.searchQuery, { delay: 150 });
                    await page.keyboard.press('Enter');
                    console.log(`[ACTION] AI Typed: ${aiPlan.searchQuery}`);
                    await new Promise(r => setTimeout(r, 5000));
                    break;
                }
            }
        } catch (err) { console.log("[SKIP] No search bar found."); }

        // 4. SMART SCROLLING
        await page.evaluate((depth) => {
            window.scrollTo({ top: depth, behavior: 'smooth' });
        }, aiPlan.scrollDepth);

        // 5. HIGH-VALUE AD CLICKER (Gemini Logic)
        if (Math.random() < 0.18) {
            const ads = await page.$$('ins.adsbygoogle, iframe[id^="aswift"]');
            if (ads.length > 0) {
                const targetAd = ads[Math.floor(Math.random() * ads.length)];
                const box = await targetAd.boundingBox();
                
                if (box) {
                    // Random mouse movement to AD
                    await page.mouse.move(box.x + (box.width/2), box.y + (box.height/2), { steps: 20 });
                    await page.mouse.click(box.x + (box.width/2), box.y + (box.height/2));
                    console.log(`[REVENUE] High-Value Ad Clicked! ✅`);
                    await new Promise(r => setTimeout(r, 20000)); // Stay on ad site
                }
            }
        }

    } catch (error) {
        console.error(`[ERROR] #${viewNumber}: ${error.message}`);
    } finally {
        if (browser) await browser.close();
    }
}

// --- ENDPOINT ---
app.post('/popup', async (req, res) => {
    const { keyword, urls, views = 10 } = req.body;
    res.status(200).json({ success: true, message: "AI Task Started" });

    (async () => {
        for (let i = 1; i <= views; i++) {
            const randomUrl = urls[Math.floor(Math.random() * urls.length)];
            await runAiGscTask(keyword, randomUrl, i);
            // Dynamic Rest
            const rest = randomInt(15000, 30000);
            await new Promise(r => setTimeout(r, rest));
        }
    })();
});

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1) + min); }

app.listen(PORT, () => console.log(`Server running on ${PORT}`));

