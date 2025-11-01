<?php
// proxy_loader.php - GA4 Measurement Protocol with Rotating Proxy

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
// 2. NON-BLOCKING EXECUTION (Immediately send a quick response)
// ----------------------------------------------------------------------
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

// 3. CONTINUE EXECUTION (The heavy work starts in the background)
ignore_user_abort(true);
set_time_limit(0); 

// --- Capture Parameters from URL ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$unique_id = isset($_GET['uid']) ? $_GET['uid'] : null; // CRITICAL: Client ID
$GA4_MEASUREMENT_ID = isset($_GET['ga4_id']) ? $_GET['ga4_id'] : null; 
$API_SECRET_KEY = isset($_GET['ga4_secret']) ? $_GET['ga4_secret'] : null; 

if (!$target_url || !$unique_id || !$GA4_MEASUREMENT_ID || !$API_SECRET_KEY) {
    exit(); 
}

$GA4_ENDPOINT = "https://www.google-analytics.com/mp/collect";

// --- Spoofing Data ---
$user_agents = array(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/605.1.15"
);
function generateRandomIP() {
    return rand(1, 255) . "." . rand(1, 255) . "." . rand(1, 255) . "." . rand(1, 255);
}

// --- GA4 Send Function (Uses Rotating Proxy) ---
function send_ga4_event($endpoint, $measurement_id, $secret_key, $payload, $proxy_address, $proxy_auth) {
    $ch = curl_init();
    
    $url = $endpoint . "?measurement_id=" . $measurement_id . "&api_secret=" . $secret_key;
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    // 👇 Use the single rotating proxy endpoint
    curl_setopt($ch, CURLOPT_PROXY, $proxy_address); 
    curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
    
    // 👇 CRITICAL FIX: Increased Timeout for slow rotating proxies
    curl_setopt($ch, CURLOPT_TIMEOUT, 60); 
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
    curl_exec($ch);
    curl_close($ch);
}

// --- ACTIVE USER SIMULATION: 2-Event Sequence ---

$session_id = time(); 
$random_ua = $user_agents[array_rand($user_agents)];

// 1. Send 'page_view' (Session Start)
$page_view_data = [
    'client_id' => $unique_id, // Ensures a unique user
    'events' => [
        [
            'name' => 'page_view',
            'params' => [
                'session_id' => $session_id, 
                'engagement_time_msec' => '1000', 
                'page_location' => $target_url,
                'user_agent' => $random_ua, 
                'ip_override' => generateRandomIP() // IP Spoofing
            ],
        ],
    ],
];
send_ga4_event($GA4_ENDPOINT, $GA4_MEASUREMENT_ID, $API_SECRET_KEY, $page_view_data, $proxy_address, $PROXY_AUTH);

// 2. Wait (Simulates user time on page - ESSENTIAL)
$time_delay = rand(15, 25); 
sleep($time_delay); 

// 3. Send 'scroll' (Registers as 'Engaged/Active User')
$scroll_data = [
    'client_id' => $unique_id, // Must be the same client_id
    'events' => [
        [
            'name' => 'scroll', 
            'params' => [
                'session_id' => $session_id, 
                'engagement_time_msec' => '20000', 
                'page_location' => $target_url,
                'user_agent' => $random_ua, 
                'ip_override' => generateRandomIP() 
            ],
        ],
    ],
];

send_ga4_event($GA4_ENDPOINT, $GA4_MEASUREMENT_ID, $API_SECRET_KEY, $scroll_data, $proxy_address, $PROXY_AUTH);

exit();
?>
