// ===================================================================
// PooreYouTuber Combined API - FINAL FIXED VERSION
// Compatible with Node 18+ and Replit/Vercel/Render
// ===================================================================

const express = require('express');
const cors = require('cors');
const fs = require('fs');

// ✅ CRITICAL FIX — Use dynamic import for node-fetch (works everywhere)
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

// ✅ GEMINI SDK (CJS Compatible)
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 10000;

// ===================================================================
// GEMINI API KEY LOADING
// ===================================================================
let GEMINI_KEY;
try {
  GEMINI_KEY = fs.readFileSync('/etc/secrets/gemini', 'utf8').trim();
  console.log('✅ Gemini Key loaded successfully from Secret File.');
} catch (e) {
  GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (GEMINI_KEY) {
    console.log('✅ Gemini Key loaded from Environment Variable.');
  } else {
    console.error('❌ FATAL: Gemini Key could not be loaded.');
  }
}

let ai;
if (GEMINI_KEY) {
  ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
} else {
  ai = { models: { generateContent: () => Promise.reject(new Error('AI Key Missing')) } };
}

// ===================================================================
// MIDDLEWARE
// ===================================================================
app.use(
  cors({
    origin: 'https://pooreyoutuber.github.io',
    methods: ['GET', 'POST'],
    credentials: true,
  })
);
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('🚀 PooreYouTuber Combined API is running!');
});

// ===================================================================
// UTILITIES
// ===================================================================
const MIN_DELAY = 3000;
const MAX_DELAY = 12000;
const geoLocations = [
  { country: 'United States', region: 'California' },
  { country: 'India', region: 'Maharashtra' },
  { country: 'Germany', region: 'Bavaria' },
  { country: 'Japan', region: 'Tokyo' },
];

function getRandomDelay() {
  return Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY;
}
function getRandomGeo() {
  return geoLocations[Math.floor(Math.random() * geoLocations.length)];
}

