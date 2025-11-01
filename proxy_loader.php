<?php
// PHP Proxy Loader: proxy_loader.php (GA4 Measurement Protocol Final)

// --- CRITICAL AUTHENTICATION DATA (Rotating Proxy) ---
// Note: This auth is for the proxy provider mentioned in the JS.
$auth_user = "bqctypvz-rotate";
$auth_pass = "399xb3kxqv6i";
$expected_auth = $auth_user . ":" . $auth_pass;

// 1. NON-BLOCKING EXECUTION (Immediately send a quick response to the browser)
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

// 2. CONTINUE EXECUTION (The heavy work starts in the background)
ignore_user_abort(true);
set_time_limit(0); 

// --- Capture Parameters from URL ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 
// 👇 CRITICAL: Unique ID from JavaScript, used as GA4 Client ID
$unique_id = isset($_GET['uid']) ? $_GET['uid'] : null; 
$GA4_MEASUREMENT_ID = isset($_GET['ga4_id']) ? $_GET['ga4_id'] : null; 
$API_SECRET_KEY = isset($_GET['ga4_secret']) ? $_GET['ga4_secret'] : null; 

// Validate all critical inputs
if (!$target_url || !$proxy_ip || !$proxy_port || $proxy_auth !== $expected_auth || !$unique_id || !$GA4_MEASUREMENT_ID || !$API_SECRET_KEY) {
    exit(); 
}

$proxy_address = $proxy_ip . ":" . $proxy_port;
$GA4_ENDPOINT = "https://www.google-analytics.com/mp/collect";

// --- Spoofing Data ---

// Common User-Agents for realism
$user_agents = array(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; WOW64; rv:109.0) Gecko/20100101 Firefox/116.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/605.1.15"
);
// Function to generate a random IP (used for ip_override in payload)
function generateRandomIP() {
    return rand(1, 255) . "." . rand(1, 255) . "." . rand(1, 255) . "." . rand(1, 255);
}

// --- GA4 Send Function (Uses Proxy to send events) ---
function send_ga4_event($endpoint, $measurement_id, $secret_key, $payload, $proxy_address, $proxy_auth) {
    $ch = curl_init();
    
    // Build the GA4 MP URL
    $url = $endpoint . "?measurement_id=" . $measurement_id . "&api_secret=" . $secret_key;
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    // 👇 CRITICAL: Route the request through the client's residential proxy.
    curl_setopt($ch, CURLOPT_PROXY, $proxy_address); 
    curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
    curl_exec($ch); // Execute the request
    curl_close($ch);
}

// --- ACTIVE USER SIMULATION: 2-Event Sequence ---

$session_id = time(); // Consistent session ID for both events
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
                'ip_override' => generateRandomIP() 
            ],
        ],
    ],
];
send_ga4_event($GA4_ENDPOINT, $GA4_MEASUREMENT_ID, $API_SECRET_KEY, $page_view_data, $proxy_address, $proxy_auth);

// 2. Wait (Simulates user time on page - essential for "Active User" status)
$time_delay = rand(15, 25); 
sleep($time_delay); 

// 3. Send 'scroll' (Registers as 'Engaged/Active User' because engagement > 10s)
$scroll_data = [
    'client_id' => $unique_id, // Must be the same client_id
    'events' => [
        [
            'name' => 'scroll', 
            'params' => [
                'session_id' => $session_id, 
                'engagement_time_msec' => '20000', // Adds engagement time
                'page_location' => $target_url,
                'user_agent' => $random_ua, 
                'ip_override' => generateRandomIP() 
            ],
        ],
    ],
];

send_ga4_event($GA4_ENDPOINT, $GA4_MEASUREMENT_ID, $API_SECRET_KEY, $scroll_data, $proxy_address, $proxy_auth);

exit();
?>
