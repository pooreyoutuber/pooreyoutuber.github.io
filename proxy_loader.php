<?php
// proxy_loader.php - Aggressive Iframe Fix using Base Tag and Base64 Encoding.

// 1. Capture Parameters
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null; 
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null; 
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 

if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth) {
    die("Error: Missing proxy parameters.");
}

// Extract the base path (e.g., https://example.com) for the <base> tag
$url_parts = parse_url($target_url);
$base_scheme = isset($url_parts['scheme']) ? $url_parts['scheme'] : 'http';
$base_host = isset($url_parts['host']) ? $url_parts['host'] : '';
// Use the base URL including the host, ensuring it ends with a slash if there's no path
$base_url_for_tag = $base_scheme . '://' . $base_host . (isset($url_parts['path']) ? dirname($url_parts['path']) : '/');


// 2. Initialize PHP cURL
$ch = curl_init();
$proxy_address = "$proxy_ip:$proxy_port";

// GA4 Active User Fix
$unique_id = isset($_GET['uid']) ? $_GET['uid'] : '1234567890';
$ga_cookie_value = "GS1.1." . $unique_id . "." . time(); 

$headers = array(
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "Accept-Language: en-US,en;q=0.9",
    "Cookie: _ga=" . $ga_cookie_value . ";"
);

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
curl_setopt($ch, CURLOPT_HEADER, false); // Do not capture response headers

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
    // 4. Aggressive Content Modification (CRITICAL FIXES)
    if (!empty($body)) {
        // Prepare the <base> tag
        $base_tag = '<base href="' . $base_url_for_tag . '">';

        // a) Inject the <base> tag into the <head> to fix all relative links (CSS, JS, Images)
        // Note: '/<head>/i' is used to match <head> case-insensitively.
        $body = preg_replace('/<head>/i', '<head>' . $base_tag, $body, 1);
        
        // b) Aggressively strip potential frame-busting headers/scripts remaining in the content
        
        // Remove X-Frame-Options meta tags
        $body = preg_replace('/<meta http-equiv=["\']X-Frame-Options["\'].*?>/i', '', $body);
        
        // Remove Content-Security-Policy meta tags that might block framing
        $body = preg_replace('/<meta http-equiv=["\']Content-Security-Policy["\'].*?>/i', '', $body);
        
        // Remove known frame-busting JavaScript patterns (e.g., `if (self.location != top.location)`)
        $body = preg_replace('/if ?\( ?self\.location ?!= ?top\.location ?\).*;?/i', '', $body);
        $body = preg_replace('/if ?\( ?window\.parent ?&& ?window\.parent\.frames\.length ?.*/i', '', $body);
    }

    // 5. Base64 Encode the modified content
    $output = base64_encode($body);
}

// Output the Base64 string or error message directly
header('Content-Type: text/plain'); 
echo $output;
?>
