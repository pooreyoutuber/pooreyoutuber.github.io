<?php
// PHP Backend for Rotating Proxy Tool

// CORS headers सेट करें ताकि आपका HTML Frontend इसे एक्सेस कर सके
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

// प्रॉक्सी डिटेल्स को Environment Variables से लें (Render पर उपयोग के लिए)
// अगर Render पर Environment Variables सेट नहीं हैं, तो डिफ़ॉल्ट/टेस्ट मान का उपयोग करें।
$PROXY_DOMAIN = getenv("PROXY_DOMAIN") ?: "p.webshare.io";
$PROXY_PORT = getenv("PROXY_PORT") ?: "80";
$PROXY_USERNAME = getenv("PROXY_USERNAME") ?: "your_webshare_username"; // <- इसे बदलें
$PROXY_PASSWORD = getenv("PROXY_PASSWORD") ?: "your_webshare_password"; // <- इसे बदलें

// केवल POST रिक्वेस्ट को संसाधित करें
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "केवल POST रिक्वेस्ट की अनुमति है।"]);
    exit();
}

// JSON इनपुट प्राप्त करें
$data = json_decode(file_get_contents("php://input"), true);
$url = filter_var($data['url'] ?? '', FILTER_SANITIZE_URL);

if (empty($url)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "URL प्रदान नहीं किया गया है।"]);
    exit();
}

// प्रॉक्सी URL को 'scheme://username:password@domain:port' फॉर्मेट में बनाएं
$proxy = "http://{$PROXY_USERNAME}:{$PROXY_PASSWORD}@{$PROXY_DOMAIN}:{$PROXY_PORT}";

$ch = curl_init();

try {
    // 1. प्रॉक्सी के माध्यम से IP पता प्राप्त करने के लिए रिक्वेस्ट (पुष्टि के लिए)
    $ip_check_url = "https://api.ipify.org?format=json";
    curl_setopt($ch, CURLOPT_URL, $ip_check_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_PROXY, $proxy);
    curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // SSL समस्या से बचने के लिए
    
    $ip_response = curl_exec($ch);
    $ip_info = json_decode($ip_response, true);
    $current_ip = $ip_info['ip'] ?? 'IP प्राप्त नहीं हुआ';

    // 2. प्रॉक्सी के माध्यम से टारगेट URL पर रिक्वेस्ट भेजें
    curl_setopt($ch, CURLOPT_URL, $url);
    $response_content = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        throw new Exception(curl_error($ch));
    }

    // आउटपुट लौटाएं
    echo json_encode([
        "status" => "success",
        "url_status_code" => $http_code,
        "ip_used" => $current_ip,
        "content_preview" => substr(strip_tags($response_content), 0, 500) . "...",
        "message" => "रिक्वेस्ट सफलतापूर्वक प्रॉक्सी IP {$current_ip} का उपयोग करके भेजा गया।"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "रिक्वेस्ट विफल: " . $e->getMessage(),
        "ip_used" => $current_ip
    ]);
} finally {
    curl_close($ch);
}
?>
