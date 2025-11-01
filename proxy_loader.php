<?php
// PHP Proxy Loader: proxy_loader.php - FINAL CODE (GA4 Measurement Protocol)

// --- CRITICAL AUTHENTICATION DATA (UPDATED FOR ROTATING PROXY) ---
$auth_user = "bqctypvz-rotate";
$auth_pass = "399xb3kxqv6i";
$expected_auth = $auth_user . ":" . $auth_pass;

// 1. NON-BLOCKING EXECUTION
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

// 2. CONTINUE EXECUTION
ignore_user_abort(true);
set_time_limit(0); 

// --- Capture Parameters ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 
$unique_id = isset($_GET['uid']) ? $_GET['uid'] : null; 
// 👇 NEW GA4 PARAMETERS
$GA4_MEASUREMENT_ID = isset($_GET['ga4_id']) ? $_GET['ga4_id'] : null; 
$API_SECRET_KEY = isset($_GET['ga4_secret']) ? $_GET['ga4_secret'] : null; 

if (!$target_url || !$proxy_ip || !$proxy_port || $proxy_auth !== $expected_auth || !$unique_id || !$GA4_MEASUREMENT_ID || !$API_SECRET_KEY) {
    exit(); 
}

$proxy_address = $proxy_ip . ":" . $proxy_port;
$GA4_ENDPOINT = "https://www.google-analytics.com/mp/collect";

// --- Active User Spoofing Functions ---

// Function to generate a completely random IPv4 address (X-Forwarded-For Spoofing)
function generateRandomIP() {
    return rand(1, 255) . "." . rand(1, 255) . "." . rand(1, 255) . "." . rand(1, 255);
}

// 1. Random User-Agent (Used in GA4 payload)
$user_agents = array(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; WOW64; rv:109.0) Gecko/20100101 Firefox/116.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/605.1.15"
);

// --- GA4 Send Function (Uses Proxy) ---
function send_ga4_event($endpoint, $measurement_id, $secret_key, $payload, $proxy_address, $proxy_auth) {
    $ch = curl_init();
    
    // The GA4 MP URL structure
    $url = $endpoint . "?measurement_id=" . $measurement_id . "&api_secret=" . $secret_key;
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    // 👇 CRITICAL: Use the proxy to send the request to Google
    curl_setopt($ch, CURLOPT_PROXY, $proxy_address); 
    curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
    curl_exec($ch); 
    curl_close($ch);
}

// --- Active User Simulation Logic ---

// Get a consistent session ID for both events
$session_id = time(); 
$random_ua = $user_agents[array_rand($user_agents)];

// 1. First Hit: page_view event (Session Start)
$page_view_data = [
    'client_id' => $unique_id,
    'events' => [
        [
            'name' => 'page_view',
            'params' => [
                'session_id' => $session_id, 
                'engagement_time_msec' => '1000', 
                'page_location' => $target_url,
                'user_agent' => $random_ua, 
                'ip_override' => generateRandomIP() // Optional IP Spoofing
            ],
        ],
    ],
];
send_ga4_event($GA4_ENDPOINT, $GA4_MEASUREMENT_ID, $API_SECRET_KEY, $page_view_data, $proxy_address, $proxy_auth);

// 2. Wait and Send Scroll Event (Simulates engagement > 10s)
// CRITICAL: Block PHP execution to simulate user time on page
$time_delay = rand(15, 25); 
sleep($time_delay); 

// 3. Send scroll event (Marks the user as 'Engaged/Active')
$scroll_data = [
    'client_id' => $unique_id,
    'events' => [
        [
            'name' => 'scroll', 
            'params' => [
                'session_id' => $session_id, // Same session ID
                'engagement_time_msec' => '20000', // Add a large chunk of engagement time
                'page_location' => $target_url,
                'user_agent' => $random_ua, 
                'ip_override' => generateRandomIP() // New IP spoof
            ],
        ],
    ],
];

send_ga4_event($GA4_ENDPOINT, $GA4_MEASUREMENT_ID, $API_SECRET_KEY, $scroll_data, $proxy_address, $proxy_auth);

exit();
?>
