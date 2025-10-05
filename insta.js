const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Demo captions generator function (replace with real AI API call)
function generateCaptions(title) {
  // Normally you will call Gemini or OpenAI here with the title
  // For demo, we return 10 dummy captions:
  return Array.from({ length: 10 }, (_, i) => `${title} - Amazing Caption #${i + 1}`);
}

app.post('/generate-captions', (req, res) => {
  const { title } = req.body;
  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required' });
  }

  // Generate captions
  const captions = generateCaptions(title.trim());

  res.json({ captions });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
