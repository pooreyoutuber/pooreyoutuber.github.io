const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const port = 3000;

// Middleware for parsing request bodies
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Serve static files (index.html, script.js, CSS, etc.) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint to handle the proxy request
app.post('/proxy', async (req, res) => {
    const { url, proxyIp } = req.body;

    if (!url || !proxyIp) {
        return res.status(400).send('URL and Proxy IP/Port are required.');
    }

    try {
        // Separate Proxy IP and Port
        const proxyParts = proxyIp.split(':');
        const proxyConfig = {
            host: proxyParts[0],
            port: parseInt(proxyParts[1], 10) || 80, // Default to port 80 if not specified
        };

        // Send the request through the configured proxy
        const response = await axios.get(url, {
            proxy: proxyConfig,
            timeout: 10000, // 10 second timeout for request
            headers: {
                // Mimic a browser request
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });

        let htmlContent = response.data;

        // **Crucial Step: URL Rewriting with <base> Tag**
        // This ensures that all relative resources (CSS, JS, Images) are fetched
        // from the original website's domain, fixing the page layout.
        const baseTag = `<base href="${url.endsWith('/') ? url : url + '/'}">`;
        if (htmlContent.includes('<head>')) {
             htmlContent = htmlContent.replace(/<head>/i, `<head>${baseTag}`);
        } else if (htmlContent.includes('<HEAD>')) {
             htmlContent = htmlContent.replace(/<HEAD>/i, `<HEAD>${baseTag}`);
        } else {
             htmlContent = baseTag + htmlContent; // Fallback if no head tag found
        }
       
        res.send(htmlContent);

    } catch (error) {
        console.error('Proxy Error:', error.message);
        let errorMessage = `Failed to load site via proxy. Check IP/Port or try another proxy. Error: ${error.code || error.message}`;
        if (error.response && error.response.status) {
             errorMessage = `Proxy failed with status code: ${error.response.status}. Site might be blocking the proxy.`;
        }
        res.status(500).send(errorMessage);
    }
});

app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});
