const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 10000; 

// CONFIGURATION (Measurement Protocol specific settings)
const TOTAL_VIEWS_PER_REQUEST = 500; 
const geoLocations = [
    { country: "United States", region: "California" },
    { country: "India", region: "Maharashtra" },
    { country: "Germany", region: "Bavaria" },
    { country: "Brazil", region: "Sao Paulo" },
    { country: "Japan", region: "Tokyo" },
    { country: "United Kingdom", region: "England" },
    { country: "Australia", region: "New South Wales" },
    { country: "South Korea", region: "Seoul" },
    { country: "Canada", region: "Ontario" }
];
const MIN_DELAY = 100; // MP doesn't need long delays
const MAX_DELAY = 500; 

app.use(cors({
    origin: 'https://pooreyoutuber.github.io', 
    methods: 'POST', 
    optionsSuccessStatus: 200 
}));
app.use(express.json()); // Essential for reading user input

function getRandomDelay() {
    return Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY; 
}

function getRandomGeo() {
    return geoLocations[Math.floor(Math.random() * geoLocations.length)];
}

// ----------------------------------------------------
// Core Logic: Sending Data (Measurement Protocol)
// ----------------------------------------------------

async function sendData(MEASUREMENT_ID, API_SECRET, targetUrl, currentViewId) {
    const CLIENT_ID = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    const SESSION_ID = Date.now(); 
    const geo = getRandomGeo();
    const engagementTime = 30000 + Math.floor(Math.random() * 90000); 
    const pageTitle = `USER_VIEW_${currentViewId}`;

    const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;

    const commonUserProperties = {
        geo: { value: `${geo.country}, ${geo.region}` }
    };

    // Combined payload for session_start, page_view, and user_engagement
    const payload = {
        client_id: CLIENT_ID,
        user_properties: commonUserProperties,
        events: [
            // 1. Session Start Event
            { name: 'session_start', params: { session_id: SESSION_ID, _ss: 1 } },
            // 2. Page View Event
            { name: 'page_view', params: { page_location: targetUrl, page_title: pageTitle, session_id: SESSION_ID, engagement_time_msec: engagementTime } },
            // 3. User Engagement Event
            { name: 'user_engagement', params: { session_id: SESSION_ID, engagement_time_msec: engagementTime } }
        ]
    };

    try {
        const response = await fetch(gaEndpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 
                'Content-Type': 'application/json',
            }
        });

        if (response.status === 204) { 
            console.log(`[View ${currentViewId}]: SUCCESS ✅ | GA ID: ${MEASUREMENT_ID} | Location: ${geo.country}`);
            return true;
        } else {
            // Log status and detailed response text for debugging GA credentials
            const errorText = await response.text(); 
            console.error(`[View ${currentViewId}]: FAILURE ❌ | Status: ${response.status}. Response: ${errorText}. Check GA ID/API Secret.`);
            return false;
        }
    } catch (error) {
        console.error(`[View ${currentViewId}]: CRITICAL ERROR ⚠️ | Connection Failed: ${error.message}`);
        return false;
    }
}

// ----------------------------------------------------
// 🌐 API ENDPOINT (/boost-mp)
// ----------------------------------------------------

app.post('/boost-mp', async (req, res) => {
    // 1. Get data from the user's HTML form
    const { url: targetUrl, ga_id: measurementId, api_key: apiSecret, views: viewsToGenerateRaw } = req.body; 
    
    // Validation
    const viewsToGenerate = Math.min(parseInt(viewsToGenerateRaw) || TOTAL_VIEWS_PER_REQUEST, TOTAL_VIEWS_PER_REQUEST);
    
    if (!targetUrl || !measurementId || !apiSecret || !targetUrl.startsWith('http')) {
        return res.status(400).json({ status: 'error', message: 'Invalid or missing URL, GA ID, or API Secret.' });
    }
    
    // 2. Immediate response to prevent timeout
    res.json({ status: 'processing', message: `Starting ${viewsToGenerate} views for ${targetUrl} using Measurement Protocol.` });

    // 3. Start the view generation process in the background
    (async () => {
        let successfulViews = 0;
        console.log(`\n--- STARTING MP BOOST for ${viewsToGenerate} views on ${targetUrl} ---`);
        
        for (let i = 0; i < viewsToGenerate; i++) {
            const success = await sendData(measurementId, apiSecret, targetUrl, i + 1); 
            if (success) {
                successfulViews++;
            }
            // Small delay
            const delay = getRandomDelay();
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        console.log(`\n--- BOOST FINISHED. Total success: ${successfulViews}/${viewsToGenerate} ---`);
    })(); 
});

// ----------------------------------------------------
// Server Start and Health Check
// ----------------------------------------------------

app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Traffic Booster API (MP) is running. Use /boost-mp POST.' });
});

app.listen(PORT, () => {
  console.log(`\n🌐 Traffic Booster API (Measurement Protocol) running and ready on port ${PORT}.`);
});
