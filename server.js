// server.js
const express = require('express');
const path = require('path');
const { chromium, firefox, webkit } = require('playwright');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ------------------ YOUR PROXIES (FROM YOU) ------------------
// Format: server: 'http://IP:PORT', username, password, label
// I've populated them from your list.
const PROXIES = [
  { id: 'p1', label: 'Proxy 1 - 142.111.48.253:7030 (US?)', server: 'http://142.111.48.253:7030', username: 'bqctypvz', password: '399xb3kxqv6i', browserType: 'chromium' },
  { id: 'p2', label: 'Proxy 2 - 31.59.20.176:6754', server: 'http://31.59.20.176:6754', username: 'bqctypvz', password: '399xb3kxqv6i', browserType: 'chromium' },
  { id: 'p3', label: 'Proxy 3 - 23.95.150.145:6114', server: 'http://23.95.150.145:6114', username: 'bqctypvz', password: '399xb3kxqv6i', browserType: 'chromium' },
  { id: 'p4', label: 'Proxy 4 - 198.23.239.134:6540', server: 'http://198.23.239.134:6540', username: 'bqctypvz', password: '399xb3kxqv6i', browserType: 'chromium' },
  { id: 'p5', label: 'Proxy 5 - 45.38.107.97:6014', server: 'http://45.38.107.97:6014', username: 'bqctypvz', password: '399xb3kxqv6i', browserType: 'chromium' },
  { id: 'p6', label: 'Proxy 6 - 107.172.163.27:6543', server: 'http://107.172.163.27:6543', username: 'bqctypvz', password: '399xb3kxqv6i', browserType: 'chromium' },
  { id: 'p7', label: 'Proxy 7 - 64.137.96.74:6641', server: 'http://64.137.96.74:6641', username: 'bqctypvz', password: '399xb3kxqv6i', browserType: 'chromium' },
  { id: 'p8', label: 'Proxy 8 - 216.10.27.159:6837', server: 'http://216.10.27.159:6837', username: 'bqctypvz', password: '399xb3kxqv6i', browserType: 'chromium' },
  { id: 'p9', label: 'Proxy 9 - 142.111.67.146:5611', server: 'http://142.111.67.146:5611', username: 'bqctypvz', password: '399xb3kxqv6i', browserType: 'chromium' },
  { id: 'p10', label: 'Proxy 10 - 142.147.128.93:6593', server: 'http://142.147.128.93:6593', username: 'bqctypvz', password: '399xb3kxqv6i', browserType: 'chromium' }
];
// --------------------------------------------------------------

const sessions = new Map();

function getBrowserFactory(name) {
  if (name === 'firefox') return firefox;
  if (name === 'webkit') return webkit;
  return chromium;
}

// Send proxy list to frontend (no credentials shown there)
app.get('/api/proxies', (req, res) => {
  const list = PROXIES.map((p, idx) => ({ idx, id: p.id, label: p.label, browserType: p.browserType }));
  res.json(list);
});

// Open endpoint: launches a browser with selected proxy and opens the URL
app.post('/api/open', async (req, res) => {
  const { url, proxyIndex, headful, holdMs } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  const idx = Number(proxyIndex);
  if (isNaN(idx) || idx < 0 || idx >= PROXIES.length) return res.status(400).json({ error: 'Invalid proxyIndex' });

  const proxy = PROXIES[idx];
  const browserFactory = getBrowserFactory(proxy.browserType || 'chromium');

  try {
    const launchOptions = {
      headless: !headful, // headful=true -> visible window
      proxy: {
        server: proxy.server,
        username: proxy.username || undefined,
        password: proxy.password || undefined
      },
      // you can add args if needed, e.g. ['--no-sandbox']
      args: []
    };

    const browser = await browserFactory.launch(launchOptions);
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // Optional: check outgoing IP (helpful to verify proxy)
    let ipInfo = null;
    try {
      const r = await page.goto('https://api.ipify.org?format=json', { waitUntil: 'domcontentloaded', timeout: 15000 });
      if (r && r.ok()) ipInfo = await r.json();
    } catch (e) {
      ipInfo = { error: 'ip check failed: ' + e.message };
    }

    // Navigate to target URL (don't block forever)
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    } catch (navErr) {
      // navigation can still fail but browser launched — continue to return diagnostics
      console.warn('Navigation error (non-fatal):', navErr.message);
    }

    const sessionId = Math.random().toString(36).slice(2, 10);
    sessions.set(sessionId, { browser, context, page, startedAt: Date.now() });

    // Auto-close after holdMs (default 30s)
    const hold = Number(holdMs) || 30000;
    setTimeout(async () => {
      const s = sessions.get(sessionId);
      if (s) {
        try { await s.context.close(); } catch(_) {}
        try { await s.browser.close(); } catch(_) {}
        sessions.delete(sessionId);
        console.log(`Session ${sessionId} auto-closed after ${hold}ms`);
      }
    }, hold);

    res.json({ ok: true, sessionId, ipInfo, message: 'Browser launched; will auto-close in ' + hold + ' ms' });
  } catch (err) {
    console.error('Failed to launch browser:', err);
    res.status(500).json({ error: 'Failed to launch browser: ' + err.message });
  }
});

// Optional manual close
app.post('/api/close', async (req, res) => {
  const { sessionId } = req.body;
  const s = sessions.get(sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  try { await s.context.close(); } catch(_) {}
  try { await s.browser.close(); } catch(_) {}
  sessions.delete(sessionId);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Geo browser tool running on http://localhost:${PORT}`);
});
