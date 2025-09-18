// Service Worker - Kampanya Takip Sistemi
const CACHE_NAME = 'kampanya-takip-v3';

// Install event - cache'i oluştur
self.addEventListener('install', event => {
    console.log('Service Worker: Install event');
    self.skipWaiting(); // Yeni service worker'ı hemen aktif et
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
        }).then(() => {
            return self.clients.claim(); // Tüm client'ları kontrol et
        })
    );
});

// Fetch event - basit cache stratejisi
self.addEventListener('fetch', event => {
    // Sadece GET isteklerini işle
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Chrome extension ve diğer özel protokolleri yok say
    if (event.request.url.startsWith('chrome-extension://') || 
        event.request.url.startsWith('moz-extension://') ||
        event.request.url.startsWith('ms-browser-extension://')) {
        return;
    }
    
    // Supabase API çağrılarını doğrudan network'ten getir
    if (event.request.url.includes('supabase.co')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache'de varsa cache'den döndür
                if (response) {
                    return response;
                }
                
                // Cache'de yoksa network'ten getir
                return fetch(event.request)
                    .then(response => {
                        // Geçerli response değilse döndür
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Sadece statik dosyaları cache'e kopyala
                        if (event.request.url.includes('.css') || 
                            event.request.url.includes('.js') || 
                            event.request.url.includes('.html') ||
                            event.request.url.includes('.json') ||
                            event.request.url.includes('.ico')) {
                            
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                })
                                .catch(cacheError => {
                                    console.warn('Service Worker: Cache put failed', cacheError);
                                });
                        }
                        
                        return response;
                    })
                    .catch(error => {
                        console.warn('Service Worker: Fetch failed', error);
                        // Offline durumunda index.html'i döndür
                        return caches.match('./index.html');
                    });
            })
            .catch(error => {
                console.warn('Service Worker: Cache match failed', error);
                return fetch(event.request).catch(() => {
                    return caches.match('./index.html');
                });
            })
    );
});