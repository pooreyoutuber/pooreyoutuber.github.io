<?php
// PHP Backend for Rotating Proxy Tool (api.php)

// CORS (Cross-Origin Resource Sharing) Headers
// यह आपके Frontend (index.html) को Backend (Render URL) से बात करने की अनुमति देता है।
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

// ⚠️ Webshare प्रॉक्सी डिटेल्स को Environment Variables से लें ⚠️
// Render पर डिप्लॉय करने के लिए ये सबसे सुरक्षित तरीका है।
// TEST/DEMO के लिए, आप नीचे दिए गए मानों को अपनी Webshare डिटेल्स से बदल सकते हैं।
$PROXY_DOMAIN = getenv("PROXY_DOMAIN") ?: "p.webshare.io";
$PROXY_PORT = getenv("PROXY_PORT") ?: "80";
$PROXY_USERNAME = getenv("PROXY_USERNAME") ?: "YOUR_WEBSHARE_USERNAME"; // 🔴 भरें
$PROXY_PASSWORD = getenv("PROXY_PASSWORD") ?: "YOUR_WEBSHARE_PASSWORD"; // 🔴 भरें

// केवल POST रिक्वेस्ट को संसाधित करें
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "केवल POST रिक्वेस्ट की अनुमति है।"]);
    exit();
}

// JSON इनपुट प्राप्त करें
$input = file_get_contents("php://input");
$data = json_decode($input, true);
$url = filter_var($data['url'] ?? '', FILTER_SANITIZE_URL);

if (empty($url)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "URL प्रदान नहीं किया गया है।"]);
    exit();
}

// प्रॉक्सी URL को 'scheme://username:password@domain:port' फॉर्मेट में बनाएं
$proxy = "http://{$PROXY_USERNAME}:{$PROXY_PASSWORD}@{$PROXY_DOMAIN}:{$PROXY_PORT}";

$ch = curl_init();
$current_ip = 'N/A';
$http_code = 'N/A';
$response_content = '';

try {
    // 1. **IP पता प्राप्त करने के लिए रिक्वेस्ट**: यह पुष्टि करता है कि प्रॉक्सी काम कर रहा है और IP क्या है।
    $ip_check_url = "https://api.ipify.org?format=json";
    curl_setopt($ch, CURLOPT_URL, $ip_check_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_PROXY, $proxy);
    curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
    
    $ip_response = curl_exec($ch);
    if (curl_errno($ch)) {
        throw new Exception("IP चेक विफल: " . curl_error($ch));
    }
    $ip_info = json_decode($ip_response, true);
    $current_ip = $ip_info['ip'] ?? 'IP प्राप्त नहीं हुआ';
    
    // 2. **टारगेट URL पर रिक्वेस्ट भेजें**
    curl_setopt($ch, CURLOPT_URL, $url);
    $response_content = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        throw new Exception("URL रिक्वेस्ट विफल: " . curl_error($ch));
    }

    // आउटपुट लौटाएं
    echo json_encode([
        "status" => "success",
        "url_status_code" => $http_code,
        "ip_used" => $current_ip,
        // HTML टैग्स हटाकर कंटेंट का पहला 500 कैरेक्टर दिखाएं
        "content_preview" => substr(strip_tags($response_content), 0, 500) . "...", 
        "message" => "रिक्वेस्ट सफलतापूर्वक प्रॉक्सी IP {$current_ip} का उपयोग करके भेजा गया।"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "रिक्वेस्ट विफल: " . $e->getMessage(),
        "ip_used" => $current_ip,
        "url_status_code" => $http_code
    ]);
} finally {
    curl_close($ch);
}
?>
