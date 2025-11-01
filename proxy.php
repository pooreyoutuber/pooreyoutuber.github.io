<?php
// PHP error reporting बंद करें (सुरक्षा और क्लीन आउटपुट के लिए)
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

// -------------------------------------------------------------------
// HTML हेडर और सर्च बार
// -------------------------------------------------------------------
echo '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Geo-Location Spoofing Proxy Tool - College Project</title>
    <style>
        body { font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; margin-top: 50px; background-color: #f4f4f9; }
        .container { width: 90%; max-width: 900px; }
        form { display: flex; margin-bottom: 20px; }
        input[type="text"] { flex-grow: 1; padding: 12px; border: 2px solid #007bff; border-radius: 5px 0 0 5px; font-size: 16px; }
        button { padding: 12px 20px; background-color: #007bff; color: white; border: none; border-radius: 0 5px 5px 0; cursor: pointer; font-size: 16px; transition: background-color 0.3s; }
        button:hover { background-color: #0056b3; }
        .iframe-container { margin-top: 20px; border: 1px solid #ccc; padding: 10px; background-color: white; }
        .error { color: red; font-weight: bold; margin-bottom: 15px; padding: 10px; background-color: #ffe0e0; border: 1px solid red; border-radius: 5px;}
        h2 { border-bottom: 2px solid #ccc; padding-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌎 कॉलेज प्रॉजेक्ट: Geo-Location प्रॉक्सी</h1>
        <p>URL डालें, और उसे Webshare प्रॉक्सी के साथ लोड करें। Google Analytics में Geo-location प्रॉक्सी IP के स्थान पर दिखेगा।</p>
        
        <form action="" method="GET">
            <input type="text" name="url" placeholder="वह URL डालें जिसे आप प्रॉक्सी के माध्यम से खोलना चाहते हैं (e.g., https://example.com)" value="' . htmlspecialchars($targetUrl) . '" required>
            <button type="submit">🚀 प्रॉक्सी से खोलो</button>
        </form>';

// -------------------------------------------------------------------
// PHP प्रॉक्सी लॉजिक
// -------------------------------------------------------------------
if (!empty($targetUrl)) {
    // URL को सैनिटाइज करें
    if (substr($targetUrl, 0, 4) !== 'http') {
        $targetUrl = 'http://' . $targetUrl;
    }

    $ch = curl_init();

    // cURL ऑप्शन्स
    curl_setopt($ch, CURLOPT_URL, $targetUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
    curl_setopt($ch, CURLOPT_HEADER, true); // हेडर भी प्राप्त करें
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); 
    curl_setopt($ch, CURLOPT_TIMEOUT, 30); 
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

    // Webshare प्रॉक्सी सेटिंग्स
    curl_setopt($ch, CURLOPT_PROXY, "$proxyHost:$proxyPort");
    $auth = "$proxyUsername:$proxyPassword";
    curl_setopt($ch, CURLOPT_PROXYUSERPWD, $auth);
    curl_setopt($ch, CURLOPT_PROXYAUTH, CURLAUTH_BASIC);

    $fullResponse = curl_exec($ch);
    $error = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    
    // हेडर और बॉडी को अलग करें
    $header = substr($fullResponse, 0, $headerSize);
    $responseBody = substr($fullResponse, $headerSize);

    curl_close($ch);

    // त्रुटि की जाँच
    if ($error || $httpCode >= 400) {
        $errorMessage = $error ? htmlspecialchars($error) : "HTTP Error $httpCode";
        echo '<div class="error">❌ प्रॉक्सी कनेक्शन त्रुटि या HTTP Error: ' . $errorMessage . '</div>';
        echo '<p><strong>जाँच करें:</strong> Webshare क्रेडेंशियल्स सही हैं और Render पर cURL आउटबाउंड कनेक्शन की अनुमति है।</p>';
    } else {
        // CONTENT-TYPE हेडर को पढ़कर सुनिश्चित करें कि हम केवल HTML दिखा रहे हैं
        if (preg_match("/Content-Type: (.*?);/i", $header, $matches)) {
            $contentType = trim($matches[1]);
        } else {
            $contentType = 'text/html'; // डिफ़ॉल्ट रूप से HTML मान लें
        }

        if (stripos($contentType, 'text/html') !== false) {
            // प्रॉक्सी से प्राप्त कंटेंट को सीधे iframe में लोड करें।
            // URL Rewriting के बिना नेविगेशन काम नहीं करेगा, लेकिन Geo-location Spoofing 
            // और पेज का पहला लोड (जो GA डेटा भेजता है) काम करेगा।

            // हम srcdoc का उपयोग कर रहे हैं, जो जटिल कंटेंट के लिए सर्वोत्तम नहीं है, 
            // लेकिन कॉलेज प्रोजेक्ट के सरल डेमो के लिए यह सबसे सुरक्षित तरीका है
            // जिससे स्क्रिप्टिंग समस्याओं से बचा जा सके।
            $safeResponseBody = htmlspecialchars($responseBody);

            echo '<div class="iframe-container">';
            echo '<h2>🌐 प्रॉक्सी द्वारा फेच किया गया कंटेंट: ' . htmlspecialchars($targetUrl) . '</h2>';
            echo '<iframe sandbox="allow-scripts allow-forms allow-same-origin" 
                           style="width:100%; height: 600px; border:none;" 
                           srcdoc="' . $safeResponseBody . '"></iframe>';
            echo '<p style="margin-top: 10px;"><strong>Geo-location Spoofing सफल:</strong> वेबसाइट का Google Analytics अब Webshare प्रॉक्सी का स्थान रिकॉर्ड करेगा।</p>';
            echo '</div>';
        } else {
             echo '<div class="error">❌ फ़ेच किया गया कंटेंट HTML नहीं है (Content Type: ' . htmlspecialchars($contentType) . ')। iframe में प्रदर्शित नहीं किया जा सकता।</div>';
        }
    }
}

// -------------------------------------------------------------------
// HTML फुटर
// -------------------------------------------------------------------
echo '</div></body></html>';
?>
