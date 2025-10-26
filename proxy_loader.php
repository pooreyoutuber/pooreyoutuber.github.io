<?php
// PHP Proxy Loader: proxy_loader.php

// ------------------------------------------
// 1. सुरक्षा (CORS)
// * की जगह अपनी वेबसाइट का डोमेन (जैसे: https://mytool.com) डालें।
header("Access-Control-Allow-Origin: *"); 
header("Content-Type: text/html; charset=utf-8"); // ब्राउज़र को बताएं कि यह HTML है
// ------------------------------------------

// 2. URL पैरामीटर्स को कैप्चर करें जो JavaScript से भेजे गए हैं
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; // user:pass (e.g., bqctypvz:399xb3kxqv6i)

// 3. ज़रूरी पैरामीटर्स की जाँच करें
if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth) {
    http_response_code(400);
    die("<h1>Error 400</h1><p>Missing required proxy configuration details. Please check your HTML code.</p>");
}

// 4. PHP cURL का उपयोग करके प्रॉक्सी के माध्यम से डेटा फेच करें
$ch = curl_init();

// cURL विकल्पों को सेट करें
curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // आउटपुट को वापस स्ट्रिंग के रूप में दें
curl_setopt($ch, CURLOPT_HEADER, false); // प्रतिक्रिया हेडर को हटा दें

// प्रॉक्सी सेटिंग्स
curl_setopt($ch, CURLOPT_PROXY, "$proxy_ip:$proxy_port");
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); // यूजर:पासवर्ड प्रमाणीकरण
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP); // प्रीमियम प्रॉक्सी आमतौर पर HTTP होते हैं

// ब्राउज़र की तरह दिखने के लिए User-Agent सेट करें
curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");

// सुरक्षा: SSL/HTTPS समर्थन
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); // रीडायरेक्ट को फॉलो करें

// 5. प्रॉक्सी अनुरोध निष्पादित करें
$proxied_html = curl_exec($ch);
$curl_error = curl_error($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

curl_close($ch);

// 6. आउटपुट और एरर हैंडलिंग
if ($curl_error || $http_code >= 400) {
    // प्रॉक्सी कनेक्शन या अनुरोध में त्रुटि (जैसे 404, 407 Proxy Auth Required, 503)
    http_response_code($http_code ?: 500); // अगर कोई HTTP कोड नहीं मिला, तो 500
    
    // iFrame में एक साफ एरर संदेश दिखाएं
    echo "<style>body{background:#fee2e2;color:#991b1b;padding:20px;font-family:sans-serif;} h1{color:#b91c1c;}</style>";
    echo "<h1>PROXY LOAD FAILED!</h1>";
    echo "<p><strong>Status:</strong> HTTP Code $http_code / Error: $curl_error</p>";
    echo "<p>This indicates an issue with the proxy authentication or the target URL being blocked.</p>";

} else {
    // सफलता: फेच किए गए HTML को iFrame में भेजें
    echo $proxied_html;
}

?>
