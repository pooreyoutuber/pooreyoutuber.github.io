// index.js (Modified for @huggingface/inference SDK)

const express = require('express');
const multer = require('multer');
const fs = require('fs/promises');
const path = require('path');
const fsExtra = require('fs-extra'); // Cleanup के लिए

// Hugging Face SDK
const { InferenceClient } = require('@huggingface/inference');

// FFmpeg को कॉन्फ़िगर करें
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegStatic);

const app = express();
const PORT = process.env.PORT || 3000;

// Hugging Face क्लाइंट: HF_TOKEN पर्यावरण वेरिएबल से स्वचालित रूप से टोकन लेगा
const client = new InferenceClient(process.env.HUGGINGFACE_ACCESS_TOKEN); 
// या process.env.HF_TOKEN, जैसा कि आपके उदाहरण में है। सुनिश्चित करें कि Render पर यह सेट हो।

const HF_MODEL = "autoweeb/Qwen-Image-Edit-2509-Photo-to-Anime";

// अस्थायी फ़ाइल स्टोरेज सेटअप
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Hugging Face SDK का उपयोग करके इमेज रूपांतरण ---
async function convertFrameToAnime(imageBuffer, stylePrompt) {
    try {
        // SDK का उपयोग करके इमेज को सीधे Hugging Face API पर भेजें
        const imageBlob = await client.imageToImage({
            provider: "wavespeed", // यदि यह आवश्यक हो
            model: HF_MODEL,
            inputs: imageBuffer,
            parameters: {
                prompt: stylePrompt,
            },
        });
        
        // Blob को Node.js Buffer में बदलें
        return Buffer.from(await imageBlob.arrayBuffer()); 
        
    } catch (error) {
        console.error("Hugging Face SDK Error:", error);
        throw new Error(`Failed to convert frame: ${error.message}`);
    }
}


// --- मुख्य API एंडपॉइंट ---
app.post('/anime-convert', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No video file uploaded." });
    }

    const videoFile = req.file;
    // 'style' इनपुट को एक प्रॉम्प्ट में बदलें जो मॉडल को एनीमे स्टाइल लागू करने के लिए मार्गदर्शन करे।
    const rawStyle = req.body.style || 'ben-10-classic'; 
    const stylePrompt = `Convert this photo to ${rawStyle} anime style, highly detailed.`;
    
    const jobId = Date.now();
    const tempDir = path.join(__dirname, 'temp', String(jobId));

    try {
        await fs.mkdir(tempDir, { recursive: true });
        const inputVideoPath = path.join(tempDir, 'input.mp4');
        const processedFramesDir = path.join(tempDir, 'processed_frames');
        await fs.mkdir(processedFramesDir);

        // 1. इनपुट वीडियो को डिस्क पर सहेजें
        await fs.writeFile(inputVideoPath, videoFile.buffer);

        // --- 2. वीडियो को फ़्रेम में तोड़ें (Extraction) ---
        const frameRate = 15; // 15 FPS पर प्रोसेस करें
        const extractedFramesPattern = path.join(tempDir, 'frame-%05d.jpg'); // 5-digit indexing
        
        await new Promise((resolve, reject) => {
            ffmpeg(inputVideoPath)
                .outputOptions([
                    `-r ${frameRate}`,
                    `-q:v 2`,
                    `-an` // ऑडियो स्ट्रीम हटाएँ, इसे बाद में वापस जोड़ा जाएगा
                ])
                .save(extractedFramesPattern)
                .on('end', () => resolve())
                .on('error', (err) => reject(new Error('FFmpeg frame extraction failed: ' + err.message)));
        });

        // --- 3. प्रत्येक फ़्रेम को एनीमे में परिवर्तित करें (Inference) ---
        const frameFiles = (await fs.readdir(tempDir)).filter(f => f.endsWith('.jpg')).sort();
        
        // 

        for (const filename of frameFiles) {
            const framePath = path.join(tempDir, filename);
            const frameBuffer = await fs.readFile(framePath);

            // SDK कॉल
            const animeFrameBuffer = await convertFrameToAnime(frameBuffer, stylePrompt);

            // परिवर्तित फ़्रेम को सहेजें
            await fs.writeFile(path.join(processedFramesDir, filename), animeFrameBuffer);
            await fs.unlink(framePath); // मूल फ़्रेम हटाएँ
        }

        // --- 4. संसाधित फ़्रेमों को वापस वीडियो में जोड़ें (Recombination) ---
        const processedFramesPattern = path.join(processedFramesDir, 'frame-%05d.jpg');
        const finalOutputVideoPath = path.join(__dirname, 'converted', `anime-${jobId}.mp4`);
        await fs.mkdir(path.join(__dirname, 'converted'), { recursive: true });

        await new Promise((resolve, reject) => {
            ffmpeg(processedFramesPattern)
                .inputOptions([
                    `-framerate ${frameRate}`,
                ])
                .outputOptions([
                    '-c:v libx264',
                    '-pix_fmt yuv420p',
                    // यदि आप ऑडियो चाहते हैं, तो आपको इसे पहले एक अलग स्ट्रीम में निकालना होगा और यहां जोड़ना होगा।
                ])
                .save(finalOutputVideoPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(new Error('FFmpeg video recombination failed: ' + err.message)));
        });

        // --- 5. अस्थायी फ़ाइलें हटाएँ (Cleanup) ---
        await fsExtra.remove(tempDir);

        // 6. फ्रंटएंड को प्रतिक्रिया भेजें
        const downloadUrl = `/converted/anime-${jobId}.mp4`;
        res.json({ success: true, downloadUrl: downloadUrl });

    } catch (error) {
        console.error("Conversion Pipeline Error:", error.message);
        // Clean up even on error
        await fsExtra.remove(tempDir).catch(() => {});
        res.status(500).json({ 
            message: "Video conversion failed. Check server logs for details.", 
            error: error.message 
        });
    }
});

// --- स्टैटिक फ़ाइलें (डाउनलोड के लिए) ---
app.use('/converted', express.static(path.join(__dirname, 'converted')));

// --- सर्वर शुरू करें ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
