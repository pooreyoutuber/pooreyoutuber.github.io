<?php
// PHP Proxy Loader: proxy_loader.php - FINAL Code for Render

// --- CRITICAL AUTHENTICATION DATA ---
// NOTE: This must match the COMMON_USER and COMMON_PASS in your index.html
$auth_user = "bqctypvz";
$auth_pass = "399xb3kxqv6i";
$expected_auth = $auth_user . ":" . $auth_pass;


// 1. Tell the browser/client to disconnect immediately (for non-blocking execution)
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
// The browser is disconnected, but the PHP script continues execution in the background for 30 seconds.

// 2. Continue execution (The cURL process runs in the background)
ignore_user_abort(true);
set_time_limit(0); 

// --- Capture Parameters from JavaScript ---
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

// --- GA4 Active User FIX: Setting Unique Client ID as a Cookie Header ---
$ga_cookie_value = "GS1.1." . $unique_id . "." . time(); 

$headers = array(
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36",
    // CRITICAL: Send the unique GA4 cookie
    "Cookie: _ga=" . $ga_cookie_value . ";",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "Accept-Language: en-US,en;q=0.9"
);

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
curl_setopt($ch, CURLOPT_HEADER, false);

// --- PROXY CONFIGURATION (Crucial for the tool) ---
curl_setopt($ch, CURLOPT_PROXY, $proxy_address); 
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP); 
curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC); 

// === Active User Timeout ===
// 30 seconds is the minimum for a successful GA4 Session to register.
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
