<?php
// proxy_loader.php - Fetches content via proxy, rewrites relative URLs, and outputs as Base64.

// 1. Capture Parameters
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null; 
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null; 
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 

if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth) {
    die("Error: Missing proxy parameters.");
}

// Extract base parts of the target URL for rewriting (e.g., https://example.com)
$url_parts = parse_url($target_url);
$base_scheme = isset($url_parts['scheme']) ? $url_parts['scheme'] : 'http';
$base_host = isset($url_parts['host']) ? $url_parts['host'] : '';
$base_url = $base_scheme . '://' . $base_host;

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
    // 4. URL Rewriting (CRITICAL FIX FOR BROKEN LAYOUT)
    if (!empty($body)) {
        // Suppress warnings for broken HTML from external sources
        libxml_use_internal_errors(true); 
        $dom = new DOMDocument();
        // The '@' suppresses a PHP warning if HTML is malformed
        @$dom->loadHTML($body); 
        libxml_clear_errors();
        
        // Tags to check and the attribute to rewrite (links, images, CSS, JS)
        $tags = ['a' => 'href', 'img' => 'src', 'link' => 'href', 'script' => 'src'];
        
        foreach ($tags as $tag => $attribute) {
            $elements = $dom->getElementsByTagName($tag);
            foreach ($elements as $element) {
                $url = $element->getAttribute($attribute);
                if (!empty($url)) {
                    // Check if URL is relative (does not start with http, https, or //)
                    if (strpos($url, 'http') === false && strpos($url, '//') === false) {
                        
                        // Prepend the base URL for paths starting with a slash: /css/style.css -> https://example.com/css/style.css
                        if (substr($url, 0, 1) == '/') {
                            $new_url = $base_url . $url;
                        } else {
                            // For true relative paths (style.css), we assume they are in the root directory for simplicity here
                            $new_url = $base_url . '/' . $url;
                        }
                        
                        // Set the rewritten, absolute URL
                        $element->setAttribute($attribute, $new_url);
                    }
                    // For links starting with '//' (protocol-relative), add the scheme
                     elseif (substr($url, 0, 2) == '//') {
                        $element->setAttribute($attribute, $base_scheme . ':' . $url);
                    }
                    // Absolute links (http/https) are left as is
                }
            }
        }
        
        // Attempt to get the modified HTML
        $modified_body = $dom->saveHTML();
        if ($modified_body !== false) {
             $body = $modified_body;
        }
    }

    // 5. Base64 Encode the fetched content (with rewritten URLs)
    $output = base64_encode($body);
}

// Output the Base64 string or error message directly
header('Content-Type: text/plain'); 
echo $output;
?>
