const express = require('express');
const cors = require('cors');
// Gemini AI SDK
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config(); // Load environment variables locally

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Initialize the Gemini AI client using the API key from environment variables (Render Secrets)
const ai = new GoogleGenAI({});

// Function to generate 10 short, viral Instagram captions with hashtags
async function generateCaptions(title) {
  const model = "gemini-1.5-flash"; 
  
  // A professional and short prompt for viral content
  const prompt = `
    Generate 10 highly engaging and viral Instagram captions for a post about: "${title}".
    
    Each caption must be short (under 20 words), include relevant emojis, 
    and be followed by a strong set of 10 to 15 trending, popular hashtags (e.g., #PUBGMOBILE #Reel #Trending #GamingLife).
    
    Provide only the 10 final captions, with each caption separated by a new line. 
    Do not include any numbering, extra descriptive text, or markdown formatting.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.9, 
      }
    });

    const resultText = response.text.trim();
    
    // Split the text into lines (captions)
    const captionsArray = resultText.split('\n')
                                     .map(caption => caption.trim())
                                     .filter(caption => caption.length > 0)
                                     .slice(0, 10); // Ensure we only take up to 10

    if (captionsArray.length === 0) {
        // Fallback in case AI response format is unexpected
        return ["AI could not generate captions. Try a simpler title."];
    }
    
    return captionsArray;

  } catch (error) {
    console.error("AI Generation Error:", error.message);
    return [`Error: Failed to connect to AI service. (${error.message})`];
  }
}

app.post('/generate-captions', async (req, res) => {
  const { title } = req.body;
  
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  try {
    const captions = await generateCaptions(title.trim()); 
    res.json({ captions });
  } catch (err) {
    console.error("Express Error:", err);
    res.status(500).json({ error: 'Failed to process request due to an internal server error.' });
  }
});

app.get('/', (req, res) => {
  res.send({ status: 'ok', message: 'Instagram Caption AI Backend is running.' });
});

app.listen(PORT, () => {
  console.log(`AI Caption Server running on port ${PORT}.`);
});
