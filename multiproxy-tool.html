<?php
// index.php - Simple UI for Proxy Fetcher
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>PHP Proxy Fetcher — Geo Test</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{font-family:Inter,system-ui; background:#f6f8fb; color:#111; padding:20px;}
    .card{max-width:980px;margin:0 auto;background:#fff;padding:18px;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,0.06);}
    input[type=url],select,button,textarea{width:100%;padding:10px;border-radius:8px;border:1px solid #ddd;margin-top:8px;}
    button{background:#0ea5e9;color:#fff;border:0;font-weight:700;cursor:pointer;padding:12px;}
    label{font-weight:600;margin-top:10px;display:block;}
    .row{display:flex;gap:10px;margin-top:10px;}
    .col{flex:1;}
    .note{font-size:13px;color:#6b7280;margin-top:8px;}
    iframe { width:100%; height:600px; border:1px solid #e5e7eb; border-radius:8px; margin-top:12px; }
    pre { background:#0f172a;color:#fff;padding:12px;border-radius:8px; overflow:auto; max-height:200px; white-space:pre-wrap;}
  </style>
</head>
<body>
  <div class="card">
    <h2>PHP Proxy Fetcher — Geo Test (Server-side)</h2>

    <label>Target URL</label>
    <input id="targetUrl" type="url" placeholder="https://example.com" value="https://pooreyoutuber.github.io" />

    <label>Select Proxy</label>
    <select id="proxySelect"></select>

    <div class="row">
      <div class="col">
        <label>Hold (ms)</label>
        <input id="holdMs" type="number" value="30000" />
      </div>
      <div class="col">
        <label>Open Mode</label>
        <select id="openMode">
          <option value="inline">Inline (show fetched page inside page)</option>
          <option value="newtab">Open raw response in New Tab</option>
        </select>
      </div>
    </div>

    <button id="openBtn">Fetch with Selected Proxy</button>

    <p class="note">
      Note: This sends the request from the server through the chosen proxy and shows the fetched result.
      It does <strong>not</strong> change your browser's IP/geo. Use only for authorized testing.
    </p>

    <h4>Response / Logs</h4>
    <pre id="log">No action yet.</pre>

    <div id="resultWrap" style="margin-top:12px;"></div>
  </div>

<script>
// Load proxies from server
async function loadProxies(){
  const sel = document.getElementById('proxySelect');
  sel.innerHTML = '<option>Loading...</option>';
  try{
    const res = await fetch('proxies.php');
    const list = await res.json();
    sel.innerHTML = '';
    list.forEach((p,i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = p.label;
      sel.appendChild(opt);
    });
    log('Loaded ' + list.length + ' proxies.');
  }catch(e){
    sel.innerHTML = '<option>Error loading proxies</option>';
    log('Error loading proxies: ' + e.message);
  }
}

function log(msg){
  const el = document.getElementById('log');
  el.textContent = (new Date()).toLocaleTimeString() + '  ›  ' + msg + '\n' + el.textContent;
}

document.getElementById('openBtn').addEventListener('click', async () => {
  const url = document.getElementById('targetUrl').value.trim();
  const proxyIndex = document.getElementById('proxySelect').value;
  const holdMs = Number(document.getElementById('holdMs').value) || 30000;
  const openMode = document.getElementById('openMode').value;

  if (!url) { alert('Please enter a valid URL'); return; }

  log('Requesting proxy fetch for: ' + url);
  try{
    const res = await fetch('fetch.php', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ url, proxyIndex, holdMs })
    });

    // response is JSON with metadata; if openMode newtab, server returns raw HTML as text stream with header
    const contentType = res.headers.get('content-type') || '';
    if (openMode === 'newtab') {
      // attempt to open raw response (server will send HTML)
      const text = await res.text();
      const win = window.open();
      win.document.open();
      win.document.write(text);
      win.document.close();
      log('Opened raw response in new tab.');
      return;
    }

    // For inline mode: server returns JSON { ok, ipInfo, content } where content is sanitized HTML string
    const json = await res.json();
    if (!json.ok) {
      log('Server error: ' + (json.error || JSON.stringify(json)));
      return;
    }
    log('Fetched via proxy. IP: ' + (json.ipInfo && (json.ipInfo.ip || json.ipInfo || JSON.stringify(json.ipInfo))));
    // insert fetched HTML into resultWrap (uses sandboxed iframe to avoid JS running in our page)
    const wrapper = document.getElementById('resultWrap');
    wrapper.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.sandbox = "allow-forms allow-same-origin allow-popups";
    wrapper.appendChild(iframe);

    // write content into iframe
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(json.content);
    doc.close();
    log('Rendered fetched content inline (sandboxed).');
  }catch(err){
    log('Request failed: ' + err.message);
  }
});

loadProxies();
</script>
</body>
</html>
