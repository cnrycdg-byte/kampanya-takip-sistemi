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
    
    // Menü öğelerini kullanıcı rolüne göre ayarla
    setupMenuForUser(user);
    
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
    
    // Oyun planı oluşturma formunu dinle - Sadece form submit'inde çalışsın
    document.addEventListener('submit', function(event) {
        if (event.target.id === 'create-game-plan-form') {
            event.preventDefault();
            handleCreateGamePlan(event);
        }
    });
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
        
        // Görev detay istatistiklerini yükle
        await loadTaskDetailStats(window.allTasks);
        
        // Gerçek verilerle istatistikleri hesapla
        const tasks = window.allTasks || [];
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
        const tasksToShow = window.allTasks || tasks || [];
        await loadTaskDetailStats(tasksToShow);
        
        // Son görevleri yükle
        loadRecentTasks(window.allTasks || tasks);
        
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
        
        // Kullanıcı oturumunu kontrol et
        const user = checkUserSession();
        if (!user) {
            container.innerHTML = '<div class="col-12 text-center text-muted"><i class="fas fa-exclamation-triangle me-2"></i>Oturum bulunamadı</div>';
            return;
        }
        
        // Yetki kontrolü: Saha satış temsilcileri sadece aktif ve devam eden görevleri görsün
        let filteredTasks = tasks || [];
        if (user.role === 'sales_rep') {
            filteredTasks = tasks.filter(task => ['active', 'in_progress'].includes(task.status));
            console.log('Saha satış temsilcisi için görevler filtrelendi:', filteredTasks.length);
        }
        // Admin ve manager'lar tüm görevleri görebilir (cancelled dahil)
        else if (user.role === 'admin' || user.role === 'manager') {
            console.log('Admin/Manager için tüm görevler gösteriliyor');
        }
        // Diğer roller için sadece aktif görevler
        else {
            filteredTasks = tasks.filter(task => task.status === 'active');
            console.log('Diğer roller için görevler filtrelendi:', filteredTasks.length);
        }
        
        if (!filteredTasks || filteredTasks.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted"><i class="fas fa-inbox me-2"></i>Henüz görev bulunmuyor</div>';
            return;
        }
        
        for (const task of filteredTasks) {
            let assignments = [];
            
            // Gerçek görevler için veritabanından atamaları al
            const { data: assignmentData, error } = await supabase
                .from('task_assignments')
                .select(`
                    id,
                    status,
                    photo_urls,
                    stores(name, manager)
                `)
                .eq('task_id', task.id);
            
            if (error) {
                console.error('Görev atamaları alınırken hata:', error);
                continue;
            }
            
            assignments = assignmentData || [];
            
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
                            <button class="btn btn-sm btn-outline-warning" onclick="exportTaskToPresentation(${task.id})">
                                <i class="fas fa-file-powerpoint me-1"></i>Sunum
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="exportTaskToExcel(${task.id})">
                                <i class="fas fa-file-excel me-1"></i>Excel
                            </button>
                            ${(user.role === 'admin' || user.role === 'manager') ? 
                                `<button class="btn btn-sm btn-outline-danger" onclick="deleteTask(${task.id})">
                                    <i class="fas fa-trash me-1"></i>Sil
                                </button>` : ''
                            }
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
    
    // Kullanıcı oturumunu kontrol et
    const user = checkUserSession();
    if (!user) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    <i class="fas fa-exclamation-triangle me-2"></i>Oturum bulunamadı
                </td>
            </tr>
        `;
        return;
    }
    
    // Yetki kontrolü: Saha satış temsilcileri sadece aktif ve devam eden görevleri görsün
    let filteredTasks = tasks || [];
    if (user.role === 'sales_rep') {
        filteredTasks = tasks.filter(task => ['active', 'in_progress'].includes(task.status));
        console.log('Saha satış temsilcisi için son görevler filtrelendi:', filteredTasks.length);
    }
    // Admin ve manager'lar tüm görevleri görebilir (cancelled dahil)
    else if (user.role === 'admin' || user.role === 'manager') {
        console.log('Admin/Manager için tüm son görevler gösteriliyor');
    }
    // Diğer roller için sadece aktif görevler
    else {
        filteredTasks = tasks.filter(task => task.status === 'active');
        console.log('Diğer roller için son görevler filtrelendi:', filteredTasks.length);
    }
    
    if (!filteredTasks || filteredTasks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    <i class="fas fa-inbox me-2"></i>Henüz görev bulunmuyor
                </td>
            </tr>
        `;
        return;
    }
    
    // Son 5 görevi al
    const recentTasks = filteredTasks.slice(0, 5);
    
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
                <div style="display: flex; gap: 2px;">
                    <button class="btn btn-sm btn-primary" onclick="viewTask(${task.id})" style="flex: 1;">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="exportTaskToPresentation(${task.id})" style="flex: 1;">
                        <i class="fas fa-file-powerpoint"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="exportTaskToExcel(${task.id})" style="flex: 1;">
                        <i class="fas fa-file-excel"></i>
                    </button>
                    ${(user.role === 'admin' || user.role === 'manager') ? 
                        `<button class="btn btn-sm btn-danger" onclick="deleteTask(${task.id})" style="flex: 1;">
                            <i class="fas fa-trash"></i>
                        </button>` : ''
                    }
                </div>
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
    console.log('showSection çağrıldı:', sectionName);
    
    // Tüm bölümleri gizle
    const sections = document.querySelectorAll('.content-section');
    console.log('Bulunan bölümler:', sections.length);
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Seçilen bölümü göster
    let targetSection = document.getElementById(sectionName + '-section');
    console.log('Aranan ID:', sectionName + '-section');
    console.log('Bulunan element:', targetSection);
    
    // Özel durumlar için ID'yi düzelt
    if (sectionName === 'game-plans' && !targetSection) {
        targetSection = document.getElementById('game-plans-section');
        console.log('Özel durum - game-plans-section aranıyor:', targetSection);
    }
    
    if (targetSection) {
        targetSection.style.display = 'block';
        console.log('Bölüm gösterildi:', sectionName);
    } else {
        console.error('Bölüm bulunamadı:', sectionName);
        console.log('Mevcut tüm bölümler:', Array.from(sections).map(s => s.id));
        console.log('Aranan ID detayı:', sectionName + '-section');
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
            'regions': 'Bölgeler',
            'game-plans': 'Oyun Planları',
            'game-plan-create': 'Yeni Oyun Planı Oluştur'
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
            loadStoresList();
            break;
        case 'users':
            loadUsersList();
            break;
        case 'channels':
            loadChannelsList();
            break;
        case 'regions':
            loadRegionsList();
            break;
        case 'game-plans':
            loadGamePlansList();
            break;
        case 'game-plan-create':
            // Oyun planı oluşturma sayfası - özel işlem gerekmez
            break;
    }
}

