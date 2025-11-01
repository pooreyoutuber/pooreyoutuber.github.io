// index.js (यह Render पर डिप्लॉय होगा)
const express = require('express');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const app = express();
const PORT = process.env.PORT || 3000;

// CORS सेटअप: यह आपके GitHub Pages (फ्रंटएंड) को Render (बैकएंड) से बात करने की अनुमति देता है
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// ✅ /proxy रूट जो प्रॉक्सी के माध्यम से URL को फ़ेच करता है
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    const proxyUri = req.query.proxy;

    if (!targetUrl || !proxyUri) {
        return res.status(400).send("URL और Proxy पैरामीटर आवश्यक हैं।");
    }

    try {
        // प्रॉक्सी एजेंट सेट करें
        const agent = new HttpsProxyAgent(proxyUri);
        
        // प्रॉक्सी के माध्यम से लक्ष्य URL को फ़ेच करें
        const response = await axios.get(targetUrl, {
            httpsAgent: agent,
            httpAgent: agent, // HTTP और HTTPS दोनों के लिए
            responseType: 'text', // HTML/Text के रूप में प्राप्त करें
            timeout: 15000 // 15 सेकंड का टाइमआउट
        });

        // लक्ष्य वेबसाइट के Content Type हेडर को कॉपी करें
        if (response.headers['content-type']) {
            res.setHeader('Content-Type', response.headers['content-type']);
        }
        
        // प्राप्त कंटेंट क्लाइंट (आपके iframe) को भेजें
        res.send(response.data);

    } catch (error) {
        // प्रॉक्सी या फ़ेच में कोई त्रुटि होने पर
        console.error('Proxy Fetch Error:', error.message);
        // क्लाइंट को 502 Bad Gateway एरर भेजें, ताकि यह 404 से अलग हो
        const errorMessage = `Proxy Error (502): The proxy or target URL failed to respond. Details: ${error.message}`;
        res.status(502).send(errorMessage);
    }
});

// सर्वर शुरू करें
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
