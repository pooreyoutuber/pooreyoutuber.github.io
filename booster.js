// File: booster.js

// ⚠️ RENDER BACKEND URL (Yeh aapke index.js file ko call karega)
const RENDER_BACKEND_URL = "https://pooreyoutuber-github-io-blmp.onrender.com/proxy"; 

// Proxy list (Hardcoded for Front-end display and selection)
// NOTE: Actual rotation backend (index.js) mein hoga.
const PROXIES = [
    { ip: '142.111.48.253', port: 7030, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'US' },
    { ip: '31.59.20.176', port: 6754, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'UK' },
    { ip: '23.95.150.145', port: 6114, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'US' },
    { ip: '198.23.239.134', port: 6540, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'US' },
    { ip: '45.38.107.97', port: 6014, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'UK' },
    { ip: '107.172.163.27', port: 6543, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'US' },
    { ip: '64.137.96.74', port: 6641, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'Spain' },
    { ip: '216.10.27.159', port: 6837, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'US' },
    { ip: '142.111.67.146', port: 5611, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'Japan' },
    { ip: '142.147.128.93', port: 6593, user: 'bqctypvz', pass: '399xb3kxqv6i', country: 'US' }
];

document.addEventListener('DOMContentLoaded', initializeTool);

function initializeTool() {
    populateProxySelector();
    document.getElementById('loadBtn').addEventListener('click', loadProxiedPage);
    document.getElementById('copyProxyBtn').addEventListener('click', copyProxyString);
    updateProxyInfo();
    updateProxyString();
    document.getElementById('proxySelector').addEventListener('change', updateProxyString);
}

function populateProxySelector() {
    const selector = document.getElementById('proxySelector');
    // 'Auto Proxy' pehle se hai
    
    PROXIES.forEach((proxy, index) => {
        const option = document.createElement('option');
        // Option value mein index + 1 rakhein (0 auto ke liye hai)
        option.value = index; 
        option.textContent = `${proxy.country} - ${proxy.ip}`;
        selector.appendChild(option);
    });
}

function updateProxyInfo() {
    const infoDiv = document.getElementById('proxyInfo');
    const randomIndex = Math.floor(Math.random() * PROXIES.length);
    const selectedProxy = PROXIES[randomIndex];
    infoDiv.innerHTML = `Current Proxy: <b>${selectedProxy.ip}:${selectedProxy.port}</b> (${selectedProxy.country}).`;
}

function updateProxyString() {
    const selector = document.getElementById('proxySelector');
    const index = selector.value;
    const proxyStringInput = document.getElementById('proxyString');
    
    if (index === 'auto') {
        // 'Auto' select hone par, front-end koi bhi string nahi dikha sakta, isliye placeholder
        proxyStringInput.value = 'Auto Proxy (Rotation) is selected. Use the Load button.';
    } else {
        const proxy = PROXIES[parseInt(index)];
        // Proxy string format: user:pass@ip:port
        proxyStringInput.value = `${proxy.user}:${proxy.pass}@${proxy.ip}:${proxy.port}`;
    }
}

function loadProxiedPage() {
    const urlInput = document.getElementById('targetUrl').value.trim();
    const frame = document.getElementById('proxyFrame');
    const selector = document.getElementById('proxySelector');
    
    if (!urlInput) {
        alert('Kripya URL daalein.');
        return;
    }

    // Proxy selector ki value
    const proxyIndex = selector.value;
    
    // Front-end par URL banane ka logic
    let finalProxyUrl = `${RENDER_BACKEND_URL}?url=${encodeURIComponent(urlInput)}`;

    if (proxyIndex !== 'auto') {
        // Agar user ne koi specific proxy chuni hai, to uska index backend ko bhejte hain
        finalProxyUrl += `&index=${proxyIndex}`;
    }
    
    // Update proxy info (Taki user ko pata chale ki rotation ho raha hai)
    updateProxyInfo();

    // Iframe mein load karna
    frame.src = finalProxyUrl;
    console.log("Request sent to Render backend:", finalProxyUrl);
}

function copyProxyString() {
    const proxyStringInput = document.getElementById('proxyString');
    proxyStringInput.select();
    proxyStringInput.setSelectionRange(0, 99999); // Mobile devices ke liye
    navigator.clipboard.writeText(proxyStringInput.value);
    alert("Proxy string copied to clipboard!");
}
