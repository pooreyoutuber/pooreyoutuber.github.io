<?php
// PHP Script using GA4 Measurement Protocol with Proxy Rotation

// 1. Setup Execution
ignore_user_abort(true);
set_time_limit(35); // 30 seconds for GA4 session + buffer

// --- Capture Parameters ---
$measurement_id = isset($_GET['mid']) ? $_GET['mid'] : null; // Your GA4 Measurement ID (e.g., G-XXXXXXXXXX)
$api_secret = isset($_GET['secret']) ? $_GET['secret'] : null; // Your GA4 API Secret
$proxy_ip = isset($_GET['ip']) ? $_GET['ip'] : null;
$proxy_port = isset($_GET['port']) ? $_GET['port'] : null;
$proxy_auth = isset($_GET['auth']) ? $_GET['auth'] : null; 
$unique_id = isset($_GET['uid']) ? $_GET['uid'] : null; // Unique ID for GA Client ID

if (!$measurement_id || !$api_secret || !$proxy_ip || !$proxy_port || !$proxy_auth || !$unique_id) {
    header("Connection: close");
    exit();
}

// 2. GA4 Measurement Protocol Configuration
$url = "https://www.google-analytics.com/mp/collect?measurement_id=$measurement_id&api_secret=$api_secret";

// CRITICAL: The GA Client ID must be unique for every user.
$client_id = $unique_id . "." . time(); 
$session_id = time();

// 3. Payload: Send 'page_view' event and fake 30-second engagement
$data = [
    'client_id' => $client_id, // Unique Client ID for New User
    'timestamp_micros' => round(microtime(true) * 1000000),
    'events' => [
        [
            'name' => 'page_view', // Track a Page View
            'params' => [
                'session_id' => $session_id,
                'engagement_time_msec' => 30000, // CRITICAL: 30 seconds for Active Session
                'page_title' => 'Simulated Unique Proxy View',
                'page_location' => 'https://pooreyoutuber.github.io/simulated/page'
            ]
        ]
    ]
];

// 4. Initialize PHP cURL for GA4 MP (Via Proxy)
$ch = curl_init();
$proxy_address = "$proxy_ip:$proxy_port";

$headers = array(
    // CRITICAL: Send proxy IP as the originating IP
    "X-Forwarded-For: " . $proxy_ip,
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36",
    "Content-Type: application/json"
);

curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
curl_setopt($ch, CURLOPT_TIMEOUT, 30); // Use 30-second timeout

// --- Proxy Configuration and Authentication ---
curl_setopt($ch, CURLOPT_PROXY, $proxy_address);
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth); 
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP); 
curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC);

// 5. Execute GA4 MP Request (via Proxy)
curl_exec($ch);
curl_close($ch);

// Disconnect immediately after sending the hit
header("Connection: close");
header("Content-Length: 1");
echo '1';
exit();
?>
