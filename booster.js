// booster.js (GitHub Pages Frontend Logic - URL Proxy Tool)

// **ज़रूरी:** अपने Render URL को यहाँ सही से डालें
const RENDER_BACKEND_URL = "https://pooreyoutuber-github-io-blmp.onrender.com"; 

const targetUrlInput = document.getElementById('targetUrl');
const proxySelector = document.getElementById('proxySelector');
const loadBtn = document.getElementById('loadBtn');
const proxyFrame = document.getElementById('proxyFrame');
const proxyInfoDiv = document.getElementById('proxyInfo');
const copyProxyBtn = document.getElementById('copyProxyBtn');
const proxyStringInput = document.getElementById('proxyString');

// 1. प्रॉक्सी लिस्ट को Render API से फ़ेच करें
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
            // p.fullString में IP:Port:User:Pass शामिल है
            option.value = p.fullString; 
            option.textContent = `${p.country} (${p.ip}:${p.port})`;
            proxySelector.appendChild(option);
        });

    } catch (error) {
        console.error("Error fetching proxies:", error);
        proxyInfoDiv.innerHTML = '<p style="color: red;">Error: Could not connect to Render API to load proxies.</p>';
    }
}

// 2. प्रॉक्सी के माध्यम से URL लोड करने का मुख्य फ़ंक्शन
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
    
    loadBtn.textContent = 'Loading... (Max 20s)';
    loadBtn.disabled = true;
    proxyFrame.srcdoc = `<div style="padding: 20px; text-align: center;">Loading ${targetUrl} via Proxy. This might take a few moments...</div>`;
    proxyInfoDiv.innerHTML = '';
    
    const requestBody = { targetUrl, proxyString };

    try {
        // API कॉल आपके Render बैकएंड पर जाएगी
        const response = await fetch(`${RENDER_BACKEND_URL}/api/load`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        
        if (data.error) {
            // ❌ यदि बैकएंड से एरर आया (जैसे Proxy Load Failed)
            const detail = data.details ? data.details.substring(0, 100) + '...' : 'No details available.';
            proxyFrame.srcdoc = `<div style="padding: 20px; color: red; text-align: left;">
                <h2>Proxy Error!</h2>
                <p><strong>Error:</strong> ${data.error}</p>
                <p><strong>Details:</strong> ${detail}</p>
                <p><strong>Suggestion:</strong> Try a different proxy location or check the URL protocol.</p>
            </div>`;
            proxyInfoDiv.innerHTML = `<p style="color: red; font-weight: bold; margin: 5px 0;">❌ Load Failed!</p>`;
        } else {
            // ✅ यदि बैकएंड से कंटेंट सफलता पूर्वक प्राप्त हुआ
            
            // IFrame में HTML कंटेंट लोड करें
            proxyFrame.srcdoc = data.htmlContent; 
            
            // इस्तेमाल की गई प्रॉक्सी की जानकारी और फॉलबैक बटन दिखाएँ
            proxyInfoDiv.innerHTML = `
                <p style="color: #007bff; font-weight: bold; margin: 5px 0;">
                    ✅ Loaded successfully via: ${data.usedProxy.country} - ${data.usedProxy.ip}:${data.usedProxy.port}
                </p>
                <button onclick="openInNewTab('${targetUrl}', '${data.usedProxy.fullString}')" 
                        style="background: #ffc107; color: black; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                        Open Site in New Tab (IFrame Block Fix)
                </button>
            `;
            proxyStringInput.value = data.usedProxy.fullString;
        }

    } catch (error) {
        console.error('Network Error:', error);
        proxyFrame.srcdoc = '<div style="padding: 20px; color: red;">Critical Network Error: Could not connect to the Render API Server.</div>';
    } finally {
        loadBtn.textContent = 'Load via Proxy';
        loadBtn.disabled = false;
    }
}

// 3. नया फ़ंक्शन: नए टैब में खोलने के लिए (IFrame ब्लॉकिंग को बायपास करता है)
// यह केवल एक चेतावनी दिखाता है क्योंकि ब्राउज़र सीधे प्रॉक्सी लागू नहीं कर सकता।
function openInNewTab(url, proxyString) {
    alert(`The site is now opening in a new tab. Note: To guarantee the proxy IP is used, you must manually set your browser's proxy settings to: ${proxyString} before visiting the page.`);
    window.open(url, '_blank');
}

// 4. कॉपी प्रॉक्सी बटन का इवेंट हैंडलर
function copyProxyString() {
    if (proxyStringInput.value) {
        navigator.clipboard.writeText(proxyStringInput.value);
        alert("Proxy string (IP:Port:User:Pass) copied to clipboard!");
    } else {
        alert("No proxy selected or loaded yet to copy.");
    }
}

// इवेंट लिसनर्स
loadBtn.addEventListener('click', loadUrl);
copyProxyBtn.addEventListener('click', copyProxyString);

// प्रॉक्सी लिस्ट लोड करें
fetchAndPopulateProxies();
