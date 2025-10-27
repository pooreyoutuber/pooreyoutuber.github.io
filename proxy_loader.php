<?php
// proxy_loader.php - Fetches and displays proxied content in the iframe, stripping all potentially problematic headers.

// 1. Capture Parameters
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null; 
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null; 
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 

if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth) {
    http_response_code(400);
    die("<h1>Error: Missing proxy parameters.</h1>");
}

// 2. Initialize PHP cURL
$ch = curl_init();
$proxy_address = "$proxy_ip:$proxy_port";

// GA4 Active User FIX: Setting Unique Client ID as a Cookie Header
$unique_id = isset($_GET['uid']) ? $_GET['uid'] : '1234567890';
$ga_cookie_value = "GS1.1." . $unique_id . "." . time(); 

$headers = array(
    // Use DESKTOP User Agent
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "Accept-Language: en-US,en;q=0.9",
    "Cookie: _ga=" . $ga_cookie_value . ";" // Pass GA cookie here too for consistency
);

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
// CRITICAL: Get response headers
curl_setopt($ch, CURLOPT_HEADER, true); 

// --- Proxy Configuration and Authentication ---
curl_setopt($ch, CURLOPT_PROXY, $proxy_address);
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP); 
curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC); 

// Standard settings
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15); // Increased timeout to 15s

// 3. Execute Proxy Request
$response = curl_exec($ch);
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($response === false) {
    echo "<h1>Proxy Load Error: Could not connect to target URL via proxy.</h1>";
} else {
    // 4. Separate headers and body
    $header_text = substr($response, 0, $header_size);
    $body = substr($response, $header_size);
    
    // 5. CRITICAL FIX: Clean the headers for iframe rendering
    $headers_to_strip = ['x-frame-options', 'content-security-policy', 'content-length', 'transfer-encoding', 'connection'];
    $content_type = null;
    
    // Parse headers to find Content-Type
    foreach (explode("\r\n", $header_text) as $header) {
        if (strpos($header, ':') !== false) {
            list($name, $value) = explode(':', $header, 2);
            $lower_name = strtolower(trim($name));
            
            if ($lower_name === 'content-type') {
                $content_type = trim($value);
            }
        }
    }
    
    // 6. Output the cleaned response
    http_response_code($http_code);
    
    // Set the Content-Type header explicitly (most important fix)
    if ($content_type) {
        header("Content-Type: " . $content_type, true);
    } else {
        header("Content-Type: text/html", true); // Default to HTML
    }
    
    // WARNING: We skip sending all other headers like Set-Cookie, Cache-Control, etc.
    // This is the most aggressive way to prevent blocking.
    
    echo $body;
}

curl_close($ch);
?>
