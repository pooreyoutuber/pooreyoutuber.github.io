// File: index.js (Node.js/Express)

const express = require('express');
const request = require('request');
const app = express();
const PORT = process.env.PORT || 3000;
const path = require('path');

// ***********************************************
// ⚠️ PROXY LIST DEFINITION (Aapki 10 proxies)
// ***********************************************
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
// ***********************************************

// Homepage route - Front-end UI dikhana
app.get('/', (req, res) => {
    // Random proxy location choose karna sirf display ke liye
    const randomProxy = PROXIES[Math.floor(Math.random() * PROXIES.length)];
    const proxyInfo = `Selected Proxy Location (Display): <b>${randomProxy.country}</b>. (Rotation Active)`;
    
    // Front-end HTML code
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="hi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Website Booster Proxy Tool</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f0f2f5; }
            .container { max-width: 800px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
            h1 { color: #333; text-align: center; }
            #proxyInfo { margin: 15px 0; padding: 10px; background-color: #e6f7ff; border: 1px solid #91d5ff; border-radius: 4px; font-weight: bold; }
            input[type="url"], button { padding: 10px; margin-right: 10px; border-radius: 4px; border: 1px solid #ccc; }
            input[type="url"] { width: 70%; box-sizing: border-box; }
            button { background-color: #007bff; color: white; cursor: pointer; border: none; transition: background-color 0.3s; }
            button:hover { background-color: #0056b3; }
            iframe { width: 100%; height: 600px; border: 1px solid #ccc; margin-top: 20px; border-radius: 4px; }
        </style>
    </head>
    <body>

        <div class="container">
            <h1>🚀 Website Booster Proxy Tool</h1>

            <div id="proxyInfo">${proxyInfo}</div>
            
            <input 
                type="url" 
                id="targetUrl" 
                placeholder="Apni URL daalein (Jaise: https://youtube.com/)" 
                required
            >
            
            <button onclick="loadProxiedPage()">
                Proxy Ke Zariye Load Karein
            </button>

            <iframe id="proxyFrame" name="proxyFrame"></iframe>
        </div>

        <script>
            function loadProxiedPage() {
                const urlInput = document.getElementById('targetUrl').value.trim();
                const frame = document.getElementById('proxyFrame');
                
                if (!urlInput) {
                    alert('Kripya koi URL daalein.');
                    return;
                }

                // Front-end ab seedhe /proxy route ko call karega
                const finalProxyUrl = \`/proxy?url=\${encodeURIComponent(urlInput)}\`;
                frame.src = finalProxyUrl;
            }
        </script> 
    </body>
    </html>
    `;
    res.send(htmlContent);
});

// Proxy Route - Backend logic yahan chalta hai
app.get('/proxy', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send("<h1>Error: URL parameter missing.</h1>");
    }

    // 1. Random Proxy Select karna (Rotation)
    const selectedProxy = PROXIES[Math.floor(Math.random() * PROXIES.length)];
    
    // 2. Proxy Auth URL banana (Username:Password@IP:Port format)
    const proxyUrl = `http://${selectedProxy.user}:${selectedProxy.pass}@${selectedProxy.ip}:${selectedProxy.port}`;

    // 3. Proxy ke zariye request bhejna
    request({
        url: targetUrl,
        proxy: proxyUrl, 
        timeout: 25000, 
        rejectUnauthorized: false, 
        followAllRedirects: true, // Zaroori taaki redirects handle ho sakein
        headers: {
            'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0' 
        }
    }, (error, response, body) => {
        if (error) {
            console.error('Proxy Error:', error);
            const errorMessage = `<h1>Proxy Failed!</h1><p>Error: ${error.code}. Proxy Used: ${selectedProxy.country} (${selectedProxy.ip}:${selectedProxy.port})</p>`;
            return res.status(500).send(errorMessage);
        }

        // Content-Encoding header ko hata dete hain (zaroori)
        delete response.headers['content-encoding']; 
        
        // Headers set karna aur content wapas bhejna
        res.status(response.statusCode);
        res.set(response.headers); 
        res.send(body);
    });
});

app.listen(PORT, () => {
    console.log(`Node.js Proxy Server running on port ${PORT}`);
});
