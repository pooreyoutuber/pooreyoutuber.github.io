// Environment variables को .env फ़ाइल से लोड करने के लिए (स्थानीय परीक्षण के लिए)
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { InferenceClient } = require("@huggingface/inference");

const app = express();
const port = process.env.PORT || 3000;

// 🔑 एनवायरनमेंट वेरिएबल्स और क्लाइंट सेटअप
const HUGGINGFACE_ACCESS_TOKEN = process.env.HUGGINGFACE_ACCESS_TOKEN;
if (!HUGGINGFACE_ACCESS_TOKEN) {
    console.error("HUGGINGFACE_ACCESS_TOKEN is not set in environment variables.");
}
const inference = new InferenceClient(HUGGINGFACE_ACCESS_TOKEN);

// --- ⚙️ कॉन्फ़िगरेशन ---
const SAMPLE_FPS = 1; // 1 फ़्रेम प्रति सेकंड (आपके "कम स्पीड" अनुरोध को पूरा करने के लिए)
const TEMP_STORAGE = path.join(__dirname, 'temp_storage');
const CONVERTED_STORAGE = path.join(__dirname, 'converted_videos');
const CORS_ORIGIN = '*'; // अपने GitHub Pages URL से बदलें
const HF_ANIME_MODEL = "autoweeb/Qwen-Image-Edit-2509-Photo-to-Anime"; // आपका पसंदीदा मॉडल

// फ़ोल्डर सुनिश्चित करें
if (!fs.existsSync(TEMP_STORAGE)) fs.mkdirSync(TEMP_STORAGE, { recursive: true });
if (!fs.existsSync(CONVERTED_STORAGE)) fs.mkdirSync(CONVERTED_STORAGE, { recursive: true });

// 💾 Multer स्टोरेज सेट करें
// वीडियो फ़ाइल को अस्थायी रूप से सेव करें
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, TEMP_STORAGE); },
    filename: (req, file, cb) => { cb(null, `${Date.now()}-${file.originalname}`); }
});
const upload = multer({ storage: storage });

// CORS और JSON सेट करें
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', CORS_ORIGIN);
    res.header('Access-Control-Allow-Methods', 'GET,POST');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
app.use(express.json());

// 📦 सार्वजनिक रूप से उपलब्ध फ़ाइलों को सर्व करें
// यह एंडपॉइंट आपके फ़्रंटएंड को कनवर्टेड वीडियो डाउनलोड करने की अनुमति देता है
app.use('/static/downloads', express.static(CONVERTED_STORAGE));


// 🤖 Hugging Face इमेज-टू-इमेज फ़ंक्शन (आपके द्वारा प्रदान किए गए क्लाइंट का उपयोग करके)
async function convertImageToAnime(imageBuffer, prompt) {
    // client.imageToImage Blob के बजाय एक Promise<Blob> देता है।
    const imageBlob = await inference.imageToImage({
        // आपका पसंदीदा मॉडल और `wavespeed` प्रोवाइडर
        provider: "wavespeed", 
        model: HF_ANIME_MODEL,
        inputs: imageBuffer,
        parameters: { prompt: prompt },
    });
    
    // Blob को Node.js Buffer में बदलें ताकि उसे फ़ाइल सिस्टम में सेव किया जा सके
    return Buffer.from(await imageBlob.arrayBuffer());
}


