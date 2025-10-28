<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Website Booster Prime (GA4 Active User Simulator)</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">

<style>
  /* --- Optimized & Responsive CSS Styles --- */
  :root{
    --bg: #f6f8fb;--card: #ffffff;--muted: #6b7280; 
    --accent: #0f4f7f;--success: #059669; --border: #e5e7eb;
    --shadow: 0 8px 20px rgba(0,0,0,0.08);--radius: 12px;--gap: 16px; 
    --primary-blue: #0ea5e9;--danger: #dc2626;--running: #d97706;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Inter', system-ui; background: var(--bg); color: #111827; line-height: 1.5; }
  .wrap { max-width: 1400px; margin: 24px auto; padding: 12px; } 
  header { margin-bottom: 20px; text-align: center; }
  h1 { font-size: 32px; margin: 0; color: var(--accent); letter-spacing: -1px; } 
  .tagline { color: var(--muted); font-size: 15px; margin-top: 6px; }
  
  /* Control Panel Styling */
  .controls { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
  .input-group { display: flex; flex-direction: column; gap: 10px; width: 100%; }
  @media (min-width: 600px) { .input-group { flex-direction: row; } }
  .url-input-wrap { flex: 1; display: flex; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border-radius: 10px; }
  .slot-selector { display: flex; align-items: center; border: 1px solid var(--border); border-right: none; border-radius: 10px 0 0 10px; padding: 0 12px; background: #f0f4f8; font-weight: 600; color: var(--accent); font-size: 14px; white-space: nowrap; }
  .slot-selector input[type="number"] { width: 40px; padding: 8px 0; border: none; text-align: center; background: transparent; font-size: 16px; font-weight: 600; color: var(--accent); outline: none; }
  input[type="url"] { flex: 1; padding: 12px 14px; border-radius: 0; border: 1px solid var(--border); border-left: none; background: white; font-size: 16px; outline: none; border-radius: 0 10px 10px 0; }
  @media (min-width: 600px) {
    input[type="url"] { border-radius: 0; }
    .slot-selector { border-radius: 10px 0 0 10px; }
  }

  .btn { background: var(--primary-blue); color: white; padding: 12px 18px; border-radius: 10px; border: 0; cursor: pointer; font-weight: 600; transition: background-color 0.2s; white-space: nowrap; }
  @media (min-width: 600px) { .btn { border-radius: 0 10px 10px 0; } }
  .btn:hover { background: #0c8cd8; }
  .btn.stop { background: var(--danger); }
  .btn.stop:hover { background: #b91c1c; }
  
  .repeat-control { display: flex; align-items: center; justify-content: flex-start; gap: 10px; font-size: 14px; color: var(--muted); background: var(--card); padding: 10px 15px; border-radius: 8px; border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.05); flex-wrap: wrap; }
  .repeat-control input[type="checkbox"] { transform: scale(1.2); }
  .repeat-control label { flex-shrink: 0; }
  .repeat-control span { color: var(--accent); font-weight: 600; }
  .global-stop-btn-wrap { margin-left: auto; }

  /* Slot Grid Styling */
  .grid-container { display: grid; gap: var(--gap); grid-template-columns: repeat(1, 1fr); }
  @media (min-width: 600px) { .grid-container { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .grid-container { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width: 1500px) { .grid-container { grid-template-columns: repeat(4, 1fr); } }

  .slot { background: var(--card); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow); border: 1px solid var(--border); }
  .slot-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px dashed var(--border); padding-bottom: 8px; }
  .slot-title { font-weight: 700; font-size: 16px; color: var(--accent); }
  .slot-ip-display { font-size: 12px; color: var(--muted); font-weight: 500; } 
  .slot-footer { display: flex; gap: 10px; align-items: center; margin-top: 15px; justify-content: space-between; flex-wrap: wrap; }
  
  .status { font-size: 14px; color: var(--muted); font-weight: 600; display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .status-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: var(--muted); transition: background 0.3s ease; }
  .status-dot.active { background: var(--success); animation: pulse-ping 1.6s infinite; }
  .status-dot.running { background: var(--running); animation: pulse-ping 1.6s infinite; }
  .status-dot.error { background: var(--danger); animation: none; }

  .action-btn { padding: 8px 15px; border-radius: 6px; border: 0; cursor: pointer; font-weight: 600; font-size: 12px; white-space: nowrap; transition: background-color 0.2s; }
  .action-btn.view { background: var(--primary-blue); color: white; }
  .action-btn.view:hover { background: #0c8cd8; }
  .action-btn.reset { background: #f0f4f8; color: var(--accent); border: 1px solid var(--border); }
  .action-btn.reset:hover { background: #e0e4e8; }
  
  @keyframes pulse-ping { 0%{ transform:scale(.85); opacity:1 } 70%{ transform:scale(1.5); opacity:0 } 100%{ transform:scale(.85); opacity:0 } }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>Website Booster Prime 📈</h1>
      <div class="tagline">GA4 Active User Simulation System. Server-Side 30-Second Sessions.</div>
    </header>

    <div class="controls">
        <div class="input-group">
            
            <div class="slot-selector">
                Slots:
                <input id="numSlots" type="number" value="10" min="1" max="10" />
            </div>

            <div class="url-input-wrap">
                <input id="globalUrl" type="url" placeholder="Paste Target URL (e.g., https://yourwebsite.com)" />
            </div>
            <button id="globalGo" class="btn">🚀 Load & Run All</button>
        </div>
        
        <div class="repeat-control">
            <input type="checkbox" id="repeatMode" />
            <label for="repeatMode">
                **Active User Mode** (Repeat): Automatically refresh every <span>30 seconds</span> for engaged GA4 sessions.
            </label>
            <div class="global-stop-btn-wrap">
                <button id="globalStop" class="btn stop" style="display:none;">🛑 STOP ALL</button>
            </div>
        </div>
    </div>

    <div class="grid-container" id="gridContainer">
        </div>
  </div>

<script>
/* ----------------------------------------------------------------------
   PROXY DATA and CONFIGURATION - (Your 10 Proxies Injected)
   ---------------------------------------------------------------------- */

const COMMON_USER = "bqctypvz"; [span_0](start_span)// Your Username[span_0](end_span)
const COMMON_PASS = "399xb3kxqv6i"; [span_1](start_span)// Your Password[span_1](end_span)
const COMMON_AUTH = `${COMMON_USER}:${COMMON_PASS}`;

const allNames = ["Laptop-User", "Mobile-Simulator", "Tablet-Visitor", "Desktop-Client", "Organic-Traffic", "Direct-Session", "Search-Bot", "Premium-User", "Test-Device", "Unique-Visitor"];

// Function to generate a simple unique ID (used for GA4 cookie)
function generateUniqueId() {
    [span_2](start_span)// Generates a random 10-digit number string for the unique cookie[span_2](end_span)
    return Math.floor(Math.random() * 9000000000) + 1000000000;
}

[span_3](start_span)// Your 10 Proxies[span_3](end_span)
const PROXY_LIST = [
  { ip: "142.111.48.253", port: "7030", country: "US" },
  { ip: "31.59.20.176", port: "6754", country: "DE" },
  { ip: "23.95.150.145", port: "6114", country: "CA" },
  { ip: "198.23.239.134", port: "6540", country: "US" },
  { ip: "45.38.107.97", port: "6014", country: "US" },
  { ip: "107.172.163.27", port: "6543", country: "CA" },
  { ip: "64.137.96.74", port: "6641", country: "US" },
  { ip: "216.10.27.159", port: "6837", country: "AU" },
  { ip: "142.111.67.146", port: "5611", country: "US" },
  { ip: "142.147.128.93", port: "6593", country: "CA" },
];

const MAX_SLOTS = PROXY_LIST.length;
const PROXY_ENDPOINT = 'proxy_loader.php'; 
const REPEAT_INTERVAL_MS = 30000; [span_4](start_span)// 30 seconds[span_4](end_span)

const gridContainer = document.getElementById('gridContainer');
const globalUrlInput = document.getElementById('globalUrl');
const numSlotsInput = document.getElementById('numSlots');
const globalGoBtn = document.getElementById('globalGo');
const repeatModeCheckbox = document.getElementById('repeatMode');
const globalStopBtn = document.getElementById('globalStop');

let currentSlots = [];
let repeatIntervals = []; 

// Map proxies with fixed unique IDs and names
const premiumProxies = PROXY_LIST.map((p, index) => ({
    ...p,
    auth: COMMON_AUTH,
    name: allNames[index],
    uniqueId: generateUniqueId() // Unique ID for GA4 Cookie
}));

// Function to create a single slot element
function createSlot(index, proxy){
  const el = document.createElement('div');
  el.className = 'slot';
  
  el.innerHTML = `
    <div class="slot-top">
      <div class="slot-title">SLOT ${index+1}: ${proxy.name} (${proxy.country})</div>
      <div class="slot-ip-display">${proxy.ip}:${proxy.port}</div>
    </div>
    
    <div class="slot-footer">
      <div class="status" id="status-wrap-${index}">
        <span class="status-dot" id="dot-${index}"></span>
        <span id="status-${index}">Ready</span>
      </div>
      <button id="run-${index}" class="action-btn view">Run Once</button>
      <button id="reset-${index}" class="action-btn reset">Reset</button>
    </div>
  `;
  
  gridContainer.appendChild(el);

  const runBtn = el.querySelector(`#run-${index}`);
  const resetBtn = el.querySelector(`#reset-${index}`);
  const statusSpan = el.querySelector(`#status-${index}`);
  const statusDot = el.querySelector(`#dot-${index}`);
  
  let intervalId = null;

  function setStatus(text, type = 'ready'){
    statusSpan.textContent = text;
    statusDot.className = 'status-dot'; // Reset classes
    
    if (type === 'active') {
        statusDot.classList.add('active');
        runBtn.style.display = 'none';
    } else if (type === 'running') {
        statusDot.classList.add('running');
        runBtn.style.display = 'none';
    } else if (type === 'error') {
        statusDot.classList.add('error');
        runBtn.style.display = 'block';
    } else { // ready
        runBtn.style.display = 'block';
    }
  }
  
  function getProxiedUrl(originalUrl, proxy){
      [span_5](start_span)[span_6](start_span)// Sending the Unique ID (uid) to the PHP script which runs for 30s in BG[span_5](end_span)[span_6](end_span)
      return `${PROXY_ENDPOINT}?` + 
          `target=${encodeURIComponent(originalUrl)}&` +
          `ip=${proxy.ip}&port=${proxy.port}&` +
          `auth=${proxy.auth}&` + 
          `uid=${proxy.uniqueId}`;
  }

  // --- Core Automation Function (Background cURL) ---
  async function runAutomation(originalUrl){
    if(!originalUrl) {
        setStatus('Error: URL Missing', 'error');
        return;
    }
    
    const proxiedUrl = getProxiedUrl(originalUrl, proxy);

    setStatus('Sending View (30s Session Active)...', 'running');

    try {
        // Fetch request is sent. [span_7](start_span)PHP script returns immediately[span_7](end_span) [span_8](start_span)but runs cURL in background for 30s[span_8](end_span).
        // We use mode: 'no-cors' as we don't care about the response content, only that the request hits the PHP endpoint.
        await fetch(proxiedUrl, { method: 'GET', mode: 'no-cors' });
        
        // Schedule status update after 30 seconds
        setTimeout(() => {
            setStatus('Active Session Completed', 'active');
        }, REPEAT_INTERVAL_MS - 1000); // 29s for better timing

    } catch (e) {
        setStatus('Failed (Network Error)', 'error');
    }
  }
  
  function resetAutomation() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    setStatus('Ready', 'ready');
  }

  // Event Handlers
  runBtn.addEventListener('click', ()=> {
    const url = globalUrlInput.value.trim();
    runAutomation(url); 
  });
  
  resetBtn.addEventListener('click', () => resetAutomation());
  
  return { 
      runAutomation, 
      setStatus,
      resetAutomation,
      getIntervalId: () => intervalId,
      setIntervalId: (id) => { intervalId = id; }
  }; 
}

// Function to redraw slots based on the selected number
function renderSlots(count) {
    // Clear old slots and stop any running intervals
    stopAllAutomation();
    gridContainer.innerHTML = ''; 
    currentSlots = [];

    const maxCount = Math.min(MAX_SLOTS, premiumProxies.length);
    if (count < 1 || count > maxCount) {
        count = Math.min(Math.max(count, 1), maxCount);
        numSlotsInput.value = count;
    }
    
    globalGoBtn.textContent = `🚀 Load & Run All (${count} Slots)`;

    for(let i=0; i < count; i++){
      const slot = createSlot(i, premiumProxies[i]);
      currentSlots.push(slot);
    }
}

// Global Stop Function
function stopAllAutomation() {
    globalGoBtn.style.display = 'block';
    globalStopBtn.style.display = 'none';
    
    // Stop all individual slot intervals
    currentSlots.forEach(s => s.resetAutomation());
    
    repeatModeCheckbox.checked = false;
}

// Global Start/Run Logic
globalGoBtn.addEventListener('click', ()=>{
  const url = globalUrlInput.value.trim();
  if(!url){ 
      alert('Please paste a valid URL into the global input field.'); 
      return; 
  }
  
  // Run once immediately
  currentSlots.forEach(s => s.runAutomation(url));
  
  // If repeat mode is checked, start intervals
  if (repeatModeCheckbox.checked) {
    globalGoBtn.style.display = 'none';
    globalStopBtn.style.display = 'block';
      
    currentSlots.forEach((s) => {
        s.setStatus(`Starting Repeat Mode (30s cycle)...`, 'running');
        
        // Start interval
        const intervalId = setInterval(() => {
            s.runAutomation(url);
            s.setStatus(`Repeat Running. Next in 30s...`, 'running');
        }, REPEAT_INTERVAL_MS);
        
        s.setIntervalId(intervalId);
    });
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
    // If repeat mode is unselected while running, stop all
    if (!repeatModeCheckbox.checked && globalStopBtn.style.display === 'block') {
        stopAllAutomation();
    }
});


// Initial render when the page loads
renderSlots(parseInt(numSlotsInput.value));
</script>
</body>
</html>
