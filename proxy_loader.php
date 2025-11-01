<?php
// PHP Proxy Loader: proxy_loader.php - NO CHANGE NEEDED from previous dynamic version.

// 1. Tell the browser/client to disconnect immediately (to prevent client-side timeouts)
header("Connection: close");
header("Content-Encoding: none");
header("Content-Length: 1"); 
header("Content-Type: text/plain");

// Send minimal response back to the client immediately
ob_start();
echo '1'; 
$size = ob_get_length();
header("Content-Length: $size");
ob_end_flush();
flush();
// The PHP script continues execution in the background for the full 30s.

// 2. Continue execution (The cURL process runs in the background)
ignore_user_abort(true);
set_time_limit(0); 

// --- Capture Parameters from JavaScript (passed via URL) ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_domain = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; // user:pass
$unique_id = isset($_GET['uid']) ? $_GET['uid'] : null; // Unique ID for GA4 Cookie

// Basic Validation
if (!$target_url || !$proxy_domain || !$proxy_port || !$proxy_auth || !$unique_id) {
    exit(); 
}

$proxy_address = $proxy_domain . ":" . $proxy_port;

// 3. Initialize PHP cURL
$ch = curl_init();

// --- GA4 Active User FIX: Unique Client ID as a Cookie Header ---
$ga_cookie_value = "GS1.1." . $unique_id . "." . time(); 

// Add a list of common referrers for better realism
$referrers = [
    "https://www.google.com/",
    "https://www.bing.com/",
    "https://www.facebook.com/",
    "https://t.co/", 
    "https://www.youtube.com/",
    "https://search.yahoo.com/"
];
$random_referrer = $referrers[array_rand($referrers)];

$headers = array(
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36",
    "Cookie: _ga=" . $ga_cookie_value . ";",
    "Referer: " . $random_referrer, 
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "Accept-Language: en-US,en;q=0.9"
);

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
// --------------------------------------------------------------------------

curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
curl_setopt($ch, CURLOPT_HEADER, false);

// --- DYNAMIC SOCKS5 PROXY CONFIGURATION (Now uses fixed/direct IP) ---
curl_setopt($ch, CURLOPT_PROXY, $proxy_address); 
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 

curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_SOCKS5); 
curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC); 


// === Active User Timeout: CRITICAL for GA4 Session ===
curl_setopt($ch, CURLOPT_TIMEOUT, 30); 

// Other necessary settings
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// 4. Execute Proxy Request
curl_exec($ch); 

curl_close($ch);
exit(); 
?>
