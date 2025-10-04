// index.js (Final and Corrected Express API Server Code)

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
// Render environment variable से पोर्ट नंबर लेता है
const PORT = process.env.PORT || 10000; 

// Middleware
app.use(cors()); // आपके HTML टूल को कनेक्ट करने की अनुमति देता है
app.use(express.json()); // HTML फ़ॉर्म से JSON डेटा पढ़ने के लिए

// --- Constants & Helper Functions ---
const MIN_DELAY = 2000; // 2 सेकंड
const MAX_DELAY = 10000; // 10 सेकंड

// भौगोलिक विविधता के लिए 20+ स्थान
const geoLocations = [
    { country: "United States", region: "California" },
    { country: "India", region: "Maharashtra" },
    { country: "Germany", region: "Bavaria" },
    { country: "Japan", region: "Tokyo" },
    { country: "United Kingdom", region: "England" },
    { country: "Canada", region: "Ontario" },
    { country: "Brazil", region: "Sao Paulo" },
    { country: "France", region: "Paris" },
    { country: "South Korea", region: "Seoul" },
    { country: "Australia", region: "New South Wales" },
    { country: "Mexico", region: "Mexico City" },
    { country: "Italy", region: "Lombardy" },
    { country: "Spain", region: "Madrid" },
    { country: "Netherlands", region: "Holland" },
    { country: "South Africa", region: "Gauteng" },
];

function getRandomDelay() {
    return Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY; 
}

function getRandomGeo() {
    return geoLocations[Math.floor(Math.random() * geoLocations.length)];
}

// ----------------------------------------------------
// Core Logic: Sending Data (CRASH FIX HERE)
// ----------------------------------------------------
// अब यह फ़ंक्शन HTML से प्राप्त gaId और apiSecret का उपयोग करता है।
async function sendData(gaId, apiSecret, payload, currentViewId, eventName) {
    const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;

    try {
        const response = await fetch(gaEndpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 
                'Content-Type': 'application/json',
            }
        });

        if (response.status === 204) { 
            if (eventName === 'page_view') {
                console.log(`[View ${currentViewId}] SUCCESS ✅ | Event: ${eventName} | Status 204`);
            }
            return { success: true };
        } else {
            console.error(`[View ${currentViewId}] FAILURE ❌ | Event: ${eventName} | Status: ${response.status}. Check API Secret.`);
            return { success: false, message: `Status ${response.status}` };
        }
    } catch (error) {
        console.error(`[View ${currentViewId}] CRITICAL ERROR ⚠️ | Connection Failed: ${error.message}`);
        return { success: false, message: `Connection Failed: ${error.message}` };
    }
}

// --- API Endpoint: /boost-mp ---
app.post('/boost-mp', async (req, res) => {
    const { url, ga_id, api_key, views } = req.body;

    if (!url || !ga_id || !api_key || !views || views < 1 || views > 500) {
        return res.status(400).json({ status: 'error', message: 'Missing or invalid parameters.' });
    }

    // Acknowledge the request immediately (This is what prevents the HTML tool from timing out)
    res.json({ status: 'processing', message: `Request received for ${views} views. Processing started in the background.` });

    // Background Processing (Runs after the client gets the 'processing' message)
    let successfulViews = 0;

    for (let i = 1; i <= views; i++) {
        const CLIENT_ID = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        const SESSION_ID = Date.now(); 
        const geo = getRandomGeo();
        const engagementTime = 30000 + Math.floor(Math.random() * 90000); 

        const commonUserProperties = {
            geo: { value: `${geo.country}, ${geo.region}` }
        };

        // 1. Session Start Event
        const sessionStartPayload = { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'session_start', params: { session_id: SESSION_ID, _ss: 1 } }] };
        await sendData(ga_id, api_key, sessionStartPayload, i, 'session_start');

        // 2. Page View Event (Most Important)
        const pageViewPayload = {
            client_id: CLIENT_ID,
            user_properties: commonUserProperties, 
            events: [{ name: 'page_view', params: { page_location: url, page_title: `PROJECT_PAGE_${i}`, session_id: SESSION_ID, engagement_time_msec: engagementTime } }]
        };
        const pageViewResult = await sendData(ga_id, api_key, pageViewPayload, i, 'page_view');
        if (pageViewResult.success) successfulViews++;

        // 3. User Engagement Event
        const engagementPayload = { client_id: CLIENT_ID, user_properties: commonUserProperties, events: [{ name: 'user_engagement', params: { session_id: SESSION_ID, engagement_time_msec: engagementTime } }] };
        await sendData(ga_id, api_key, engagementPayload, i, 'user_engagement');

        // Delay between views
        await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
    }
    console.log(`--- BOOST REQUEST FINISHED. Total success: ${successfulViews}/${views} ---`);
});

// Default route for health check
app.get('/', (req, res) => {
    res.send({ status: 'ok', message: 'Traffic Booster API is running.' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Traffic Booster API running and ready to accept commands on port ${PORT}.`);
});
