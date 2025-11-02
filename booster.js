// booster.js (Frontend Logic)

// **अपने Render URL को यहाँ सही से डालें**
const RENDER_BACKEND_URL = "https://pooreyoutuber-github-io-blmp.onrender.com"; 

const targetUrlInput = document.getElementById('targetUrl');
const proxySelector = document.getElementById('proxySelector');
const loadBtn = document.getElementById('loadBtn');
const proxyFrame = document.getElementById('proxyFrame');
const proxyInfoDiv = document.getElementById('proxyInfo');
const copyProxyBtn = document.getElementById('copyProxyBtn');
const proxyStringInput = document.getElementById('proxyString');

// प्रॉक्सी लिस्ट को Render API से फ़ेच करें
async function fetchAndPopulateProxies() {
    try {
        const response = await fetch(`${RENDER_BACKEND_URL}/api/proxies`);
        const availableProxies = await response.json();
        
        proxySelector.innerHTML = ''; 
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '--- Select Proxy Location ---';
        proxySelector.appendChild(defaultOption);

        availableProxies.forEach(p => {
            const option = document.createElement('option');
            option.value = p.fullString;
            option.textContent = `${p.country} (${p.ip}:${p.port})`;
            proxySelector.appendChild(option);
        });

    } catch (error) {
        console.error("Error fetching proxies:", error);
        alert("Error loading proxy list. Check Render backend server.");
    }
}

// प्रॉक्सी के माध्यम से URL लोड करने का मुख्य फ़ंक्शन
async function loadUrl() {
    let targetUrl = targetUrlInput.value.trim();
    const proxyString = proxySelector.value;
    
    if (!targetUrl || !proxyString) {
        alert('कृपया एक URL और प्रॉक्सी लोकेशन चुनें।');
        return;
    }

    // URL में https:// या http:// जोड़ें यदि यह मौजूद नहीं है
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
    }
    
    loadBtn.textContent = 'Loading...';
    loadBtn.disabled = true;
    proxyFrame.srcdoc = `<div style="padding: 20px; text-align: center;">Loading ${targetUrl}...</div>`;
    
    const requestBody = { targetUrl, proxyString };

    try {
        const response = await fetch(`${RENDER_BACKEND_URL}/api/load`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        
        if (data.error) {
            proxyFrame.srcdoc = `<div style="padding: 20px; color: red;">Proxy Error: ${data.error}</div>`;
        } else {
            // Content लोड करें
            proxyFrame.srcdoc = data.htmlContent; 
            
            // इस्तेमाल की गई प्रॉक्सी की जानकारी दिखाएँ
            proxyInfoDiv.innerHTML = `
                <p style="color: #007bff; font-weight: bold; margin: 5px 0;">
                    ✅ Loaded via: ${data.usedProxy.country} - ${data.usedProxy.ip}:${data.usedProxy.port}
                </p>
            `;
            proxyStringInput.value = data.usedProxy.fullString;
        }

    } catch (error) {
        console.error('Network Error:', error);
        proxyFrame.srcdoc = '<div style="padding: 20px; color: red;">Network Error: Could not connect to the Render server.</div>';
    } finally {
        loadBtn.textContent = 'Load via Proxy';
        loadBtn.disabled = false;
    }
}

// कॉपी प्रॉक्सी बटन का इवेंट हैंडलर
function copyProxyString() {
    if (proxyStringInput.value) {
        navigator.clipboard.writeText(proxyStringInput.value);
        alert("Proxy string copied to clipboard!");
    } else {
        alert("No proxy selected or loaded yet to copy.");
    }
}

// इवेंट लिसनर्स
loadBtn.addEventListener('click', loadUrl);
copyProxyBtn.addEventListener('click', copyProxyString);

// प्रॉक्सी लिस्ट लोड करें
fetchAndPopulateProxies();
