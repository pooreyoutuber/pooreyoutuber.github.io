// public/booster.js

// 🛑 IMPORTANT: Replace this with your actual Render deployment URL (e.g., https://your-app-name.onrender.com)
const BASE_API_URL = 'https://pooreyoutuber-github-io-blmp.onrender.com'; 

// Proxy list jise hum frontend me dikhayenge (backend mein bhi yahi list hai)
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

document.addEventListener('DOMContentLoaded', () => {
    const proxySelector = document.getElementById('proxySelector');
    const loadBtn = document.getElementById('loadBtn');
    const copyProxyBtn = document.getElementById('copyProxyBtn');
    const targetUrlInput = document.getElementById('targetUrl');
    const proxyFrame = document.getElementById('proxyFrame');
    const proxyStringInput = document.getElementById('proxyString');
    const proxyInfoDiv = document.getElementById('proxyInfo');

    // 1. Proxy Selector ko proxies se bharna
    PROXIES.forEach((proxy, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${proxy.country} - ${proxy.ip} (Index: ${index})`;
        proxySelector.appendChild(option);
    });

    // 2. Load Button Event Handler
    loadBtn.addEventListener('click', loadProxiedWebsite);

    // 3. Proxy Selector change hone par proxy string update karna
    proxySelector.addEventListener('change', updateProxyString);

    // 4. Copy Proxy Button Event Handler
    copyProxyBtn.addEventListener('click', copyProxyString);

    // Default URL daal dein
    targetUrlInput.value = "https://pooreyoutuber.github.io/test-ads.html";

    // Initial proxy string set karna
    updateProxyString();

    function loadProxiedWebsite() {
        const websiteUrl = targetUrlInput.value.trim();
        const selectedIndex = proxySelector.value;
        
        if (!websiteUrl) {
            alert("Kripya website URL daalein.");
            return;
        }

        // URL ko encode karna
        const encodedUrl = encodeURIComponent(websiteUrl);
        
        // Proxy URL banana
        let proxyCallUrl = `${BASE_API_URL}/proxy?url=${encodedUrl}`;

        if (selectedIndex !== 'auto') {
            // Agar user ne specific proxy chuna hai
            proxyCallUrl += `&index=${selectedIndex}`;
            const selectedProxy = PROXIES[parseInt(selectedIndex)];
            proxyInfoDiv.innerHTML = `<strong>🌐 Loading via:</strong> ${selectedProxy.country} (${selectedProxy.ip}:${selectedProxy.port})`;
        } else {
            // Agar Auto chuna hai, index nahi bhejenge, backend random chunegea
            proxyInfoDiv.innerHTML = `<strong>🔄 Loading via:</strong> Auto-Rotate Proxy (Random Geo)`;
        }

        // Iframe mein URL load karna
        proxyFrame.src = proxyCallUrl;
        loadBtn.textContent = "Loading...";
        loadBtn.disabled = true;

        // Iframe load hone ke baad button wapas enable karna
        proxyFrame.onload = () => {
            loadBtn.textContent = "Load via Proxy";
            loadBtn.disabled = false;
        };
        
        proxyFrame.onerror = () => {
            proxyInfoDiv.innerHTML = `<strong>❌ Error:</strong> Website load nahi ho payi.`;
            loadBtn.textContent = "Load via Proxy";
            loadBtn.disabled = false;
        };
    }

    function updateProxyString() {
        const selectedIndex = proxySelector.value;
        let proxyString = "";
        
        if (selectedIndex !== 'auto') {
            const proxy = PROXIES[parseInt(selectedIndex)];
            proxyString = `http://${proxy.user}:${proxy.pass}@${proxy.ip}:${proxy.port}`;
        } else {
            proxyString = "Proxy Rotation is handled by the backend /proxy API.";
        }
        proxyStringInput.value = proxyString;
    }

    function copyProxyString() {
        proxyStringInput.select();
        document.execCommand('copy');
        alert("Proxy String copied to clipboard!");
    }
});
