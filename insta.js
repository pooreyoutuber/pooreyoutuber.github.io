const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config(); 

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// GEMINI_API_KEY environment variable से लिया जाएगा
const ai = new GoogleGenAI({});

// AI से कैप्शन जनरेट करने का फंक्शन
async function generateCaptions(title) {
  const model = "gemini-1.5-flash"; 
  
  // 🔥 प्रॉम्प्ट सुधार: AI को साफ़ निर्देश कि वह कोई नंबर, ऑप्शन, या लिस्ट न बनाए।
  const systemInstruction = "You are a professional social media marketing expert specializing in viral Instagram Reels. Your output must be ready-to-copy captions, including line breaks, relevant emojis, and a dedicated block of trending hashtags. DO NOT use numbering, bullets, 'Option', 'Trending Caption', or any prefix before the captions.";
  
  const userQuery = `
    Generate 10 highly engaging, viral-worthy Instagram/Reels captions for a post about: "${title}".
    
    Each caption must be structured like a real post:
    1. A strong hook line with relevant emojis.
    2. A space/line break.
    3. A block of 10-15 trending and niche-specific hashtags (e.g., #pubg #pubgmobile #reel #trending).
    
    Provide only the 10 final, polished captions, with each caption separated by a new line.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: "user", parts: [{ text: userQuery }] }],
      config: {
        temperature: 0.9 // उच्च रचनात्मकता
      },
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      }
    });

    const resultText = response.text.trim();
    
    // टेक्स्ट को साफ़ करके 10 कैप्शन्स की ऐरे में बदलें
    const captionsArray = resultText.split('\n')
                                     .map(caption => caption.trim())
                                     // AI से आ सकने वाले बचे-खुचे फालतू शब्दों को हटाने के लिए अंतिम सफ़ाई
                                     .map(caption => caption.replace(/^\d+\.\s*/, '').replace(/option\s*\d+\s*:\s*/i, ''))
                                     .filter(caption => caption.length > 30) // सुनिश्चित करें कि सिर्फ़ सार्थक कैप्शन ही पास हों
                                     .slice(0, 10); 

    if (captionsArray.length === 0) {
        // यदि कोई सार्थक कैप्शन नहीं मिला, तो एक साफ़ त्रुटि संदेश भेजें
        return ["AI could not generate clean and meaningful captions. Try a different title or topic."];
    }
    
    return captionsArray;

  } catch (error) {
    console.error("AI Generation Error:", error.message);
    return [`Error: Failed to generate captions. Please check the server logs. (${error.message})`];
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
    res.status(500).json({ error: 'Failed to generate captions due to an internal server error.' });
  }
});

app.get('/', (req, res) => {
  res.send('Caption backend is running with Professional Gemini AI integration.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
