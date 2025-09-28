const CACHE_NAME = 'pyt-tools-v1';
// उन फाइल्स की लिस्ट जिन्हें ऑफलाइन सपोर्ट के लिए कैश करना है
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css', // अगर आप style.css को एक अलग फाइल में रखते हैं
    '/logo.png', // अगर आप logo.png का उपयोग करते हैं
    'logo-192.png', // PWA Icons
    'logo-512.png'  // PWA Icons
];

// Service Worker install होने पर Cache में फाइल्स जोड़ना
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// नेटवर्क से पहले Cache से फाइल्स लेने की कोशिश करना (Offline Support)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache में मिलने पर उसे रिटर्न करना
        if (response) {
          return response;
        }
        // Cache में न मिलने पर नेटवर्क से लाना
        return fetch(event.request);
      }
    )
  );
});
