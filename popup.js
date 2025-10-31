document.getElementById('launchBtn').addEventListener('click', () => {
    const userUrl = document.getElementById('userUrl').value.trim();
    const autoScroll = document.getElementById('autoScroll').checked;
    const autoRefresh = document.getElementById('autoRefresh').checked;
    
    if (!userUrl) {
        alert("❌ Kripya Target URL daalein!");
        return;
    }

    // Background service worker ko message bhejna
    chrome.runtime.sendMessage({
        action: "launchProxy",
        url: userUrl,
        scroll: autoScroll,
        refresh: autoRefresh
    });
});
