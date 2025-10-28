<?php
// PHP Proxy Loader: proxy_loader.php - FINAL SOLUTION (GA4 Measurement Protocol)

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

// --- GA4 CONFIGURATION (MUST BE UPDATED BY USER) ---
// 🚨 Replace these with your actual GA4 values
$GA4_MEASUREMENT_ID = 'YOUR_GA4_MEASUREMENT_ID'; // Example: G-XXXXXXXXXX
$GA4_API_SECRET     = 'YOUR_GA4_API_SECRET';     // Example: your_secret_key

// --- Capture Parameters ---
$target_url = isset($_GET['target']) ? $_GET['target'] : null;
$proxy_ip   = isset($_GET['ip']) ? $_GET['ip'] : null;
$unique_id  = isset($_GET['uid']) ? $_GET['uid'] : null;

if (!$target_url || !$proxy_ip || !$unique_id) {
    exit(); 
}

// Function to send a request to the GA4 Measurement Protocol
function send_ga4_hit($measurement_id, $api_secret, $client_id, $ip_override, $event_name, $session_id, $session_number, $session_engagement_time) {
    // Session parameters are CRITICAL for Active Users
    $data = [
        'client_id' => $client_id,
        'user_property' => [
            // User Agent is sent via cURL proxy hit to get device details
        ],
        'events' => [
            [
                'name' => $event_name, // e.g., page_view or session_start
                'params' => [
                    'session_id' => $session_id,
                    'session_number' => $session_number,
                    'engagement_time_msec' => $session_engagement_time, // CRITICAL: >10000 msec for Engaged Session
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
    
    // Set headers for the API call
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        // CRITICAL: We pass the proxy IP to the API using the x-forwarded-for header
        // This is how GA4 will register the correct Country View.
        "X-Forwarded-For: {$ip_override}", 
        "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
    ]);

    // Use a short timeout as this is a direct API call, not a full page load
    curl_setopt($ch, CURLOPT_TIMEOUT, 5); 
    curl_exec($ch);
    curl_close($ch);
}

// --- ACTIVE USER LOGIC ---

// Unique Client ID for New User
$client_id = $unique_id . "." . time() . rand(100, 999); 
$session_id = time(); // Unique Session ID

// 1. Send the first hit (Views + Active User)
// We set engagement_time_msec to 30000 (30 seconds) to force an Engaged Session.
send_ga4_hit(
    $GA4_MEASUREMENT_ID, 
    $GA4_API_SECRET, 
    $client_id, 
    $proxy_ip, 
    'page_view',         // Event Name
    $session_id,         // Session ID
    1,                   // Session Number
    30000                // Engagement Time in ms (30 seconds)
);

// GA4 Realtime should now show an Active User and the correct Country based on the $proxy_ip.

exit(); 
?>
