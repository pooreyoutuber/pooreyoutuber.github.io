// File: booster.js

// ⚠️ Zaroori: Agar aapne Render par apna URL badal diya hai, to isse bhi badal dein!
const RENDER_BACKEND_URL = "https://pooreyoutuber-github-io-blmp.onrender.com/proxy"; 

// Sirf front-end display ke liye locations
const PROXY_LOCATIONS = [
    { country: 'US (United States)' }, 
    { country: 'UK (United Kingdom)' }, 
    { country: 'JP (Japan)' }, 
    { country: 'ES (Spain)' }
];

document.addEventListener('DOMContentLoaded', selectRandomCountry);

// Har baar page load ya refresh karne par random location dikhana
function selectRandomCountry() {
    const randomIndex = Math.floor(Math.random() * PROXY_LOCATIONS.length);
    const info = `Selected Proxy Location (Display): <b>${PROXY_LOCATIONS[randomIndex].country}</b>. (Rotation Active)`;
    document.getElementById('proxyInfo').innerHTML = info; 
}

// Button dabane par ya manual control par yeh function chalta hai
function loadProxiedPage() {
    const urlInput = document.getElementById('targetUrl').value.trim();
    const frame = document.getElementById('proxyFrame');
    
    if (!urlInput) {
        alert('Kripya koi URL daalein.');
        return;
    }

    // Proxy location ko refresh karein
    selectRandomCountry();

    // Render backend ko call karte hain. Backend hi proxy select karke page fetch karega.
    const finalProxyUrl = `${RENDER_BACKEND_URL}?url=${encodeURIComponent(urlInput)}`;

    // Iframe mein load karna
    frame.src = finalProxyUrl;
    console.log("Request sent to Render backend:", finalProxyUrl);
}
