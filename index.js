// index.js (आपका Render बैकएंड सर्वर)

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises'); // Promises-based fs
const { spawn } = require('child_process'); // FFMPEG और अन्य कमांड चलाने के लिए
const fetch = require('node-fetch'); // Hugging Face API कॉल के लिए

// --- 1. कॉन्फ़िगरेशन और पर्यावरण चर (Render से सटीक नाम) ---
const app = express();
const PORT = process.env.PORT || 3000;

// Render Environment Variables से एक्सेस करें
const HF_ACCESS_TOKEN = process.env.HUGGINGFACE_ACCESS_TOKEN; 

// एक मानक Anime Style Transfer Model Endpoint का उपयोग करें
const HF_MODEL_ENDPOINT = 'https://api-inference.huggingface.co/models/p-wang/cartoon-style-transfer'; 

// --- 2. मिडलवेयर और फ़ोल्डर सेटअप ---

// CORS कॉन्फ़िगरेशन
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://pooreyoutuber.github.io'); 
    res.header('Access-Control-Allow-Methods', 'POST, GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// 💡 ENOTDIR त्रुटि को ठीक करने के लिए: Render पर सुरक्षित और लिखने योग्य /tmp फ़ोल्डर का उपयोग करें
const TEMP_DIR = path.join('/tmp', 'anime-converter-temp');
const CONVERTED_DIR = path.join('/tmp', 'anime-converter-output');

async function setupDirectories() {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await fs.mkdir(CONVERTED_DIR, { recursive: true });
}
setupDirectories();

// Multer स्टोरेज: इनपुट फ़ाइल को 'temp' में सहेजें
const upload = multer({
    dest: TEMP_DIR,
    limits: { fileSize: 30 * 1024 * 1024 },
});

// --- 3. हेल्पर फ़ंक्शंस ---

/** FFMPEG कमांड को चलाने के लिए एक Promise-आधारित फ़ंक्शन */
function runFFmpeg(args) {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', args);
        let errorOutput = '';
        
        // FFMPEG आउटपुट को कैप्चर करें
        ffmpeg.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                console.error("FFMPEG Error Details:", errorOutput);
                reject(new Error(`FFMPEG process exited with code ${code}. Please ensure FFMPEG is installed on Render.`));
            }
        });
        
        ffmpeg.on('error', (err) => {
             // अक्सर ENOENT (File not found) आता है अगर FFMPEG इंस्टॉल नहीं है
            reject(new Error(`FFMPEG spawn failed. Is FFMPEG installed? Error: ${err.message}`));
        });
    });
}

