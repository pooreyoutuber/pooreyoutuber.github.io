<?php
// PHP Proxy Loader: proxy_loader.php - iFrame Content Server for Visual Tool

// 1. Execution Setup (Wait for cURL to finish to return content to iFrame)
// set_time_limit(0) is dangerous here. We need the script to finish and return content.
set_time_limit(25); // 25 seconds is a safe timeout for proxy load

// --- Capture Parameters ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 
$unique_id = isset($_GET['uid']) ? $_GET['uid'] : null; 

if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth || !$unique_id) {
    http_response_code(400);
    // This HTML is returned to the iframe on error
    echo "<h1>Error: Missing Parameters</h1><p>Please check your HTML code for proxy details.</p>";
    exit(); 
}

// 2. Initialize PHP cURL
$ch = curl_init();
$proxy_address = "$proxy_ip:$proxy_port";

// --- GA4 Cookie Simulation (CRITICAL for Unique User Counting) ---
// GA4 Client ID is stored in the _ga cookie. We generate a unique one per slot.
// Format: GA1.1.<random_number>.<timestamp_of_first_visit>
$random_num = $unique_id * 100000000 + rand(100000000, 999999999);
$timestamp = time(); 
$ga_cookie_value = "GA1.1." . $random_num . "." . $timestamp; 

$headers = array(
    // Desktop Mode User-Agent (As requested)
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    // CRITICAL: Send the unique cookie
    "Cookie: _ga=" . $ga_cookie_value . "; _ga_session_id=" . time() . rand(100, 999) . ";",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language: en-US,en;q=0.9"
);

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
// --------------------------------------------------------------------------

curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
curl_setopt($ch, CURLOPT_HEADER, false); 
curl_setopt($ch, CURLOPT_TIMEOUT, 20); // 20-second cURL timeout

// --- Proxy Configuration and Authentication ---
curl_setopt($ch, CURLOPT_PROXY, $proxy_address);
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP); 
curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC); 
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); // Follow redirects

$content = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// 3. Output Logic
if ($http_code >= 200 && $http_code < 300 && $content !== false) {
    // CRITICAL: Set content type to HTML and return raw content to the iframe
    header('Content-Type: text/html; charset=utf-8');
    echo $content;
} else {
    // Error handling
    http_response_code(502); // Bad Gateway or Proxy Error
    echo "<!DOCTYPE html><html><head><title>Proxy Error</title></head><body>";
    echo "<h1>Error Loading Content via Proxy (Code: $http_code)</h1>";
    echo "<p>Please check if the Proxy is Live and the Target URL is correct.</p>";
    echo "</body></html>";
}

exit();
?>
