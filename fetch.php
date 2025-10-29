<?php
// fetch.php - receives { url, proxyIndex, holdMs } and fetches target via the chosen proxy
// Security note: This script fetches arbitrary URLs. In a real deployment add allowlist / authentication.

header('Content-Type: application/json; charset=utf-8');

// ---------- YOUR PROXY CREDENTIALS (keep here, not in proxies.php) ----------
$PROXIES = [
  // server, username, password
  ['server' => '142.111.48.253:7030', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i'],
  ['server' => '31.59.20.176:6754', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i'],
  ['server' => '23.95.150.145:6114', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i'],
  ['server' => '198.23.239.134:6540', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i'],
  ['server' => '45.38.107.97:6014', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i'],
  ['server' => '107.172.163.27:6543', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i'],
  ['server' => '64.137.96.74:6641', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i'],
  ['server' => '216.10.27.159:6837', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i'],
  ['server' => '142.111.67.146:5611', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i'],
  ['server' => '142.147.128.93:6593', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i'],
];
// -------------------------------------------------------------------------

// Read incoming JSON
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data || empty($data['url'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing URL']);
    exit;
}

$url = $data['url'];
$proxyIndex = isset($data['proxyIndex']) ? intval($data['proxyIndex']) : 0;
$holdMs = isset($data['holdMs']) ? intval($data['holdMs']) : 30000;

if ($proxyIndex < 0 || $proxyIndex >= count($PROXIES)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid proxyIndex']);
    exit;
}

$proxy = $PROXIES[$proxyIndex];
$proxyAddress = $proxy['server'];
$proxyAuth = $proxy['username'] . ':' . $proxy['password'];

// Basic URL validate
if (!filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid URL']);
    exit;
}

// Small security: prevent internal hosts (optional but recommended)
$host = parse_url($url, PHP_URL_HOST);
$forbidden = ['127.0.0.1', 'localhost'];
foreach ($forbidden as $f) {
    if (stripos($host, $f) !== false) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Fetching internal hosts is not allowed']);
        exit;
    }
}

// Prepare cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HEADER, false);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_TIMEOUT, 25);

// Proxy settings: HTTP proxy (if socks5, change proxy type and prefix)
curl_setopt($ch, CURLOPT_PROXY, $proxyAddress);
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxyAuth);
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP);
// Optional tunneling for HTTPS
curl_setopt($ch, CURLOPT_HTTPPROXYTUNNEL, true);

// Set some browser-like headers
$headers = [
  'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
  'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language: en-US,en;q=0.9'
];
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Execute
$response = curl_exec($ch);
$err = curl_error($ch);
$info = curl_getinfo($ch);
curl_close($ch);

if ($err) {
    http_response_code(500);
    echo json_encode(['ok'=>false, 'error'=>'cURL error: '.$err, 'info'=>$info]);
    exit;
}

// Optional: verify outgoing IP (via the proxy) by calling ipify through proxy too
$ipInfo = ['error' => 'unknown'];
$ch2 = curl_init();
curl_setopt($ch2, CURLOPT_URL, 'https://api.ipify.org?format=json');
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_PROXY, $proxyAddress);
curl_setopt($ch2, CURLOPT_PROXYUSERPWD, $proxyAuth);
curl_setopt($ch2, CURLOPT_PROXYTYPE, CURLPROXY_HTTP);
curl_setopt($ch2, CURLOPT_HTTPPROXYTUNNEL, true);
curl_setopt($ch2, CURLOPT_TIMEOUT, 10);
$ipResp = curl_exec($ch2);
if ($ipResp && !curl_errno($ch2)) {
    $json = json_decode($ipResp, true);
    if ($json) $ipInfo = $json;
    else $ipInfo = ['raw' => $ipResp];
} else {
    $ipInfo = ['error' => 'ip check failed: ' . curl_error($ch2)];
}
curl_close($ch2);

// Now sanitize / rewrite some relative URLs so page loads in iframe better
// Simple approach: convert relative href/src to absolute using target base
$base = (parse_url($url, PHP_URL_SCHEME) ?: 'http') . '://' . (parse_url($url, PHP_URL_HOST) ?: '');
$basePath = rtrim(dirname(parse_url($url, PHP_URL_PATH) ?? '/'), '/') . '/';

// naive replacements (works for many simple pages)
$sanitized = $response;

// make href/src starting with '/' absolute
$sanitized = preg_replace_callback('#(href|src)=([\'"])(\/[^\'"]*)\2#i', function($m) use ($base){
    return $m[1] . '=' . $m[2] . $base . $m[3] . $m[2];
}, $sanitized);

// make href/src that are relative (not starting with http or /) absolute
$sanitized = preg_replace_callback('#(href|src)=([\'"])(?!https?:\/\/|\/)([^\'"]+)\2#i', function($m) use ($base, $basePath){
    return $m[1] . '=' . $m[2] . $base . $basePath . $m[3] . $m[2];
}, $sanitized);

// Inject a small banner at top to show proxy IP and info
$banner = "<div style='background:#0ea5e9;color:#fff;padding:8px 12px;font-weight:700;'>".
          "Fetched via proxy: {$proxyAddress} &nbsp; | &nbsp; Outgoing IP: " . (isset($ipInfo['ip']) ? $ipInfo['ip'] : htmlspecialchars(json_encode($ipInfo))) .
          "</div>";

// Try to insert banner after <body> tag
if (stripos($sanitized, '<body') !== false) {
    $sanitized = preg_replace('/<body([^>]*)>/i', '<body$1>' . $banner, $sanitized, 1);
} else {
    $sanitized = $banner . $sanitized;
}

// Return JSON with content (inline mode) and ipInfo
echo json_encode(['ok'=>true, 'ipInfo'=>$ipInfo, 'info'=>$info, 'content'=>$sanitized], JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
