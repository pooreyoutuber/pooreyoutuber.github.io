<?php
// index.php - Final Simple Croxyproxy Style Tool (HTML + PHP)

// ----------------------------------------------------------------------
// 1. CRITICAL: PROXY AUTHENTICATION 
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

// Add http:// if missing (cURL requires a protocol)
if (!empty($target_url) && !preg_match("~^https?://~i", $target_url)) {
    $target_url = "http://" . $target_url;
}

// ----------------------------------------------------------------------
// 3. HOME PAGE UI (If no URL is provided, display the form)
// ----------------------------------------------------------------------
if (empty($target_url)) {
    header('Content-Type: text/html');
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Anonymous Proxy Browser</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Inter', system-ui; background: #f6f8fb; text-align: center; padding-top: 100px; }
            .main-box { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.1); max-width: 700px; margin: auto; }
            h1 { color: #0f4f7f; margin-bottom: 20px; }
            form { display: flex; gap: 10px; justify-content: center; }
            input[type="text"] { flex: 1; padding: 15px; border-radius: 8px; border: 2px solid #ccc; font-size: 18px; outline: none; }
            button { padding: 15px 30px; background-color: #0ea5e9; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: background-color 0.2s; }
            button:hover { background: #0c8cd8; }
            .note { margin-top: 30px; font-size: 14px; color: #6b7280; }
        </style>
    </head>
    <body>
        <div class="main-box">
            <h1>🚀 Anonymous Web Browser</h1>
            <p>Enter the URL to load it anonymously through your Rotating Proxy.</p>
            
            <form action="index.php" method="GET"> 
                <input type="text" name="url" placeholder="Enter full URL (e.g., yourwebsite.com)" required>
                <button type="submit">Go!</button>
            </form>
            
            <p class="note">
                Using Rotating Proxy: <?php echo $PROXY_HOST; ?>. This content will load directly in your browser.
            </p>
        </div>
    </body>
    </html>
    <?php
    exit();
}

// ----------------------------------------------------------------------
// 4. CURL SETUP AND EXECUTION
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
curl_setopt($ch, CURLOPT_TIMEOUT, 60); 

$content = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// ----------------------------------------------------------------------
// 5. OUTPUT CONTENT
// ----------------------------------------------------------------------
if ($content === false || $http_code >= 400) {
    header('Content-Type: text/html');
    echo "<h1 style='color:red; text-align:center; padding-top:50px;'>Error loading content ($http_code)</h1>";
    echo "<p style='text-align:center;'>Could not load the URL: " . htmlspecialchars($target_url) . "</p>";
    echo "<p style='text-align:center;'>Reason: " . ($content === false ? "cURL Error: " . $error : "HTTP Error or Proxy Block. (Check your proxy balance/status)") . "</p>";
} else {
    // CRITICAL: Set content type to display the page, not download the file
    header('Content-Type: text/html');
    
    // Inject a top bar with the proxy URL and close button
    $top_bar = '<div style="background:#dc3545; color:white; padding:8px 15px; font-family:Arial; font-size:14px; position:sticky; top:0; z-index:99999; display:flex; justify-content:space-between; align-items:center;">'
             . '<span>PROXY BROWSER: ' . htmlspecialchars($target_url) . '</span>'
             . '<a href="index.php" style="color:#fff; text-decoration:none; background:#c82333; padding:5px 10px; border-radius:4px;">[X] Close Proxy</a>'
             . '</div>';

    // Insert the top bar after the body tag for consistent display
    $content = preg_replace('/<body[^>]*>/i', '$0' . $top_bar, $content, 1);
    
    echo $content;
}
?>
