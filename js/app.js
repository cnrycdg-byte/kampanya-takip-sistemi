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
    
    // Mevcut Service Worker'ı temizle - Güvenli versiyon
    if (location.protocol === 'http:' || location.protocol === 'https:') {
        if ('serviceWorker' in navigator) {
            // Önce mevcut Service Worker'ları kaldır
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                    registration.unregister();
                    console.log('Service Worker kaldırıldı:', registration);
                }
            }).catch(function(error) {
                console.log('Service Worker zaten temiz');
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
                }).catch(function(error) {
                    console.log('Cache zaten temiz');
                });
            }
            
            // Service Worker'ı tekrar kontrol et ve kaldır
            setTimeout(function() {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for(let registration of registrations) {
                        registration.unregister();
                        console.log('Service Worker tekrar kaldırıldı:', registration);
                    }
                }).catch(function(error) {
                    console.log('Service Worker zaten temiz (timeout)');
                });
            }, 1000);
        }
    } else {
        console.log('File protokolü tespit edildi, Service Worker işlemleri atlandı');
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
    
    // Sayfa yüklendiğinde kayıtlı bilgileri kontrol et (daha uzun gecikme ile)
    setTimeout(() => {
        loadRememberedCredentials();
    }, 500);
    
    // Alternatif olarak DOMContentLoaded event'ini de dinle
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            loadRememberedCredentials();
        }, 1000);
    });
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
        case 'marketing':
            window.location.href = 'marketing-dashboard.html';
            break;
        default:
            console.log('Bilinmeyen rol:', role);
            showAlert('Geçersiz rol seçimi!', 'danger');
    }
}

// Alert mesajı gösteren fonksiyon (tekrar önleme ile)
let lastAlertMessageApp = '';
let lastAlertTimeApp = 0;
const ALERT_COOLDOWN_APP = 2000;

