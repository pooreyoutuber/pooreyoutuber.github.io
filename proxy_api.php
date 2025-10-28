<?php
// proxy_api.php - White Screen Fix: Removed PHP background execution logic

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
    if ($mode == 'session') {
        // 'session' mode mein, parameters missing hone par chupchaap exit ho jao
        exit(); 
    }
    die("Error: Missing proxy parameters.");
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
            // Content stripping and Base64 encoding for iframe (Unchanged)
            $url_parts = parse_url($target_url);
            $base_scheme = isset($url_parts['scheme']) ? $url_parts['scheme'] : 'http';
            $base_host = isset($url_parts['host']) ? $url_parts['host'] : '';
            $base_path = $base_scheme . '://' . $base_host . '/';

            if (!empty($body)) {
                $body = preg_replace('/<meta http-equiv=["\'](X-Frame-Options|Content-Security-Policy)["\'].*?>/i', '', $body);
                $body = preg_replace('/<script\b[^>]*>([\s\S]*?)<\/script>/i', '', $body);
                $body = preg_replace('/ on[a-z]+=["\'][^"\']*["\']/i', '', $body);
                $body = preg_replace('/if ?\( ?self\.location ?!= ?top\.location ?\).*;?/i', '', $body);
                
                $base_tag = '<base href="' . $base_path . '">';
                $body = preg_replace('/<head>/i', '<head>' . $base_tag, $body, 1);
            }

            $output = base64_encode($body);
        }

        header('Content-Type: text/plain'); 
        echo $output;
        break;

    case 'session':
        // ===============================================
        // MODE: SESSION (White Screen Fix: Fast Hit)
        // ===============================================

        // 💡 FIX: Removed all headers/functions that cause server background execution to fail (like Connection: close, flush(), etc.)
        // Now, this script runs quickly and returns immediately.
        
        // cURL timeout set to 5 seconds. This is just an immediate page hit (view count).
        curl_setopt($ch, CURLOPT_TIMEOUT, 5); 
        
        // Only fetch headers, not the full body, to make it faster
        curl_setopt($ch, CURLOPT_NOBODY, true);

        // Execute Proxy Request (The actual view hit)
        curl_exec($ch); 
        curl_close($ch);
        
        // Send a simple 'OK' and exit immediately.
        // The 30-second waiting period for GA session will now be managed by the JavaScript in index.html.
        echo "OK";
        exit();
        break;

    default:
        header('Content-Type: text/plain'); 
        echo "Error: Invalid or missing mode parameter.";
        break;
}
?>
