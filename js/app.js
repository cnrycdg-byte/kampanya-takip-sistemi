// Kampanya Takip Sistemi - Ana JavaScript Dosyası

// Sayfa yüklendiğinde çalışacak kod
document.addEventListener('DOMContentLoaded', function() {
    console.log('Kampanya Takip Sistemi yüklendi');
    
    // PWA Service Worker'ı kaydet - DEVRE DIŞI
    // Service Worker sorunlara neden olduğu için kaldırıldı
    /*
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('Service Worker kaydedildi:', registration);
            })
            .catch(function(error) {
                console.log('Service Worker kaydı başarısız:', error);
            });
    }
    */
    
    // Mevcut Service Worker'ı temizle - AGGRESSIVE
    if ('serviceWorker' in navigator) {
        // Önce mevcut Service Worker'ları kaldır
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for(let registration of registrations) {
                registration.unregister();
                console.log('Service Worker kaldırıldı:', registration);
            }
        });
        
        // Service Worker'ı tamamen devre dışı bırak
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({action: 'SKIP_WAITING'});
        }
        
        // Cache'i de temizle
        if ('caches' in window) {
            caches.keys().then(function(cacheNames) {
                return Promise.all(
                    cacheNames.map(function(cacheName) {
                        console.log('Cache temizleniyor:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
            });
        }
        
        // Service Worker'ı tekrar kontrol et ve kaldır
        setTimeout(function() {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                    registration.unregister();
                    console.log('Service Worker tekrar kaldırıldı:', registration);
                }
            });
        }, 1000);
    }
    
    // Giriş formunu dinle
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Şifremi unuttum linkini dinle
    const forgotPasswordLink = document.getElementById('forgotPassword');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', handleForgotPassword);
    }
    
    // Sayfa yüklendiğinde kayıtlı bilgileri kontrol et (kısa bir gecikme ile)
    setTimeout(() => {
        loadRememberedCredentials();
    }, 100);
});

// Giriş işlemini yöneten fonksiyon
async function handleLogin(event) {
    event.preventDefault(); // Sayfanın yenilenmesini engelle
    
    // Form verilerini al
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Basit doğrulama
    if (!email || !password || !role) {
        showAlert('Lütfen tüm alanları doldurun!', 'danger');
        return;
    }
    
    try {
        // Yükleme göstergesi
        const submitBtn = document.querySelector('#loginForm button[type="submit"]');
        const hideLoading = showLoading(submitBtn);
        
        // Supabase'den kullanıcı bilgilerini al
        console.log('Giriş denemesi:', { email, role });
        const { data: user, error: userError } = await supabase
            .from('users')
            .select(`
                id,
                name,
                email,
                password,
                role,
                region_id,
                regions(name)
            `)
            .eq('email', email)
            .eq('is_active', true)
            .single();
        
        console.log('Supabase sorgu sonucu:', { user, userError });
        
        if (userError || !user) {
            throw new Error('Kullanıcı bulunamadı');
        }
        
        if (user.password !== password) {
            throw new Error('Şifre hatalı');
        }
        
        if (user.role !== role) {
            throw new Error('Rol uyumsuzluğu');
        }
        
        // Şifre kontrolü zaten yukarıda yapıldı
        
        // Kullanıcı bilgilerini düzenle
        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            store: null,
            store_id: null,
            manager: null,
            channel: null,
            region: user.regions?.name || 'Belirtilmemiş',
            region_id: user.region_id,
            created_at: new Date()
        };
        
        // Kullanıcı bilgilerini kaydet
        saveToStorage('currentUser', userData);
        
        // Beni hatırla özelliği
        if (rememberMe) {
            saveToStorage('rememberedCredentials', {
                email: email,
                role: role,
                rememberMe: true
            });
        } else {
            // Eğer beni hatırla seçili değilse, kayıtlı bilgileri sil
            localStorage.removeItem('rememberedCredentials');
        }
        
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
        
        // Hata durumunda loading'i kapat
        const submitBtn = document.querySelector('#loginForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Giriş Yap';
            submitBtn.disabled = false;
        }
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

// Kayıtlı bilgileri yükleme fonksiyonu
function loadRememberedCredentials() {
    try {
        // Elementlerin yüklenmesini bekle
        const emailElement = document.getElementById('email');
        const roleElement = document.getElementById('role');
        const rememberMeElement = document.getElementById('rememberMe');
        
        // Elementler yoksa fonksiyonu sonlandır
        if (!emailElement || !roleElement || !rememberMeElement) {
            console.log('Form elementleri henüz yüklenmemiş, loadRememberedCredentials atlanıyor');
            return;
        }
        
        const remembered = getFromStorage('rememberedCredentials');
        if (remembered && remembered.rememberMe) {
            // Güvenli değer atama
            try {
                if (emailElement && typeof emailElement.value !== 'undefined') {
                    emailElement.value = remembered.email || '';
                }
            } catch (e) {
                console.warn('Email element değer atama hatası:', e);
            }
            
            try {
                if (roleElement && typeof roleElement.value !== 'undefined') {
                    roleElement.value = remembered.role || '';
                }
            } catch (e) {
                console.warn('Role element değer atama hatası:', e);
            }
            
            try {
                if (rememberMeElement && typeof rememberMeElement.checked !== 'undefined') {
                    rememberMeElement.checked = true;
                }
            } catch (e) {
                console.warn('RememberMe element değer atama hatası:', e);
            }
        }
    } catch (error) {
        console.error('Kayıtlı bilgiler yüklenirken hata:', error);
    }
}

// Şifremi unuttum fonksiyonu
function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = prompt('Şifre sıfırlama e-postası gönderilecek e-posta adresinizi girin:');
    if (email) {
        // E-posta doğrulama
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('Geçerli bir e-posta adresi girin!', 'danger');
            return;
        }
        
        // Mock e-posta gönderme (gerçek uygulamada API çağrısı yapılır)
        showAlert('Şifre sıfırlama e-postası gönderildi! E-posta kutunuzu kontrol edin.', 'success');
        
        // Gerçek uygulamada burada API çağrısı yapılır:
        // sendPasswordResetEmail(email);
    }
}

// Şifre sıfırlama e-postası gönderme fonksiyonu (mock)
async function sendPasswordResetEmail(email) {
    try {
        // Bu fonksiyon gerçek uygulamada backend API'sine istek gönderir
        console.log('Şifre sıfırlama e-postası gönderiliyor:', email);
        
        // Mock başarılı yanıt
        return { success: true, message: 'E-posta gönderildi' };
    } catch (error) {
        console.error('E-posta gönderme hatası:', error);
        throw error;
    }
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
