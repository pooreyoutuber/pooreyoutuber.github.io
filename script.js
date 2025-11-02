document.getElementById('proxyForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const url = document.getElementById('url').value.trim();
    const proxyIp = document.getElementById('proxyIp').value.trim();
    const websiteContainer = document.getElementById('websiteContainer');
    
    // Input validation
    if (!url || !proxyIp) {
        websiteContainer.innerHTML = '<div class="info-message" style="color: red;">कृपया दोनों फ़ील्ड्स भरें।</div>';
        return;
    }
    
    websiteContainer.innerHTML = '<div class="info-message">📡 प्रॉक्सी के माध्यम से वेबसाइट लोड हो रही है...</div>';
    
    try {
        // Send data to the backend endpoint using POST method
        const response = await fetch('/proxy', {
            method: 'POST', // Crucial: This must be POST
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, proxyIp })
        });
        
        // Handle server errors
        if (!response.ok) {
            const errorText = await response.text();
            websiteContainer.innerHTML = `<div class="info-message" style="color: red;">**त्रुटि:** ${errorText}</div>`;
            return;
        }

        const htmlContent = await response.text();
        
        // Create and display the content in a secure iframe
        const iframe = document.createElement('iframe');
        // Sandbox is added for security in a proxy environment
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms'); 
        
        websiteContainer.innerHTML = ''; // Clear loading message
        websiteContainer.appendChild(iframe);
        
        // Write the received HTML content into the iframe
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(htmlContent);
        iframe.contentWindow.document.close();

    } catch (error) {
        // Handle network or fetch errors (e.g., if the server is offline)
        websiteContainer.innerHTML = `<div class="info-message" style="color: red;">**नेटवर्क त्रुटि:** सर्वर से कनेक्शन नहीं हो पाया। ${error.message}</div>`;
    }
});
