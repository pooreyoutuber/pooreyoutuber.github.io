<?php
// proxy_loader.php - Fetches and displays proxied content in the iframe, stripping security headers.

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

$headers = array(
    // Use DESKTOP User Agent
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "Accept-Language: en-US,en;q=0.9"
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
curl_setopt($ch, CURLOPT_TIMEOUT, 10); // Quick timeout for display

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
    $headers_to_strip = ['X-Frame-Options', 'Content-Security-Policy'];
    $clean_headers = [];
    
    foreach (explode("\r\n", $header_text) as $header) {
        if (trim($header) == '') continue;
        
        $parts = explode(':', $header, 2);
        if (count($parts) < 2) {
            // Keep status line (e.g., HTTP/1.1 200 OK)
            $clean_headers[] = $header; 
            continue;
        }
        
        $name = trim($parts[0]);
        $value = trim($parts[1]);
        
        // Check if the header name is in the list of headers to strip (case-insensitive)
        if (!in_array(strtolower($name), array_map('strtolower', $headers_to_strip))) {
            // Forward other headers
            $clean_headers[] = "$name: $value";
        }
    }
    
    // 6. Output the cleaned response
    http_response_code($http_code);
    foreach ($clean_headers as $header_line) {
        if (strpos($header_line, 'HTTP/') === 0) {
            continue; 
        }
        // Send the cleaned headers (e.g., Content-Type)
        header($header_line, false);
    }
    
    echo $body;
}

curl_close($ch);
?>
