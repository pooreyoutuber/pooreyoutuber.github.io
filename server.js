const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000; 

// Middleware for parsing request bodies
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// **नया बदलाव:** script.js को रूट से सर्व करें
app.use(express.static(__dirname));

// Fallback for the root path (serves websitebooster.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'websitebooster.html'));
});

// Endpoint to handle the proxy request (MUST be a POST request)
app.post('/proxy', async (req, res) => {
    const { url, proxyIp } = req.body;

    if (!url || !proxyIp) {
        return res.status(400).send('URL and Proxy IP/Port are required.');
    }

    try {
        const proxyParts = proxyIp.split(':');
        const proxyConfig = {
            host: proxyParts[0],
            port: parseInt(proxyParts[1], 10) || 80, 
        };

        const response = await axios.get(url, {
            proxy: proxyConfig,
            timeout: 15000, 
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });

        let htmlContent = response.data;

        // CRUCIAL: URL Rewriting with <base> Tag
        const baseUrl = url.endsWith('/') ? url : url + '/';
        const baseTag = `<base href="${baseUrl}">`;
        
        const headMatch = htmlContent.match(/<head\b[^>]*>/i);
        if (headMatch) {
             htmlContent = htmlContent.replace(headMatch[0], `${headMatch[0]}${baseTag}`);
        } else {
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

app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});
