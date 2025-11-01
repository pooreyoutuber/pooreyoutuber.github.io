<?php
// PHP error reporting बंद करें (सुरक्षा और क्लीन आउटपुट के लिए)
error_reporting(0);

// ====================================================
// 🔒 आपकी Webshare प्रॉक्सी क्रेडेंशियल्स 🔒
// ====================================================
// Webshare का Domain/IP
$proxyHost = 'p.webshare.io'; 
// Webshare का पोर्ट
$proxyPort = '80'; 
// Webshare प्रॉक्सी यूज़रनेम (Rotating Pool)
$proxyUsername = 'bqctypvz-rotate'; 
// Webshare प्रॉक्सी पासवर्ड
$proxyPassword = '399xb3kxqv6i'; 
// ====================================================


// यूज़र द्वारा डाला गया URL प्राप्त करें
$targetUrl = isset($_GET['url']) ? $_GET['url'] : '';

if (empty($targetUrl)) {
    // अगर iframe में कोई URL नहीं है, तो खाली रखें
    exit; 
}

// URL को सैनिटाइज करें और 'http://' या 'https://' जोड़ें यदि missing हो
if (substr($targetUrl, 0, 4) !== 'http') {
    $targetUrl = 'http://' . $targetUrl;
}

// cURL initialization
$ch = curl_init();

// cURL ऑप्शन्स सेट करें
curl_setopt($ch, CURLOPT_URL, $targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
curl_setopt($ch, CURLOPT_HEADER, false); 
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); 
curl_setopt($ch, CURLOPT_TIMEOUT, 30); 
// HTTPS साइट्स के लिए SSL verification को बंद करें (टेस्टिंग/कॉलेज प्रोजेक्ट के लिए)
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

// ----------------------------------------------------
// Webshare प्रॉक्सी सेटिंग्स
// ----------------------------------------------------
// प्रॉक्सी IP और पोर्ट सेट करें
curl_setopt($ch, CURLOPT_PROXY, "$proxyHost:$proxyPort");

// प्रॉक्सी Authentication (यूज़रनेम और पासवर्ड) सेट करें
$auth = "$proxyUsername:$proxyPassword";
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $auth);
curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC);
// ----------------------------------------------------

// URL को फेच करें
$response = curl_exec($ch);
$error = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

curl_close($ch);

// त्रुटि की जाँच और आउटपुट
if ($error) {
    echo "<h2 style='color:red;'>❌ प्रॉक्सी कनेक्शन/cURL त्रुटि:</h2>";
    echo "<p>Error: " . htmlspecialchars($error) . "</p>";
    echo "<p><strong>कृपया जाँच करें:</strong> 1. Webshare प्रॉक्सी एक्टिव है। 2. यह कोड XAMPP/वेब सर्वर पर चल रहा है।</p>";
} elseif ($httpCode >= 400) {
    echo "<h2 style='color:orange;'>❌ HTTP त्रुटि $httpCode</h2>";
    echo "<p>वेबसाइट लोड नहीं हो पाई या Webshare ने अनुरोध अस्वीकार कर दिया। (होस्टिंग, या प्रॉक्सी क्रेडेंशियल्स की जाँच करें)</p>";
} else {
    // Geo-location Spoofing:
    // वेबसाइट अब प्रॉक्सी IP के माध्यम से लोड हुई है, और उसका Google Analytics 
    // ट्रैकिंग कोड प्रॉक्सी सर्वर के Geo-location को रिकॉर्ड करेगा।
    
    // कंटेंट को आउटपुट करें (बिना URL Rewriting के)
    echo $response;
}
?>
