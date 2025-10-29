<?php
header('Content-Type: application/json; charset=utf-8');

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

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || empty($data['url'])) {
  echo json_encode(['ok'=>false, 'error'=>'Missing URL']);
  exit;
}

$url = $data['url'];
$index = intval($data['proxyIndex']);
if ($index < 0 || $index >= count($PROXIES)) $index = 0;
$p = $PROXIES[$index];

$ch = curl_init();
curl_setopt_array($ch, [
  CURLOPT_URL => $url,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_TIMEOUT => 20,
  CURLOPT_PROXY => $p['server'],
  CURLOPT_PROXYUSERPWD => "{$p['username']}:{$p['password']}",
  CURLOPT_PROXYTYPE => CURLPROXY_HTTP,
  CURLOPT_HTTPPROXYTUNNEL => true,
  CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/117 Safari/537.36'
]);
$content = curl_exec($ch);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
  echo json_encode(['ok'=>false, 'error'=>$error]);
  exit;
}

// IP check through proxy
$ch2 = curl_init('https://api.ipify.org?format=json');
curl_setopt_array($ch2, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_PROXY => $p['server'],
  CURLOPT_PROXYUSERPWD => "{$p['username']}:{$p['password']}",
  CURLOPT_PROXYTYPE => CURLPROXY_HTTP,
  CURLOPT_HTTPPROXYTUNNEL => true
]);
$ipResp = curl_exec($ch2);
$ipInfo = json_decode($ipResp, true);
curl_close($ch2);

$banner = "<div style='background:#0ea5e9;color:white;padding:8px;font-weight:bold;'>".
          "Proxy: {$p['server']} | IP: ".($ipInfo['ip'] ?? 'Unknown').
          "</div>";

if (stripos($content, '<body') !== false)
  $content = preg_replace('/<body([^>]*)>/i', '<body$1>'.$banner, $content, 1);
else
  $content = $banner . $content;

echo json_encode(['ok'=>true, 'ipInfo'=>$ipInfo, 'content'=>$content]);
