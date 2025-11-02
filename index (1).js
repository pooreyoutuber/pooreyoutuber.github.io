// Node.js में fetch फ़ंक्शन को आयात करें (Replit इसे स्वयं संभाल लेगा)
const fetch = require('node-fetch');

// ****************************************************
// 🔑 आपकी कुंजियाँ सीधे कोड में डाली गई हैं (FILL & LOCK)
// ****************************************************
const MEASUREMENT_ID = 'G-ZPMC525FGT'; // आपकी GA4 ID
const API_SECRET = 'pSaScGPuTWa95eOdSkbV7w'; // आपका API Secret
const TARGET_URL = 'https://pooreyoutuber.github.io/'; // अपनी वेबसाइट URL यहाँ डालें
// ****************************************************

// स्थिरांक (Constants)
const TOTAL_VIEWS_PER_CYCLE = 1000; 
const MIN_DELAY = 2000; // 2 सेकंड
const MAX_DELAY = 10000; // 10 सेकंड
const RESTART_DELAY_MINUTES = 10; 

// भौगोलिक विविधता के लिए 20+ स्थान
const geoLocations = [
    { country: "United States", region: "California" },
    { country: "China", region: "Guangdong" },
    { country: "India", region: "Maharashtra" },
    { country: "United States", region: "Texas" },
    { country: "China", region: "Beijing" },
    { country: "India", region: "Delhi" },
    { country: "Germany", region: "Bavaria" },
    { country: "Brazil", region: "Sao Paulo" },
    { country: "Russia", region: "Moscow" },
    { country: "Japan", region: "Tokyo" },
    { country: "United Kingdom", region: "England" },
    { country: "France", region: "Paris" },
    { country: "Australia", region: "New South Wales" },
    { country: "Canada", region: "Ontario" },
    { country: "Mexico", region: "Mexico City" },
    { country: "South Korea", region: "Seoul" },
    { country: "Italy", region: "Lombardy" },
    { country: "Spain", region: "Madrid" },
    { country: "Netherlands", region: "Holland" },
    { country: "South Africa", region: "Gauteng" },
    { country: "India", region: "Karnataka" },
    { country: "United States", region: "New York" }
];

let successfulViews = 0;
let viewCount = 0;
let cycleCount = 0;

function getRandomDelay() {
    return Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY; 
}

function getRandomGeo() {
    return geoLocations[Math.floor(Math.random() * geoLocations.length)];
}

// ----------------------------------------------------
// Core Logic: Sending Data
// ----------------------------------------------------

async function sendData(payload, currentViewId, eventName) {
    const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;

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
                successfulViews++;
                const geoInfo = payload.user_properties.geo.value;
                console.log(`[CYCLE ${cycleCount}] View ${currentViewId}: SUCCESS ✅ | Location Hint: ${geoInfo} | Total Success: ${successfulViews}`);
            }
        } else {
            console.error(`[CYCLE ${cycleCount}] View ${currentViewId}: FAILURE ❌ | Event: ${eventName} | Status: ${response.status}. Check API Secret.`);
        }
    } catch (error) {
        console.error(`[CYCLE ${cycleCount}] View ${currentViewId}: CRITICAL ERROR ⚠️ | Connection Failed: ${error.message}`);
    }
}

// ----------------------------------------------------
// Simulation Logic
// ----------------------------------------------------

async function generateView() {
    if (viewCount >= TOTAL_VIEWS_PER_CYCLE) {
        finishSimulation();
        return;
    }

    viewCount++;
    const currentViewId = viewCount;

    const CLIENT_ID = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    const SESSION_ID = Date.now(); 

    const geo = getRandomGeo();
    const engagementTime = 30000 + Math.floor(Math.random() * 90000); // 30 से 120 सेकंड

    const commonUserProperties = {
        geo: { value: `${geo.country}, ${geo.region}` }
    };

    // 1. Session Start Event
    const sessionStartPayload = {
        client_id: CLIENT_ID,
        user_properties: commonUserProperties, 
        events: [{ name: 'session_start', params: { session_id: SESSION_ID, _ss: 1 } }]
    };
    await sendData(sessionStartPayload, currentViewId, 'session_start');

    // 2. Page View Event
    const pageViewPayload = {
        client_id: CLIENT_ID,
        user_properties: commonUserProperties, 
        events: [{ name: 'page_view', params: { page_location: TARGET_URL, page_title: `PROJECT_PAGE_${currentViewId}`, session_id: SESSION_ID, engagement_time_msec: engagementTime } }]
    };
    await sendData(pageViewPayload, currentViewId, 'page_view');

    // 3. User Engagement Event
    const engagementPayload = {
        client_id: CLIENT_ID,
        user_properties: commonUserProperties, 
        events: [{ name: 'user_engagement', params: { session_id: SESSION_ID, engagement_time_msec: engagementTime } }]
    };
    await sendData(engagementPayload, currentViewId, 'user_engagement');

    const delay = getRandomDelay();
    setTimeout(generateView, delay); 
}

function startSimulation() {
    // अंतिम सुरक्षा जाँच
    if (TARGET_URL === 'https://your-project-website.com') {
        console.error("\nFATAL ERROR: Please update TARGET_URL with your actual website address before running.");
        return;
    }

    cycleCount++;
    successfulViews = 0;
    viewCount = 0;

    console.log(`\n======================================================`);
    console.log(`🚀 Starting Stable Cycle #${cycleCount} at ${new Date().toLocaleTimeString()}`);
    console.log(`GA4 ID: ${MEASUREMENT_ID} | Target URL: ${TARGET_URL}`);
    console.log(`======================================================`);

    generateView();
}

function finishSimulation() {
    const restartDelayMs = RESTART_DELAY_MINUTES * 60 * 1000;
    const nextCycleTime = new Date(Date.now() + restartDelayMs).toLocaleTimeString();

    console.log(`\n✅ Cycle #${cycleCount} Complete! Total Successful Views: ${successfulViews}`);
    console.log(`💤 Resting for ${RESTART_DELAY_MINUTES} minutes. Next cycle starts at ${nextCycleTime}`);
    console.log(`(Keep this Replit console running for 5-6 days!)`);

    setTimeout(startSimulation, restartDelayMs);
}

// प्रोग्राम शुरू करें
startSimulation();