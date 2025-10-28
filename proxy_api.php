<?php
// proxy_api.php - Handles both 'content' (iframe) loading and 'session' (background hit) functionality.

// 1. Get Mode
$mode = isset($_GET['mode']) ? $_GET['mode'] : null;

// --- Common Parameter Capture ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null; 
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null; 
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 
$unique_id = isset($_GET['uid']) ? $_GET['uid'] : null; 
$custom_user_agent = isset($_GET['ua']) ? $_GET['ua'] : 'Mozilla/5.0 (Default)'; 

if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth) {
    if ($mode == 'content') {
        die("Error: Missing proxy parameters.");
    } else {
        exit(); 
    }
}

// 2. Initialize cURL common settings
$ch = curl_init();
$proxy_address = "$proxy_ip:$proxy_port";
// GA4 Active User FIX: Setting Unique Client ID as a Cookie Header
$ga_cookie_value = "GS1.1." . $unique_id . "." . time(); 

$headers = array(
    "User-Agent: " . $custom_user_agent, 
    "Cookie: _ga=" . $ga_cookie_value . ";",
    "Accept-Language: en-US,en;q=0.9",
    // Simulates a real click from Google Search
    "Referer: https://www.google.com/search?q=" . urlencode(parse_url($target_url, PHP_URL_HOST))
);

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
curl_setopt($ch, CURLOPT_HEADER, false);

// Proxy Configuration and Authentication
curl_setopt($ch, CURLOPT_PROXY, $proxy_address);
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP); 
curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC); 

// Standard settings
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);


// --- 3. Logic based on Mode ---
switch ($mode) {
    case 'content':
        // ===============================================
        // MODE: CONTENT (For iframe display - Short Timeout)
        // ===============================================
        curl_setopt($ch, CURLOPT_TIMEOUT, 15); // Shorter timeout for faster iframe load
        
        $body = curl_exec($ch);
        curl_close($ch);

        if ($body === false) {
            $error_message = curl_error($ch);
            $output = "Error: Proxy Load Failure. cURL Error: " . htmlspecialchars($error_message);
        } else {
            // Extract base URL for the <base> tag
            $url_parts = parse_url($target_url);
            $base_scheme = isset($url_parts['scheme']) ? $url_parts['scheme'] : 'http';
            $base_host = isset($url_parts['host']) ? $url_parts['host'] : '';
            $base_path = $base_scheme . '://' . $base_host . '/';

            // MAXIMUM AGGRESSIVE STRIPPING (Prevent iframe breaking scripts)
            if (!empty($body)) {
                $body = preg_replace('/<meta http-equiv=["\'](X-Frame-Options|Content-Security-Policy)["\'].*?>/i', '', $body);
                $body = preg_replace('/<script\b[^>]*>([\s\S]*?)<\/script>/i', '', $body);
                $body = preg_replace('/ on[a-z]+=["\'][^"\']*["\']/i', '', $body);
                $body = preg_replace('/if ?\( ?self\.location ?!= ?top\.location ?\).*;?/i', '', $body);
                
                // Inject <base> Tag
                $base_tag = '<base href="' . $base_path . '">';
                $body = preg_replace('/<head>/i', '<head>' . $base_tag, $body, 1);
            }

            // Base64 Encode the modified content for iframe
            $output = base64_encode($body);
        }

        header('Content-Type: text/plain'); 
        echo $output;
        break;

    case 'session':
        // ===============================================
        // MODE: SESSION (For background hit - Long Timeout)
        // ===============================================

        // CRITICAL: Immediate Disconnect Logic
        header("Connection: close");
        header("Content-Encoding: none");
        header("Content-Length: 1"); 
        header("Content-Type: text/plain");
        
        // Send minimal response back to the client immediately
        ob_start();
        echo '1'; 
        $size = ob_get_length();
        header("Content-Length: $size");
        ob_end_flush();
        flush();
        // Browser is disconnected, script continues to prevent white screen
        
        ignore_user_abort(true);
        set_time_limit(0); 

        // Set long timeout for background session (30 seconds is the minimum GA4 session)
        curl_setopt($ch, CURLOPT_TIMEOUT, 30); 

        // Execute Proxy Request (The actual view/session hit)
        curl_exec($ch); 
        curl_close($ch);
        
        // Add forced delay (10 to 25s) AFTER fetching the page to guarantee the session count.
        $sleep_time = rand(10, 25);
        sleep($sleep_time); 

        exit();
        break;

    default:
        header('Content-Type: text/plain'); 
        echo "Error: Invalid or missing mode parameter.";
        break;
}
?>
