const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Gemini AI API call function (replace with actual Gemini API details)
async function generateCaptionsFromGemini(title) {
  const prompt = `Generate 10 short, trendy Instagram captions related to "${title}". Make them catchy and suitable for Instagram posts. Return only captions, separated by newline.`;

  const response = await fetch('https://api.gemini.ai/v1/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt,
      max_tokens: 150,
      n: 1,
      stop: null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();

  // Adjust parsing based on Gemini API response format
  const captionsText = data.choices[0].text || '';
  const captions = captionsText.split('\n').map(c => c.trim()).filter(Boolean);

  return captions;
}

app.post('/generate-captions', async (req, res) => {
  const { title } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const captions = await generateCaptionsFromGemini(title.trim());
    res.json({ captions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate captions' });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
