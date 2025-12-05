// Mağaza Seçim JavaScript Dosyası

let allStores = [];
let filteredStores = [];
let selectedStore = null;

// Departman seçildiğinde
function departmentSelected() {
    const department = document.getElementById('department-select-top').value;
    const filtersSection = document.getElementById('filters-section');
    const storesSection = document.getElementById('stores-container').parentElement;
    
    if (department) {
        if (filtersSection) filtersSection.style.display = 'flex';
        if (storesSection) storesSection.style.display = 'block';
        showAlert('Departman seçildi! Şimdi mağazanızı seçin.', 'success');

        // Seçilen departmanı hemen oturuma yaz
        const user = getFromStorage('currentUser') || {};
        user.department = department;
        saveToStorage('currentUser', user);
        
        // Seçilen departmanı özet kutusunda göster
        const depName = document.getElementById('selected-department-name');
        if (depName) depName.textContent = department;
    } else {
        if (filtersSection) filtersSection.style.display = 'none';
        if (storesSection) storesSection.style.display = 'none';
    }
}

// Sayfa yüklendiğinde çalışacak kod
document.addEventListener('DOMContentLoaded', function() {
    console.log('Mağaza seçim sayfası yüklendi');
    
    // Kullanıcı oturumunu kontrol et (redirectOnFail = false, çünkü kendimiz yöneteceğiz)
    const user = checkUserSession(false);
    if (!user) {
        console.log('Kullanıcı oturumu bulunamadı, giriş sayfasına yönlendiriliyor');
        showAlert('Oturum bulunamadı. Lütfen giriş yapın.', 'warning');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    // Mağaza çalışanı yetkisi kontrolü
    if (user.role !== 'employee') {
        showAlert('Bu sayfaya erişim yetkiniz yok!', 'danger');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    console.log('Kullanıcı oturumu doğrulandı:', user);
    
    // Mağaza verilerini yükle
    loadStores();
    
    // Global mağaza güncelleme eventini dinle
    window.addEventListener('storesUpdated', function() {
        console.log('Mağaza listesi güncellendi, yeniden yükleniyor...');
        loadStores();
    });
});

// Mağaza verilerini yükleyen fonksiyon
async function loadStores() {
    try {
        console.log('Mağaza verileri yükleniyor...');
        
        // Supabase'den gerçek mağaza verilerini çek
        const { data: stores, error } = await supabase
            .from('stores')
            .select(`
                id,
                name,
                channel_id,
                region_id,
                manager_id,
                channels (
                    id,
                    name
                ),
                regions (
                    id,
                    name,
                    manager_name
                )
            `)
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        console.log('Supabase\'den mağazalar çekildi:', stores.length, 'mağaza');
        
        // Veriyi işle
        allStores = stores.map(store => ({
            id: store.id,
            name: store.name,
            manager: store.regions?.manager_name || 'Belirtilmemiş',
            managerId: store.manager_id,
            channel: store.channels?.name || 'Belirtilmemiş',
            channelId: store.channel_id,
            address: store.regions?.name || 'Belirtilmemiş',
            phone: '0212 000 00 00' // Telefon bilgisi yoksa varsayılan
        }));

        filteredStores = [...allStores];
        displayStores();
        loadFilterOptions();

    } catch (error) {
        console.error('Mağaza verileri yüklenirken hata:', error);
        showAlert('Mağaza verileri yüklenirken hata oluştu!', 'danger');
        // Hata durumunda örnek verileri yükle
        loadSampleStores();
    }
}

// Filtreleme seçeneklerini yükleyen fonksiyon
function loadFilterOptions() {
    // Yönetici seçeneklerini yükle
    const managerSelect = document.getElementById('manager-select');
    const managers = [...new Set(allStores.map(store => store.manager))];
    
    managerSelect.innerHTML = '<option value="">Tüm Yöneticiler</option>';
    managers.forEach(manager => {
        const option = document.createElement('option');
        option.value = manager;
        option.textContent = manager;
        managerSelect.appendChild(option);
    });

    // Kanal seçeneklerini yükle
    const channelSelect = document.getElementById('channel-select');
    const channels = [...new Set(allStores.map(store => store.channel))];
    
    channelSelect.innerHTML = '<option value="">Tüm Kanallar</option>';
    channels.forEach(channel => {
        const option = document.createElement('option');
        option.value = channel;
        option.textContent = channel;
        channelSelect.appendChild(option);
    });
}

// Örnek mağaza verileri (hata durumunda)
function loadSampleStores() {
    allStores = [
        {
            id: 1,
            name: 'Media Mark Kadıköy',
            manager: 'Ahmet Yılmaz',
            managerId: 1,
            channel: 'Media Mark',
            channelId: 1,
            address: 'Kadıköy, İstanbul',
            phone: '0216 123 45 67'
        },
        {
            id: 2,
            name: 'Media Mark Beşiktaş',
            manager: 'Ahmet Yılmaz',
            managerId: 1,
            channel: 'Media Mark',
            channelId: 1,
            address: 'Beşiktaş, İstanbul',
            phone: '0212 234 56 78'
        },
        {
            id: 3,
            name: 'Teknosa Şişli',
            manager: 'Ayşe Demir',
            managerId: 2,
            channel: 'Teknosa',
            channelId: 2,
            address: 'Şişli, İstanbul',
            phone: '0212 345 67 89'
        },
        {
            id: 4,
            name: 'Teknosa Bakırköy',
            manager: 'Ayşe Demir',
            managerId: 2,
            channel: 'Teknosa',
            channelId: 2,
            address: 'Bakırköy, İstanbul',
            phone: '0212 456 78 90'
        },
        {
            id: 5,
            name: 'Vatan Maltepe',
            manager: 'Mehmet Kaya',
            managerId: 3,
            channel: 'Vatan',
            channelId: 3,
            address: 'Maltepe, İstanbul',
            phone: '0216 567 89 01'
        },
        {
            id: 6,
            name: 'Vatan Üsküdar',
            manager: 'Mehmet Kaya',
            managerId: 3,
            channel: 'Vatan',
            channelId: 3,
            address: 'Üsküdar, İstanbul',
            phone: '0216 678 90 12'
        },
        {
            id: 7,
            name: 'Media Mark Ataşehir',
            manager: 'Fatma Özkan',
            managerId: 4,
            channel: 'Media Mark',
            channelId: 1,
            address: 'Ataşehir, İstanbul',
            phone: '0216 789 01 23'
        },
        {
            id: 8,
            name: 'Teknosa Kartal',
            manager: 'Fatma Özkan',
            managerId: 4,
            channel: 'Teknosa',
            channelId: 2,
            address: 'Kartal, İstanbul',
            phone: '0216 890 12 34'
        }
    ];
    
    filteredStores = [...allStores];
    displayStores();
}

// Mağazaları görüntüleyen fonksiyon
function displayStores() {
    const container = document.getElementById('stores-container');
    container.innerHTML = '';
    
    if (filteredStores.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-warning">
                    <i class="fas fa-search me-2"></i>
                    Arama kriterlerinize uygun mağaza bulunamadı.
                </div>
            </div>
        `;
        return;
    }
    
    filteredStores.forEach(store => {
        const storeCard = createStoreCard(store);
        container.appendChild(storeCard);
    });
}

// Mağaza kartı oluşturan fonksiyon
function createStoreCard(store) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-3';
    
    const isSelected = selectedStore && selectedStore.id === store.id;
    
    col.innerHTML = `
        <div class="card h-100 store-card ${isSelected ? 'border-success bg-light' : ''}" 
             onclick="selectStore(${store.id})" style="cursor: pointer;">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="card-title mb-0">${store.name}</h6>
                    ${isSelected ? '<i class="fas fa-check-circle text-success"></i>' : ''}
                </div>
                <p class="card-text text-muted small mb-2">
                    <i class="fas fa-user me-1"></i>${store.manager}
                </p>
                <p class="card-text text-muted small mb-2">
                    <i class="fas fa-sitemap me-1"></i>${store.channel}
                </p>
                <p class="card-text text-muted small mb-2">
                    <i class="fas fa-map-marker-alt me-1"></i>${store.address}
                </p>
                <p class="card-text text-muted small">
                    <i class="fas fa-phone me-1"></i>${store.phone}
                </p>
            </div>
            <div class="card-footer bg-transparent">
                <button class="btn btn-outline-primary btn-sm w-100" onclick="event.stopPropagation(); selectStore(${store.id})">
                    ${isSelected ? 'Seçildi' : 'Seç'}
                </button>
            </div>
        </div>
    `;
    
    return col;
}

// Mağaza seçen fonksiyon
function selectStore(storeId) {
    selectedStore = allStores.find(store => store.id === storeId);
    
    if (selectedStore) {
        // Departman kontrolü ve kaydı
        const topSelectEl = document.getElementById('department-select-top');
        let selectedDepartment = topSelectEl && topSelectEl.value ? String(topSelectEl.value).trim() : '';
        if (!selectedDepartment) {
            const userTmp = getFromStorage('currentUser');
            selectedDepartment = (userTmp && userTmp.department) ? String(userTmp.department).trim() : '';
        }
        if (!selectedDepartment) {
            showAlert('Lütfen departman seçiniz!', 'warning');
            if (topSelectEl) {
                setTimeout(() => {
                    topSelectEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    topSelectEl.focus();
                }, 150);
            }
            return;
        }
        // Departmanı storage'a yaz
        const userForDep = getFromStorage('currentUser') || {};
        userForDep.department = selectedDepartment;
        saveToStorage('currentUser', userForDep);
        // Önce container'ı görünür yap
        const storeInfoBox = document.getElementById('selected-store-info');
        if (storeInfoBox) {
            storeInfoBox.style.display = 'block';
            
            // Sonra içindeki elementlere değer ver
            const storeNameEl = document.getElementById('selected-store-name');
            const managerNameEl = document.getElementById('selected-manager-name');
            const channelNameEl = document.getElementById('selected-channel-name');
            const departmentNameEl = document.getElementById('selected-department-name');
            
            if (storeNameEl) storeNameEl.textContent = selectedStore.name;
            if (managerNameEl) managerNameEl.textContent = selectedStore.manager;
            if (channelNameEl) channelNameEl.textContent = selectedStore.channel;
            
            // Departman bilgisini de göster
            if (departmentNameEl) {
                departmentNameEl.textContent = selectedDepartment || 'Belirtilmemiş';
            }
        }
        
        // Kartları yenile
        displayStores();
        
        // Başarı mesajı
        showAlert(`${selectedStore.name} mağazası seçildi! Dashboard'a yönlendiriliyorsunuz...`, 'success');
        
        // Mağaza bilgisi kutusuna otomatik scroll
        setTimeout(() => {
            if (storeInfoBox) {
                storeInfoBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 200);
        
        // Departman seçili olduğu garanti, otomatik yönlendir
        console.log('Departman seçili, otomatik yönlendiriliyor...');
        continueToDashboard();
    }
}

// Mağazaları filtreleyen fonksiyon
function filterStores() {
    const managerFilter = document.getElementById('manager-select').value;
    const channelFilter = document.getElementById('channel-select').value;
    const searchFilter = document.getElementById('store-search').value.toLowerCase();
    
    filteredStores = allStores.filter(store => {
        const matchesManager = !managerFilter || store.manager === managerFilter;
        const matchesChannel = !channelFilter || store.channel === channelFilter;
        const matchesSearch = !searchFilter || 
            store.name.toLowerCase().includes(searchFilter) ||
            store.manager.toLowerCase().includes(searchFilter) ||
            store.address.toLowerCase().includes(searchFilter);
        
        return matchesManager && matchesChannel && matchesSearch;
    });
    
    displayStores();
}

// Departman seçilince kontrol et
function checkCanProceed() {
    const topSelect = document.getElementById('department-select-top');
    const continueBtn = document.getElementById('continue-btn');
    const department = topSelect ? topSelect.value : '';
    if (continueBtn) continueBtn.disabled = !department;
}

// Dashboard'a devam eden fonksiyon
function continueToDashboard() {
    if (!selectedStore) {
        showAlert('Lütfen bir mağaza seçin!', 'danger');
        return;
    }
    
    // Departman kontrolü
    const departmentSelect = document.getElementById('department-select-top');
    // Önce DOM'dan oku, yoksa currentUser'dan al
    let department = departmentSelect && departmentSelect.value ? departmentSelect.value : null;
    if (!department) {
        const userFromStorage = getFromStorage('currentUser');
        department = userFromStorage && userFromStorage.department ? userFromStorage.department : null;
    }
    if (!department) {
        showAlert('Lütfen departman seçiniz!', 'danger');
        if (departmentSelect) departmentSelect.focus();
        return;
    }
    
    // Kullanıcı bilgilerini güncelle
    const user = getFromStorage('currentUser');
    if (user) {
        user.store = selectedStore.name;
        user.storeId = selectedStore.id; // camelCase
        user.store_id = selectedStore.id; // snake_case (guard uyumluluğu)
        user.manager = selectedStore.manager;
        user.channel = selectedStore.channel;
        user.department = department;
    console.log('Devam et: user güncellendi', user);
        saveToStorage('currentUser', user);
    } else {
        console.warn('Devam et: currentUser bulunamadı, yönlendirme iptal');
        showAlert('Oturum bulunamadı. Lütfen tekrar giriş yapın.', 'danger');
        return;
    }
    
    // Kullanıcı bilgilerini kaydet
    console.log('Kullanıcı bilgileri kaydediliyor:', user);
    saveToStorage('currentUser', user);
    
    // Hemen kontrol et (bekleme yok)
    const savedUser = getFromStorage('currentUser');
    if (!savedUser || (!savedUser.storeId && !savedUser.store_id)) {
        console.error('Kullanıcı bilgileri kaydedilemedi!');
        showAlert('Bir hata oluştu. Lütfen tekrar deneyin.', 'danger');
        return;
    }
    
    console.log('Kullanıcı bilgileri kaydedildi, yönlendiriliyor:', savedUser);
    
    // Dashboard'a yönlendir (from parametresi olmadan, çünkü bilgiler hazır)
    const targetUrl = new URL('employee-dashboard.html', location.href).href;
    if (window.opener && !window.opener.closed) {
        try {
            window.opener.location.href = targetUrl;
            window.close();
            return;
        } catch (e) {
            console.warn('Opener yönlendirme engellendi, mevcut pencereden yönlendiriliyor');
        }
    }
    
    // Normal sayfa ise mevcut pencereyi yönlendir
    window.location.replace(targetUrl);
}

// Mağaza kartlarına hover efekti ekleyen fonksiyon
function addHoverEffects() {
    const storeCards = document.querySelectorAll('.store-card');
    storeCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            if (!this.classList.contains('border-success')) {
                this.classList.add('border-primary');
            }
        });
        
        card.addEventListener('mouseleave', function() {
            if (!this.classList.contains('border-success')) {
                this.classList.remove('border-primary');
            }
        });
    });
}

// Arama kutusuna odaklanma
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('store-search');
    if (searchInput) {
        searchInput.focus();
    }
});

// Klavye kısayolları
document.addEventListener('keydown', function(event) {
    // Enter tuşu ile devam et
    if (event.key === 'Enter' && selectedStore) {
        continueToDashboard();
    }
    
    // Escape tuşu ile çıkış
    if (event.key === 'Escape') {
        logout();
    }
});
