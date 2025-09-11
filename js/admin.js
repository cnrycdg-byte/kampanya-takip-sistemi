// Admin Panel JavaScript Dosyası

// Mobil menü kontrolü
function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebarMenu');
    if (sidebar) {
        if (sidebar.style.left === '0px' || sidebar.classList.contains('show')) {
            sidebar.style.left = '-250px';
            sidebar.classList.remove('show');
        } else {
            sidebar.style.left = '0px'; 
            sidebar.classList.add('show');
        }
    }
}

// Menü dışına tıklandığında menüyü kapat
document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebarMenu');
    const toggler = document.querySelector('.navbar-toggler');
    
    if (sidebar && toggler && !sidebar.contains(event.target) && !toggler.contains(event.target)) {
        sidebar.classList.remove('show');
    }
});

// Sayfa yüklendiğinde çalışacak kod
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin panel yüklendi');
    
    // Kullanıcı oturumunu kontrol et
    const user = checkUserSession();
    if (!user) {
        return;
    }
    
    // Admin yetkisi kontrolü
    if (user.role !== 'admin' && user.role !== 'manager') {
        showAlert('Bu sayfaya erişim yetkiniz yok!', 'danger');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    // Yönetici ise sadece kendi bölgesindeki mağazaları göster
    if (user.role === 'manager') {
        loadManagerData(user);
    }
    
    // Dashboard verilerini yükle
    loadDashboardData();
    
    // Görev oluşturma formunu dinle
    const createTaskForm = document.getElementById('create-task-form');
    if (createTaskForm) {
        createTaskForm.addEventListener('submit', handleCreateTask);
    }
    
    // Kullanıcı ekleme formunu dinle
    const addUserForm = document.getElementById('add-user-form');
    if (addUserForm) {
        addUserForm.addEventListener('submit', handleAddUser);
    }
    
    // Mağaza ekleme formunu dinle
    const addStoreForm = document.getElementById('add-store-form');
    if (addStoreForm) {
        addStoreForm.addEventListener('submit', handleAddStore);
    }
    
    // Kanal seçim event'ini dinle
    const channelSelect = document.getElementById('task-channel');
    if (channelSelect) {
        channelSelect.addEventListener('change', filterStoresByChannel);
    }
    
    // Tarih alanlarını ayarla
    setupDateFields();
    
    // Dropdown'ları yükle
    loadDropdowns();
});

// Dashboard verilerini yükleyen fonksiyon
async function loadDashboardData() {
    console.log('Dashboard verileri yükleniyor...');
    
    try {
        // Kullanıcı listesini yükle
        await loadUsersList();
        
        // Görevleri yükle
        await loadTasksList();
        
        // Mağazaları yükle
        await loadStoresList();
        
        // Dropdown'ları yükle
        loadDropdowns();
        
        // Gerçek verilerle istatistikleri hesapla
        const tasks = allTasks || [];
        const stores = allStores || [];
        
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.status === 'completed').length;
        const activeTasks = tasks.filter(task => task.status === 'active').length;
        const lateTasks = tasks.filter(task => {
            const endDate = new Date(task.end_date);
            const now = new Date();
            return endDate < now && task.status !== 'completed';
        }).length;
        
        // İstatistikleri güncelle
        document.getElementById('total-tasks').textContent = totalTasks;
        document.getElementById('completed-tasks').textContent = completedTasks;
        document.getElementById('active-tasks').textContent = activeTasks;
        document.getElementById('late-tasks').textContent = lateTasks;
        
        // Görev detay istatistiklerini yükle
        await loadTaskDetailStats(tasks);
        
        // Son görevleri yükle
        loadRecentTasks(tasks);
        
    } catch (error) {
        console.error('Dashboard verileri yüklenirken hata:', error);
    }
}

