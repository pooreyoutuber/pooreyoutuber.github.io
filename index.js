// index.js (Final Code with Multi-Page View Logic)

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors'); 

const app = express();
const PORT = process.env.PORT || 10000; 

// Middleware
app.use(cors()); 
app.use(express.json()); 

// --- Constants & Helper Functions ---
const MIN_DELAY = 2000; 
const MAX_DELAY = 10000; 

// भौगोलिक विविधता के लिए स्थान
const geoLocations = [
    { country: "United States", region: "California" },
    { country: "India", region: "Maharashtra" },
    { country: "Germany", region: "Bavaria" },
    { country: "Japan", region: "Tokyo" },
    { country: "United Kingdom", region: "England" },
    { country: "Canada", region: "Ontario" },
    { country: "Brazil", region: "Sao Paulo" },
    { country: "France", region: "Paris" },
    { country: "Mexico", region: "Mexico City" },
];

function getRandomDelay() {
    return Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY; 
}

function getRandomGeo() {
    return geoLocations[Math.floor(Math.random() * geoLocations.length)];
}

// ----------------------------------------------------
// Core Logic: Sending Data to GA4 (Same as before)
// ----------------------------------------------------
async function sendData(gaId, apiSecret, payload, currentViewId, eventName) {
    const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;

    try {
        const response = await fetch(gaEndpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.status === 204) { 
            if (eventName === 'page_view') {
                console.log(`[View ${currentViewId}] SUCCESS ✅ | Status 204 | URL: ${payload.events[0].params.page_location}`);
            }
            return { success: true };
        } else {
            console.error(`[View ${currentViewId}] FAILURE ❌ | Status: ${response.status}. Check API Secret.`);
            return { success: false, message: `Status ${response.status}` };
        }
    } catch (error) {
        console.error(`[View ${currentViewId}] CRITICAL ERROR ⚠️ | Connection Failed: ${error.message}`);
        return { success: false, message: `Connection Failed: ${error.message}` };
    }
}


// --- NEW HELPER: Views को Pages में विभाजित करें ---
function generateViewPlan(totalViews, pages) {
    const viewPlan = [];
    let viewsRemaining = totalViews;

    // सुनिश्चित करें कि pages की total percentage 100% हो
    const totalPercentage = pages.reduce((sum, page) => sum + page.percent, 0);
    if (totalPercentage !== 100) {
        console.error("View distribution failed: Total percentage must be 100.");
        return [];
    }
    
    // हर पेज के लिए व्यूज़ की संख्या निर्धारित करें
    pages.forEach(page => {
        const viewsForPage = Math.round(totalViews * (page.percent / 100));
        for (let i = 0; i < viewsForPage; i++) {
            viewPlan.push(page.url);
        }
    });

    // Plan को shuffle करें ताकि views अनियमित रूप से आएं (Realistic traffic)
    viewPlan.sort(() => Math.random() - 0.5);
    
    return viewPlan;
}

// --- API Endpoint: /boost-mp ---
app.post('/boost-mp', async (req, res) => {
    // pages list अब req.body से आएगी: [{url: '...', percent: 50}, ...]
    const { ga_id, api_key, views, pages } = req.body; 

    // Validation (pages list की जाँच करें)
    if (!ga_id || !api_key || !views || views < 1 || views > 500 || !Array.isArray(pages) || pages.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Missing or invalid GA4 keys, view count, or pages list.' });
    }
    
    // View Plan जनरेट करें
    const viewPlan = generateViewPlan(parseInt(views), pages);
    if (viewPlan.length === 0) {
         return res.status(400).json({ status: 'error', message: 'View distribution failed. Check if percentages equal 100.' });
    }

    // Acknowledge the request immediately
    res.json({ status: 'processing', message: `Request accepted for ${viewPlan.length} views across ${pages.length} pages. Processing started in the background.` });

    // Background Processing 
    (async () => {
        let successfulViews = 0;

        for (let i = 0; i < viewPlan.length; i++) {
            const targetUrl = viewPlan[i]; // इस बार URL, viewPlan से लिया जाएगा

            const CLIENT_ID = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
            const SESSION_ID = Date.now(); 
            const geo = getRandomGeo();
            const engagementTime = 30000 + Math.floor(Math.random() * 90000); 

            const commonUserProperties = { geo: { value: `${geo.country}, ${geo.region}` } };

            // 1. Session Start
            const sessionStartPayload = { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'session_start', params: { session_id: SESSION_ID, _ss: 1 } }] };
            await sendData(ga_id, api_key, sessionStartPayload, i + 1, 'session_start');

            // 2. Page View (Uses targetUrl from the plan)
            const pageViewPayload = {
                client_id: CLIENT_ID,
                user_properties: commonUserProperties, 
                events: [{ name: 'page_view', params: { page_location: targetUrl, page_title: `PROJECT_PAGE_${i + 1}`, session_id: SESSION_ID, engagement_time_msec: engagementTime } }]
            };
            const pageViewResult = await sendData(ga_id, api_key, pageViewPayload, i + 1, 'page_view');
            if (pageViewResult.success) successfulViews++;

            // 3. User Engagement
            const engagementPayload = { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'user_engagement', params: { session_id: SESSION_ID, engagement_time_msec: engagementTime } }] };
            await sendData(ga_id, api_key, engagementPayload, i + 1, 'user_engagement');

            // Delay
            await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
        }
        console.log(`--- MULTI-PAGE BOOST FINISHED. Total success: ${successfulViews}/${viewPlan.length} ---`);
    })();
});

// Default route for health check
app.get('/', (req, res) => {
    res.send({ status: 'ok', message: 'Traffic Booster API is running.' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Traffic Booster API running and ready to accept commands on port ${PORT}.`);
});
    
