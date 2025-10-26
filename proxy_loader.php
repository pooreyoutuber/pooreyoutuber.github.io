<?php
// PHP Proxy Loader: proxy_loader.php
// यह कोड proxy_loader.php के रूप में सेव करें और अपने HTML के साथ सर्वर पर अपलोड करें।

// ------------------------------------------
// 1. सुरक्षा (CORS) - * की जगह अपनी वेबसाइट का डोमेन डालें
header("Access-Control-Allow-Origin: *"); 
header("Content-Type: text/html; charset=utf-8");
// ------------------------------------------

// 2. URL पैरामीटर्स को कैप्चर करें जो JavaScript से भेजे गए हैं
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; // user:pass

// 3. ज़रूरी पैरामीटर्स की जाँच करें
if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth) {
    http_response_code(400);
    echo "<style>body{background:#fee2e2;color:#991b1b;padding:20px;font-family:sans-serif;} h1{color:#b91c1c;}</style><h1>Configuration Error!</h1><p>Missing required proxy details. Check if your HTML/JS is sending all parameters (target, ip, port, auth).</p>";
    die();
}

// 4. PHP cURL का उपयोग करके प्रॉक्सी के माध्यम से डेटा फेच करें
$ch = curl_init();

// प्रॉक्सी सेटिंग्स
$proxy_address = "$proxy_ip:$proxy_port";

curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
curl_setopt($ch, CURLOPT_HEADER, false); // प्रतिक्रिया हेडर को हटा दें

// --- प्रॉक्सी ऑथेंटिकेशन (सबसे महत्वपूर्ण भाग) ---
curl_setopt($ch, CURLOPT_PROXY, $proxy_address);
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP); 
curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC); // बुनियादी प्रमाणीकरण का उपयोग करें

// ब्राउज़र की तरह दिखने के लिए User-Agent सेट करें
curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");

// सुरक्षा: SSL/HTTPS समर्थन
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); // रीडायरेक्ट को फॉलो करें
curl_setopt($ch, CURLOPT_TIMEOUT, 15); // 15 सेकंड के बाद टाइमआउट

// 5. प्रॉक्सी अनुरोध निष्पादित करें
$proxied_html = curl_exec($ch);
$curl_error = curl_error($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

curl_close($ch);

// 6. आउटपुट और एरर हैंडलिंग
if ($curl_error || $http_code >= 400 || $proxied_html === false) {
    // प्रॉक्सी कनेक्शन या अनुरोध में त्रुटि
    $error_status = $curl_error ?: "HTTP Status Code: $http_code";
    
    http_response_code($http_code ?: 500);
    
    // iFrame में एक साफ एरर संदेश दिखाएं
    echo "<style>body{background:#fee2e2;color:#991b1b;padding:20px;font-family:sans-serif;}</style>";
    echo "<h1>PROXY LOAD FAILED! ❌</h1>";
    echo "<p><strong>Reason:</strong> {$error_status}</p>";
    echo "<p><strong>Proxy Attempted:</strong> {$proxy_address}</p>";
    echo "<p><strong>Possible Fix:</strong> Check if your cURL library is installed, if the proxy is active, and if the username/password in the HTML code is correct.</p>";

} else {
    // सफलता: फेच किए गए HTML को iFrame में भेजें
    echo $proxied_html;
}

?>
