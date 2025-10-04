// index.js (FINAL STABLE & PROXY-FREE CODE for Render)

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors'); 

const app = express();
const PORT = process.env.PORT || 10000; 

// Middleware
app.use(cors()); 
app.use(express.json()); 

// --- Constants & Helper Functions ---
const MIN_DELAY = 3000; // Minimum delay 3 seconds
const MAX_DELAY = 12000; // Maximum delay 12 seconds

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
// Core Logic: Sending Data to GA4 (Measurement Protocol)
// ----------------------------------------------------
async function sendData(gaId, apiSecret, payload, currentViewId) {
    const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;
    const eventName = payload.events[0].name;

    try {
        const response = await fetch(gaEndpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.status === 204) { 
            if (eventName === 'page_view') {
                // Console log for tracking on Render dashboard
                console.log(`[View ${currentViewId}] SUCCESS ✅ | URL: ${payload.events[0].params.page_location}`);
            }
            return { success: true };
        } else {
            console.error(`[View ${currentViewId}] FAILURE ❌ | Status: ${response.status}. Check API Secret/GA ID.`);
            return { success: false };
        }
    } catch (error) {
        console.error(`[View ${currentViewId}] CRITICAL ERROR ⚠️ | Connection Failed: ${error.message}`);
        return { success: false };
    }
}


// --- Views को Pages में विभाजित करें ---
function generateViewPlan(totalViews, pages) {
    const viewPlan = [];
    
    // Percentage validation
    const totalPercentage = pages.reduce((sum, page) => sum + page.percent, 0);
    if (totalPercentage < 99.9 || totalPercentage > 100.1) {
        console.error(`Distribution Failed: Total percentage is not 100.`);
        return [];
    }
    
    // हर पेज के लिए व्यूज़ की संख्या निर्धारित करें
    pages.forEach(page => {
        const viewsForPage = Math.round(totalViews * (page.percent / 100));
        for (let i = 0; i < viewsForPage; i++) {
            viewPlan.push(page.url);
        }
    });

    // Plan को shuffle करें (अनियमितता के लिए)
    viewPlan.sort(() => Math.random() - 0.5);
    
    return viewPlan;
}

// --- API Endpoint: /boost-mp ---
app.post('/boost-mp', async (req, res) => {
    const { ga_id, api_key, views, pages } = req.body; 

    // Validation
    if (!ga_id || !api_key || !views || views < 1 || views > 500 || !Array.isArray(pages) || pages.length === 0) {
        return res.status(400).json({ status: 'error', message: 'GA keys, View count (1-500), और Page URL/Percentage आवश्यक हैं।' });
    }
    
    const viewPlan = generateViewPlan(parseInt(views), pages);
    if (viewPlan.length === 0) {
         return res.status(400).json({ status: 'error', message: 'व्यू डिस्ट्रीब्यूशन विफल। सुनिश्चित करें कि Total % 100 है।' });
    }

    // Acknowledge the request immediately (Allows user to close browser)
    res.json({ status: 'processing', message: `अनुरोध (${viewPlan.length} व्यूज़) स्वीकार किया गया। प्रोसेसिंग पृष्ठभूमि में शुरू हो गई है।` });

    // Background Processing 
    (async () => {
        let successfulViews = 0;
        const totalViews = viewPlan.length;

        for (let i = 0; i < totalViews; i++) {
            const targetUrl = viewPlan[i]; 

            const CLIENT_ID = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
            const SESSION_ID = Date.now(); 
            const geo = getRandomGeo();
            const engagementTime = 30000 + Math.floor(Math.random() * 90000); // 30 से 120 सेकंड

            const commonUserProperties = { geo: { value: `${geo.country}, ${geo.region}` } };

            // 1. Session Start
            const sessionStartPayload = { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'session_start', params: { session_id: SESSION_ID, _ss: 1 } }] };
            await sendData(ga_id, api_key, sessionStartPayload, i + 1);

            // 2. Page View 
            const pageViewPayload = {
                client_id: CLIENT_ID,
                user_properties: commonUserProperties, 
                events: [{ name: 'page_view', params: { page_location: targetUrl, page_title: `PROJECT_PAGE_${i + 1}`, session_id: SESSION_ID, engagement_time_msec: engagementTime } }]
            };
            const pageViewResult = await sendData(ga_id, api_key, pageViewPayload, i + 1);
            if (pageViewResult.success) successfulViews++;

            // 3. User Engagement
            const engagementPayload = { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'user_engagement', params: { session_id: SESSION_ID, engagement_time_msec: engagementTime } }] };
            await sendData(ga_id, api_key, engagementPayload, i + 1);

            // Delay for realistic traffic
            await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
        }
        console.log(`--- BOOST FINISHED. Total success: ${successfulViews}/${totalViews} ---`);
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
