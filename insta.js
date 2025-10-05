const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS enable karna taaki frontend requests aaye bina problem ke
app.use(cors());

// JSON request body ko parse karne ke liye
app.use(express.json());

// Dummy caption generator function (yahan Gemini AI API call kar sakte hain)
function generateCaptions(title) {
  return Array.from({ length: 10 }, (_, i) => `${title} - Best Caption #${i + 1}`);
}

// POST API route: /generate-captions
app.post('/generate-captions', (req, res) => {
  const { title } = req.body;

  // Validation: title hona chahiye
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  // Caption generate karo
  const captions = generateCaptions(title.trim());

  // JSON response bhejo
  res.json({ captions });
});

// Server start karo
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
