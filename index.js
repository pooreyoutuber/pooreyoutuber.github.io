// ... (index.js का बाकी कोड - Imports and Environment Variables) ...

// Environment Variables (Render Secrets) से लोड करें
const PROXY_USER = process.env.PROXY_USER; 
const PROXY_PASS = process.env.PROXY_PASS; 
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

// 🚨 CRITICAL FIX: DIRECT CONNECTION IPs
// यह लिस्ट आपके Webshare डैशबोर्ड से 10 अलग-अलग IP:PORT के साथ अपडेट होनी चाहिए।
// उदाहरण के लिए, मान लें कि पोर्ट 8080 है।
let RAW_PROXY_LIST = [
    '216.10.27.159:8080', // Proxy 1 IP:Port
    '198.23.239.134:8080', // Proxy 2 IP:Port
    '142.147.128.93:8080', // Proxy 3 IP:Port
    '142.111.48.253:8080', // Proxy 4 IP:Port
    '38.170.176.177:8080', // Proxy 5 IP:Port
    '107.172.163.27:8080', // Proxy 6 IP:Port
    '31.59.20.176:8080', // Proxy 7 IP:Port
    '64.137.96.74:8080', // Proxy 8 IP:Port
    '142.111.67.146:8080', // Proxy 9 IP:Port
    '45.38.107.97:8080' // Proxy 10 IP:Port
];

// CRITICAL: Randomly shuffle the list so that traffic is distributed evenly among 10 proxies.
RAW_PROXY_LIST.sort(() => 0.5 - Math.random()); 

// ... (getGoogleReferrer function और USER_AGENTS/SCREEN_SIZES arrays समान रहेंगे) ...

// ... (Middleware समान रहेगा) ...

// ======================= प्रॉक्सी लॉजिक (Sub-Function) ========================

async function sendGa4HitWithRetry(ga4Url, payload, userAgent) {
    if (!PROXY_USER || !PROXY_PASS) {
        throw new Error("Traffic Boost Failed. Missing Proxy Credentials in Render Environment Variables.");
    }

    let lastError = null;
    const MAX_RETRIES = 5; 
    
    // CRITICAL: Now we loop through the 10 direct proxies.
    for (let i = 0; i < MAX_RETRIES; i++) {
        // Use the modulus operator (%) to cycle through the 10 proxies for better distribution
        const proxyIpPort = RAW_PROXY_LIST[i % RAW_PROXY_LIST.length]; 
        
        const proxyUrl = `http://${PROXY_USER}:${PROXY_PASS}@${proxyIpPort}`;
        const httpsAgent = new HttpsProxyAgent(proxyUrl);
        
        // ... (Try/Catch block for sending GA4 hit remains the same) ...
        try {
            const response = await axios.post(
                ga4Url,
                payload,
                {
                    httpsAgent: httpsAgent,
                    proxy: false, 
                    timeout: 15000, 
                    headers: {
                        'User-Agent': userAgent || USER_AGENTS[0] 
                    }
                }
            );

            if (response.status === 204) {
                return response;
            }

            lastError = new Error(`HTTP Status ${response.status} from proxy: ${proxyIpPort}`);

        } catch (error) {
            const errorMessage = error.response ? `HTTP Status ${error.response.status}` : error.message;
            lastError = error;
            console.warn(`Retry ${i+1}/${MAX_RETRIES} failed with proxy ${proxyIpPort}. Error: ${errorMessage}`);
            if (String(errorMessage).includes('407')) {
                 throw new Error("Proxy Authentication Failed (407). Check PROXY_USER/PASS in Render Secrets.");
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (lastError) {
        // ... (Error handling remains the same) ...
        if (lastError.response && lastError.response.status) {
            throw new Error(`GA API returned HTTP ${lastError.response.status}. Detail: ${lastError.response.data || 'Bad Request'}`);
        }
        throw new Error(`Failed to send GA4 hit after trying all retries. Last network error: ${lastError.message}`);
    } else {
        throw new Error("Failed to send GA4 hit after trying all retries.");
    }
}

// ... (बाकी के processTrafficJob और API ENDPOINTS समान रहेंगे) ...

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