/** Hugging Face API को एक इमेज भेजकर स्टाइल लागू करना */
async function applyStyleToFrame(inputPath, outputPath, style) {
    // अगर Token missing है, तो डमी कन्वर्ज़न करें
    if (!HF_ACCESS_TOKEN) {
        await fs.copyFile(inputPath, outputPath);
        await new Promise(resolve => setTimeout(resolve, 50)); 
        return;
    }

    try {
        const imageBuffer = await fs.readFile(inputPath);

        const response = await fetch(HF_MODEL_ENDPOINT, {
            headers: { Authorization: `Bearer ${HF_ACCESS_TOKEN}` },
            method: "POST",
            body: imageBuffer, // इमेज बाइनरी भेजें
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HF API failed (${response.status}): ${errorText.substring(0, 100)}`);
        }

        const resultImageBuffer = await response.buffer();
        await fs.writeFile(outputPath, resultImageBuffer);
        
    } catch (error) {
        console.error(`Error processing frame ${path.basename(inputPath)}: ${error.message}`);
        // अगर API विफल हो जाता है, तो मूल फ्रेम को कॉपी करें
        await fs.copyFile(inputPath, outputPath); 
    }
}

/** अस्थायी फ़ाइल/फ़ोल्डर हटाएँ */
async function cleanUp(targetPath) {
    try {
        const stats = await fs.stat(targetPath);
        if (stats.isDirectory()) {
            await fs.rm(targetPath, { recursive: true, force: true });
        } else {
            await fs.unlink(targetPath);
        }
    } catch (e) {
        // फ़ाइल पहले से मौजूद नहीं है, ठीक है
    }
}


// --- 4. मुख्य कन्वर्ज़न रूट: /anime-convert ---

app.post('/anime-convert', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No video file uploaded." });
    }
    
    // इनपुट
    const { style } = req.body;
    const inputFilePath = req.file.path;
    const sessionId = path.basename(inputFilePath); 
    
    // अस्थायी फ़ोल्डर्स
    const sessionDir = path.join(TEMP_DIR, sessionId);
    const frameInputPath = path.join(sessionDir, 'input_frames');
    const frameOutputPath = path.join(sessionDir, 'output_frames');
    
    // आउटपुट फ़ाइल
    const outputFileName = `converted_${sessionId}_${style}.mp4`;
    const outputFilePath = path.join(CONVERTED_DIR, outputFileName);

    console.log(`[START] Session: ${sessionId}, Style: ${style}`);

    try {
        await fs.mkdir(frameInputPath, { recursive: true });
        await fs.mkdir(frameOutputPath, { recursive: true });

        // A. वीडियो को फ़्रेम में तोड़ना (5 FPS पर)
        console.log(`[STEP 1/4] Extracting frames...`);
        const frameExtractionArgs = [
            '-i', inputFilePath,
            '-vf', 'fps=5', // 5 FPS
            path.join(frameInputPath, '%05d.png')
        ];
        await runFFmpeg(frameExtractionArgs); 

        // B. प्रत्येक फ्रेम पर स्टाइल लागू करना
        console.log(`[STEP 2/4] Applying style to frames...`);
        const frames = await fs.readdir(frameInputPath);
        const processingPromises = frames.map(frameName => {
            const inputFrame = path.join(frameInputPath, frameName);
            const outputFrame = path.join(frameOutputPath, frameName);
            return applyStyleToFrame(inputFrame, outputFrame, style);
        });
        
        await Promise.all(processingPromises);

        // C. फ्रेम्स को वापस वीडियो में जोड़ना
        console.log(`[STEP 3/4] Recompiling video...`);
        const recompileArgs = [
            '-framerate', '5', 
            '-i', path.join(frameOutputPath, '%05d.png'),
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-y', 
            outputFilePath
        ];
        await runFFmpeg(recompileArgs); 

        // D. क्लीनअप और प्रतिक्रिया
        await cleanUp(inputFilePath); 
        await cleanUp(sessionDir); 

        const downloadUrl = `/download/${outputFileName}`;

        console.log(`[SUCCESS] Conversion complete. URL: ${downloadUrl}`);
        res.status(200).json({
            message: "Conversion successful!",
            downloadUrl: downloadUrl
        });

    } catch (error) {
        console.error(`[FAILURE] Global Error:`, error.message);
        
        // आपातकालीन क्लीनअप
        await cleanUp(inputFilePath); 
        await cleanUp(sessionDir);
        await cleanUp(outputFilePath); 

        return res.status(500).json({ message: "Conversion failed. Please check server logs for FFMPEG/API errors." });
    }
});


// --- 5. डाउनलोड रूट: /download/:filename ---

app.get('/download/:filename', (req, res) => {
    const fileName = req.params.filename;
    const filePath = path.join(CONVERTED_DIR, fileName);

    res.download(filePath, fileName, async (err) => {
        if (err) {
            console.error(`Download Error for ${fileName}:`, err.message);
            if (!res.headersSent) {
                res.status(404).json({ message: "File not found or download failed." });
            }
        } else {
            console.log(`[DOWNLOADED] ${fileName}. Deleting...`);
            // फ़ाइल डाउनलोड होने के बाद उसे हटा दें
            await cleanUp(filePath); 
        }
    });
});


// --- 6. सर्वर शुरू करना ---

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    if (!HF_ACCESS_TOKEN) {
        console.warn("!!! WARNING: HUGGINGFACE_ACCESS_TOKEN is missing. Using DUMMY conversion !!!");
    }
});
