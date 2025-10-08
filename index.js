 // index.js (FINAL CODE - DOUBLE SEARCH GSC BOOSTER EDITION - ROBUST CLICK FIX)

const express = require('express');
const { GoogleGenAI } = require('@google/genai'); 
const fetch = require('node-fetch'); 
const cors = require =('cors'); 
const fs = require('fs'); 
const puppeteer = require('puppeteer-core'); 
const chromium = require('@sparticuz/chromium'); 

const app = express();
const PORT = process.env.PORT || 10000; 

// --- CONFIGURATION REMAINS SAME (RATE LIMITING, GEMINI KEY, PUPPETEER ARGS, PROXY LIST) ---

// ... (Puraana code: imports, configs, rate limits, PROXY_LIST, functions, app.get, app.use, etc. waisa hi rahega) ...
// ... (generateCompensatedPlan function waisa hi rahega) ...
// ... (MIN/MAX time constants waisa hi rahega) ...


// ===================================================================
// 1. WEBSITE BOOSTER ENDPOINT (SEARCH CONSOLE DOUBLE-HIT LOGIC)
// ===================================================================
app.post('/boost-mp', async (req, res) => {
    
    // --- RATE LIMITING & VIEW LIMIT (REMAINS SAME) ---
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    let clientData = rateLimitMap.get(clientIp) || { count: 0, lastReset: now };

    if (now - clientData.lastReset > DAY_IN_MS) {
        clientData.count = 0; clientData.lastReset = now;
    }

    if (clientData.count >= MAX_REQUESTS_PER_DAY) {
        return res.status(429).json({ status: 'error', message: `❌ Aap 24 ghante mein adhiktam ${MAX_REQUESTS_PER_DAY} baar hi is tool ka upyog kar sakte hain.` });
    }
    
    const totalViews = parseInt(req.body.views) || 0;

    if (totalViews > MAX_VIEWS_PER_RUN) {
           return res.status(400).json({ status: 'error', message: `❌ Adhiktam 400 views hi anumat hain. Kripya views ki sankhya kam karein.` });
    }

    clientData.count += 1;
    clientData.lastReset = now; 
    rateLimitMap.set(clientIp, clientData);
    // ------------------------------------

    const { pages, referrer_url } = req.body; 

    // --- Hardcoded Country Distribution List (REMAINS SAME) ---
    const HARDCODED_COUNTRIES = [
        { code: 'US', percent: 22 }, { code: 'IN', percent: 12 }, { code: 'AU', percent: 8 }, 
        { code: 'CA', percent: 7 }, { code: 'GB', percent: 6 }, { code: 'DE', percent: 5 }, 
        { code: 'FR', percent: 5 }, { code: 'JP', percent: 4 }, { code: 'BR', percent: 4 }, 
        { code: 'MX', percent: 3 }, { code: 'NL', percent: 3 }, { code: 'CH', percent: 3 }, 
        { code: 'SE', percent: 3 }, { code: 'NO', percent: 3 }, { code: 'IT', percent: 2.5 }, 
        { code: 'ES', percent: 2.5 }, { code: 'SG', percent: 2 }, { code: 'KR', percent: 2 }
    ];
    
    if (totalViews < 1 || !Array.isArray(pages)) {
        return res.status(400).json({ status: 'error', message: 'Views (1-400) or valid Page data missing.' });
    }
    
    const finalPageUrls = generateCompensatedPlan(totalViews, pages.filter(p => p.percent > 0)); 
    const countryPlan = generateCompensatedPlan(totalViews, HARDCODED_COUNTRIES);
    const maxPlanLength = Math.min(finalPageUrls.length, countryPlan.length);
    
    // Final Combined Plan creation with search_query included (REMAINS SAME)
    let finalCombinedPlan = [];
    for (let i = 0; i < maxPlanLength; i++) {
        const originalPage = pages.find(p => p.url === finalPageUrls[i]);
        
        // ⭐ DATA SAFETY CHECK: search_query missing/empty hone par default set karein
        const search_query = originalPage && originalPage.search_query && originalPage.search_query.trim() !== '' 
                             ? originalPage.search_query 
                             : 'pooreyoutuber website booster'; 

        finalCombinedPlan.push({ 
            url: finalPageUrls[i], 
            country_code: countryPlan[i],
            search_query: search_query
        });
    }

    if (finalCombinedPlan.length === 0) {
           return res.status(400).json({ status: 'error', message: `Anumat views ki sankhya 0 hai. Kripya jaanchein.` });
    }

    // --- Async Processing (Immediate Response) ---
    res.json({ 
        status: 'accepted', 
        message: `✅ Aapki ${finalCombinedPlan.length} REAL Double-Search Clicks ki request sweekar kar li gayi hai. Traffic 24-48 ghanton mein poora hoga. (Double-Hit ON)`
    });

    // Start views generation asynchronously
    (async () => {
        const totalViewsCount = finalCombinedPlan.length;
        console.log(`[GSC START] Starting Search Console Booster for ${totalViewsCount} Double-Hit Sessions.`);
        
        const targetDuration = Math.random() * (MAX_TOTAL_MS - MIN_TOTAL_MS) + MIN_TOTAL_MS;
        const requiredFixedDelayPerView = Math.floor(targetDuration / totalViewsCount);
        
        let successfulSessions = 0;

        try {
            for (let i = 0; i < finalCombinedPlan.length; i++) {
                const plan = finalCombinedPlan[i];
                const sessionId = i + 1; 
                
                const preLaunchDelay = Math.floor(Math.random() * (2000 - 500) + 500); 
                await new Promise(resolve => setTimeout(resolve, preLaunchDelay));

                const proxyUrl = getRandomProxy(); 
                if (!proxyUrl) {
                    console.error(`[Session ${sessionId}] [PROXY ERROR] Proxy list is empty. Skipping session.`);
                    continue; 
                }
                
                let page;
                let browser; 
                
                try {
                    const ipPort = proxyUrl.replace('http://', ''); 
                    
                    const proxyArgs = [
                        ...PUPPETEER_ARGS,
                        `--proxy-server=${ipPort}` 
                    ];
                    
                    browser = await puppeteer.launch({
                        args: proxyArgs, 
                        executablePath: await chromium.executablePath(), 
                        headless: chromium.headless,
                    });
                    
                    console.log(`[Session ${sessionId}] Launching browser with Proxy: ${proxyUrl}`);
                    
                    page = await browser.newPage();
                    
                    // --- Set Real Browser Context (REMAINS SAME) ---
                    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
                    await page.setUserAgent(userAgent);
                    await page.setViewport({ width: 1366, height: 768 });
                    await page.setExtraHTTPHeaders({
                        'Referer': referrer_url
                    });
                    
                    // ===============================================================
                    // ⭐ DOUBLE SEARCH LOOP ⭐
                    // ===============================================================
                    
                    for(let searchAttempt = 1; searchAttempt <= 2; searchAttempt++) {
                        
                        console.log(`[Session ${sessionId}] [Hit ${searchAttempt}] Starting search process.`);
                        
                        const searchQuery = plan.search_query;
                        const targetURL = plan.url;
                        const googleURL = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
                        
                        let targetHost;
                        try {
                            targetHost = new URL(targetURL).hostname.replace('www.', '');
                        } catch (e) {
                            targetHost = targetURL.substring(0, targetURL.indexOf('/') > 0 ? targetURL.indexOf('/') : targetURL.length); 
                        }
                        
                        const selector = `a[href*="${targetHost}"]`;
                        
                        let clickSuccessful = false;

                        // 1. Google Search Page par jaana
                        try {
                            console.log(`[Session ${sessionId}] [Hit ${searchAttempt}] Searching Google for: "${searchQuery}"`);
                            // Networkidle0 tak wait karein, timeout ko catch karein
                            await page.goto(googleURL, { waitUntil: 'networkidle0', timeout: 60000 }); 
                            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for results to render
                        } catch (navError) {
                            if (navError.name === 'TimeoutError') {
                                console.warn(`[Session ${sessionId}] [Hit ${searchAttempt}] WARNING: Search Navigation Timeout (60s) exceeded. Proceeding.`);
                            } else {
                                throw navError; 
                            }
                        }
                        
                        // 2. Apni website ka link dhundhna aur click karna (ROBUST FIX)
                        try {
                            // Link element ko dhundhna
                            const linkElement = await page.waitForSelector(selector, { timeout: 10000 }); // Max 10s wait

                            if (linkElement) {
                                console.log(`[Session ${sessionId}] [Hit ${searchAttempt}] Found Target Link! Clicking...`);
                                
                                // Click aur navigation ka wait saath mein (Timeout handling ke saath)
                                await Promise.race([
                                    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }), 
                                    page.click(selector)
                                ]);
                                
                                clickSuccessful = true;
                                console.log(`[Session ${sessionId}] [Hit ${searchAttempt}] Landed on Target URL: ${targetURL}`);

                            } else {
                                throw new Error('Target link element not found.');
                            }

                        } catch (e) {
                            // Agar selector 10s mein nahi mila YA click/navigation fail ho gaya
                            console.warn(`[Session ${sessionId}] [Hit ${searchAttempt}] FAILED TO CLICK. Error: ${e.message.substring(0, 50)}... Skipping engagement and closing.`);
                            clickSuccessful = false;
                        }

                        // 3. Engagement (Scroll and Wait) - Only run if click was successful
                        if (clickSuccessful) {
                            // Hit 1: 3-10 sec, Hit 2: 45-120 sec
                            const engagementTime = searchAttempt === 1 
                                                ? Math.floor(Math.random() * (10000 - 3000) + 3000) 
                                                : Math.floor(Math.random() * (120000 - 45000) + 45000); 
                            
                            // Post-load sleep for GA code execution
                            const postLoadDelay = Math.floor(Math.random() * (5000 - 2000) + 2000);
                            await new Promise(resolve => setTimeout(resolve, postLoadDelay));
                            
                            // Scroll simulation
                            const scrollHeight = await page.evaluate(() => {
                                return document.body ? document.body.scrollHeight : 0; 
                            });
                            
                            if (scrollHeight > 0) {
                                const targetScroll = Math.min(scrollHeight * 0.95, scrollHeight - 10);
                                await page.evaluate((targetScroll) => {
                                    window.scrollBy(0, targetScroll);
                                }, targetScroll);
                                
                                console.log(`[Session ${sessionId}] [Hit ${searchAttempt}] Scroll simulated (90%). Staying for ${Math.round(engagementTime/1000)}s.`);
                            } else {
                                console.warn(`[Session ${sessionId}] [Hit ${searchAttempt}] WARNING: No scroll (ScrollHeight 0). Staying for ${Math.round(engagementTime/1000)}s.`);
                            }

                            // Wait for the simulated engagement time
                            await new Promise(resolve => setTimeout(resolve, engagementTime)); 
                        }


                        // Agar pehli search successful nahi hui toh dusri search attempt skip kar dein
                        if (searchAttempt === 1 && !clickSuccessful) {
                             console.warn(`[Session ${sessionId}] [Hit 1] Click failed, skipping Hit 2 and closing session.`);
                             break; 
                        }
                        
                        // Agar pehli hit successful thi, toh dusri hit se pehle Google par wapas jaana
                        if (searchAttempt === 1 && clickSuccessful) {
                            console.log(`[Session ${sessionId}] [Hit 1] Success. Navigating back to search for Hit 2.`);
                            
                            // Ek chota sa break dusri search se pehle
                            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 5000 + 2000)));
                        }
                        
                    } // ⭐ DOUBLE SEARCH LOOP ENDS HERE ⭐
                    
                    // 5. Close the session
                    await page.close();
                    successfulSessions++;
                    console.log(`[Session ${sessionId}] SUCCESS ✅ | Session closed.`);

                } catch (pageError) {
                    console.error(`[Session ${sessionId}] FAILURE ❌ | Proxy ${proxyUrl} | Error: ${pageError.message.substring(0, 100)}...`);
                } finally {
                    if (browser) {
                        await browser.close();
                    }
                }

                // --- 4. MAIN DELAY ---
                const totalDelay = requiredFixedDelayPerView + (Math.random() * (MAX_VIEW_DELAY - MIN_VIEW_DELAY) + MIN_VIEW_DELAY);
                console.log(`[Delay] Waiting for ${Math.round(totalDelay/1000)}s before next session.`);
                await new Promise(resolve => setTimeout(resolve, totalDelay));
            } // End of loop

        } catch (mainError) {
            console.error(`[PUPPETEER CRITICAL ERROR] Main process failed: ${mainError.message}`);
        }
        
        console.log(`[BOOSTER FINISH] All ${totalViewsCount} sessions attempted. Successfully recorded: ${successfulSessions}.`);

    })();
});


// ... (Baaki AI endpoints aur app.listen waisa hi rahega) ...