function showAlert(message, type = 'info') {
    // Aynı mesajın çok sık gösterilmesini önle
    const now = Date.now();
    if (message === lastAlertMessageApp && (now - lastAlertTimeApp) < ALERT_COOLDOWN_APP) {
        return;
    }
    
    lastAlertMessageApp = message;
    lastAlertTimeApp = now;
    
    // Önceki alert'leri kaldır (tüm custom alert'ler)
    const existingAlerts = document.querySelectorAll('.custom-alert-app, .custom-alert, .custom-alert-detail, .custom-alert-areas');
    existingAlerts.forEach(alert => {
        alert.style.transition = 'opacity 0.3s';
        alert.style.opacity = '0';
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 300);
    });
    
    // Yeni alert oluştur
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} custom-alert-app`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.style.maxWidth = '500px';
    alertDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    alertDiv.style.borderRadius = '8px';
    alertDiv.style.padding = '12px 16px';
    alertDiv.style.display = 'flex';
    alertDiv.style.alignItems = 'center';
    alertDiv.style.justifyContent = 'space-between';
    alertDiv.style.gap = '12px';
    
    // X butonu için renk belirle
    let closeButtonColor = '#333';
    if (type === 'danger') closeButtonColor = '#721c24';
    else if (type === 'success') closeButtonColor = '#155724';
    else if (type === 'warning') closeButtonColor = '#856404';
    else if (type === 'info') closeButtonColor = '#004085';
    
    alertDiv.innerHTML = `
        <span style="flex: 1;">${message}</span>
        <button type="button" class="btn-close-alert-app" aria-label="Kapat" 
                style="background: none; border: none; font-size: 1.5rem; font-weight: bold; 
                       color: ${closeButtonColor}; opacity: 0.7; cursor: pointer; 
                       padding: 0; line-height: 1; transition: opacity 0.2s; 
                       width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
            &times;
        </button>
    `;
    
    // Mobil için özel stil
    if (window.innerWidth <= 768) {
        alertDiv.style.top = '10px';
        alertDiv.style.right = '10px';
        alertDiv.style.left = '10px';
        alertDiv.style.minWidth = 'auto';
        alertDiv.style.maxWidth = 'none';
    }
    
    // Alert'i body'ye ekle
    document.body.appendChild(alertDiv);
    
    // 5 saniye sonra otomatik kaldır - Timer'ı önce tanımla
    let autoCloseTimer = setTimeout(() => {
        if (alertDiv && alertDiv.parentNode) {
            alertDiv.style.transition = 'opacity 0.3s';
            alertDiv.style.opacity = '0';
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 300);
        }
    }, 5000);
    
    // Kapat butonuna tıklama eventi ekle
    const closeBtn = alertDiv.querySelector('.btn-close-alert-app');
    if (closeBtn) {
        // Hover efekti
        closeBtn.addEventListener('mouseenter', function() {
            this.style.opacity = '1';
        });
        closeBtn.addEventListener('mouseleave', function() {
            this.style.opacity = '0.7';
        });
        
        // Click eventi - Timer'ı iptal et ve alert'i kapat
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            clearTimeout(autoCloseTimer);
            alertDiv.style.transition = 'opacity 0.3s';
            alertDiv.style.opacity = '0';
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 300);
        });
    }
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
function compressImage(file, quality = 0.9, maxWidth = 1024, maxHeight = 768) {
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
function checkUserSession(redirectOnFail = true) {
    // Infinite loop önleme - çok güçlü
    if (window.checkingSession) {
        return window.lastUserSession || false;
    }
    
    // Son kontrol zamanını kontrol et (5 saniye içinde tekrar kontrol etme)
    const now = Date.now();
    if (window.lastSessionCheck && (now - window.lastSessionCheck) < 5000) {
        return window.lastUserSession || false;
    }
    
    window.checkingSession = true;
    window.lastSessionCheck = now;
    
    try {
        const user = getFromStorage('currentUser');
        
        if (!user) {
            if (redirectOnFail) {
                // Sadece employee-dashboard veya store-selection sayfalarında değilse yönlendir
                const currentPage = window.location.pathname;
                if (!currentPage.includes('employee-dashboard') && 
                    !currentPage.includes('store-selection')) {
                    window.location.href = 'index.html';
                }
            }
            return false;
        }
        
        window.lastUserSession = user;
        return user;
    } finally {
        window.checkingSession = false; // Her durumda temizle
    }
}

// Çıkış yapma fonksiyonu
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Kayıtlı bilgileri yükleme fonksiyonu - Güvenli versiyon
function loadRememberedCredentials() {
    // Fonksiyonu tamamen güvenli hale getir
    try {
        // Önce elementlerin varlığını kontrol et
        const emailElement = document.querySelector('#email');
        const roleElement = document.querySelector('#role');
        const rememberMeElement = document.querySelector('#rememberMe');
        
        // Elementler yoksa hiçbir şey yapma
        if (!emailElement || !roleElement || !rememberMeElement) {
            console.log('Form elementleri bulunamadı, loadRememberedCredentials atlanıyor');
            return;
        }
        
        // Elementlerin DOM'da tam olarak yüklendiğinden emin ol
        if (!emailElement.offsetParent && !roleElement.offsetParent && !rememberMeElement.offsetParent) {
            console.log('Form elementleri görünür değil, loadRememberedCredentials atlanıyor');
            return;
        }
        
        // Local storage'dan veri al
        let remembered = null;
        try {
            const stored = localStorage.getItem('rememberedCredentials');
            if (stored) {
                remembered = JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Local storage okuma hatası:', e);
            return;
        }
        
        // Veri varsa ve rememberMe true ise değerleri ata
        if (remembered && remembered.rememberMe === true) {
            // Email değerini ata
            if (remembered.email && emailElement.tagName === 'INPUT') {
                try {
                    emailElement.value = remembered.email;
                    console.log('Email değeri yüklendi:', remembered.email);
                } catch (e) {
                    console.warn('Email değer atama hatası:', e);
                }
            }
            
            // Role değerini ata
            if (remembered.role && roleElement.tagName === 'SELECT') {
                try {
                    roleElement.value = remembered.role;
                    console.log('Role değeri yüklendi:', remembered.role);
                } catch (e) {
                    console.warn('Role değer atama hatası:', e);
                }
            }
            
            // RememberMe checkbox'ını işaretle
            if (rememberMeElement.tagName === 'INPUT' && rememberMeElement.type === 'checkbox') {
                try {
                    rememberMeElement.checked = true;
                    console.log('RememberMe checkbox işaretlendi');
                } catch (e) {
                    console.warn('RememberMe checkbox hatası:', e);
                }
            }
        }
    } catch (error) {
        console.error('loadRememberedCredentials genel hatası:', error);
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

// Tüm statik alert-info'ları otomatik kapanan hale getir
function initAutoCloseAlerts() {
    // Sayfa yüklendiğinde çalış
    setTimeout(() => {
        const staticAlerts = document.querySelectorAll('.alert-info:not(.custom-alert-app):not(.custom-alert):not(.custom-alert-detail):not(.custom-alert-areas):not(.custom-alert-survey-reports)');
        
        staticAlerts.forEach(alert => {
            // Eğer zaten kapat butonu varsa ve otomatik kapanma eklenmişse, tekrar ekleme
            if (alert.dataset.autoCloseAdded === 'true') {
                return;
            }
            
            // Kapat butonu yoksa ekle
            if (!alert.querySelector('.btn-close')) {
                const closeBtn = document.createElement('button');
                closeBtn.type = 'button';
                closeBtn.className = 'btn-close';
                closeBtn.setAttribute('aria-label', 'Kapat');
                closeBtn.style.marginLeft = 'auto';
                closeBtn.style.opacity = '0.7';
                
                // Alert'in içeriğini flex container yap
                if (alert.style.display !== 'flex') {
                    const originalContent = alert.innerHTML;
                    alert.style.display = 'flex';
                    alert.style.alignItems = 'center';
                    alert.style.justifyContent = 'space-between';
                    alert.innerHTML = `<span style="flex: 1;">${originalContent}</span>`;
                    alert.appendChild(closeBtn);
                } else {
                    alert.appendChild(closeBtn);
                }
            }
            
            // 5 saniye sonra otomatik kapat
            const autoCloseTimer = setTimeout(() => {
                if (alert.parentNode) {
                    alert.style.transition = 'opacity 0.3s, transform 0.3s';
                    alert.style.opacity = '0';
                    alert.style.transform = 'translateX(100%)';
                    setTimeout(() => {
                        if (alert.parentNode) {
                            alert.remove();
                        }
                    }, 300);
                }
            }, 5000);
            
            // Kapat butonuna tıklama eventi
            const closeBtn = alert.querySelector('.btn-close');
            if (closeBtn) {
                const closeHandler = function() {
                    clearTimeout(autoCloseTimer);
                    alert.style.transition = 'opacity 0.3s, transform 0.3s';
                    alert.style.opacity = '0';
                    alert.style.transform = 'translateX(100%)';
                    setTimeout(() => {
                        if (alert.parentNode) {
                            alert.remove();
                        }
                    }, 300);
                };
                
                closeBtn.addEventListener('click', closeHandler);
            }
            
            // İşaretle ki tekrar eklenmesin
            alert.dataset.autoCloseAdded = 'true';
        });
    }, 100);
}

// Sayfa yüklendiğinde ve DOM değişikliklerinde çalıştır
document.addEventListener('DOMContentLoaded', function() {
    initAutoCloseAlerts();
    
    // MutationObserver ile dinamik eklenen alert'leri de yakala
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                // Yeni eklenen alert'leri kontrol et
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && node.classList.contains('alert-info')) {
                            setTimeout(initAutoCloseAlerts, 50);
                        } else if (node.querySelector && node.querySelector('.alert-info')) {
                            setTimeout(initAutoCloseAlerts, 50);
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});
