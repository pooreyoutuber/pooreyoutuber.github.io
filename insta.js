const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Aap apni Gemini AI integration yahan kar sakte ho
// Filhal dummy captions return kar raha hoon
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
  console.log(`Server started on port ${PORT}`);
});
