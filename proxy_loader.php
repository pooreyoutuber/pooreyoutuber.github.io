<?php
// PHP Proxy Loader: proxy_loader.php - Optimized for Google Analytics tracking

header("Access-Control-Allow-Origin: *"); 
header('Content-Type: text/plain'); 

// 2. Capture URL Parameters from JavaScript
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; // format: user:pass

// 3. Check for Required Parameters
if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth) {
    http_response_code(400);
    die("PROXY_ERROR: Missing required proxy configuration details. Code 400.");
}

// 4. Initialize PHP cURL
$ch = curl_init();
$proxy_address = "$proxy_ip:$proxy_port";

curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
curl_setopt($ch, CURLOPT_HEADER, false);

// --- Proxy Configuration and Authentication ---
curl_setopt($ch, CURLOPT_PROXY, $proxy_address);
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP); 
curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC); 

// === Optimization for Active Users (Key Changes) ===
// 1. Desktop User-Agent (Standard browser identity)
curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36");

// 2. Longer Timeout: Gives the server/GA script more time to execute before the connection closes.
curl_setopt($ch, CURLOPT_TIMEOUT, 30); // Increased from 15 to 30 seconds

// 3. Follow Location and SSL settings
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// 5. Execute Proxy Request
$proxied_html = curl_exec($ch);
$curl_error = curl_error($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

curl_close($ch);

// 6. Output and Error Handling
if ($curl_error || $http_code >= 400 || $proxied_html === false) {
    http_response_code($http_code ?: 500);
    die("PROXY_LOAD_FAILED: HTTP Status: " . ($http_code ?: "N/A") . " | cURL Error: " . ($curl_error ?: "None") . " | Proxy: " . $proxy_address);
} else {
    // Return a status indicating success
    echo "View sent successfully."; 
}
?>
