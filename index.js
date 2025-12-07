// index.js (आपका बैकएंड सर्वर)

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises'); // Promises-based fs for async operations
const { spawn } = require('child_process'); // To run FFMPEG
const fetch = require('node-fetch'); // For making API calls to Hugging Face

// --- 1. कॉन्फ़िगरेशन और पर्यावरण चर ---
const app = express();
const PORT = process.env.PORT || 3000;
const HUGGING_FACE_TOKEN = process.env.HUGGING_FACE_TOKEN;
// आपको Hugging Face पर एक Style Transfer मॉडल endpoint चुनना होगा
// उदाहरण:
const HF_MODEL_ENDPOINT = 'https://api-inference.huggingface.co/models/YourOrg/your-style-transfer-model'; 

// --- 2. मिडलवेयर सेटअप ---

// CORS कॉन्फ़िगरेशन:
app.use((req, res, next) => {
    // इसे अपने फ़्रंटएंड URL से बदलें
    res.header('Access-Control-Allow-Origin', 'https://pooreyoutuber.github.io'); 
    res.header('Access-Control-Allow-Methods', 'POST, GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// फ़ोल्डर जहाँ हम अस्थायी फ़ाइलें सहेजेंगे
const TEMP_DIR = path.join(__dirname, 'temp');
const CONVERTED_DIR = path.join(__dirname, 'converted');

// सुनिश्चित करें कि फ़ोल्डर मौजूद हैं
async function setupDirectories() {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await fs.mkdir(CONVERTED_DIR, { recursive: true });
}
setupDirectories();

// Multer स्टोरेज: इनपुट फ़ाइल को 'temp' में सहेजें
const upload = multer({
    dest: TEMP_DIR,
    limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
});

// --- 3. हेल्पर फ़ंक्शंस ---

/** FFMPEG कमांड को चलाने के लिए एक Promise-आधारित फ़ंक्शन */
function runFFmpeg(args) {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', args);

        ffmpeg.stderr.on('data', (data) => {
            // FFMPEG आउटपुट आमतौर पर stderr पर आता है
            console.log(`FFMPEG: ${data}`);
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`FFMPEG process exited with code ${code}`));
            }
        });
    });
}

/** Hugging Face API को एक इमेज भेजने और स्टाइल ट्रांसफर करने के लिए */
async function applyStyleToFrame(inputPath, outputPath) {
    if (!HUGGING_FACE_TOKEN || !HF_MODEL_ENDPOINT.includes('your-style-transfer-model')) {
        // अगर API key नहीं है या endpoint default है, तो डमी इमेज कॉपी करें
        await fs.copyFile(inputPath, outputPath);
        console.warn("Using DUMMY CONVERSION: API keys missing or endpoint not set.");
        return;
    }

    try {
        const imageBuffer = await fs.readFile(inputPath);

        const response = await fetch(HF_MODEL_ENDPOINT, {
            headers: { Authorization: `Bearer ${HUGGING_FACE_TOKEN}` },
            method: "POST",
            body: imageBuffer,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HF API failed: ${response.status} - ${errorText.substring(0, 100)}`);
        }

        // प्रतिक्रिया एक नई इमेज बाइनरी होनी चाहिए
        const resultImageBuffer = await response.buffer();
        await fs.writeFile(outputPath, resultImageBuffer);
        
    } catch (error) {
        console.error(`Error processing frame ${inputPath}:`, error.message);
        // अगर API विफल हो जाता है, तो मूल फ्रेम को कॉपी करें ताकि वीडियो टूटे नहीं
        await fs.copyFile(inputPath, outputPath); 
    }
}

/** अस्थायी फ़ोल्डर और उसकी सामग्री हटाएँ */
async function cleanUp(folderPath) {
    try {
        await fs.rm(folderPath, { recursive: true, force: true });
    } catch (e) {
        console.error(`Cleanup failed for ${folderPath}:`, e.message);
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
    const sessionId = path.basename(inputFilePath); // Multer द्वारा दिए गए unique नाम का उपयोग करें
    
    // अस्थायी फ़ोल्डर्स
    const sessionDir = path.join(TEMP_DIR, sessionId);
    const frameInputPath = path.join(sessionDir, 'input_frames');
    const frameOutputPath = path.join(sessionDir, 'output_frames');
    
    // आउटपुट फ़ाइल
    const outputFileName = `converted_${sessionId}_${style}.mp4`;
    const outputFilePath = path.join(CONVERTED_DIR, outputFileName);

    console.log(`[START] Processing session: ${sessionId} with style: ${style}`);

    try {
        await fs.mkdir(frameInputPath, { recursive: true });
        await fs.mkdir(frameOutputPath, { recursive: true });

        // A. वीडियो को फ़्रेम में तोड़ना (5 FPS पर)
        console.log(`[STEP 1/4] Extracting frames...`);
        const frameExtractionArgs = [
            '-i', inputFilePath,
            '-vf', 'fps=5', // 5 FPS (धीमी प्रोसेसिंग के लिए 10 या 15 का उपयोग करें)
            path.join(frameInputPath, '%05d.png')
        ];
        await runFFmpeg(frameExtractionArgs); 

        // B. प्रत्येक फ्रेम पर स्टाइल लागू करना
        console.log(`[STEP 2/4] Applying style to frames...`);
        const frames = await fs.readdir(frameInputPath);
        const processingPromises = frames.map(frameName => {
            const inputFrame = path.join(frameInputPath, frameName);
            const outputFrame = path.join(frameOutputPath, frameName);
            return applyStyleToFrame(inputFrame, outputFrame);
        });
        
        // सभी फ्रेम्स को एक साथ प्रोसेस करें (Concurrent processing)
        await Promise.all(processingPromises);

        // C. फ्रेम्स को वापस वीडियो में जोड़ना
        console.log(`[STEP 3/4] Recompiling video...`);
        const recompileArgs = [
            '-framerate', '5', 
            '-i', path.join(frameOutputPath, '%05d.png'),
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-y', // Overwrite output file
            outputFilePath
        ];
        await runFFmpeg(recompileArgs); 

        // D. क्लीनअप और प्रतिक्रिया
        await cleanUp(inputFilePath); // अपलोड की गई फ़ाइल
        await cleanUp(sessionDir); // अस्थायी फ्रेम्स फ़ोल्डर

        const downloadUrl = `/download/${outputFileName}`;

        console.log(`[SUCCESS] Conversion complete. URL: ${downloadUrl}`);
        res.status(200).json({
            message: "Conversion successful!",
            downloadUrl: downloadUrl
        });

    } catch (error) {
        console.error(`[FAILURE] Global Error in session ${sessionId}:`, error.message);
        
        // आपातकालीन क्लीनअप
        await cleanUp(inputFilePath); 
        await cleanUp(sessionDir);

        return res.status(500).json({ message: error.message || "An unexpected server error occurred during conversion." });
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
    if (!HUGGING_FACE_TOKEN) {
        console.warn("!!! WARNING: HUGGING_FACE_TOKEN is missing. Using DUMMY conversion !!!");
    }
});
