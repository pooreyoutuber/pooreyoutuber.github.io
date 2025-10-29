<?php
header('Content-Type: application/json');
$proxies = [
  ['label' => 'Proxy 1 - 142.111.48.253:7030 (US)'],
  ['label' => 'Proxy 2 - 31.59.20.176:6754 (Europe)'],
  ['label' => 'Proxy 3 - 23.95.150.145:6114 (US)'],
  ['label' => 'Proxy 4 - 198.23.239.134:6540 (US)'],
  ['label' => 'Proxy 5 - 45.38.107.97:6014 (US)'],
  ['label' => 'Proxy 6 - 107.172.163.27:6543 (US)'],
  ['label' => 'Proxy 7 - 64.137.96.74:6641 (US)'],
  ['label' => 'Proxy 8 - 216.10.27.159:6837 (US)'],
  ['label' => 'Proxy 9 - 142.111.67.146:5611 (US)'],
  ['label' => 'Proxy 10 - 142.147.128.93:6593 (US)']
];
echo json_encode($proxies);
