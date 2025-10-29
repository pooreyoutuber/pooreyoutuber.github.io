<?php
// proxies.php - returns proxy labels (no credentials leaked)
header('Content-Type: application/json');

// We store sensitive creds only in fetch.php; here we give only labels.
// Keep order synced with fetch.php.
$proxies = [
  ['label' => 'Proxy 1 - 142.111.48.253:7030'],
  ['label' => 'Proxy 2 - 31.59.20.176:6754'],
  ['label' => 'Proxy 3 - 23.95.150.145:6114'],
  ['label' => 'Proxy 4 - 198.23.239.134:6540'],
  ['label' => 'Proxy 5 - 45.38.107.97:6014'],
  ['label' => 'Proxy 6 - 107.172.163.27:6543'],
  ['label' => 'Proxy 7 - 64.137.96.74:6641'],
  ['label' => 'Proxy 8 - 216.10.27.159:6837'],
  ['label' => 'Proxy 9 - 142.111.67.146:5611'],
  ['label' => 'Proxy 10 - 142.147.128.93:6593'],
];

echo json_encode($proxies, JSON_UNESCAPED_SLASHES);
