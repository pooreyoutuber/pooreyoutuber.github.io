<?php
// proxy_loader.php - Proxy Injection for iFrames (Final Code)

// ----------------------------------------------------------------------
// 1. CRITICAL: PROXY AUTHENTICATION
// ----------------------------------------------------------------------
// आपको यहाँ अपने प्रॉक्सी क्रेडेंशियल डालने होंगे जो JS में हैं
$PROXY_USER = "bqctypvz";
$PROXY_PASS = "399xb3kxqv6i";
$PROXY_AUTH = $PROXY_USER . ":" . $PROXY_PASS;

// ----------------------------------------------------------------------
// 2. GET URL PARAMETERS
// ----------------------------------------------------------------------
// 'target' (The URL to load, e.g., https://yourwebsite.com)
$target_url = isset($_GET['target']) ? $_GET['target'] : null;

// 'ip' and 'port' of the specific proxy to use for this slot
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;

if (!$target_url || !$proxy_ip || !$proxy_port) {
    // Basic error handling for the iFrame
    die("<h1>Error: Missing URL or Proxy details.</h1><p>Please check the input in the main tool.</p>");
}

$proxy_address = $proxy_ip . ":" . $proxy_port;

// ----------------------------------------------------------------------
// 3. CURL SETUP AND EXECUTION
// ----------------------------------------------------------------------
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, false); // Do not output headers
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); // Follow redirects

// Set Proxy options
curl_setopt($ch, CURLOPT_PROXY, $proxy_address); // Use the specific proxy IP:Port
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $PROXY_AUTH); // Use proxy credentials
// Spoof User Agent
curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36");
// Set a timeout to prevent infinite loading
curl_setopt($ch, CURLOPT_TIMEOUT, 30); 

$content = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

// ----------------------------------------------------------------------
// 4. OUTPUT CONTENT
// ----------------------------------------------------------------------
if ($content === false || $http_code >= 400 || !str_contains($content_type, 'text/html')) {
    // If loading failed, show an error message inside the iFrame
    echo "<h1>Error loading content ($http_code)</h1>";
    echo "<p>Could not load the URL: " . htmlspecialchars($target_url) . "</p>";
    echo "<p>Reason: Proxy blocked or URL inaccessible.</p>";
} else {
    // Successfully fetched content: send the correct header and output HTML
    header('Content-Type: text/html');
    echo $content;
}
?>
