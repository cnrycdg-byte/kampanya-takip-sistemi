// Manager Dashboard script

document.addEventListener('DOMContentLoaded', function() {
    const user = checkUserSession();
    if (!user) return;
    if (user.role !== 'manager' && user.role !== 'admin') {
        showAlert('Bu sayfaya erişim yetkiniz yok!', 'danger');
        setTimeout(() => window.location.href = 'index.html', 1500);
        return;
    }

    // Navbar kullanıcı ve bölge etiketi
    const nameEl = document.getElementById('user-name');
    if (nameEl) nameEl.textContent = user.name || 'Yönetici';
    const regionEl = document.getElementById('manager-region');
    if (regionEl) regionEl.textContent = user.region || '-';

    // Açılışta anket raporları sekmesini göster
    showManagerSection('survey-reports');
});

function showManagerSection(section) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => s.style.display = 'none');
    const target = document.getElementById(section + '-section');
    if (target) target.style.display = 'block';

    const titleMap = {
        'region-overview': 'Bölge Özeti',
        'survey-reports': 'Anket Raporları',
        'promoter-reports': 'Promotör Raporu',
        'investment-reports': 'Yatırım Alanı Raporu',
        'basket-reports': 'Sepet Raporu',
        'price-track-reports': 'Fiyat Takip Raporu',
        'weekly-meeting': 'Haftalık Toplantı'
    };
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = titleMap[section] || 'Bölge Özeti';

    // İlk gösterimde raporları yükle
    if (section === 'survey-reports') {
        setTimeout(() => {
            const a = document.querySelector('a.nav-link[href="#survey-reports"]');
            if (a) a.click();
        }, 10);
    }
    if (section === 'promoter-reports') {
        setTimeout(() => {
            const a = document.querySelector('a.nav-link[href="#promoter-reports"]');
            if (a) a.click();
        }, 10);
    }
    if (section === 'investment-reports') {
        setTimeout(() => {
            const a = document.querySelector('a.nav-link[href="#investment-reports"]');
            if (a) a.click();
        }, 10);
    }
    if (section === 'basket-reports') {
        setTimeout(() => {
            const a = document.querySelector('a.nav-link[href="#basket-reports"]');
            if (a) a.click();
        }, 10);
    }
    if (section === 'price-track-reports') {
        setTimeout(() => {
            const a = document.querySelector('a.nav-link[href="#price-track-reports"]');
            if (a) a.click();
        }, 10);
    }
}

// Bölge özet grafikleri kaldırıldı (istenmiyor)

function saveMeetingNotes() {
    showAlert('Notlar kaydedildi (placeholder).', 'success');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('show');
}


