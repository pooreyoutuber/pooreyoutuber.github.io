<?php
// =========================================================
// proxy_loader.php - CORRECTED LOGIC
// =========================================================

// 1. PROXY POOL Configuration (Single source of truth)
$proxies = [
    // Format: 'GEO-CODE' => ['ip' => 'IP:Port', 'auth' => 'username:password']
    'US-LA' => ['ip' => '142.111.48.253:7030', 'auth' => 'bqctypvz:399xb3kxqv6i', 'location' => 'Los Angeles'],
    'GB-LD' => ['ip' => '31.59.20.176:6754', 'auth' => 'bqctypvz:399xb3kxqv6i', 'location' => 'London'],
    'US-BF1' => ['ip' => '23.95.150.145:6114', 'auth' => 'bqctypvz:399xb3kxqv6i', 'location' => 'Buffalo 1'],
    'US-BF2' => ['ip' => '198.23.239.134:6540', 'auth' => 'bqctypvz:399xb3kxqv6i', 'location' => 'Buffalo 2'],
    'GB-LD2' => ['ip' => '45.38.107.97:6014', 'auth' => 'bqctypvz:399xb3kxqv6i', 'location' => 'London 2'],
    'US-BL' => ['ip' => '107.172.163.27:6543', 'auth' => 'bqctypvz:399xb3kxqv6i', 'location' => 'Bloomingdale'],
    'ES-MD' => ['ip' => '64.137.96.74:6641', 'auth' => 'bqctypvz:399xb3kxqv6i', 'location' => 'Madrid'],
    'US-DL' => ['ip' => '216.10.27.159:6837', 'auth' => 'bqctypvz:399xb3kxqv6i', 'location' => 'Dallas'],
    'JP-TK' => ['ip' => '142.111.67.146:5611', 'auth' => 'bqctypvz:399xb3kxqv6i', 'location' => 'Tokyo'],
    'US-AS' => ['ip' => '142.147.128.93:6593', 'auth' => 'bqctypvz:399xb3kxqv6i', 'location' => 'Ashburn'],
];
$all_geo_codes = array_keys($proxies);
$max_slots = count($proxies);

// 2. INPUT Retrieval
$target_url = isset($_GET['target']) ? filter_var($_GET['target'], FILTER_SANITIZE_URL) : '';
$geo_mode   = isset($_GET['geo']) ? filter_var($_GET['geo'], FILTER_SANITIZE_STRING) : 'CYCLE'; // e.g., US, GB, or CYCLE
$slot_index = isset($_GET['slot_index']) ? intval($_GET['slot_index']) : 0;
$cycle_index = isset($_GET['cycle_index']) ? intval($_GET['cycle_index']) : 0;

// 3. PROXY SELECTION LOGIC (The Fix)
$selected_proxy = null;

if ($geo_mode === 'CYCLE') {
    // *** FIX: Cycle Mode ensures each slot uses a unique IP from the list ***
    
    // The index in the all_geo_codes array for this specific request
    $actual_index = ($slot_index + $cycle_index) % $max_slots;
    $geo_code_for_slot = $all_geo_codes[$actual_index];
    $selected_proxy = $proxies[$geo_code_for_slot];

} elseif (array_key_exists($geo_mode, $proxies)) {
    // Single GEO Mode (If selected, e.g., US) - use a random proxy from that geo if needed, 
    // but the provided JS only sends the generic US/GB codes. We'll simplify this to always
    // use the Cycle logic to ensure uniqueness for all 10 slots.
    
    // If the user selects US/GB, we assume they want all slots to use US/GB IPs randomly
    // For now, we will use the CYCLE logic's result based on slot index for uniqueness.
    $actual_index = $slot_index % $max_slots;
    $geo_code_for_slot = $all_geo_codes[$actual_index];
    $selected_proxy = $proxies[$geo_code_for_slot];
    
} else {
    // Fallback/Error
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['status' => 'error', 'message' => 'Invalid or missing GEO mode.']);
    exit;
}

// 4. Final Proxy Details
$proxy_ip_port = $selected_proxy['ip'];
$proxy_auth = $selected_proxy['auth'];

// 5. cURL Execution (Same as before)
$ch = curl_init();
curl_setopt($ch, CURLOPT_PROXY, $proxy_ip_port);
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $proxy_auth);
curl_setopt($ch, CURLOPT_PROXYTYPE, CURLPROXY_HTTP); 
curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE); 
curl_setopt($ch, CURLOPT_HEADER, FALSE);       
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, TRUE); 
curl_setopt($ch, CURLOPT_TIMEOUT, 30); // 30 seconds simulation time
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);

// Set User Agent (optional, for realism)
$user_agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
];
curl_setopt($ch, CURLOPT_USERAGENT, $user_agents[array_rand($user_agents)]);

// Execute
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

// 6. Output
if ($response === FALSE || $http_code >= 400) {
    $status = 'error';
    $message = "Proxy failed (IP: {$proxy_ip_port}). cURL Error: {$curl_error}";
} else {
    $status = 'success';
    $message = "View session started for 30s via {$selected_proxy['location']} (IP: {$proxy_ip_port})";
}

header('Content-Type: application/json');
echo json_encode(['status' => $status, 'message' => $message]);
?>
