<?php
// PHP Proxy Loader: proxy_loader.php - FINAL Optimized for Active User Tracking (GA4 Fix)

// 1. Tell the browser/client to disconnect immediately (to prevent client-side timeouts)
// This is CRITICAL for the HTML script to continue running without waiting 30 seconds.
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

// --- Capture Parameters ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 
$unique_id = isset($_GET['uid']) ? $_GET['uid'] : null; // NEW: Capture unique ID

// Basic validation
if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth || !$unique_id) {
    exit(); 
}

// 3. Initialize PHP cURL
$ch = curl_init();
$proxy_address = "$proxy_ip:$proxy_port";

// --- GA4 Unique User Setup ---
// The unique ID from the HTML script creates a unique GA cookie
$ga_cookie_value = "GS1.1." . $unique_id . "." . time(); 

$headers = array(
    // Real-world User-Agent (Essential for not getting flagged)
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36",
    // CRITICAL: Send the unique cookie to register as a new Active User
    "Cookie: _ga=" . $ga_cookie_value . ";",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "Accept-Language: en-US,en;q=0.9"
);

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
// --------------------------------------------------------------------------

curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
curl_setopt($ch, CURLOPT_HEADER, false);

// --- Proxy Configuration and Authentication ---
curl_setopt($ch, CURLOPT_PROXY, $proxy_address);
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP); 
curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC); 

// === Active User Timeout ===
// 30 seconds is necessary for a successful GA4 Session/Active User count.
curl_setopt($ch, CURLOPT_TIMEOUT, 30); 
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10); // Connection must be made within 10 seconds

// 4. Execute the cURL request (runs in the background)
$response = curl_exec($ch);

// 5. Cleanup
curl_close($ch);

// The script finishes here after the 30-second timeout or when the request completes/fails.
exit();
?>
