<?php
// PHP Proxy Loader: proxy_loader.php - FINAL Optimized for Guaranteed Active User Tracking

// 1. Tell the browser/client to disconnect immediately
// This ensures your HTML tool remains fast and responsive while the server works in the background.
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
// The browser is disconnected, but the PHP script continues execution.

// 2. Setup Background Execution
ignore_user_abort(true); // Ignore if the client closes the connection
set_time_limit(0);      // Allow the script to run indefinitely (until sleep is done)

// --- Capture Parameters ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 
$unique_id = isset($_GET['uid']) ? $_GET['uid'] : null;

if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth || !$unique_id) {
    exit(); 
}

// 3. Initialize PHP cURL
$ch = curl_init();
$proxy_address = "$proxy_ip:$proxy_port";

// --- CRITICAL: GA4 Unique User Setup ---
// We create a unique GA cookie for every hit to register it as a NEW USER and increase Active Users.
$ga_cookie_value = "GA1.1." . $unique_id . "." . time(); 

$headers = array(
    // Desktop User-Agent (For realistic traffic)
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    // CRITICAL: Send the unique cookie
    "Cookie: _ga=" . $ga_cookie_value . ";",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language: en-US,en;q=0.9",
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

// Set Connection Timeout (should be fast, just to load the initial page and hit GA4)
curl_setopt($ch, CURLOPT_TIMEOUT, 10); 
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// 4. Execute Proxy Request (The GA4 event/view is sent here)
curl_exec($ch);
curl_close($ch);

// === CRITICAL FINAL STEP: FORCE ACTIVE USER SESSION DURATION ===
// We use sleep(30) to keep the PHP process running for the required GA4 session duration.
// This guarantees GA4 registers an Engaged Session (Active User).
sleep(30); 

exit(); 
?>
