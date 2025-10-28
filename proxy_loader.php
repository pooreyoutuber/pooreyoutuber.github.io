<?php
// PHP Proxy Loader: proxy_loader.php - iFrame Content Server for Visual Tool (Corrected)

// 1. Execution Setup (Allow script to run and return content to the iFrame)
// We remove the 'Connection: close' logic so the PHP script sends the content back.
set_time_limit(25); // 25 seconds is a safe timeout for proxy load

// --- Capture Parameters ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 
$unique_id = isset($_GET['uid']) ? $_GET['uid'] : null; 

if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth || !$unique_id) {
    http_response_code(400);
    // Error message displayed inside the iframe
    echo "<h1>Error: Missing Parameters</h1><p>Check the tool configuration or Proxy details.</p>";
    exit(); 
}

// 2. Initialize PHP cURL
$ch = curl_init();
$proxy_address = "$proxy_ip:$proxy_port";

// --- GA4 Cookie Simulation (CRITICAL for Unique User Counting) ---
// GA4 Client ID is stored in the _ga cookie. We generate a unique one per slot.
$random_num = $unique_id * 100000000 + rand(100000000, 999999999);
$timestamp = time(); 
$ga_cookie_value = "GA1.1." . $random_num . "." . $timestamp; 
// NOTE: For live preview, we use GA1.1 format which is standard.

$headers = array(
    // Desktop Mode User-Agent (As requested)
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    // CRITICAL: Send the unique cookie. The website's GA code will use this for tracking.
    "Cookie: _ga=" . $ga_cookie_value . "; _ga_session_id=" . time() . rand(100, 999) . ";",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language: en-US,en;q=0.9"
);

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
// --------------------------------------------------------------------------

curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
// We need headers to determine content type, but not to output them directly
curl_setopt($ch, CURLOPT_HEADER, true); 
curl_setopt($ch, CURLOPT_TIMEOUT, 20); // 20-second cURL timeout

// --- Proxy Configuration and Authentication ---
curl_setopt($ch, CURLOPT_PROXY, $proxy_address);
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP); 
curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC); 
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); 

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

// Separate header and body
$headers_content = substr($response, 0, $header_size);
$content = substr($response, $header_size);

// 3. Output Logic
if ($http_code >= 200 && $http_code < 300 && $content !== false) {
    // CRITICAL: Set content type and return raw content to the iframe
    // We try to guess the content type from the headers, or default to HTML
    if (preg_match('/Content-Type: (.*?)\r\n/i', $headers_content, $matches)) {
        header('Content-Type: ' . $matches[1]);
    } else {
        header('Content-Type: text/html; charset=utf-8');
    }
    
    // We explicitly remove Content-Security-Policy (CSP) header 
    // to prevent the target site from blocking loading in our iFrame.
    $output_headers = preg_replace('/Content-Security-Policy:.*?\r\n/i', '', $headers_content);
    $output_headers = preg_replace('/X-Frame-Options:.*?\r\n/i', '', $output_headers);
    
    // Output all headers (except CSP/X-Frame-Options)
    $header_lines = explode("\r\n", trim($output_headers));
    foreach ($header_lines as $header) {
        if (strpos($header, 'HTTP/') === 0 || empty($header)) continue;
        // Don't resend headers that break output
        if (strpos($header, 'Transfer-Encoding') === false && strpos($header, 'Content-Length') === false) {
             header($header, false);
        }
    }

    echo $content;
} else {
    // Error handling
    http_response_code(502); 
    echo "<!DOCTYPE html><html><head><title>Proxy Error</title></head><body>";
    echo "<h1>Error Loading Content via Proxy (Code: $http_code)</h1>";
    echo "<p>Proxy or Network failed. Please try reloading or check the URL.</p>";
    echo "</body></html>";
}

exit();
?>
