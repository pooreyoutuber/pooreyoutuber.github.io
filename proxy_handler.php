<?php
// File: proxy_handler.php

// 1. Inputs lena
$target_url = isset($_GET['target_url']) ? $_GET['target_url'] : '';
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : '';
$proxy_port = isset($_GET['port']) ? $_GET['port'] : '';
$proxy_user = isset($_GET['user']) ? $_GET['user'] : '';
$proxy_pass = isset($_GET['pass']) ? $_GET['pass'] : '';

if (empty($target_url) || empty($proxy_ip)) {
    die("Error: Target URL or Proxy details missing.");
}

// Ensure URL has http/https
if (!preg_match("~^(?:f|ht)tps?://~i", $target_url)) {
    $target_url = "http://" . $target_url;
}

// 2. CURL Request Setup
$ch = curl_init();

// Target URL set karna
curl_setopt($ch, CURLOPT_URL, $target_url);

// Proxy details set karna
$proxy_address = "http://" . $proxy_ip . ":" . $proxy_port;
curl_setopt($ch, CURLOPT_PROXY, $proxy_address);

// Proxy Authentication set karna
$auth = $proxy_user . ":" . $proxy_pass;
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $auth);

// Response ko seedhe output karna (na ki variable mein store karna)
curl_setopt($ch, CURLOPT_RETURNTRANSFER, false); 
curl_setopt($ch, CURLOPT_HEADER, false); 
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // SSL issues avoid karne ke liye (Caution: Security risk)

// 3. Request execute karna
$response = curl_exec($ch);

if (curl_errno($ch)) {
    echo "<h1>Proxy Connection Error!</h1>";
    echo "Curl Error: " . curl_error($ch) . "<br>";
    echo "Target: " . htmlspecialchars($target_url) . "<br>";
    echo "Proxy Used: " . $proxy_address;
}

// 4. CURL band karna
curl_close($ch);

// Note: Output abhi bhi thoda messy ho sakta hai kyuki hum HTML/CSS/JS links ko modify nahi kar rahe hain. 
// Advanced proxy ke liye content ko parse karna padta hai.
?>
