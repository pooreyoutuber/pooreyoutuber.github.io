// index.js
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises'; // fs/promises for async file operations
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai'; // Gemini API for potential use

// ffmpeg को वीडियो प्रोसेसिंग के लिए आवश्यक है, यह एक अलग dependency है।
import ffmpeg from 'fluent-ffmpeg';

// Load environment variables (Render automatically loads them, but this is good practice)
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Render Cloud Environment Variables
const GEMINI_KEY = process.env.GEMINI_KEY;
const HUGGINGFACE_ACCESS_TOKEN = process.env.HUGGINGFACE_ACCESS_TOKEN;

// Gemini Client (यदि हम Gemini Vision का उपयोग फ्रेम विश्लेषण के लिए करना चाहते हैं)
// const ai = new GoogleGenAI(GEMINI_KEY);

// Hugging Face Inference API URL (Stable Diffusion Model के लिए)
const HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1"; // एक उदाहरण मॉडल

// --- मिडलवेयर ---
app.use(cors({
    origin: '*', // production में इसे अपने Render domain पर सेट करें
    methods: ['GET', 'POST'],
}));
app.use(express.json());

// अपलोड के लिए स्टोरेज कॉन्फ़िगरेशन
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // सुनिश्चित करें कि 'uploads/' डायरेक्टरी मौजूद है
    },
    filename: (req, file, cb) => {
        // वीडियो का नामकरण (timestamp + original name)
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 30 * 1024 * 1024 } // 30MB Limit
});

// सुनिश्चित करें कि आवश्यक डायरेक्टरी मौजूद हैं
(async () => {
    try {
        await fs.mkdir('uploads', { recursive: true });
        await fs.mkdir('processed', { recursive: true });
        console.log("Upload and Processed directories created.");
    } catch (err) {
        console.error("Error creating directories:", err);
    }
})();

// --- स्टैटिक फ़ाइलें (Processed videos) ---
// यह एक पब्लिक URL प्रदान करेगा जहाँ से उपयोगकर्ता अपनी कनवर्ट की गई वीडियो डाउनलोड कर सकते हैं।
app.use('/processed_videos', express.static(path.join(__dirname, 'processed')));

