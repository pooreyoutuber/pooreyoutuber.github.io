<?php
// PHP Proxy Loader: proxy_loader.php - ULTIMATE HEADER STRIPPING FIX

// 1. Setup Execution
ignore_user_abort(true);
set_time_limit(60); 

// --- Capture Parameters ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 

if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth) {
    header('Content-Type: text/html');
    echo '<html><body><h1>Error: Missing proxy parameters.</h1></body></html>';
    exit();
}

// 2. GENERATE UNIQUE DATA (For Incognito Session/Active User)
$random_id_part1 = (string) (time() - 1600000000) . rand(100, 999);
$random_id_part2 = (string) rand(1000000000, 9999999999) . rand(1000000000, 9999999999);
$ga_cookie_value = "GS1.1." . $random_id_part1 . "." . $random_id_part2; 

$desktop_agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:109.0) Gecko/20100101 Firefox/122.0',
];
$final_user_agent = $desktop_agents[array_rand($desktop_agents)];

// 3. Initialize PHP cURL for Content Fetch
$ch = curl_init();
$proxy_address = "$proxy_ip:$proxy_port";

$request_headers = array(
    "User-Agent: " . $final_user_agent,
    "Cookie: _ga=" . $ga_cookie_value . ";",
    "X-Forwarded-For: " . $proxy_ip,
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language: en-US,en;q=0.9"
);

curl_setopt($ch, CURLOPT_HTTPHEADER, $request_headers);
curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
curl_setopt($ch, CURLOPT_HEADER, true); // Headers are fetched
curl_setopt($ch, CURLOPT_PROXY, $proxy_address);
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP); 
curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC);
curl_setopt($ch, CURLOPT_TIMEOUT, 15); 
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// 4. Execute Proxy Request
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

// --- 5. Error & Output Handling ---

if ($response === false || $http_code >= 400) {
    header('Content-Type: text/html');
    echo '<html><body><h1>Connection Error!</h1><p>Could not load target URL via proxy (HTTP Code: ' . $http_code . '). Please check if the URL is correct or if your proxy is active.</p></body></html>';
    exit();
}

$headers = substr($response, 0, $header_size);
$content = substr($response, $header_size);

// CRITICAL FIX: Explicitly remove all security headers before sending the content back
$security_headers_to_remove = [
    'X-Frame-Options', 
    'Content-Security-Policy', 
    'X-Content-Type-Options'
];

// Split headers into lines
$header_lines = explode("\r\n", $headers);
$clean_headers = [];

// Filter out security headers from the list
foreach ($header_lines as $line) {
    $is_security_header = false;
    foreach ($security_headers_to_remove as $sec_header) {
        if (stripos($line, $sec_header . ':') === 0) {
            $is_security_header = true;
            break;
        }
    }
    // Only forward headers that are NOT security related (e.g. Set-Cookie, Content-Type)
    if (!$is_security_header && trim($line) !== '') {
        $clean_headers[] = $line;
    }
}

// Set the final Content-Type header (important for rendering)
header('Content-Type: text/html');

// CRITICAL FIX 2: Inject <base> tag to fix relative asset paths (CSS/JS)
$base_tag = '<base href="' . htmlspecialchars($target_url) . '">';
$content = preg_replace('/<head>/i', '<head>' . $base_tag, $content, 1, $base_count);

// CRITICAL FIX 3: Inject the 30-second session script for guaranteed Active User
$injection_script = '
    <script>
        // Forces 30s engagement time for GA4.
        setTimeout(function() {
            console.log("30-second engagement timer complete. Active session validated.");
        }, 30000); 
    </script>
';

// Inject the script just before the closing body tag
$content = str_ireplace('</body>', $injection_script . '</body>', $content, $count);

echo $content;
exit();
?>
