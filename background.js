// Listener for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "launchProxy") {
        const targetUrl = request.url;
        const scrollFlag = request.scroll;
        const refreshFlag = request.refresh;

        // 1. CroxyProxy ka naya tab kholna
        chrome.tabs.create({ url: "https://www.croxyproxy.com/" }, (newTab) => {
            
            // 2. Tab load hone ka intezaar karna (thoda delay zaroori hai)
            setTimeout(() => {
                
                // 3. CroxyProxy page par code inject karna
                chrome.scripting.executeScript({
                    target: { tabId: newTab.id },
                    func: injectAndRun,
                    args: [targetUrl, scrollFlag, refreshFlag] // Saara data function ko bhejna
                });
            }, 2500); // 2.5 second ka delay
        });
    }
});

// Yeh function CroxyProxy page ke andar run hoga
function injectAndRun(targetUrl, scrollFlag, refreshFlag) {
    
    // --- Step A: Automatic URL fill aur Go button click ---
    // CroxyProxy ke input field aur button ko dhoondhna
    const proxyInput = document.querySelector('input[type="text"][name="url"]');
    const goButton = document.querySelector('button.green-button');

    if (proxyInput && goButton) {
        proxyInput.value = targetUrl; // URL fill karna
        goButton.click();           // Go button click karna

        // Ab CroxyProxy Target URL ko load karega.
    }
    
    // --- Step B: Scrolling aur Refresh (Jab proxied page load ho jaaye) ---
    // Yah code automatically naye proxied page (target site) par run hoga.

    // Auto-Scrolling
    if (scrollFlag) {
        let scrollDirection = 5; // Scroll speed
        let scrollInterval = setInterval(() => {
            window.scrollBy(0, scrollDirection); 

            // Check if reached end/start
            if (window.scrollY + window.innerHeight >= document.body.scrollHeight || window.scrollY === 0) {
                // Direction ulta kardo
                scrollDirection = -scrollDirection;
            }
        }, 100); // Har 100ms mein scroll karein
    }

    // 30 Second Page Refresh
    if (refreshFlag) {
        setTimeout(() => {
            window.location.reload(true);
        }, 30000); // 30,000 milliseconds = 30 seconds
    }
}
