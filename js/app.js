// Kampanya Takip Sistemi - Ana JavaScript Dosyası

// Sayfa yüklendiğinde çalışacak kod
document.addEventListener('DOMContentLoaded', function() {
    console.log('Kampanya Takip Sistemi yüklendi');
    
    // PWA Service Worker'ı kaydet
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('Service Worker kaydedildi:', registration);
            })
            .catch(function(error) {
                console.log('Service Worker kaydı başarısız:', error);
            });
    }
    
    // Giriş formunu dinle
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

// Giriş işlemini yöneten fonksiyon
async function handleLogin(event) {
    event.preventDefault(); // Sayfanın yenilenmesini engelle
    
    // Form verilerini al
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    
    // Basit doğrulama
    if (!email || !password || !role) {
        showAlert('Lütfen tüm alanları doldurun!', 'danger');
        return;
    }
    
    try {
        // Yükleme göstergesi
        const submitBtn = document.querySelector('#loginForm button[type="submit"]');
        const hideLoading = showLoading(submitBtn);
        
        // Geçici mock veri ile test
        const validUsers = {
            'cyucedag@bogazici.com': { password: 'admin123', role: 'admin', name: 'Caner Yücedağ', region: 'Tüm Bölgeler' },
            'cengizhan.tutucu@kayragrup.com.tr': { password: 'manager123', role: 'manager', name: 'CENGİZHAN TUTUCU', region: 'İÇ ANADOLU', region_id: 1 },
            'ozturkyusuff@gmail.com': { password: '122334', role: 'employee', name: 'YUSUF ÖZTÜRK', region: 'İÇ ANADOLU', region_id: 1 }
        };
        
        const user = validUsers[email];
        if (!user || user.password !== password || user.role !== role) {
            throw new Error('Kullanıcı bulunamadı veya yetkisiz');
        }
        
        // Şifre kontrolü zaten yukarıda yapıldı
        
        // Kullanıcı bilgilerini düzenle
        const userData = {
            id: 1,
            name: user.name,
            email: email,
            role: user.role,
            store: null,
            store_id: null,
            manager: null,
            channel: null,
            region: user.region,
            region_id: user.region_id,
            created_at: new Date()
        };
        
        // Kullanıcı bilgilerini kaydet
        saveToStorage('currentUser', userData);
        
        // Başarılı giriş mesajı
        showAlert('Giriş başarılı! Yönlendiriliyorsunuz...', 'success');
        
        hideLoading();
        
        // 2 saniye sonra yönlendir
        setTimeout(() => {
            redirectToDashboard(role);
        }, 2000);
        
    } catch (error) {
        console.error('Giriş hatası:', error);
        showAlert('Giriş başarısız: ' + error.message, 'danger');
    }
}

// Kullanıcıyı rolüne göre yönlendiren fonksiyon
function redirectToDashboard(role) {
    console.log('Yönlendiriliyor, rol:', role);
    
    // Kullanıcı bilgileri zaten login fonksiyonunda kaydedildi
    // Burada sadece yönlendirme yapıyoruz
    
    switch(role) {
        case 'admin':
            window.location.href = 'admin-dashboard.html';
            break;
        case 'manager':
            window.location.href = 'admin-dashboard.html'; // Şimdilik admin ile aynı
            break;
        case 'employee':
            window.location.href = 'store-selection.html'; // Önce mağaza seçimi
            break;
        default:
            console.log('Bilinmeyen rol:', role);
            showAlert('Geçersiz rol seçimi!', 'danger');
    }
}

// Alert mesajı gösteren fonksiyon
function showAlert(message, type) {
    // Önceki alert'i kaldır
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Yeni alert oluştur
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.style.maxWidth = '500px';
    alertDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    alertDiv.style.borderRadius = '8px';
    alertDiv.style.fontWeight = '500';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Mobil için özel stil
    if (window.innerWidth <= 768) {
        alertDiv.style.top = '10px';
        alertDiv.style.right = '10px';
        alertDiv.style.left = '10px';
        alertDiv.style.minWidth = 'auto';
        alertDiv.style.maxWidth = 'none';
        alertDiv.style.fontSize = '14px';
        alertDiv.style.padding = '12px 16px';
    }
    
    // Alert'i body'ye ekle
    document.body.appendChild(alertDiv);
    
    // 5 saniye sonra otomatik kaldır
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Yükleme göstergesi
function showLoading(button) {
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Yükleniyor...';
    button.disabled = true;
    
    return function hideLoading() {
        button.innerHTML = originalText;
        button.disabled = false;
    };
}

// Tarih formatlama fonksiyonu
function formatDate(date) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(date).toLocaleDateString('tr-TR', options);
}

// Fotoğraf boyutunu kontrol eden fonksiyon
function validateImageSize(file, maxSizeMB = 1) {
    const maxSize = maxSizeMB * 1024 * 1024; // MB'yi byte'a çevir
    if (file.size > maxSize) {
        showAlert(`Dosya boyutu ${maxSizeMB}MB'dan büyük olamaz!`, 'danger');
        return false;
    }
    return true;
}

// Fotoğraf sıkıştırma fonksiyonu
function compressImage(file, quality = 0.8, maxWidth = 1920, maxHeight = 1080) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // Boyutları hesapla
            let { width, height } = img;
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
            }
            
            // Canvas boyutunu ayarla
            canvas.width = width;
            canvas.height = height;
            
            // Resmi çiz
            ctx.drawImage(img, 0, 0, width, height);
            
            // Sıkıştırılmış resmi al
            canvas.toBlob(resolve, 'image/jpeg', quality);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// Local Storage yardımcı fonksiyonları
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Local Storage hatası:', error);
        return false;
    }
}

function getFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Local Storage okuma hatası:', error);
        return null;
    }
}

// Kullanıcı oturumunu kontrol eden fonksiyon
function checkUserSession() {
    console.log('=== checkUserSession() başladı ===');
    const user = getFromStorage('currentUser');
    console.log('LocalStorage\'dan alınan kullanıcı:', user);
    
    if (!user) {
        console.log('Kullanıcı oturumu bulunamadı, index.html\'e yönlendiriliyor');
        window.location.href = 'index.html';
        return false;
    }
    
    console.log('Kullanıcı oturumu başarılı:', user);
    return user;
}

// Çıkış yapma fonksiyonu
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// API çağrısı yapan fonksiyon
async function apiCall(url, method = 'GET', data = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'API hatası');
        }
        
        return result;
    } catch (error) {
        console.error('API hatası:', error);
        showAlert('Bir hata oluştu: ' + error.message, 'danger');
        throw error;
    }
}
