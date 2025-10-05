const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());            // CORS enable karo
app.use(express.json());    // JSON body parsing

// Dummy captions generator function (yahan Gemini AI call kar sakte ho apni API se)
function generateCaptions(title) {
  return Array.from({ length: 10 }, (_, i) => `${title} - Best Caption #${i + 1}`);
}

app.post('/generate-captions', (req, res) => {
  const { title } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  const captions = generateCaptions(title.trim());

  res.json({ captions });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
