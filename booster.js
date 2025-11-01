// booster.js
const RENDER_BACKEND_ROOT = "https://pooreyoutuber-github-io-blmp.onrender.com";

const PROXY_POOL = [
  { host: "142.111.48.253", port: "7030", user: "bqctypvz", pass: "399xb3kxqv6i" },
  { host: "31.59.20.176", port: "6754", user: "bqctypvz", pass: "399xb3kxqv6i" },
  { host: "23.95.150.145", port: "6114", user: "bqctypvz", pass: "399xb3kxqv6i" },
  { host: "198.23.239.134", port: "6540", user: "bqctypvz", pass: "399xb3kxqv6i" },
  { host: "45.38.107.97", port: "6014", user: "bqctypvz", pass: "399xb3kxqv6i" },
  { host: "107.172.163.27", port: "6543", user: "bqctypvz", pass: "399xb3kxqv6i" },
  { host: "64.137.96.74", port: "6641", user: "bqctypvz", pass: "399xb3kxqv6i" },
  { host: "216.10.27.159", port: "6837", user: "bqctypvz", pass: "399xb3kxqv6i" },
  { host: "142.111.67.146", port: "5611", user: "bqctypvz", pass: "399xb3kxqv6i" },
  { host: "142.147.128.93", port: "6593", user: "bqctypvz", pass: "399xb3kxqv6i" }
];

function proxyToUri(p) {
  return `http://${encodeURIComponent(p.user)}:${encodeURIComponent(p.pass)}@${p.host}:${p.port}`;
}
function shortName(p) {
  return `${p.host}:${p.port}`;
}
function $(id) { return document.getElementById(id); }
function escapeHtml(s) { return s ? s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : ''; }

document.addEventListener('DOMContentLoaded', init);

function init() {
  const selector = $('proxySelector');
  PROXY_POOL.forEach((p, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = `${shortName(p)} (${p.user})`;
    selector.appendChild(opt);
  });

  const randomIndex = Math.floor(Math.random() * PROXY_POOL.length);
  selector.value = 'auto';
  setSelectedProxyDisplay(randomIndex);

  selector.addEventListener('change', () => {
    if (selector.value === 'auto') {
      const r = Math.floor(Math.random() * PROXY_POOL.length);
      setSelectedProxyDisplay(r);
    } else {
      setSelectedProxyDisplay(parseInt(selector.value, 10));
    }
  });

  $('loadBtn').addEventListener('click', handleLoad);
  $('copyProxyBtn').addEventListener('click', copyProxyToClipboard);
}

let currentSelectedProxyIndex = 0;
function setSelectedProxyDisplay(idx) {
  currentSelectedProxyIndex = idx;
  const p = PROXY_POOL[idx];
  const uri = proxyToUri(p);
  $('proxyString').value = uri;
  $('proxyInfo').innerHTML = `Selected proxy (display): <b>${escapeHtml(shortName(p))}</b>. (Auto-rotate active)`;
}

async function handleLoad() {
  const url = $('targetUrl').value.trim();
  if (!url) {
    alert('कृपया कोई URL डालें।');
    return;
  }

  const selectorVal = $('proxySelector').value;
  const proxyParam = selectorVal === 'auto'
    ? proxyToUri(PROXY_POOL[currentSelectedProxyIndex])
    : proxyToUri(PROXY_POOL[parseInt(selectorVal, 10)]);

  const endpoint = `${RENDER_BACKEND_ROOT}/proxy?url=${encodeURIComponent(url)}&proxy=${encodeURIComponent(proxyParam)}`;

  $('proxyInfo').innerHTML = `Loading from backend...<br><small>${escapeHtml(endpoint)}</small>`;

  try {
    const resp = await fetch(endpoint, { method: 'GET' });
    if (!resp.ok) {
      const body = await resp.text();
      $('proxyInfo').innerHTML = `<span style="color:red">Backend error ${resp.status}</span><pre>${escapeHtml(body)}</pre>`;
      return;
    }

    $('proxyFrame').src = endpoint;
    $('proxyInfo').innerHTML = `Loaded via proxy <b>${escapeHtml(shortName(PROXY_POOL[currentSelectedProxyIndex]))}</b>.`;
  } catch (err) {
    $('proxyInfo').innerHTML = `<span style="color:red">Network error: ${escapeHtml(err.message)}</span>`;
  }
}

function copyProxyToClipboard() {
  const txt = $('proxyString').value;
  if (!txt) return;
  navigator.clipboard.writeText(txt).then(() => {
    alert('Proxy copied to clipboard!');
  });
}
