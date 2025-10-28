<?php
// proxy_loader.php — simple secure backend that accepts proxy ip:port from frontend
// WARNING: Use only on sites you own or have permission to test.

$API_USER = "admin";      // change
$API_PASS = "secure123";  // change

// Basic auth check
if (!isset($_SERVER['PHP_AUTH_USER'])) {
    header('WWW-Authenticate: Basic realm="Protected"');
    header('HTTP/1.0 401 Unauthorized');
    echo "Auth required.";
    exit;
}
if ($_SERVER['PHP_AUTH_USER'] !== $API_USER || $_SERVER['PHP_AUTH_PW'] !== $API_PASS) {
    header('HTTP/1.0 403 Forbidden');
    echo "Invalid credentials.";
    exit;
}

// Immediately respond and let PHP continue in background
header('Connection: close');
ignore_user_abort(true);
ob_start();
echo json_encode(['status'=>'accepted']);
$size = ob_get_length();
header("Content-Length: $size");
ob_end_flush();
flush();
if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();

// Get params
$target_url = $_GET['url'] ?? '';
$proxy_input = $_GET['proxy'] ?? ''; // expected "ip:port" from frontend
$slot = isset($_GET['slot']) ? intval($_GET['slot']) : 0;

if (!$target_url) {
    // nothing to do
    exit;
}

// Normalize proxy_input
$proxy_input = trim($proxy_input);

// Load proxy list (server-side)
$path = __DIR__ . '/static_proxies.json';
if (!file_exists($path)) exit;
$proxy_list = json_decode(file_get_contents($path), true);

// Find the proxy entry by ip:port
$matched = null;
foreach ($proxy_list as $p) {
    $candidate = $p['ip'] . ':' . $p['port'];
    if ($candidate === $proxy_input) {
        $matched = $p;
        break;
    }
}

// If user provided empty proxy_input or not found, choose by slot index as fallback
if (!$matched) {
    $matched = $proxy_list[$slot % count($proxy_list)];
}

// Build proxy address & auth
$proxy_addr = $matched['ip'] . ':' . $matched['port'];
$proxy_user = $matched['user'] ?? '';
$proxy_pass = $matched['pass'] ?? '';
$proxy_auth = $proxy_user . ':' . $proxy_pass;

// Prepare cURL
$ch = curl_init();
$unique_id = substr(md5(uniqid('', true)), 0, 10);
$ua_list = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; rv:122.0) Gecko/20100101 Firefox/122.0"
];
$ua = $ua_list[array_rand($ua_list)];

// Add small random delay to look like natural traffic
usleep(rand(200000, 800000)); // 0.2s - 0.8s

curl_setopt_array($ch, [
    CURLOPT_URL => $target_url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_PROXY => $proxy_addr,
    CURLOPT_PROXYUSERPWD => $proxy_auth,
    CURLOPT_HTTPHEADER => [
        "User-Agent: $ua",
        "Accept-Language: en-US,en;q=0.9",
        "Cookie: _ga=GS1.1.$unique_id." . time()
    ],
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_TIMEOUT => 35,
]);

// Execute (we don't use the result)
curl_exec($ch);
$error = curl_error($ch);
curl_close($ch);

// Logging (server-side only)
$log = date("Y-m-d H:i:s") . " | slot:$slot | proxy:$proxy_addr | target:$target_url | result:" . ($error?:'OK') . PHP_EOL;
file_put_contents(__DIR__.'/log.txt', $log, FILE_APPEND);

exit;
?>