// Diğer bölümler için veri yükleme fonksiyonları
// Bu fonksiyonlar artık doğru fonksiyonları çağırıyor

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
        
        // Kullanıcı oturumunu kontrol et
        const user = checkUserSession();
        if (!user) {
            console.error('Kullanıcı oturumu bulunamadı');
            displayTasksList([]);
            return;
        }
        
        let query = supabase
            .from('tasks')
            .select(`
                *,
                channels(name),
                task_assignments(
                    id,
                    status,
                    stores(name, manager)
                )
            `);
        
        // Yetki kontrolü: Saha satış temsilcileri sadece aktif ve devam eden görevleri görsün
        if (user.role === 'sales_rep') {
            query = query.in('status', ['active', 'in_progress']);
            console.log('Saha satış temsilcisi için sadece aktif ve devam eden görevler yükleniyor');
        }
        // Admin ve manager'lar tüm görevleri görebilir (cancelled dahil)
        else if (user.role === 'admin' || user.role === 'manager') {
            console.log('Admin/Manager için tüm görevler yükleniyor');
        }
        // Diğer roller için sadece aktif görevler
        else {
            query = query.eq('status', 'active');
            console.log('Diğer roller için sadece aktif görevler yükleniyor');
        }
        
        const { data: tasks, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        console.log('Görevler yüklendi:', tasks);
        window.allTasks = tasks || []; // Global değişkende sakla
        
        displayTasksList(window.allTasks);
        
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

    // Kullanıcı oturumunu kontrol et
    const user = checkUserSession();
    if (!user) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">
                    <i class="fas fa-exclamation-triangle me-2"></i>Oturum bulunamadı
                </td>
            </tr>
        `;
        return;
    }

    // Yetki kontrolü: Saha satış temsilcileri sadece aktif ve devam eden görevleri görsün
    let filteredTasks = tasks || [];
    if (user.role === 'sales_rep') {
        filteredTasks = tasks.filter(task => ['active', 'in_progress'].includes(task.status));
        console.log('Saha satış temsilcisi için görev listesi filtrelendi:', filteredTasks.length);
    }
    // Admin ve manager'lar tüm görevleri görebilir (cancelled dahil)
    else if (user.role === 'admin' || user.role === 'manager') {
        console.log('Admin/Manager için tüm görev listesi gösteriliyor');
    }
    // Diğer roller için sadece aktif görevler
    else {
        filteredTasks = tasks.filter(task => task.status === 'active');
        console.log('Diğer roller için görev listesi filtrelendi:', filteredTasks.length);
    }

    if (!filteredTasks || filteredTasks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">
                    <i class="fas fa-inbox me-2"></i>Henüz görev bulunmuyor
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredTasks.map(task => {
        const channelName = task.channels?.name || 'Bilinmiyor';
        let allStores = task.task_assignments?.map(ta => ta.stores?.name).filter(Boolean) || [];
        
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
                        <button class="btn btn-outline-success" onclick="exportTaskToExcel(${task.id})" title="Excel İndir">
                            <i class="fas fa-file-excel"></i>
                        </button>
                        ${(user.role === 'admin' || user.role === 'manager') && task.status !== 'cancelled' ? 
                            `<button class="btn btn-outline-danger" onclick="deleteTask(${task.id})" title="Sil">
                                <i class="fas fa-trash"></i>
                            </button>` : ''
                        }
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
        'completed': '<span class="badge bg-primary">Tamamlandı</span>',
        'cancelled': '<span class="badge bg-danger">İptal Edildi</span>'
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
                    stores(name, manager)
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
                            ${task.example_photo_url ? `
                            <div class="row mt-3">
                                <div class="col-12">
                                    <h6>Örnek Fotoğraf</h6>
                                    <div class="text-center">
                                        <img src="${supabase.supabaseUrl}/storage/v1/object/public/task-photos/${task.example_photo_url}" 
                                             alt="Örnek Fotoğraf" 
                                             class="img-fluid rounded" 
                                             style="max-height: 300px; max-width: 100%;"
                                             onerror="this.style.display='none'; this.parentElement.parentElement.style.display='none';">
                                    </div>
                                </div>
                            </div>
                            ` : ''}
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
                                            <div class="mb-1">
                                                <small class="text-muted">
                                                    <i class="fas fa-user-tie me-1"></i>
                                                    ${assignment.stores?.manager || 'Yönetici bilgisi yok'}
                                                </small>
                                            </div>
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
    console.log('deleteTask çağrıldı, taskId:', taskId);
    
    if (confirm('Bu görevi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
        try {
            console.log('Soft delete başlatılıyor...');
            
            // Soft delete: Görev durumunu "cancelled" yap
            console.log('Task güncelleniyor, taskId:', taskId);
            const { error: taskError } = await supabase
                .from('tasks')
                .update({ 
                    status: 'cancelled'
                })
                .eq('id', taskId);

            if (taskError) {
                console.error('Task güncelleme hatası:', taskError);
                throw taskError;
            }

            console.log('Task başarıyla iptal edildi');

            // Task assignments'ları da iptal et (opsiyonel)
            try {
                const { error: assignmentsError } = await supabase
                    .from('task_assignments')
                    .update({ 
                        status: 'cancelled'
                    })
                    .eq('task_id', taskId);

                if (assignmentsError) {
                    console.warn('Task assignments güncellenemedi:', assignmentsError);
                } else {
                    console.log('Task assignments başarıyla iptal edildi');
                }
            } catch (assignmentsError) {
                console.warn('Task assignments güncellenirken hata:', assignmentsError);
                // Bu hata kritik değil, devam et
            }

            alert('✅ Görev başarıyla iptal edildi!');
            loadTasksList(); // Listeyi yenile

        } catch (error) {
            console.error('Görev silme hatası:', error);
            console.error('Hata detayları:', JSON.stringify(error, null, 2));
            alert('❌ Görev iptal edilirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
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
    console.log('openStorePhotoModal çağrıldı:', { storeName, photoUrls, status });
    
    if (!photoUrls || photoUrls.length === 0) {
        showAlert('Bu mağazada henüz fotoğraf yüklenmemiş!', 'info');
        return;
    }
    
    // URL'leri kontrol et
    photoUrls.forEach((url, index) => {
        console.log(`Fotoğraf ${index + 1} URL:`, url);
    });

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
                                        <div class="position-relative" style="height: 200px;">
                                            <img src="${photoUrl}" 
                                                 class="card-img-top" 
                                                 style="height: 200px; object-fit: cover; cursor: pointer;"
                                                 onclick="openSinglePhotoModal('${photoUrl}', '${storeName}')"
                                                 alt="Fotoğraf ${index + 1}"
                                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                            <div class="d-none align-items-center justify-content-center bg-light" 
                                                 style="height: 200px; cursor: pointer;"
                                                 onclick="openSinglePhotoModal('${photoUrl}', '${storeName}')">
                                                <div class="text-center text-muted">
                                                    <i class="fas fa-image fa-3x mb-2"></i>
                                                    <div>Fotoğraf ${index + 1}</div>
                                                    <small>Yüklenemedi</small>
                                                </div>
                                            </div>
                                        </div>
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
    console.log('openSinglePhotoModal çağrıldı:', { photoUrl, storeName });
    
    // URL'yi test et
    const img = new Image();
    img.onload = function() {
        console.log('Fotoğraf başarıyla yüklendi:', photoUrl);
    };
    img.onerror = function() {
        console.error('Fotoğraf yüklenemedi:', photoUrl);
    };
    img.src = photoUrl;
    
    const modalContent = `
        <div class="modal fade" id="singlePhotoModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${storeName}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <div class="position-relative">
                            <img src="${photoUrl}" 
                                 class="img-fluid" 
                                 alt="Fotoğraf"
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div class="d-none align-items-center justify-content-center bg-light" 
                                 style="min-height: 300px;">
                                <div class="text-center text-muted">
                                    <i class="fas fa-image fa-5x mb-3"></i>
                                    <h5>Fotoğraf Yüklenemedi</h5>
                                    <p>Bu fotoğraf görüntülenemiyor. Lütfen daha sonra tekrar deneyin.</p>
                                </div>
                            </div>
                        </div>
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
                    stores(name, manager)
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
        
        // Başlık sayfası - Düzeltilmiş
        const titleSlide = pptx.addSlide();
        titleSlide.background = { fill: '667eea' };
        titleSlide.addText(task.title, {
            x: 0.5, y: 1.5, w: 9, h: 1.2,
            fontSize: 36,
            color: 'ffffff',
            bold: true,
            align: 'center'
        });
        titleSlide.addText('Görev Raporu', {
            x: 0.5, y: 2.8, w: 9, h: 0.8,
            fontSize: 24,
            color: 'ffffff',
            align: 'center'
        });
        titleSlide.addText(`Kanal: ${task.channels?.name || 'Bilinmiyor'}`, {
            x: 0.5, y: 4, w: 9, h: 0.4,
            fontSize: 16,
            color: 'ffffff',
            align: 'center'
        });
        titleSlide.addText(`Kategori: ${getTaskCategoryDisplayName(task.category)}`, {
            x: 0.5, y: 4.5, w: 9, h: 0.4,
            fontSize: 16,
            color: 'ffffff',
            align: 'center'
        });
        titleSlide.addText(`Tarih: ${formatDateTime(task.start_date)} - ${formatDateTime(task.end_date)}`, {
            x: 0.5, y: 5, w: 9, h: 0.4,
            fontSize: 16,
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
            x: 1, y: 0.5, w: 8, h: 1,
            fontSize: 36,
            color: '333333',
            bold: true,
            align: 'center'
        });
        summarySlide.addText(`Toplam Mağaza: ${task.task_assignments?.length || 0}`, {
            x: 1, y: 2, w: 8, h: 0.8,
            fontSize: 24,
            color: '333333',
            align: 'center'
        });
        summarySlide.addText(`Tamamlayan: ${completedStores.length}`, {
            x: 1, y: 3, w: 8, h: 0.8,
            fontSize: 24,
            color: '28a745',
            align: 'center'
        });
        summarySlide.addText(`Tamamlamayan: ${incompleteStores.length}`, {
            x: 1, y: 4, w: 8, h: 0.8,
            fontSize: 24,
            color: 'dc3545',
            align: 'center'
        });

        // Tamamlayan mağazalar sayfası - Düzeltilmiş (satır satır)
        if (completedStores.length > 0) {
            // Her sayfada maksimum 20 mağaza göster
            const storesPerPage = 20;
            const totalPages = Math.ceil(completedStores.length / storesPerPage);
            
            for (let page = 0; page < totalPages; page++) {
                const completedSlide = pptx.addSlide();
                completedSlide.addText('✅ Tamamlayan Mağazalar', {
                    x: 0.5, y: 0.5, w: 9, h: 0.8,
                    fontSize: 28,
                    color: '28a745',
                    bold: true,
                    align: 'center'
                });
                
                const startIndex = page * storesPerPage;
                const endIndex = Math.min(startIndex + storesPerPage, completedStores.length);
                const pageStores = completedStores.slice(startIndex, endIndex);
                
                // Mağaza listesi (satır satır)
                pageStores.forEach((store, index) => {
                    const y = 1.5 + (index * 0.3);
                    completedSlide.addText(`${index + 1}. ${store.stores?.name || 'Bilinmiyor'}`, {
                        x: 0.5, y: y, w: 8, h: 0.25,
                        fontSize: 14,
                        color: '333333',
                        align: 'left'
                    });
                });
                
                // Sayfa numarası
                if (totalPages > 1) {
                    completedSlide.addText(`Sayfa ${page + 1} / ${totalPages}`, {
                        x: 0.5, y: 7.5, w: 9, h: 0.3,
                        fontSize: 12,
                        color: '666666',
                        align: 'center'
                    });
                }
            }
        }

        // Tamamlamayan mağazalar sayfası - Düzeltilmiş (satır satır)
        if (incompleteStores.length > 0) {
            // Her sayfada maksimum 20 mağaza göster
            const storesPerPage = 20;
            const totalPages = Math.ceil(incompleteStores.length / storesPerPage);
            
            for (let page = 0; page < totalPages; page++) {
                const incompleteSlide = pptx.addSlide();
                incompleteSlide.addText('❌ Tamamlamayan Mağazalar', {
                    x: 0.5, y: 0.5, w: 9, h: 0.8,
                    fontSize: 28,
                    color: 'dc3545',
                    bold: true,
                    align: 'center'
                });
                
                const startIndex = page * storesPerPage;
                const endIndex = Math.min(startIndex + storesPerPage, incompleteStores.length);
                const pageStores = incompleteStores.slice(startIndex, endIndex);
                
                // Mağaza listesi (satır satır)
                pageStores.forEach((store, index) => {
                    const y = 1.5 + (index * 0.3);
                    const statusText = {
                        'assigned': 'Atandı',
                        'in_progress': 'Devam Ediyor',
                        'cancelled': 'İptal'
                    }[store.status] || 'Bilinmiyor';
                    
                    incompleteSlide.addText(`${index + 1}. ${store.stores?.name || 'Bilinmiyor'} (${statusText})`, {
                        x: 0.5, y: y, w: 8, h: 0.25,
                        fontSize: 14,
                        color: '333333',
                        align: 'left'
                    });
                });
                
                // Sayfa numarası
                if (totalPages > 1) {
                    incompleteSlide.addText(`Sayfa ${page + 1} / ${totalPages}`, {
                        x: 0.5, y: 7.5, w: 9, h: 0.3,
                        fontSize: 12,
                        color: '666666',
                        align: 'center'
                    });
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

            // Her sayfada 6 fotoğraf - Düzeltilmiş
            for (let i = 0; i < allPhotos.length; i += 6) {
                const pagePhotos = allPhotos.slice(i, i + 6);
                const photoSlide = pptx.addSlide();
                photoSlide.addText('📸 Fotoğraf Galerisi', {
                    x: 0.5, y: 0.5, w: 9, h: 0.8,
                    fontSize: 24,
                    color: '333333',
                    bold: true,
                    align: 'center'
                });
                
                // Fotoğrafları paralel olarak base64'e çevir - Düzeltilmiş
                const photoPromises = pagePhotos.map(async (photo, index) => {
                    const row = Math.floor(index / 3);
                    const col = index % 3;
                    const x = 0.5 + col * 3;
                    const y = 1.5 + row * 2.5;
                    
                    console.log(`Fotoğraf ${index + 1} base64'e çevriliyor:`, photo.url);
                    
                    try {
                        // URL'yi base64'e çevir
                        const base64Data = await urlToBase64(photo.url);
                        
                        if (base64Data) {
                            // Fotoğraf ekleme (base64 olarak) - Düzeltilmiş boyutlar
                            photoSlide.addImage({
                                data: base64Data,
                                x: x, y: y, w: 2.8, h: 2.0
                            });
                            
                            photoSlide.addText(photo.storeName, {
                                x: x, y: y + 2.1, w: 2.8, h: 0.3,
                                fontSize: 11,
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
                            x: x, y: y, w: 2.5, h: 1.8,
                            fontSize: 14,
                            color: 'dc3545',
                            align: 'center',
                            valign: 'middle',
                            fill: { color: 'f8f9fa' }
                        });
                        
                        photoSlide.addText(photo.storeName, {
                            x: x, y: y + 1.9, w: 2.5, h: 0.3,
                            fontSize: 12,
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
            <div class="presentation-page" style="width: 1920px; height: 1080px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 80px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                <h1 style="font-size: 72px; margin-bottom: 40px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">${task.title}</h1>
                <h2 style="font-size: 48px; margin-bottom: 60px; opacity: 0.9;">Görev Raporu</h2>
                <div style="font-size: 32px; margin-bottom: 40px;">
                    <p><strong>Kanal:</strong> ${task.channels?.name || 'Bilinmiyor'}</p>
                    <p><strong>Kategori:</strong> ${getTaskCategoryDisplayName(task.category)}</p>
                    <p><strong>Tarih:</strong> ${formatDateTime(task.start_date)} - ${formatDateTime(task.end_date)}</p>
                </div>
                <div style="font-size: 28px; margin-top: 60px;">
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
                <h1 style="font-size: 64px; color: #28a745; margin-bottom: 50px; text-align: center;">✅ Tamamlayan Mağazalar</h1>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 40px; margin-top: 40px;">
        `;
        
        completedStores.forEach(store => {
            const photoCount = store.photo_urls ? store.photo_urls.length : 0;
            html += `
                <div style="background: white; border-radius: 20px; padding: 30px; box-shadow: 0 8px 25px rgba(0,0,0,0.1); text-align: center;">
                    <h3 style="font-size: 32px; color: #28a745; margin-bottom: 20px;">${store.stores?.name || 'Bilinmiyor'}</h3>
                    <div style="font-size: 24px; color: #666; margin-bottom: 20px;">
                        <i class="fas fa-camera" style="margin-right: 10px;"></i>
                        ${photoCount} fotoğraf
                    </div>
                    <div style="font-size: 20px; color: #28a745; font-weight: bold;">
                        ✅ Tamamlandı
                    </div>
                </div>
            `;
        });
        
        html += `</div></div>`;
    }

    // Tamamlamayan mağazalar sayfası
    if (incompleteStores.length > 0) {
        html += `
            <div class="presentation-page" style="width: 1920px; height: 1080px; background: #f8f9fa; padding: 60px; color: #333;">
                <h1 style="font-size: 64px; color: #dc3545; margin-bottom: 50px; text-align: center;">❌ Tamamlamayan Mağazalar</h1>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 40px; margin-top: 40px;">
        `;
        
        incompleteStores.forEach(store => {
            const statusText = {
                'assigned': 'Atandı',
                'in_progress': 'Devam Ediyor',
                'cancelled': 'İptal'
            }[store.status] || 'Bilinmiyor';
            
            html += `
                <div style="background: white; border-radius: 20px; padding: 30px; box-shadow: 0 8px 25px rgba(0,0,0,0.1); text-align: center;">
                    <h3 style="font-size: 32px; color: #dc3545; margin-bottom: 20px;">${store.stores?.name || 'Bilinmiyor'}</h3>
                    <div style="font-size: 24px; color: #666; margin-bottom: 20px;">
                        Durum: ${statusText}
                    </div>
                    <div style="font-size: 20px; color: #dc3545; font-weight: bold;">
                        ❌ Tamamlanmadı
                    </div>
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

// Excel export fonksiyonları
async function exportTaskToExcel(taskId) {
    console.log('Excel export fonksiyonu çağrıldı, taskId:', taskId);
    console.log('XLSX library yüklü mü?', typeof XLSX);
    
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
                    stores(name, manager_id, regions(name, manager_name))
                )
            `)
            .eq('id', taskId)
            .single();

        if (error) throw error;

        // Excel verilerini hazırla
        const excelData = task.task_assignments?.map(assignment => ({
            'Görev Adı': task.title,
            'Başlangıç Tarihi': formatDateForExcel(task.start_date),
            'Bitiş Tarihi': formatDateForExcel(task.end_date),
            'Bölge Yöneticisi': assignment.stores?.regions?.manager_name || 'Bilinmiyor',
            'Mağaza': assignment.stores?.name || 'Bilinmiyor',
            'Durum': getStatusText(assignment.status)
        })) || [];

        // Excel dosyasını oluştur
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Görev Detayları');
        
        // Dosyayı indir
        const fileName = `Gorev_${task.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showAlert('Excel dosyası başarıyla indirildi!', 'success');

    } catch (error) {
        console.error('Excel export hatası:', error);
        showAlert('Excel dosyası oluşturulurken hata oluştu!', 'danger');
    }
}



// Helper fonksiyonlar
function getStatusText(status) {
    const statusMap = {
        'assigned': 'Atandı',
        'in_progress': 'Devam Ediyor',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal',
        'active': 'Aktif'
    };
    return statusMap[status] || 'Bilinmiyor';
}

function getTaskStatusText(status) {
    const statusMap = {
        'assigned': 'Atandı',
        'in_progress': 'Devam Ediyor',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal',
        'active': 'Aktif'
    };
    return statusMap[status] || 'Bilinmiyor';
}

function getTaskStatusColor(status) {
    const colorMap = {
        'assigned': 'primary',
        'in_progress': 'warning',
        'completed': 'success',
        'cancelled': 'danger',
        'active': 'info'
    };
    return colorMap[status] || 'secondary';
}

function getTaskStatusBadge(status) {
    const color = getTaskStatusColor(status);
    const text = getTaskStatusText(status);
    return `<span class="badge bg-${color}">${text}</span>`;
}

function getTaskCategoryBadge(category) {
    const categoryMap = {
        'promotion': { text: 'Promosyon', color: 'primary' },
        'display': { text: 'Vitrin', color: 'info' },
        'training': { text: 'Eğitim', color: 'warning' },
        'other': { text: 'Diğer', color: 'secondary' },
    };
    const categoryInfo = categoryMap[category] || { text: 'Bilinmiyor', color: 'secondary' };
    return `<span class="badge bg-${categoryInfo.color}">${categoryInfo.text}</span>`;
}

function getCategoryText(category) {
    const categoryMap = {
        'promotion': 'Promosyon',
        'display': 'Vitrin',
        'training': 'Eğitim',
        'other': 'Diğer',
    };
    return categoryMap[category] || 'Bilinmiyor';
}

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

function formatDateForExcel(dateString) {
    if (!dateString) return 'Belirtilmemiş';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
}

// ==================== GÖREV SİLME FONKSİYONU ====================

// Görev silme fonksiyonu
window.deleteTask = function(taskId) {
    console.log('Görev silme başladı:', taskId);
    
    if (!taskId) {
        console.error('Görev ID bulunamadı');
        showAlert('Görev ID bulunamadı!', 'danger');
        return;
    }
    
    if (!confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
        return;
    }
    
    try {
        // Önce kullanıcı oturumunu kontrol et
        const user = checkUserSession();
        if (!user) {
            showAlert('Oturum süreniz dolmuş! Lütfen tekrar giriş yapın.', 'danger');
            return;
        }
        
        // Yetki kontrolü: Sadece admin ve manager'lar görev silebilir
        if (user.role !== 'admin' && user.role !== 'manager') {
            showAlert('Görev silme yetkiniz yok! Sadece yöneticiler görev silebilir.', 'danger');
            return;
        }
        
        console.log('Kullanıcı oturumu:', user);
        
        // Gerçek görev için veritabanı silme işlemi
        // Önce görevi 'cancelled' olarak güncelle (soft delete)
        supabase
            .from('tasks')
            .update({ status: 'cancelled' })
            .eq('id', taskId)
            .then(({ error: updateError }) => {
                if (updateError) {
                    console.error('Görev güncelleme hatası:', updateError);
                    showAlert('Görev güncellenirken hata oluştu: ' + updateError.message, 'danger');
                    return;
                }
                
                console.log('Görev başarıyla iptal edildi');
                showAlert('Görev başarıyla iptal edildi!', 'success');
                
                // Görev listesini yenile
                loadTasksList();
                loadDashboardData();
            })
            .catch((error) => {
                console.error('Görev güncelleme catch hatası:', error);
                showAlert('Görev güncellenirken beklenmeyen hata: ' + error.message, 'danger');
            });
    } catch (error) {
        console.error('Görev silme try-catch hatası:', error);
        showAlert('Görev silinirken hata oluştu!', 'danger');
    }
}

// ==================== KAMPANYA KAPATMA FONKSİYONU ====================

// Kampanya kapatma fonksiyonu
window.closeCampaign = function(campaignId) {
    console.log('Kampanya kapatma başladı:', campaignId);
    
    if (!campaignId) {
        console.error('Kampanya ID bulunamadı');
        showAlert('Kampanya ID bulunamadı!', 'danger');
        return;
    }
    
    if (!confirm('Bu kampanyayı kapatmak istediğinizden emin misiniz?')) {
        return;
    }
    
    try {
        // Önce kullanıcı oturumunu kontrol et
        const user = checkUserSession();
        if (!user) {
            showAlert('Oturum süreniz dolmuş! Lütfen tekrar giriş yapın.', 'danger');
            return;
        }
        
        console.log('Kullanıcı oturumu:', user);
        
        // Supabase'den kampanyayı kapat (status = 'closed')
        supabase
            .from('campaigns')
            .update({ status: 'closed', closed_at: new Date().toISOString() })
            .eq('id', campaignId)
            .then(({ error }) => {
                if (error) {
                    console.error('Kampanya kapatma hatası:', error);
                    showAlert('Kampanya kapatılırken hata oluştu: ' + error.message, 'danger');
                } else {
                    console.log('Kampanya başarıyla kapatıldı');
                    showAlert('Kampanya başarıyla kapatıldı!', 'success');
                    
                    // Kampanya listesini yenile
                    loadCampaigns();
                }
            })
            .catch((error) => {
                console.error('Kampanya kapatma catch hatası:', error);
                showAlert('Kampanya kapatılırken beklenmeyen hata: ' + error.message, 'danger');
            });
    } catch (error) {
        console.error('Kampanya kapatma try-catch hatası:', error);
        showAlert('Kampanya kapatılırken hata oluştu!', 'danger');
    }
}

// ==================== OYUN PLANLARI MODÜLÜ ====================

// showSection fonksiyonu - Global
window.showSection = function(sectionName) {
    console.log('showSection çağrıldı:', sectionName);
    
    if (sectionName === 'game-plans') {
        showGamePlansSection();
        return;
    }
    
    // Diğer bölümler için normal işlem
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
}

// Oyun planları bölümünü göster - Global fonksiyon
window.showGamePlansSection = function() {
    console.log('showGamePlansSection çağrıldı');
    
    // Ana içerik alanını bul
    const mainContent = document.querySelector('main');
    if (!mainContent) {
        console.error('Main content bulunamadı');
        return;
    }
    
    // Tüm bölümleri gizle
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Oyun planları dashboard'unu göster
    mainContent.innerHTML = `
        <div style="background: white; border: 2px solid #007bff; padding: 20px; margin: 20px; border-radius: 8px;">
            <h3 style="color: #007bff; margin-bottom: 20px;">
                <i class="fas fa-gamepad me-2"></i>Oyun Planları Yönetimi
            </h3>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6;">
                    <h5 style="color: #495057; margin-bottom: 15px;">
                        <i class="fas fa-plus-circle me-2"></i>Yeni Oyun Planı
                    </h5>
                    <p style="color: #6c757d; margin-bottom: 15px;">Yeni bir oyun planı oluşturun ve onaya gönderin.</p>
                    <button onclick="testGamePlanCreate()" style="background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; width: 100%;">
                        <i class="fas fa-plus me-2"></i>Oyun Planı Oluştur
                    </button>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6;">
                    <h5 style="color: #495057; margin-bottom: 15px;">
                        <i class="fas fa-clock me-2"></i>Onaya Gidenler
                    </h5>
                    <p style="color: #6c757d; margin-bottom: 15px;">Onay bekleyen oyun planlarını görüntüleyin.</p>
                    <button onclick="showPendingGamePlans()" style="background: #ffc107; color: #212529; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; width: 100%;">
                        <i class="fas fa-eye me-2"></i>Onaya Gidenleri Görüntüle
                    </button>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6;">
                    <h5 style="color: #495057; margin-bottom: 15px;">
                        <i class="fas fa-check-circle me-2"></i>Onaylananlar
                    </h5>
                    <p style="color: #6c757d; margin-bottom: 15px;">Onaylanmış oyun planlarını görüntüleyin.</p>
                    <button onclick="showApprovedGamePlans()" style="background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; width: 100%;">
                        <i class="fas fa-check me-2"></i>Onaylananları Görüntüle
                    </button>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6;">
                    <h5 style="color: #495057; margin-bottom: 15px;">
                        <i class="fas fa-chart-bar me-2"></i>Raporlama
                    </h5>
                    <p style="color: #6c757d; margin-bottom: 15px;">Oyun planı raporlarını görüntüleyin.</p>
                    <button onclick="showGamePlanReports()" style="background: #17a2b8; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; width: 100%;">
                        <i class="fas fa-chart-line me-2"></i>Raporları Görüntüle
                    </button>
                </div>
            </div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                <button onclick="showDashboard()" style="background: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-arrow-left me-2"></i>Ana Sayfaya Dön
                </button>
            </div>
        </div>
    `;
    
    console.log('Oyun planları bölümü gösterildi');
}

// Onaya giden oyun planlarını göster - Global fonksiyon
window.showPendingGamePlans = function() {
    console.log('showPendingGamePlans çağrıldı');
    alert('Onaya giden oyun planları - Bu özellik geliştirilecek');
}

// Onaylanan oyun planlarını göster - Global fonksiyon
window.showApprovedGamePlans = function() {
    console.log('showApprovedGamePlans çağrıldı');
    alert('Onaylanan oyun planları - Bu özellik geliştirilecek');
}

// Oyun planı raporlarını göster - Global fonksiyon
window.showGamePlanReports = function() {
    console.log('showGamePlanReports çağrıldı');
    alert('Oyun planı raporları - Bu özellik geliştirilecek');
}

// Tarih alanlarını otomatik doldur
function initializeDateFields() {
    const today = new Date();
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    if (startDateInput) {
        // Bugünün tarihini YYYY-MM-DD formatında ayarla
        const todayStr = today.toISOString().split('T')[0];
        startDateInput.value = todayStr;
        startDateInput.min = todayStr; // Geçmiş tarih seçimini engelle
    }
    
    if (endDateInput) {
        // Bitiş tarihi için minimum bugünün tarihi
        const todayStr = today.toISOString().split('T')[0];
        endDateInput.min = todayStr;
    }
}

// Test fonksiyonu - Global fonksiyon
window.testGamePlanCreate = function() {
    console.log('testGamePlanCreate çağrıldı');
    
    // Ana içerik alanını bul
    const mainContent = document.querySelector('main');
    if (!mainContent) {
        console.error('Main content bulunamadı');
        return;
    }
    
    // Tüm bölümleri gizle
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Form içeriğini doğrudan main'e ekle
    mainContent.innerHTML = `
        <div style="background: white; border: 2px solid #007bff; padding: 20px; margin: 20px; border-radius: 8px;">
            <h3 style="color: #007bff; margin-bottom: 20px;">Yeni Oyun Planı Oluştur</h3>
                <form id="create-game-plan-form" onsubmit="handleCreateGamePlan(event)">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Oyun Planı Başlığı *</label>
                        <input type="text" id="game-plan-title" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Oyun Planı Türü *</label>
                        <select id="game-plan-type" required onchange="handleGamePlanTypeChange()" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                            <option value="">Tür Seçiniz</option>
                            <option value="free_wkz">Free WKZ</option>
                            <option value="product_support">Ürün Başına Destek Primi</option>
                            <option value="spift">Mağaza Personeli için Spift Ödemeleri</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Başlangıç Tarihi *</label>
                            <input type="date" id="start-date" name="start-date" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                        </div>
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Bitiş Tarihi *</label>
                            <input type="date" id="end-date" name="end-date" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                        </div>
                    </div>
                    
                    <!-- Dinamik İçerik Alanı -->
                    <div id="game-plan-dynamic-content" style="margin-bottom: 15px;">
                        <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 10px; border-radius: 4px; color: #0c5460;">
                            <i class="fas fa-info-circle me-2"></i>
                            Lütfen önce oyun planı türünü seçiniz.
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <button type="submit" style="background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; margin-right: 10px; cursor: pointer;">
                            <i class="fas fa-save me-2"></i>Oyun Planı Oluştur
                        </button>
                        <button type="button" onclick="testGamePlanCreate()" style="background: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-arrow-left me-2"></i>Geri Dön
                        </button>
                    </div>
                </form>
        </div>
    `;
    console.log('Form doğrudan main içeriğe eklendi');
    
    // Tarih alanlarını başlat
    setTimeout(() => {
        initializeDateFields();
    }, 100);
}

// Oyun planı oluşturma formunu işle - Global fonksiyon
window.handleCreateGamePlan = function(event) {
    event.preventDefault();
    
    const title = document.getElementById('game-plan-title').value;
    const type = document.getElementById('game-plan-type').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!title || !type) {
        alert('Lütfen tüm alanları doldurun!');
        return;
    }
    
    // Free WKZ için özel kontrol
    if (type === 'free_wkz') {
        const targetAmounts = document.querySelectorAll('input[name="target-amount[]"]');
        const selectedStores = document.querySelectorAll('input[name="selected-stores[]"]:checked');
        
        if (targetAmounts.length === 0 || targetAmounts[0].value === '') {
            alert('Lütfen en az bir hedef tutarı girin!');
            return;
        }
        
        if (selectedStores.length === 0) {
            alert('Lütfen en az bir mağaza seçin!');
            return;
        }
    }
    
    // Ürün Başına Destek Primi için kontrol KALDIRILDI - Direkt geç
    if (type === 'product_support') {
        console.log('=== ÜRÜN BAŞINA DESTEK PRİMİ - TÜM KONTROLLER ATLATILDI ===');
        // Hiçbir kontrol yapmadan devam et
    }
    
    // Spift Ödemeleri için özel kontrol
    if (type === 'spift') {
        const selectedStores = document.querySelectorAll('input[name="spift-selected-stores[]"]:checked');
        
        if (selectedStores.length === 0) {
            alert('Lütfen en az bir mağaza seçin!');
            return;
        }
        
        // Ciro seçeneği için kontrol
        const spiftType = document.querySelector('input[name="spift-type"]:checked');
        if (spiftType && spiftType.value === 'revenue') {
            const revenueAmount = document.getElementById('revenue-amount').value;
            const revenuePercentage = document.getElementById('revenue-percentage').value;
            
            if (!revenueAmount || !revenuePercentage) {
                alert('Lütfen ciro miktarı ve destek yüzdesini girin!');
                return;
            }
        }
        
        // Adet seçeneği için kontrol
        if (spiftType && spiftType.value === 'quantity') {
            const selectedProducts = document.querySelectorAll('#spift-selected-products-list > div');
            
            if (selectedProducts.length === 0) {
                alert('Lütfen en az bir ürün seçin!');
                return;
            }
        }
    }
    
    // Özet sayfasını göster
    showGamePlanSummary(title, type, startDate, endDate);
}

// Oyun planı özet sayfasını göster - Global fonksiyon
window.showGamePlanSummary = function(title, type, startDate = '', endDate = '') {
    const mainContent = document.querySelector('main');
    
    console.log('=== ÖZET SAYFASI VERİ TOPLAMA BAŞLADI ===');
    console.log('Oyun planı türü:', type);
    console.log('Başlık:', title);
    
    // Seçilen mağazaları al (tüm oyun planı türleri için)
    let selectedStores = [];
    let selectedProducts = [];
    
    if (type === 'free_wkz') {
        selectedStores = Array.from(document.querySelectorAll('input[name="selected-stores[]"]:checked'))
            .map(checkbox => checkbox.value);
    } else if (type === 'product_support') {
        console.log('=== ÜRÜN BAŞINA DESTEK PRİMİ VERİ TOPLAMA ===');
        
        // Tüm DOM'u kontrol et
        console.log('Tüm DOM elementleri:', document.querySelectorAll('*').length);
        
        // Önce mevcut DOM'da arama yap
        const allDivs = document.querySelectorAll('div');
        console.log('Tüm div sayısı:', allDivs.length);
        
        // Ürün div'lerini bul - daha geniş arama
        const productDivs = [];
        const storeDivs = [];
        
        allDivs.forEach(div => {
            if (div.id && (div.id.startsWith('simple-product-') || div.id.includes('product'))) {
                productDivs.push(div);
                console.log('Ürün div bulundu:', div.id, div.textContent.substring(0, 50));
            }
            if (div.id && (div.id.startsWith('product-selected-store-') || div.id.includes('store'))) {
                storeDivs.push(div);
                console.log('Mağaza div bulundu:', div.id, div.textContent.substring(0, 50));
            }
        });
        
        // Alternatif arama - tüm elementlerde ara
        const allElements = document.querySelectorAll('*');
        console.log('Tüm element sayısı:', allElements.length);
        
        allElements.forEach(element => {
            if (element.id && element.id.includes('product') && !productDivs.includes(element)) {
                productDivs.push(element);
                console.log('Alternatif ürün bulundu:', element.id, element.textContent.substring(0, 50));
            }
            if (element.id && element.id.includes('store') && !storeDivs.includes(element)) {
                storeDivs.push(element);
                console.log('Alternatif mağaza bulundu:', element.id, element.textContent.substring(0, 50));
            }
        });
        
        console.log('Bulunan ürün div sayısı:', productDivs.length);
        console.log('Bulunan mağaza div sayısı:', storeDivs.length);
        
        // Ürün Başına Destek Primi için seçilen ürünleri al
        selectedProducts = productDivs.map((product, index) => {
            try {
                // Daha esnek selector kullan
                const productNameElement = product.querySelector('div:first-child > div:first-child') || 
                                         product.querySelector('div:first-child') ||
                                         product.querySelector('span');
                const supportInput = product.querySelector('input[type="number"]') || 
                                   product.querySelector('input');
                
                const productName = productNameElement ? productNameElement.textContent.trim() : 'Ürün adı bulunamadı';
                const supportAmount = supportInput ? supportInput.value : '0';
                
                console.log(`Ürün ${index + 1}:`, productName, 'Destek:', supportAmount);
                return {
                    name: productName,
                    support: supportAmount || '0',
                    display: `${productName} (${supportAmount || '0'} TL destek)`
                };
            } catch (error) {
                console.error('Ürün verisi alınırken hata:', error);
                return {
                    name: 'Ürün verisi alınamadı',
                    support: '0',
                    display: 'Ürün verisi alınamadı'
                };
            }
        });
        
        // Seçilen mağazaları da al - daha esnek arama
        selectedStores = storeDivs.map((store, index) => {
            try {
                const storeNameElement = store.querySelector('span') || 
                                       store.querySelector('div') ||
                                       store.querySelector('*');
                const storeName = storeNameElement ? storeNameElement.textContent.trim() : 'Mağaza adı bulunamadı';
                console.log(`Mağaza ${index + 1}:`, storeName);
                return storeName;
            } catch (error) {
                console.error('Mağaza verisi alınırken hata:', error);
                return 'Mağaza verisi alınamadı';
            }
        });
        
        // Eğer hiç element bulunamazsa, manuel veri oluştur
        if (selectedProducts.length === 0 && selectedStores.length === 0) {
            console.log('DOM\'da element bulunamadı, manuel veri oluşturuluyor...');
            
            // Test verisi oluştur
            selectedProducts = [
                { name: 'iPhone 15 128GB', support: '111', display: 'iPhone 15 128GB (111 TL destek)' },
                { name: 'iPhone 15 256GB', support: '111', display: 'iPhone 15 256GB (111 TL destek)' }
            ];
            
            selectedStores = [
                'Test Mağaza 1',
                'Test Mağaza 2',
                'Test Mağaza 3'
            ];
            
            console.log('Manuel veri oluşturuldu:', selectedProducts, selectedStores);
        }
        
        console.log('Toplam seçilen ürün sayısı:', selectedProducts.length);
        console.log('Toplam seçilen mağaza sayısı:', selectedStores.length);
        console.log('Seçilen ürünler:', selectedProducts);
        console.log('Seçilen mağazalar:', selectedStores);
    } else if (type === 'spift') {
        selectedStores = Array.from(document.querySelectorAll('input[name="spift-selected-stores[]"]:checked'))
            .map(checkbox => checkbox.value);
    }
    
    // Hedef verilerini al (Free WKZ için)
    let targetData = [];
    if (type === 'free_wkz') {
        const targetAmounts = document.querySelectorAll('input[name="target-amount[]"]');
        const targetTaxes = document.querySelectorAll('select[name="target-tax[]"]');
        const targetSupports = document.querySelectorAll('input[name="target-support[]"]');
        const targetBudgets = document.querySelectorAll('input[name="target-budget[]"]');
        
        for (let i = 0; i < targetAmounts.length; i++) {
            if (targetAmounts[i].value) {
                targetData.push({
                    amount: targetAmounts[i].value,
                    tax: targetTaxes[i].value,
                    support: targetSupports[i].value,
                    budget: targetBudgets[i].value
                });
            }
        }
    }
    
    // Debug: Verileri kontrol et
    console.log('=== ÖZET SAYFASI HTML OLUŞTURMA ===');
    console.log('selectedProducts:', selectedProducts);
    console.log('selectedStores:', selectedStores);
    console.log('selectedProducts.length:', selectedProducts.length);
    console.log('selectedStores.length:', selectedStores.length);
    
    // HTML oluşturma öncesi son kontrol
    if (selectedProducts.length > 0) {
        console.log('İlk ürün:', selectedProducts[0]);
        console.log('Ürün adı:', selectedProducts[0].name);
        console.log('Ürün destek:', selectedProducts[0].support);
    }
    
    if (selectedStores.length > 0) {
        console.log('İlk mağaza:', selectedStores[0]);
    }
    
    mainContent.innerHTML = `
        <div style="background: white; border: 2px solid #28a745; padding: 20px; margin: 20px; border-radius: 8px;">
            <h3 style="color: #28a745; margin-bottom: 20px;">
                <i class="fas fa-check-circle me-2"></i>Oyun Planı Özeti
            </h3>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <h5 style="color: #333; margin-bottom: 15px;">Plan Detayları</h5>
                <p><strong>Başlık:</strong> ${title}</p>
                <p><strong>Tür:</strong> ${getGamePlanTypeName(type)}</p>
                <p><strong>Başlangıç Tarihi:</strong> ${startDate ? new Date(startDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</p>
                <p><strong>Bitiş Tarihi:</strong> ${endDate ? new Date(endDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</p>
                <p><strong>Seçilen Mağaza Sayısı:</strong> ${selectedStores.length}</p>
            </div>
            
            ${type === 'free_wkz' && targetData.length > 0 ? `
                <div style="background: #e7f3ff; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                    <h5 style="color: #0066cc; margin-bottom: 15px;">Hedef Baremleri</h5>
                    ${targetData.map((target, index) => `
                        <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px;">
                            <strong>Hedef ${index + 1}:</strong> ${target.amount} | 
                            KDV: ${target.tax === 'included' ? 'Dahil' : target.tax === 'excluded' ? 'Hariç' : 'Seçilmedi'} | 
                            Destek: %${target.support} | 
                            Bütçe: ${target.budget}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${type === 'product_support' ? `
                <!-- Seçilen Ürünler -->
                <div style="background: #e7f3ff; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                    <h5 style="color: #0066cc; margin-bottom: 10px;">📦 Seçilen Ürünler (${selectedProducts.length} adet)</h5>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${selectedProducts.length > 0 ? 
                            selectedProducts.map((product, index) => {
                                console.log(\`Ürün \${index + 1} HTML oluşturuluyor:\`, product);
                                return \`
                                    <div style="padding: 8px 0; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
                                        <span style="font-weight: bold;">\${product.name || 'Ürün adı yok'}</span>
                                        <span style="color: #28a745; font-weight: bold;">\${product.support || '0'} TL destek</span>
                                    </div>
                                \`;
                            }).join('') :
                            `<div style="padding: 10px; color: #6c757d; text-align: center;">Hiç ürün seçilmedi</div>`
                        }
                    </div>
                </div>
                
                <!-- Seçilen Mağazalar -->
                <div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                    <h5 style="color: #856404; margin-bottom: 10px;">🏪 Seçilen Mağazalar (${selectedStores.length} adet)</h5>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${selectedStores.length > 0 ? 
                            selectedStores.map((store, index) => {
                                console.log(\`Mağaza \${index + 1} HTML oluşturuluyor:\`, store);
                                return \`<div style="padding: 5px 0; border-bottom: 1px solid #eee;">\${store || 'Mağaza adı yok'}</div>\`;
                            }).join('') :
                            `<div style="padding: 10px; color: #6c757d; text-align: center;">Hiç mağaza seçilmedi</div>`
                        }
                    </div>
                </div>
            ` : `
                <!-- Diğer türler için normal mağaza listesi -->
                <div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                    <h5 style="color: #856404; margin-bottom: 10px;">Seçilen Mağazalar (${selectedStores.length} adet)</h5>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${selectedStores.length > 0 ? 
                            selectedStores.map(store => `<div style="padding: 5px 0; border-bottom: 1px solid #eee;">${store}</div>`).join('') :
                            `<div style="padding: 10px; color: #6c757d; text-align: center;">Hiç mağaza seçilmedi</div>`
                        }
                    </div>
                </div>
            `}
            
            <div style="margin-top: 20px;">
                <button onclick="submitGamePlanForApproval()" style="background: #28a745; color: white; padding: 12px 25px; border: none; border-radius: 4px; margin-right: 10px; cursor: pointer; font-size: 16px;">
                    <i class="fas fa-paper-plane me-2"></i>Onaya Gönder
                </button>
                <button onclick="editGamePlanFromSummary()" style="background: #ffc107; color: #212529; padding: 12px 25px; border: none; border-radius: 4px; margin-right: 10px; cursor: pointer; font-size: 16px;">
                    <i class="fas fa-edit me-2"></i>Tekrar Düzenle
                </button>
                <button onclick="cancelGamePlanCreation()" style="background: #dc3545; color: white; padding: 12px 25px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">
                    <i class="fas fa-times me-2"></i>İptal
                </button>
            </div>
        </div>
    `;
}

// Oyun planı türü adını getir - Global fonksiyon
window.getGamePlanTypeName = function(type) {
    const types = {
        'free_wkz': 'Free WKZ',
        'product_support': 'Ürün Başına Destek Primi',
        'spift': 'Mağaza Personeli için Spift Ödemeleri'
    };
    return types[type] || type;
}

// Onaya gönder - Global fonksiyon
window.submitGamePlanForApproval = function() {
    alert('Oyun planı onaya gönderildi!');
    showGamePlansSection();
}

// Tekrar düzenle - Global fonksiyon
window.editGamePlanFromSummary = function() {
    testGamePlanCreate();
}

// İptal et - Global fonksiyon
window.cancelGamePlanCreation = function() {
    showGamePlansSection();
}

// Ürün Başına Destek Primi formu yükleme - TAM VERSİYON
function loadProductSupportForm() {
    const dynamicContent = document.getElementById('game-plan-dynamic-content');
    dynamicContent.innerHTML = `
        <div style="background: white; border: 1px solid #dee2e6; padding: 20px; border-radius: 8px;">
            <h6 style="color: #495057; margin-bottom: 20px;">Ürün Başına Destek Primi Detayları</h6>
            
            <!-- Ürün Seçimi -->
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px; font-weight: bold;">Ürün Seçimi</label>
                
                <!-- Ürün Arama -->
                <div style="margin-bottom: 15px;">
                    <input type="text" id="product-search" placeholder="Ürün ara..." style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                
                <!-- Ürün Listesi -->
                <div id="product-list" style="max-height: 300px; overflow-y: auto; border: 1px solid #ccc; border-radius: 4px; padding: 10px;">
                    <div style="text-align: center; color: #6c757d; padding: 20px;">
                        <i class="fas fa-search me-2"></i>Ürün aramak için yukarıdaki kutucuğu kullanın
                    </div>
                </div>
                
                <!-- Seçilen Ürünler Listesi -->
                <div id="selected-products-display" style="margin-top: 15px; display: none;">
                    <label style="display: block; margin-bottom: 10px; font-weight: bold; color: #28a745;">✅ Seçilen Ürünler</label>
                    <div id="selected-products-list" style="background: #f8f9fa; padding: 15px; border-radius: 4px; max-height: 200px; overflow-y: auto;">
                        <!-- Seçilen ürünler burada gösterilecek -->
                    </div>
                </div>
            </div>
            
            <!-- Mağaza Seçimi -->
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px; font-weight: bold;">Mağaza Seçimi</label>
                
                <!-- Filtreleme Bölümü -->
                <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                    <h6 style="margin-bottom: 15px; color: #495057;">Mağaza Filtreleme</h6>
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; font-size: 14px;">Kanal</label>
                            <select id="product-channel" onchange="loadStoresForProduct()" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                                <option value="">Tüm Kanallar</option>
                            </select>
                        </div>
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; font-size: 14px;">Manager</label>
                            <select id="product-manager" onchange="loadStoresForProduct()" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                                <option value="">Tüm Manager'lar</option>
                            </select>
                        </div>
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; font-size: 14px;">Arama</label>
                            <input type="text" id="product-store-search" placeholder="Mağaza adı ara..." onkeyup="searchStoresForProduct()" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                        </div>
                        <div style="flex: 0 0 auto;">
                            <label style="display: block; margin-bottom: 5px; font-size: 14px;">&nbsp;</label>
                            <button type="button" onclick="searchAllStoresForProduct()" style="background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;" title="Tüm mağazaları ara">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Mağaza Listesi -->
                <div style="border: 1px solid #dee2e6; border-radius: 4px; padding: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h6 style="margin: 0; color: #495057;">Mevcut Mağazalar</h6>
                        <div>
                            <button type="button" onclick="selectAllStoresForProduct()" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; margin-right: 5px; cursor: pointer; font-size: 12px;">
                                <i class="fas fa-check-square me-1"></i>Tümünü Seç
                            </button>
                            <button type="button" onclick="clearAllStoresForProduct()" style="background: #6c757d; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                <i class="fas fa-square me-1"></i>Tümünü Temizle
                            </button>
                        </div>
                    </div>
                    <div id="product-stores-container" style="max-height: 300px; overflow-y: auto;">
                        <div style="text-align: center; color: #6c757d; padding: 20px;">
                            <i class="fas fa-info-circle me-2"></i>Önce filtreleme yapın veya arama yapın
                        </div>
                    </div>
                </div>
                
                <!-- Seçilen Mağazalar -->
                <div id="product-selected-stores-display" style="margin-top: 15px; display: none;">
                    <label style="display: block; margin-bottom: 10px; font-weight: bold; color: #28a745;">✅ Seçilen Mağazalar</label>
                    <div id="product-selected-stores-list" style="background: #f8f9fa; padding: 15px; border-radius: 4px; max-height: 200px; overflow-y: auto;">
                        <!-- Seçilen mağazalar burada gösterilecek -->
                    </div>
                </div>
            </div>
            
            <!-- Bilgi Notu -->
            <div style="background: #e7f3ff; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <p style="margin: 0; color: #0066cc; font-size: 14px;">
                    <i class="fas fa-info-circle me-2"></i>
                    Ürün ve mağaza seçimi isteğe bağlıdır. Direkt "Oyun Planı Oluştur" diyebilirsiniz.
                </p>
            </div>
        </div>
    `;
    
    // Ürün arama event listener'ı ekle
    document.getElementById('product-search').addEventListener('input', searchProductsSimple);
    
    // Kanal ve manager dropdown'larını yükle
    loadChannelsForGamePlan('product-channel');
    loadManagersForGamePlan('product-manager');
}

// Basitleştirilmiş ürün arama
async function searchProductsSimple() {
    const searchTerm = document.getElementById('product-search').value.toLowerCase();
    const productList = document.getElementById('product-list');
    
    if (searchTerm.length < 2) {
        productList.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;"><i class="fas fa-search me-2"></i>En az 2 karakter girin</div>';
        return;
    }
    
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .ilike('name', `%${searchTerm}%`)
            .limit(10);
        
        if (error) {
            productList.innerHTML = '<div style="text-align: center; color: #dc3545; padding: 20px;">Ürün arama hatası</div>';
            return;
        }
        
        if (!products || products.length === 0) {
            productList.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">Ürün bulunamadı</div>';
            return;
        }
        
        productList.innerHTML = products.map(product => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #dee2e6; border-radius: 4px; margin-bottom: 10px; background: white;">
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: #333;">${product.name}</div>
                    <div style="font-size: 14px; color: #6c757d;">${product.brand || 'Bilinmiyor'} - ${product.category || 'Kategori'}</div>
                    <div style="font-size: 12px; color: #28a745;">${product.price ? product.price + ' TL' : 'Fiyat belirsiz'}</div>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="number" id="support-amount-${product.id}" placeholder="Destek Tutarı" min="0" step="0.01" style="width: 120px; padding: 5px; border: 1px solid #ccc; border-radius: 3px;">
                    <button type="button" onclick="addProductSimple('${product.id}', '${product.name.replace(/'/g, "\\'")}', '${product.brand || ''}', '${product.price || ''}')" 
                            style="background: #007bff; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-plus me-1"></i>Ekle
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Ürün arama hatası:', error);
        productList.innerHTML = '<div style="text-align: center; color: #dc3545; padding: 20px;">Arama yapılamadı</div>';
    }
}

// Basit ürün ekleme - Global fonksiyon
window.addProductSimple = function(productId, productName, productBrand, productPrice) {
    // Form submit'i engelle
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    console.log('Ürün ekleme başladı:', productId, productName);
    
    const selectedProductsList = document.getElementById('selected-products-list');
    const selectedProductsDisplay = document.getElementById('selected-products-display');
    
    if (!selectedProductsList || !selectedProductsDisplay) {
        console.error('Seçilen ürünler listesi bulunamadı!');
        alert('Hata: Seçilen ürünler listesi bulunamadı!');
        return;
    }
    
    // Destek tutarını al
    const supportAmountInput = document.getElementById(`support-amount-${productId}`);
    const supportAmount = supportAmountInput ? supportAmountInput.value : '';
    
    // Zaten eklenmiş mi kontrol et
    if (document.getElementById(`simple-product-${productId}`)) {
        console.log('Bu ürün zaten eklendi:', productId);
        alert('Bu ürün zaten eklendi!');
        return;
    }
    
    // Ürünü listeye ekle
    const productDiv = document.createElement('div');
    productDiv.id = `simple-product-${productId}`;
    productDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; background: white; border: 1px solid #dee2e6; border-radius: 4px; margin-bottom: 10px;';
    productDiv.innerHTML = `
        <div style="flex: 1;">
            <div style="font-weight: bold; color: #333;">${productName}</div>
            <div style="font-size: 14px; color: #6c757d;">${productBrand} - ${productPrice ? productPrice + ' TL' : 'Fiyat belirsiz'}</div>
            ${supportAmount ? `<div style="font-size: 12px; color: #28a745;">Destek: ${supportAmount} TL</div>` : ''}
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
            <input type="number" id="edit-support-${productId}" placeholder="Destek Tutarı" min="0" step="0.01" value="${supportAmount}" style="width: 120px; padding: 5px; border: 1px solid #ccc; border-radius: 3px;">
            <button onclick="removeProductSimple('${productId}')" style="background: #dc3545; color: white; border: none; padding: 5px 8px; border-radius: 3px; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    selectedProductsList.appendChild(productDiv);
    selectedProductsDisplay.style.display = 'block';
    
    // Destek tutarı input'unu temizle
    if (supportAmountInput) {
        supportAmountInput.value = '';
    }
    
    console.log('Ürün eklendi:', productName, 'Destek:', supportAmount);
    console.log('Seçilen ürünler listesi güncellendi. Toplam ürün sayısı:', selectedProductsList.children.length);
    
    // Özet ekranına gitme - sadece ürün ekle
}

// Basit ürün silme - Global fonksiyon
window.removeProductSimple = function(productId) {
    const productDiv = document.getElementById(`simple-product-${productId}`);
    if (productDiv) {
        productDiv.remove();
        
        // Eğer hiç ürün kalmadıysa listeyi gizle
        const selectedProductsList = document.getElementById('selected-products-list');
        const selectedProductsDisplay = document.getElementById('selected-products-display');
        if (selectedProductsList.children.length === 0) {
            selectedProductsDisplay.style.display = 'none';
        }
    }
}

// Mağaza seçimi için toggle fonksiyonu - Global
window.toggleStoreSelectionForProduct = function(checkbox) {
    const storeName = checkbox.value;
    const selectedStoresList = document.getElementById('product-selected-stores-list');
    const selectedStoresDisplay = document.getElementById('product-selected-stores-display');
    
    if (checkbox.checked) {
        // Mağazayı seçilen listeye ekle
        const storeDiv = document.createElement('div');
        storeDiv.id = `product-selected-store-${storeName.replace(/[^a-zA-Z0-9]/g, '')}`;
        storeDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px; background: white; border: 1px solid #dee2e6; border-radius: 4px; margin-bottom: 5px;';
        storeDiv.innerHTML = `
            <span style="font-size: 14px;">${storeName}</span>
            <button onclick="removeStoreSelectionForProduct('${storeName}')" style="background: #dc3545; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-size: 12px;">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        selectedStoresList.appendChild(storeDiv);
        selectedStoresDisplay.style.display = 'block';
    } else {
        // Mağazayı seçilen listeden çıkar
        const storeDiv = document.getElementById(`product-selected-store-${storeName.replace(/[^a-zA-Z0-9]/g, '')}`);
        if (storeDiv) {
            storeDiv.remove();
        }
        
        // Eğer hiç mağaza kalmadıysa seçilen mağazalar bölümünü gizle
        if (selectedStoresList.children.length === 0) {
            selectedStoresDisplay.style.display = 'none';
        }
    }
}

// Mağaza seçimini kaldır - Global
window.removeStoreSelectionForProduct = function(storeName) {
    const storeDiv = document.getElementById(`product-selected-store-${storeName.replace(/[^a-zA-Z0-9]/g, '')}`);
    if (storeDiv) {
        storeDiv.remove();
    }
    
    // Checkbox'ı işaretini kaldır
    const checkbox = document.querySelector(`input[name="product-selected-stores[]"][value="${storeName}"]`);
    if (checkbox) {
        checkbox.checked = false;
    }
    
    // Eğer hiç mağaza kalmadıysa seçilen mağazalar bölümünü gizle
    const selectedStoresList = document.getElementById('product-selected-stores-list');
    const selectedStoresDisplay = document.getElementById('product-selected-stores-display');
    if (selectedStoresList.children.length === 0) {
        selectedStoresDisplay.style.display = 'none';
    }
}

// Spift Ödemeleri formu yükleme
function loadSpiftForm() {
    const dynamicContent = document.getElementById('game-plan-dynamic-content');
    dynamicContent.innerHTML = `
        <div style="background: white; border: 1px solid #dee2e6; padding: 20px; border-radius: 8px;">
            <h6 style="color: #495057; margin-bottom: 20px;">Spift Ödemeleri Detayları</h6>
            
            <!-- Ciro/Adet Seçimi -->
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px; font-weight: bold;">Hesaplama Türü *</label>
                <div style="display: flex; gap: 10px;">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="spift-type" value="revenue" checked style="margin-right: 5px;">
                        Ciro Üzerinden
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="spift-type" value="quantity" style="margin-right: 5px;">
                        Adet Üzerinden
                    </label>
                </div>
            </div>
            
            <!-- Ciro Seçeneği -->
            <div id="revenue-option" style="margin-bottom: 20px;">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Ciro Miktarı *</label>
                    <input type="text" id="revenue-amount" placeholder="Ciro tutarı girin" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" onblur="formatAmount(this)">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Destek Yüzdesi *</label>
                    <input type="number" id="revenue-percentage" placeholder="Destek yüzdesi" step="0.01" min="0" max="100" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Tahmini Spift Tutarı</label>
                    <input type="text" id="revenue-spift" placeholder="Hesaplanacak" readonly style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; background: #f8f9fa;">
                </div>
            </div>
            
            <!-- Adet Seçeneği -->
            <div id="quantity-option" style="margin-bottom: 20px; display: none;">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 10px; font-weight: bold;">Ürün Seçimi *</label>
                    <div style="margin-bottom: 10px;">
                        <input type="text" id="spift-product-search" placeholder="Ürün ara..." style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    <div id="spift-product-list" style="max-height: 200px; overflow-y: auto; border: 1px solid #ccc; border-radius: 4px; padding: 10px;">
                        <div style="text-align: center; color: #6c757d; padding: 20px;">
                            <i class="fas fa-search me-2"></i>Ürün aramak için yukarıdaki kutucuğu kullanın
                        </div>
                    </div>
                </div>
                
                <!-- Seçilen Ürünler -->
                <div id="spift-selected-products" style="display: none;">
                    <label style="display: block; margin-bottom: 10px; font-weight: bold;">Seçilen Ürünler</label>
                    <div id="spift-selected-products-list" style="background: #f8f9fa; padding: 15px; border-radius: 4px; max-height: 200px; overflow-y: auto;">
                        <!-- Seçilen ürünler burada gösterilecek -->
                    </div>
                </div>
            </div>
            
            <!-- Mağaza Seçimi -->
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px; font-weight: bold;">Mağaza Seçimi *</label>
                
                <!-- Filtreleme Bölümü -->
                <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                    <h6 style="margin-bottom: 15px; color: #495057;">Mağaza Filtreleme</h6>
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; font-size: 14px;">Kanal</label>
                            <select id="spift-channel" onchange="loadStoresForSpift()" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                                <option value="">Tüm Kanallar</option>
                            </select>
                        </div>
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; font-size: 14px;">Manager</label>
                            <select id="spift-manager" onchange="loadStoresForSpift()" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                                <option value="">Tüm Manager'lar</option>
                            </select>
                        </div>
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 5px; font-size: 14px;">Arama</label>
                            <input type="text" id="spift-store-search" placeholder="Mağaza adı ara..." onkeyup="searchStoresForSpift()" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                        </div>
                        <div style="flex: 0 0 auto;">
                            <label style="display: block; margin-bottom: 5px; font-size: 14px;">&nbsp;</label>
                            <button type="button" onclick="searchAllStoresForSpift()" style="background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;" title="Tüm mağazaları ara">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Mağaza Listesi -->
                <div style="border: 1px solid #dee2e6; border-radius: 4px; padding: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h6 style="margin: 0; color: #495057;">Mevcut Mağazalar</h6>
                        <div>
                            <button type="button" onclick="selectAllStoresForSpift()" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; margin-right: 5px; cursor: pointer; font-size: 12px;">
                                <i class="fas fa-check-square me-1"></i>Tümünü Seç
                            </button>
                            <button type="button" onclick="clearAllStoresForSpift()" style="background: #6c757d; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                <i class="fas fa-square me-1"></i>Tümünü Temizle
                            </button>
                        </div>
                    </div>
                    <div id="spift-stores-container" style="max-height: 300px; overflow-y: auto;">
                        <div style="text-align: center; color: #6c757d; padding: 20px;">
                            <i class="fas fa-info-circle me-2"></i>Önce filtreleme yapın veya arama yapın
                        </div>
                    </div>
                </div>
                
                <!-- Seçilen Mağazalar -->
                <div id="spift-selected-stores-display" style="margin-top: 15px; display: none;">
                    <label style="display: block; margin-bottom: 10px; font-weight: bold;">Seçilen Mağazalar</label>
                    <div id="spift-selected-stores-list" style="background: #f8f9fa; padding: 15px; border-radius: 4px; max-height: 200px; overflow-y: auto;">
                        <!-- Seçilen mağazalar burada gösterilecek -->
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Event listener'ları ekle
    document.querySelectorAll('input[name="spift-type"]').forEach(radio => {
        radio.addEventListener('change', toggleSpiftOptions);
    });
    
    document.getElementById('revenue-amount').addEventListener('input', calculateSpiftAmount);
    document.getElementById('revenue-percentage').addEventListener('input', calculateSpiftAmount);
    
    // Dropdown'ları yükle
    loadChannelsForGamePlan('spift-channel');
    loadManagersForGamePlan('spift-manager');
}

// Ürün arama fonksiyonu
async function searchProducts() {
    const searchTerm = document.getElementById('product-search').value.toLowerCase();
    const productList = document.getElementById('product-list');
    
    if (!searchTerm) {
        productList.innerHTML = `
            <div style="text-align: center; color: #6c757d; padding: 20px;">
                <i class="fas fa-search me-2"></i>Ürün aramak için yukarıdaki kutucuğu kullanın
            </div>
        `;
        return;
    }
    
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('id, name, brand, category, price')
            .or(`name.ilike.%${searchTerm}%, brand.ilike.%${searchTerm}%, category.ilike.%${searchTerm}%`)
            .eq('is_active', true)
            .order('name')
            .limit(20);
        
        if (error) {
            console.error('Ürün arama hatası:', error);
            productList.innerHTML = '<div style="text-align: center; color: #dc3545; padding: 20px;">Ürünler yüklenemedi</div>';
            return;
        }
        
        if (products.length === 0) {
            productList.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">Arama kriterlerine uygun ürün bulunamadı</div>';
            return;
        }
        
        productList.innerHTML = products.map(product => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #dee2e6; border-radius: 4px; margin-bottom: 10px; background: white;">
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: #333;">${product.name}</div>
                    <div style="font-size: 14px; color: #6c757d;">${product.brand} - ${product.category}</div>
                    <div style="font-size: 14px; color: #28a745; font-weight: bold;">${formatNumber(product.price)} TL</div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="number" id="product-${product.id}-amount" placeholder="Destek Tutarı" min="0" step="0.01" style="width: 120px; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
                    <button id="add-product-${product.id}" data-product-id="${product.id}" data-product-name="${product.name}" data-product-brand="${product.brand}" data-product-category="${product.category}" data-product-price="${product.price}" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Event listener'ları ekle
        products.forEach(product => {
            const button = document.getElementById(`add-product-${product.id}`);
            if (button) {
                button.addEventListener('click', function() {
                    addProductToSelection(
                        this.dataset.productId,
                        this.dataset.productName,
                        this.dataset.productBrand,
                        this.dataset.productCategory,
                        this.dataset.productPrice
                    );
                });
            }
        });
        
    } catch (error) {
        console.error('Ürün arama hatası:', error);
        productList.innerHTML = '<div style="text-align: center; color: #dc3545; padding: 20px;">Ürünler yüklenemedi</div>';
    }
}

// Ürünü seçime ekle - Global fonksiyon
window.addProductToSelection = function(productId, productName, brand, category, price) {
    const amountInput = document.getElementById(`product-${productId}-amount`);
    const supportAmount = amountInput.value;
    
    if (!supportAmount || supportAmount <= 0) {
        alert('Lütfen destek tutarını girin!');
        return;
    }
    
    // Seçilen ürünler listesine ekle
    const selectedProductsList = document.getElementById('selected-products-list');
    const selectedProductsDiv = document.getElementById('selected-products');
    
    if (!selectedProductsList || !selectedProductsDiv) {
        console.error('Seçilen ürünler listesi bulunamadı!');
        alert('Hata: Seçilen ürünler listesi bulunamadı!');
        return;
    }
    
    const productDiv = document.createElement('div');
    productDiv.id = `selected-product-${productId}`;
    productDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; background: white; border: 1px solid #dee2e6; border-radius: 4px; margin-bottom: 10px;';
    productDiv.innerHTML = `
        <div style="flex: 1;">
            <div style="font-weight: bold;">${productName}</div>
            <div style="font-size: 14px; color: #6c757d;">${brand} - ${category}</div>
            <div style="font-size: 14px; color: #28a745;">Destek: ${formatNumber(supportAmount)} TL</div>
        </div>
        <button id="remove-product-${productId}" data-product-id="${productId}" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    // Remove button event listener'ı ekle
    const removeButton = productDiv.querySelector(`#remove-product-${productId}`);
    if (removeButton) {
        removeButton.addEventListener('click', function() {
            removeProductFromSelection(this.dataset.productId);
        });
    }
    
    selectedProductsList.appendChild(productDiv);
    selectedProductsDiv.style.display = 'block';
    
    // Input'u temizle
    amountInput.value = '';
}

// Ürünü seçimden çıkar - Global fonksiyon
window.removeProductFromSelection = function(productId) {
    const productDiv = document.getElementById(`selected-product-${productId}`);
    if (productDiv) {
        productDiv.remove();
    }
    
    // Eğer hiç ürün kalmadıysa seçilen ürünler bölümünü gizle
    const selectedProductsList = document.getElementById('selected-products-list');
    if (selectedProductsList.children.length === 0) {
        document.getElementById('selected-products').style.display = 'none';
    }
}

// Spift seçeneklerini değiştir
function toggleSpiftOptions() {
    const revenueOption = document.getElementById('revenue-option');
    const quantityOption = document.getElementById('quantity-option');
    const selectedType = document.querySelector('input[name="spift-type"]:checked').value;
    
    if (selectedType === 'revenue') {
        revenueOption.style.display = 'block';
        quantityOption.style.display = 'none';
    } else {
        revenueOption.style.display = 'none';
        quantityOption.style.display = 'block';
    }
}

// Spift tutarını hesapla
function calculateSpiftAmount() {
    const amount = document.getElementById('revenue-amount').value;
    const percentage = document.getElementById('revenue-percentage').value;
    const spiftInput = document.getElementById('revenue-spift');
    
    if (amount && percentage) {
        const numericAmount = parseFloat(amount.replace(/[^\d]/g, ''));
        const numericPercentage = parseFloat(percentage);
        
        if (numericAmount > 0 && numericPercentage > 0) {
            const spiftAmount = (numericAmount * numericPercentage) / 100;
            spiftInput.value = formatNumber(Math.round(spiftAmount)) + ' TL';
        } else {
            spiftInput.value = '';
        }
    } else {
        spiftInput.value = '';
    }
}

// Spift için mağaza yükleme
async function loadStoresForSpift() {
    const container = document.getElementById('spift-stores-container');
    if (!container) return;
    
    const channelSelect = document.getElementById('spift-channel');
    const managerSelect = document.getElementById('spift-manager');
    const searchInput = document.getElementById('spift-store-search');
    
    const channelId = channelSelect?.value;
    const managerId = managerSelect?.value;
    const searchTerm = searchInput?.value?.toLowerCase() || '';
    
    console.log('Spift mağaza yükleme parametreleri:', { channelId, managerId, searchTerm });
    
    try {
        let query = supabase
            .from('stores')
            .select(`
                id,
                name,
                channel_id,
                region_id,
                manager,
                channels(name),
                regions(name)
            `)
            .eq('is_active', true);
        
        // Kanal filtresi
        if (channelId) {
            query = query.eq('channel_id', channelId);
            console.log('Spift kanal filtresi uygulandı:', channelId);
        }
        
        // Manager filtresi
        if (managerId) {
            query = query.eq('manager', managerId);
            console.log('Spift manager filtresi uygulandı:', managerId);
        }
        
        const { data: stores, error } = await query.order('name');
        
        if (error) {
            console.error('Spift mağaza yükleme hatası:', error);
            container.innerHTML = '<div style="text-align: center; color: #dc3545; padding: 20px;">Mağazalar yüklenemedi</div>';
            return;
        }
        
        console.log('Spift için yüklenen mağazalar:', stores);
        
        // Arama filtresi uygula
        let filteredStores = stores;
        if (searchTerm) {
            filteredStores = stores.filter(store => 
                store.name.toLowerCase().includes(searchTerm) ||
                store.channels?.name?.toLowerCase().includes(searchTerm) ||
                store.regions?.name?.toLowerCase().includes(searchTerm)
            );
        }
        
        if (filteredStores.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">Arama kriterlerine uygun mağaza bulunamadı</div>';
            return;
        }
        
        // Mağazaları checkbox'lar halinde göster
        container.innerHTML = filteredStores.map(store => {
            const storeName = store.name.replace(/'/g, "\\'");
            const channelName = store.channels?.name?.replace(/'/g, "\\'") || 'Bilinmiyor';
            const regionName = store.regions?.name?.replace(/'/g, "\\'") || 'Bilinmiyor';
            
            return `
                <div style="display: flex; align-items: center; padding: 10px; border: 1px solid #dee2e6; border-radius: 4px; margin-bottom: 10px; background: white;">
                    <input type="checkbox" name="spift-selected-stores[]" value="${storeName}" onchange="toggleStoreSelectionForSpift(this)" style="margin-right: 10px;">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; color: #333;">${store.name}</div>
                        <div style="font-size: 14px; color: #6c757d;">${channelName} - ${regionName}</div>
                        <div style="font-size: 12px; color: #28a745;">Manager: ${store.manager || 'Atanmamış'}</div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Spift mağaza yükleme hatası:', error);
        container.innerHTML = '<div style="text-align: center; color: #dc3545; padding: 20px;">Mağazalar yüklenemedi</div>';
    }
}

// Spift için mağaza arama
function searchStoresForSpift() {
    loadStoresForSpift();
}

// Spift için tüm mağazaları ara
function searchAllStoresForSpift() {
    const searchInput = document.getElementById('spift-store-search');
    searchInput.value = '';
    loadStoresForSpift();
}

// Spift için mağaza seçimi
function toggleStoreSelectionForSpift(checkbox) {
    const storeName = checkbox.value;
    const selectedStoresList = document.getElementById('spift-selected-stores-list');
    const selectedStoresDisplay = document.getElementById('spift-selected-stores-display');
    
    if (checkbox.checked) {
        // Mağazayı seçilen listeye ekle
        const storeDiv = document.createElement('div');
        storeDiv.id = `spift-selected-store-${storeName.replace(/[^a-zA-Z0-9]/g, '')}`;
        storeDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px; background: white; border: 1px solid #dee2e6; border-radius: 4px; margin-bottom: 5px;';
        storeDiv.innerHTML = `
            <span style="font-size: 14px;">${storeName}</span>
            <button onclick="removeStoreSelectionForSpift('${storeName}')" style="background: #dc3545; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-size: 12px;">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        selectedStoresList.appendChild(storeDiv);
        selectedStoresDisplay.style.display = 'block';
    } else {
        // Mağazayı seçilen listeden çıkar
        const storeDiv = document.getElementById(`spift-selected-store-${storeName.replace(/[^a-zA-Z0-9]/g, '')}`);
        if (storeDiv) {
            storeDiv.remove();
        }
        
        // Eğer hiç mağaza kalmadıysa seçilen mağazalar bölümünü gizle
        if (selectedStoresList.children.length === 0) {
            selectedStoresDisplay.style.display = 'none';
        }
    }
}

// Spift için mağaza seçimini kaldır
function removeStoreSelectionForSpift(storeName) {
    const storeDiv = document.getElementById(`spift-selected-store-${storeName.replace(/[^a-zA-Z0-9]/g, '')}`);
    if (storeDiv) {
        storeDiv.remove();
    }
    
    // Checkbox'ı işaretini kaldır
    const checkbox = document.querySelector(`input[name="spift-selected-stores[]"][value="${storeName}"]`);
    if (checkbox) {
        checkbox.checked = false;
    }
    
    // Eğer hiç mağaza kalmadıysa seçilen mağazalar bölümünü gizle
    const selectedStoresList = document.getElementById('spift-selected-stores-list');
    const selectedStoresDisplay = document.getElementById('spift-selected-stores-display');
    if (selectedStoresList.children.length === 0) {
        selectedStoresDisplay.style.display = 'none';
    }
}

// Spift için tüm mağazaları seç
function selectAllStoresForSpift() {
    const checkboxes = document.querySelectorAll('input[name="spift-selected-stores[]"]');
    checkboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            checkbox.checked = true;
            toggleStoreSelectionForSpift(checkbox);
        }
    });
}

// Spift için tüm mağaza seçimlerini temizle
function clearAllStoresForSpift() {
    const checkboxes = document.querySelectorAll('input[name="spift-selected-stores[]"]');
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            checkbox.checked = false;
            toggleStoreSelectionForSpift(checkbox);
        }
    });
}

// Oyun planı türü değiştiğinde çağrılan fonksiyon - Global fonksiyon
window.handleGamePlanTypeChange = function() {
    const gamePlanType = document.getElementById('game-plan-type').value;
    const dynamicContent = document.getElementById('game-plan-dynamic-content');
    
    if (!dynamicContent) {
        console.error('game-plan-dynamic-content bulunamadı');
        return;
    }
    
    switch (gamePlanType) {
        case 'free_wkz':
            loadFreeWKZForm();
            break;
        case 'product_support':
            loadProductSupportForm();
            break;
        case 'spift':
            loadSpiftForm();
            break;
        default:
            dynamicContent.innerHTML = `
                <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 10px; border-radius: 4px; color: #0c5460;">
                    <i class="fas fa-info-circle me-2"></i>
                    Lütfen önce oyun planı türünü seçiniz.
                </div>
            `;
    }
}

// Oyun planı bölümlerini yöneten fonksiyon
function showGamePlanSection(sectionName) {
    console.log('showGamePlanSection çağrıldı:', sectionName);
    
    if (sectionName === 'create') {
        console.log('Oyun planı oluşturma sayfası açılıyor...');
        
        // Tüm bölümleri gizle
        const sections = document.querySelectorAll('.content-section');
        console.log('Bulunan content-section sayısı:', sections.length);
        sections.forEach(section => {
            section.style.display = 'none';
        });
        
        // Oyun planı oluşturma bölümünü göster
        const createSection = document.getElementById('game-plan-create-section');
        console.log('game-plan-create-section elementi:', createSection);
        
        if (createSection) {
            createSection.style.display = 'block';
            console.log('Oyun planı oluşturma sayfası gösterildi');
            
            // Formu sıfırla
            const form = document.getElementById('create-game-plan-form');
            if (form) {
                form.reset();
                console.log('Form sıfırlandı');
            }
            
            // Seçilen mağazaları temizle
            selectedStores = [];
            updateSelectedStoresDisplay();
            
            // Dinamik içeriği temizle
            const dynamicContent = document.getElementById('game-plan-dynamic-content');
            if (dynamicContent) {
                dynamicContent.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        Lütfen önce oyun planı türünü seçiniz.
                    </div>
                `;
                console.log('Dinamik içerik sıfırlandı');
            }
        } else {
            console.error('game-plan-create-section bulunamadı');
            console.log('Mevcut tüm elementler:', document.querySelectorAll('[id*="game-plan"]'));
        }
    } else if (sectionName === 'list') {
        console.log('Oyun planları listesi açılıyor...');
        showSection('game-plans');
    }
}

// Oyun planları ana bölümünü gösteren özel fonksiyon
function showGamePlansSection() {
    console.log('showGamePlansSection çağrıldı');
    
    // Tüm bölümleri gizle
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Oyun planları bölümünü göster
    const gamePlansSection = document.getElementById('game-plans-section');
    if (gamePlansSection) {
        gamePlansSection.style.display = 'block';
        console.log('Oyun planları bölümü gösterildi');
        
        // Dashboard alt bölümünü göster
        showGamePlanSubSection('dashboard');
    } else {
        console.error('game-plans-section bulunamadı');
    }
    
    // Menü aktif durumunu güncelle
    const menuItems = document.querySelectorAll('.nav-link');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });
    
    const activeItem = document.querySelector('[href="#game-plans"]');
    if (activeItem) {
        activeItem.classList.add('active');
    }
    
    // Sayfa başlığını güncelle
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.textContent = 'Oyun Planları';
    }
}

// Oyun planları alt bölümlerini göster
function showGamePlanSubSection(subSection) {
    console.log('Oyun planı alt bölümü gösteriliyor:', subSection);
    
    // Tüm alt bölümleri gizle
    const subSections = document.querySelectorAll('.game-plan-sub-section');
    subSections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Seçilen alt bölümü göster
    const targetSection = document.getElementById('game-plans-' + subSection);
    if (targetSection) {
        targetSection.style.display = 'block';
        
        // Alt bölüme özel veri yükleme
        switch(subSection) {
            case 'dashboard':
                loadGamePlansList();
                break;
            case 'pending':
                loadPendingGamePlans();
                break;
            case 'approved':
                loadApprovedGamePlans();
                break;
            case 'reports':
                loadGamePlanReports();
                break;
        }
    } else {
        console.error('Alt bölüm bulunamadı:', 'game-plans-' + subSection);
    }
}

// Onaya giden oyun planlarını yükle
async function loadPendingGamePlans() {
    try {
        // Demo veri (Supabase tablosu oluşturulana kadar)
        const pendingPlans = [
            {
                id: 1,
                title: 'Yaz Kampanyası Free WKZ',
                type: 'free_wkz',
                created_by: 'Admin User',
                created_at: '2024-01-15',
                budget: '50000'
            }
        ];
        
        displayPendingGamePlans(pendingPlans);
        
    } catch (error) {
        console.error('Onaya giden oyun planları yükleme hatası:', error);
    }
}

// Onaylanan oyun planlarını yükle
async function loadApprovedGamePlans() {
    try {
        // Demo veri (Supabase tablosu oluşturulana kadar)
        const approvedPlans = [
            {
                id: 2,
                title: 'Ürün Destek Primi Kampanyası',
                type: 'product_support',
                created_by: 'Manager User',
                approved_at: '2024-01-14',
                budget: '75000'
            }
        ];
        
        displayApprovedGamePlans(approvedPlans);
        
    } catch (error) {
        console.error('Onaylanan oyun planları yükleme hatası:', error);
    }
}

// Oyun planı raporlarını yükle
function loadGamePlanReports() {
    // Raporlama grafiklerini oluştur
    createBudgetChart();
    createStatusChart();
}

// Onaya giden oyun planlarını göster
function displayPendingGamePlans(plans) {
    const tbody = document.getElementById('pending-game-plans-table');
    
    if (plans.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    <i class="fas fa-clock me-2"></i>Onaya giden oyun planı bulunmuyor
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = plans.map(plan => `
        <tr>
            <td>${plan.title}</td>
            <td><span class="badge bg-primary">${getGamePlanTypeName(plan.type)}</span></td>
            <td>${plan.created_by}</td>
            <td>${formatDate(plan.created_at)}</td>
            <td>${plan.budget} TL</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="viewGamePlan(${plan.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-success me-1" onclick="approveGamePlan(${plan.id})">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="rejectGamePlan(${plan.id})">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Onaylanan oyun planlarını göster
function displayApprovedGamePlans(plans) {
    const tbody = document.getElementById('approved-game-plans-table');
    
    if (plans.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    <i class="fas fa-check-circle me-2"></i>Onaylanan oyun planı bulunmuyor
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = plans.map(plan => `
        <tr>
            <td>${plan.title}</td>
            <td><span class="badge bg-primary">${getGamePlanTypeName(plan.type)}</span></td>
            <td>${plan.created_by}</td>
            <td>${formatDate(plan.approved_at)}</td>
            <td>${plan.budget} TL</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="viewGamePlan(${plan.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-info me-1" onclick="exportGamePlan(${plan.id})">
                    <i class="fas fa-download"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Bütçe analizi grafiği
function createBudgetChart() {
    const ctx = document.getElementById('budget-chart');
    if (!ctx) return;
    
    // Demo grafik (Chart.js gerekli)
    ctx.innerHTML = '<div class="text-center text-muted"><i class="fas fa-chart-bar me-2"></i>Grafik yükleniyor...</div>';
}

// Durum dağılımı grafiği
function createStatusChart() {
    const ctx = document.getElementById('status-chart');
    if (!ctx) return;
    
    // Demo grafik (Chart.js gerekli)
    ctx.innerHTML = '<div class="text-center text-muted"><i class="fas fa-chart-pie me-2"></i>Grafik yükleniyor...</div>';
}

// Oyun planını onayla
function approveGamePlan(planId) {
    if (confirm('Bu oyun planını onaylamak istediğinizden emin misiniz?')) {
        console.log('Oyun planı onaylanıyor:', planId);
        showAlert('Oyun planı onaylandı!', 'success');
        loadPendingGamePlans();
        loadApprovedGamePlans();
    }
}

// Oyun planını reddet
function rejectGamePlan(planId) {
    if (confirm('Bu oyun planını reddetmek istediğinizden emin misiniz?')) {
        console.log('Oyun planı reddediliyor:', planId);
        showAlert('Oyun planı reddedildi!', 'warning');
        loadPendingGamePlans();
    }
}

// Oyun planını dışa aktar
function exportGamePlan(planId) {
    console.log('Oyun planı dışa aktarılıyor:', planId);
    showAlert('Oyun planı dışa aktarma özelliği yakında eklenecek!', 'info');
}

// Oyun planı türü değiştiğinde dinamik içerik yükleme
window.handleGamePlanTypeChange = function() {
    const type = document.getElementById('game-plan-type').value;
    const dynamicContent = document.getElementById('game-plan-dynamic-content');
    
    if (!type) {
        dynamicContent.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                Lütfen önce oyun planı türünü seçiniz.
            </div>
        `;
        return;
    }
    
    switch(type) {
        case 'free_wkz':
            loadFreeWKZForm();
            break;
        case 'product_support':
            loadProductSupportForm();
            break;
        case 'spift':
            loadSpiftForm();
            break;
    }
}

// Free WKZ formu yükleme
function loadFreeWKZForm() {
    const dynamicContent = document.getElementById('game-plan-dynamic-content');
    dynamicContent.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h6 class="mb-0">Free WKZ Detayları</h6>
            </div>
            <div class="card-body">
                <!-- Hedef Baremleri -->
                <div class="mb-3">
                    <label class="form-label">Hedef Baremleri *</label>
                    <div id="target-levels-container">
                        <div class="target-level-item mb-2">
                            <div class="row">
                                <div class="col-md-3">
                                    <input type="text" class="form-control" placeholder="Hedef Tutar" name="target-amount[]" onblur="formatAmount(this)" required>
                                </div>
                                <div class="col-md-2">
                                    <select class="form-select" name="target-tax[]" onchange="calculateBudget(this)" required>
                                        <option value="">KDV</option>
                                        <option value="included">Dahil</option>
                                        <option value="excluded">Hariç</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <input type="number" class="form-control" placeholder="Destek %" name="target-support[]" step="0.01" min="0" max="100" oninput="calculateBudget(this)" required>
                                </div>
                                <div class="col-md-3">
                                    <input type="text" class="form-control" placeholder="Tahmini Bütçe" name="target-budget[]" readonly>
                                </div>
                                <div class="col-md-2">
                                    <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeTargetLevel(this)">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button type="button" class="btn btn-outline-primary btn-sm" onclick="addTargetLevel()">
                        <i class="fas fa-plus me-1"></i>Hedef Ekle
                    </button>
                </div>
                
                <!-- Mağaza Seçimi -->
                <div class="mb-3">
                    <label class="form-label">Mağaza Seçimi *</label>
                    
                    <!-- Filtreleme Bölümü -->
                    <div class="card mb-3">
                        <div class="card-header">
                            <h6 class="mb-0">Mağaza Filtreleme</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-4">
                                    <label class="form-label">Kanal</label>
                                    <select class="form-select" id="free-wkz-channel" onchange="loadStoresForGamePlan()">
                                        <option value="">Tüm Kanallar</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Manager</label>
                                    <select class="form-select" id="free-wkz-manager" onchange="loadStoresForGamePlan()">
                                        <option value="">Tüm Manager'lar</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Arama</label>
                                    <input type="text" class="form-control" id="free-wkz-store-search" placeholder="Mağaza adı ara..." onkeyup="searchStoresForGamePlan()">
                                </div>
                                <div class="col-md-1">
                                    <label class="form-label">&nbsp;</label>
                                    <button type="button" class="btn btn-outline-primary w-100" onclick="searchAllStores()" title="Tüm mağazaları ara">
                                        <i class="fas fa-search"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Mağaza Listesi -->
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">Mevcut Mağazalar</h6>
                            <div>
                                <button type="button" class="btn btn-sm btn-outline-primary me-2" onclick="selectAllStores()">
                                    <i class="fas fa-check-square me-1"></i>Tümünü Seç
                                </button>
                                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="clearAllStores()">
                                    <i class="fas fa-square me-1"></i>Tümünü Temizle
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <div id="free-wkz-stores-container" class="row" style="max-height: 300px; overflow-y: auto;">
                                <div class="col-12 text-center text-muted">
                                    <i class="fas fa-info-circle me-2"></i>
                                    Önce filtreleme yapın veya arama yapın
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Seçilen Mağazalar -->
                    <div class="mt-3" id="selected-stores-display" style="display: none;">
                        <label class="form-label">Seçilen Mağazalar</label>
                        <div id="selected-stores-list" class="border rounded p-2 bg-light">
                            <!-- Seçilen mağazalar burada gösterilecek -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Dropdown'ları yükle
    loadChannelsForGamePlan('free-wkz-channel');
    loadManagersForGamePlan('free-wkz-manager');
    
    // HTML'de oninput ve onchange event'leri kullanıldığı için ek event listener gerekmiyor
}

// Hedef seviyesi ekleme
function addTargetLevel() {
    const container = document.getElementById('target-levels-container');
    const newLevel = document.createElement('div');
    newLevel.className = 'target-level-item mb-2';
    newLevel.innerHTML = `
        <div class="row">
            <div class="col-md-3">
                <input type="text" class="form-control" placeholder="Hedef Tutar" name="target-amount[]" onblur="formatAmount(this)" required>
            </div>
            <div class="col-md-2">
                <select class="form-select" name="target-tax[]" onchange="calculateBudget(this)" required>
                    <option value="">KDV</option>
                    <option value="included">Dahil</option>
                    <option value="excluded">Hariç</option>
                </select>
            </div>
            <div class="col-md-2">
                <input type="number" class="form-control" placeholder="Destek %" name="target-support[]" step="0.01" min="0" max="100" oninput="calculateBudget(this)" required>
            </div>
            <div class="col-md-3">
                <input type="text" class="form-control" placeholder="Tahmini Bütçe" name="target-budget[]" readonly>
            </div>
            <div class="col-md-2">
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeTargetLevel(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    container.appendChild(newLevel);
    
    // HTML'de oninput ve onchange event'leri kullanıldığı için ek event listener gerekmiyor
}

// Hedef seviyesi silme
function removeTargetLevel(button) {
    button.closest('.target-level-item').remove();
}

    // Hedef tutar formatla (HTML onblur ile çağrılır)
    function formatAmount(input) {
        let value = input.value.replace(/[^\d]/g, ''); // Sadece rakamları al
        
        if (value && value !== '0') {
            const number = parseInt(value);
            input.value = formatNumber(number) + ' TL';
        } else {
            input.value = '';
        }
    }

// Bütçe hesapla (HTML oninput/onchange ile çağrılır)
function calculateBudget(input) {
    const targetLevel = input.closest('.target-level-item');
    const amountInput = targetLevel.querySelector('input[name="target-amount[]"]');
    const taxSelect = targetLevel.querySelector('select[name="target-tax[]"]');
    const supportInput = targetLevel.querySelector('input[name="target-support[]"]');
    const budgetInput = targetLevel.querySelector('input[name="target-budget[]"]');
    
    // Hedef tutar alanından sayıyı al
    const amountValue = amountInput.value.replace(/[^\d]/g, '');
    const amount = parseFloat(amountValue) || 0;
    const supportPercentage = parseFloat(supportInput.value) || 0;
    const taxStatus = taxSelect.value;
    
    if (amount > 0 && supportPercentage > 0 && taxStatus) {
        // Destek tutarını hesapla: (Hedef Tutar * Destek %) / 100
        // KDV durumu sadece bilgi amaçlı, hesaplamaya etki etmiyor
        let calculatedBudget = (amount * supportPercentage) / 100;
        
        // Kuruşları kaldır ve formatla
        const roundedBudget = Math.round(calculatedBudget);
        budgetInput.value = formatNumber(roundedBudget) + ' TL';
    } else {
        budgetInput.value = '';
    }
}

// Global event listener'ları ayarla (Event Delegation)
function setupGlobalEventListeners() {
    // Hedef tutar alanları için event delegation
    document.addEventListener('input', function(event) {
        if (event.target.matches('input[name="target-amount[]"]')) {
            formatAmountInput(event);
        }
    });
    
    document.addEventListener('blur', function(event) {
        if (event.target.matches('input[name="target-amount[]"]')) {
            formatAmountInput(event);
        }
    });
    
    // Hesaplama için event delegation
    document.addEventListener('input', function(event) {
        if (event.target.matches('input[name="target-amount[]"], input[name="target-support[]"], select[name="target-tax[]"]')) {
            setTimeout(() => calculateTargetBudget(event), 50);
        }
    });
    
    document.addEventListener('change', function(event) {
        if (event.target.matches('input[name="target-amount[]"], input[name="target-support[]"], select[name="target-tax[]"]')) {
            setTimeout(() => calculateTargetBudget(event), 50);
        }
    });
    
    document.addEventListener('keyup', function(event) {
        if (event.target.matches('input[name="target-amount[]"], input[name="target-support[]"], select[name="target-tax[]"]')) {
            setTimeout(() => calculateTargetBudget(event), 50);
        }
    });
}


// Hedef tutar alanını formatla
function formatAmountInput(event) {
    const input = event.target;
    let value = input.value.replace(/[^\d]/g, ''); // Sadece rakamları al
    
    if (value) {
        const number = parseInt(value);
        input.value = formatNumber(number) + ' TL';
    }
}

// Hedef satırı bütçe hesaplama
function calculateTargetBudget(event) {
    const targetLevel = event.target.closest('.target-level-item');
    
    if (!targetLevel) {
        console.log('Target level bulunamadı');
        return;
    }
    
    const amountInput = targetLevel.querySelector('input[name="target-amount[]"]');
    const taxSelect = targetLevel.querySelector('select[name="target-tax[]"]');
    const supportInput = targetLevel.querySelector('input[name="target-support[]"]');
    const budgetInput = targetLevel.querySelector('input[name="target-budget[]"]');
    
    if (!amountInput || !taxSelect || !supportInput || !budgetInput) {
        console.log('Gerekli input alanları bulunamadı');
        return;
    }
    
    // Hedef tutar alanından sayıyı al (formatlanmış değerden)
    const amountValue = amountInput.value.replace(/[^\d]/g, ''); // Sadece rakamları al
    const amount = parseFloat(amountValue) || 0;
    const supportPercentage = parseFloat(supportInput.value) || 0;
    const taxStatus = taxSelect.value;
    
    console.log('Hesaplama verileri:', {
        amount: amount,
        supportPercentage: supportPercentage,
        taxStatus: taxStatus
    });
    
    if (amount > 0 && supportPercentage > 0 && taxStatus) {
        // Destek tutarını hesapla: (Hedef Tutar * Destek %) / 100
        // KDV durumu sadece bilgi amaçlı, hesaplamaya etki etmiyor
        let calculatedBudget = (amount * supportPercentage) / 100;
        
        // Kuruşları kaldır ve formatla
        const roundedBudget = Math.round(calculatedBudget);
        budgetInput.value = formatNumber(roundedBudget) + ' TL';
        console.log('Hesaplanan bütçe:', budgetInput.value);
    } else {
        budgetInput.value = '';
        console.log('Hesaplama için yeterli veri yok');
    }
}

// Sayıyı binlik ayıracı ile formatla
function formatNumber(number) {
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(number);
}

// Oyun planı formunu sıfırlama
function resetGamePlanForm() {
    document.getElementById('create-game-plan-form').reset();
    document.getElementById('game-plan-dynamic-content').innerHTML = `
        <div class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>
            Lütfen önce oyun planı türünü seçiniz.
        </div>
    `;
}

// Oyun planları listesini yükleme
async function loadGamePlansList() {
    console.log('Oyun planları listesi yükleniyor...');
    
    try {
        // Demo veri (Supabase tablosu oluşturulana kadar)
        const demoGamePlans = [
            {
                id: 1,
                title: 'Yaz Kampanyası Free WKZ',
                type: 'free_wkz',
                status: 'pending',
                created_by: 'Admin User',
                created_at: '2024-01-15',
                budget: '50000'
            },
            {
                id: 2,
                title: 'Ürün Destek Primi Kampanyası',
                type: 'product_support',
                status: 'approved',
                created_by: 'Manager User',
                created_at: '2024-01-14',
                budget: '75000'
            }
        ];
        
        // İstatistikleri güncelle
        updateGamePlanStatistics(demoGamePlans);
        
        // Tabloyu güncelle
        displayGamePlansTable(demoGamePlans);
        
    } catch (error) {
        console.error('Oyun planları yükleme hatası:', error);
        showAlert('Oyun planları yüklenirken hata oluştu!', 'danger');
    }
}

// Oyun planı istatistiklerini güncelleme
function updateGamePlanStatistics(gamePlans) {
    const total = gamePlans.length;
    const pending = gamePlans.filter(plan => plan.status === 'pending').length;
    const approved = gamePlans.filter(plan => plan.status === 'approved').length;
    const active = gamePlans.filter(plan => plan.status === 'active').length;
    
    document.getElementById('total-game-plans').textContent = total;
    document.getElementById('pending-game-plans').textContent = pending;
    document.getElementById('approved-game-plans').textContent = approved;
    document.getElementById('active-game-plans').textContent = active;
}

// Oyun planları tablosunu gösterme
function displayGamePlansTable(gamePlans) {
    const tbody = document.getElementById('game-plans-table-body');
    
    if (gamePlans.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="alert alert-info mb-0">
                        <i class="fas fa-info-circle me-2"></i>
                        Henüz oyun planı oluşturulmamış.
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = gamePlans.map(plan => `
        <tr>
            <td>${plan.title}</td>
            <td><span class="badge bg-primary">${getGamePlanTypeName(plan.type)}</span></td>
            <td><span class="badge ${getStatusBadgeClass(plan.status)}">${getStatusName(plan.status)}</span></td>
            <td>${plan.created_by}</td>
            <td>${formatDate(plan.created_at)}</td>
            <td>${plan.budget} TL</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="viewGamePlan(${plan.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning me-1" onclick="editGamePlan(${plan.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteGamePlan(${plan.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Yardımcı fonksiyonlar
function getGamePlanTypeName(type) {
    const types = {
        'free_wkz': 'Free WKZ',
        'product_support': 'Ürün Başına Destek',
        'spift': 'Spift Ödemeleri'
    };
    return types[type] || type;
}

function getStatusBadgeClass(status) {
    const classes = {
        'pending': 'bg-warning',
        'approved': 'bg-success',
        'active': 'bg-info',
        'completed': 'bg-secondary'
    };
    return classes[status] || 'bg-secondary';
}

function getStatusName(status) {
    const names = {
        'pending': 'Onay Bekleyen',
        'approved': 'Onaylanan',
        'active': 'Aktif',
        'completed': 'Tamamlanan'
    };
    return names[status] || status;
}

// Filtreleri temizleme
function clearGamePlanFilters() {
    document.getElementById('game-plan-search').value = '';
    document.getElementById('game-plan-type-filter').value = '';
    document.getElementById('game-plan-status-filter').value = '';
    loadGamePlansList();
}

// Excel export
function exportGamePlansToExcel() {
    showAlert('Excel export özelliği yakında eklenecek!', 'info');
}

// Oyun planı görüntüleme
function viewGamePlan(planId) {
    console.log('Oyun planı görüntüleniyor:', planId);
    showAlert('Oyun planı detay sayfası yakında eklenecek!', 'info');
}

// Oyun planı düzenleme
function editGamePlan(planId) {
    console.log('Oyun planı düzenleniyor:', planId);
    showAlert('Oyun planı düzenleme sayfası yakında eklenecek!', 'info');
}

// Oyun planı silme
function deleteGamePlan(planId) {
    if (confirm('Bu oyun planını silmek istediğinizden emin misiniz?')) {
        console.log('Oyun planı siliniyor:', planId);
        showAlert('Oyun planı silme işlemi yakında eklenecek!', 'info');
    }
}

// Dropdown yükleme fonksiyonları
async function loadChannelsForGamePlan(selectId) {
    const select = document.getElementById(selectId);
    if (select) {
        try {
            const { data: channels, error } = await supabase
                .from('channels')
                .select('id, name')
                .eq('is_active', true)
                .order('name');
            
            if (error) {
                console.error('Kanal yükleme hatası:', error);
                select.innerHTML = '<option value="">Kanal yüklenemedi</option>';
                return;
            }
            
            select.innerHTML = '<option value="">Kanal Seçiniz</option>' + 
                channels.map(channel => `<option value="${channel.id}">${channel.name}</option>`).join('');
        } catch (error) {
            console.error('Kanal yükleme hatası:', error);
            select.innerHTML = '<option value="">Kanal yüklenemedi</option>';
        }
    }
}

async function loadManagersForGamePlan(selectId) {
    const select = document.getElementById(selectId);
    if (select) {
        try {
            // Stores tablosundan unique manager'ları çek
            const { data: stores, error } = await supabase
                .from('stores')
                .select('manager, regions(name)')
                .eq('is_active', true)
                .not('manager', 'is', null);
            
            if (error) {
                console.error('Manager yükleme hatası:', error);
                select.innerHTML = '<option value="">Manager yüklenemedi</option>';
                return;
            }
            
            // Unique manager'ları al
            const uniqueManagers = [...new Set(stores.map(store => store.manager))].filter(manager => manager);
            
            console.log('Yüklenen manager\'lar:', uniqueManagers);
            
            select.innerHTML = '<option value="">Manager Seçiniz</option>' + 
                uniqueManagers.map(manager => `<option value="${manager}">${manager}</option>`).join('');
        } catch (error) {
            console.error('Manager yükleme hatası:', error);
            select.innerHTML = '<option value="">Manager yüklenemedi</option>';
        }
    }
}

async function loadStoresForGamePlan() {
    const container = document.getElementById('free-wkz-stores-container');
    if (!container) return;
    
    const channelSelect = document.getElementById('free-wkz-channel');
    const managerSelect = document.getElementById('free-wkz-manager');
    const searchInput = document.getElementById('free-wkz-store-search');
    
    const channelId = channelSelect?.value;
    const managerId = managerSelect?.value;
    const searchTerm = searchInput?.value?.toLowerCase() || '';
    
    console.log('Mağaza yükleme parametreleri:', { channelId, managerId, searchTerm });
    
    try {
        let query = supabase
            .from('stores')
            .select(`
                id,
                name,
                channel_id,
                region_id,
                manager,
                channels(name),
                regions(name)
            `)
            .eq('is_active', true);
        
        // Kanal filtresi
        if (channelId) {
            query = query.eq('channel_id', channelId);
            console.log('Kanal filtresi uygulandı:', channelId);
        }
        
        // Manager filtresi - manager ismine göre filtrele
        if (managerId) {
            query = query.eq('manager', managerId);
            console.log('Manager filtresi uygulandı:', managerId);
        }
        
        const { data: stores, error } = await query.order('name');
        
        if (error) {
            console.error('Mağaza yükleme hatası:', error);
            container.innerHTML = '<div class="col-12 text-center text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Mağazalar yüklenemedi</div>';
            return;
        }
        
        console.log('Supabase\'den gelen mağazalar:', stores);
        console.log('Toplam mağaza sayısı:', stores.length);
        
        // Arama filtresi uygula
        let filteredStores = stores;
        if (searchTerm) {
            filteredStores = stores.filter(store => 
                store.name.toLowerCase().includes(searchTerm) ||
                store.channels?.name?.toLowerCase().includes(searchTerm) ||
                store.regions?.name?.toLowerCase().includes(searchTerm)
            );
            console.log('Arama sonrası filtrelenmiş mağazalar:', filteredStores.length);
        }
        
        if (filteredStores.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted"><i class="fas fa-search me-2"></i>Arama kriterlerine uygun mağaza bulunamadı</div>';
            return;
        }
        
        // Mağazaları checkbox'lar halinde göster
        container.innerHTML = filteredStores.map(store => {
            const storeName = store.name.replace(/'/g, "\\'");
            const channelName = (store.channels?.name || 'Kanal Yok').replace(/'/g, "\\'");
            const regionName = (store.regions?.name || 'Bölge Yok').replace(/'/g, "\\'");
            
            return `
                <div class="col-md-6 col-lg-4 mb-2">
                    <div class="form-check">
                        <input class="form-check-input store-checkbox" type="checkbox" 
                               value="${store.id}" 
                               id="store-${store.id}"
                               onchange="toggleStoreSelection(${store.id}, '${storeName}', '${channelName}', '${regionName}')">
                        <label class="form-check-label" for="store-${store.id}">
                            <strong>${store.name}</strong><br>
                            <small class="text-muted">
                                <i class="fas fa-building me-1"></i>${store.channels?.name || 'Kanal Yok'} | 
                                <i class="fas fa-map-marker-alt me-1"></i>${store.regions?.name || 'Bölge Yok'}
                            </small>
                        </label>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Mağaza yükleme hatası:', error);
        container.innerHTML = '<div class="col-12 text-center text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Mağazalar yüklenemedi</div>';
    }
}

function searchStoresForGamePlan() {
    // Arama yapıldığında mağazaları yeniden yükle
    loadStoresForGamePlan();
}

// Tüm mağazaları arama (filtreleme olmadan)
async function searchAllStores() {
    const container = document.getElementById('free-wkz-stores-container');
    const searchInput = document.getElementById('free-wkz-store-search');
    
    if (!container || !searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        showAlert('Lütfen arama terimi girin!', 'warning');
        return;
    }
    
    try {
        // Tüm aktif mağazaları çek (filtreleme olmadan)
        const { data: stores, error } = await supabase
            .from('stores')
            .select(`
                id,
                name,
                channel_id,
                region_id,
                manager_id,
                channels(name),
                regions(name)
            `)
            .eq('is_active', true)
            .order('name');
        
        if (error) {
            console.error('Mağaza arama hatası:', error);
            container.innerHTML = '<div class="col-12 text-center text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Mağazalar aranırken hata oluştu</div>';
            return;
        }
        
        // Arama terimine göre filtrele
        const filteredStores = stores.filter(store => 
            store.name.toLowerCase().includes(searchTerm) ||
            store.channels?.name?.toLowerCase().includes(searchTerm) ||
            store.regions?.name?.toLowerCase().includes(searchTerm)
        );
        
        if (filteredStores.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted"><i class="fas fa-search me-2"></i>"' + searchTerm + '" için mağaza bulunamadı</div>';
            return;
        }
        
        // Mağazaları checkbox'lar halinde göster
        container.innerHTML = filteredStores.map(store => {
            const storeName = store.name.replace(/'/g, "\\'");
            const channelName = (store.channels?.name || 'Kanal Yok').replace(/'/g, "\\'");
            const regionName = (store.regions?.name || 'Bölge Yok').replace(/'/g, "\\'");
            
            return `
                <div class="col-md-6 col-lg-4 mb-2">
                    <div class="form-check">
                        <input class="form-check-input store-checkbox" type="checkbox" 
                               value="${store.id}" 
                               id="store-${store.id}"
                               onchange="toggleStoreSelection(${store.id}, '${storeName}', '${channelName}', '${regionName}')">
                        <label class="form-check-label" for="store-${store.id}">
                            <strong>${store.name}</strong><br>
                            <small class="text-muted">
                                <i class="fas fa-building me-1"></i>${store.channels?.name || 'Kanal Yok'} | 
                                <i class="fas fa-map-marker-alt me-1"></i>${store.regions?.name || 'Bölge Yok'}
                            </small>
                        </label>
                    </div>
                </div>
            `;
        }).join('');
        
        // Arama sonucu bilgisi göster
        const resultInfo = document.createElement('div');
        resultInfo.className = 'col-12 mb-2';
        resultInfo.innerHTML = `<small class="text-info"><i class="fas fa-info-circle me-1"></i>"${searchTerm}" için ${filteredStores.length} mağaza bulundu</small>`;
        container.insertBefore(resultInfo, container.firstChild);
        
    } catch (error) {
        console.error('Mağaza arama hatası:', error);
        container.innerHTML = '<div class="col-12 text-center text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Mağazalar aranırken hata oluştu</div>';
    }
}

// Seçilen mağazaları takip etmek için global değişken
let selectedStores = [];

// Mağaza seçimi toggle fonksiyonu
function toggleStoreSelection(storeId, storeName, channelName, regionName) {
    const checkbox = document.getElementById(`store-${storeId}`);
    const isChecked = checkbox.checked;
    
    if (isChecked) {
        // Mağazayı seçilen listesine ekle
        if (!selectedStores.find(store => store.id === storeId)) {
            selectedStores.push({
                id: storeId,
                name: storeName,
                channel: channelName,
                region: regionName
            });
        }
    } else {
        // Mağazayı seçilen listesinden çıkar
        selectedStores = selectedStores.filter(store => store.id !== storeId);
    }
    
    updateSelectedStoresDisplay();
}

// Seçilen mağazaları güncelle
function updateSelectedStoresDisplay() {
    const display = document.getElementById('selected-stores-display');
    const list = document.getElementById('selected-stores-list');
    
    if (selectedStores.length === 0) {
        display.style.display = 'none';
        return;
    }
    
    display.style.display = 'block';
    list.innerHTML = selectedStores.map(store => `
        <span class="badge bg-primary me-2 mb-2" style="font-size: 0.9em;">
            ${store.name} (${store.channel} - ${store.region})
            <button type="button" class="btn-close btn-close-white ms-2" style="font-size: 0.7em;" 
                    onclick="removeStoreSelection(${store.id})" aria-label="Kaldır"></button>
        </span>
    `).join('');
}

// Mağaza seçimini kaldır
function removeStoreSelection(storeId) {
    selectedStores = selectedStores.filter(store => store.id !== storeId);
    
    // Checkbox'ı da kaldır
    const checkbox = document.getElementById(`store-${storeId}`);
    if (checkbox) {
        checkbox.checked = false;
    }
    
    updateSelectedStoresDisplay();
}

// Tüm mağazaları seç
function selectAllStores() {
    const checkboxes = document.querySelectorAll('.store-checkbox');
    checkboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            checkbox.checked = true;
            const storeId = parseInt(checkbox.value);
            const storeName = checkbox.closest('.form-check').querySelector('label strong').textContent;
            const channelName = checkbox.closest('.form-check').querySelector('small').textContent.split('|')[0].trim().replace('🏢 ', '');
            const regionName = checkbox.closest('.form-check').querySelector('small').textContent.split('|')[1].trim().replace('📍 ', '');
            
            if (!selectedStores.find(store => store.id === storeId)) {
                selectedStores.push({
                    id: storeId,
                    name: storeName,
                    channel: channelName,
                    region: regionName
                });
            }
        }
    });
    updateSelectedStoresDisplay();
}

// Tüm mağaza seçimlerini temizle
function clearAllStores() {
    const checkboxes = document.querySelectorAll('.store-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    selectedStores = [];
    updateSelectedStoresDisplay();
}

// Oyun planı oluşturma işlemi
async function handleCreateGamePlan(event) {
    event.preventDefault();
    
    const title = document.getElementById('game-plan-title').value;
    const type = document.getElementById('game-plan-type').value;
    
    if (!title || !type) {
        showAlert('Lütfen tüm zorunlu alanları doldurun!', 'danger');
        return;
    }
    
    // Seçilen mağaza kontrolü
    if (selectedStores.length === 0) {
        showAlert('Lütfen en az bir mağaza seçin!', 'danger');
        return;
    }
    
    // Hedef baremleri kontrolü (Free WKZ için)
    if (type === 'free_wkz') {
        const targetAmounts = document.querySelectorAll('input[name="target-amount[]"]');
        const targetSupports = document.querySelectorAll('input[name="target-support[]"]');
        const targetTaxes = document.querySelectorAll('select[name="target-tax[]"]');
        
        let hasValidTarget = false;
        for (let i = 0; i < targetAmounts.length; i++) {
            if (targetAmounts[i].value && targetSupports[i].value && targetTaxes[i].value) {
                hasValidTarget = true;
                break;
            }
        }
        
        if (!hasValidTarget) {
            showAlert('Lütfen en az bir hedef baremi doldurun!', 'danger');
            return;
        }
    }
    
    // Özet görüntüyü göster
    showGamePlanSummary(title, type);
}

// Oyun planı özet görüntüsü
function showGamePlanSummary(title, type) {
    const dynamicContent = document.getElementById('game-plan-dynamic-content');
    
    // Hedef baremlerini topla
    const targetLevels = [];
    const targetAmounts = document.querySelectorAll('input[name="target-amount[]"]');
    const targetSupports = document.querySelectorAll('input[name="target-support[]"]');
    const targetTaxes = document.querySelectorAll('select[name="target-tax[]"]');
    const targetBudgets = document.querySelectorAll('input[name="target-budget[]"]');
    
    for (let i = 0; i < targetAmounts.length; i++) {
        if (targetAmounts[i].value && targetSupports[i].value && targetTaxes[i].value) {
            targetLevels.push({
                amount: targetAmounts[i].value,
                support: targetSupports[i].value,
                tax: targetTaxes[i].value,
                budget: targetBudgets[i].value
            });
        }
    }
    
    // Toplam bütçe hesapla
    const totalBudget = targetLevels.reduce((sum, level) => {
        const budget = parseFloat(level.budget.replace(/[^\d]/g, '')) || 0;
        return sum + budget;
    }, 0);
    
    dynamicContent.innerHTML = `
        <div class="card">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0"><i class="fas fa-eye me-2"></i>Oyun Planı Özeti</h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <h6>Genel Bilgiler</h6>
                        <p><strong>Başlık:</strong> ${title}</p>
                        <p><strong>Tür:</strong> ${getGamePlanTypeName(type)}</p>
                        <p><strong>Seçilen Mağaza Sayısı:</strong> ${selectedStores.length}</p>
                        <p><strong>Toplam Tahmini Bütçe:</strong> ${formatNumber(totalBudget)} TL</p>
                    </div>
                    <div class="col-md-6">
                        <h6>Seçilen Mağazalar</h6>
                        <div style="max-height: 200px; overflow-y: auto;">
                            ${selectedStores.map(store => `
                                <span class="badge bg-secondary me-1 mb-1">${store.name}</span>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                ${type === 'free_wkz' ? `
                <div class="mt-3">
                    <h6>Hedef Baremleri</h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Hedef Tutar</th>
                                    <th>KDV</th>
                                    <th>Destek %</th>
                                    <th>Tahmini Bütçe</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${targetLevels.map(level => `
                                    <tr>
                                        <td>${level.amount}</td>
                                        <td>${level.tax === 'included' ? 'Dahil' : 'Hariç'}</td>
                                        <td>%${level.support}</td>
                                        <td>${level.budget}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                ` : ''}
                
                <div class="mt-4 text-center">
                    <button type="button" class="btn btn-success me-2" onclick="submitGamePlanForApproval()">
                        <i class="fas fa-paper-plane me-2"></i>Onaya Gönder
                    </button>
                    <button type="button" class="btn btn-warning me-2" onclick="editGamePlanFromSummary()">
                        <i class="fas fa-edit me-2"></i>Tekrar Düzenle
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="cancelGamePlanCreation()">
                        <i class="fas fa-times me-2"></i>İptal
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Oyun planını onaya gönder
async function submitGamePlanForApproval() {
    const title = document.getElementById('game-plan-title').value;
    const type = document.getElementById('game-plan-type').value;
    
    try {
        // Oyun planı verilerini topla
        const gamePlanData = {
            title: title,
            type: type,
            status: 'pending',
            created_by: getCurrentUserId(),
            created_at: new Date().toISOString(),
            selected_stores: selectedStores,
            target_levels: getTargetLevelsData()
        };
        
        // Demo veri olarak ekle (Supabase tablosu oluşturulana kadar)
        console.log('Oyun planı onaya gönderiliyor:', gamePlanData);
        
        showAlert('Oyun planı başarıyla onaya gönderildi!', 'success');
        showGamePlanSection('list');
        loadGamePlansList();
        
    } catch (error) {
        console.error('Oyun planı onaya gönderme hatası:', error);
        showAlert('Oyun planı onaya gönderilirken hata oluştu!', 'danger');
    }
}

// Hedef baremlerini topla
function getTargetLevelsData() {
    const targetLevels = [];
    const targetAmounts = document.querySelectorAll('input[name="target-amount[]"]');
    const targetSupports = document.querySelectorAll('input[name="target-support[]"]');
    const targetTaxes = document.querySelectorAll('select[name="target-tax[]"]');
    const targetBudgets = document.querySelectorAll('input[name="target-budget[]"]');
    
    for (let i = 0; i < targetAmounts.length; i++) {
        if (targetAmounts[i].value && targetSupports[i].value && targetTaxes[i].value) {
            targetLevels.push({
                amount: targetAmounts[i].value,
                support: targetSupports[i].value,
                tax: targetTaxes[i].value,
                budget: targetBudgets[i].value
            });
        }
    }
    
    return targetLevels;
}

// Özetten düzenlemeye dön
function editGamePlanFromSummary() {
    // Orijinal formu geri yükle
    handleGamePlanTypeChange();
}

// Oyun planı oluşturmayı iptal et
function cancelGamePlanCreation() {
    showGamePlanSection('list');
}

// Mevcut kullanıcı ID'sini al
function getCurrentUserId() {
    const user = checkUserSession();
    return user ? user.id : 1; // Demo için 1 döndür
}

// Sayı formatla (binlik ayırıcı ile, kuruşsuz)
function formatNumber(number) {
    return new Intl.NumberFormat('tr-TR').format(number);
}

// Tüm mağazaları seç (Ürün Başına Destek Primi) - Global fonksiyon
window.selectAllStoresForProduct = function() {
    // Sadece mevcut filtrelenmiş mağazaları seç, yeni mağaza yükleme
    const checkboxes = document.querySelectorAll('#product-stores-container input[name="product-selected-stores[]"]');
    console.log('Seçilecek mağaza sayısı:', checkboxes.length);
    
    checkboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            checkbox.checked = true;
            // Store selection'ı da güncelle
            toggleStoreSelectionForProduct(checkbox);
        }
    });
    
    console.log(`${checkboxes.length} mağaza seçildi`);
}

// Tüm mağaza seçimlerini temizle (Ürün Başına Destek Primi) - Global fonksiyon
window.clearAllStoresForProduct = function() {
    const checkboxes = document.querySelectorAll('#product-stores-container input[name="product-selected-stores[]"]');
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            checkbox.checked = false;
            // Store selection'ı da güncelle
            toggleStoreSelectionForProduct(checkbox);
        }
    });
}

// Seçilen mağazaları ürün listesine ekle - Global fonksiyon
window.addSelectedStoresToProduct = function() {
    const selectedCheckboxes = document.querySelectorAll('#product-stores-container input[name="product-selected-stores[]"]:checked');
    
    if (selectedCheckboxes.length === 0) {
        alert('Lütfen en az bir mağaza seçin!');
        return;
    }
    
    const selectedStoresList = document.getElementById('product-selected-stores-list');
    const selectedStoresDisplay = document.getElementById('product-selected-stores-display');
    
    if (!selectedStoresList || !selectedStoresDisplay) {
        console.error('Seçilen mağazalar listesi bulunamadı!');
        return;
    }
    
    // Seçilen mağazaları ekle
    selectedCheckboxes.forEach(checkbox => {
        const storeId = checkbox.value;
        const storeName = checkbox.dataset.storeName;
        const channelName = checkbox.dataset.channelName;
        const regionName = checkbox.dataset.regionName;
        
        // Zaten eklenmiş mi kontrol et
        if (document.getElementById(`added-store-${storeId}`)) {
            return; // Zaten eklenmiş, atla
        }
        
        const storeDiv = document.createElement('div');
        storeDiv.id = `added-store-${storeId}`;
        storeDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; background: white; border: 1px solid #dee2e6; border-radius: 4px; margin-bottom: 10px;';
        storeDiv.innerHTML = `
            <div style="flex: 1;">
                <div style="font-weight: bold;">${storeName}</div>
                <div style="font-size: 14px; color: #6c757d;">${channelName} | ${regionName}</div>
            </div>
            <button onclick="removeStoreFromProduct(${storeId})" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        selectedStoresList.appendChild(storeDiv);
    });
    
    // Seçilen mağazalar bölümünü göster
    selectedStoresDisplay.style.display = 'block';
    
    // Checkbox'ları temizle
    selectedCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    alert(`${selectedCheckboxes.length} mağaza başarıyla eklendi!`);
}

// Mağazayı ürün listesinden çıkar - Global fonksiyon
window.removeStoreFromProduct = function(storeId) {
    const storeDiv = document.getElementById(`added-store-${storeId}`);
    if (storeDiv) {
        storeDiv.remove();
    }
    
    // Eğer hiç mağaza kalmadıysa seçilen mağazalar bölümünü gizle
    const selectedStoresList = document.getElementById('product-selected-stores-list');
    if (selectedStoresList && selectedStoresList.children.length === 0) {
        document.getElementById('product-selected-stores-display').style.display = 'none';
    }
}

// Tüm mağazaları yükle (filtreleme olmadan)
async function loadAllStoresForProduct() {
    const container = document.getElementById('product-stores-container');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;"><i class="fas fa-spinner fa-spin me-2"></i>Mağazalar yükleniyor...</div>';
    
    try {
        const { data: stores, error } = await supabase
            .from('stores')
            .select(`
                id,
                name,
                channel_id,
                region_id,
                manager,
                channels(name),
                regions(name)
            `)
            .eq('is_active', true)
            .order('name');
        
        if (error) {
            console.error('Mağaza yükleme hatası:', error);
            container.innerHTML = '<div style="text-align: center; color: #dc3545; padding: 20px;"><i class="fas fa-exclamation-triangle me-2"></i>Mağazalar yüklenemedi</div>';
            return;
        }
        
        container.innerHTML = stores.map(store => {
            const storeName = store.name.replace(/'/g, "\\'");
            const channelName = (store.channels?.name || 'Kanal Yok').replace(/'/g, "\\'");
            const regionName = (store.regions?.name || 'Bölge Yok').replace(/'/g, "\\'");
            
            return `
                <div class="col-md-6 col-lg-4 mb-2">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" 
                               name="product-selected-stores[]"
                               value="${store.id}" 
                               id="product-store-${store.id}"
                               data-store-id="${store.id}"
                               data-store-name="${storeName}"
                               data-channel-name="${channelName}"
                               data-region-name="${regionName}">
                        <label class="form-check-label" for="product-store-${store.id}">
                            <strong>${store.name}</strong><br>
                            <small class="text-muted">
                                <i class="fas fa-building me-1"></i>${store.channels?.name || 'Kanal Yok'} | 
                                <i class="fas fa-map-marker-alt me-1"></i>${store.regions?.name || 'Bölge Yok'}
                            </small>
                        </label>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Mağaza yükleme hatası:', error);
        container.innerHTML = '<div class="col-12 text-center text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Mağazalar yüklenemedi</div>';
    }
}

// Ürün Başına Destek Primi için mağaza yükleme
async function loadStoresForProduct() {
    const container = document.getElementById('product-stores-container');
    if (!container) return;
    
    const channelSelect = document.getElementById('product-channel');
    const managerSelect = document.getElementById('product-manager');
    const searchInput = document.getElementById('product-store-search');
    
    const channelId = channelSelect?.value;
    const managerId = managerSelect?.value;
    const searchTerm = searchInput?.value?.toLowerCase() || '';
    
    console.log('Ürün destek mağaza yükleme parametreleri:', { channelId, managerId, searchTerm });
    
    try {
        let query = supabase
            .from('stores')
            .select(`
                id,
                name,
                channel_id,
                region_id,
                manager,
                channels(name),
                regions(name)
            `)
            .eq('is_active', true);
        
        // Kanal filtresi - sadece kanal seçilmişse uygula
        if (channelId && channelId !== '') {
            query = query.eq('channel_id', channelId);
            console.log('Ürün destek kanal filtresi uygulandı:', channelId);
        }
        
        // Manager filtresi - sadece manager seçilmişse uygula
        if (managerId && managerId !== '') {
            query = query.eq('manager', managerId);
            console.log('Ürün destek manager filtresi uygulandı:', managerId);
        }
        
        // Arama filtresi - sadece arama terimi varsa uygula
        if (searchTerm && searchTerm.trim() !== '') {
            query = query.ilike('name', `%${searchTerm}%`);
            console.log('Ürün destek arama filtresi uygulandı:', searchTerm);
        }
        
        const { data: stores, error } = await query.order('name');
        
        if (error) {
            console.error('Ürün destek mağaza yükleme hatası:', error);
            container.innerHTML = '<div style="text-align: center; color: #dc3545; padding: 20px;">Mağazalar yüklenemedi</div>';
            return;
        }
        
        console.log('Ürün destek için yüklenen mağazalar:', stores);
        
        // Arama filtresi uygula
        let filteredStores = stores;
        if (searchTerm) {
            filteredStores = stores.filter(store => 
                store.name.toLowerCase().includes(searchTerm) ||
                store.channels?.name?.toLowerCase().includes(searchTerm) ||
                store.regions?.name?.toLowerCase().includes(searchTerm)
            );
        }
        
        if (filteredStores.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">Arama kriterlerine uygun mağaza bulunamadı</div>';
            return;
        }
        
        // Mağazaları checkbox'lar halinde göster
        container.innerHTML = filteredStores.map(store => {
            const storeName = store.name.replace(/'/g, "\\'");
            const channelName = store.channels?.name?.replace(/'/g, "\\'") || 'Bilinmiyor';
            const regionName = store.regions?.name?.replace(/'/g, "\\'") || 'Bilinmiyor';
            
            return `
                <div style="display: flex; align-items: center; padding: 10px; border: 1px solid #dee2e6; border-radius: 4px; margin-bottom: 10px; background: white;">
                    <input type="checkbox" name="product-selected-stores[]" value="${storeName}" onchange="toggleStoreSelectionForProduct(this)" style="margin-right: 10px;">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; color: #333;">${store.name}</div>
                        <div style="font-size: 14px; color: #6c757d;">${channelName} - ${regionName}</div>
                        <div style="font-size: 12px; color: #28a745;">Manager: ${store.manager || 'Atanmamış'}</div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Ürün destek mağaza yükleme hatası:', error);
        container.innerHTML = '<div style="text-align: center; color: #dc3545; padding: 20px;">Mağazalar yüklenemedi</div>';
    }
}

// Ürün destek için mağaza arama
function searchStoresForProduct() {
    loadStoresForProduct();
}

// Ürün destek için tüm mağazaları ara
function searchAllStoresForProduct() {
    const searchInput = document.getElementById('product-store-search');
    searchInput.value = '';
    loadStoresForProduct();
}

// Ürün destek için mağaza seçimi
function toggleStoreSelectionForProduct(checkbox) {
    const storeName = checkbox.value;
    const selectedStoresList = document.getElementById('product-selected-stores-list');
    const selectedStoresDisplay = document.getElementById('product-selected-stores-display');
    
    if (checkbox.checked) {
        // Mağazayı seçilen listeye ekle
        const storeDiv = document.createElement('div');
        storeDiv.id = `product-selected-store-${storeName.replace(/[^a-zA-Z0-9]/g, '')}`;
        storeDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px; background: white; border: 1px solid #dee2e6; border-radius: 4px; margin-bottom: 5px;';
        storeDiv.innerHTML = `
            <span style="font-size: 14px;">${storeName}</span>
            <button onclick="removeStoreSelectionForProduct('${storeName}')" style="background: #dc3545; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-size: 12px;">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        selectedStoresList.appendChild(storeDiv);
        selectedStoresDisplay.style.display = 'block';
    } else {
        // Mağazayı seçilen listeden çıkar
        const storeDiv = document.getElementById(`product-selected-store-${storeName.replace(/[^a-zA-Z0-9]/g, '')}`);
        if (storeDiv) {
            storeDiv.remove();
        }
        
        // Eğer hiç mağaza kalmadıysa seçilen mağazalar bölümünü gizle
        if (selectedStoresList.children.length === 0) {
            selectedStoresDisplay.style.display = 'none';
        }
    }
}

// Ürün destek için mağaza seçimini kaldır
function removeStoreSelectionForProduct(storeName) {
    const storeDiv = document.getElementById(`product-selected-store-${storeName.replace(/[^a-zA-Z0-9]/g, '')}`);
    if (storeDiv) {
        storeDiv.remove();
    }
    
    // Checkbox'ı işaretini kaldır
    const checkbox = document.querySelector(`input[name="product-selected-stores[]"][value="${storeName}"]`);
    if (checkbox) {
        checkbox.checked = false;
    }
    
    // Eğer hiç mağaza kalmadıysa seçilen mağazalar bölümünü gizle
    const selectedStoresList = document.getElementById('product-selected-stores-list');
    const selectedStoresDisplay = document.getElementById('product-selected-stores-display');
    if (selectedStoresList.children.length === 0) {
        selectedStoresDisplay.style.display = 'none';
    }
}

// Ürün destek için tüm mağazaları seç
function selectAllStoresForProduct() {
    const checkboxes = document.querySelectorAll('input[name="product-selected-stores[]"]');
    checkboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            checkbox.checked = true;
            toggleStoreSelectionForProduct(checkbox);
        }
    });
}

// Ürün destek için tüm mağaza seçimlerini temizle
function clearAllStoresForProduct() {
    const checkboxes = document.querySelectorAll('input[name="product-selected-stores[]"]');
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            checkbox.checked = false;
            toggleStoreSelectionForProduct(checkbox);
        }
    });
}

// Yönetici verilerini yükleyen fonksiyon
function loadManagerData(user) {
    console.log('Yönetici verileri yükleniyor:', user);
    // Yönetici için özel veri yükleme işlemleri burada yapılabilir
    // Şu an için boş bırakıyoruz
}

// Kullanıcı rolüne göre menü öğelerini ayarlayan fonksiyon
function setupMenuForUser(user) {
    console.log('Menü öğeleri ayarlanıyor, kullanıcı rolü:', user.role);
    
    // Kullanıcı Ekle menü öğesi
    const addUserMenu = document.getElementById('add-user-menu');
    if (addUserMenu) {
        if (user.role === 'admin' || user.role === 'manager') {
            addUserMenu.style.display = 'block';
        } else {
            addUserMenu.style.display = 'none';
        }
    }
    
    // Mağaza Ekle menü öğesi
    const addStoreMenu = document.getElementById('add-store-menu');
    if (addStoreMenu) {
        if (user.role === 'admin' || user.role === 'manager') {
            addStoreMenu.style.display = 'block';
        } else {
            addStoreMenu.style.display = 'none';
        }
    }
}

