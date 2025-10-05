const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.post('/generate-captions', async (req, res) => {
  const { title, style } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const prompt = `Generate 10 short, catchy Instagram captions (under 100 characters) for a video titled: "${title}". Style: ${style || 'trendy & catchy'}. Return the result as a JSON array.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let captions = [];
    try {
      captions = JSON.parse(text);
    } catch {
      captions = text
        .split('\n')
        .map(c => c.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 10);
    }

    res.json({ captions });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// OLD tool's routes here (if any)

// Server listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