// --- ⚙️ मुख्य कन्वर्जन एंडपॉइंट ---
app.post('/anime-convert', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No video file uploaded.' });
    }

    const videoPath = req.file.path;
    const style = req.body.style || 'ben-10-classic'; // selected style
    const outputFileName = `anime-${Date.now()}-${style}.mp4`;
    const outputPath = path.join(__dirname, 'processed', outputFileName);
    
    // फ्रेम डायरेक्टरी
    const framesDir = path.join(__dirname, 'temp_frames', Date.now().toString());

    console.log(`Conversion started for file: ${req.file.originalname} into style: ${style}`);
    console.log(`Frames will be saved in: ${framesDir}`);
    
    try {
        // 1. फ्रेम एक्सट्रैक्शन के लिए डायरेक्टरी बनाएँ
        await fs.mkdir(framesDir, { recursive: true });

        // --- 1. वीडियो को फ्रेम में तोड़ना (Extract Frames) ---
        await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .outputOptions([
                    // प्रति सेकंड 10 फ्रेम (FPS) एक्सट्रैक्ट करें ताकि प्रोसेसिंग समय कम हो
                    '-r 10', 
                    // फ़्रेम को JPG फ़ॉर्मेट में सेव करें
                    '-q:v 2'
                ])
                // फ़्रेम को framesDir में frame-%05d.jpg नाम से सेव करें
                .save(path.join(framesDir, 'frame-%05d.jpg')) 
                .on('end', () => {
                    console.log('Frame extraction finished.');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('An error occurred during frame extraction: ' + err.message);
                    reject(err);
                });
        });

        // --- 2. प्रत्येक फ्रेम पर स्टाइल ट्रांसफर लागू करना (Apply Style Transfer) ---
        // **यह वह जटिल भाग है जहाँ AI/Hugging Face का उपयोग होगा।**
        // सुरक्षा और प्रदर्शन कारणों से, हम Hugging Face Inference API का उपयोग करने का सुझाव देते हैं।

        const frameFiles = await fs.readdir(framesDir);
        const processedFramesDir = path.join(framesDir, 'processed');
        await fs.mkdir(processedFramesDir, { recursive: true });
        
        const conversionPromises = frameFiles
            .filter(file => file.endsWith('.jpg'))
            .map(async (fileName) => {
                const inputFramePath = path.join(framesDir, fileName);
                const outputFramePath = path.join(processedFramesDir, fileName);
                
                // **यहाँ Hugging Face API या आपके लोकल Python स्क्रिप्ट को कॉल किया जाएगा**
                // **डेमो के लिए, हम बस फ्रेम को कॉपी कर रहे हैं।** // **असल में, यह इमेज-टू-इमेज स्टाइल ट्रांसफर API कॉल होगी।**

                // यहाँ असली कोड:
                /* await convertFrameWithHuggingFace(inputFramePath, outputFramePath, style); 
                */
                
                // डेमो कोड (सिर्फ कॉपी करना):
                await fs.copyFile(inputFramePath, outputFramePath); 
                console.log(`Frame copied (Simulated conversion): ${fileName}`);
            });

        // सभी फ़्रेमों के रूपांतरित होने तक प्रतीक्षा करें
        await Promise.all(conversionPromises);

        // --- 3. फ़्रेम को वापस वीडियो में जोड़ना (Re-assemble Video) ---
        const processedFramesPattern = path.join(processedFramesDir, 'frame-%05d.jpg');

        await new Promise((resolve, reject) => {
            ffmpeg()
                // इनपुट फ़ाइल पैटर्न को निर्दिष्ट करें
                .input(processedFramesPattern)
                .inputOptions([
                    // इनपुट फ्रेम दर, एक्सट्रैक्शन के समान (10 FPS)
                    '-framerate 10', 
                    // Y-axis पर फ़्रेम को ज़ूम या स्केल किए बिना रखें
                    '-pattern_type glob' 
                ])
                .outputOptions([
                    // आउटपुट फ़ॉर्मेट H.264
                    '-c:v libx264', 
                    // कम विलंबता (low latency) के लिए 
                    '-preset fast', 
                    // पिक्सेल फ़ॉर्मेट
                    '-pix_fmt yuv420p', 
                ])
                .save(outputPath)
                .on('end', () => {
                    console.log('Video re-assembly finished.');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('An error occurred during video re-assembly: ' + err.message);
                    reject(err);
                });
        });
        
        // --- 4. फ़ाइलें साफ़ करें (Cleanup) ---
        await fs.rm(framesDir, { recursive: true, force: true });
        await fs.unlink(videoPath);
        
        console.log(`Conversion complete. Output saved at: ${outputPath}`);

        // --- 5. परिणाम भेजें ---
        const downloadUrl = `/processed_videos/${outputFileName}`;
        res.json({ 
            message: 'Conversion successful!', 
            downloadUrl: downloadUrl // यह URL Render पर आपके स्टैटिक फ़ोल्डर को पॉइंट करेगा
        });


    } catch (error) {
        console.error('Conversion process failed:', error);
        // सुनिश्चित करें कि अगर कुछ गलत होता है तो भी हम अपलोड की गई फ़ाइल को साफ़ करें
        await fs.rm(framesDir, { recursive: true, force: true }).catch(e => console.error("Cleanup failed:", e));
        await fs.unlink(videoPath).catch(e => console.error("Cleanup failed:", e));

        res.status(500).json({ message: 'Internal Server Error during conversion.', error: error.message });
    }
});

// --- सर्वर शुरू करें ---
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});


// --- Hugging Face API कॉल फ़ंक्शन (डेमो के लिए) ---
/*
async function convertFrameWithHuggingFace(inputPath, outputPath, style) {
    // इस फ़ंक्शन में Hugging Face Inference API को कॉल करने के लिए Axios का उपयोग किया जाएगा।
    // यह फ़ंक्शन Base64 एन्कोडिंग/डिकोडिंग और API के साथ इंटरैक्शन को संभालेगा।
    // यह बहुत जटिल हो सकता है और Render Cloud पर चलने के लिए महंगा भी हो सकता है।
    
    // **अत्यधिक सुझाव:** Hugging Face पर एक स्पेस (Space) डिप्लॉय करें और उसका उपयोग करें।
    
    const prompt = `Convert this image into a ${style} anime style. High quality, detailed, trending on Artstation.`;
    const imageBuffer = await fs.readFile(inputPath);

    // यह एक उदाहरण API कॉल है, जिसे विशिष्ट Stable Diffusion Image-to-Image API के लिए अपडेट करना होगा।
    const response = await axios.post(
        HUGGINGFACE_API_URL,
        {
            inputs: prompt,
            image: imageBuffer.toString('base64'), // या सीधे बाइनरी भेजें (API के आधार पर)
        },
        {
            headers: {
                Authorization: `Bearer ${HUGGINGFACE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            responseType: 'arraybuffer'
        }
    );

    // API से प्राप्त परिणामी इमेज को outputPath पर सेव करें
    // await fs.writeFile(outputPath, Buffer.from(response.data)); 
}
*/
