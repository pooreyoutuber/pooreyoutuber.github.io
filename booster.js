// booster.js
// 🌐 Backend Root — अपना Render backend URL डालो (no trailing slash)
// **ज़रूरी:** Render URL सही है, पर सुनिश्चित करें कि आपकी Render सर्विस Active है।
const RENDER_BACKEND_ROOT = "https://pooreyoutuber-github-io-blmp.onrender.com";

// 🔁 Proxy List (10 proxies)
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

// 🧩 Utility Functions
function proxyToUri(p) {
  return `http://${encodeURIComponent(p.user)}:${encodeURIComponent(p.pass)}@${p.host}:${p.port}`;
}
function shortName(p) {
  return `${p.host}:${p.port}`;
}
function $(id) { return document.getElementById(id); }
function escapeHtml(s) {
  return s
    ? s.replace(/[&<>"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[m]))
    : "";
}

// 🚀 Initialize Page
document.addEventListener("DOMContentLoaded", init);

function init() {
  const selector = $("proxySelector");

  // 🔹 Proxy dropdown भरना
  PROXY_POOL.forEach((p, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = `${shortName(p)} (${p.user})`;
    selector.appendChild(opt);
  });

  // 🔹 Random proxy auto-select
  const randomIndex = Math.floor(Math.random() * PROXY_POOL.length);
  selector.value = "auto";
  setSelectedProxyDisplay(randomIndex);

  // 🔹 Proxy selector listener
  selector.addEventListener("change", () => {
    if (selector.value === "auto") {
      const r = Math.floor(Math.random() * PROXY_POOL.length);
      setSelectedProxyDisplay(r);
    } else {
      setSelectedProxyDisplay(parseInt(selector.value, 10));
    }
  });

  // 🔹 Buttons
  $("loadBtn").addEventListener("click", handleLoad);
  $("copyProxyBtn").addEventListener("click", copyProxyToClipboard);
}

// 🧠 Store selected proxy index
let currentSelectedProxyIndex = 0;

function setSelectedProxyDisplay(idx) {
  currentSelectedProxyIndex = idx;
  const p = PROXY_POOL[idx];
  const uri = proxyToUri(p);
  $("proxyString").value = uri;
  $("proxyInfo").innerHTML = `Selected proxy: <b>${escapeHtml(
    shortName(p)
  )}</b> (Auto-rotate active)`;
}

// 🔁 Load via Proxy
async function handleLoad() {
  const url = $("targetUrl").value.trim();
  if (!url) {
    alert("कृपया कोई URL डालें।");
    return;
  }

  const selectorVal = $("proxySelector").value;
  const proxyParam =
    selectorVal === "auto"
      ? proxyToUri(PROXY_POOL[currentSelectedProxyIndex])
      : proxyToUri(PROXY_POOL[parseInt(selectorVal, 10)]);

  // 🔗 Backend endpoint
  const endpoint = `${RENDER_BACKEND_ROOT}/proxy?url=${encodeURIComponent(
    url
  )}&proxy=${encodeURIComponent(proxyParam)}`;

  $("proxyInfo").innerHTML = `⏳ Loading from backend...<br><small>${escapeHtml(endpoint)}</small>`;

  try {
    const resp = await fetch(endpoint, { method: "GET" });
    
    // 404 या किसी अन्य त्रुटि को हैंडल करना
    if (!resp.ok) {
      const body = await resp.text();
      $("proxyInfo").innerHTML = `<span style="color:red;font-weight:bold;">❌ Backend error ${resp.status}</span><br><pre>${escapeHtml(
        body
      )}</pre>`;
      $("proxyFrame").src = "about:blank"; 
      return;
    }

    $("proxyFrame").src = endpoint;
    $("proxyInfo").innerHTML = `✅ Loaded via proxy <b>${escapeHtml(
      shortName(PROXY_POOL[currentSelectedProxyIndex])
    )}</b>`;
  } catch (err) {
    $("proxyInfo").innerHTML = `<span style="color:red;font-weight:bold;">❌ Network error: ${escapeHtml(
      err.message
    )}</span>`;
    $("proxyFrame").src = "about:blank";
  }
}

// 📋 Copy proxy URI to clipboard
function copyProxyToClipboard() {
  const txt = $("proxyString").value;
  if (!txt) return;
  navigator.clipboard
    .writeText(txt)
    .then(() => {
      alert("✅ Proxy copied to clipboard!");
    })
    .catch(() => {
      alert("⚠️ Copy failed — please copy manually.");
    });
}
