<?php
// PHP error reporting बंद करें (सुरक्षा के लिए)
error_reporting(0);

// ====================================================
// ⚠️ अपनी Webshare प्रॉक्सी क्रेडेंशियल्स यहाँ डालें ⚠️
// ====================================================
// Webshare का rotating proxy डोमेन या IP
$proxyHost = 'rotating.webshare.io'; 
// Webshare का पोर्ट (आमतौर पर 80 या 444)
$proxyPort = '80'; 
// Webshare प्रॉक्सी यूज़रनेम
$proxyUsername = 'YOUR_WEBSHARE_USERNAME'; 
// Webshare प्रॉक्सी पासवर्ड
$proxyPassword = 'YOUR_WEBSHARE_PASSWORD'; 
// ====================================================


// यूज़र द्वारा डाला गया URL प्राप्त करें
$targetUrl = isset($_GET['url']) ? $_GET['url'] : '';

if (empty($targetUrl)) {
    // अगर iframe में कोई URL नहीं है, तो खाली रखें
    exit; 
}

// URL को सैनिटाइज (sanitize) करें और 'http://' या 'https://' जोड़ें
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
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // SSL त्रुटियों को नज़रअंदाज़ करने के लिए (टेस्टिंग के लिए)

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
    echo "<p><strong>कृपया जाँच करें:</strong> 1. Webshare क्रेडेंशियल्स सही हैं। 2. आपका Webshare अकाउंट एक्टिव है। 3. आपका सर्वर cURL प्रॉक्सी कनेक्शन की अनुमति देता है।</p>";
} elseif ($httpCode !== 200) {
    echo "<h2 style='color:orange;'>❌ HTTP त्रुटि $httpCode</h2>";
    echo "<p>वेबसाइट लोड नहीं हो पाई या Webshare ने अनुरोध अस्वीकार कर दिया।</p>";
} else {
    // **Geo-location spoofing यहाँ होती है:** // वेबसाइट अब प्रॉक्सी IP के माध्यम से लोड हुई है, और उसका Google Analytics 
    // ट्रैकिंग कोड प्रॉक्सी सर्वर के Geo-location को रिकॉर्ड करेगा।
    
    // PHP प्रॉक्सी का मुख्य सीमांकन (Simplification): 
    // यह कोड केवल पेज का कंटेंट दिखाता है। एक पूर्ण प्रॉक्सी के लिए 
    // URL Rewriting (लिंक्स को बदलना) की आवश्यकता होगी ताकि नेविगेशन 
    // भी प्रॉक्सी के ज़रिए हो।
    
    echo $response;
}
?>