// 🛑 मुख्य API एंडपॉइंट
app.post('/anime-convert', upload.single('video'), async (req, res) => {
    const videoFile = req.file;
    const style = req.body.style || 'default';

    if (!videoFile) {
        return res.status(400).json({ message: 'No video file uploaded.' });
    }

    // FFmpeg के लिए इनपुट/आउटपुट पथ सेट करें
    const inputVideoPath = videoFile.path;
    const sessionId = Date.now();
    const tempFramesDir = path.join(TEMP_STORAGE, `frames_${sessionId}`);
    const outputVideoName = `converted_anime_${sessionId}.mp4`;
    const outputVideoPath = path.join(CONVERTED_STORAGE, outputVideoName);

    if (!fs.existsSync(tempFramesDir)) fs.mkdirSync(tempFramesDir);
    
    // प्रॉम्प्ट 'style' पर आधारित
    const prompt_map = {
        "Hayao": "Turn this image into a Studio Ghibli (Hayao Miyazaki style) anime drawing, beautiful and cinematic.",
        "Ben 10 Classic": "Convert this image into a Ben 10 Classic cartoon style drawing with thick black outlines.",
        "Jujutsu Kaisen": "Convert this image into a modern dark-style anime drawing with a strong mood, like Jujutsu Kaisen.",
        "default": "Convert this image into a beautiful anime style drawing."
    };
    const conversion_prompt = prompt_map[style] || prompt_map['default'];

    try {
        console.log(`Starting frame extraction at ${SAMPLE_FPS} FPS. Prompt: ${conversion_prompt}`);

        // 1. वीडियो को फ़्रेम में तोड़ें (FFmpeg)
        await new Promise((resolve, reject) => {
            ffmpeg(inputVideoPath)
                .outputOptions([
                    `-r ${SAMPLE_FPS}`, // 1 FPS पर फ़्रेम एक्सट्रेक्ट करें
                    `-q:v 2`           // अच्छी गुणवत्ता
                ])
                .save(path.join(tempFramesDir, 'frame_%04d.jpg')) // फ़्रेमों को सेव करें
                .on('end', () => { resolve(); })
                .on('error', (err) => { reject(new Error(`FFmpeg Frame Extraction failed: ${err.message}`)); });
        });

        // 2. प्रत्येक फ़्रेम को एनीमे में बदलें (Hugging Face API)
        const frameFiles = fs.readdirSync(tempFramesDir).filter(f => f.startsWith('frame_')).sort();
        
        for (let i = 0; i < frameFiles.length; i++) {
            const originalFramePath = path.join(tempFramesDir, frameFiles[i]);
            const convertedFramePath = path.join(tempFramesDir, `converted_${frameFiles[i]}`);
            
            console.log(`Processing frame ${i + 1}/${frameFiles.length}...`);
            
            const imageBuffer = fs.readFileSync(originalFramePath);
            // Hugging Face API कॉल
            const convertedImageBuffer = await convertImageToAnime(imageBuffer, conversion_prompt);
            
            // बदले हुए फ़्रेम को सेव करें
            fs.writeFileSync(convertedFramePath, convertedImageBuffer);
            
            // पुराने फ़्रेम को हटा दें
            fs.unlinkSync(originalFramePath); 
        }

        // 3. बदले हुए फ़्रेमों को वापस वीडियो में जोड़ें (FFmpeg)
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(path.join(tempFramesDir, 'converted_frame_%04d.jpg')) // इनपुट पैटर्न
                .inputOptions([`-framerate ${SAMPLE_FPS}`]) // वही फ्रेमरेट
                .videoCodec('libx264')
                .outputOptions([
                    '-pix_fmt yuv420p', 
                    '-crf 23',         
                    '-r 25' // आउटपुट वीडियो को 25 FPS पर चलाएं ताकि वह "नॉर्मल" स्पीड में दिखे
                ])
                .save(outputVideoPath)
                .on('end', () => { resolve(); })
                .on('error', (err) => { reject(new Error(`FFmpeg Video Re-assembly failed: ${err.message}`)); });
        });
        
        // 4. सफलता प्रतिक्रिया
        res.json({
            message: "Conversion successful!",
            // फ़्रंटएंड को डाउनलोड लिंक /static/downloads/ एंडपॉइंट से मिलेगा
            downloadUrl: `/static/downloads/${outputVideoName}`, 
        });

    } catch (error) {
        console.error('General Conversion Error:', error.message);
        res.status(500).json({ message: error.message });
    } finally {
        // 🗑️ अस्थायी फ़ाइलें और फ़ोल्डर साफ करें
        if (fs.existsSync(inputVideoPath)) fs.unlinkSync(inputVideoPath);
        if (fs.existsSync(tempFramesDir)) fs.rmSync(tempFramesDir, { recursive: true, force: true });
    }
});


// सर्वर शुरू करें
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
