// Service Worker - Kampanya Takip Sistemi
const CACHE_NAME = 'kampanya-takip-v1';
const urlsToCache = [
    './',
    './index.html',
    './admin-dashboard.html',
    './employee-dashboard.html',
    './css/style.css',
    './js/app.js',
    './js/admin.js',
    './js/employee.js',
    './js/supabase-config.js',
    './manifest.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
    './favicon.ico'
];

// Install event - cache'i oluştur
self.addEventListener('install', event => {
    console.log('Service Worker: Install event');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Cache install failed', error);
            })
    );
});

// Fetch event - cache'den veya network'ten veri getir
self.addEventListener('fetch', event => {
    // Sadece GET isteklerini işle
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Chrome extension isteklerini yok say
    if (event.request.url.startsWith('chrome-extension://')) {
        return;
    }
    
    console.log('Service Worker: Fetch event for', event.request.url);
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache'de varsa cache'den döndür
                if (response) {
                    console.log('Service Worker: Found in cache', event.request.url);
                    return response;
                }
                
                // Cache'de yoksa network'ten getir
                console.log('Service Worker: Fetching from network', event.request.url);
                return fetch(event.request)
                    .then(response => {
                        // Geçerli response değilse döndür
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Response'u cache'e kopyala
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            })
                            .catch(cacheError => {
                                console.error('Service Worker: Cache put failed', cacheError);
                            });
                        
                        return response;
                    })
                    .catch(error => {
                        console.error('Service Worker: Fetch failed', error);
                        // Offline sayfası varsa onu döndür
                        return caches.match('./index.html');
                    });
            })
            .catch(error => {
                console.error('Service Worker: Cache match failed', error);
                return fetch(event.request).catch(() => {
                    return caches.match('/index.html');
                });
            })
    );
});

// Activate event - eski cache'leri temizle
self.addEventListener('activate', event => {
    console.log('Service Worker: Activate event');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
