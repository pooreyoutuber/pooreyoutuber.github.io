// index.js (Final Stable Version with VideoFilters Fix)

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises'; 
import { fileURLToPath } from 'url';

// सुनिश्चित करें कि आपने `package.json` में "type": "module" जोड़ा है।
import ffmpeg from 'fluent-ffmpeg'; 

// Node.js ESM (Module) के लिए __dirname सेट करना
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Render Environment Variables का उपयोग
// चूंकि key Render में सुरक्षित हैं, हमें यहां dotenv की आवश्यकता नहीं है
const HUGGINGFACE_ACCESS_TOKEN = process.env.HUGGINGFACE_ACCESS_TOKEN;
const GEMINI_KEY = process.env.GEMINI_KEY; 

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


// --- ⚙️ मुख्य कन्वर्जन एंडपॉइंट ---
app.post('/anime-convert', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No video file uploaded.' });
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

        // --- 2. प्रत्येक फ्रेम पर स्टाइल ट्रांसफर लागू करना (Simulated) ---
        // असली AI कन्वर्जन यहाँ होगा।
        
        const frameFiles = await fs.readdir(tempFramesDir);
        
        const conversionPromises = frameFiles
            .filter(file => file.endsWith('.jpg'))
            .map(async (fileName) => {
                const inputFramePath = path.join(tempFramesDir, fileName);
                const outputFramePath = path.join(processedFramesDir, fileName);
                
                // DEMO: केवल कॉपी करें (वास्तविक AI मॉडल कॉल को बदलें)
                await fs.copyFile(inputFramePath, outputFramePath); 
                console.log(`Frame copied (Simulated conversion): ${fileName}`);
            });

        await Promise.all(conversionPromises);
        console.log(`Simulated style transfer finished. ${conversionPromises.length} frames processed.`);

        // --- 3. फ़्रेम को वापस वीडियो में जोड़ना (Re-assemble Video) ---
        const processedFramesPattern = path.join(processedFramesDir, 'frame-%05d.jpg');

        await new Promise((resolve, reject) => {
            ffmpeg()
                // FFmpeg को क्रमबद्ध इनपुट फ़ाइलें पढ़ने के लिए -i flag का उपयोग करें
                .input(processedFramesPattern)
                .inputOptions([
                    '-framerate 10', 
                ])
                // 🚀 मुख्य सुधार: FFmpeg फ़िल्टर को dedicated method में पास करें
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
