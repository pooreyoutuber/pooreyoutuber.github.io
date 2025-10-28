<?php
// proxy_loader.php - ULTIMATE FIX: Simplest proxy with max stripping and dynamic User-Agent.

// 1. Capture Parameters
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null; 
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null; 
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 
$custom_user_agent = isset($_GET['ua']) ? $_GET['ua'] : 'Mozilla/5.0 (Default)'; // NEW: Capture Dynamic User Agent

if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth) {
    die("Error: Missing proxy parameters.");
}

// Extract base URL for the <base> tag
$url_parts = parse_url($target_url);
$base_scheme = isset($url_parts['scheme']) ? $url_parts['scheme'] : 'http';
$base_host = isset($url_parts['host']) ? $url_parts['host'] : '';
$base_path = $base_scheme . '://' . $base_host . '/';

// 2. Initialize PHP cURL
$ch = curl_init();
$proxy_address = "$proxy_ip:$proxy_port";
$unique_id = isset($_GET['uid']) ? $_GET['uid'] : '1234567890';
$ga_cookie_value = "GS1.1." . $unique_id . "." . time(); 

$headers = array(
    "User-Agent: " . $custom_user_agent, // CRITICAL: Use the dynamic User-Agent
    "Cookie: _ga=" . $ga_cookie_value . ";",
    "Accept-Language: en-US,en;q=0.9"
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

// Standard settings
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);

// 3. Execute Proxy Request
$body = curl_exec($ch);
curl_close($ch);

if ($body === false) {
    $error_message = curl_error($ch);
    $output = "Error: Proxy Load Failure. cURL Error: " . htmlspecialchars($error_message);
} else {
    // 4. MAXIMUM AGGRESSIVE STRIPPING
    if (!empty($body)) {
        
        // Remove ALL headers that block framing (X-Frame-Options, CSP)
        $body = preg_replace('/<meta http-equiv=["\'](X-Frame-Options|Content-Security-Policy)["\'].*?>/i', '', $body);
        
        // Remove ALL script tags (inline and external)
        $body = preg_replace('/<script\b[^>]*>([\s\S]*?)<\/script>/i', '', $body);

        // Remove ALL JavaScript event handlers (onclick, onload, etc.)
        $body = preg_replace('/ on[a-z]+=["\'][^"\']*["\']/i', '', $body);
        
        // Remove Simple frame-busting JS 
        $body = preg_replace('/if ?\( ?self\.location ?!= ?top\.location ?\).*;?/i', '', $body);
        
        // Inject <base> Tag
        $base_tag = '<base href="' . $base_path . '">';
        $body = preg_replace('/<head>/i', '<head>' . $base_tag, $body, 1);
    }

    // 5. Base64 Encode the modified content
    $output = base64_encode($body);
}

// Output the Base64 string or error message directly
header('Content-Type: text/plain'); 
echo $output;
?>
