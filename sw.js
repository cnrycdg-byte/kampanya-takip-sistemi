// Service Worker - Tamamen kaldırıldı
// Bu dosya artık hiçbir işlem yapmıyor ve hiçbir event listener yok

console.log('Service Worker yüklendi ama tamamen devre dışı');

// Manifest.json hatasını önlemek için basit bir fetch handler
self.addEventListener('fetch', function(event) {
    // Sadece manifest.json isteklerini handle et
    if (event.request.url.includes('manifest.json')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response('{}', {
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
    }
});

