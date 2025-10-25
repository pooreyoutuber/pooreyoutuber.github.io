// index.js

const express = require('express');
const axios = require('axios'); 
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const url = require('url'); 

const app = express();
const port = process.env.PORT || 10000; 

// Base URL for Google Analytics 4 Measurement Protocol
const GA4_MP_URL = 'https://www.google-analytics.com/mp/collect';

// --- GLOBAL QUEUE SYSTEM ---
// The main queue to hold all incoming traffic boost jobs.
const jobQueue = [];
let isProcessing = false; // Flag to ensure only one processor runs at a time

// --- MIDDLEWARE ---
app.use(express.json());

// --- UTILITY FUNCTIONS ---

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const generateClientId = () => crypto.randomBytes(16).toString('hex');
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/** Distributes the total views across pages based on percentage. */
function getPagesDistribution(views, pages) {
    const totalHits = [];
    pages.forEach(page => {
        const hits = Math.round(views * (page.percent / 100));
        for (let i = 0; i < hits; i++) {
            totalHits.push(page.url);
        }
    });
    
    // Handle rounding errors
    while (totalHits.length < views && pages.length > 0) {
        totalHits.push(pages[0].url); 
    }
    while (totalHits.length > views) {
        totalHits.pop();
    }
    
    // Shuffle the array
    for (let i = totalHits.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [totalHits[i], totalHits[j]] = [totalHits[i], totalHits[j]];
    }

    return totalHits;
}


/** Sends a full GA4 session (start, custom hit, engagement) for one user. */
async function sendGA4Session(gaId, apiKey, pageUrl) {
    const clientId = generateClientId();
    const engagementTimeMs = randomInt(30000, 120000); 
    const events = [];

    events.push({ name: 'session_start' });

    try {
        const parsedUrl = new URL(pageUrl);
        const customTitle = parsedUrl.pathname.replace(/-/g, ' ').replace(/\//g, '').substring(0, 50) || 'Home Page';
        
        events.push({
            name: 'website_hit',
            params: {
                page_location: pageUrl,
                page_title: `Content View: ${customTitle}`,
            }
        });
    } catch (e) {
        events.push({
            name: 'website_hit',
            params: {
                page_location: pageUrl,
                page_title: `Content View: Invalid URL`, 
            }
        });
    }

    events.push({
        name: 'user_engagement',
        params: {
            engagement_time_msec: engagementTimeMs,
        }
    });

    const payload = {
        client_id: clientId,
        user_properties: {
            user_ip: `72.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`, 
        },
        events: events
    };

    try {
        const fullUrl = `${GA4_MP_URL}?measurement_id=${gaId}&api_secret=${apiKey}`;
        
        const response = await axios.post(fullUrl, payload, { timeout: 10000 });
        
        if (response.status === 200 && response.data && response.data.validationMessages) {
            const validationError = response.data.validationMessages[0].description;
            console.error(`[❌ FAIL - GA4 Validation] Client: ${clientId.substring(0, 6)}... | Error: ${validationError}`);
            return false;
        }

        console.log(`[✅ HIT] Client: ${clientId.substring(0, 6)}... | Page: ${pageUrl} | Engaged: ${Math.round(engagementTimeMs / 1000)}s`);
        return true;

    } catch (error) {
        console.error(`[❌ FAIL - Connection/Timeout] Client: ${clientId.substring(0, 6)}... | Error: ${error.message}`);
        return false;
    }
}

// ----------------------------------------------------
// CORE QUEUE PROCESSOR
// ----------------------------------------------------

async function processQueue() {
    if (isProcessing) {
        return; // Already running
    }
    
    isProcessing = true;
    console.log(`\n--- QUEUE PROCESSOR STARTED: ${jobQueue.length} jobs waiting ---`);

    while (jobQueue.length > 0) {
        const currentJob = jobQueue[0]; // Peek at the first job
        const { jobId, ga_id, api_key, hitsToDispatch, totalHits } = currentJob;
        
        console.log(`\n--- PROCESSING JOB ${jobId}: ${totalHits} sessions ---`);

        const CONCURRENCY_LIMIT = 10; // Stable concurrency
        const BATCH_DELAY_MS = 3000; // 3 seconds delay between batches

        const batches = [];
        for (let i = 0; i < totalHits; i += CONCURRENCY_LIMIT) {
            batches.push(hitsToDispatch.slice(i, i + CONCURRENCY_LIMIT));
        }
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`--- [Job ${jobId} Batch ${i + 1}/${batches.length}] Sending ${batch.length} hits... ---`);
            
            const batchPromises = batch.map(pageUrl => sendGA4Session(ga_id, api_key, pageUrl));
            
            await Promise.all(batchPromises);
            
            // Mandatory delay for stability
            if (i < batches.length - 1) {
                const delay = randomInt(BATCH_DELAY_MS, BATCH_DELAY_MS + 2000); 
                await wait(delay);
            }
        }
        
        // Job is complete, remove it from the queue
        jobQueue.shift(); 
        console.log(`--- JOB ${jobId} FINISHED! ${jobQueue.length} jobs remaining. ---`);
    }

    isProcessing = false;
    console.log(`\n--- QUEUE PROCESSOR STOPPED. ---`);
}

// ----------------------------------------------------
// API ENDPOINT: /boost-mp (INSTANT ACCEPTANCE)
// ----------------------------------------------------

app.post('/boost-mp', async (req, res) => {
    const { ga_id, api_key, views, pages } = req.body; 
    
    if (!ga_id || !api_key || !views || !pages || views > 500 || views < 1) {
        return res.status(400).json({ status: 'error', message: "Missing GA ID, API Key, or invalid views count (1-500)." });
    }
    
    const jobId = uuidv4().substring(0, 8);
    const hitsToDispatch = getPagesDistribution(views, pages);
    const totalHits = hitsToDispatch.length;

    // 1. Create Job Payload
    const jobPayload = {
        jobId,
        ga_id,
        api_key,
        hitsToDispatch,
        totalHits,
        receivedAt: new Date(),
    };
    
    // 2. Add job to the queue
    jobQueue.push(jobPayload);
    
    // 3. Start processor if it's not running
    if (!isProcessing) {
        processQueue();
    }

    // 4. Respond immediately (202 Accepted)
    res.status(202).json({
        status: 'accepted', 
        message: `✅ Job ${jobId} accepted and added to the queue (Position: ${jobQueue.length}). All ${totalHits} sessions will be completed.`,
        queue_position: jobQueue.length,
        total_sessions: totalHits
    });
});


// Health check endpoint
app.get('/', (req, res) => {
    res.send(`GA4 Measurement Protocol Queue Service is active. ${jobQueue.length} jobs in queue.`);
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
