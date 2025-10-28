<?php
// session_guarantee.php - Runs the proxy request and forces a 30-second session in the background

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
// The browser is disconnected, but the PHP script continues execution in the background

// 2. Continue execution (cURL process runs in the background)
ignore_user_abort(true);
set_time_limit(0); 

// --- Capture Parameters ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null; 
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null; 
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 
$unique_id = isset($_GET['uid']) ? $_GET['uid'] : null; 
$custom_user_agent = isset($_GET['ua']) ? $_GET['ua'] : 'Mozilla/5.0 (Default)'; // NEW: Capture Dynamic User Agent

if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth || !$unique_id) {
    exit(); 
}

// 3. Initialize PHP cURL
$ch = curl_init();
$proxy_address = "$proxy_ip:$proxy_port";

// --- GA4 Active User FIX: Setting Unique Client ID as a Cookie Header ---
$ga_cookie_value = "GS1.1." . $unique_id . "." . time(); 

$headers = array(
    // *** CRITICAL: Use the dynamic User-Agent from the frontend ***
    "User-Agent: " . $custom_user_agent, 
    "Cookie: _ga=" . $ga_cookie_value . ";",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "Accept-Language: en-US,en;q=0.9",
    // Simulates a real click from Google Search (important for GA tracking)
    "Referer: https://www.google.com/search?q=" . urlencode(parse_url($target_url, PHP_URL_HOST))
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
// Setting a 30s timeout here ensures the page is considered 'viewed' for a long enough duration
curl_setopt($ch, CURLOPT_TIMEOUT, 30); 

// Other necessary settings
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// 4. Execute Proxy Request (The actual view/session hit)
curl_exec($ch); 
curl_close($ch);

// === CRITICAL: Add forced delay for user activity simulation ===
// Sleep for a random time between 10 and 25 seconds AFTER fetching the page to guarantee the session count.
$sleep_time = rand(10, 25);
sleep($sleep_time); 

exit(); // End the background script
?>
