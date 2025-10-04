const imageUpload = document.getElementById('image-upload');
const canvas = document.getElementById('photo-canvas');
const ctx = canvas.getContext('2d');
let originalImage = new Image();

// Image Upload aur Canvas par Draw
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        originalImage.onload = () => {
            // Canvas size adjust karein
            canvas.width = originalImage.width;
            canvas.height = originalImage.height;
            ctx.filter = 'none'; // Pehle ka filter hata dein
            ctx.drawImage(originalImage, 0, 0); // Original image draw karein
            document.getElementById('status-message').innerText = 'Photo successfuy upload ho gayi. Ab edit karein.';
        };
        originalImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Filter Lagane ki Functionality
function applyFilter(filterCSS) {
    if (!originalImage.src) {
        alert("Pehle photo upload karein.");
        return;
    }
    
    // Canvas ko original image se clear karein
    ctx.filter = 'none';
    ctx.drawImage(originalImage, 0, 0);

    // Naya filter lagayein aur image ko fir se draw karein
    ctx.filter = filterCSS;
    ctx.drawImage(originalImage, 0, 0);
}

// Photo Download Karne ki Functionality
function downloadImage() {
    if (!originalImage.src) {
        alert("Download karne ke liye koi photo nahi hai.");
        return;
    }
    
    // Canvas content ko PNG file mein convert karein
    const dataURL = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = 'pro_edited_photo.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// **AGLA KADAM: PASSPORT SIZE LOGIC**
/*
Passport photo banane ke liye, aapko Cropper.js jaisi library ka istemaal karna chahiye.
Isse aap user ko fixed aspect ratio (jaise 35mm x 45mm ke liye 3.5:4.5) mein crop karne denge.

function applyPassportSize() {
    // 1. Fixed Aspect Ratio Cropper initialize karein (e.g., Cropper.js use karein).
    // 2. User ko face center karne dein.
    // 3. Final Crop ko 300 DPI ke hisaab se 35x45mm (approx 413x531 pixels) mein resize karke naye canvas par draw karein.
    // 4. Background ka colour white ya blue set karein (jo BG Remove ke baad easy ho jayega).
}
*/

// **AGLA KADAM: BACKGROUND REMOVE INTEGRATION**
/*
document.getElementById('remove-bg-btn').addEventListener('click', () => {
    // 1. Photo ko Base64 format mein convert karein.
    const imageDataBase64 = canvas.toDataURL('image/jpeg').split(',')[1];
    
    // 2. Apne AI API endpoint (jaise remove.bg) par POST request bhejain.
    // 3. API Response mein transparent background wali image milegi.
    // 4. Uss image ko canvas par load karein.
});
*/
