const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// API Key सीधे Render Environment Variables से लिया जाएगा
const ai = new GoogleGenAI({});

// AI से कैप्शन जनरेट करने का फंक्शन
async function generateCaptions(title) {
  const model = "gemini-1.5-flash"; 
  
  // 🔥 प्रॉम्प्ट: AI को कोई नंबर, ऑप्शन, या लिस्ट न बनाने का सख्त निर्देश
  const systemInstruction = "You are a professional social media marketing expert specializing in viral Instagram Reels. Your output must be ready-to-copy captions, including line breaks, relevant emojis, and a dedicated block of trending hashtags. DO NOT use numbering, bullets, 'Option', 'Trending Caption', or any prefix before the captions. Provide ONLY the final post text.";
  
  const userQuery = `
    Generate 10 highly engaging, viral-worthy Instagram/Reels captions for a post about: "${title}".
    
    Each caption must be a full, complete Instagram post (caption + 10-15 trending hashtags).
    
    Provide only the 10 final, polished captions, with each caption separated by two newline characters (to form a list).
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: "user", parts: [{ text: userQuery }] }],
      config: { temperature: 0.9 },
      systemInstruction: { parts: [{ text: systemInstruction }] }
    });

    const resultText = response.text.trim();
    
    // AI से आ सकने वाले फालतू शब्दों को हटाने के लिए अंतिम सफ़ाई
    const captionsArray = resultText.split('\n\n') // दो न्यूलाइन से अलग करना (जैसा प्रॉम्प्ट में कहा गया है)
                                     .map(caption => caption.trim())
                                     .filter(caption => caption.length > 50) // सिर्फ़ सार्थक कैप्शन ही पास हों
                                     .map(caption => caption.replace(/^\s*[\d\.]+\s*-\s*/, '')) // अंतिम सफ़ाई: 1. - हटाओ
                                     .slice(0, 10); 

    if (captionsArray.length === 0) {
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
  console.log(`Server running on port ${PORT}.`);
});
