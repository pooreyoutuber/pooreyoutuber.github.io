// index.js (Final AI Integrated Version with Hugging Face)

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises'; 
import { fileURLToPath } from 'url';
// Hugging Face API को कॉल करने के लिए 'node-fetch' पैकेज आवश्यक है
import fetch from 'node-fetch'; 

// सुनिश्चित करें कि आपने `package.json` में "type": "module" जोड़ा है।
import ffmpeg from 'fluent-ffmpeg'; 

// Node.js ESM (Module) के लिए __dirname सेट करना
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Render Environment Variables का उपयोग
const HUGGINGFACE_ACCESS_TOKEN = process.env.HUGGINGFACE_ACCESS_TOKEN;
const GEMINI_KEY = process.env.GEMINI_KEY; // वर्तमान में Hugging Face के लिए उपयोग नहीं किया जा रहा है

// --- डायरेक्टरी कॉन्फ़िगरेशन ---
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const PROCESSED_DIR = path.join(__dirname, 'processed');

// --- मिडलवेयर और सेटअप ---
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST'],
}));
app.use(express.json());

// अपलोड स्टोरेज कॉन्फ़िगरेशन
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 30 * 1024 * 1024 } 
});

// आवश्यक डायरेक्टरी बनाना
(async () => {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
        await fs.mkdir(PROCESSED_DIR, { recursive: true });
        console.log("Upload and Processed directories initialized.");
    } catch (err) {
        console.error("Error creating directories:", err);
    }
})();

// --- स्टैटिक फ़ाइलें (Processed videos) ---
app.use('/processed_videos', express.static(PROCESSED_DIR));

// --- 🗑️ फ़ाइल क्लीनअप फ़ंक्शन ---
async function cleanupFiles(filePath, dirPath) {
    try {
        if (filePath) await fs.unlink(filePath).catch(() => {});
        if (dirPath) await fs.rm(dirPath, { recursive: true, force: true }).catch(() => {});
    } catch (e) {
        console.error("Cleanup error:", e.message);
    }
}

// --- 🖼️ Hugging Face AI स्टाइल ट्रांसफर फ़ंक्शन ---
async function applyStyleTransfer(inputPath, outputPath, style, token) {
    // 🛑 नोट: यह एक उदाहरण मॉडल है।
    // वास्तविक स्टाइल ट्रांसफर/Image-to-Image मॉडल Hugging Face पर खोजें।
    // मॉडल आईडी स्टाइल (e.g., ben-10-classic) के आधार पर बदल सकती है।
    const MODEL_ID = "timbrooks/instagan-style-transfer"; 
    const API_URL = `https://api-inference.huggingface.co/models/${MODEL_ID}`;
    
    // इनपुट इमेज को Buffer के रूप में लोड करें
    const imageBuffer = await fs.readFile(inputPath);

    console.log(`Calling Hugging Face API for style: ${style}`);

    const response = await fetch(API_URL, {
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "image/jpeg" 
        },
        method: "POST",
        body: imageBuffer,
    });

    if (!response.ok) {
        // Hugging Face अक्सर 503 error देता है जब मॉडल लोड हो रहा होता है।
        // हमें यह सुनिश्चित करने के लिए प्रतिक्रिया के पाठ को लॉग करना चाहिए कि वास्तविक त्रुटि क्या है।
        const errorText = await response.text();
        throw new Error(`Hugging Face API Error: ${response.status} - ${errorText.substring(0, 100)}...`);
    }

    // आउटपुट में हमें एक नई इमेज (बफ़र के रूप में) मिलती है
    const resultBuffer = await response.buffer();
    
    // नई प्रोसेस्ड इमेज को आउटपुट पाथ पर सहेजें
    await fs.writeFile(outputPath, resultBuffer);
}

