// File: server.js (Node.js backend code)

const express = require('express');
const request = require('request'); // Proxy handling ke liye zaroori library
const cors = require('cors'); // CORS enable karne ke liye (Front-end se request accept karne ke liye)

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); 

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


app.get('/proxy', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send("<h1>Error 400: URL parameter is missing.</h1>");
    }

    // 1. Random Proxy Select karna (Rotation)
    const selectedProxy = PROXIES[Math.floor(Math.random() * PROXIES.length)];
    
    // 2. Proxy Auth URL banana (Username:Password@IP:Port format)
    const proxyUrl = `http://${selectedProxy.user}:${selectedProxy.pass}@${selectedProxy.ip}:${selectedProxy.port}`;

    // 3. Request library ka use karke proxy ke zariye request bhejna
    request({
        url: targetUrl,
        proxy: proxyUrl, 
        timeout: 25000, // 25 seconds timeout
        rejectUnauthorized: false, 
        headers: {
            'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0' 
        }
    }, (error, response, body) => {
        if (error) {
            console.error('Proxy Error:', error);
            const errorMessage = `<h1>Proxy Connection Failed!</h1><p>Error Code: ${error.code}. Check proxy credentials or if proxy is down.</p><p>Proxy Used: ${selectedProxy.country} (${selectedProxy.ip}:${selectedProxy.port})</p>`;
            return res.status(500).send(errorMessage);
        }

        // 4. Content Type aur Status Code wapas bhejna
        res.status(response.statusCode);
        // Content-Encoding header ko hata dete hain taaki iframe mein content theek se dikhe
        delete response.headers['content-encoding']; 
        res.set(response.headers); 
        res.send(body);
    });
});

app.listen(PORT, () => {
    console.log(`Node.js Proxy Server running on port ${PORT}`);
});
