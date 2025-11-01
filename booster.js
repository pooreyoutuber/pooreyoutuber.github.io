// booster.js
// ⚠️ IMPORTANT: यहाँ पर RENDER_BACKEND_ROOT को अपनी backend URL से बदलो (no trailing slash).
const RENDER_BACKEND_ROOT = "https://pooreyoutuber-github-io-blmp.onrender.com";

// PROXY_POOL — screenshot के आधार पर 10 proxies (host, port, username, password).
// अगर तुम्हारे पास अलग proxies हों, इन्हें edit कर लो।
// NOTE: credentials यहाँ client-side रखने से security risk है — production में server-side store करो।
const PROXY_POOL = [
  { host: "142.111.48.253", port: "7030", user: "bqctypvz", pass: "399xb3kxqv6i" },
  { host: "31.59.20.176",  port: "6754", user: "bqctypvz", pass: "399xb3kxqv6i" },
  { host: "23.95.150.145", port: "6114", user: "bqctypvz", pass: "399xb3kxqv6i" },
  { host: "198.23.239.134", port: "6540", user: "bqctypvz", pass: "399xb3kxqv6i" },
  { host: "45.38.107.97",  port: "6014", user: "bqctypvz", pass: "399xb3kxqv6i" },
  { host: "107.172.163.27", port: "6543", user: "bqctypvz", pass: "399xb3kxqv6i" },
  { host: "64.137.96.74",  port: "6641", user: "bqctypvz", pass: "399xb3kxqv6i" },
  { host: "216.10.27.159", port: "6837", user: "bqctypvz", pass: "399xb3kxqv6i" },
  { host: "142.111.67.146", port: "5611", user: "bqctypvz", pass: "399xb3kxqv6i" },
  { host: "142.147.128.93", port: "6593", user: "bqctypvz", pass: "399xb3kxqv6i" }
];

// Helpers
function proxyToUri(p){
  // HTTP proxy URI with basic auth
  return `http://${encodeURIComponent(p.user)}:${encodeURIComponent(p.pass)}@${p.host}:${p.port}`;
}
function shortName(p){
  return `${p.host}:${p.port}`;
}
function $(id){ return document.getElementById(id); }
function escapeHtml(s){ return s ? s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])) : ''; }

document.addEventListener('DOMContentLoaded', init);

function init(){
  const selector = $('proxySelector');
  // fill selector with proxies
  PROXY_POOL.forEach((p, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = `${shortName(p)} (${p.user})`;
    selector.appendChild(opt);
  });

  // On load select random proxy by default (auto rotate)
  const randomIndex = Math.floor(Math.random() * PROXY_POOL.length);
  // We set selector to 'auto' but show selected proxy string in proxyString input
  selector.value = 'auto';
  setSelectedProxyDisplay(randomIndex);

  // If user manually chooses proxy, update display
  selector.addEventListener('change', () => {
    if(selector.value === 'auto'){
      const r = Math.floor(Math.random() * PROXY_POOL.length);
      setSelectedProxyDisplay(r);
    } else {
      setSelectedProxyDisplay(parseInt(selector.value,10));
    }
  });

  // Buttons
  $('loadBtn').addEventListener('click', handleLoad);
  $('copyProxyBtn').addEventListener('click', copyProxyToClipboard);

  // Also auto-update selected proxy every time the page reloads (above done)
}

// Store current selected index (for display / use)
let currentSelectedProxyIndex = 0;
function setSelectedProxyDisplay(idx){
  currentSelectedProxyIndex = idx;
  const p = PROXY_POOL[idx];
  const uri = proxyToUri(p);
  $('proxyString').value = uri;
  $('proxyInfo').innerHTML = `Selected proxy (display): <b>${escapeHtml(shortName(p))}</b>. Proxy credentials shown in box. (Auto-rotate active)`;
}

async function handleLoad(){
  const url = $('targetUrl').value.trim();
  if(!url){
    alert('Kripya pehle URL daalein.');
    return;
  }
  let proxyParam = '';
  const selectorVal = $('proxySelector').value;
  if(selectorVal === 'auto'){
    // pick the currentSelectedProxyIndex (set on load)
    proxyParam = proxyToUri(PROXY_POOL[currentSelectedProxyIndex]);
  } else {
    const idx = parseInt(selectorVal, 10);
    proxyParam = proxyToUri(PROXY_POOL[idx]);
  }

  // Build backend endpoint: backend must accept &proxy=PROXY_URI parameter
  const endpoint = `${RENDER_BACKEND_ROOT}/proxy?url=${encodeURIComponent(url)}&proxy=${encodeURIComponent(proxyParam)}`;

  // Show temporary info
  $('proxyInfo').innerHTML = `Requesting backend... <br><small style="color:#333">${escapeHtml(endpoint)}</small>`;

  try{
    // Quick GET to confirm backend reachable — backend should respond ok for this URL
    const resp = await fetch(endpoint, { method: 'GET' });
    if(!resp.ok){
      const body = await resp.text().catch(()=>'<no body>');
      $('proxyInfo').innerHTML = `<span style="color:#a00">Backend error: ${resp.status} ${resp.statusText}</span><br><pre style="white-space:pre-wrap">${escapeHtml(body)}</pre>`;
      return;
    }

    // If ok, set iframe src so browser renders proxied page
    $('proxyFrame').src = endpoint;
    $('proxyInfo').innerHTML = `Loaded via proxy <b>${escapeHtml(shortName(PROXY_POOL[currentSelectedProxyIndex]))}</b>. If iframe blank, open developer console to check CSP/X-Frame issues.`;
  }catch(err){
    console.error(err);
    $('proxyInfo').innerHTML = `<span style="color:#a00">Network error: ${escapeHtml(err.message)}</span>`;
  }
}

function copyProxyToClipboard(){
  const txt = $('proxyString').value;
  if(!txt) return;
  navigator.clipboard.writeText(txt).then(()=> {
    alert('Proxy copied to clipboard');
  }).catch(()=> {
    alert('Copy failed — please copy manually.');
  });
}
