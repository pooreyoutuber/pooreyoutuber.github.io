<?php
// PHP Proxy Loader: proxy_loader.php
// यह cURL का काम प्रॉक्सी प्रमाणीकरण (Authentication) के साथ करता है।

// ------------------------------------------
// 1. सुरक्षा (CORS) - * की जगह अपनी वेबसाइट का डोमेन डालें
header("Access-Control-Allow-Origin: *"); 
// ------------------------------------------

// 2. URL पैरामीटर्स को कैप्चर करें जो JavaScript से भेजे गए हैं
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; // user:pass

// 3. ज़रूरी पैरामीटर्स की जाँच करें
if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth) {
    http_response_code(400);
    die("Error: Missing required proxy configuration details. Code 400.");
}

// 4. PHP cURL का उपयोग करके प्रॉक्सी के माध्यम से डेटा फेच करें
$ch = curl_init();
$proxy_address = "$proxy_ip:$proxy_port";

curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
curl_setopt($ch, CURLOPT_HEADER, false);

// --- प्रॉक्सी ऑथेंटिकेशन (cURL का असली काम) ---
curl_setopt($ch, CURLOPT_PROXY, $proxy_address);
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP); 
curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC); 

// अन्य सेटिंग्स
curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);

// 5. प्रॉक्सी अनुरोध निष्पादित करें
$proxied_html = curl_exec($ch);
$curl_error = curl_error($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

curl_close($ch);

// 6. आउटपुट और एरर हैंडलिंग
if ($curl_error || $http_code >= 400 || $proxied_html === false) {
    // त्रुटि होने पर, JavaScript को सही HTTP कोड और एरर मैसेज भेजें
    http_response_code($http_code ?: 500);
    echo "PROXY LOAD FAILED! HTTP Status: " . ($http_code ?: "N/A") . " | cURL Error: " . ($curl_error ?: "None") . " | Proxy: " . $proxy_address;
} else {
    // सफलता: स्टेटस कोड 200 OK (डिफ़ॉल्ट)
    echo $proxied_html;
}
?>
