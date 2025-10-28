<?php
// PHP Proxy Loader: proxy_loader.php - Optimized for GA4 Engaged Session
// (Requires your GA4 Measurement ID and API Secret)

// -------------------------------------------------------------------------
// *** GA4 Configuration (REQUIRED) ***
// 1. Apni GA4 Property ID yahan daalein (Jaise: G-A1B2C3D4E5)
$GA4_MEASUREMENT_ID = 'G-XXXXXXX'; 
// 2. Apne Data Stream se API Secret lein aur yahan daalein (Jaise: XYZ-abc-123)
$GA4_API_SECRET = 'YOUR_API_SECRET'; 
// -------------------------------------------------------------------------

// 1. Client Disconnect (Browser ko turant disconnect karne ke liye)
header("Connection: close");
header("Content-Encoding: none");
header("Content-Length: 1"); 
header("Content-Type: text/plain");
ob_start();
echo '1'; 
$size = ob_get_length();
header("Content-Length: $size");
ob_end_flush();
flush();
// PHP script background mein chalna jaari rakhta hai.

// 2. Execution Setup
ignore_user_abort(true);
set_time_limit(0); 

// --- Capture Parameters ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 
// uid ab user_pseudo_id ke roop mein istemaal hoga (GA4 Client ID ke samaan)
$user_pseudo_id = isset($_GET['uid']) ? $_GET['uid'] : null; 

if (!$target_url || !$proxy_ip || !$proxy_port || !$proxy_auth || !$user_pseudo_id || !$GA4_MEASUREMENT_ID || !$GA4_API_SECRET) {
    // Agar koi zaroori parameter missing hai, toh exit kar dein
    exit(); 
}

// Proxy Address
$proxy_address = "$proxy_ip:$proxy_port";

// =========================================================================
// FUNCTION 1: Website hit karna (cURL + Proxy)
// Website ko hit karne se aapke proxy ki efficiency pata chalti hai.
// Yeh step GA4 mein views register nahi karega.
// =========================================================================
function hit_website($url, $proxy_address, $proxy_auth, $user_pseudo_id) {
    $ch = curl_init();

    // GA Cookie (Sirf simulation ke liye)
    $ga_cookie_value = "GS1.1." . $user_pseudo_id . "." . time(); 
    
    $headers = array(
        "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
        "Cookie: _ga=" . $ga_cookie_value . "; _ga_ID=" . $user_pseudo_id . ";",
    );

    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
    curl_setopt($ch, CURLOPT_HEADER, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15); // Hit timeout
    
    // Proxy Setup
    curl_setopt($ch, CURLOPT_PROXY, $proxy_address);
    curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
    curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP); 
    curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC); 

    curl_exec($ch);
    curl_close($ch);
}


// =========================================================================
// FUNCTION 2: GA4 Measurement Protocol Call (CRITICAL: GA4 mein view register karega)
// Seedhe GA4 ke servers ko event bhejta hai.
// =========================================================================
function send_ga4_event($event_name, $user_pseudo_id, $measurement_id, $api_secret, $session_id, $engagement_time = 0) {
    $curl_url = "https://www.google-analytics.com/mp/collect?measurement_id={$measurement_id}&api_secret={$api_secret}";

    $payload = [
        'client_id' => $user_pseudo_id, // GA4 mein client_id ka use user_pseudo_id ke roop mein hota hai
        'user_pseudo_id' => $user_pseudo_id,
        'events' => [
            [
                'name' => $event_name,
                'params' => [
                    'session_id' => $session_id,
                    'engagement_time_msec' => $engagement_time, // Engaged Session ke liye zaroori
                    'page_location' => $GLOBALS['target_url'],
                    'page_title' => 'Simulated Page View',
                    'session_engaged' => $event_name === 'user_engagement' ? 1 : 0,
                    '_ss' => $event_name === 'session_start' ? 1 : 0,
                ],
            ],
        ],
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $curl_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
    // Proxy ka use sirf website hit karne ke liye zaroori hai, GA4 API hit ke liye nahi.
    // Proxy config yahan hata di gayi hai.
    
    curl_exec($ch);
    curl_close($ch);
}

// =========================================================================
// === MAIN LOGIC ===
// GA4 Session ko simulate karne ke liye kam se kam 10+ seconds ka session chahiye.
// =========================================================================

$session_id = time() . substr($user_pseudo_id, -5); // Har slot ke liye ek unique session ID

// 1. Initial hit (optional, for proxy testing)
hit_website($target_url, $proxy_address, $proxy_auth, $user_pseudo_id);

// 2. GA4: session_start event aur pehla page_view bhejye
send_ga4_event('session_start', $user_pseudo_id, $GA4_MEASUREMENT_ID, $GA4_API_SECRET, $session_id);
send_ga4_event('page_view', $user_pseudo_id, $GA4_MEASUREMENT_ID, $GA4_API_SECRET, $session_id);

// 3. 11 second wait karein (Engaged Session ke liye 10 second se zyada time zaroori hai)
sleep(11); 

// 4. GA4: user_engagement event bhejye. 
// Ye batata hai ki user 11 seconds tak active raha.
send_ga4_event('user_engagement', $user_pseudo_id, $GA4_MEASUREMENT_ID, $GA4_API_SECRET, $session_id, 11000); // 11000 milliseconds

// Note: Aap chahein toh yahan ek aur 'page_view' bhi bhej sakte hain.
// send_ga4_event('page_view', $user_pseudo_id, $GA4_MEASUREMENT_ID, $GA4_API_SECRET, $session_id);

exit();
?>