// Görev detay istatistiklerini yükleyen fonksiyon
async function loadTaskDetailStats(tasks) {
    try {
        const container = document.getElementById('task-stats-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        for (const task of tasks) {
            // Görev atamalarını al
            const { data: assignments, error } = await supabase
                .from('task_assignments')
                .select(`
                    id,
                    status,
                    photo_urls,
                    stores(name, manager_id, regions(name, manager_name))
                `)
                .eq('task_id', task.id);
            
            if (error) {
                console.error('Görev atamaları alınırken hata:', error);
                continue;
            }
            
            const totalStores = assignments.length;
            const completedStores = assignments.filter(a => a.status === 'completed' && a.photo_urls && a.photo_urls.length > 0).length;
            const inProgressStores = assignments.filter(a => a.status === 'in_progress').length;
            const notStartedStores = assignments.filter(a => a.status === 'assigned').length;
            
            const completionRate = totalStores > 0 ? Math.round((completedStores / totalStores) * 100) : 0;
            
            // Görev kartı oluştur
            const taskCard = document.createElement('div');
            taskCard.className = 'col-xl-4 col-md-6 mb-4';
            taskCard.innerHTML = `
                <div class="card shadow h-100">
                    <div class="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                        <h6 class="m-0 font-weight-bold text-primary">${task.title}</h6>
                        <span class="badge bg-${getTaskStatusColor(task.status)}">${getTaskStatusText(task.status)}</span>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-6">
                                <div class="text-xs font-weight-bold text-uppercase mb-1">Toplam Mağaza</div>
                                <div class="h5 mb-0 font-weight-bold text-gray-800">${totalStores}</div>
                            </div>
                            <div class="col-6">
                                <div class="text-xs font-weight-bold text-uppercase mb-1">Tamamlayan</div>
                                <div class="h5 mb-0 font-weight-bold text-success">${completedStores}</div>
                            </div>
                        </div>
                        <div class="row mt-2">
                            <div class="col-6">
                                <div class="text-xs font-weight-bold text-uppercase mb-1">Devam Eden</div>
                                <div class="h5 mb-0 font-weight-bold text-warning">${inProgressStores}</div>
                            </div>
                            <div class="col-6">
                                <div class="text-xs font-weight-bold text-uppercase mb-1">Başlamayan</div>
                                <div class="h5 mb-0 font-weight-bold text-secondary">${notStartedStores}</div>
                            </div>
                        </div>
                        <div class="mt-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="text-xs font-weight-bold text-uppercase">Tamamlanma Oranı</span>
                                <span class="text-xs font-weight-bold">${completionRate}%</span>
                            </div>
                            <div class="progress mt-1">
                                <div class="progress-bar bg-success" role="progressbar" style="width: ${completionRate}%" 
                                     aria-valuenow="${completionRate}" aria-valuemin="0" aria-valuemax="100"></div>
                            </div>
                        </div>
                        <div class="mt-3">
                            <small class="text-muted">
                                <i class="fas fa-calendar me-1"></i>
                                ${formatDateTime(task.start_date)} - ${formatDateTime(task.end_date)}
                            </small>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="btn-group w-100" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="viewTask(${task.id})">
                                <i class="fas fa-eye me-1"></i>Görüntüle
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="exportTaskToExcel(${task.id})">
                                <i class="fas fa-file-excel me-1"></i>Excel
                            </button>
                            <button class="btn btn-sm btn-outline-warning" onclick="exportTaskToPresentation(${task.id})">
                                <i class="fas fa-file-powerpoint me-1"></i>Sunum
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(taskCard);
        }
        
    } catch (error) {
        console.error('Görev detay istatistikleri yüklenirken hata:', error);
    }
}

// Görev durumu rengi
function getTaskStatusColor(status) {
    const colors = {
        'active': 'success',
        'in_progress': 'warning',
        'completed': 'primary',
        'cancelled': 'danger'
    };
    return colors[status] || 'secondary';
}

// Görev durumu metni
function getTaskStatusText(status) {
    const texts = {
        'active': 'Aktif',
        'in_progress': 'Devam Ediyor',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal'
    };
    return texts[status] || 'Bilinmiyor';
}

// Son görevleri yükleyen fonksiyon
function loadRecentTasks(tasks = []) {
    const tbody = document.querySelector('#recent-tasks-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Son 5 görevi al
    const recentTasks = tasks.slice(0, 5);
    
    if (recentTasks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    <i class="fas fa-inbox me-2"></i>Henüz görev bulunmuyor
                </td>
            </tr>
        `;
        return;
    }
    
    recentTasks.forEach(task => {
        const channelName = task.channels?.name || 'Bilinmiyor';
        const statusClass = getTaskStatusClass(task.status);
        const statusText = getTaskStatusText(task.status);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${task.title}</td>
            <td>${channelName}</td>
            <td><span class="badge bg-${statusClass}">${statusText}</span></td>
            <td>${formatDateTime(task.start_date)}</td>
            <td>${formatDateTime(task.end_date)}</td>
            <td>
                <div class="btn-group" role="group" style="display: flex; gap: 2px;">
                    <button class="btn btn-sm btn-primary" onclick="viewTask(${task.id})" title="Görüntüle" style="flex: 1;">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="exportTaskToExcel(${task.id})" title="Excel İndir" style="flex: 1; background-color: #28a745 !important; border-color: #28a745 !important;">
                        <i class="fas fa-file-excel"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="exportTaskToPresentation(${task.id})" title="Sunum İndir" style="flex: 1;">
                        <i class="fas fa-file-powerpoint"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTask(${task.id})" title="Sil" style="flex: 1;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
            <td>
                ${task.status !== 'completed' ? `
                    <button class="btn btn-sm btn-success" onclick="completeTask(${task.id}, ${task.id})" title="Görevi Sonlandır">
                        <i class="fas fa-check"></i>
                    </button>
                ` : '<span class="badge bg-success">Tamamlandı</span>'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Görev durumu CSS sınıfı
function getTaskStatusClass(status) {
    const classes = {
        'active': 'success',
        'in_progress': 'warning',
        'completed': 'primary',
        'cancelled': 'danger'
    };
    return classes[status] || 'secondary';
}

// Görev oluşturma formunu yöneten fonksiyon
function handleCreateTask(event) {
    event.preventDefault();
    
    // Form verilerini al
    const formData = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-description').value,
        category: document.getElementById('task-category').value,
        startDate: document.getElementById('task-start-date').value,
        endDate: document.getElementById('task-end-date').value,
        channel: document.getElementById('task-channel').value,
        stores: Array.from(document.getElementById('task-stores').selectedOptions).map(option => option.value),
        examplePhoto: document.getElementById('task-example-photo').files[0]
    };
    
    // Doğrulama
    if (!validateTaskForm(formData)) {
        return;
    }
    
    // Görev oluştur
    createTask(formData);
}

// Görev formunu doğrulayan fonksiyon
function validateTaskForm(data) {
    if (!data.title.trim()) {
        showAlert('Görev adı gereklidir!', 'danger');
        return false;
    }
    
    if (!data.description.trim()) {
        showAlert('Görev açıklaması gereklidir!', 'danger');
        return false;
    }
    
    if (!data.category) {
        showAlert('Kategori seçimi gereklidir!', 'danger');
        return false;
    }
    
    if (!data.startDate) {
        showAlert('Başlangıç tarihi gereklidir!', 'danger');
        return false;
    }
    
    if (!data.endDate) {
        showAlert('Bitiş tarihi gereklidir!', 'danger');
        return false;
    }
    
    if (!data.channel) {
        showAlert('Kanal seçimi gereklidir!', 'danger');
        return false;
    }
    
    if (!data.stores.length) {
        showAlert('En az bir mağaza seçmelisiniz!', 'danger');
        return false;
    }
    
    // Tarih kontrolü
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    if (startDate >= endDate) {
        showAlert('Bitiş tarihi başlangıç tarihinden sonra olmalıdır!', 'danger');
        return false;
    }
    
    return true;
}

// Görev oluşturan fonksiyon
async function createTask(data) {
    try {
        // Yükleme göstergesi
        const submitBtn = document.querySelector('#create-task-form button[type="submit"]');
        const hideLoading = showLoading(submitBtn);
        
        // Örnek fotoğraf varsa sıkıştır
        if (data.examplePhoto) {
            data.examplePhoto = await compressImage(data.examplePhoto);
        }
        
        // API çağrısı (şimdilik simüle)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Başarı mesajı
        showAlert('Görev başarıyla oluşturuldu!', 'success');
        
        // Formu temizle
        document.getElementById('create-task-form').reset();
        
        // Dashboard'u yenile
        loadDashboardData();
        
        hideLoading();
        
    } catch (error) {
        console.error('Görev oluşturma hatası:', error);
        showAlert('Görev oluşturulurken bir hata oluştu!', 'danger');
    }
}

// Tarih alanlarını ayarlayan fonksiyon
function setupDateFields() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Başlangıç tarihi için minimum değer (yarın)
    const startDateInput = document.getElementById('task-start-date');
    if (startDateInput) {
        startDateInput.min = tomorrow.toISOString().slice(0, 16);
    }
    
    // Bitiş tarihi için minimum değer (yarın + 1 gün)
    const endDateInput = document.getElementById('task-end-date');
    if (endDateInput) {
        const dayAfterTomorrow = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
        endDateInput.min = dayAfterTomorrow.toISOString().slice(0, 16);
    }
}

// Görev detayını görüntüleyen fonksiyon
function viewTask(taskId) {
    console.log('Görev görüntüleme:', taskId);
    showAlert('Görev detay sayfası açılacak', 'info');
}

// Görev düzenleme fonksiyonu
function editTask(taskId) {
    console.log('Görev düzenleme:', taskId);
    showAlert('Görev düzenleme sayfası açılacak', 'info');
}

// Bölümleri gösteren fonksiyon
function showSection(sectionName) {
    // Tüm bölümleri gizle
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Seçilen bölümü göster
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Menü aktif durumunu güncelle
    const menuItems = document.querySelectorAll('.nav-link');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });
    
    const activeItem = document.querySelector(`[href="#${sectionName}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
    
    // Sayfa başlığını güncelle
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        const titles = {
            'dashboard': 'Dashboard',
            'tasks': 'Görevler',
            'create-task': 'Görev Oluştur',
            'stores': 'Mağazalar',
            'users': 'Kullanıcılar',
            'channels': 'Kanallar',
            'regions': 'Bölgeler'
        };
        pageTitle.textContent = titles[sectionName] || 'Dashboard';
    }
    
    // Bölüme özel veri yükleme
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'tasks':
            loadTasksList();
            break;
        case 'stores':
            loadStores();
            break;
        case 'users':
            loadUsers();
            break;
        case 'channels':
            loadChannels();
            break;
        case 'regions':
            loadRegions();
            break;
    }
}

// Diğer bölümler için veri yükleme fonksiyonları
function loadTasks() {
    console.log('Görevler yükleniyor...');
}

function loadStores() {
    console.log('Mağazalar yükleniyor...');
}

function loadUsers() {
    console.log('Kullanıcılar yükleniyor...');
}

function loadChannels() {
    console.log('Kanallar yükleniyor...');
}

function loadRegions() {
    console.log('Bölgeler yükleniyor...');
}

// Yönetici verilerini yükleyen fonksiyon
async function loadManagerData(user) {
    console.log('Yönetici verileri yükleniyor:', user);
    
    try {
        // Supabase'den yöneticinin bölgesindeki mağazaları çek
        const { data: stores, error } = await supabase
            .from('stores')
            .select(`
                *,
                channels(name),
                regions(name)
            `)
            .eq('region_id', user.region_id)
            .eq('is_active', true);
        
        if (error) {
            throw error;
        }
        
        // Verileri düzenle
        const managerStores = stores.map(store => ({
            id: store.id,
            name: store.name,
            channel: store.channels?.name || 'Kanal Yok',
            region: store.regions?.name || 'Bölge Yok',
            address: store.address,
            phone: store.phone
        }));
        
        // Mağaza seçim dropdown'unu güncelle
        updateStoreDropdown(managerStores);
        
        // Sayfa başlığını güncelle
        document.getElementById('page-title').textContent = 'Yönetici Paneli - ' + user.name;
        
    } catch (error) {
        console.error('Yönetici verileri yükleme hatası:', error);
        showAlert('Veriler yüklenirken bir hata oluştu!', 'danger');
    }
}

// Mağaza dropdown'unu güncelleyen fonksiyon
function updateStoreDropdown(stores) {
    const storeSelect = document.getElementById('task-stores');
    if (storeSelect) {
        // Mevcut seçenekleri temizle
        storeSelect.innerHTML = '';
        
        // Yeni seçenekleri ekle
        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = `${store.name} (${store.channel})`;
            storeSelect.appendChild(option);
        });
        
        // "Tüm Mağazalar" seçeneğini ekle
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'Tüm Mağazalar';
        storeSelect.insertBefore(allOption, storeSelect.firstChild);
    }
}

// Kanal seçimine göre mağazaları filtreleyen fonksiyon
function filterStoresByChannel() {
    const channelSelect = document.getElementById('task-channel');
    const selectedChannel = channelSelect.value;
    
    if (!selectedChannel) {
        // Kanal seçilmediyse tüm mağazaları göster
        loadAllStores();
        return;
    }
    
    // Kullanıcı bilgilerini al
    const user = getFromStorage('currentUser');
    if (!user) return;
    
    // Kanal adını al
    const channelNames = {
        'media-mark': 'Media Mark',
        'teknosa': 'Teknosa',
        'vatan': 'Vatan'
    };
    
    const channelName = channelNames[selectedChannel];
    if (!channelName) return;
    
    // Yönetici ise sadece kendi bölgesindeki mağazaları filtrele
    if (user.role === 'manager') {
        filterManagerStoresByChannel(channelName, user.region);
    } else {
        // Admin ise tüm mağazaları filtrele
        filterAllStoresByChannel(channelName);
    }
}

// Yönetici mağazalarını kanala göre filtrele
function filterManagerStoresByChannel(channelName, region) {
    const allStores = [
        { id: 1, name: 'Media Mark Kadıköy', channel: 'Media Mark', region: 'İstanbul Avrupa' },
        { id: 2, name: 'Media Mark Beşiktaş', channel: 'Media Mark', region: 'İstanbul Avrupa' },
        { id: 3, name: 'Teknosa Şişli', channel: 'Teknosa', region: 'İstanbul Avrupa' },
        { id: 4, name: 'Teknosa Bakırköy', channel: 'Teknosa', region: 'İstanbul Avrupa' },
        { id: 5, name: 'Vatan Maltepe', channel: 'Vatan', region: 'İstanbul Anadolu' },
        { id: 6, name: 'Vatan Üsküdar', channel: 'Vatan', region: 'İstanbul Anadolu' },
        { id: 7, name: 'Media Mark Ataşehir', channel: 'Media Mark', region: 'İstanbul Anadolu' },
        { id: 8, name: 'Teknosa Kartal', channel: 'Teknosa', region: 'İstanbul Anadolu' }
    ];
    
    // Bölgeye göre filtrele
    const regionStores = allStores.filter(store => store.region === region);
    
    // Kanala göre filtrele
    const filteredStores = regionStores.filter(store => store.channel === channelName);
    
    // Dropdown'u güncelle
    updateStoreDropdown(filteredStores);
}

// Tüm mağazaları kanala göre filtrele (Admin için)
function filterAllStoresByChannel(channelName) {
    const allStores = [
        { id: 1, name: 'Media Mark Kadıköy', channel: 'Media Mark', region: 'İstanbul Avrupa' },
        { id: 2, name: 'Media Mark Beşiktaş', channel: 'Media Mark', region: 'İstanbul Avrupa' },
        { id: 3, name: 'Teknosa Şişli', channel: 'Teknosa', region: 'İstanbul Avrupa' },
        { id: 4, name: 'Teknosa Bakırköy', channel: 'Teknosa', region: 'İstanbul Avrupa' },
        { id: 5, name: 'Vatan Maltepe', channel: 'Vatan', region: 'İstanbul Anadolu' },
        { id: 6, name: 'Vatan Üsküdar', channel: 'Vatan', region: 'İstanbul Anadolu' },
        { id: 7, name: 'Media Mark Ataşehir', channel: 'Media Mark', region: 'İstanbul Anadolu' },
        { id: 8, name: 'Teknosa Kartal', channel: 'Teknosa', region: 'İstanbul Anadolu' }
    ];
    
    // Kanala göre filtrele
    const filteredStores = allStores.filter(store => store.channel === channelName);
    
    // Dropdown'u güncelle
    updateStoreDropdown(filteredStores);
}

// Tüm mağazaları yükle (kanal seçimi temizlendiğinde)
function loadAllStores() {
    const user = getFromStorage('currentUser');
    if (!user) return;
    
    if (user.role === 'manager') {
        // Yönetici için sadece kendi bölgesindeki mağazalar
        const managerStores = [
            { id: 1, name: 'Media Mark Kadıköy', channel: 'Media Mark', region: 'İstanbul Avrupa' },
            { id: 2, name: 'Media Mark Beşiktaş', channel: 'Media Mark', region: 'İstanbul Avrupa' },
            { id: 3, name: 'Teknosa Şişli', channel: 'Teknosa', region: 'İstanbul Avrupa' },
            { id: 4, name: 'Teknosa Bakırköy', channel: 'Teknosa', region: 'İstanbul Avrupa' }
        ];
        updateStoreDropdown(managerStores);
    } else {
        // Admin için tüm mağazalar
        const allStores = [
            { id: 1, name: 'Media Mark Kadıköy', channel: 'Media Mark', region: 'İstanbul Avrupa' },
            { id: 2, name: 'Media Mark Beşiktaş', channel: 'Media Mark', region: 'İstanbul Avrupa' },
            { id: 3, name: 'Teknosa Şişli', channel: 'Teknosa', region: 'İstanbul Avrupa' },
            { id: 4, name: 'Teknosa Bakırköy', channel: 'Teknosa', region: 'İstanbul Avrupa' },
            { id: 5, name: 'Vatan Maltepe', channel: 'Vatan', region: 'İstanbul Anadolu' },
            { id: 6, name: 'Vatan Üsküdar', channel: 'Vatan', region: 'İstanbul Anadolu' },
            { id: 7, name: 'Media Mark Ataşehir', channel: 'Media Mark', region: 'İstanbul Anadolu' },
            { id: 8, name: 'Teknosa Kartal', channel: 'Teknosa', region: 'İstanbul Anadolu' }
        ];
        updateStoreDropdown(allStores);
    }
}

// Dropdown'ları yükleyen fonksiyon
async function loadDropdowns() {
    try {
        // Mock veri ile test
        const channels = [
            { id: 1, name: 'Media Markt' },
            { id: 2, name: 'Teknosa' },
            { id: 3, name: 'Vatan Bilgisayar' }
        ];
        
        const regions = [
            { id: 1, name: 'İÇ ANADOLU' },
            { id: 2, name: 'GÜNEY DOĞU ANADOLU' },
            { id: 3, name: 'İSTANBUL ANADOLU' },
            { id: 4, name: 'İSTANBUL AVRUPA' },
            { id: 5, name: 'EGE' }
        ];
        
        const managers = [
            { id: 1, name: 'CENGİZHAN TUTUCU' },
            { id: 2, name: 'HALİT SIPAN' },
            { id: 3, name: 'İLKER MEMİŞ' },
            { id: 4, name: 'SERTAN KÜRKÇÜOĞLU' },
            { id: 5, name: 'ÖZLEM AKBAY' }
        ];
        
        updateChannelDropdowns(channels);
        updateRegionDropdowns(regions);
        updateManagerDropdowns(managers);
        
    } catch (error) {
        console.error('Dropdown yükleme hatası:', error);
    }
}

// Kanal dropdown'larını güncelleyen fonksiyon
function updateChannelDropdowns(channels) {
    console.log('Kanal dropdown güncelleniyor:', channels);
    const selects = ['task-channel', 'store-channel'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            console.log('Select bulundu:', selectId);
            // Mevcut seçenekleri temizle (ilk seçenek hariç)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            // Yeni seçenekleri ekle
            channels.forEach(channel => {
                const option = document.createElement('option');
                option.value = channel.id;
                option.textContent = channel.name;
                select.appendChild(option);
            });
        } else {
            console.log('Select bulunamadı:', selectId);
        }
    });
}

// Bölge dropdown'larını güncelleyen fonksiyon
function updateRegionDropdowns(regions) {
    const selects = ['user-region', 'store-region'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            // Mevcut seçenekleri temizle (ilk seçenek hariç)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            // Yeni seçenekleri ekle
            regions.forEach(region => {
                const option = document.createElement('option');
                option.value = region.id;
                option.textContent = region.name;
                select.appendChild(option);
            });
        }
    });
}

// Yönetici dropdown'larını güncelleyen fonksiyon
function updateManagerDropdowns(managers) {
    const select = document.getElementById('store-manager');
    if (select) {
        // Mevcut seçenekleri temizle (ilk seçenek hariç)
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        // Yeni seçenekleri ekle
        managers.forEach(manager => {
            const option = document.createElement('option');
            option.value = manager.id;
            option.textContent = manager.name;
            select.appendChild(option);
        });
    }
}

// Bölge alanını göster/gizle
function toggleRegionField() {
    const roleSelect = document.getElementById('user-role');
    const regionField = document.getElementById('region-field');
    
    if (roleSelect.value === 'admin') {
        regionField.style.display = 'none';
    } else {
        regionField.style.display = 'block';
    }
}

// Kullanıcı ekleme fonksiyonu
async function handleAddUser(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('user-name').value,
        email: document.getElementById('user-email').value,
        password: document.getElementById('user-password').value || generatePassword(),
        role: document.getElementById('user-role').value,
        region_id: document.getElementById('user-region').value
    };
    
    try {
        const { data, error } = await supabase
            .from('users')
            .insert([{
                name: formData.name,
                email: formData.email,
                password: formData.password, // Gerçek uygulamada hash'lenmeli
                role: formData.role,
                region_id: formData.role === 'admin' ? null : formData.region_id
            }]);
        
        if (error) throw error;
        
        console.log('Kullanıcı başarıyla eklendi:', data);
        alert('✅ Kullanıcı başarıyla eklendi!');
        document.getElementById('add-user-form').reset();
        
        // Kullanıcı listesini yenile
        loadUsersList();
        
    } catch (error) {
        console.error('Kullanıcı ekleme hatası:', error);
        showAlert('Kullanıcı eklenirken bir hata oluştu!', 'danger');
    }
}

// Mağaza ekleme fonksiyonu
async function handleAddStore(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('store-name').value,
        channel_id: document.getElementById('store-channel').value,
        region_id: document.getElementById('store-region').value,
        manager_id: document.getElementById('store-manager').value
    };
    
    try {
        const { data, error } = await supabase
            .from('stores')
            .insert([{
                name: formData.name,
                channel_id: formData.channel_id,
                region_id: formData.region_id,
                manager_id: formData.manager_id || null
            }]);
        
        if (error) throw error;
        
        console.log('Mağaza başarıyla eklendi:', data);
        alert('✅ Mağaza başarıyla eklendi!');
        document.getElementById('add-store-form').reset();
        
        // Mağaza listesini yenile
        loadStoresList();
        
    } catch (error) {
        console.error('Mağaza ekleme hatası:', error);
        showAlert('Mağaza eklenirken bir hata oluştu!', 'danger');
    }
}

// Kullanıcı listesini yükleyen fonksiyon
async function loadUsersList() {
    console.log('loadUsersList fonksiyonu çağrıldı!');
    try {
        // Supabase bağlantısını test et
        console.log('Supabase client:', supabase);
        
        if (!supabase) {
            console.error('Supabase client bulunamadı!');
            throw new Error('Supabase client bulunamadı');
        }
        
        // Supabase'den gerçek verileri çek
        console.log('Supabase\'den kullanıcılar çekiliyor...');
        const { data: users, error } = await supabase
            .from('users')
            .select(`
                id,
                name,
                email,
                password,
                role,
                is_active,
                created_at,
                regions (
                    id,
                    name
                )
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        console.log('Supabase response:', { data: users, error });
        
        if (error) {
            console.error('Supabase hatası:', error);
            // Hata durumunda mock veri kullan
            const mockUsers = [
                { id: 1, name: 'Caner Yücedağ', email: 'cyucedag@bogazici.com', role: 'admin', regions: { name: 'Tüm Bölgeler' } },
                { id: 2, name: 'CENGİZHAN TUTUCU', email: 'cengizhan.tutucu@kayragrup.com.tr', role: 'manager', regions: { name: 'İÇ ANADOLU' } },
                { id: 3, name: 'HALİT SIPAN', email: 'halit.sipan@kayragrup.com.tr', role: 'manager', regions: { name: 'GÜNEY DOĞU ANADOLU' } },
                { id: 4, name: 'İLKER MEMİŞ', email: 'ilker.memis@kayragrup.com.tr', role: 'manager', regions: { name: 'İSTANBUL ANADOLU' } },
                { id: 5, name: 'SERTAN KÜRKÇÜOĞLU', email: 'sertan.kurkcuoglu@kayragrup.com.tr', role: 'manager', regions: { name: 'İSTANBUL AVRUPA' } },
                { id: 6, name: 'ÖZLEM AKBAY', email: 'ozlem.akbay@kayragrup.com.tr', role: 'manager', regions: { name: 'EGE' } },
                { id: 7, name: 'YUSUF ÖZTÜRK', email: 'ozturkyusuff@gmail.com', role: 'employee', regions: null },
                { id: 8, name: 'NURULLAH SULU', email: 'nurullahsulu@icloud.com', role: 'employee', regions: null }
            ];
            displayUsersList(mockUsers);
            return;
        }
        
        console.log('Supabase\'den kullanıcılar çekildi:', users.length, 'kullanıcı');
        allUsers = users; // Global değişkene kaydet
        displayUsersList(users);
        
        // Bölge filtreleme dropdown'ını doldur
        loadRegionFilterOptions();
        
        // Görev oluşturma formu dropdown'larını doldur
        loadTaskFormDropdowns();
        
        // Fotoğraf limitini başlangıçta gizle
        const photoLimitDiv = document.getElementById('photo-limit');
        if (photoLimitDiv) {
            photoLimitDiv.parentElement.style.display = 'none';
        }
        
        // Tarih alanlarını otomatik doldur
        setDefaultTaskDates();
        
    } catch (error) {
        console.error('Kullanıcı listesi yükleme hatası:', error);
        displayUsersList([]);
    }
}

// Kullanıcı listesini görüntüleyen fonksiyon
function displayUsersList(users) {
    console.log('displayUsersList çağrıldı:', users);
    const tbody = document.getElementById('users-table-body');
    
    if (!tbody) {
        console.error('users-table-body bulunamadı!');
        return;
    }
    
    if (!users || users.length === 0) {
        console.log('Kullanıcı verisi yok');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    <i class="fas fa-users fa-2x mb-2 d-block"></i>
                    Henüz kullanıcı bulunmuyor
                </td>
            </tr>
        `;
        return;
    }
    
    console.log('Kullanıcı listesi oluşturuluyor:', users.length, 'kullanıcı');
    
    // Gerçek kullanıcı verilerini göster
    tbody.innerHTML = users.map(user => {
        const roleText = {
            'admin': 'Admin',
            'manager': 'Yönetici',
            'employee': 'Mağaza Çalışanı'
        }[user.role] || user.role;
        
        const regionName = user.regions ? user.regions.name : (user.role === 'admin' ? 'Tüm Bölgeler' : 'Belirtilmemiş');
        
        return `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>
                    <div class="input-group input-group-sm">
                        <input type="password" class="form-control form-control-sm" value="${user.password || ''}" readonly style="font-size: 0.8rem;">
                        <button class="btn btn-outline-secondary btn-sm" type="button" onclick="togglePasswordVisibility(this)">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
                <td>
                    <span class="badge ${getRoleBadgeClass(user.role)}">
                        ${roleText}
                    </span>
                </td>
                <td>${regionName}</td>
                <td>
                    <span class="badge bg-success">Aktif</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Mağaza listesini yükleyen fonksiyon
async function loadStoresList() {
    console.log('loadStoresList fonksiyonu çağrıldı!');
    try {
        const { data: stores, error } = await supabase
            .from('stores')
            .select(`
                id,
                name,
                channel_id,
                region_id,
                manager_id,
                is_active,
                created_at,
                channels (
                    id,
                    name
                ),
                regions (
                    id,
                    name
                )
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Mağaza listesi yükleme hatası:', error);
            displayStoresList([]);
            return;
        }
        
        console.log('Supabase\'den mağazalar çekildi:', stores.length, 'mağaza');
        console.log('Mağaza verileri:', stores);
        allStores = stores; // Global değişkene kaydet
        displayStoresList(stores);
        
        // Filtreleme dropdown'larını doldur
        loadStoreFilterOptions();
        
    } catch (error) {
        console.error('Mağaza listesi yükleme hatası:', error);
        displayStoresList([]);
    }
}

// Mağaza listesini görüntüleyen fonksiyon
function displayStoresList(stores) {
    console.log('displayStoresList çağrıldı:', stores);
    const tbody = document.getElementById('stores-table-body');
    
    if (!tbody) {
        console.error('stores-table-body bulunamadı!');
        return;
    }
    
    if (!stores || stores.length === 0) {
        console.log('Mağaza verisi yok');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    <i class="fas fa-store fa-2x mb-2 d-block"></i>
                    Henüz mağaza bulunmuyor
                </td>
            </tr>
        `;
        return;
    }
    
    console.log('Mağaza listesi oluşturuluyor:', stores.length, 'mağaza');
    
    tbody.innerHTML = stores.map(store => {
        const channelName = store.channels ? store.channels.name : 'Belirtilmemiş';
        const regionName = store.regions ? store.regions.name : 'Belirtilmemiş';
        
        return `
            <tr>
                <td>${store.name}</td>
                <td>${channelName}</td>
                <td>${regionName}</td>
                <td>
                    <span class="badge bg-success">Aktif</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editStore(${store.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteStore(${store.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Kanal listesini yükleyen fonksiyon
async function loadChannelsList() {
    console.log('loadChannelsList fonksiyonu çağrıldı!');
    try {
        const { data: channels, error } = await supabase
            .from('channels')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Kanal listesi yükleme hatası:', error);
            displayChannelsList([]);
            return;
        }
        
        console.log('Supabase\'den kanallar çekildi:', channels.length, 'kanal');
        displayChannelsList(channels);
        
    } catch (error) {
        console.error('Kanal listesi yükleme hatası:', error);
        displayChannelsList([]);
    }
}

// Kanal listesini görüntüleyen fonksiyon
function displayChannelsList(channels) {
    console.log('displayChannelsList çağrıldı:', channels);
    const tbody = document.getElementById('channels-table-body');
    
    if (!tbody) {
        console.error('channels-table-body bulunamadı!');
        return;
    }
    
    if (!channels || channels.length === 0) {
        console.log('Kanal verisi yok');
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">
                    <i class="fas fa-sitemap fa-2x mb-2 d-block"></i>
                    Henüz kanal bulunmuyor
                </td>
            </tr>
        `;
        return;
    }
    
    console.log('Kanal listesi oluşturuluyor:', channels.length, 'kanal');
    
    tbody.innerHTML = channels.map(channel => {
        return `
            <tr>
                <td>${channel.name}</td>
                <td>${channel.description || '-'}</td>
                <td>
                    <span class="badge bg-success">Aktif</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editChannel(${channel.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteChannel(${channel.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Bölge listesini yükleyen fonksiyon
async function loadRegionsList() {
    console.log('loadRegionsList fonksiyonu çağrıldı!');
    try {
        const { data: regions, error } = await supabase
            .from('regions')
            .select(`
                id,
                name,
                description,
                manager_name,
                is_active,
                created_at
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Bölge listesi yükleme hatası:', error);
            displayRegionsList([]);
            return;
        }
        
        console.log('Supabase\'den bölgeler çekildi:', regions.length, 'bölge');
        console.log('Bölge verileri:', regions);
        displayRegionsList(regions);
        
    } catch (error) {
        console.error('Bölge listesi yükleme hatası:', error);
        displayRegionsList([]);
    }
}

// Bölge listesini görüntüleyen fonksiyon
function displayRegionsList(regions) {
    console.log('displayRegionsList çağrıldı:', regions);
    const tbody = document.getElementById('regions-table-body');
    
    if (!tbody) {
        console.error('regions-table-body bulunamadı!');
        return;
    }
    
    if (!regions || regions.length === 0) {
        console.log('Bölge verisi yok');
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="fas fa-map-marker-alt fa-2x mb-2 d-block"></i>
                    Henüz bölge bulunmuyor
                </td>
            </tr>
        `;
        return;
    }
    
    console.log('Bölge listesi oluşturuluyor:', regions.length, 'bölge');
    
    tbody.innerHTML = regions.map(region => {
        console.log('Bölge işleniyor:', region);
        const managerName = region.manager_name || 'Belirtilmemiş';
        return `
            <tr>
                <td>${region.name}</td>
                <td>${region.description || '-'}</td>
                <td>${managerName}</td>
                <td>
                    <span class="badge bg-success">Aktif</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editRegion(${region.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteRegion(${region.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Rol badge sınıfını döndüren fonksiyon
function getRoleBadgeClass(role) {
    const classes = {
        'admin': 'bg-danger',
        'manager': 'bg-warning',
        'employee': 'bg-info'
    };
    return classes[role] || 'bg-secondary';
}

// Kullanıcı düzenleme fonksiyonu
async function editUser(userId) {
    try {
        // Kullanıcı bilgilerini getir
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        // Form alanlarını doldur
        document.getElementById('user-name').value = user.name;
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-role').value = user.role;
        
        // Bölge alanını göster ve doldur
        if (user.role === 'manager' || user.role === 'employee') {
            const regionField = document.getElementById('region-field');
            if (regionField) {
                regionField.style.display = 'block';
                const regionSelect = document.getElementById('user-region');
                if (regionSelect && user.region_id) {
                    regionSelect.value = user.region_id;
                }
            }
        } else {
            // Admin için bölge alanını gizle
            const regionField = document.getElementById('region-field');
            if (regionField) {
                regionField.style.display = 'none';
            }
        }
        
        // Form başlığını değiştir
        document.querySelector('#add-user-section .card-header h5').textContent = 'Kullanıcı Düzenle';
        
        // Submit butonunu değiştir
        const submitBtn = document.querySelector('#add-user-form button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Güncelle';
        submitBtn.type = 'button'; // Submit olmasın
        submitBtn.onclick = () => updateUser(userId);
        
        // Form submit event'ini geçici olarak devre dışı bırak
        const form = document.getElementById('add-user-form');
        form.onsubmit = (e) => {
            e.preventDefault();
            updateUser(userId);
        };
        
        // Kullanıcı Ekleme section'ına geç
        showSection('add-user');
        
    } catch (error) {
        console.error('Kullanıcı bilgileri alınırken hata:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        alert('❌ Kullanıcı bilgileri alınırken hata: ' + (error.message || 'Bilinmeyen hata'));
    }
}

// Kullanıcı güncelleme fonksiyonu
async function updateUser(userId) {
    const name = document.getElementById('user-name').value;
    const email = document.getElementById('user-email').value;
    const role = document.getElementById('user-role').value;
    const regionId = document.getElementById('user-region').value;
    
    try {
        const updateData = {
            name: name,
            email: email,
            role: role
        };
        
        if (role === 'manager' || role === 'employee') {
            updateData.region_id = regionId;
        } else {
            // Admin için region_id'yi null yap
            updateData.region_id = null;
        }
        
        const { error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId);
        
        if (error) throw error;
        
        alert('✅ Kullanıcı başarıyla güncellendi!');
        
        // Formu sıfırla ve normal haline döndür
        document.getElementById('add-user-form').reset();
        const titleElement = document.querySelector('#add-user-section .card-header h5');
        if (titleElement) titleElement.textContent = 'Yeni Kullanıcı Ekle';
        
        const submitBtn = document.querySelector('#add-user-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Kullanıcı Ekle';
            submitBtn.type = 'submit'; // Submit'e geri döndür
            submitBtn.onclick = null;
        }
        
        // Form submit event'ini normale döndür
        const form = document.getElementById('add-user-form');
        if (form) form.onsubmit = null;
        
        // Kullanıcılar listesini yenile
        loadUsersList();
        
    } catch (error) {
        console.error('Kullanıcı güncelleme hatası:', error);
        alert('❌ Kullanıcı güncellenirken hata oluştu!');
    }
}

// Kullanıcı silme fonksiyonu
async function deleteUser(userId) {
    if (confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
        try {
            const { error } = await supabase
                .from('users')
                .update({ is_active: false })
                .eq('id', userId);
            
            if (error) throw error;
            
            alert('✅ Kullanıcı başarıyla silindi!');
            loadUsersList(); // Listeyi yenile
            
        } catch (error) {
            console.error('Kullanıcı silme hatası:', error);
            alert('❌ Kullanıcı silinirken bir hata oluştu!');
        }
    }
}

// Mağaza düzenleme fonksiyonu
async function editStore(storeId) {
    try {
        // Mağaza bilgilerini getir
        const { data: store, error } = await supabase
            .from('stores')
            .select(`
                *,
                channels(name),
                regions(name)
            `)
            .eq('id', storeId)
            .single();
        
        if (error) throw error;
        
        // Form alanlarını doldur
        document.getElementById('store-name').value = store.name;
        document.getElementById('store-channel').value = store.channel_id;
        document.getElementById('store-region').value = store.region_id;
        document.getElementById('store-manager').value = store.manager_id;
        
        // Form başlığını değiştir
        document.querySelector('#add-store-section .card-header h5').textContent = 'Mağaza Düzenle';
        
        // Submit butonunu değiştir
        const submitBtn = document.querySelector('#add-store-form button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Güncelle';
        submitBtn.type = 'button'; // Submit olmasın
        submitBtn.onclick = () => updateStore(storeId);
        
        // Form submit event'ini geçici olarak devre dışı bırak
        const form = document.getElementById('add-store-form');
        form.onsubmit = (e) => {
            e.preventDefault();
            updateStore(storeId);
        };
        
        // Mağaza Ekleme section'ına geç
        showSection('add-store');
        
    } catch (error) {
        console.error('Mağaza bilgileri alınırken hata:', error);
        alert('❌ Mağaza bilgileri alınırken hata oluştu!');
    }
}

// Mağaza güncelleme fonksiyonu
async function updateStore(storeId) {
    const name = document.getElementById('store-name').value;
    const channelId = document.getElementById('store-channel').value;
    const regionId = document.getElementById('store-region').value;
    const managerId = document.getElementById('store-manager').value;
    
    try {
        const { error } = await supabase
            .from('stores')
            .update({
                name: name,
                channel_id: channelId,
                region_id: regionId,
                manager_id: managerId || null
            })
            .eq('id', storeId);
        
        if (error) throw error;
        
        alert('✅ Mağaza başarıyla güncellendi!');
        
        // Formu sıfırla ve normal haline döndür
        document.getElementById('add-store-form').reset();
        const titleElement = document.querySelector('#add-store-section .card-header h5');
        if (titleElement) titleElement.textContent = 'Yeni Mağaza Ekle';
        
        const submitBtn = document.querySelector('#add-store-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Mağaza Ekle';
            submitBtn.type = 'submit'; // Submit'e geri döndür
            submitBtn.onclick = null;
        }
        
        // Form submit event'ini normale döndür
        const form = document.getElementById('add-store-form');
        if (form) form.onsubmit = null;
        
        // Mağazalar listesini yenile
        loadStoresList();
        
    } catch (error) {
        console.error('Mağaza güncelleme hatası:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        alert('❌ Mağaza güncellenirken hata: ' + (error.message || 'Bilinmeyen hata'));
    }
}

// Mağaza silme fonksiyonu
async function deleteStore(storeId) {
    if (confirm('Bu mağazayı silmek istediğinizden emin misiniz?')) {
        try {
            const { error } = await supabase
                .from('stores')
                .update({ is_active: false })
                .eq('id', storeId);
            
            if (error) throw error;
            
            alert('✅ Mağaza başarıyla silindi!');
            loadStoresList(); // Listeyi yenile
            
        } catch (error) {
            console.error('Mağaza silme hatası:', error);
            alert('❌ Mağaza silinirken bir hata oluştu!');
        }
    }
}

// Kanal düzenleme fonksiyonu
async function editChannel(channelId) {
    try {
        // Kanal bilgilerini getir
        const { data: channel, error } = await supabase
            .from('channels')
            .select('*')
            .eq('id', channelId)
            .single();
        
        if (error) throw error;
        
        // Form alanlarını doldur
        document.getElementById('channel-name').value = channel.name;
        document.getElementById('channel-description').value = channel.description || '';
        
        // Form başlığını değiştir
        document.querySelector('#add-channel-section .card-header h5').textContent = 'Kanal Düzenle';
        
        // Submit butonunu değiştir
        const submitBtn = document.querySelector('#add-channel-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Güncelle';
            submitBtn.type = 'button';
            submitBtn.onclick = () => updateChannel(channelId);
        }
        
        // Form submit event'ini geçici olarak devre dışı bırak
        const form = document.getElementById('add-channel-form');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                updateChannel(channelId);
            };
        }
        
        // Kanal Ekleme section'ına geç
        showSection('add-channel');
        
    } catch (error) {
        console.error('Kanal bilgileri alınırken hata:', error);
        alert('❌ Kanal bilgileri alınırken hata oluştu!');
    }
}

// Kanal güncelleme fonksiyonu
async function updateChannel(channelId) {
    const name = document.getElementById('channel-name').value;
    const description = document.getElementById('channel-description').value;
    
    try {
        const { error } = await supabase
            .from('channels')
            .update({
                name: name,
                description: description
            })
            .eq('id', channelId);
        
        if (error) throw error;
        
        alert('✅ Kanal başarıyla güncellendi!');
        
        // Formu sıfırla ve normal haline döndür
        document.getElementById('add-channel-form').reset();
        document.querySelector('#add-channel-section .card-header h5').textContent = 'Yeni Kanal Ekle';
        const submitBtn = document.querySelector('#add-channel-form button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Kanal Ekle';
        submitBtn.onclick = null;
        
        // Kanallar listesini yenile
        loadChannelsList();
        
    } catch (error) {
        console.error('Kanal güncelleme hatası:', error);
        alert('❌ Kanal güncellenirken hata oluştu!');
    }
}

// Kanal silme fonksiyonu
async function deleteChannel(channelId) {
    if (confirm('Bu kanalı silmek istediğinizden emin misiniz?')) {
        try {
            const { error } = await supabase
                .from('channels')
                .update({ is_active: false })
                .eq('id', channelId);
            
            if (error) throw error;
            
            alert('✅ Kanal başarıyla silindi!');
            loadChannelsList(); // Listeyi yenile
            
        } catch (error) {
            console.error('Kanal silme hatası:', error);
            alert('❌ Kanal silinirken bir hata oluştu!');
        }
    }
}

// Bölge düzenleme fonksiyonu
async function editRegion(regionId) {
    try {
        // Bölge bilgilerini getir
        const { data: region, error } = await supabase
            .from('regions')
            .select('*')
            .eq('id', regionId)
            .single();
        
        if (error) throw error;
        
        // Form alanlarını doldur
        document.getElementById('region-name').value = region.name;
        document.getElementById('region-description').value = region.description || '';
        document.getElementById('region-manager-name').value = region.manager_name || '';
        
        // Form başlığını değiştir
        document.querySelector('#add-region-section .card-header h5').textContent = 'Bölge Düzenle';
        
        // Submit butonunu değiştir
        const submitBtn = document.querySelector('#add-region-form button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Güncelle';
        submitBtn.onclick = () => updateRegion(regionId);
        
        // Bölge Ekleme section'ına geç
        showSection('add-region');
        
    } catch (error) {
        console.error('Bölge bilgileri alınırken hata:', error);
        alert('❌ Bölge bilgileri alınırken hata oluştu!');
    }
}

// Bölge güncelleme fonksiyonu
async function updateRegion(regionId) {
    const name = document.getElementById('region-name').value;
    const description = document.getElementById('region-description').value;
    const managerName = document.getElementById('region-manager-name').value;
    
    try {
        const { error } = await supabase
            .from('regions')
            .update({
                name: name,
                description: description,
                manager_name: managerName
            })
            .eq('id', regionId);
        
        if (error) throw error;
        
        alert('✅ Bölge başarıyla güncellendi!');
        
        // Formu sıfırla ve normal haline döndür
        document.getElementById('add-region-form').reset();
        document.querySelector('#add-region-section .card-header h5').textContent = 'Yeni Bölge Ekle';
        const submitBtn = document.querySelector('#add-region-form button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Bölge Ekle';
        submitBtn.onclick = null;
        
        // Bölgeler listesini yenile
        loadRegionsList();
        
    } catch (error) {
        console.error('Bölge güncelleme hatası:', error);
        alert('❌ Bölge güncellenirken hata oluştu!');
    }
}

// Bölge silme fonksiyonu
async function deleteRegion(regionId) {
    if (confirm('Bu bölgeyi silmek istediğinizden emin misiniz?')) {
        try {
            const { error } = await supabase
                .from('regions')
                .update({ is_active: false })
                .eq('id', regionId);
            
            if (error) throw error;
            
            alert('✅ Bölge başarıyla silindi!');
            loadRegionsList(); // Listeyi yenile
            
        } catch (error) {
            console.error('Bölge silme hatası:', error);
            alert('❌ Bölge silinirken bir hata oluştu!');
        }
    }
}

// Kanal ekleme formu
document.addEventListener('DOMContentLoaded', function() {
    const addChannelForm = document.getElementById('add-channel-form');
    if (addChannelForm) {
        addChannelForm.addEventListener('submit', handleAddChannel);
    }
    
    const addRegionForm = document.getElementById('add-region-form');
    if (addRegionForm) {
        addRegionForm.addEventListener('submit', handleAddRegion);
    }
    
    // Arama ve filtreleme event listener'ları
    const userSearch = document.getElementById('user-search');
    if (userSearch) {
        userSearch.addEventListener('input', filterUsers);
    }
    
    const userRoleFilter = document.getElementById('user-role-filter');
    if (userRoleFilter) {
        userRoleFilter.addEventListener('change', filterUsers);
    }
    
    const userRegionFilter = document.getElementById('user-region-filter');
    if (userRegionFilter) {
        userRegionFilter.addEventListener('change', filterUsers);
    }
    
    // Mağaza arama ve filtreleme event listener'ları
    const storeSearch = document.getElementById('store-search');
    if (storeSearch) {
        storeSearch.addEventListener('input', filterStores);
    }
    
    const storeChannelFilter = document.getElementById('store-channel-filter');
    if (storeChannelFilter) {
        storeChannelFilter.addEventListener('change', filterStores);
    }
    
    const storeRegionFilter = document.getElementById('store-region-filter');
    if (storeRegionFilter) {
        storeRegionFilter.addEventListener('change', filterStores);
    }
    
    // Görev oluşturma formu
    const createTaskForm = document.getElementById('create-task-form');
    if (createTaskForm) {
        createTaskForm.addEventListener('submit', handleCreateTask);
    }
    
    // Kanal değiştiğinde mağazaları filtrele
    const taskChannel = document.getElementById('task-channel');
    if (taskChannel) {
        taskChannel.addEventListener('change', updateTaskStores);
    }
    
    // Yanıt türü değiştiğinde fotoğraf limitini göster/gizle
    const responsePhoto = document.getElementById('response-photo');
    if (responsePhoto) {
        responsePhoto.addEventListener('change', togglePhotoLimit);
    }
});

// Global değişkenler
let allUsers = [];
let allStores = [];
let allChannels = [];
let allRegions = [];

// Kullanıcı filtreleme fonksiyonu
function filterUsers() {
    const searchTerm = document.getElementById('user-search').value.toLowerCase();
    const roleFilter = document.getElementById('user-role-filter').value;
    const regionFilter = document.getElementById('user-region-filter').value;
    
    const filteredUsers = allUsers.filter(user => {
        const matchesSearch = !searchTerm || 
            user.name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm) ||
            user.role.toLowerCase().includes(searchTerm);
        
        const matchesRole = !roleFilter || user.role === roleFilter;
        const matchesRegion = !regionFilter || user.region_id == regionFilter;
        
        return matchesSearch && matchesRole && matchesRegion;
    });
    
    displayUsersList(filteredUsers);
}

// Filtreleri temizleme fonksiyonu
function clearUserFilters() {
    document.getElementById('user-search').value = '';
    document.getElementById('user-role-filter').value = '';
    document.getElementById('user-region-filter').value = '';
    filterUsers();
}

// Mağaza filtreleme fonksiyonu
function filterStores() {
    const searchTerm = document.getElementById('store-search').value.toLowerCase();
    const channelFilter = document.getElementById('store-channel-filter').value;
    const regionFilter = document.getElementById('store-region-filter').value;
    
    const filteredStores = allStores.filter(store => {
        const matchesSearch = !searchTerm || 
            store.name.toLowerCase().includes(searchTerm);
        
        const matchesChannel = !channelFilter || store.channel_id == channelFilter;
        const matchesRegion = !regionFilter || store.region_id == regionFilter;
        
        return matchesSearch && matchesChannel && matchesRegion;
    });
    
    displayStoresList(filteredStores);
}

// Mağaza filtrelerini temizleme fonksiyonu
function clearStoreFilters() {
    document.getElementById('store-search').value = '';
    document.getElementById('store-channel-filter').value = '';
    document.getElementById('store-region-filter').value = '';
    filterStores();
}

// Bölge filtreleme dropdown'ını dolduran fonksiyon
async function loadRegionFilterOptions() {
    try {
        const { data: regions, error } = await supabase
            .from('regions')
            .select('id, name')
            .eq('is_active', true)
            .order('name');
        
        if (error) throw error;
        
        const regionFilter = document.getElementById('user-region-filter');
        if (regionFilter) {
            // Mevcut seçenekleri temizle (ilk seçenek hariç)
            while (regionFilter.children.length > 1) {
                regionFilter.removeChild(regionFilter.lastChild);
            }
            
            // Yeni seçenekleri ekle
            regions.forEach(region => {
                const option = document.createElement('option');
                option.value = region.id;
                option.textContent = region.name;
                regionFilter.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Bölge filtreleme seçenekleri yüklenirken hata:', error);
    }
}

// Mağaza filtreleme dropdown'larını dolduran fonksiyon
async function loadStoreFilterOptions() {
    try {
        // Kanal filtreleme dropdown'ını doldur
        const { data: channels, error: channelError } = await supabase
            .from('channels')
            .select('id, name')
            .eq('is_active', true)
            .order('name');
        
        if (channelError) throw channelError;
        
        const channelFilter = document.getElementById('store-channel-filter');
        if (channelFilter) {
            // Mevcut seçenekleri temizle (ilk seçenek hariç)
            while (channelFilter.children.length > 1) {
                channelFilter.removeChild(channelFilter.lastChild);
            }
            
            // Yeni seçenekleri ekle
            channels.forEach(channel => {
                const option = document.createElement('option');
                option.value = channel.id;
                option.textContent = channel.name;
                channelFilter.appendChild(option);
            });
        }
        
        // Bölge filtreleme dropdown'ını doldur
        const { data: regions, error: regionError } = await supabase
            .from('regions')
            .select('id, name')
            .eq('is_active', true)
            .order('name');
        
        if (regionError) throw regionError;
        
        const regionFilter = document.getElementById('store-region-filter');
        if (regionFilter) {
            // Mevcut seçenekleri temizle (ilk seçenek hariç)
            while (regionFilter.children.length > 1) {
                regionFilter.removeChild(regionFilter.lastChild);
            }
            
            // Yeni seçenekleri ekle
            regions.forEach(region => {
                const option = document.createElement('option');
                option.value = region.id;
                option.textContent = region.name;
                regionFilter.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Mağaza filtreleme seçenekleri yüklenirken hata:', error);
    }
}

// Yanıt türü değiştiğinde fotoğraf limitini göster/gizle
function togglePhotoLimit() {
    const responsePhoto = document.getElementById('response-photo');
    const photoLimitDiv = document.getElementById('photo-limit').parentElement;
    
    if (responsePhoto.checked) {
        photoLimitDiv.style.display = 'block';
    } else {
        photoLimitDiv.style.display = 'none';
    }
}

// Yanıt türü validasyonu
function validateResponseTypes() {
    const responseText = document.getElementById('response-text').checked;
    const responsePhoto = document.getElementById('response-photo').checked;
    
    if (!responseText && !responsePhoto) {
        alert('❌ En az bir yanıt türü seçmelisiniz!');
        return false;
    }
    
    return true;
}

// Görev oluşturma fonksiyonu
async function handleCreateTask(event) {
    event.preventDefault();
    
    // Yanıt türü validasyonu
    if (!validateResponseTypes()) {
        return;
    }
    
    const formData = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-description').value,
        category: document.getElementById('task-category').value,
        start_date: document.getElementById('task-start-date').value,
        end_date: document.getElementById('task-end-date').value,
        channel_id: document.getElementById('task-channel').value,
        stores: Array.from(document.getElementById('task-stores').selectedOptions).map(option => option.value),
        example_photo: document.getElementById('task-example-photo').files[0],
        response_types: {
            text: document.getElementById('response-text').checked,
            photo: document.getElementById('response-photo').checked
        },
        photo_limit: document.getElementById('photo-limit').value
    };
    
    try {
        // Görev oluştur
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .insert([{
                title: formData.title,
                description: formData.description,
                category: formData.category,
                start_date: formData.start_date,
                end_date: formData.end_date,
                channel_id: formData.channel_id,
                status: 'active',
                created_by: getCurrentUserId(),
                response_text_enabled: formData.response_types.text,
                response_photo_enabled: formData.response_types.photo,
                photo_limit: formData.response_types.photo ? parseInt(formData.photo_limit) : null,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (taskError) throw taskError;
        
        // Mağaza atamalarını oluştur
        if (formData.stores.includes('all')) {
            // Tüm mağazaları al
            const { data: allStores, error: storesError } = await supabase
                .from('stores')
                .select('id')
                .eq('channel_id', formData.channel_id)
                .eq('is_active', true);
            
            if (storesError) throw storesError;
            
                       // Tüm mağazalara görev ata
                       const storeAssignments = allStores.map(store => ({
                           task_id: task.id,
                           store_id: store.id,
                           status: 'assigned',
                           created_at: new Date().toISOString()
                       }));
            
            const { error: assignmentError } = await supabase
                .from('task_assignments')
                .insert(storeAssignments);
            
            if (assignmentError) throw assignmentError;
        } else {
                       // Seçili mağazalara görev ata
                       const storeAssignments = formData.stores.map(storeId => ({
                           task_id: task.id,
                           store_id: storeId,
                           status: 'assigned',
                           created_at: new Date().toISOString()
                       }));
            
            const { error: assignmentError } = await supabase
                .from('task_assignments')
                .insert(storeAssignments);
            
            if (assignmentError) throw assignmentError;
        }
        
        // Örnek fotoğraf yükle (varsa)
        if (formData.example_photo) {
            await uploadExamplePhoto(task.id, formData.example_photo);
        }
        
        alert('✅ Görev başarıyla oluşturuldu!');
        document.getElementById('create-task-form').reset();
        
    } catch (error) {
        console.error('Görev oluşturma hatası:', error);
        alert('❌ Görev oluşturulurken hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
    }
}

// Kanal değiştiğinde mağazaları güncelle
async function updateTaskStores() {
    const channelId = document.getElementById('task-channel').value;
    const storesSelect = document.getElementById('task-stores');
    
    if (!channelId) {
        storesSelect.innerHTML = '<option value="all">Tüm Mağazalar</option>';
        return;
    }
    
    try {
        const { data: stores, error } = await supabase
            .from('stores')
            .select('id, name')
            .eq('channel_id', channelId)
            .eq('is_active', true)
            .order('name');
        
        if (error) throw error;
        
        storesSelect.innerHTML = '<option value="all">Tüm Mağazalar</option>';
        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.name;
            storesSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Mağazalar yüklenirken hata:', error);
    }
}

// Örnek fotoğraf yükleme
async function uploadExamplePhoto(taskId, file) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `example_${taskId}.${fileExt}`;
        
        const { data, error } = await supabase.storage
            .from('task-photos')
            .upload(fileName, file);
        
        if (error) throw error;
        
        // Görev tablosuna fotoğraf URL'sini kaydet
        const { error: updateError } = await supabase
            .from('tasks')
            .update({ example_photo_url: data.path })
            .eq('id', taskId);
        
        if (updateError) throw updateError;
        
    } catch (error) {
        console.error('Fotoğraf yükleme hatası:', error);
    }
}

// Mevcut kullanıcı ID'sini al
function getCurrentUserId() {
    // Bu fonksiyon gerçek uygulamada session'dan alınacak
    // Şimdilik mock data kullanıyoruz
    return 1; // Admin kullanıcısı
}

// Görev oluşturma formu dropdown'larını dolduran fonksiyon
async function loadTaskFormDropdowns() {
    try {
        // Kanal dropdown'ını doldur
        const { data: channels, error: channelError } = await supabase
            .from('channels')
            .select('id, name')
            .eq('is_active', true)
            .order('name');
        
        if (channelError) throw channelError;
        
        const channelSelect = document.getElementById('task-channel');
        if (channelSelect) {
            // Mevcut seçenekleri temizle (ilk seçenek hariç)
            while (channelSelect.children.length > 1) {
                channelSelect.removeChild(channelSelect.lastChild);
            }
            
            // Yeni seçenekleri ekle
            channels.forEach(channel => {
                const option = document.createElement('option');
                option.value = channel.id;
                option.textContent = channel.name;
                channelSelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Görev formu dropdown\'ları yüklenirken hata:', error);
    }
}

// Kanal ekleme fonksiyonu
async function handleAddChannel(event) {
    event.preventDefault();
    
    const name = document.getElementById('channel-name').value;
    const description = document.getElementById('channel-description').value;
    
    try {
        const { data, error } = await supabase
            .from('channels')
            .insert([
                {
                    name: name,
                    description: description,
                    is_active: true,
                    created_at: new Date().toISOString()
                }
            ]);
        
        if (error) throw error;
        
        console.log('Kanal başarıyla eklendi:', data);
        alert('✅ Kanal başarıyla eklendi!');
        
        // Formu temizle
        document.getElementById('add-channel-form').reset();
        
        // Kanallar listesini yenile
        loadChannelsList();
        
    } catch (error) {
        console.error('Kanal ekleme hatası:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        if (error.code === '23505') {
            alert('❌ Bu kanal adı zaten kullanılıyor! Farklı bir isim deneyin.');
        } else if (error.status === 409) {
            alert('❌ Bu kanal adı zaten mevcut! Farklı bir isim deneyin.');
        } else if (error.message) {
            alert('❌ Kanal eklenirken hata: ' + error.message);
        } else {
            alert('❌ Kanal eklenirken bilinmeyen bir hata oluştu!');
        }
    }
}

// Bölge ekleme fonksiyonu
async function handleAddRegion(event) {
    event.preventDefault();
    
    const name = document.getElementById('region-name').value;
    const description = document.getElementById('region-description').value;
    const managerName = document.getElementById('region-manager-name').value;
    
    try {
        // Önce mevcut bölgeleri sayalım
        const { count } = await supabase
            .from('regions')
            .select('*', { count: 'exact', head: true });
        
        const newId = (count || 0) + 1;
        
        const { data, error } = await supabase
            .from('regions')
            .insert([
                {
                    id: newId,
                    name: name,
                    description: description,
                    manager_name: managerName,
                    is_active: true,
                    created_at: new Date().toISOString()
                }
            ])
            .select();
        
        if (error) throw error;
        
        console.log('Bölge başarıyla eklendi:', data);
        alert('✅ Bölge başarıyla eklendi!');
        
        // Formu temizle
        document.getElementById('add-region-form').reset();
        
        // Bölgeler listesini yenile
        loadRegionsList();
        
    } catch (error) {
        console.error('Bölge ekleme hatası:', error);
        
        if (error.code === '23505') {
            alert('❌ Bu bölge adı zaten kullanılıyor! Farklı bir isim deneyin.');
        } else if (error.message) {
            alert('❌ Bölge eklenirken hata: ' + error.message);
        } else {
            alert('❌ Bölge eklenirken bilinmeyen bir hata oluştu!');
        }
    }
}

// Section gösterim fonksiyonu
function showSection(sectionName) {
    console.log('showSection çağrıldı:', sectionName);
    
    // Tüm section'ları gizle
    const sections = document.querySelectorAll('.content-section');
    console.log('Bulunan section sayısı:', sections.length);
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Seçilen section'ı göster
    const targetSection = document.getElementById(sectionName + '-section');
    console.log('Aranan section ID:', sectionName + '-section');
    console.log('Bulunan section:', targetSection);
    
    if (targetSection) {
        targetSection.style.display = 'block';
        console.log('Section gösterildi:', sectionName);
        
        // Kullanıcılar section'ı ise listeyi yükle
        if (sectionName === 'users') {
            console.log('Kullanıcılar section\'ı seçildi, loadUsersList çağrılıyor...');
            loadUsersList();
        }
        // Mağazalar section'ı ise listeyi yükle
        else if (sectionName === 'stores') {
            console.log('Mağazalar section\'ı seçildi, loadStoresList çağrılıyor...');
            loadStoresList();
        }
        // Kanallar section'ı ise listeyi yükle
        else if (sectionName === 'channels') {
            console.log('Kanallar section\'ı seçildi, loadChannelsList çağrılıyor...');
            loadChannelsList();
        }
        // Bölgeler section'ı ise listeyi yükle
        else if (sectionName === 'regions') {
            console.log('Bölgeler section\'ı seçildi, loadRegionsList çağrılıyor...');
            loadRegionsList();
        }
        // Görevler section'ı ise listeyi yükle
        else if (sectionName === 'tasks') {
            console.log('Görevler section\'ı seçildi, loadTasksList çağrılıyor...');
            loadTasksList();
        }
    } else {
        console.error('Section bulunamadı:', sectionName);
    }
}

// Görevleri yükle
async function loadTasksList() {
    try {
        console.log('Görevler yükleniyor...');
        
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select(`
                *,
                channels(name),
                task_assignments(
                    id,
                    status,
                    stores(name, manager_id, regions(name, manager_name))
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log('Görevler yüklendi:', tasks);
        window.allTasks = tasks || []; // Global değişkende sakla
        displayTasksList(tasks || []);
        
    } catch (error) {
        console.error('Görevler yüklenirken hata:', error);
        displayTasksList([]);
    }
}

// Görevleri göster
function displayTasksList(tasks) {
    const tbody = document.getElementById('tasks-table-body');
    if (!tbody) {
        console.error('tasks-table-body bulunamadı');
        return;
    }

    if (!tasks || tasks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">
                    <i class="fas fa-inbox me-2"></i>Henüz görev bulunmuyor
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = tasks.map(task => {
        const channelName = task.channels?.name || 'Bilinmiyor';
        const allStores = task.task_assignments?.map(ta => ta.stores?.name).filter(Boolean) || [];
        const storeCount = allStores.length;
        const assignedStores = storeCount > 0 ? 
            (storeCount > 3 ? 
                allStores.slice(0, 3).join(', ') + ` +${storeCount - 3} daha` : 
                allStores.join(', ')
            ) : 'Atanmamış';
        const statusBadge = getTaskStatusBadge(task.status);
        const categoryBadge = getTaskCategoryBadge(task.category);
        
        return `
            <tr>
                <td>
                    <strong>${task.title}</strong>
                    <br>
                    <small class="text-muted">${task.description?.substring(0, 50)}${task.description?.length > 50 ? '...' : ''}</small>
                </td>
                <td>${categoryBadge}</td>
                <td>${channelName}</td>
                <td>${statusBadge}</td>
                <td>${formatDateTime(task.start_date)}</td>
                <td>${formatDateTime(task.end_date)}</td>
                <td>
                    <small title="${allStores.join(', ')}">${assignedStores}</small>
                    ${storeCount > 0 ? `<br><span class="badge bg-light text-dark">${storeCount} mağaza</span>` : ''}
                </td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary" onclick="viewTask(${task.id})" title="Görüntüle">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="exportTaskToPresentation(${task.id})" title="Sunum İndir">
                            <i class="fas fa-file-powerpoint"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteTask(${task.id})" title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Görev durumu badge'i
function getTaskStatusBadge(status) {
    const badges = {
        'active': '<span class="badge bg-success">Aktif</span>',
        'in_progress': '<span class="badge bg-warning">Devam Ediyor</span>',
        'completed': '<span class="badge bg-primary">Tamamlandı</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Bilinmiyor</span>';
}

// Görev kategorisi badge'i
function getTaskCategoryBadge(category) {
    const badges = {
        'reyon': '<span class="badge bg-info">Reyon</span>',
        'sepet': '<span class="badge bg-warning">Sepet</span>',
        'kampanya': '<span class="badge bg-success">Kampanya</span>',
        'diger': '<span class="badge bg-secondary">Diğer</span>'
    };
    return badges[category] || '<span class="badge bg-light text-dark">Bilinmiyor</span>';
}

// Tarih formatla
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Görev filtreleme
function filterTasks() {
    const searchTerm = document.getElementById('task-search')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('task-status-filter')?.value || '';
    const categoryFilter = document.getElementById('task-category-filter')?.value || '';
    
    const rows = document.querySelectorAll('#tasks-table-body tr');
    
    rows.forEach(row => {
        const title = row.cells[0]?.textContent.toLowerCase() || '';
        const category = row.cells[1]?.textContent.toLowerCase() || '';
        const status = row.cells[3]?.textContent.toLowerCase() || '';
        
        const matchesSearch = title.includes(searchTerm);
        const matchesStatus = !statusFilter || status.includes(statusFilter);
        const matchesCategory = !categoryFilter || category.includes(categoryFilter);
        
        if (matchesSearch && matchesStatus && matchesCategory) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Görev filtrelerini temizle
function clearTaskFilters() {
    document.getElementById('task-search').value = '';
    document.getElementById('task-status-filter').value = '';
    document.getElementById('task-category-filter').value = '';
    filterTasks();
}

// Görev görüntüleme fonksiyonu
async function viewTask(taskId) {
    try {
        const { data: task, error } = await supabase
            .from('tasks')
            .select(`
                *,
                channels(name),
                task_assignments(
                    id,
                    status,
                    comment,
                    photo_urls,
                    completed_at,
                    stores(name, manager_id, regions(name, manager_name))
                )
            `)
            .eq('id', taskId)
            .single();

        if (error) throw error;

        // Modal içeriğini oluştur
        const modalContent = `
            <div class="modal fade" id="taskViewModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Görev Detayları</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Görev Bilgileri</h6>
                                    <p><strong>Ad:</strong> ${task.title}</p>
                                    <p><strong>Açıklama:</strong> ${task.description || 'Açıklama yok'}</p>
                                    <p><strong>Kategori:</strong> ${getTaskCategoryBadge(task.category)}</p>
                                    <p><strong>Kanal:</strong> ${task.channels?.name || 'Bilinmiyor'}</p>
                                    <p><strong>Durum:</strong> ${getTaskStatusBadge(task.status)}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Tarih Bilgileri</h6>
                                    <p><strong>Başlangıç:</strong> ${formatDateTime(task.start_date)}</p>
                                    <p><strong>Bitiş:</strong> ${formatDateTime(task.end_date)}</p>
                                    <p><strong>Oluşturulma:</strong> ${formatDateTime(task.created_at)}</p>
                                </div>
                            </div>
                            <div class="row mt-3">
                                <div class="col-12">
                                    <h6>Yanıt Türleri</h6>
                                    <p>
                                        ${task.response_text_enabled ? '<span class="badge bg-info me-2">Yazılı Yanıt</span>' : ''}
                                        ${task.response_photo_enabled ? '<span class="badge bg-success me-2">Fotoğraflı Yanıt</span>' : ''}
                                        ${task.photo_limit ? `<small class="text-muted">(Max ${task.photo_limit} fotoğraf)</small>` : ''}
                                    </p>
                                </div>
                            </div>
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Atanan Mağazalar (${task.task_assignments?.length || 0})</h6>
                        <div class="row" id="stores-grid">
                            ${task.task_assignments?.map((assignment, index) => {
                                console.log('Assignment data:', assignment);
                                console.log('Photo URLs:', assignment.photo_urls);
                                console.log('Store name:', assignment.stores?.name);
                                
                                // Test için örnek fotoğraf URL'leri (gerçek fotoğraf yoksa)
                                const testPhotos = [
                                    'https://via.placeholder.com/300x200/28a745/ffffff?text=Mağaza+1',
                                    'https://via.placeholder.com/300x200/007bff/ffffff?text=Mağaza+2',
                                    'https://via.placeholder.com/300x200/dc3545/ffffff?text=Mağaza+3'
                                ];
                                
                                const hasPhotos = assignment.photo_urls && assignment.photo_urls.length > 0;
                                const photoUrl = hasPhotos ? assignment.photo_urls[0] : testPhotos[index % testPhotos.length];
                                
                                return `
                                <div class="col-md-3 col-sm-4 col-6 mb-3">
                                    <div class="card store-card" 
                                         style="cursor: pointer; min-height: 200px;"
                                         data-store-name="${assignment.stores?.name || 'Bilinmiyor'}"
                                         data-photo-urls='${JSON.stringify(assignment.photo_urls || [])}'
                                         data-status="${assignment.status}"
                                         data-assignment-index="${index}">
                                        <div class="card-body text-center d-flex flex-column justify-content-center">
                                            <div class="mb-3">
                                                <img src="${photoUrl}" 
                                                     class="img-fluid rounded" 
                                                     style="height: 120px; width: 100%; object-fit: cover;"
                                                     alt="Kapak fotoğrafı"
                                                     onerror="console.error('Fotoğraf yüklenemedi:', this.src); this.style.display='none'; this.nextElementSibling.style.display='block';">
                                                <div class="d-flex align-items-center justify-content-center" style="height: 120px; background: linear-gradient(45deg, #f8f9fa, #e9ecef); border-radius: 8px; display: none;">
                                                    <div class="text-center">
                                                        <i class="fas fa-store fa-3x text-muted mb-2"></i>
                                                        <div class="text-muted small">Fotoğraf yok</div>
                                                    </div>
                                                </div>
                                                ${!hasPhotos ? '<div class="badge bg-warning position-absolute" style="top: 10px; right: 10px;">Test</div>' : ''}
                                            </div>
                                            <h6 class="card-title mb-2">${assignment.stores?.name || 'Bilinmiyor'}</h6>
                                            <p class="text-muted small mb-2">
                                                <i class="fas fa-user me-1"></i>
                                                ${assignment.stores?.regions?.manager_name || 'Yönetici bilgisi yok'}
                                            </p>
                                            <div class="mb-2">
                                                ${getTaskAssignmentStatusBadge(assignment.status)}
                                            </div>
                                            <div class="mt-auto">
                                                ${assignment.photo_urls && assignment.photo_urls.length > 0 ? 
                                                    `<div class="photo-count">
                                                        <i class="fas fa-camera me-1"></i>
                                                        <strong>${assignment.photo_urls.length} fotoğraf</strong>
                                                    </div>` : 
                                                    '<div class="text-muted">Fotoğraf yok</div>'
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                            }).join('') || '<div class="col-12 text-center text-muted">Atanan mağaza yok</div>'}
                        </div>
                    </div>
                </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>
                            <button type="button" class="btn btn-danger" onclick="deleteTask(${task.id}); $('#taskViewModal').modal('hide');">Sil</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Eski modal varsa kaldır
        const existingModal = document.getElementById('taskViewModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Modal'ı sayfaya ekle
        document.body.insertAdjacentHTML('beforeend', modalContent);

        // Modal'ı göster
        const modal = new bootstrap.Modal(document.getElementById('taskViewModal'));
        modal.show();
        
        // Seçilen görev ID'sini sakla ve sunum butonunu göster
        window.selectedTaskId = taskId;
        const presentationBtn = document.getElementById('presentation-btn');
        if (presentationBtn) {
            presentationBtn.style.display = 'inline-block';
            console.log('Sunum butonu gösterildi, görev ID:', taskId);
        } else {
            console.error('Sunum butonu bulunamadı!');
        }
        
        // Mağaza kartlarına tıklama event listener'ı ekle
        setTimeout(() => {
            const storeCards = document.querySelectorAll('.store-card');
            storeCards.forEach(card => {
                card.addEventListener('click', function() {
                    const storeName = this.getAttribute('data-store-name');
                    const photoUrls = JSON.parse(this.getAttribute('data-photo-urls') || '[]');
                    const status = this.getAttribute('data-status');
                    openStorePhotoModal(storeName, photoUrls, status);
                });
            });
        }, 100);

    } catch (error) {
        console.error('Görev detayları yüklenirken hata:', error);
        alert('❌ Görev detayları yüklenirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
    }
}

// Görev atama durumu badge'i
function getTaskAssignmentStatusBadge(status) {
    const badges = {
        'assigned': '<span class="badge bg-warning">Atandı</span>',
        'in_progress': '<span class="badge bg-info">Devam Ediyor</span>',
        'completed': '<span class="badge bg-success">Tamamlandı</span>',
        'cancelled': '<span class="badge bg-danger">İptal</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Bilinmiyor</span>';
}


async function deleteTask(taskId) {
    if (confirm('Bu görevi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
        try {
            // Önce task_assignments tablosundaki ilgili kayıtları sil
            const { error: assignmentsError } = await supabase
                .from('task_assignments')
                .delete()
                .eq('task_id', taskId);

            if (assignmentsError) throw assignmentsError;

            // Sonra görevi sil
            const { error: taskError } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);

            if (taskError) throw taskError;

            alert('✅ Görev başarıyla silindi!');
            loadTasksList(); // Listeyi yenile

        } catch (error) {
            console.error('Görev silme hatası:', error);
            alert('❌ Görev silinirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
        }
    }
}

// Event listener'ları ekle
document.addEventListener('DOMContentLoaded', function() {
    // Görev arama ve filtreleme event listener'ları
    const taskSearch = document.getElementById('task-search');
    if (taskSearch) {
        taskSearch.addEventListener('input', filterTasks);
    }
    
    const taskStatusFilter = document.getElementById('task-status-filter');
    if (taskStatusFilter) {
        taskStatusFilter.addEventListener('change', filterTasks);
    }
    
    const taskCategoryFilter = document.getElementById('task-category-filter');
    if (taskCategoryFilter) {
        taskCategoryFilter.addEventListener('change', filterTasks);
    }
});

// Şifre görünürlüğünü değiştiren fonksiyon
function togglePasswordVisibility(button) {
    const input = button.previousElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// Kullanıcıları Excel olarak indiren fonksiyon
function exportUsersToExcel() {
    try {
        const users = allUsers || [];
        
        // Excel verisi hazırla
        const excelData = users.map(user => ({
            'Ad Soyad': user.name,
            'E-posta': user.email,
            'Şifre': user.password || '',
            'Rol': getRoleDisplayName(user.role),
            'Bölge': user.regions?.name || (user.role === 'admin' ? 'Tüm Bölgeler' : 'Belirtilmemiş'),
            'Durum': user.is_active ? 'Aktif' : 'Pasif',
            'Oluşturulma Tarihi': user.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : ''
        }));
        
        // Excel dosyası oluştur
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Kullanıcılar');
        
        // Dosyayı indir
        const fileName = `kullanicilar_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showAlert('Kullanıcı listesi Excel olarak indirildi!', 'success');
        
    } catch (error) {
        console.error('Excel export hatası:', error);
        showAlert('Excel dosyası oluşturulurken hata oluştu!', 'danger');
    }
}

// Mağazaları Excel olarak indiren fonksiyon
function exportStoresToExcel() {
    try {
        const stores = allStores || [];
        
        // Excel verisi hazırla
        const excelData = stores.map(store => ({
            'Mağaza Adı': store.name,
            'Kanal': store.channels?.name || 'Bilinmiyor',
            'Bölge': store.regions?.name || 'Bilinmiyor',
            'Yönetici': store.manager_name || 'Atanmamış',
            'Durum': store.is_active ? 'Aktif' : 'Pasif',
            'Oluşturulma Tarihi': store.created_at ? new Date(store.created_at).toLocaleDateString('tr-TR') : ''
        }));
        
        // Excel dosyası oluştur
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Mağazalar');
        
        // Dosyayı indir
        const fileName = `magazalar_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showAlert('Mağaza listesi Excel olarak indirildi!', 'success');
        
    } catch (error) {
        console.error('Excel export hatası:', error);
        showAlert('Excel dosyası oluşturulurken hata oluştu!', 'danger');
    }
}

// Görevleri Excel olarak indiren fonksiyon
function exportTasksToExcel() {
    try {
        const tasks = window.allTasks || [];
        
        if (tasks.length === 0) {
            showAlert('İndirilecek görev bulunamadı! Önce görevler listesini yükleyin.', 'warning');
            return;
        }
        
        // Excel verisi hazırla
        const excelData = tasks.map(task => ({
            'Görev Adı': task.title,
            'Açıklama': task.description || '',
            'Kategori': getTaskCategoryDisplayName(task.category),
            'Kanal': task.channels?.name || 'Bilinmiyor',
            'Durum': getTaskStatusDisplay(task.status),
            'Başlangıç Tarihi': task.start_date ? new Date(task.start_date).toLocaleDateString('tr-TR') : '',
            'Bitiş Tarihi': task.end_date ? new Date(task.end_date).toLocaleDateString('tr-TR') : '',
            'Yazılı Yanıt': task.response_text_enabled ? 'Evet' : 'Hayır',
            'Fotoğraflı Yanıt': task.response_photo_enabled ? 'Evet' : 'Hayır',
            'Fotoğraf Limiti': task.photo_limit || '',
            'Atanan Mağaza Sayısı': task.task_assignments?.length || 0,
            'Oluşturulma Tarihi': task.created_at ? new Date(task.created_at).toLocaleDateString('tr-TR') : ''
        }));
        
        // Excel dosyası oluştur
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Görevler');
        
        // Dosyayı indir
        const fileName = `gorevler_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showAlert('Görev listesi Excel olarak indirildi!', 'success');
        
    } catch (error) {
        console.error('Excel export hatası:', error);
        showAlert('Excel dosyası oluşturulurken hata oluştu!', 'danger');
    }
}

// Tek görev için Excel export fonksiyonu
async function exportTaskToExcel(taskId) {
    console.log('Excel export başlatıldı, taskId:', taskId);
    try {
        // Görev detaylarını al
        const { data: task, error } = await supabase
            .from('tasks')
            .select(`
                *,
                channels(name),
                task_assignments(
                    id,
                    status,
                    comment,
                    photo_urls,
                    completed_at,
                    stores(name, manager_id, regions(name, manager_name))
                )
            `)
            .eq('id', taskId)
            .single();

        if (error) throw error;

        // Excel verisi hazırla
        const excelData = task.task_assignments?.map(assignment => ({
            'Görev Adı': task.title,
            'Başlangıç Tarihi': task.start_date ? formatDateForExcel(task.start_date) : '-',
            'Bitiş Tarihi': task.end_date ? formatDateForExcel(task.end_date) : '-',
            'Bölge Yöneticisi': assignment.stores?.regions?.manager_name || 'Bilinmiyor',
            'Durum': getStatusText(assignment.status),
            'Kategori': getCategoryText(task.category),
            'Mağaza': assignment.stores?.name || 'Bilinmiyor',
            'Atanan Kişi': 'Bilinmiyor',
            'Oluşturulma Tarihi': formatDateForExcel(task.created_at)
        })) || [];

        // Excel dosyası oluştur
        console.log('XLSX kütüphanesi yüklü mü?', typeof XLSX);
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX kütüphanesi yüklenmemiş!');
        }
        
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Görev Detayları');
        
        // Dosyayı indir
        const fileName = `gorev_${task.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showAlert('Görev detayları Excel olarak indirildi!', 'success');
        
    } catch (error) {
        console.error('Excel export hatası:', error);
        showAlert('Excel dosyası oluşturulurken hata oluştu!', 'danger');
    }
}

// Durum metni döndüren fonksiyon
function getStatusText(status) {
    const statuses = {
        'assigned': 'Atandı',
        'in_progress': 'Devam Ediyor',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal'
    };
    return statuses[status] || status;
}

// Kategori metni döndüren fonksiyon
function getCategoryText(category) {
    const categories = {
        'reyon': 'Reyon',
        'sepet': 'Sepet',
        'kampanya': 'Kampanya',
        'urun': 'Ürün'
    };
    return categories[category] || category;
}

// Excel için tarih formatı
function formatDateForExcel(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
}

// Görev silme fonksiyonu
async function deleteTask(taskId) {
    if (confirm('Bu görevi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ is_active: false })
                .eq('id', taskId);
            
            if (error) throw error;
            
            showAlert('Görev başarıyla silindi!', 'success');
            loadDashboardData(); // Dashboard'u yenile
            
        } catch (error) {
            console.error('Görev silme hatası:', error);
            showAlert('Görev silinirken hata oluştu!', 'danger');
        }
    }
}

// Rol görüntüleme adını döndüren fonksiyon
function getRoleDisplayName(role) {
    const roles = {
        'admin': 'Admin',
        'manager': 'Yönetici',
        'employee': 'Mağaza Çalışanı'
    };
    return roles[role] || role;
}

// Görev kategorisi görüntüleme adını döndüren fonksiyon
function getTaskCategoryDisplayName(category) {
    const categories = {
        'reyon': 'Reyon',
        'sepet': 'Sepet',
        'kampanya': 'Kampanya',
        'diger': 'Diğer'
    };
    return categories[category] || category;
}

// Görev durumu görüntüleme adını döndüren fonksiyon
function getTaskStatusDisplay(status) {
    const statuses = {
        'active': 'Aktif',
        'in_progress': 'Devam Ediyor',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal'
    };
    return statuses[status] || status;
}

// Fotoğraf galerisi oluşturan fonksiyon (mağaza bazında)
function getPhotoGallery(assignments) {
    if (!assignments || assignments.length === 0) {
        return '<div class="col-12 text-center text-muted">Henüz fotoğraf yüklenmemiş</div>';
    }

    let galleryHtml = '';
    
    assignments.forEach(assignment => {
        const storeName = assignment.stores?.name || 'Bilinmeyen Mağaza';
        const photoCount = assignment.photo_urls ? assignment.photo_urls.length : 0;
        const status = assignment.status;
        
        // Durum rengi
        let statusColor = 'bg-light';
        let statusText = 'Atandı';
        if (status === 'in_progress') {
            statusColor = 'bg-info';
            statusText = 'Devam Ediyor';
        } else if (status === 'completed') {
            statusColor = 'bg-success';
            statusText = 'Tamamlandı';
        } else if (status === 'cancelled') {
            statusColor = 'bg-danger';
            statusText = 'İptal';
        }
        
        galleryHtml += `
            <div class="col-md-3 col-sm-4 col-6 mb-3">
                <div class="card store-photo-card ${statusColor}" 
                     style="cursor: pointer; min-height: 200px;"
                     onclick="openStorePhotoModal('${storeName}', ${JSON.stringify(assignment.photo_urls || [])}, '${status}')">
                    <div class="card-body text-center d-flex flex-column justify-content-center">
                        <div class="mb-3">
                            <i class="fas fa-store fa-3x text-muted"></i>
                        </div>
                        <h6 class="card-title mb-2">${storeName}</h6>
                        <div class="mb-2">
                            <span class="badge ${statusColor === 'bg-success' ? 'bg-success' : statusColor === 'bg-info' ? 'bg-info' : statusColor === 'bg-danger' ? 'bg-danger' : 'bg-warning'}">${statusText}</span>
                        </div>
                        <div class="mt-auto">
                            ${photoCount > 0 ? 
                                `<div class="photo-count">
                                    <i class="fas fa-camera me-1"></i>
                                    <strong>${photoCount} fotoğraf</strong>
                                </div>` : 
                                '<div class="text-muted">Fotoğraf yok</div>'
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    return galleryHtml || '<div class="col-12 text-center text-muted">Henüz fotoğraf yüklenmemiş</div>';
}

// Görev atama durumu badge'i döndüren fonksiyon
function getTaskAssignmentStatusBadge(status) {
    const statuses = {
        'assigned': '<span class="badge bg-warning">Atandı</span>',
        'in_progress': '<span class="badge bg-info">Devam Ediyor</span>',
        'completed': '<span class="badge bg-success">Tamamlandı</span>',
        'cancelled': '<span class="badge bg-danger">İptal</span>'
    };
    return statuses[status] || '<span class="badge bg-secondary">Bilinmiyor</span>';
}

// Mağaza fotoğraf modal'ını açan fonksiyon
function openStorePhotoModal(storeName, photoUrls, status) {
    if (!photoUrls || photoUrls.length === 0) {
        showAlert('Bu mağazada henüz fotoğraf yüklenmemiş!', 'info');
        return;
    }

    const statusText = {
        'assigned': 'Atandı',
        'in_progress': 'Devam Ediyor', 
        'completed': 'Tamamlandı',
        'cancelled': 'İptal'
    }[status] || 'Bilinmiyor';

    const modalContent = `
        <div class="modal fade" id="storePhotoModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-store me-2"></i>${storeName}
                            <span class="badge bg-secondary ms-2">${statusText}</span>
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            ${photoUrls.map((photoUrl, index) => `
                                <div class="col-md-4 col-sm-6 mb-3">
                                    <div class="card">
                                        <img src="${photoUrl}" 
                                             class="card-img-top" 
                                             style="height: 200px; object-fit: cover; cursor: pointer;"
                                             onclick="openSinglePhotoModal('${photoUrl}', '${storeName}')"
                                             alt="Fotoğraf ${index + 1}">
                                        <div class="card-body p-2">
                                            <small class="text-muted">Fotoğraf ${index + 1}</small>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>
                        <span class="text-muted">${photoUrls.length} fotoğraf</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Eski modal varsa kaldır
    const existingModal = document.getElementById('storePhotoModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Modal'ı sayfaya ekle
    document.body.insertAdjacentHTML('beforeend', modalContent);

    // Modal'ı göster
    const modal = new bootstrap.Modal(document.getElementById('storePhotoModal'));
    modal.show();
}

// Tek fotoğraf modal'ını açan fonksiyon
function openSinglePhotoModal(photoUrl, storeName) {
    const modalContent = `
        <div class="modal fade" id="singlePhotoModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${storeName}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <img src="${photoUrl}" class="img-fluid" alt="Fotoğraf">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>
                        <a href="${photoUrl}" target="_blank" class="btn btn-primary">Yeni Sekmede Aç</a>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Eski modal varsa kaldır
    const existingModal = document.getElementById('singlePhotoModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Modal'ı sayfaya ekle
    document.body.insertAdjacentHTML('beforeend', modalContent);

    // Modal'ı göster
    const modal = new bootstrap.Modal(document.getElementById('singlePhotoModal'));
    modal.show();
}

// Otomatik şifre oluşturan fonksiyon
function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Kullanıcı formunda otomatik şifre oluşturan fonksiyon
function generateUserPassword() {
    const passwordInput = document.getElementById('user-password');
    if (passwordInput) {
        passwordInput.value = generatePassword();
        passwordInput.type = 'text'; // Şifreyi göster
        setTimeout(() => {
            passwordInput.type = 'password'; // Tekrar gizle
        }, 2000);
    }
}

// Tarih formatlayan fonksiyon
function formatDateTime(dateString) {
    if (!dateString) return 'Belirtilmemiş';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Sunum indirme fonksiyonu
async function exportTaskToPresentation(taskId) {
    console.log('Sunum indirme fonksiyonu çağrıldı');
    const selectedTaskId = taskId || window.selectedTaskId;
    console.log('Seçilen görev ID:', selectedTaskId);
    
    if (!selectedTaskId) {
        showAlert('Lütfen önce bir görev seçin!', 'warning');
        return;
    }

    try {
        showAlert('Sunum hazırlanıyor...', 'info');
        console.log('Görev detayları alınıyor...');
        
        // Görev detaylarını al
        const { data: task, error } = await supabase
            .from('tasks')
            .select(`
                *,
                channels(name),
                task_assignments(
                    id,
                    status,
                    comment,
                    photo_urls,
                    completed_at,
                    stores(name, manager_id, regions(name, manager_name))
                )
            `)
            .eq('id', selectedTaskId)
            .single();

        if (error) throw error;

        // PowerPoint sunumu oluştur (eğer kütüphane yüklüyse)
        if (typeof PptxGenJS !== 'undefined') {
            await createPowerPointPresentation(task);
        } else {
            // Alternatif olarak ZIP sunumu oluştur
            await createZipPresentation(task);
        }

    } catch (error) {
        console.error('Sunum oluşturma hatası:', error);
        showAlert('Sunum oluşturulurken hata oluştu!', 'danger');
    }
}

// URL'yi base64'e çeviren fonksiyon
async function urlToBase64(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('URL base64 çevirme hatası:', error);
        return null;
    }
}

// PowerPoint sunumu oluşturan fonksiyon
async function createPowerPointPresentation(task) {
    try {
        // PptxGenJS kütüphanesinin yüklenip yüklenmediğini kontrol et
        if (typeof PptxGenJS === 'undefined') {
            showAlert('PowerPoint kütüphanesi yüklenemedi. Lütfen sayfayı yenileyin.', 'danger');
            return;
        }
        
        // PowerPoint sunumu oluştur
        const pptx = new PptxGenJS();
        
        // Başlık sayfası
        const titleSlide = pptx.addSlide();
        titleSlide.background = { fill: '667eea' };
        titleSlide.addText(task.title, {
            x: 1, y: 2, w: 8, h: 1.5,
            fontSize: 48,
            color: 'ffffff',
            bold: true,
            align: 'center'
        });
        titleSlide.addText('Görev Raporu', {
            x: 1, y: 3.5, w: 8, h: 1,
            fontSize: 32,
            color: 'ffffff',
            align: 'center'
        });
        titleSlide.addText(`Kanal: ${task.channels?.name || 'Bilinmiyor'}`, {
            x: 1, y: 5, w: 8, h: 0.5,
            fontSize: 20,
            color: 'ffffff',
            align: 'center'
        });
        titleSlide.addText(`Kategori: ${getTaskCategoryDisplayName(task.category)}`, {
            x: 1, y: 5.5, w: 8, h: 0.5,
            fontSize: 20,
            color: 'ffffff',
            align: 'center'
        });
        titleSlide.addText(`Tarih: ${formatDateTime(task.start_date)} - ${formatDateTime(task.end_date)}`, {
            x: 1, y: 6, w: 8, h: 0.5,
            fontSize: 20,
            color: 'ffffff',
            align: 'center'
        });

        const completedStores = task.task_assignments?.filter(a => a.status === 'completed' && a.photo_urls && a.photo_urls.length > 0) || [];
        const incompleteStores = task.task_assignments?.filter(a => a.status !== 'completed' || !a.photo_urls || a.photo_urls.length === 0) || [];
        
        console.log('Sunum için görev verisi:', task);
        console.log('Tamamlayan mağazalar:', completedStores);
        console.log('Tamamlamayan mağazalar:', incompleteStores);

        // Özet sayfası
        const summarySlide = pptx.addSlide();
        summarySlide.addText('Görev Özeti', {
            x: 1, y: 0.3, w: 8, h: 0.8,
            fontSize: 32,
            color: '333333',
            bold: true,
            align: 'center'
        });
        summarySlide.addText(`Toplam Mağaza: ${task.task_assignments?.length || 0}`, {
            x: 1, y: 1.5, w: 8, h: 0.6,
            fontSize: 20,
            color: '333333',
            align: 'center'
        });
        summarySlide.addText(`Tamamlayan: ${completedStores.length}`, {
            x: 1, y: 2.2, w: 8, h: 0.6,
            fontSize: 20,
            color: '28a745',
            align: 'center'
        });
        summarySlide.addText(`Tamamlamayan: ${incompleteStores.length}`, {
            x: 1, y: 2.9, w: 8, h: 0.6,
            fontSize: 20,
            color: 'dc3545',
            align: 'center'
        });

        // Tamamlayan mağazalar sayfası
        if (completedStores.length > 0) {
            const completedSlide = pptx.addSlide();
            completedSlide.addText('✅ Tamamlayan Mağazalar', {
                x: 1, y: 0.3, w: 8, h: 0.8,
                fontSize: 28,
                color: '28a745',
                bold: true,
                align: 'center'
            });
            
            // Mağaza listesi - satır satır
            let yPosition = 1.5;
            const maxStoresPerPage = 20; // Sayfa başına maksimum mağaza sayısı
            const storesToShow = Math.min(completedStores.length, maxStoresPerPage);
            
            for (let i = 0; i < storesToShow; i++) {
                const store = completedStores[i];
                const storeName = store.stores?.name || 'Bilinmiyor';
                const photoCount = store.photo_urls?.length || 0;
                
                completedSlide.addText(`${i + 1}. ${storeName} (${photoCount} fotoğraf)`, {
                    x: 1, y: yPosition, w: 8, h: 0.4,
                    fontSize: 14,
                    color: '333333',
                    align: 'left'
                });
                
                yPosition += 0.4;
                
                // Sayfa sınırını kontrol et
                if (yPosition > 6.5) {
                    // Yeni sayfa oluştur
                    const nextCompletedSlide = pptx.addSlide();
                    nextCompletedSlide.addText('✅ Tamamlayan Mağazalar (Devam)', {
                        x: 1, y: 0.3, w: 8, h: 0.8,
                        fontSize: 28,
                        color: '28a745',
                        bold: true,
                        align: 'center'
                    });
                    yPosition = 1.5;
                }
            }
        }

        // Tamamlamayan mağazalar sayfası
        if (incompleteStores.length > 0) {
            const incompleteSlide = pptx.addSlide();
            incompleteSlide.addText('❌ Tamamlamayan Mağazalar', {
                x: 1, y: 0.3, w: 8, h: 0.8,
                fontSize: 28,
                color: 'dc3545',
                bold: true,
                align: 'center'
            });
            
            // Mağaza listesi - satır satır
            let yPosition = 1.5;
            const maxStoresPerPage = 20; // Sayfa başına maksimum mağaza sayısı
            const storesToShow = Math.min(incompleteStores.length, maxStoresPerPage);
            
            for (let i = 0; i < storesToShow; i++) {
                const store = incompleteStores[i];
                const storeName = store.stores?.name || 'Bilinmiyor';
                const statusText = {
                    'assigned': 'Atandı',
                    'in_progress': 'Devam Ediyor',
                    'cancelled': 'İptal'
                }[store.status] || 'Bilinmiyor';
                
                incompleteSlide.addText(`${i + 1}. ${storeName} - ${statusText}`, {
                    x: 1, y: yPosition, w: 8, h: 0.4,
                    fontSize: 14,
                    color: '333333',
                    align: 'left'
                });
                
                yPosition += 0.4;
                
                // Sayfa sınırını kontrol et
                if (yPosition > 6.5) {
                    // Yeni sayfa oluştur
                    const nextIncompleteSlide = pptx.addSlide();
                    nextIncompleteSlide.addText('❌ Tamamlamayan Mağazalar (Devam)', {
                        x: 1, y: 0.3, w: 8, h: 0.8,
                        fontSize: 28,
                        color: 'dc3545',
                        bold: true,
                        align: 'center'
                    });
                    yPosition = 1.5;
                }
            }
        }

        // Fotoğraf galerisi sayfaları
        if (completedStores.length > 0) {
            const allPhotos = [];
            completedStores.forEach(store => {
                console.log('Mağaza fotoğrafları işleniyor:', store.stores?.name, store.photo_urls);
                if (store.photo_urls) {
                    store.photo_urls.forEach(photoUrl => {
                        console.log('Fotoğraf URL ekleniyor:', photoUrl);
                        allPhotos.push({
                            url: photoUrl,
                            storeName: store.stores?.name || 'Bilinmiyor'
                        });
                    });
                }
            });
            
            console.log('Toplam fotoğraf sayısı:', allPhotos.length);

            // Her sayfada 6 fotoğraf
            for (let i = 0; i < allPhotos.length; i += 6) {
                const pagePhotos = allPhotos.slice(i, i + 6);
                const photoSlide = pptx.addSlide();
                photoSlide.addText('📸 Fotoğraf Galerisi', {
                    x: 1, y: 0.5, w: 8, h: 1,
                    fontSize: 28,
                    color: '333333',
                    bold: true,
                    align: 'center'
                });
                
                // Fotoğrafları paralel olarak base64'e çevir
                const photoPromises = pagePhotos.map(async (photo, index) => {
                    const row = Math.floor(index / 3);
                    const col = index % 3;
                    const x = 0.8 + col * 2.8;
                    const y = 1.8 + row * 2.2;
                    
                    console.log(`Fotoğraf ${index + 1} base64'e çevriliyor:`, photo.url);
                    
                    try {
                        // URL'yi base64'e çevir
                        const base64Data = await urlToBase64(photo.url);
                        
                        if (base64Data) {
                            // Fotoğraf ekleme (base64 olarak) - daha küçük boyut
                            photoSlide.addImage({
                                data: base64Data,
                                x: x, y: y, w: 2.2, h: 1.5
                            });
                            
                            photoSlide.addText(photo.storeName, {
                                x: x, y: y + 1.6, w: 2.2, h: 0.3,
                                fontSize: 10,
                                color: '333333',
                                align: 'center'
                            });
                            
                            console.log(`Fotoğraf ${index + 1} başarıyla eklendi`);
                        } else {
                            throw new Error('Base64 çevirme başarısız');
                        }
                    } catch (error) {
                        console.error(`Fotoğraf ${index + 1} eklenirken hata:`, error);
                        
                        // Hata durumunda placeholder ekle
                        photoSlide.addText('Fotoğraf Yüklenemedi', {
                            x: x, y: y, w: 2.2, h: 1.5,
                            fontSize: 12,
                            color: 'dc3545',
                            align: 'center',
                            valign: 'middle',
                            fill: { color: 'f8f9fa' }
                        });
                        
                        photoSlide.addText(photo.storeName, {
                            x: x, y: y + 1.6, w: 2.2, h: 0.3,
                            fontSize: 10,
                            color: '333333',
                            align: 'center'
                        });
                    }
                });
                
                // Tüm fotoğrafların işlenmesini bekle
                await Promise.all(photoPromises);
            }
        }

        // Sunumu indir
        const fileName = `Gorev_${task.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pptx`;
        await pptx.writeFile({ fileName: fileName });
        
        showAlert('PowerPoint sunumu başarıyla indirildi!', 'success');

    } catch (error) {
        console.error('PowerPoint sunumu oluşturma hatası:', error);
        showAlert('PowerPoint sunumu oluşturulurken hata oluştu!', 'danger');
    }
}

// ZIP sunumu oluşturan fonksiyon (PowerPoint alternatifi)
async function createZipPresentation(task) {
    try {
        showAlert('ZIP sunumu hazırlanıyor...', 'info');
        
        // Sunum HTML'ini oluştur
        const presentationHtml = createPresentationHTML(task);
        
        // HTML'i DOM'a ekle
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = presentationHtml;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        document.body.appendChild(tempDiv);

        // Sunum sayfalarını oluştur
        const pages = tempDiv.querySelectorAll('.presentation-page');
        const zip = new JSZip();
        
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const canvas = await html2canvas(page, {
                width: 1920,
                height: 1080,
                scale: 2,
                useCORS: true,
                allowTaint: true
            });
            
            const imgData = canvas.toDataURL('image/png');
            const base64Data = imgData.split(',')[1];
            
            zip.file(`slide_${String(i + 1).padStart(2, '0')}.png`, base64Data, { base64: true });
        }

        // ZIP dosyasını oluştur ve indir
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Gorev_${task.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Geçici div'i kaldır
        document.body.removeChild(tempDiv);

        showAlert('ZIP sunumu başarıyla indirildi!', 'success');

    } catch (error) {
        console.error('ZIP sunumu oluşturma hatası:', error);
        showAlert('ZIP sunumu oluşturulurken hata oluştu!', 'danger');
    }
}

// Sunum HTML'ini oluşturan fonksiyon
function createPresentationHTML(task) {
    const completedStores = task.task_assignments?.filter(a => a.status === 'completed' && a.photo_urls && a.photo_urls.length > 0) || [];
    const incompleteStores = task.task_assignments?.filter(a => a.status !== 'completed' || !a.photo_urls || a.photo_urls.length === 0) || [];
    
    let html = `
        <div class="presentation-container" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <!-- Başlık Sayfası -->
            <div class="presentation-page" style="width: 1920px; height: 1080px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 60px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                <h1 style="font-size: 64px; margin-bottom: 30px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">${task.title}</h1>
                <h2 style="font-size: 40px; margin-bottom: 40px; opacity: 0.9;">Görev Raporu</h2>
                <div style="font-size: 28px; margin-bottom: 30px;">
                    <p><strong>Kanal:</strong> ${task.channels?.name || 'Bilinmiyor'}</p>
                    <p><strong>Kategori:</strong> ${getTaskCategoryDisplayName(task.category)}</p>
                    <p><strong>Tarih:</strong> ${formatDateTime(task.start_date)} - ${formatDateTime(task.end_date)}</p>
                </div>
                <div style="font-size: 24px; margin-top: 40px;">
                    <p>Toplam Mağaza: ${task.task_assignments?.length || 0}</p>
                    <p>Tamamlayan: ${completedStores.length}</p>
                    <p>Tamamlamayan: ${incompleteStores.length}</p>
                </div>
            </div>
    `;

    // Tamamlayan mağazalar sayfası
    if (completedStores.length > 0) {
        html += `
            <div class="presentation-page" style="width: 1920px; height: 1080px; background: #f8f9fa; padding: 60px; color: #333;">
                <h1 style="font-size: 56px; color: #28a745; margin-bottom: 40px; text-align: center;">✅ Tamamlayan Mağazalar</h1>
                <div style="margin-top: 30px; font-size: 24px; line-height: 1.8;">
        `;
        
        completedStores.forEach((store, index) => {
            const photoCount = store.photo_urls ? store.photo_urls.length : 0;
            html += `
                <div style="margin-bottom: 15px; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 1px 5px rgba(0,0,0,0.1);">
                    <strong>${index + 1}.</strong> ${store.stores?.name || 'Bilinmiyor'} <span style="color: #666;">(${photoCount} fotoğraf)</span>
                </div>
            `;
        });
        
        html += `</div></div>`;
    }

    // Tamamlamayan mağazalar sayfası
    if (incompleteStores.length > 0) {
        html += `
            <div class="presentation-page" style="width: 1920px; height: 1080px; background: #f8f9fa; padding: 60px; color: #333;">
                <h1 style="font-size: 56px; color: #dc3545; margin-bottom: 40px; text-align: center;">❌ Tamamlamayan Mağazalar</h1>
                <div style="margin-top: 30px; font-size: 24px; line-height: 1.8;">
        `;
        
        incompleteStores.forEach((store, index) => {
            const statusText = {
                'assigned': 'Atandı',
                'in_progress': 'Devam Ediyor',
                'cancelled': 'İptal'
            }[store.status] || 'Bilinmiyor';
            
            html += `
                <div style="margin-bottom: 15px; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 1px 5px rgba(0,0,0,0.1);">
                    <strong>${index + 1}.</strong> ${store.stores?.name || 'Bilinmiyor'} <span style="color: #666;">- ${statusText}</span>
                </div>
            `;
        });
        
        html += `</div></div>`;
    }

        // Fotoğraf galerisi sayfaları (her 6 fotoğraf için bir sayfa)
        if (completedStores.length > 0) {
            const allPhotos = [];
            completedStores.forEach(store => {
                console.log('ZIP sunum - Mağaza fotoğrafları işleniyor:', store.stores?.name, store.photo_urls);
                if (store.photo_urls) {
                    store.photo_urls.forEach(photoUrl => {
                        console.log('ZIP sunum - Fotoğraf URL ekleniyor:', photoUrl);
                        allPhotos.push({
                            url: photoUrl,
                            storeName: store.stores?.name || 'Bilinmiyor'
                        });
                    });
                }
            });
            
            console.log('ZIP sunum - Toplam fotoğraf sayısı:', allPhotos.length);

        for (let i = 0; i < allPhotos.length; i += 6) {
            const pagePhotos = allPhotos.slice(i, i + 6);
            html += `
                <div class="presentation-page" style="width: 1920px; height: 1080px; background: #f8f9fa; padding: 60px; color: #333;">
                    <h1 style="font-size: 48px; color: #333; margin-bottom: 40px; text-align: center;">📸 Fotoğraf Galerisi</h1>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 40px;">
            `;
            
            pagePhotos.forEach(photo => {
                html += `
                    <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.1);">
                        <img src="${photo.url}" style="width: 100%; height: 300px; object-fit: cover;" alt="Fotoğraf" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div style="display: none; padding: 20px; text-align: center; background: #f8f9fa; height: 300px; align-items: center; justify-content: center;">
                            <div>
                                <i class="fas fa-image fa-3x text-muted mb-2"></i>
                                <div class="text-muted">Fotoğraf yüklenemedi</div>
                            </div>
                        </div>
                        <div style="padding: 20px; text-align: center;">
                            <h4 style="font-size: 24px; color: #333; margin: 0;">${photo.storeName}</h4>
                        </div>
                    </div>
                `;
            });
            
            html += `</div></div>`;
        }
    }

    html += `</div>`;
    return html;
}

// Mevcut kullanıcılar için şifre oluşturan fonksiyon
async function generatePasswordsForExistingUsers() {
    try {
        // Tüm aktif kullanıcıları getir
        const { data: allUsers, error } = await supabase
            .from('users')
            .select('id, name, email, password')
            .eq('is_active', true);

        if (error) throw error;

        if (!allUsers || allUsers.length === 0) {
            showAlert('Kullanıcı bulunamadı!', 'info');
            return;
        }

        // Boş veya null şifreleri filtrele
        const usersWithoutPassword = allUsers.filter(user => 
            !user.password || user.password.trim() === ''
        );

        console.log('Toplam kullanıcı:', allUsers.length);
        console.log('Şifresi olmayan kullanıcı:', usersWithoutPassword.length);
        console.log('Kullanıcılar:', usersWithoutPassword);

        if (usersWithoutPassword.length === 0) {
            showAlert('Tüm kullanıcıların şifresi mevcut!', 'info');
            return;
        }

        // Her kullanıcı için şifre oluştur ve güncelle
        let successCount = 0;
        for (const user of usersWithoutPassword) {
            const newPassword = generatePassword();
            
            const { error: updateError } = await supabase
                .from('users')
                .update({ password: newPassword })
                .eq('id', user.id);

            if (updateError) {
                console.error(`${user.name} için şifre oluşturma hatası:`, updateError);
            } else {
                console.log(`${user.name} için şifre oluşturuldu: ${newPassword}`);
                successCount++;
            }
        }

        showAlert(`${successCount} kullanıcı için şifre oluşturuldu!`, 'success');
        loadUsersList(); // Listeyi yenile

    } catch (error) {
        console.error('Şifre oluşturma hatası:', error);
        showAlert('Şifreler oluşturulurken hata oluştu: ' + error.message, 'danger');
    }
}

// Excel export fonksiyonu
async function exportTasksToExcel() {
    try {
        showAlert('Excel dosyası hazırlanıyor...', 'info');
        
        // Tüm görev atamalarını getir
        const { data: taskAssignments, error } = await supabase
            .from('task_assignments')
            .select(`
                *,
                tasks(
                    id,
                    title,
                    start_date,
                    end_date,
                    category
                ),
                stores(
                    name
                ),
                users(
                    name
                )
            `);

        if (error) throw error;

        // Excel verisi hazırla
        const excelData = taskAssignments.map(assignment => ({
            'Görev Adı': assignment.tasks?.title || 'Bilinmiyor',
            'Başlangıç Tarihi': assignment.tasks?.start_date ? formatDateForExcel(assignment.tasks.start_date) : '-',
            'Bitiş Tarihi': assignment.tasks?.end_date ? formatDateForExcel(assignment.tasks.end_date) : '-',
            'Bölge Yöneticisi': assignment.stores?.regions?.manager_name || 'Bilinmiyor',
            'Durum': getStatusText(assignment.status),
            'Kategori': getCategoryText(assignment.tasks?.category),
            'Mağaza': assignment.stores?.name || 'Bilinmiyor',
            'Atanan Kişi': assignment.users?.name || 'Bilinmiyor',
            'Oluşturulma Tarihi': formatDateForExcel(assignment.created_at)
        }));

        // Excel dosyası oluştur
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Görev Atamaları');
        
        // Dosyayı indir
        const fileName = `gorev_atamalari_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showAlert('Excel dosyası başarıyla indirildi!', 'success');
        
    } catch (error) {
        console.error('Excel export hatası:', error);
        showAlert('Excel dosyası oluşturulurken hata oluştu!', 'danger');
    }
}

// Tarih formatı (Excel için)
function formatDateForExcel(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
}

// Durum metni
function getStatusText(status) {
    const statusMap = {
        'assigned': 'Atandı',
        'in_progress': 'Devam Ediyor',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal'
    };
    return statusMap[status] || 'Bilinmiyor';
}

// Kategori metni
function getCategoryText(category) {
    const categoryMap = {
        'reyon': 'Reyon',
        'sepet': 'Sepet',
        'kampanya': 'Kampanya',
        'diger': 'Diğer'
    };
    return categoryMap[category] || 'Bilinmiyor';
}

// Görev sonlandırma fonksiyonu
async function completeTask(taskId, assignmentId) {
    try {
        if (!confirm('Bu görevi sonlandırmak istediğinizden emin misiniz?')) {
            return;
        }

        // Görev atamasını tamamlandı olarak güncelle
        const { error } = await supabase
            .from('task_assignments')
            .update({ 
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', assignmentId);

        if (error) throw error;

        showAlert('Görev başarıyla sonlandırıldı!', 'success');
        
        // Görev listesini yenile
        loadRecentTasks();
        
    } catch (error) {
        console.error('Görev sonlandırma hatası:', error);
        showAlert('Görev sonlandırılırken hata oluştu!', 'danger');
    }
}
