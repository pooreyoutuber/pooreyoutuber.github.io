// **Aapka Render Backend URL** (Sahi endpoint is /proxy)
const RENDER_BACKEND_URL = "https://pooreyoutuber-github-io-blmp.onrender.com/proxy"; 

// Sirf front-end display ke liye locations
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
    document.getElementById('proxyInfo').innerHTML = info; 
}

function loadProxiedPage() {
    const urlInput = document.getElementById('targetUrl').value.trim();
    const frame = document.getElementById('proxyFrame');
    
    if (!urlInput) {
        alert('Kripya koi URL daalein.');
        return;
    }

    selectRandomCountry();

    // Final URL jo Render backend ko call karegi
    const finalProxyUrl = `${RENDER_BACKEND_URL}?url=${encodeURIComponent(urlInput)}`;

    frame.src = finalProxyUrl;
    console.log("Request sent to Render backend:", finalProxyUrl);
}
