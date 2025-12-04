// Ortak Navigasyon Fonksiyonları
// Tüm sayfalarda kullanılabilir

// Mobil menü kontrolü - Tüm ekran boyutları için
function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebarMenu');
    if (sidebar) {
        const isOpen = sidebar.style.left === '0px' || sidebar.classList.contains('show');
        
        if (isOpen) {
            // Menüyü kapat
            sidebar.style.left = '-250px';
            sidebar.classList.remove('show');
            document.body.classList.remove('sidebar-open');
        } else {
            // Menüyü aç
            sidebar.style.left = '0px';
            sidebar.classList.add('show');
            document.body.classList.add('sidebar-open');
        }
    }
}

// Menü dışına tıklandığında menüyü kapat
document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebarMenu');
    const toggler = document.querySelector('.navbar-toggler');
    
    if (sidebar && toggler && !sidebar.contains(event.target) && !toggler.contains(event.target)) {
        sidebar.classList.remove('show');
        if (sidebar.style) {
            sidebar.style.left = '-250px';
        }
    }
});

// Ekran boyutu değiştiğinde menüyü kapat
window.addEventListener('resize', function() {
    const sidebar = document.getElementById('sidebarMenu');
    if (sidebar && window.innerWidth > 767.98) {
        sidebar.classList.remove('show');
        if (sidebar.style) {
            sidebar.style.left = '';
        }
    }
});

// Geri git fonksiyonu - Rol bazlı dashboard'a yönlendir
function goBack() {
    // Önce currentUser'dan role bilgisini al
    let userRole = null;
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.role) {
            userRole = currentUser.role;
        }
    } catch (e) {
        console.warn('currentUser parse hatası:', e);
    }
    
    // Eğer currentUser'da yoksa diğer key'leri kontrol et
    if (!userRole) {
        userRole = localStorage.getItem('userRole') || localStorage.getItem('role');
    }
    
    // Hala role bulunamadıysa, kullanıcıyı login sayfasına yönlendir
    if (!userRole) {
        console.warn('Kullanıcı rolü bulunamadı, login sayfasına yönlendiriliyor');
        window.location.href = 'index.html';
        return;
    }
    
    // Role göre yönlendir
    if (userRole === 'admin' || userRole === 'manager') {
        window.location.href = 'admin-dashboard.html';
    } else if (userRole === 'marketing') {
        window.location.href = 'marketing-dashboard.html';
    } else {
        window.location.href = 'employee-dashboard.html';
    }
}

// Çıkış yap
function logout() {
    if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
}

// Kullanıcı bilgilerini yükle
function loadUserInfo() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const userName = currentUser?.name || localStorage.getItem('userName') || localStorage.getItem('name') || 'Kullanıcı';
        const userInfoElement = document.getElementById('user-name');
        if (userInfoElement) {
            userInfoElement.textContent = userName;
        }
    } catch (e) {
        const userName = localStorage.getItem('userName') || localStorage.getItem('name') || 'Kullanıcı';
        const userInfoElement = document.getElementById('user-name');
        if (userInfoElement) {
            userInfoElement.textContent = userName;
        }
    }
}

// Sayfa yüklendiğinde sidebar durumunu kontrol et
document.addEventListener('DOMContentLoaded', function() {
    // Desktop'ta sidebar'ı varsayılan olarak kapalı tut (kullanıcı hamburger menüye tıklayarak açabilir)
    const sidebar = document.getElementById('sidebarMenu');
    if (sidebar) {
        sidebar.style.left = '-250px';
        sidebar.classList.remove('show');
        document.body.classList.remove('sidebar-open');
    }
});