// ===================================================================
// sendData() - GA4 Event Sender
// ===================================================================
async function sendData(gaId, apiSecret, payload, currentViewId, eventType) {
  const gaEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${gaId}&api_secret=${apiSecret}`;
  try {
    const response = await fetch(gaEndpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status === 204) {
      console.log(`[View ${currentViewId}] ✅ SUCCESS | Event: ${eventType}`);
      return { success: true };
    } else {
      const errorText = await response.text();
      console.error(
        `[View ${currentViewId}] ❌ FAILURE | Status: ${response.status}. GA4 Error: ${errorText.substring(
          0,
          60
        )}`
      );
      return { success: false };
    }
  } catch (error) {
    console.error(`[View ${currentViewId}] ⚠️ CRITICAL ERROR: ${error.message}`);
    return { success: false };
  }
}

// ===================================================================
// generateViewPlan()
// ===================================================================
function generateViewPlan(totalViews, pages) {
  const viewPlan = [];
  const totalPercentage = pages.reduce((sum, page) => sum + (page.percent || 0), 0);

  if (totalPercentage < 99.9 || totalPercentage > 100.1) {
    console.error(`❌ Distribution Failed: Total percentage is ${totalPercentage}%.`);
    return [];
  }

  pages.forEach((page) => {
    const viewsForPage = Math.round(totalViews * (page.percent / 100));
    for (let i = 0; i < viewsForPage; i++) {
      if (page.url) viewPlan.push(page.url);
    }
  });

  viewPlan.sort(() => Math.random() - 0.5);
  return viewPlan;
}

// ===================================================================
// 1️⃣ WEBSITE BOOSTER ENDPOINT (/boost-mp)
// ===================================================================
app.post('/boost-mp', async (req, res) => {
  const { ga_id, api_key, views, pages } = req.body;

  if (!ga_id || !api_key || !views || views < 1 || views > 500 || !Array.isArray(pages) || pages.length === 0) {
    return res
      .status(400)
      .json({ status: 'error', message: 'Missing GA keys, Views (1–500), or Page data.' });
  }

  const viewPlan = generateViewPlan(parseInt(views), pages.filter((p) => p.percent > 0));
  if (viewPlan.length === 0) {
    return res
      .status(400)
      .json({ status: 'error', message: 'View distribution failed. Total % must be 100.' });
  }

  res.json({
    status: 'accepted',
    message: `Request for ${viewPlan.length} views accepted. Processing started in the background.`,
  });

  (async () => {
    console.log(`[BOOSTER START] Starting ${viewPlan.length} simulated views...`);
    const viewPromises = viewPlan.map((targetUrl, i) =>
      (async () => {
        const CLIENT_ID = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        const SESSION_ID = Date.now();
        const geo = getRandomGeo();
        const engagementTime = 30000 + Math.floor(Math.random() * 90000);
        const userProps = { geo: { value: `${geo.country}, ${geo.region}` } };

        await new Promise((r) => setTimeout(r, Math.random() * 5000));

        await sendData(
          ga_id,
          api_key,
          { client_id: CLIENT_ID, user_properties: userProps, events: [{ name: 'session_start', params: { session_id: SESSION_ID, _ss: 1 } }] },
          i + 1,
          'session_start'
        );

        const pageViewPayload = {
          client_id: CLIENT_ID,
          user_properties: userProps,
          events: [
            {
              name: 'page_view',
              params: {
                page_location: targetUrl,
                page_title: `PROJECT_PAGE_${i + 1}`,
                session_id: SESSION_ID,
                engagement_time_msec: engagementTime,
              },
            },
          ],
        };

        const pageViewResult = await sendData(ga_id, api_key, pageViewPayload, i + 1, 'page_view');

        await sendData(
          ga_id,
          api_key,
          { client_id: CLIENT_ID, user_properties: userProps, events: [{ name: 'user_engagement', params: { session_id: SESSION_ID, engagement_time_msec: engagementTime } }] },
          i + 1,
          'user_engagement'
        );

        await new Promise((r) => setTimeout(r, getRandomDelay()));
        return pageViewResult.success;
      })()
    );

    Promise.all(viewPromises)
      .then((results) => {
        const successCount = results.filter((r) => r).length;
        console.log(`[BOOSTER FINISH] ✅ Success: ${successCount}/${viewPlan.length}`);
      })
      .catch((err) => {
        console.error(`[BOOSTER ERROR] ${err.message}`);
      });
  })();
});

// ===================================================================
// 2️⃣ AI INSTA CAPTION GENERATOR (/api/caption-generate)
// ===================================================================
app.post('/api/caption-generate', async (req, res) => {
  if (!GEMINI_KEY) return res.status(500).json({ error: 'Server error: Gemini key missing.' });

  const { reelTitle, style } = req.body;
  if (!reelTitle) return res.status(400).json({ error: 'Reel topic (reelTitle) is required.' });

  const prompt = `Generate 10 viral Instagram Reels captions (English + Hindi mix) for: "${reelTitle}".
Style: "${style || 'Catchy and Funny'}".
Each caption must include exactly 5 relevant trending hashtags. Return JSON array: [{ "caption": "..." }].`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'array',
          items: { type: 'object', properties: { caption: { type: 'string' } }, required: ['caption'] },
        },
        temperature: 0.8,
      },
    });

    const captions = JSON.parse(response.text.trim());
    res.status(200).json({ captions });
  } catch (error) {
    console.error('Gemini API Error:', error.message);
    res.status(500).json({ error: `AI Generation Failed: ${error.message}` });
  }
});

// ===================================================================
// 3️⃣ AI INSTA CAPTION EDITOR (/api/caption-edit)
// ===================================================================
app.post('/api/caption-edit', async (req, res) => {
  if (!GEMINI_KEY) return res.status(500).json({ error: 'Server error: Gemini key missing.' });

  const { originalCaption, requestedChange } = req.body;
  if (!originalCaption || !requestedChange)
    return res.status(400).json({ error: 'Both originalCaption and requestedChange are required.' });

  const prompt = `Rewrite the caption below according to the requested change.
Return JSON: { "editedCaption": "..." }

Original: "${originalCaption}"
Change: "${requestedChange}"
Ensure 5 relevant hashtags.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: { editedCaption: { type: 'string' } },
          required: ['editedCaption'],
        },
        temperature: 0.7,
      },
    });

    const result = JSON.parse(response.text.trim());
    res.status(200).json(result);
  } catch (error) {
    console.error('Gemini API Error (Edit):', error.message);
    res.status(500).json({ error: `AI Editing Failed: ${error.message}` });
  }
});

// ===================================================================
// SERVER START
// ===================================================================
app.listen(PORT, () => {
  console.log(`✅ Combined API Server running on port ${PORT}`);
});
