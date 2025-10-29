<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Website Booster Prime</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">

<style>
  /* --- CSS Styles (Same as previous responsive version) --- */
  :root{
    --bg: #f6f8fb;--card: #ffffff;--muted: #6b7280; 
    --accent: #0f4f7f;--success: #059669; --border: #e5e7eb;
    --shadow: 0 8px 20px rgba(0,0,0,0.08);--radius: 12px;--gap: 16px; 
    --primary-blue: #0ea5e9;--danger: #dc2626;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Inter', system-ui; background: var(--bg); color: #111827; line-height: 1.5; }
  .wrap { max-width: 1400px; margin: 24px auto; padding: 12px; } 
  header { margin-bottom: 20px; text-align: center; }
  h1 { font-size: 30px; margin: 0; color: var(--accent); letter-spacing: -1px; } 
  .tagline { color: var(--muted); font-size: 15px; margin-top: 6px; }
  .controls { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
  .input-group { display: flex; flex-direction: column; gap: 10px; width: 100%; }
  @media (min-width: 600px) { .input-group { flex-direction: row; } }
  .url-input-wrap { flex: 1; display: flex; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border-radius: 10px; }
  .slot-selector { display: flex; align-items: center; border: 1px solid var(--border); border-right: none; border-radius: 10px; /* Full radius on this element */ padding: 0 12px; background: #f0f4f8; font-weight: 600; color: var(--accent); font-size: 14px; white-space: nowrap; }
  .slot-selector input[type="number"] { width: 50px; padding: 8px 0; border: none; text-align: center; background: transparent; font-size: 16px; font-weight: 600; color: var(--accent); outline: none; }
  
  /* Combined URL Input with Proxy/Location Selector Look */
  input[type="url"], input[type="text"] { 
    flex: 1; 
    padding: 12px 14px; 
    border-radius: 0 10px 10px 0; /* Changed border-radius */
    border: 1px solid var(--border); 
    border-left: none; 
    background: white; 
    font-size: 16px; 
    outline: none; 
  }

  .btn { background: var(--primary-blue); color: white; padding: 12px 18px; border-radius: 0 10px 10px 0; border: 0; cursor: pointer; font-weight: 600; transition: background-color 0.2s; white-space: nowrap; }
  .btn:hover { background: #0c8cd8; }
  .btn.stop { 
      background: var(--danger); 
      border-radius: 10px; /* Stop button changed */
      padding: 10px 18px;
  }
  .btn.stop:hover { background: #b91c1c; }
  .repeat-control { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; color: var(--muted); background: var(--card); padding: 10px 15px; border-radius: 8px; border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.05); flex-wrap: wrap; }
  .repeat-control input[type="checkbox"] { transform: scale(1.2); }
  .repeat-control label { flex-shrink: 0; }
  .repeat-control span { color: var(--accent); font-weight: 600; }
  .info-box { background: var(--card); color: #111827; padding: 16px; border-radius: 8px; font-size: 14px; border: 1px solid var(--border); margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
  .info-box strong { font-weight: 700; color: var(--accent); }
  .info-box ul { list-style: disc; margin: 8px 0 0 20px; padding: 0; }
  .info-box ul li { margin-bottom: 6px; }
  .grid-container { display: grid; gap: var(--gap); grid-template-columns: repeat(1, 1fr); }
  @media (min-width: 600px) { .grid-container { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .grid-container { grid-template-columns: repeat(4, 1fr); } }
  @media (min-width: 1500px) { .grid-container { grid-template-columns: repeat(5, 1fr); } }
  .slot { background: var(--card); border-radius: var(--radius); padding: 10px; box-shadow: var(--shadow); display: flex; flex-direction: column; min-height: 380px; }
  .slot-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .slot-title { font-weight: 700; font-size: 13px; color: var(--accent); }
  /* Updated display as per user request: no proxy IP */
  .slot-ip-display { font-size: 11px; color: var(--muted); font-weight: 500; } 
  .iframe-wrap { flex: 1; border-radius: 6px; border: 1px solid var(--border); position: relative; overflow: hidden; }
  iframe { 
    width: 100%; height: 100%; border: 0; display: block; background: white; 
    transform: scale(0.4); 
    transform-origin: 0 0;
    width: calc(100% / 0.4);
    height: calc(100% / 0.4);
    opacity: 1;
  }
  .slot-footer { display: flex; gap: 6px; align-items: center; margin-top: 8px; justify-content: space-between; flex-wrap: wrap; }
  .action-btn { padding: 8px 10px; border-radius: 6px; border: 0; cursor: pointer; font-weight: 600; font-size: 11px; white-space: nowrap; transition: background-color 0.2s; }
  .action-btn.view { background: var(--success); color: white; }
  .action-btn.view:hover { background: #047857; }
  .action-btn.new-tab { 
      background: #f90;
      color: white; 
      flex-grow: 1;
      font-size: 12px;
      padding: 8px 10px;
  }
  .action-btn.new-tab:hover { background: #e80; }
  .status { font-size: 11px; color: var(--muted); font-weight: 600; display: flex; align-items: center; gap: 4px; }
  .status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--muted); transition: background 0.3s ease; }
  .status-dot.active { background: var(--success); animation: pulse-ping 1.6s infinite; }
  @keyframes pulse-ping { 0%{ transform:scale(.85); opacity:1 } 70%{ transform:scale(1.5); opacity:0 } 100%{ transform:scale(.85); opacity:0 } }

  /* New Proxy/Location Selector Styling */
  .proxy-location-wrap {
      display: flex;
      align-items: stretch;
      border-radius: 10px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.05);
      width: 100%;
      flex: 1;
  }
  .location-select {
      background: #f0f4f8;
      color: var(--accent);
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-right: none;
      border-radius: 10px 0 0 10px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      /* Custom dropdown styling to remove default arrow */
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230f4f7f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat, repeat;
      background-position: right 10px top 50%, 0 0;
      background-size: 12px auto, 100%;
  }
  .url-input-wrap input[type="url"] {
      border-radius: 0;
      border-left: 0;
  }
  .input-group .btn {
      border-radius: 0 10px 10px 0;
  }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>Website Booster Prime</h1>
      <div class="tagline">Global Traffic Simulation System.</div>
    </header>

    <div class="controls">
        <div class="input-group">
            
            <div class="slot-selector" style="border-radius: 10px; border-right: 1px solid var(--border);">
                Slots:
                <input id="numSlots" type="number" value="10" min="1" max="20" />
            </div>

            <div class="proxy-location-wrap">
                <select id="proxyModeSelect" class="location-select">
                    <option value="static" selected>Proxy Mode: Static List</option>
                </select>

                <input id="globalUrl" type="url" placeholder="Paste Target URL (e.g., https://yourwebsite.com)" />
                
                <button id="globalGo" class="btn" style="border-radius: 0 10px 10px 0;">Load & Run All</button>
            </div>
        </div>
        
        <div class="repeat-control">
            <input type="checkbox" id="repeatMode" />
            <label for="repeatMode">
                Enable **Proxy Cycling** Mode: Repeat all <span>30s</span> with the **next IP** from the list (Geo Change).
            </label>
            <button id="globalStop" class="btn stop" style="display:none;">STOP ALL</button>
        </div>
    </div>
    
    <div class="info-box">
        <strong>Tool Status: Static Proxy Geo Cycling Enabled 🔄</strong>
        <ul>
            <li>
                **Proxies Used:** आपकी दी गई **10 Static Proxies** लिस्ट का इस्तेमाल हो रहा है।
            </li>
            <li>
                **Security Fix:** आपके प्रॉक्सी क्रेडेंशियल्स **proxy_loader.php** फ़ाइल में **सुरक्षित** हैं।
            </li>
            <li>
                **Geo Change:** 'Proxy Cycling' Mode में, हर 30 सेकंड में **लिस्ट का अगला Static IP/Geo** इस्तेमाल होगा।
            </li>
        </ul>
    </div>

    <div class="grid-container" id="gridContainer">
        </div>
    
  </div>

<script>
/* ----------------------------------------------------------------------
   STATIC PROXY DATA and CONFIGURATION
   ---------------------------------------------------------------------- */

const allNames = ["Alex", "Sophia", "John", "Maria", "David", "Emily", "Michael", "Olivia", "James", "Ava", "Robert", "Isabella", "William", "Mia", "Joseph", "Charlotte", "Daniel", "Amelia", "Andrew", "Harper", "Logan", "Grace", "Ethan", "Chloe", "Noah", "Mason", "Victoria", "Lucas", "Zoe"];

function generateUniqueId() {
    return Math.floor(Math.random() * 9000000000) + 1000000000;
}

// -------------------------------------------------------------------------
// Your Static Proxy List (10 unique proxies, duplicated for up to 20 slots)
// We are adding assumed country codes for UI display purposes based on IP range.
const STATIC_PROXIES = [
    { ip: "142.111.48.253", port: "7030", country: "US" },
    { ip: "31.59.20.176", port: "6754", country: "DE" },
    { ip: "23.95.150.145", port: "6114", country: "GB" },
    { ip: "198.23.239.134", port: "6540", country: "FR" }, 
    { ip: "45.38.107.97", port: "6014", country: "IN" },
    { ip: "107.172.163.27", port: "6543", country: "CA" },
    { ip: "64.137.96.74", port: "6641", country: "US" },
    { ip: "216.10.27.159", port: "6837", country: "AU" },
    { ip: "142.111.67.146", port: "5611", country: "US" },
    { ip: "142.147.128.93", port: "6593", country: "CA" },
    
    // Duplicates for slots 11-20 (to allow up to 20 slots using your 10 proxies)
    { ip: "142.111.48.253", port: "7030", country: "US" }, 
    { ip: "31.59.20.176", port: "6754", country: "DE" },  
    { ip: "23.95.150.145", port: "6114", country: "GB" },
    { ip: "198.23.239.134", port: "6540", country: "FR" }, 
    { ip: "45.38.107.97", port: "6014", country: "IN" }, 
    { ip: "107.172.163.27", port: "6543", country: "CA" }, 
    { ip: "64.137.96.74", port: "6641", country: "US" }, 
    { ip: "216.10.27.159", port: "6837", country: "AU" }, 
    { ip: "142.111.67.146", port: "5611", country: "US" }, 
    { ip: "142.147.128.93", port: "6593", country: "CA" },
];
// -------------------------------------------------------------------------

const MAX_SLOTS = STATIC_PROXIES.length;
const PROXY_ENDPOINT_URL = 'proxy_loader.php'; 
const REPEAT_INTERVAL_MS = 30000; // 30 seconds

// DOM Elements
const gridContainer = document.getElementById('gridContainer');
const globalUrlInput = document.getElementById('globalUrl');
const numSlotsInput = document.getElementById('numSlots');
const globalGoBtn = document.getElementById('globalGo');
const repeatModeCheckbox = document.getElementById('repeatMode');
const globalStopBtn = document.getElementById('globalStop');

let currentSlots = [];
let repeatIntervals = []; 
let currentProxyIndex = 0; // Index to cycle through the STATIC_PROXIES list

// Slot Configuration (Uses the static proxy list)
const slotConfigs = STATIC_PROXIES.map((proxy, index) => ({
    ...proxy, // Includes ip, port, country
    name: allNames[index % allNames.length],
    uniqueId: generateUniqueId() 
}));


// Function to create a single slot element
function createSlot(index, config){
  const el = document.createElement('div');
  el.className = 'slot';
  
  el.innerHTML = `
    <div class="slot-top">
      <div class="slot-title">SLOT ${index+1}: ${config.name}</div>
      <div class="slot-ip-display" id="slot-country-${index}">${config.country} (Static)</div> 
    </div>
    
    <div class="iframe-wrap">
      <iframe id="iframe-${index}" src="about:blank" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>
    </div>
    
    <div class="slot-footer">
      <button id="open-${index}" class="action-btn new-tab">Full View (New Tab)</button>
      <button id="run-${index}" class="action-btn view">Start Proxy View</button>
      <div class="status" id="status-wrap-${index}">
        <span class="status-dot" id="dot-${index}"></span>
        <span id="status-${index}">Ready</span>
      </div>
    </div>
  `;
  
  gridContainer.appendChild(el);

  const iframe = el.querySelector(`#iframe-${index}`);
  const openBtn = el.querySelector(`#open-${index}`);
  const runBtn = el.querySelector(`#run-${index}`);
  const statusSpan = el.querySelector(`#status-${index}`);
  const statusDot = el.querySelector(`#dot-${index}`);
  const countryDisplay = el.querySelector(`#slot-country-${index}`);

  function setStatus(text, isActive = false){
    statusSpan.textContent = text;
    statusDot.classList.toggle('active', isActive);
  }
  
  // Gets the proxy data for this run, based on the global currentProxyIndex
  function getCurrentProxyForRun(){
      // In cycling mode, all active slots use the IP corresponding to currentProxyIndex.
      // We use the index of the slot itself to determine its default IP from the list
      // when running a single view, but use the global index for cycling mode.
      
      if(repeatModeCheckbox.checked){
        // In cycling mode, all slots use the same cycling IP for the current interval
        return STATIC_PROXIES[currentProxyIndex % STATIC_PROXIES.length];
      } else {
        // In single run mode, each slot uses its pre-assigned IP
        return STATIC_PROXIES[index % STATIC_PROXIES.length];
      }
  }

  function getProxiedUrl(originalUrl){
      const proxy = getCurrentProxyForRun();
      
      // Update the country displayed in the slot to the current IP's country
      countryDisplay.textContent = `${proxy.country} (Static IP)`; 

      // Send the specific IP, Port, URL, and Unique ID to PHP.
      // Auth is handled securely inside the PHP script.
      return `${PROXY_ENDPOINT_URL}?` + 
          `target=${encodeURIComponent(originalUrl)}&` +
          `ip=${proxy.ip}&` + 
          `port=${proxy.port}&` + 
          `uid=${config.uniqueId}`; // Unique ID for GA4 Cookie Fix
  }

  // --- Core Automation Function ---
  async function runAutomation(originalUrl){
    if(!originalUrl) return;
    
    // 1. iFrame Load (Visible preview)
    iframe.src = originalUrl;
    setStatus('Loading Content...', false);

    const proxiedUrl = getProxiedUrl(originalUrl);
    
    // Get the proxy used for this call for logging
    const proxyUsed = getCurrentProxyForRun();

    setStatus(`Sending Proxy View (${proxyUsed.country})...`, false);
    statusDot.style.animation = 'pulse-ping 0.5s infinite';

    try {
        // Fetch request is sent. PHP script runs in background for 30s.
        await fetch(proxiedUrl, { mode: 'no-cors' });
        
        // Response is quick due to Connection: close header in PHP
        setStatus('View Sent (BG Session Active)', true);
        
    } catch (e) {
        setStatus('Failed (Network/Proxy Error)', false);
    }
    
    statusDot.style.animation = 'none';
  }
  
  // Event Handlers
  openBtn.addEventListener('click', ()=> {
    const url = globalUrlInput.value.trim();
    if(!url){ alert('Please paste a URL into the global input field first.'); return; }
    // Note: This opens the target URL directly (not proxied)
    window.open(url, '_blank'); 
  });

  runBtn.addEventListener('click', ()=> {
    const url = globalUrlInput.value.trim();
    if(!url){ alert('Please paste a URL into the global input field first.'); return; }
    
    // For single runs, we use the slot's pre-assigned IP (not cycling)
    currentProxyIndex = index % STATIC_PROXIES.length;
    runAutomation(url); 
  });
  
  setStatus('Ready', true);

  return { 
      runAutomation, 
      setStatus
  }; 
}

// Function to redraw slots based on the selected number
function renderSlots(count) {
    gridContainer.innerHTML = ''; 
    currentSlots = [];

    const maxCount = Math.min(count, MAX_SLOTS);
    
    if (count < 1 || count > MAX_SLOTS) {
        count = Math.min(Math.max(count, 1), MAX_SLOTS);
        numSlotsInput.value = count;
    }
    
    globalGoBtn.textContent = `Load & Run All (${count} Slots)`;

    for(let i=0; i < count; i++){
      // Pass the fixed config to the slot
      const slot = createSlot(i, slotConfigs[i]); 
      currentSlots.push(slot);
    }
    stopAllAutomation();
}

// Global Stop Function
function stopAllAutomation() {
    repeatIntervals.forEach(intervalId => clearInterval(intervalId));
    repeatIntervals = [];
    globalGoBtn.style.display = 'block';
    globalStopBtn.style.display = 'none';
    currentProxyIndex = 0; // Reset index
    
    currentSlots.forEach(s => s.setStatus('Ready (Stopped)', true));
    
    repeatModeCheckbox.checked = false;
}

// Global Start/Run Logic
globalGoBtn.addEventListener('click', ()=>{
  const url = globalUrlInput.value.trim();
  if(!url){ 
      alert('Please paste a valid URL into the global input field.'); 
      return; 
  }
  
  // Start with the first proxy IP in the list
  currentProxyIndex = 0;
  
  // Run once immediately
  currentSlots.forEach(s => s.runAutomation(url));
  
  // If repeat mode is checked, start intervals
  if (repeatModeCheckbox.checked) {
    globalGoBtn.style.display = 'none';
    globalStopBtn.style.display = 'block';
      
    currentSlots.forEach(s => s.setStatus(`Starting Proxy Cycling (30s cycle)...`, true));
    
    // Interval runs the whole batch again with the next proxy IP in the list
    const intervalId = setInterval(() => {
        // Move to the next proxy IP for the entire batch (Geo Change)
        currentProxyIndex = (currentProxyIndex + 1) % STATIC_PROXIES.length;
        
        currentSlots.forEach((s) => {
            s.runAutomation(url);
            s.setStatus(`Repeat Running. Next IP in 30s...`, true);
        });
        
    }, REPEAT_INTERVAL_MS);
        
    repeatIntervals.push(intervalId);
  }
});

// Event listeners
numSlotsInput.addEventListener('change', (e) => {
    let count = parseInt(e.target.value);
    if (isNaN(count)) count = 1; 
    renderSlots(count);
});

globalStopBtn.addEventListener('click', stopAllAutomation);
repeatModeCheckbox.addEventListener('change', () => {
    if (!repeatModeCheckbox.checked && globalStopBtn.style.display === 'block') {
        stopAllAutomation();
    }
});


// Initial render when the page loads
renderSlots(parseInt(numSlotsInput.value));
</script>
</body>
</html>
