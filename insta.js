const express = require('express');
const cors = require('cors');
// Gemini AI SDK इंपोर्ट करें
const { GoogleGenAI } = require('@google/genai');
// .env फ़ाइल को लोकल डेवलपमेंट के लिए लोड करें (Render इसे खुद से संभालता है)
require('dotenv').config(); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Gemini AI क्लाइंट को इनिशियलाइज़ करें
// यह GEMINI_API_KEY को environment variables से ऑटोमैटिकली ले लेगा।
const ai = new GoogleGenAI({});

// AI से कैप्शन जनरेट करने का फंक्शन
async function generateCaptions(title) {
  const model = "gemini-1.5-flash"; // तेज और शक्तिशाली मॉडल
  
  // 🔥 प्रॉम्प्ट: AI से प्रोफेशनल, ट्रेंडिंग और हैशटैग के साथ कैप्शन माँगने का तरीका।
  const prompt = `
    Generate 10 highly engaging, professional, and viral-worthy Instagram/Reels captions 
    for a post about: "${title}".
    
    Each caption must include:
    1. A catchy hook line.
    2. Relevant and popular **emojis**.
    3. A strong set of **trending and popular hashtags** related to the topic (e.g., #pubg #pubgmobile #reel #trending #gaming).
    
    Provide only the 10 captions, with each caption separated by a new line. Do not include any numbering or extra descriptive text.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        // साधारण टेक्स्ट आउटपुट के लिए responseMimeType को हटा दें।
        temperature: 0.9 // उच्च तापमान से अधिक रचनात्मक और ट्रेंडिंग आउटपुट मिलेगा
      }
    });

    const resultText = response.text.trim();
    
    // टेक्स्ट को लाइनों के आधार पर 10 कैप्शन्स की ऐरे में बदलें
    const captionsArray = resultText.split('\n')
                                     .map(caption => caption.trim())
                                     .filter(caption => caption.length > 0)
                                     .slice(0, 10); // सुनिश्चित करें कि 10 ही हों

    if (captionsArray.length === 0) {
        return ["AI could not generate captions. Try a different title."];
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
    // AI फंक्शन को कॉल करें
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
