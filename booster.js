// booster.js
// ⚠️ IMPORTANT: यहाँ पर अपने backend का सही Render URL भरो (no trailing slash).
const RENDER_BACKEND_ROOT = "https://pooreyoutuber-github-io-blmp.onrender.com";

// 🔒 PROXY_POOL — तुम्हारे दिए Webshare.io वाले proxies
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

// 🔧 Helper Functions
function proxyToUri(p) {
  return `http://${encodeURIComponent(p.user)}:${encodeURIComponent(p.pass)}@${p.host}:${p.port}`;
}
function shortName(p) {
  return `${p.host}:${p.port}`;
}
function $(id) {
  return document.getElementById(id);
}
function escapeHtml(s) {
  return s
    ? s.replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]))
    : "";
}

document.addEventListener("DOMContentLoaded", init);

function init() {
  const selector = $("proxySelector");

  // Fill selector with proxies
  PROXY_POOL.forEach((p, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = `${shortName(p)} (${p.user})`;
    selector.appendChild(opt);
  });

  // Add Auto-rotate option
  const autoOpt = document.createElement("option");
  autoOpt.value = "auto";
  autoOpt.textContent = "Auto (Random Proxy)";
  selector.insertBefore(autoOpt, selector.firstChild);

  // Default: Auto proxy
  selector.value = "auto";
  setSelectedProxyDisplay(Math.floor(Math.random() * PROXY_POOL.length));

  // On manual change
  selector.addEventListener("change", () => {
    if (selector.value === "auto") {
      const r = Math.floor(Math.random() * PROXY_POOL.length);
      setSelectedProxyDisplay(r);
    } else {
      setSelectedProxyDisplay(parseInt(selector.value, 10));
    }
  });

  $("loadBtn").addEventListener("click", handleLoad);
  $("copyProxyBtn").addEventListener("click", copyProxyToClipboard);
}

// Store current proxy index
let currentSelectedProxyIndex = 0;
function setSelectedProxyDisplay(idx) {
  currentSelectedProxyIndex = idx;
  const p = PROXY_POOL[idx];
  const uri = proxyToUri(p);
  $("proxyString").value = uri;
  $("proxyInfo").innerHTML = `Selected proxy: <b>${escapeHtml(shortName(p))}</b> (${escapeHtml(p.user)})`;
}

async function handleLoad() {
  const url = $("targetUrl").value.trim();
  if (!url) {
    alert("कृपया पहले कोई URL डालें।");
    return;
  }

  let proxyParam = "";
  const selectorVal = $("proxySelector").value;
  if (selectorVal === "auto") {
    proxyParam = proxyToUri(PROXY_POOL[currentSelectedProxyIndex]);
  } else {
    const idx = parseInt(selectorVal, 10);
    proxyParam = proxyToUri(PROXY_POOL[idx]);
  }

  const endpoint = `${RENDER_BACKEND_ROOT}/proxy?url=${encodeURIComponent(url)}&proxy=${encodeURIComponent(proxyParam)}`;

  $("proxyInfo").innerHTML = `🔄 Requesting backend... <br><small>${escapeHtml(endpoint)}</small>`;

  try {
    const resp = await fetch(endpoint, { method: "GET" });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "<no body>");
      $("proxyInfo").innerHTML = `<span style="color:#a00">Backend error: ${resp.status} ${resp.statusText}</span><br><pre>${escapeHtml(body)}</pre>`;
      return;
    }

    // Load the proxied site into iframe
    $("proxyFrame").src = endpoint;
    $("proxyInfo").innerHTML = `✅ Loaded via proxy: <b>${escapeHtml(shortName(PROXY_POOL[currentSelectedProxyIndex]))}</b>`;
  } catch (err) {
    console.error(err);
    $("proxyInfo").innerHTML = `<span style="color:#a00">Network error: ${escapeHtml(err.message)}</span>`;
  }
}

function copyProxyToClipboard() {
  const txt = $("proxyString").value;
  if (!txt) return;
  navigator.clipboard
    .writeText(txt)
    .then(() => alert("✅ Proxy copied to clipboard"))
    .catch(() => alert("❌ Copy failed — please copy manually."));
}
