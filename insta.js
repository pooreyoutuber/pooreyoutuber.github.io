const express = require('express');
const cors = require('cors');
// 1. Import the Google Gen AI SDK
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config(); // Use dotenv for secure environment variable loading

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 2. Initialize the Gemini AI client
// It will automatically look for the GEMINI_API_KEY in your environment variables
const ai = new GoogleGenAI({});

// 3. Replace the dummy function with a real AI call
async function generateCaptions(title) {
  const model = "gemini-1.5-flash"; // A fast and powerful model
  
  // Crafting a detailed prompt to get the desired output (10 trending captions)
  const prompt = `
    Generate exactly 10 high-quality, trending, and engaging Instagram/Reels captions for a post with the title: "${title}".
    The captions should be creative, include relevant emojis, and be suitable for a viral post.
    Return only a list of the 10 captions, one per line, with no extra text, numbering, or markdown.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        // Adding instructions to format the output as an array of strings
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: {
            type: "string",
            description: "An engaging social media caption."
          }
        },
        temperature: 0.8 // A higher temperature encourages more creative and diverse captions
      }
    });

    // The response text is a JSON string of a list of captions
    const jsonString = response.text.trim();
    // Parse the JSON string into a JavaScript array
    const captionsArray = JSON.parse(jsonString);

    return captionsArray;

  } catch (error) {
    console.error("AI Generation Error:", error);
    // Return an error message or a fallback array
    return [`Error: Could not generate captions. AI service is down. (${error.message})`];
  }
}

app.post('/generate-captions', async (req, res) => {
  const { title } = req.body;
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  try {
    // 4. Await the asynchronous AI function call
    const captions = await generateCaptions(title.trim()); 
    res.json({ captions });
  } catch (err) {
    // Handle unexpected errors during the AI call
    console.error("Express Error:", err);
    res.status(500).json({ error: 'Failed to generate captions due to an internal server error.' });
  }
});

app.get('/', (req, res) => {
  res.send('Caption backend is running with Gemini AI integration.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
