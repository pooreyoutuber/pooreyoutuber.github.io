<?php
// proxy_loader.php - ULTIMATE White Screen Fix (Fast Hit Mode)

// 💡 FIX 1: Force PHP to display all errors (to prevent White Screen of Death)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// 💡 FIX 2: REMOVED all background execution logic (Connection: close, flush, ignore_user_abort, set_time_limit)
// The script will now run quickly and end without blocking the server.

// --- Capture Parameters ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 
$unique_id = isset($_GET['uid']) ? $_GET['uid'] : null;

// Critical Parameter Check 
if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth || !$unique_id) {
    // Agar parameters missing hain, toh clear error do.
    die("Error: Missing critical parameters (target, ip, port, auth, or uid).");
}

// 1. Initialize PHP cURL
$ch = curl_init();
$proxy_address = "$proxy_ip:$proxy_port";

// --- GA4 Active User FIX: Setting Unique Client ID as a Cookie Header ---
// CRITICAL: We create a unique GA cookie for every hit to register it as a NEW USER.
$ga_cookie_value = "GS1.1." . $unique_id . "." . time(); 

$headers = array(
    // Real-world User-Agent (Essential for not getting flagged)
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36",
    // CRITICAL: Send the unique cookie
    "Cookie: _ga=" . $ga_cookie_value . ";",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image:apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "Accept-Language: en-US,en;q=0.9"
);

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
curl_setopt($ch, CURLOPT_HEADER, false);

// --- Proxy Configuration and Authentication ---
curl_setopt($ch, CURLOPT_PROXY, $proxy_address);
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP); 
curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC);

// 💡 FIX 3: Short Timeout for Fast Hit
curl_setopt($ch, CURLOPT_TIMEOUT, 5); // 5 seconds is enough for a fast page hit

// Only fetch headers (much faster and non-blocking)
curl_setopt($ch, CURLOPT_NOBODY, true);

// Other necessary settings
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// 2. Execute Proxy Request
$result = curl_exec($ch);
$curl_error = curl_error($ch);
curl_close($ch);

// 3. Output Result
header('Content-Type: text/plain');

if ($result === false) {
    // Agar cURL fail hua, toh error message return karo.
    echo "cURL ERROR: " . htmlspecialchars($curl_error);
} else {
    // Agar cURL succeed hua, toh success code return karo.
    echo "SUCCESS: Fast Hit Executed.";
}

// The browser/client (multiproxy-tool.html's JavaScript) ab 30-second wait ko manage karega.
exit();
?>
