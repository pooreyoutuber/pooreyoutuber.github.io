<?php
// PHP Proxy Loader: proxy_loader.php - FINAL SOLUTION (Guaranteed Active User via GA4 API)

// 1. Tell the browser/client to disconnect immediately
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
// Get these from GA4 Admin -> Data Streams -> Your Stream -> Measurement Protocol API Secrets
$GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // <-- CHANGE THIS
$GA4_API_SECRET     = 'YOUR_API_SECRET'; // <-- CHANGE THIS
// 🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨

// --- Capture Parameters ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip   = isset($_GET['ip']) ? $_GET['ip'] : null; // We use this only for Geo-location
$unique_id  = isset($_GET['uid']) ? $_GET['uid'] : null;

if (!$target_url || !$proxy_ip || !$unique_id) {
    exit(); 
}

// Function to send a request to the GA4 Measurement Protocol
function send_ga4_hit($measurement_id, $api_secret, $client_id, $ip_override) {
    
    // Generate Session Data
    $session_id = time(); // Unique Session ID
    
    // Data payload for GA4 API
    $data = [
        'client_id' => $client_id,
        'timestamp_micros' => strval(round(microtime(true) * 1000000)),
        'events' => [
            [
                'name' => 'page_view', 
                'params' => [
                    'session_id' => $session_id,
                    'engagement_time_msec' => 30000, // FORCES 30s Engaged Session (Active User)
                    'session_number' => 1,
                    'page_location' => $GLOBALS['target_url'],
                    'page_title' => 'Simulated Active Session',
                    'user_engagement' => 1 // Mark as engaged
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
    
    // CRITICAL for Country View: Pass the proxy IP as the client IP
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        "X-Forwarded-For: {$ip_override}", // GA4 uses this to determine Country
        "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
    ]);

    curl_setopt($ch, CURLOPT_TIMEOUT, 5); 
    curl_exec($ch);
    curl_close($ch);
}

// --- ACTIVE USER EXECUTION ---

// Unique Client ID for New User
$client_id = $unique_id . "." . time() . rand(100, 999); 

send_ga4_hit(
    $GA4_MEASUREMENT_ID, 
    $GA4_API_SECRET, 
    $client_id, 
    $proxy_ip 
);

exit(); 
?>
