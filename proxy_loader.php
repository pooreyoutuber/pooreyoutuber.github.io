<?php
// PHP Proxy Loader: proxy_loader.php - FINAL Optimized for Active User Tracking (GA4 Fix)

// 1. Tell the browser/client to disconnect immediately (to prevent client-side timeouts)
[span_0](start_span)header("Connection: close");[span_0](end_span)
[span_1](start_span)header("Content-Encoding: none");[span_1](end_span)
header("Content-Length: 1"); 
header("Content-Type: text/plain");

// Send minimal response back to the client immediately
ob_start();
echo '1'; 
$size = ob_get_length();
[span_2](start_span)header("Content-Length: $size");[span_2](end_span)
ob_end_flush();
flush();
// The browser is disconnected, but the PHP script continues execution in the background for 30 seconds.

// 2. Continue execution (The cURL process runs in the background)
[span_3](start_span)ignore_user_abort(true);[span_3](end_span)
[span_4](start_span)set_time_limit(0);[span_4](end_span)

// --- Capture Parameters ---
$target_url = isset($_GET['target']) ? [span_5](start_span)$_GET['target'] : null;[span_5](end_span)
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? [span_6](start_span)$_GET['auth'] : null;[span_6](end_span)
$unique_id = isset($_GET['uid']) ? [span_7](start_span)$_GET['uid'] : null;[span_7](end_span)
// NEW: Capture unique ID

if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth || !$unique_id) {
    [span_8](start_span)exit();[span_8](end_span)
}

// 3. Initialize PHP cURL
$ch = curl_init();
$proxy_address = "$proxy_ip:$proxy_port";

[span_9](start_span)// --- GA4 Active User FIX: Setting Unique Client ID as a Cookie Header ---[span_9](end_span)
// CRITICAL: We create a unique GA cookie for every hit to register it as a NEW USER.
$ga_cookie_value = "GS1.1." . $unique_id . "." [span_10](start_span). time();[span_10](end_span)

$headers = array(
    // Real-world User-Agent (Essential for not getting flagged)
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36",
    // CRITICAL: Send the unique cookie
    [span_11](start_span)"Cookie: _ga=" . $ga_cookie_value . ";",[span_11](end_span)
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "Accept-Language: en-US,en;q=0.9"
);
[span_12](start_span)curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);[span_12](end_span)
// --------------------------------------------------------------------------

curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
curl_setopt($ch, CURLOPT_HEADER, false);

// --- Proxy Configuration and Authentication ---
[span_13](start_span)curl_setopt($ch, CURLOPT_PROXY, $proxy_address);[span_13](end_span)
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP); 
curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC);

[span_14](start_span)// === Active User Timeout ===[span_14](end_span)
[span_15](start_span)// 30 seconds is necessary for a successful GA4 Session to register and prevent 'Not Set'.[span_15](end_span)
[span_16](start_span)curl_setopt($ch, CURLOPT_TIMEOUT, 30);[span_16](end_span)

// Other necessary settings
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// 4. Execute Proxy Request
[span_17](start_span)curl_exec($ch);[span_17](end_span)
[span_18](start_span)curl_close($ch);[span_18](end_span)
exit(); // End the background script
?>
