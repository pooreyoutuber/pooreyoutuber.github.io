// ========================================================
// index.js (ULTIMATE FINAL VERSION - Part 1/2)
// ===========================================================
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
// --- Imports (Node.js Modules) ---
const express = require('express');
const nodeFetch = require('node-fetch'); 
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 10000; 
// --- MIDDLEWARE ---
app.use(cors({ origin: '*', methods: ['GET', 'POST'], credentials: true }));
app.use(express.json({ limit: '5mb' }));

app.get('/', (req, res) => {
    res.status(200).send('Tool 7 API Server is running!'); 
});
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
// ===================================================================
// 1. TOOL 
// =============================== 
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
 async function runGscTaskpop(keyword, url, viewNumber) {
     const ADVANCED_DEVICE_PROFILES = [
        // --- PC / DESKTOP ---
    { name: 'Windows PC - Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', view: { width: 1920, height: 1080 }, hw: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630, Direct3D11)' } },
    { name: 'Windows PC - Firefox', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0', view: { width: 1536, height: 864 }, hw: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060, Direct3D11)' } },
    { name: 'Windows PC - Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', view: { width: 1366, height: 768 }, hw: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) HD Graphics 620, Direct3D11)' } },
    { name: 'MacBook Pro - Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', view: { width: 1728, height: 1117 }, hw: { vendor: 'Apple Inc.', renderer: 'Apple M2 Pro' } },
    { name: 'Linux Desktop - Chrome', ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', view: { width: 1600, height: 900 }, hw: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon(TM) Graphics, Direct3D11)' } },
    { name: 'MacBook Air - Chrome', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36', view: { width: 1440, height: 900 }, hw: { vendor: 'Apple Inc.', renderer: 'Apple M1' } },

    // --- NEW DESKTOP PROFILES ---
{ name: 'Windows 11 - Chrome 122', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', view: { width: 2560, height: 1440 }, hw: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070, Direct3D11)' } },
{ name: 'Windows 10 - Opera', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 OPR/107.0.0.0', view: { width: 1280, height: 720 }, hw: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 770, Direct3D11)' } },
{ name: 'Mac Studio - Chrome', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', view: { width: 3840, height: 2160 }, hw: { vendor: 'Apple Inc.', renderer: 'Apple M2 Ultra' } },
{ name: 'Ubuntu Linux - Firefox', ua: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0', view: { width: 1920, height: 1200 }, hw: { vendor: 'Google Inc. (AMD)', renderer: 'AMD Radeon RX 6700 XT' } },
{ name: 'Windows 11 - Brave', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', view: { width: 1680, height: 1050 }, hw: { vendor: 'Google Inc. (Intel)', renderer: 'Intel(R) Iris(R) Xe Graphics' } },
{ name: 'Alienware PC - Chrome', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', view: { width: 1920, height: 1080 }, hw: { vendor: 'NVIDIA', renderer: 'NVIDIA GeForce RTX 4090' } },
{ name: 'MacBook Air M3 - Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15', view: { width: 1512, height: 982 }, hw: { vendor: 'Apple Inc.', renderer: 'Apple M3' } },
{ name: 'Windows PC - Vivaldi', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Vivaldi/6.5.3206.63', view: { width: 1600, height: 1200 }, hw: { vendor: 'Google Inc. (Intel)', renderer: 'Intel HD Graphics 530' } },
{ name: 'Fedora Linux - Chrome', ua: 'Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', view: { width: 1360, height: 768 }, hw: { vendor: 'Google Inc. (Intel)', renderer: 'Mesa Intel(R) UHD Graphics (ADL GT2)' } },
{ name: 'Surface Laptop - Edge', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.2277.128', view: { width: 2256, height: 1504 }, hw: { vendor: 'Google Inc. (Intel)', renderer: 'Intel(R) Iris(R) Plus Graphics' } },
{ name: 'iMac 24 - Safari', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15', view: { width: 4480, height: 2520 }, hw: { vendor: 'Apple Inc.', renderer: 'Apple M1' } },
{ name: 'Windows PC - Slimjet', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36', view: { width: 1152, height: 864 }, hw: { vendor: 'Google Inc. (Intel)', renderer: 'Intel(R) Q45/Q43 Express Chipset' } },
{ name: 'Debian Linux - Firefox', ua: 'Mozilla/5.0 (X11; Debian; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0', view: { width: 1024, height: 768 }, hw: { vendor: 'VMware', renderer: 'SVGA3D; build: RELEASE; LLVM;' } },
{ name: 'MacBook Pro 16 - Chrome', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', view: { width: 1728, height: 1117 }, hw: { vendor: 'Apple Inc.', renderer: 'Apple M3 Max' } },
{ name: 'Custom Gaming PC', ua: 'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', view: { width: 3440, height: 1440 }, hw: { vendor: 'NVIDIA', renderer: 'NVIDIA GeForce RTX 3080' } },
         
    // --- MOBILE ---
    { name: 'iPhone 15 Pro Max', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', view: { width: 430, height: 932 }, hw: { vendor: 'Apple Inc.', renderer: 'Apple GPU' } },
    { name: 'iPhone 14', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1', view: { width: 390, height: 844 }, hw: { vendor: 'Apple Inc.', renderer: 'Apple GPU' } },
    { name: 'Samsung Galaxy S23 Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', view: { width: 384, height: 854 }, hw: { vendor: 'Google Inc. (Qualcomm)', renderer: 'Adreno (TM) 740' } },
    { name: 'Google Pixel 8 Pro', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36', view: { width: 448, height: 998 }, hw: { vendor: 'Google Inc. (Google)', renderer: 'Mali-G715' } },
    { name: 'OnePlus 11', ua: 'Mozilla/5.0 (Linux; Android 13; CPH2447) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36', view: { width: 360, height: 800 }, hw: { vendor: 'Google Inc. (Qualcomm)', renderer: 'Adreno (TM) 730' } },
    { name: 'Xiaomi 13 Pro', ua: 'Mozilla/5.0 (Linux; Android 13; 2210132G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36', view: { width: 393, height: 873 }, hw: { vendor: 'Google Inc. (Qualcomm)', renderer: 'Adreno (TM) 730' } },
    { name: 'Vivo V27', ua: 'Mozilla/5.0 (Linux; Android 13; V2231) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', view: { width: 388, height: 864 }, hw: { vendor: 'Google Inc. (MediaTek)', renderer: 'Mali-G610 MC6' } },
    { name: 'Oppo Reno 10', ua: 'Mozilla/5.0 (Linux; Android 13; CPH2531) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Mobile Safari/537.36', view: { width: 360, height: 800 }, hw: { vendor: 'Google Inc. (MediaTek)', renderer: 'Mali-G68 MC4' } },
    { name: 'Nothing Phone (2)', ua: 'Mozilla/5.0 (Linux; Android 13; A065) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', view: { width: 412, height: 919 }, hw: { vendor: 'Google Inc. (Qualcomm)', renderer: 'Adreno (TM) 730' } },
    { name: 'Motorola Edge 40', ua: 'Mozilla/5.0 (Linux; Android 13; XT2303-2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Mobile Safari/537.36', view: { width: 412, height: 919 }, hw: { vendor: 'Google Inc. (MediaTek)', renderer: 'Mali-G77 MC9' } },
    { name: 'Sony Xperia 1 V', ua: 'Mozilla/5.0 (Linux; Android 13; XQ-DQ72) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36', view: { width: 384, height: 918 }, hw: { vendor: 'Google Inc. (Qualcomm)', renderer: 'Adreno (TM) 740' } },

         // --- NEW MOBILE PROFILES ---
{ name: 'Samsung Galaxy S24 Ultra', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36', view: { width: 384, height: 854 }, hw: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 750' } },
{ name: 'iPhone 15 Plus', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1', view: { width: 428, height: 926 }, hw: { vendor: 'Apple Inc.', renderer: 'Apple GPU' } },
{ name: 'Google Pixel 7a', ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36', view: { width: 412, height: 915 }, hw: { vendor: 'Google', renderer: 'Mali-G710' } },
{ name: 'Xiaomi 14 Pro', ua: 'Mozilla/5.0 (Linux; Android 14; 23116PN5BC) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36', view: { width: 393, height: 873 }, hw: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 750' } },
{ name: 'OnePlus Open', ua: 'Mozilla/5.0 (Linux; Android 13; CPH2551) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36', view: { width: 412, height: 919 }, hw: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' } },
{ name: 'Samsung Galaxy Z Fold 5', ua: 'Mozilla/5.0 (Linux; Android 13; SM-F946B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', view: { width: 373, height: 818 }, hw: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' } },
{ name: 'Motorola Razr 40 Ultra', ua: 'Mozilla/5.0 (Linux; Android 13; XT2321-1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36', view: { width: 412, height: 941 }, hw: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 730' } },
{ name: 'Asus ROG Phone 8', ua: 'Mozilla/5.0 (Linux; Android 14; AI2401) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36', view: { width: 393, height: 852 }, hw: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 750' } },
{ name: 'Realme GT 5', ua: 'Mozilla/5.0 (Linux; Android 13; RMX3820) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Mobile Safari/537.36', view: { width: 393, height: 873 }, hw: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' } },
{ name: 'Vivo X100 Pro', ua: 'Mozilla/5.0 (Linux; Android 14; V2309A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36', view: { width: 393, height: 873 }, hw: { vendor: 'MediaTek', renderer: 'Immortalis-G720 MC12' } },
{ name: 'Poco F5 Pro', ua: 'Mozilla/5.0 (Linux; Android 13; 23013PC75G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Mobile Safari/537.36', view: { width: 393, height: 873 }, hw: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 730' } },
{ name: 'iQOO 12', ua: 'Mozilla/5.0 (Linux; Android 14; V2307A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36', view: { width: 393, height: 873 }, hw: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 750' } },
{ name: 'Honor Magic 6 Pro', ua: 'Mozilla/5.0 (Linux; Android 14; BVL-AN16) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36', view: { width: 393, height: 873 }, hw: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 750' } },
{ name: 'Sony Xperia 5 V', ua: 'Mozilla/5.0 (Linux; Android 13; XQ-DE72) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', view: { width: 360, height: 840 }, hw: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' } },
{ name: 'Huawei Mate 60 Pro', ua: 'Mozilla/5.0 (Linux; Android 12; ALN-AL00) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Mobile Safari/537.36', view: { width: 412, height: 915 }, hw: { vendor: 'Huawei', renderer: 'Maleoon 910' } },
         
    // --- TABLETS ---
    { name: 'iPad Pro 12.9', ua: 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', view: { width: 1024, height: 1366 }, hw: { vendor: 'Apple Inc.', renderer: 'Apple GPU' } },
    { name: 'Samsung Galaxy Tab S9', ua: 'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36', view: { width: 800, height: 1280 }, hw: { vendor: 'Google Inc. (Qualcomm)', renderer: 'Adreno (TM) 740' } },
    { name: 'iPad Air', ua: 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1', view: { width: 820, height: 1180 }, hw: { vendor: 'Apple Inc.', renderer: 'Apple GPU' } },
    { name: 'iPad Mini', ua: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', view: { width: 744, height: 1133 }, hw: { vendor: 'Apple Inc.', renderer: 'Apple GPU' } },
    { name: 'Surface Pro 9', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0', view: { width: 1440, height: 960 }, hw: { vendor: 'Google Inc. (Intel)', renderer: 'Intel(R) Iris(R) Xe Graphics' } },
    { name: 'Amazon Fire HD 10', ua: 'Mozilla/5.0 (Linux; Android 9; KFTRWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/115.0.0.0 like Chrome/115.0.0.0 Safari/537.36', view: { width: 800, height: 1280 }, hw: { vendor: 'Google Inc. (ARM)', renderer: 'Mali-G72 MP3' } },
    { name: 'Huawei MatePad', ua: 'Mozilla/5.0 (Linux; Android 10; BAH3-W09) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.181 Safari/537.36', view: { width: 800, height: 1280 }, hw: { vendor: 'Google Inc. (ARM)', renderer: 'Mali-G51' } },
    { name: 'Lenovo Tab P11', ua: 'Mozilla/5.0 (Linux; Android 11; Lenovo TB-J606F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36', view: { width: 800, height: 1280 }, hw: { vendor: 'Google Inc. (Qualcomm)', renderer: 'Adreno (TM) 610' } },
         // --- NEW TABLET PROFILES ---
{ name: 'iPad Pro 11 M2', ua: 'Mozilla/5.0 (iPad; CPU OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1', view: { width: 834, height: 1194 }, hw: { vendor: 'Apple Inc.', renderer: 'Apple M2' } },
{ name: 'Samsung Galaxy Tab S9 Ultra', ua: 'Mozilla/5.0 (Linux; Android 13; SM-X910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36', view: { width: 1024, height: 1600 }, hw: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' } },
{ name: 'Google Pixel Tablet', ua: 'Mozilla/5.0 (Linux; Android 13; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36', view: { width: 800, height: 1280 }, hw: { vendor: 'Google', renderer: 'Mali-G710' } },
{ name: 'Xiaomi Pad 6 Max', ua: 'Mozilla/5.0 (Linux; Android 13; 2307BRPDCC) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36', view: { width: 1120, height: 1792 }, hw: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 730' } },
{ name: 'Lenovo Tab P12 Pro', ua: 'Mozilla/5.0 (Linux; Android 12; Lenovo TB-Q706F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.97 Safari/537.36', view: { width: 800, height: 1280 }, hw: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 660' } },
{ name: 'Surface Go 3', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', view: { width: 1280, height: 853 }, hw: { vendor: 'Intel', renderer: 'Intel(R) UHD Graphics 615' } },
{ name: 'OnePlus Pad', ua: 'Mozilla/5.0 (Linux; Android 13; OPD2203) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36', view: { width: 900, height: 1350 }, hw: { vendor: 'MediaTek', renderer: 'Mali-G710 MC10' } },
{ name: 'Oppo Pad 2', ua: 'Mozilla/5.0 (Linux; Android 13; OPD2201) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36', view: { width: 900, height: 1350 }, hw: { vendor: 'MediaTek', renderer: 'Mali-G710 MC10' } },
{ name: 'Huawei MatePad Pro 13.2', ua: 'Mozilla/5.0 (Linux; Android 12; PCO-AL00) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.88 Safari/537.36', view: { width: 1120, height: 1792 }, hw: { vendor: 'Huawei', renderer: 'Maleoon 910' } },
{ name: 'Nokia T21', ua: 'Mozilla/5.0 (Linux; Android 12; Nokia T21) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36', view: { width: 800, height: 1200 }, hw: { vendor: 'Unisoc', renderer: 'Mali-G57' } },
{ name: 'Amazon Fire Max 11', ua: 'Mozilla/5.0 (Linux; Android 11; KFSNWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/115.0.0.0 like Chrome/115.0.0.0 Safari/537.36', view: { width: 1200, height: 2000 }, hw: { vendor: 'MediaTek', renderer: 'Mali-G57 MC2' } },
{ name: 'Galaxy Tab A9+', ua: 'Mozilla/5.0 (Linux; Android 13; SM-X210) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36', view: { width: 750, height: 1200 }, hw: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 619' } },
{ name: 'iPad 10th Gen', ua: 'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1', view: { width: 820, height: 1180 }, hw: { vendor: 'Apple Inc.', renderer: 'Apple A14 GPU' } },
{ name: 'Redmi Pad SE', ua: 'Mozilla/5.0 (Linux; Android 13; 23073RPBFG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36', view: { width: 800, height: 1280 }, hw: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 610' } },
{ name: 'Realme Pad 2', ua: 'Mozilla/5.0 (Linux; Android 13; RMP2204) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36', view: { width: 900, height: 1440 }, hw: { vendor: 'MediaTek', renderer: 'Mali-G57 MC2' } }
    
    ];
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();
        // 🔄 PICK RANDOM PROFILE
        const profile = ADVANCED_DEVICE_PROFILES[Math.floor(Math.random() * ADVANCED_DEVICE_PROFILES.length)];
        // SET VIEWPORT & UA
        await page.setViewport(profile.view);
        await page.setUserAgent(profile.ua);

        // 1. STAGE: Google Search Simulation (Organic Entry)
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
        await page.goto(googleUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, randomInt(3000, 6000)));

        // 2. STAGE: Visit Target Site (30-35s Total Stay)
        console.log(`[EARNING-MODE] View #${viewNumber} | URL: ${url} | Staying 35s...`);
        await page.goto(url, { 
            waitUntil: 'networkidle2', 
            timeout: 90000, 
            referer: googleUrl 
        });

        const startTime = Date.now();
        const targetStayTime = randomInt(32000, 52000); 

        // 3. STAGE: Realistic Behavior & Ad-Clicker Loop
        while (Date.now() - startTime < targetStayTime) {
            // Natural Scrolling
            const dist = randomInt(300, 600);
            await page.evaluate((d) => window.scrollBy(0, d), dist);
            
            // Mouse Movement (Bypass Bot Checks)
            await page.mouse.move(randomInt(100, 800), randomInt(100, 600), { steps: 10 });
            await new Promise(r => setTimeout(r, randomInt(3000, 5000)));

            // 🔥 HIGH-VALUE AD CLICKER (18% Probability)
            if (Math.random() < 0.18) { 
                const ads = await page.$$('ins.adsbygoogle, iframe[id^="aswift"], iframe[src*="googleads"]');
                if (ads.length > 0) {
                    const targetAd = ads[Math.floor(Math.random() * ads.length)];
                    const box = await targetAd.boundingBox();

                    if (box && box.width > 50 && box.height > 50) {
                        console.log(`\x1b[42m%s\x1b[0m`, `[AD-CLICK] Target Found! Moving Mouse...`);

                        // 1. New Tab ka wait setup karna (Browser level par)
                        const newTargetPromise = new Promise(resolve => 
                            browser.once('targetcreated', target => resolve(target.page()))
                        );

                        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
                        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                        
                        try {
                            // 2. 2nd Tab (Advertiser Site) par switch karna
                            const adPage = await Promise.race([
                             newTargetPromise,
                            new Promise(res => setTimeout(() => res(null), 12000)) 
                            ]);
                            
                            if (adPage) {
                                console.log(`\x1b[44m%s\x1b[0m`, `[2nd TAB] Ad Site Opened! Starting Movement...`);
                                
                                // Random Scrolling & Movement Loop (15-20 seconds)
                                const adEndTime = Date.now() + randomInt(15000, 20000);
                                while (Date.now() < adEndTime) {
                                    const adScroll = randomInt(200, 500);
                                    await adPage.evaluate((d) => window.scrollBy(0, d), adScroll).catch(() => {});
                                    await adPage.mouse.move(randomInt(100, 600), randomInt(100, 600), { steps: 5 });
                                    
                                    console.log(`[ENGAGEMENT] Scrolling Ad Page...`);
                                    await new Promise(r => setTimeout(r, randomInt(3000, 5000)));
                                }

                                await adPage.close().catch(() => {});
                                console.log(`\x1b[33m%s\x1b[0m`, `[2nd TAB] Ad Page Closed.`);
                            }
                        } catch (adError) {
                            console.log(`\x1b[31m%s\x1b[0m`, `[ERROR] Ad Interaction Failed: ${adError.message}`);
                        }

                        // 3. Wapas Main Site par focus aur 2-3 sec wait
                        await page.bringToFront();
                        console.log(`[FOCUS] Back to Main Site. Waiting 3s before closing...`);
                        
                        const finalWait = randomInt(3000, 6000); 
                        await new Promise(r => setTimeout(r, finalWait)); 
                        console.log(`\x1b[44m%s\x1b[0m`, `[SUCCESS] Ad Click & Engagement Task Complete! ✅`);
                        break; 
                    }
                }
            }
        }
        console.log(`[DONE] View #${viewNumber} Finished Successfully. ✅`);

    } catch (error) {
        console.error(`\x1b[31m%s\x1b[0m`, `[FATAL ERROR] View #${viewNumber}: ${error.message}`);
    } finally {
        if (browser) {
            const pages = await browser.pages();
            for (const p of pages) await p.close().catch(() => {});
            await browser.close().catch(() => {});
        }
    }
 }



// ===================================================================
// Tool 1 Endpoint (Updated for Multi-Site Rotation)
// ===================================================================
app.post('/popup', async (req, res) => {
    try {
        const { keyword, urls, views = 1000 } = req.body;

        // Frontend se 'urls' array aa raha hai, use validate karein
        if (!keyword || !urls || !Array.isArray(urls) || urls.length === 0) {
            console.log("[FAIL] Invalid Request Body");
            return res.status(400).json({ success: false, message: "Keyword and URLs are required!" });
        }

        const totalViews = parseInt(views);

        // Immediate Success Response taaki frontend hang na ho
        res.status(200).json({ 
            success: true, 
            message: `Task Started: ${totalViews} Views Distributing across ${urls.length} sites.` 
        });

        // Background Worker
        (async () => {
            console.log(`--- STARTING MULTI-SITE REVENUE TASK ---`);
            for (let i = 1; i <= totalViews; i++) {
                // Randomly ek URL chunna rotation ke liye
                const randomUrl = urls[Math.floor(Math.random() * urls.length)];
                
                console.log(`[QUEUE] View #${i} | Active URL: ${randomUrl}`);
                await runGscTaskpop(keyword, randomUrl, i); 

                if (i < totalViews) {
                    // RAM management break
                    const restTime = i % 5 === 0 ? 25000 : 12000; 
                    console.log(`[REST] Waiting ${restTime/1000}s...`);
                    await new Promise(r => setTimeout(r, restTime));
                }
            }
            console.log("--- ALL SESSIONS COMPLETED ---");
        })();

    } catch (err) {
        console.error("Endpoint Error:", err);
        if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
    }
});

//==================================================
// --- SERVER START ---
// ===================================================================
app.listen(PORT, () => {
    console.log(` Combined API Server is running on port ${PORT}`);
});
