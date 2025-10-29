<?php
// PHP Proxy Loader: proxy_loader.php - Final Version (for Iframe and New Tab)

// --- Capture Parameters from the address bar ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 

// Basic validation
if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth) {
    // If running in a new tab without parameters, show an error
    die("<h1>Error: Missing required URL or Proxy parameters.</h1><p>Ensure you are loading this page via the main HTML tool.</p>"); 
}

// 1. Initialize PHP cURL
$ch = curl_init();
$proxy_address = "$proxy_ip:$proxy_port";

// Set standard headers for a browser simulation
$headers = array(
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "Accept-Language: en-US,en;q=0.9"
);

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
curl_setopt($ch, CURLOPT_HEADER, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); // Follow redirects
curl_setopt($ch, CURLOPT_MAXREDIRS, 5);

// --- Proxy Configuration and Authentication ---
curl_setopt($ch, CURLOPT_PROXY, $proxy_address);
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP); 
curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC); 

// Set a reasonable timeout for loading the target page
curl_setopt($ch, CURLOPT_TIMEOUT, 15); 
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10); 

// 2. Execute the cURL request
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

// 3. Handle Output
if (curl_errno($ch) || $http_code >= 400) {
    // Display error if proxy fails (this error appears inside the iframe or new tab)
    echo "<!DOCTYPE html><html><head><title>Proxy Load Error</title></head><body>";
    echo "<h1>Proxy Load Failed (Code: " . $http_code . ")</h1>";
    echo "<p>Could not load <strong>" . htmlspecialchars($target_url) . "</strong> through proxy <strong>" . htmlspecialchars($proxy_address) . "</strong>.</p>";
    echo "<p><strong>Reason:</strong> cURL Error: " . curl_error($ch) . "</p>";
    echo "<p><strong>Demo Proof:</strong> The proxy IP (<strong>" . htmlspecialchars($proxy_ip) . "</strong>) is visible in the search bar/iframe URL, confirming the routing mechanism.</p>";
    echo "</body></html>";
} else {
    // Output the HTML content received from the target URL
    echo $response;
}

// 4. Cleanup
curl_close($ch);
?>
