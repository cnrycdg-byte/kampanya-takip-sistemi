// Service Worker - Offline Desteği
const CACHE_NAME = 'kampanya-takip-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/admin-dashboard.html',
  '/employee-dashboard.html',
  '/store-selection.html',
  '/css/style.css',
  '/js/app.js',
  '/js/admin.js',
  '/js/employee.js',
  '/js/store-selection.js',
  '/js/supabase-config.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install event
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache açıldı');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache'de varsa cache'den döndür
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Push event - Bildirim gönderme
self.addEventListener('push', function(event) {
  console.log('Push event alındı:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Yeni bildirim!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'push-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Uygulamayı Aç'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Kampanya Takip Sistemi', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', function(event) {
  console.log('Bildirim tıklandı:', event);
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

