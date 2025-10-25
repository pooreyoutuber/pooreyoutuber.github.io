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

// --- MIDDLEWARE ---
app.use(express.json());

// --- UTILITY FUNCTIONS ---

/** Generates a random integer between min (inclusive) and max (inclusive). */
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Creates a unique client ID, simulating a unique user. */
const generateClientId = () => {
    // Generates a secure random hex string (simulating a unique user/real user name)
    return crypto.randomBytes(16).toString('hex');
};

/** Distributes the total views across pages based on percentage. */
function getPagesDistribution(views, pages) {
    const totalHits = [];
    
    // Calculate how many hits each page should receive
    pages.forEach(page => {
        const hits = Math.round(views * (page.percent / 100));
        for (let i = 0; i < hits; i++) {
            totalHits.push(page.url);
        }
    });

    // Handle rounding errors to ensure total views match
    while (totalHits.length < views && pages.length > 0) {
        totalHits.push(pages[0].url); 
    }
    while (totalHits.length > views) {
        totalHits.pop();
    }
    
    // Shuffle the array to randomize the order of hits
    for (let i = totalHits.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [totalHits[i], totalHits[j]] = [totalHits[j], totalHits[i]];
    }

    return totalHits;
}


/** Sends a full GA4 session (start, view, engagement) for one user. */
async function sendGA4Session(gaId, apiKey, pageUrl) {
    const clientId = generateClientId();
    // User engagement time (30 to 120 seconds)
    const engagementTimeMs = randomInt(30000, 120000); 

    const events = [];

    // 1. session_start event
    events.push({
        name: 'session_start'
    });

    // --- CRUCIAL CHANGE HERE ---
    // 2. Custom Event (Not 'page_view')
    try {
        const parsedUrl = new URL(pageUrl);
        // Page title derived from the URL path, as per your request
        const customTitle = parsedUrl.pathname.replace(/-/g, ' ').replace(/\//g, '').substring(0, 50) || 'Home Page';
        
        events.push({
            name: 'website_hit', // Custom event name as requested
            params: {
                page_location: pageUrl,
                page_title: `Content View: ${customTitle}`, // A dynamic, relevant page title
            }
        });
    } catch (e) {
        // Fallback for invalid URLs
        events.push({
            name: 'website_hit',
            params: {
                page_location: pageUrl,
                page_title: `Content View: Error Parsing URL`, 
            }
        });
    }

    // 3. user_engagement event (Simulates scrolling, clicking, reading)
    events.push({
        name: 'user_engagement',
        params: {
            engagement_time_msec: engagementTimeMs,
        }
    });

    // Base payload for the Measurement Protocol API
    const payload = {
        client_id: clientId,
        user_properties: {
            // Simulating a random US-based IP address for general geo tracking (cannot set country via MP)
            user_ip: `72.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`, 
        },
        events: events
    };

    try {
        const fullUrl = `${GA4_MP_URL}?measurement_id=${gaId}&api_secret=${apiKey}`;
        
        await axios.post(fullUrl, payload, { timeout: 10000 });
        
        console.log(`[✅ HIT] Client: ${clientId.substring(0, 6)}... | Event: website_hit | Page: ${pageUrl} | Engaged: ${Math.round(engagementTimeMs / 1000)}s`);
        return true;

    } catch (error) {
        // Log validation error or connection timeout
        const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error(`[❌ FAIL] GA4 API Error for ${pageUrl}: ${errorMsg}`);
        return false;
    }
}


// ----------------------------------------------------
// API ENDPOINT: /boost-mp
// ----------------------------------------------------

app.post('/boost-mp', async (req, res) => {
    const { ga_id, api_key, views, pages } = req.body; 
    
    if (!ga_id || !api_key || !views || !pages || views > 500 || views < 1) {
        return res.status(400).json({ status: 'error', message: "Missing GA ID, API Key, or invalid views count (1-500)." });
    }
    
    const jobId = uuidv4().substring(0, 8);
    
    // 1. Distribute views based on percentages
    const hitsToDispatch = getPagesDistribution(views, pages);
    const totalHits = hitsToDispatch.length;

    // 2. Respond immediately (202 Accepted)
    res.status(202).json({
        status: 'accepted', 
        message: `Job ${jobId} accepted. ${totalHits} unique sessions (event: website_hit) will be dispatched now. Results in GA4 in 24-48 hours.`,
        total_sessions: totalHits
    });

    console.log(`\n--- JOB ${jobId} STARTED: Dispatching ${totalHits} sessions ---`);

    // 3. Dispatch all hits concurrently
    const CONCURRENCY_LIMIT = 20; 
    const batches = [];
    
    for (let i = 0; i < totalHits; i += CONCURRENCY_LIMIT) {
        batches.push(hitsToDispatch.slice(i, i + CONCURRENCY_LIMIT));
    }
    
    for (const batch of batches) {
        const batchPromises = batch.map(pageUrl => sendGA4Session(ga_id, api_key, pageUrl));
        await Promise.all(batchPromises);
        
        // Small delay between batches to avoid server rate limiting
        const delay = randomInt(500, 1500); 
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    console.log(`--- JOB ${jobId} FINISHED! ---`);
});


// Health check endpoint
app.get('/', (req, res) => {
    res.send('GA4 Measurement Protocol Service is active and listening to /boost-mp');
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
