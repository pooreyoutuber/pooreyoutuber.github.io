<?php
// PHP Proxy Loader: proxy_loader.php - FINAL SOLUTION for Guaranteed Active User & Country View via GA4 API

// 1. Tell the browser/client to disconnect immediately (Client-side speed fix)
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
$GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // <-- CHANGE THIS (e.g., G-A1B2C3D4E5)
$GA4_API_SECRET     = 'YOUR_API_SECRET'; // <-- CHANGE THIS (e.g., your_secret_key)
// 🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨

// --- Capture Parameters ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip   = isset($_GET['ip']) ? $_GET['ip'] : null; // Used for Geo-location override
$unique_id  = isset($_GET['uid']) ? $_GET['uid'] : null;

if (!$target_url || !$proxy_ip || !$unique_id) {
    exit(); 
}

// Function to send a request to the GA4 Measurement Protocol
function send_ga4_hit($measurement_id, $api_secret, $client_id, $ip_override) {
    
    // Generate unique session data
    $session_id = time();
    
    // Data payload for GA4 API
    $data = [
        'client_id' => $client_id,
        // The timestamp is important for accurate Realtime reports
        'timestamp_micros' => strval(round(microtime(true) * 1000000)),
        'events' => [
            [
                'name' => 'page_view', 
                'params' => [
                    'session_id' => $session_id,
                    'engagement_time_msec' => 30000, // FORCES 30s Engaged Session = Active User
                    'session_number' => 1,
                    'page_location' => $GLOBALS['target_url'],
                    'page_title' => 'Simulated Active Session',
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
    
    // CRITICAL: We pass the proxy IP to the API using the x-forwarded-for header
    // GA4 will use this IP to register the correct Country View.
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        "X-Forwarded-For: {$ip_override}", // Forces Country/Geo-location
        "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
    ]);

    // Use a short timeout as this is a direct API call
    curl_setopt($ch, CURLOPT_TIMEOUT, 5); 
    curl_exec($ch);
    curl_close($ch);
}

// --- ACTIVE USER EXECUTION ---

// Unique Client ID for New User (to ensure user count increases)
$client_id = $unique_id . "." . time() . rand(100, 999); 

send_ga4_hit(
    $GA4_MEASUREMENT_ID, 
    $GA4_API_SECRET, 
    $client_id, 
    $proxy_ip 
);

// We still run a dummy cURL page load in the background to avoid any client-side issues, 
// but the GA4 API hit above is the one that registers the Active User.
// For simplicity and 100% API reliance, we skip the dummy cURL and rely only on the API call.

exit(); 
?>
