<?php
// fetch.php
header('Content-Type: application/json; charset=utf-8');

// --- Proxies with credentials (keep safe; do NOT commit publicly) ---
$PROXIES = [
  ['server' => '142.111.48.253:7030', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i'],
  ['server' => '31.59.20.176:6754', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i'],
  ['server' => '23.95.150.145:6114', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i'],
  ['server' => '198.23.239.134:6540', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i'],
  ['server' => '45.38.107.97:6014', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i'],
  ['server' => '107.172.163.27:6543', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i'],
  ['server' => '64.137.96.74:6641', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i'],
  ['server' => '216.10.27.159:6837', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i'],
  ['server' => '142.111.67.146:5611', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i'],
  ['server' => '142.147.128.93:6593', 'username' => 'bqctypvz', 'password' => '399xb3kxqv6i']
];

// read request
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!$data || empty($data['url'])) {
    http_response_code(400);
    echo json_encode(['ok'=>false, 'error'=>'Missing URL in request']);
    exit;
}

$url = $data['url'];
$index = isset($data['proxyIndex']) ? intval($data['proxyIndex']) : 0;
if ($index < 0 || $index >= count($PROXIES)) $index = 0;
$proxy = $PROXIES[$index];

// validate url
if (!filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo json_encode(['ok'=>false, 'error'=>'Invalid URL']);
    exit;
}

// prepare cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HEADER, false);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_TIMEOUT, 25);

// proxy settings
curl_setopt($ch, CURLOPT_PROXY, $proxy['server']);
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy['username'] . ':' . $proxy['password']);
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP);
curl_setopt($ch, CURLOPT_HTTPPROXYTUNNEL, true);

// headers
$headers = [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117 Safari/537.36',
    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language: en-US,en;q=0.9'
];
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);
$curlErr = curl_error($ch);
$info = curl_getinfo($ch);
curl_close($ch);

if ($curlErr) {
    http_response_code(500);
    echo json_encode(['ok'=>false, 'error'=>'cURL error: '.$curlErr, 'info'=>$info]);
    exit;
}

// ip check via proxy (best-effort)
$ipInfo = ['error'=>'unknown'];
$ch2 = curl_init('https://api.ipify.org?format=json');
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_PROXY, $proxy['server']);
curl_setopt($ch2, CURLOPT_PROXYUSERPWD, $proxy['username'] . ':' . $proxy['password']);
curl_setopt($ch2, CURLOPT_PROXYTYPE, CURLPROXY_HTTP);
curl_setopt($ch2, CURLOPT_HTTPPROXYTUNNEL, true);
curl_setopt($ch2, CURLOPT_TIMEOUT, 8);
$ipResp = curl_exec($ch2);
if ($ipResp && !curl_errno($ch2)) {
    $j = json_decode($ipResp, true);
    if ($j) $ipInfo = $j;
    else $ipInfo = ['raw' => substr($ipResp,0,200)];
} else {
    $ipInfo = ['error' => 'ip check failed: ' . curl_error($ch2)];
}
curl_close($ch2);

// insert banner showing proxy and ip
$banner = "<div style='background:#0ea5e9;color:#fff;padding:8px 12px;font-weight:700;'>"
        . "Fetched via proxy: {$proxy['server']}  |  Outgoing IP: " . htmlspecialchars($ipInfo['ip'] ?? json_encode($ipInfo))
        . "</div>";

if (stripos($response, '<body') !== false) {
    $response = preg_replace('/<body([^>]*)>/i', '<body$1>'.$banner, $response, 1);
} else {
    $response = $banner . $response;
}

// return JSON
echo json_encode(['ok'=>true, 'ipInfo'=>$ipInfo, 'info'=>$info, 'content'=>$response], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
