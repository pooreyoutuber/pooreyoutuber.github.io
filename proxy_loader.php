<?php
// PHP Proxy Loader: proxy_loader.php - iFrame Content Server

// 1. Client Disconnect (Not needed here since we want the browser to wait for content)
// header("Connection: close");
// ... (client-side disconnect code removed)

// 2. Execution Setup (Keep a reasonable timeout)
set_time_limit(30); // 30 seconds is enough for proxy load

// --- Capture Parameters ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 
$unique_id = isset($_GET['uid']) ? $_GET['uid'] : null; // Slot ID as unique identifier

if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth || !$unique_id) {
    // Error: Missing parameters
    http_response_code(400);
    echo "Error: Missing required parameters (Target, Proxy IP/Port/Auth).";
    exit(); 
}

// 3. Initialize PHP cURL
$ch = curl_init();
$proxy_address = "$proxy_ip:$proxy_port";

// --- GA4 Cookie Simulation (CRITICAL: To make each slot look like a unique user) ---
// GA4 Client ID is stored in the _ga cookie. We generate a unique one per slot.
// Format: GA1.1.<random_number>.<timestamp_of_first_visit>
$random_num = $unique_id * 100000000 + rand(100000000, 999999999);
$timestamp = time(); 
$ga_cookie_value = "GA1.1." . $random_num . "." . $timestamp; 

$headers = array(
    // A random-looking User-Agent (Change this for better realism)
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" . rand(100, 120) . ".0.0.0 Safari/537.36",
    // CRITICAL: Send the unique cookie. The website's GA code will use this for tracking.
    "Cookie: _ga=" . $ga_cookie_value . "; _ga_session_id=" . time() . rand(100, 999) . ";",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language: en-US,en;q=0.9"
);

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
// --------------------------------------------------------------------------

curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
curl_setopt($ch, CURLOPT_HEADER, false); // Don't send headers to output
curl_setopt($ch, CURLOPT_TIMEOUT, 20); // 20-second timeout

// --- Proxy Configuration and Authentication ---
curl_setopt($ch, CURLOPT_PROXY, $proxy_address);
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP); 
curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC); 
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); // Follow redirects

$content = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// 4. Output Logic
if ($http_code == 200 && $content !== false) {
    // We assume content is HTML.
    // The browser's iFrame will now execute the GA4 code inside this content.
    echo $content;
} else {
    // Error handling
    http_response_code(502); // Bad Gateway
    echo "<!DOCTYPE html><html><head><title>Proxy Error</title></head><body>";
    echo "<h1>Error Loading Content via Proxy</h1>";
    echo "<p>HTTP Code: " . $http_code . "</p>";
    echo "<p>Please check if the Proxy is Live and the Target URL is correct.</p>";
    echo "</body></html>";
}

exit();
?>
