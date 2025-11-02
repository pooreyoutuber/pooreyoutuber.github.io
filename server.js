const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
// पोर्ट 3000 लोकल टेस्टिंग के लिए है। Render इसे ऑटोमेटिकली सेट कर देगा।
const port = process.env.PORT || 3000; 

// Middleware for parsing request bodies
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Serve static files (index.html, script.js, etc.) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for the root path (serves index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint to handle the proxy request (MUST be a POST request)
app.post('/proxy', async (req, res) => {
    const { url, proxyIp } = req.body;

    // Input Validation
    if (!url || !proxyIp) {
        return res.status(400).send('URL and Proxy IP/Port are required.');
    }

    try {
        // Separate Proxy IP and Port
        const proxyParts = proxyIp.split(':');
        const proxyConfig = {
            host: proxyParts[0],
            port: parseInt(proxyParts[1], 10) || 80, 
        };

        // Send the request through the configured proxy using axios
        const response = await axios.get(url, {
            proxy: proxyConfig,
            timeout: 15000, // 15 second timeout 
            headers: {
                // Mimic a browser request for better compatibility
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });

        let htmlContent = response.data;

        // **CRUCIAL: URL Rewriting with <base> Tag**
        // This fixes broken CSS/JS/Images by pointing relative paths to the original URL.
        const baseUrl = url.endsWith('/') ? url : url + '/';
        const baseTag = `<base href="${baseUrl}">`;
        
        // Inject the base tag right after the opening <head> tag
        const headMatch = htmlContent.match(/<head\b[^>]*>/i);
        if (headMatch) {
             htmlContent = htmlContent.replace(headMatch[0], `${headMatch[0]}${baseTag}`);
        } else {
             // Fallback if <head> is not found
             htmlContent = baseTag + htmlContent; 
        }
       
        res.send(htmlContent);

    } catch (error) {
        console.error('Proxy Error:', error.message);
        let errorMessage = `प्रॉक्सी के माध्यम से वेबसाइट लोड करने में त्रुटि। IP/पोर्ट की जाँच करें।`;
        if (error.response && error.response.status) {
             errorMessage = `प्रॉक्सी विफल रहा (HTTP ${error.response.status})। साइट प्रॉक्सी को ब्लॉक कर रही होगी।`;
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
             errorMessage = `प्रॉक्सी सर्वर कनेक्ट नहीं हो पाया या टाइम आउट हो गया।`;
        }
        res.status(500).send(errorMessage);
    }
});

// Start the server
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});
