<?php
// PHP Proxy Loader: proxy_loader.php - FINAL SOLUTION for 100% Active User & Country View

// 1. Tell the browser/client to disconnect immediately (to keep the HTML tool fast)
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

// 2. Setup Background Execution
ignore_user_abort(true);
set_time_limit(0);

// 🚨🚨🚨 CRITICAL: REPLACE THESE WITH YOUR ACTUAL GA4 VALUES 🚨🚨🚨
// GA4 Admin -> Data Streams -> Your Stream -> Measurement Protocol API Secrets
$GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // <-- CHANGE THIS (Example: G-A1B2C3D4E5)
$GA4_API_SECRET     = 'YOUR_API_SECRET'; // <-- CHANGE THIS (Example: your_secret_key)
// 🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨

// --- Capture Parameters ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip   = isset($_GET['ip']) ? $_GET['ip'] : null; 
$unique_id  = isset($_GET['uid']) ? $_GET['uid'] : null; 

if (!$target_url || !$proxy_ip || !$unique_id || $GA4_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
    // Exit if parameters are missing or GA4 IDs are placeholder
    exit(); 
}

// Function to send a request to the GA4 Measurement Protocol
function send_ga4_hit($measurement_id, $api_secret, $client_id, $ip_override, $user_agent) {
    
    $session_id = time(); // Unique Session ID
    
    // Data payload for GA4 API
    $data = [
        'client_id' => $client_id,
        // Send a different User Agent every time (Desktop Mode enforced)
        'user_property' => [
            'user_agent' => ['value' => $user_agent]
        ],
        'events' => [
            [
                'name' => 'page_view', 
                'params' => [
                    'session_id' => $session_id,
                    'engagement_time_msec' => 30000, // FORCES 30s Engaged Session = Active User
                    'session_number' => 1,
                    'page_location' => $GLOBALS['target_url'],
                    'page_title' => 'Simulated Active User Session',
                    'user_engagement' => 1 // Explicitly mark as engaged
                ]
            ]
        ]
    ];

    $url = "https://www.google-analytics.com/mp/collect?measurement_id={$measurement_id}&api_secret={$api_secret}";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    // CRITICAL: Force the IP and Desktop User Agent
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        "X-Forwarded-For: {$ip_override}", // Forces Country/Geo-location
        "User-Agent: {$user_agent}" // Desktop Mode
    ]);

    curl_setopt($ch, CURLOPT_TIMEOUT, 5); 
    curl_exec($ch);
    curl_close($ch);
}

// --- ACTIVE USER EXECUTION ---

// 1. UNIQUE CLIENT ID (Simulating Incognito Mode)
// We generate a long, highly random ID every single time.
$client_id = $unique_id . "." . time() . rand(10000, 99999); 

// 2. DESKTOP USER AGENT (Forcing Desktop Mode)
// We use a slightly different User Agent for each of the 10 slots to increase randomness.
$desktop_agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:109.0) Gecko/20100101 Firefox/122.0',
];
$agent_index = abs($unique_id) % count($desktop_agents); 
$final_user_agent = $desktop_agents[$agent_index];

send_ga4_hit(
    $GA4_MEASUREMENT_ID, 
    $GA4_API_SECRET, 
    $client_id, 
    $proxy_ip,
    $final_user_agent
);

exit(); 
?>
