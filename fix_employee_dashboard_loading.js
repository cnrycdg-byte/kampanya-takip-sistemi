// Employee Dashboard Loading Fix
// Store-selection'dan geldiğinde localStorage kontrolünü iyileştir

// Sayfa yüklendiğinde hemen kontrol et
(function() {
    // Store-selection'dan gelip gelmediğini kontrol et
    const urlParams = new URLSearchParams(window.location.search);
    const referrer = document.referrer;
    const fromStoreSelection = urlParams.get('from') === 'store-selection' || 
                               referrer.includes('store-selection');
    
    if (fromStoreSelection) {
        console.log('Store-selection\'dan gelindi, localStorage kontrol ediliyor...');
        
        // localStorage'ı birkaç kez kontrol et (yazılması gecikebilir)
        let attempts = 0;
        const maxAttempts = 10; // 2 saniye (10 * 200ms)
        
        const checkInterval = setInterval(() => {
            attempts++;
            const user = getFromStorage('currentUser');
            
            console.log(`Kontrol ${attempts}/${maxAttempts}:`, user);
            
            if (user && (user.storeId || user.store_id) && user.department) {
                console.log('✅ Kullanıcı bilgileri bulundu!');
                clearInterval(checkInterval);
                
                // URL parametresini temizle ve sayfayı yenile
                if (urlParams.get('from')) {
                    window.location.replace('employee-dashboard.html');
                }
                return;
            }
            
            // Maksimum deneme sayısına ulaşıldı
            if (attempts >= maxAttempts) {
                console.warn('⚠️ Kullanıcı bilgileri yüklenemedi, store-selection\'a yönlendiriliyor');
                clearInterval(checkInterval);
                window.location.replace('store-selection.html');
                return;
            }
        }, 200);
    }
})();

