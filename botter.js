<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Multi Tab/Request Opener Tool</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; }
    input, button { padding: 8px; margin: 6px 0; width: 100%; box-sizing: border-box; }
    label { font-weight: bold; }
    .note { color: #555; font-size: 0.9em; margin-top: 10px; }
  </style>
</head>
<body>
  <h2>Multi Tab/Request Opener Tool</h2>
  
  <label for="url">Enter Website URL:</label>
  <input type="url" id="url" placeholder="https://example.com" value="https://pooreyoutuber.github.io/" />
  
  <label for="count">Number of Tabs to Open:</label>
  <input type="number" id="count" value="10" min="1" max="100" />
  
  <label for="delay">Delay Between Opens (milliseconds):</label>
  <input type="number" id="delay" value="200" min="0" max="5000" />
  
  <button id="startBtn">Start Opening Tabs</button>
  <button id="stopBtn" disabled>Stop Opening</button>
  
  <p class="note">
    Note: Browsers may block popup windows/tabs. Please allow popups for this page.<br/>
    Opening many tabs may slow down your browser or computer.
  </p>
  
  <script>
    (function() {
      const startBtn = document.getElementById('startBtn');
      const stopBtn = document.getElementById('stopBtn');
      const urlInput = document.getElementById('url');
      const countInput = document.getElementById('count');
      const delayInput = document.getElementById('delay');
      let running = false;
      let openedWindows = [];
      
      function isValidUrl(string) {
        try {
          new URL(string);
          return true;
        } catch (_) {
          return false;  
        }
      }
      
      async function openTabs(url, count, delay) {
        running = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        openedWindows = [];
        
        for(let i = 0; i < count; i++) {
          if (!running) break;
          const w = window.open(url, '_blank');
          if (w) openedWindows.push(w);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        startBtn.disabled = false;
        stopBtn.disabled = true;
        running = false;
      }
      
      startBtn.addEventListener('click', () => {
        const url = urlInput.value.trim();
        const count = parseInt(countInput.value, 10);
        const delay = parseInt(delayInput.value, 10);
        
        if (!isValidUrl(url)) {
          alert('Please enter a valid URL (with http:// or https://)');
          return;
        }
        if (count < 1 || count > 100) {
          alert('Please enter a count between 1 and 100');
          return;
        }
        if (delay < 0 || delay > 5000) {
          alert('Please enter a delay between 0 and 5000 milliseconds');
          return;
        }
        
        openTabs(url, count, delay);
      });
      
      stopBtn.addEventListener('click', () => {
        running = false;
        // Try to close opened tabs (browser may block this)
        for(const w of openedWindows) {
          if (w && !w.closed) w.close();
        }
        openedWindows = [];
        startBtn.disabled = false;
        stopBtn.disabled = true;
      });
    })();
  </script>
</body>
</html>
