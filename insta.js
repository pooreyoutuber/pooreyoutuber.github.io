const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Dummy / placeholder for AI integration
function generateCaptions(title) {
  return Array.from({ length: 10 }, (_, i) => `${title} — trending caption ${i + 1}`);
}

app.post('/generate-captions', (req, res) => {
  const { title } = req.body;
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }
  const captions = generateCaptions(title.trim());
  res.json({ captions });
});

app.get('/', (req, res) => {
  res.send('Caption backend is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
