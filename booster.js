// **Aapka Render Backend URL** (Aapke provided URL ke anusaar)
// Yeh URL aapki proxy list aur rotation logic ko handle karti hai.
const RENDER_BACKEND_URL = "https://pooreyoutuber-github-io-blmp.onrender.com/proxy"; 

// Sirf front-end display ke liye locations (Actual rotation backend mein hoga)
const PROXY_LOCATIONS = [
    { country: 'US (United States)' }, 
    { country: 'UK (United Kingdom)' }, 
    { country: 'JP (Japan)' }, 
    { country: 'ES (Spain)' }
];

document.addEventListener('DOMContentLoaded', selectRandomCountry);

function selectRandomCountry() {
    const randomIndex = Math.floor(Math.random() * PROXY_LOCATIONS.length);
    const info = `Selected Proxy Location (Display): <b>${PROXY_LOCATIONS[randomIndex].country}</b>. (Rotation Active)`;
    // innerHTML ka upyog karke HTML tags ko render karein
    document.getElementById('proxyInfo').innerHTML = info; 
}

function loadProxiedPage() {
    const urlInput = document.getElementById('targetUrl').value.trim();
    const frame = document.getElementById('proxyFrame');
    
    if (!urlInput) {
        alert('Kripya koi URL daalein.');
        return;
    }

    // Har baar load karne par front-end par location update karein
    selectRandomCountry();

    // Final URL jo Render backend ko call karegi. 
    // Backend is 'url' parameter ko lekar apne rotation logic se proxy use karega.
    const finalProxyUrl = `${RENDER_BACKEND_URL}?url=${encodeURIComponent(urlInput)}`;

    frame.src = finalProxyUrl;
    console.log("Request sent to Render backend:", finalProxyUrl);
}
