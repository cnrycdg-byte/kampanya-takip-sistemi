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

