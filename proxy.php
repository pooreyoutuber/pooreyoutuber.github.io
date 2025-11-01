<?php
// PHP error reporting बंद करें (सुरक्षा के लिए)
error_reporting(0);

// ====================================================
// 🔒 आपकी Webshare प्रॉक्सी क्रेडेंशियल्स 🔒
// ====================================================
$proxyHost = 'p.webshare.io'; 
$proxyPort = '80'; 
$proxyUsername = 'bqctypvz-rotate'; 
$proxyPassword = '399xb3kxqv6i'; 
// ====================================================

// यूज़र द्वारा डाला गया URL प्राप्त करें
$targetUrl = isset($_GET['url']) ? $_GET['url'] : '';

if (empty($targetUrl)) {
    die("<div style='color:red; padding:20px;'><h2>⚠️ त्रुटि: कोई URL प्राप्त नहीं हुआ।</h2><p>कृपया वापस जाएँ और एक URL दर्ज करें।</p></div>");
}

// URL को सैनिटाइज करें और 'http://' या 'https://' जोड़ें
if (substr($targetUrl, 0, 4) !== 'http') {
    $targetUrl = 'http://' . $targetUrl;
}

$ch = curl_init();

// cURL ऑप्शन्स सेट करें
curl_setopt($ch, CURLOPT_URL, $targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
curl_setopt($ch, CURLOPT_HEADER, true); // हेडर प्राप्त करें
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); 
curl_setopt($ch, CURLOPT_TIMEOUT, 30); 
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

// Webshare प्रॉक्सी सेटिंग्स
curl_setopt($ch, CURLOPT_PROXY, "$proxyHost:$proxyPort");
$auth = "$proxyUsername:$proxyPassword";
curl_setopt($ch, CURLOPT_PROXYUSERPWD, $auth);
curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC);

// URL को फेच करें
$fullResponse = curl_exec($ch);
$error = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);

// हेडर और बॉडी को अलग करें
$responseBody = substr($fullResponse, $headerSize);
$header = substr($fullResponse, 0, $headerSize);

curl_close($ch);

// त्रुटि की जाँच और आउटपुट
if ($error || $httpCode >= 400) {
    $errorMessage = $error ? htmlspecialchars($error) : "HTTP Error $httpCode";
    echo "<div style='color:red; padding:20px;'>
            <h2>❌ प्रॉक्सी कनेक्शन/HTTP त्रुटि:</h2>
            <p>Error: " . $errorMessage . "</p>
            <p><strong>जाँच करें:</strong> Webshare क्रेडेंशियल्स, प्रॉक्सी होस्ट/पोर्ट, और Render पर आउटबाउंड कनेक्शन।</p>
          </div>";
} else {
    // Geo-location Spoofing सफल:
    // यह वेबसाइट अब प्रॉक्सी IP के माध्यम से लोड हुई है।

    // कंटेंट को ब्राउज़र को सीधे आउटपुट करें (जो index.html के iframe में लोड होगा)
    
    // ब्राउज़र को Content-Type हेडर भेजें (यह सुनिश्चित करने के लिए कि यह HTML के रूप में प्रस्तुत हो)
    // Note: मूल वेबसाइट से Content-Type हेडर को कॉपी करना सबसे अच्छा है, 
    // लेकिन सरलता के लिए, हम सीधे HTML भेज रहे हैं।

    echo $responseBody;
}
?>
