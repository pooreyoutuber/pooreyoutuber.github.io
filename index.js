// index.js (Render पर FFmpeg Static और Hugging Face Client के साथ)

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises'; 
import { fileURLToPath } from 'url';

// 🚀 AI और FFmpeg के लिए आवश्यक इम्पोर्ट
import { InferenceClient } from "@huggingface/inference"; // Hugging Face Client
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static'; // FFmpeg बाइनरी
import ffprobeStatic from 'ffprobe-static'; // FFprobe बाइनरी

// Node.js ESM (Module) के लिए __dirname सेट करना
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- FFmpeg पाथ को कॉन्फ़िगर करें ---
// Render पर Docker के बिना FFmpeg का उपयोग करने के लिए आवश्यक
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic);
console.log("FFmpeg and FFprobe configured.");

// --- ऐप और एनवायरनमेंट सेटअप ---
const app = express();
const port = process.env.PORT || 8080;

// Render Environment Variables का उपयोग
const HUGGINGFACE_ACCESS_TOKEN = process.env.HUGGINGFACE_ACCESS_TOKEN;

// Hugging Face Client को शुरू करें
if (!HUGGINGFACE_ACCESS_TOKEN) {
    console.error("FATAL: HUGGINGFACE_ACCESS_TOKEN environment variable is not set.");
}
const hfClient = new InferenceClient(HUGGINGFACE_ACCESS_TOKEN);


// --- डायरेक्टरी कॉन्फ़िगरेशन ---
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const PROCESSED_DIR = path.join(__dirname, 'processed');

// --- मिडलवेयर और सेटअप ---
app.use(cors({
    origin: '*', // फ्रंटएंड से सभी CORS अनुरोधों की अनुमति देता है
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
    limits: { fileSize: 30 * 1024 * 1024 } // 30 MB लिमिट
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

// --- 🖼️ Hugging Face AI स्टाइल ट्रांसफर फ़ंक्शन (Img2Img) ---
async function applyStyleTransfer(inputPath, outputPath, style) {
    
    const MODEL_ID = "autoweeb/Qwen-Image-Edit-2509-Photo-to-Anime"; 
    
    // 1. इनपुट इमेज को Buffer के रूप में लोड करें
    const inputData = await fs.readFile(inputPath);

    // 2. स्टाइल के आधार पर प्रॉम्प्ट सेट करें
    let promptText = "";
    if (style === 'what-if') {
        promptText = "highly detailed, comic book illustration, cell shading, What If...? animated series style";
    } else if (style === 'ben-10-classic') {
        promptText = "classic Ben 10 cartoon style, thick black outlines, bold primary colors, vector art, 2000s animation";
    } else if (style === 'jujutsu-kaisen') {
        promptText = "anime style, dark shading, high contrast, cinematic, Jujutsu Kaisen anime aesthetic";
    } else {
        promptText = "high quality anime transformation, detailed, clean lines, cinematic lighting";
    }
    
    console.log(`🚀 Sending frame to AI with prompt: "${promptText}"`);

    try {
        // 3. AI कॉल: imageToImage का उपयोग करें
        const resultBlob = await hfClient.imageToImage({
            provider: "wavespeed",
            model: MODEL_ID,
            inputs: inputData, // Buffer as inputs
            parameters: { 
                prompt: promptText, 
                // इस मॉडल के लिए 'image_guidance_scale' जैसे पैरामीटर्स आवश्यक हो सकते हैं।
            },
        });
        
        // 4. Blob को Buffer में बदलें और सहेजें
        const resultBuffer = await resultBlob.arrayBuffer();
        await fs.writeFile(outputPath, Buffer.from(resultBuffer));
        console.log(`✅ Frame processed successfully by ${MODEL_ID}`);
        
    } catch (error) {
        console.error(`🛑 AI API Error for ${path.basename(inputPath)}: ${error.message.substring(0, 150)}...`);
        // Fail होने पर original image को output path पर कॉपी करें (Fallback)
        await fs.copyFile(inputPath, outputPath);
        console.log(`Used original frame as fallback: ${path.basename(inputPath)}`);
    }
}


// --- ⚙️ मुख्य कन्वर्जन एंडपॉइंट ---
app.post('/anime-convert', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No video file uploaded.' });
    }
    
    if (!HUGGINGFACE_ACCESS_TOKEN) {
        return res.status(500).json({ 
            message: 'Server Configuration Error', 
            error: "HUGGINGFACE_ACCESS_TOKEN is not set. Cannot run AI processing." 
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

        await fs.mkdir(tempFramesDir, { recursive: true });
        await fs.mkdir(processedFramesDir, { recursive: true });

        // --- 1. वीडियो को फ्रेम में तोड़ना (Extract Frames @ 10 FPS) ---
        await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .outputOptions([
                    '-r 10', // 10 FPS (10 frames per second)
                    '-q:v 2' 
                ])
                .save(path.join(tempFramesDir, 'frame-%05d.jpg')) 
                .on('end', () => {
                    console.log('Frame extraction finished (10 FPS).');
                    resolve();
                })
                .on('error', (err) => {
                    reject(new Error('Frame extraction failed: ' + err.message));
                });
        });

        // --- 2. प्रत्येक फ्रेम पर स्टाइल ट्रांसफर लागू करना ---
        const frameFiles = (await fs.readdir(tempFramesDir)).filter(file => file.endsWith('.jpg'));
        
        // समानांतर (parallel) प्रोसेसिंग के लिए Promise.all का उपयोग करें
        const conversionPromises = frameFiles.map(async (fileName) => {
            const inputFramePath = path.join(tempFramesDir, fileName);
            const outputFramePath = path.join(processedFramesDir, fileName);
            
            // 🚀 AI कॉल: नया, विश्वसनीय applyStyleTransfer
            await applyStyleTransfer(inputFramePath, outputFramePath, style);
        });

        // सभी फ्रेम के पूरा होने का इंतज़ार करें
        await Promise.all(conversionPromises);
        console.log(`AI style transfer finished. ${conversionPromises.length} frames processed.`);


        // --- 3. फ़्रेम को वापस वीडियो में जोड़ना (Re-assemble Video) ---
        const processedFramesPattern = path.join(processedFramesDir, 'frame-%05d.jpg');

        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(processedFramesPattern)
                .inputOptions([
                    '-framerate 10', // इनपुट फ्रेम दर 10 FPS
                ])
                // FFmpeg वीडियो फ़िल्टर (Format/Padding fixes)
                .videoFilters([
                    'pad=ceil(iw/2)*2:ceil(ih/2)*2', // H.264 संगतता के लिए
                    'format=yuv420p' // QuickTime/Web संगतता के लिए
                ])
                .outputOptions([
                    '-c:v libx264', 
                    '-preset fast', 
                    '-pix_fmt yuv420p',
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
        await cleanupFiles(videoPath, tempFramesDir); // सुनिश्चित करें कि सफाई हो जाए

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
