<?php
/**
 * proxy_loader.php — Secure backend proxy executor for Website Booster
 */

$username = "admin";       // login for security
$password = "secure123";   // change this

// --- Basic Auth ---
if (!isset($_SERVER['PHP_AUTH_USER'])) {
    header('WWW-Authenticate: Basic realm="Protected Area"');
    header('HTTP/1.0 401 Unauthorized');
    echo "Auth required.";
    exit;
}
if ($_SERVER['PHP_AUTH_USER'] !== $username || $_SERVER['PHP_AUTH_PW'] !== $password) {
    header('HTTP/1.0 403 Forbidden');
    echo "Invalid credentials.";
    exit;
}

// --- Early close connection ---
header('Connection: close');
ignore_user_abort(true);
ob_start();
echo 'OK';
$size = ob_get_length();
header("Content-Length: $size");
ob_end_flush();
flush();
if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();

// --- Get parameters ---
$target_url = $_GET['url'] ?? '';
$slot = $_GET['slot'] ?? rand(0,9);
if (!$target_url) exit;

// --- Load proxies ---
$proxyList = json_decode(file_get_contents(__DIR__.'/static_proxies.json'), true);
$proxy = $proxyList[$slot % count($proxyList)];

// --- Proxy credentials (from provider) ---
$proxy_user = 'bqctypvz';
$proxy_pass = '399xb3kxqv6i';
$proxy_auth = "$proxy_user:$proxy_pass";
$proxy_addr = $proxy['ip'] . ':' . $proxy['port'];

// --- Random UA & Cookie ---
$unique_id = substr(md5(uniqid()),0,8);
$userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; rv:122.0) Gecko/20100101 Firefox/122.0"
];
$ua = $userAgents[array_rand($userAgents)];

// --- Curl setup ---
$ch = curl_init();
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

curl_exec($ch);
$error = curl_error($ch);
curl_close($ch);

// --- Logging (optional) ---
$log = date("Y-m-d H:i:s")." | Slot $slot | {$proxy['country']} | {$proxy_addr} | ".($error ?: 'OK')."\n";
file_put_contents(__DIR__.'/log.txt', $log, FILE_APPEND);
?>
