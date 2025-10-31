<?php
// PHP Proxy Loader: proxy_loader.php - FINAL CODE (Rotating Residential Proxy FIX)

// --- CRITICAL AUTHENTICATION DATA (UPDATED FOR ROTATING PROXY) ---
// Note: Username has been updated to match the rotating proxy format.
$auth_user = "bqctypvz-rotate";
$auth_pass = "399xb3kxqv6i";
$expected_auth = $auth_user . ":" . $auth_pass;

// 1. NON-BLOCKING EXECUTION (No Change)
header("Connection: close");
header("Content-Encoding: none");
header("Content-Length: 1"); 
header("Content-Type: text/plain");
ob_start();
echo '1'; 
$size = ob_get_length();
header("Content-Length: $size");
ob_end_flush();
flush();

// 2. CONTINUE EXECUTION (No Change)
ignore_user_abort(true);
set_time_limit(0); 

// --- Capture Parameters (No Change) ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 
$unique_id = isset($_GET['uid']) ? $_GET['uid'] : null; 

if (!$target_url || !$proxy_ip || !$proxy_port || $proxy_auth !== $expected_auth || !$unique_id) {
    exit(); 
}

$proxy_address = $proxy_ip . ":" . $proxy_port;

// 3. Initialize PHP cURL
$ch = curl_init();

// --- ACTIVE USER FIX v7: Advanced Spoofing & Session Reset ---

// Function to generate a completely random IPv4 address (X-Forwarded-For Spoofing)
function generateRandomIP() {
    return rand(1, 255) . "." . rand(1, 255) . "." . rand(1, 255) . "." . rand(1, 255);
}

// 1. Random User-Agent 
$user_agents = array(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; WOW64; rv:109.0) Gecko/20100101 Firefox/116.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/605.1.15"
);

// 2. Random Referer Array 
$fake_referers = array(
    "https://www.google.com/",
    "https://www.bing.com/",
    "https://t.co/",
    "https://duckduckgo.com/",
    ""
);

// 3. Random Language Array 
$random_languages = array(
    "en-US,en;q=0.9", "hi-IN,hi;q=0.9", "es-ES,es;q=0.9", "fr-FR,fr;q=0.9", 
    "de-DE,de;q=0.9", "it-IT,it;q=0.9", "ja-JP,ja;q=0.9", "zh-CN,zh;q=0.9", 
    "pt-PT,pt;q=0.9", "ru-RU,ru;q=0.9"
);

// Headers Preparation
$random_ua = $user_agents[array_rand($user_agents)];
$random_referer = $fake_referers[array_rand($fake_referers)];
$random_lang_header = $random_languages[array_rand($random_languages)];
$ga_cookie_value = "GS1.1." . $unique_id . "." . time(); 
$random_x_forwarded_ip = generateRandomIP();

$headers = array(
    "User-Agent: " . $random_ua,
    "Cookie: _ga=" . $ga_cookie_value . ";",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "Accept-Language: " . $random_lang_header,
    "DNT: 1",
    "X-Forwarded-For: " . $random_x_forwarded_ip 
);

// Referer Header (Only add if it's not empty)
if (!empty($random_referer)) {
    $headers[] = "Referer: " . $random_referer;
}

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// --- ULTIMATE SESSION RESET ---
curl_setopt($ch, CURLOPT_COOKIESESSION, true); 
curl_setopt($ch, CURLOPT_COOKIEJAR, ''); 
curl_setopt($ch, CURLOPT_COOKIEFILE, ''); 

curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
curl_setopt($ch, CURLOPT_HEADER, false);

// --- PROXY CONFIGURATION ---
curl_setopt($ch, CURLOPT_PROXY, $proxy_address); 
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP);
curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC); 

// === Active User Timeout (No Change) ===
curl_setopt($ch, CURLOPT_TIMEOUT, 30); 

// Other necessary settings (No Change)
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// 4. Execute Proxy Request
curl_exec($ch); 

curl_close($ch);
exit(); 
?>
