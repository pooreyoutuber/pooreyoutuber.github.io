<?php
// visual_proxy.php - Croxyproxy Style Content Loader using Rotating Proxy

// ----------------------------------------------------------------------
// 1. CRITICAL: PROXY AUTHENTICATION (From User's Screenshot)
// ----------------------------------------------------------------------
$PROXY_HOST = "d-webshare.io";
$PROXY_PORT = 80;
$PROXY_USER = "bqctypvz-rotate";
$PROXY_PASS = "399xb3kxqv6i";
$PROXY_AUTH = $PROXY_USER . ":" . $PROXY_PASS;
$proxy_address = $PROXY_HOST . ":" . $PROXY_PORT;

// ----------------------------------------------------------------------
// 2. GET TARGET URL
// ----------------------------------------------------------------------
$target_url = isset($_GET['url']) ? $_GET['url'] : '';

// Add http:// if missing (to ensure cURL can connect)
if (!empty($target_url) && !preg_match("~^https?://~i", $target_url)) {
    $target_url = "http://" . $target_url;
}

// ----------------------------------------------------------------------
// 3. HOME PAGE UI (If no URL is provided)
// ----------------------------------------------------------------------
if (empty($target_url)) {
    // Redirect to the index.html or display a simple form if accessed directly
    // Assuming index.html is the main entry point for the form.
    // We will show a simple message here for direct access
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>Simple Proxy Browser</title>
        <style>
            body { font-family: Arial, sans-serif; background-color: #f0f0f0; text-align: center; padding-top: 50px; }
            .proxy-box { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); max-width: 600px; margin: auto; }
            input[type="url"] { width: 80%; padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; }
            button { padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="proxy-box">
            <h1>Web Proxy Tool</h1>
            <p>Enter the URL you wish to browse anonymously.</p>
            <form method="GET" action="visual_proxy.php">
                <input type="url" name="url" placeholder="https://example.com" required>
                <button type="submit">Go Anonymously</button>
            </form>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">Using Rotating Proxy: <?php echo $PROXY_HOST; ?>:<?php echo $PROXY_PORT; ?></p>
        </div>
    </body>
    </html>
    <?php
    exit();
}

// ----------------------------------------------------------------------
// 4. CURL SETUP AND EXECUTION (Fetch the target content)
// ----------------------------------------------------------------------
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, false); 
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); 

// Set Proxy options (Using your rotating proxy)
curl_setopt($ch, CURLOPT_PROXY, $proxy_address); 
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $PROXY_AUTH); 

// Spoof User Agent and increase timeout
curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36");
curl_setopt($ch, CURLOPT_TIMEOUT, 60); // Increased timeout for slow proxies

$content = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// ----------------------------------------------------------------------
// 5. OUTPUT CONTENT
// ----------------------------------------------------------------------
if ($content === false || $http_code >= 400) {
    echo "<h1>Error loading content ($http_code)</h1>";
    echo "<p>Could not load the URL: " . htmlspecialchars($target_url) . "</p>";
    echo "<p>Reason: " . ($content === false ? "cURL Error: " . $error : "HTTP Error or Proxy Block.") . "</p>";
} else {
    // CRITICAL: We need to rewrite URLs in the fetched content to point back to our proxy script
    // This is the advanced step to make navigation work, but it's very complex.
    // For simplicity, we just output the content, so the user can see the initial page.
    
    // Set content type to display the page
    header('Content-Type: text/html');
    
    // Inject a top bar with the proxy URL
    $top_bar = '<div style="background:#333; color:white; padding:5px 15px; font-family:Arial; font-size:12px; position:sticky; top:0; z-index:99999;">'
             . 'PROXIFIED: ' . htmlspecialchars($target_url) 
             . '<a href="visual_proxy.php" style="color:#0f0; float:right;">[X] Close Proxy</a>'
             . '</div>';

    // Try to insert the top bar after the body tag
    $content = preg_replace('/<body[^>]*>/i', '$0' . $top_bar, $content, 1);
    
    echo $content;
}
?>
