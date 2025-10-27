<?php
// proxy_loader.php - Fetches content via proxy and outputs it as Base64 for iframe to decode and render.

// 1. Capture Parameters
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null; 
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null; 
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 

if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth) {
    // Output error message as plain text
    die("Error: Missing proxy parameters.");
}

// 2. Initialize PHP cURL
$ch = curl_init();
$proxy_address = "$proxy_ip:$proxy_port";

// GA4 Active User Fix: Setting Unique Client ID as a Cookie Header
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
// We only need the body content now, no headers
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

if ($body === false) {
    $error_message = curl_error($ch);
    // Output error message starting with a specific prefix
    $output = "Error: Proxy Load Failure. cURL Error: " . htmlspecialchars($error_message);
} else {
    // 4. Base64 Encode the fetched content
    $output = base64_encode($body);
}

curl_close($ch);

// Output the Base64 string or error message directly
header('Content-Type: text/plain'); 
echo $output;
?>
