<?php
// proxy_loader.php - ULTIMATE White Screen Fix (Fast Hit Mode)

// 💡 FIX 1: Force PHP to display all errors (to prevent White Screen of Death)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// 💡 FIX 2: The script is designed for a fast run and immediate exit.

// --- Capture Parameters ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 
$unique_id = isset($_GET['uid']) ? $_GET['uid'] : null; // User Profile Seed

// Critical Parameter Check 
if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth || !$unique_id) {
    // Agar parameters missing hain, toh clear error do.
    die("Error: Missing critical parameters (target, ip, port, auth, or uid).");
}

// 1. Initialize PHP cURL
$ch = curl_init();
$proxy_address = "$proxy_ip:$proxy_port";

// --- GA4 Active User FIX: Setting Unique Client ID as a Cookie Header ---
// CRITICAL: Generate a unique GA cookie value for every hit.
$random_client_id = mt_rand(1000000000, 2000000000) . "." . time();
$ga_cookie_value = "GA1.2." . $random_client_id; // Standard GA4 cookie format

$headers = array(
    // Real-world User-Agent (Essential for not getting flagged)
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36",
    // CRITICAL: Send the unique cookie (Simulates a new user session)
    "Cookie: _ga=" . $ga_cookie_value . "; _wbtuid=" . $unique_id . ";", // _wbtuid is a custom ID for debugging
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image:apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "Accept-Language: en-US,en;q=0.9"
);

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
// REFINEMENT: Get response headers to check status code
curl_setopt($ch, CURLOPT_HEADER, true); 

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
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// 3. Output Result
header('Content-Type: text/plain');

if ($result === false) {
    // Agar cURL fail hua, toh error message return karo.
    echo "cURL ERROR: " . htmlspecialchars($curl_error) . " | Target: " . $target_url;
} else {
    // REFINEMENT: Check HTTP status code
    if ($http_code >= 200 && $http_code < 400) {
        // Successful response (2xx) or redirection (3xx) is a successful hit.
        echo "SUCCESS: Fast Hit Executed. HTTP Code: " . $http_code;
    } else {
        // Server returned an error code (4xx, 5xx).
        echo "HTTP ERROR: Target returned HTTP Code " . $http_code . " | Proxy: " . $proxy_address;
    }
}

// The browser/client (multiproxy-tool.html's JavaScript) ab 30-second wait ko manage karega.
exit();
?>
