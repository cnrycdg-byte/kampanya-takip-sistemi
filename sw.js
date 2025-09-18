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

// Fetch event - Basitleştirilmiş versiyon
self.addEventListener('fetch', function(event) {
  // Sadece GET isteklerini işle ve Supabase isteklerini geç
  if (event.request.method !== 'GET' || 
      event.request.url.includes('supabase.co') ||
      event.request.url.includes('api.') ||
      event.request.url.includes('supabase')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache'de varsa cache'den döndür
        if (response) {
          return response;
        }
        
        // Fetch işlemini yap
        return fetch(event.request)
          .then(function(fetchResponse) {
            // Başarılı response'u cache'e ekle
            if (fetchResponse && fetchResponse.status === 200) {
              const responseClone = fetchResponse.clone();
              caches.open('kampanya-cache-v1').then(function(cache) {
                cache.put(event.request, responseClone);
              });
            }
            return fetchResponse;
          })
          .catch(function(error) {
            console.error('Fetch hatası:', error);
            console.error('Request URL:', event.request.url);
            
            // Basit hata response'u döndür
            return new Response('Network error', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
      .catch(function(error) {
        console.error('Cache match hatası:', error);
        return new Response('Cache error', {
          status: 500,
          statusText: 'Internal Server Error'
        });
      })
  );
});