// --- ⚙️ मुख्य कन्वर्जन एंडपॉइंट ---
app.post('/anime-convert', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No video file uploaded.' });
    }
    
    // AI इंटीग्रेशन के लिए API टोकन की जाँच करें
    if (!HUGGINGFACE_ACCESS_TOKEN) {
        return res.status(500).json({ 
            message: 'Server Error', 
            error: "HUGGINGFACE_ACCESS_TOKEN environment variable is not set." 
        });
    }

    const videoPath = req.file.path;
    const style = req.body.style || 'ben-10-classic'; 
    
    const jobId = Date.now().toString();
    const tempFramesDir = path.join(__dirname, 'temp_frames', jobId);
    const processedFramesDir = path.join(tempFramesDir, 'processed');
    const outputFileName = `anime-${jobId}-${style}.mp4`;
    const outputPath = path.join(PROCESSED_DIR, outputFileName);
    
    try {
        console.log(`Conversion started for file: ${req.file.originalname} into style: ${style}`);

        // 1. फ्रेम एक्सट्रैक्शन के लिए डायरेक्टरी बनाएँ
        await fs.mkdir(tempFramesDir, { recursive: true });
        await fs.mkdir(processedFramesDir, { recursive: true });

        // --- 1. वीडियो को फ्रेम में तोड़ना (Extract Frames) ---
        await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .outputOptions([
                    '-r 10', // 10 FPS
                    '-q:v 2' // हाई क्वालिटी JPG
                ])
                .save(path.join(tempFramesDir, 'frame-%05d.jpg')) 
                .on('end', () => {
                    console.log('Frame extraction finished.');
                    resolve();
                })
                .on('error', (err) => {
                    reject(new Error('Frame extraction failed: ' + err.message));
                });
        });

        // --- 2. प्रत्येक फ्रेम पर स्टाइल ट्रांसफर लागू करना (REAL AI CONVERSION) ---
        
        const frameFiles = await fs.readdir(tempFramesDir);
        
        const conversionPromises = frameFiles
            .filter(file => file.endsWith('.jpg'))
            .map(async (fileName) => {
                const inputFramePath = path.join(tempFramesDir, fileName);
                const outputFramePath = path.join(processedFramesDir, fileName);
                
                try {
                    // 🚀 REAL AI कॉल: Hugging Face API का उपयोग करें
                    await applyStyleTransfer(
                        inputFramePath, 
                        outputFramePath, 
                        style, 
                        HUGGINGFACE_ACCESS_TOKEN
                    );
                    
                    console.log(`Frame converted (AI Style: ${style}): ${fileName}`);
                } catch (e) {
                    console.error(`AI Conversion failed for ${fileName}: ${e.message}`);
                    // अगर AI फेल हो जाता है, तो मूल फ़ाइल को कॉपी करें ताकि वीडियो टूटे नहीं।
                    await fs.copyFile(inputFramePath, outputFramePath);
                    console.log(`Used original frame as fallback: ${fileName}`);
                }
            });

        // सभी फ़्रेमों के पूरा होने का इंतज़ार करें
        await Promise.all(conversionPromises);
        console.log(`AI style transfer finished. ${conversionPromises.length} frames processed.`);


        // --- 3. फ़्रेम को वापस वीडियो में जोड़ना (Re-assemble Video) ---
        const processedFramesPattern = path.join(processedFramesDir, 'frame-%05d.jpg');

        await new Promise((resolve, reject) => {
            ffmpeg()
                // FFmpeg को क्रमबद्ध इनपुट फ़ाइलें पढ़ने के लिए -i flag का उपयोग करें
                .input(processedFramesPattern)
                .inputOptions([
                    '-framerate 10', 
                ])
                // 🚀 FFmpeg फ़िल्टर
                .videoFilters([
                    // 1. पैडिंग सुनिश्चित करें (even dimensions)
                    'pad=ceil(iw/2)*2:ceil(ih/2)*2', 
                    // 2. yuv420p फ़ॉर्मेट लागू करें (वेब संगतता के लिए अनिवार्य)
                    'format=yuv420p'
                ])
                .outputOptions([
                    '-c:v libx264', 
                    '-preset fast', 
                ])
                .save(outputPath)
                .on('end', () => {
                    console.log('Video re-assembly finished successfully.');
                    resolve();
                })
                .on('error', (err) => {
                    reject(new Error('Video re-assembly failed: ' + err.message));
                });
        });
        
        // --- 4. क्लीनअप और परिणाम भेजें ---
        await cleanupFiles(videoPath, tempFramesDir);
        
        const downloadUrl = `/processed_videos/${outputFileName}`;
        res.json({ 
            message: 'Conversion successful!', 
            downloadUrl: downloadUrl 
        });


    } catch (error) {
        console.error('FATAL CONVERSION ERROR:', error.message);
        // अगर कुछ गलत होता है, तो फ़ाइलों को साफ़ करें और 500 एरर भेजें
        await cleanupFiles(videoPath, tempFramesDir);

        res.status(500).json({ 
            message: 'Conversion failed during processing.', 
            error: error.message 
        });
    }
});

// --- सर्वर शुरू करें ---
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
