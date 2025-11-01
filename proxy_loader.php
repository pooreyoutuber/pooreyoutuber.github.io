<?php
// proxy.php — educational proxy loader
error_reporting(0);
set_time_limit(20);
header("Access-Control-Allow-Origin: *");

$url = $_GET['url'] ?? '';
if(!$url){
  echo "No URL provided.";
  exit;
}

// Basic validation (HTTP/HTTPS only)
if(!preg_match('/^https?:\/\//i', $url)){
  echo "Invalid URL format. Please start with http:// or https://";
  exit;
}

// Load website content via cURL
$ch = curl_init();
curl_setopt_array($ch, [
  CURLOPT_URL => $url,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_SSL_VERIFYPEER => false,
  CURLOPT_SSL_VERIFYHOST => false,
  CURLOPT_CONNECTTIMEOUT => 10,
  CURLOPT_TIMEOUT => 20,
  CURLOPT_USERAGENT => "CollegeProxyTool/1.0"
]);

$response = curl_exec($ch);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$err = curl_error($ch);
curl_close($ch);

if($err){
  echo "<h3>Proxy Error:</h3><pre>$err</pre>";
  exit;
}

// Output same content-type as target
if($contentType) header("Content-Type: $contentType");
echo $response;
