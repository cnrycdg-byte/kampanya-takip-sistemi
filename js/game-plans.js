// Oyun Planları JavaScript Dosyası

let allGamePlans = [];
let currentUser = null;

// Kullanıcı oturumunu kontrol eden fonksiyon
function checkUserSession() {
    try {
        const userData = localStorage.getItem('user');
        if (userData) {
            return JSON.parse(userData);
        }
        return null;
    } catch (error) {
        console.error('Kullanıcı oturumu kontrol hatası:', error);
        return null;
    }
}

// Alert gösterme fonksiyonu
function showAlert(message, type = 'info') {
    // Basit alert göster
    alert(message);
}

// Sayfa yüklendiğinde çalışacak kod
document.addEventListener('DOMContentLoaded', function() {
    console.log('Oyun planları dashboard yüklendi');
    
    // Kullanıcı oturumunu kontrol et
    currentUser = checkUserSession();
    if (!currentUser) {
        return;
    }
    
    // Kullanıcı bilgilerini göster
    displayUserInfo(currentUser);
    
    // Dashboard verilerini yükle
    loadDashboardData();
    
    // Varsayılan olarak dashboard'u göster
    showSection('dashboard');
});

// Kullanıcı bilgilerini gösteren fonksiyon
function displayUserInfo(user) {
    document.getElementById('user-name').textContent = user.name || 'Kullanıcı';
}

// Bölüm gösterme fonksiyonu (global)
window.showSection = function(sectionName) {
    console.log('showSection çağrıldı:', sectionName);
    
    // Tüm bölümleri gizle
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Seçilen bölümü göster
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.style.display = 'block';
        console.log('Bölüm gösterildi:', sectionName);
        
        // Eğer create bölümü seçildiyse formu yükle
        if (sectionName === 'create') {
            console.log('Create bölümü seçildi, form yükleniyor...');
            if (typeof window.loadCreateForm === 'function') {
                window.loadCreateForm();
            } else {
                console.error('loadCreateForm fonksiyonu bulunamadı!');
            }
        }
    } else {
        console.error('Bölüm bulunamadı:', sectionName + '-section');
    }
};

// Dashboard verilerini yükleyen fonksiyon
async function loadDashboardData() {
    try {
        // Oyun planlarını yükle
        await loadGamePlans();
        
        // İstatistikleri güncelle
        updateStatistics();
        
        // Son oyun planlarını göster
        displayRecentPlans();
        
    } catch (error) {
        console.error('Dashboard verileri yüklenirken hata:', error);
        showAlert('Veriler yüklenirken hata oluştu: ' + error.message, 'danger');
    }
}

// Oyun planlarını yükleyen fonksiyon
async function loadGamePlans() {
    try {
        const { data: gamePlans, error } = await supabase
            .from('game_plans')
            .select(`
                *,
                game_plan_stores(
                    id,
                    store_id,
                    target_value,
                    target_quantity,
                    stores(name)
                ),
                game_plan_products(
                    id,
                    product_code,
                    product_name,
                    prim_amount
                ),
                game_plan_budgets(
                    id,
                    budget_type,
                    budget_amount,
                    used_amount
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        allGamePlans = gamePlans || [];
        console.log('Oyun planları yüklendi:', allGamePlans.length);
        
    } catch (error) {
        console.error('Oyun planları yüklenirken hata:', error);
        throw error;
    }
}

// İstatistikleri güncelleyen fonksiyon
function updateStatistics() {
    const totalPlans = allGamePlans.length;
    const activePlans = allGamePlans.filter(plan => plan.status === 'active').length;
    const pendingPlans = allGamePlans.filter(plan => 
        plan.status === 'pending_account_manager' || 
        plan.status === 'pending_marketing_manager'
    ).length;
    const completedPlans = allGamePlans.filter(plan => plan.status === 'completed').length;
    
    // Bu ay tamamlanan planlar
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const completedThisMonth = allGamePlans.filter(plan => {
        if (plan.status !== 'completed') return false;
        const planDate = new Date(plan.updated_at);
        return planDate.getMonth() === currentMonth && planDate.getFullYear() === currentYear;
    }).length;
    
    // İstatistikleri güncelle
    document.getElementById('total-plans').textContent = totalPlans;
    document.getElementById('active-plans').textContent = activePlans;
    document.getElementById('pending-plans').textContent = pendingPlans;
    document.getElementById('completed-plans').textContent = completedThisMonth;
    
    // Menüdeki badge'leri güncelle
    document.getElementById('pending-count').textContent = pendingPlans;
    document.getElementById('active-count').textContent = activePlans;
}

// Son oyun planlarını gösteren fonksiyon
function displayRecentPlans() {
    const container = document.getElementById('recent-plans-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Son 6 oyun planını al
    const recentPlans = allGamePlans.slice(0, 6);
    
    if (recentPlans.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-gamepad fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">Henüz oyun planı oluşturulmamış</h5>
                <p class="text-muted">İlk oyun planınızı oluşturmak için "Yeni Oyun Planı" butonuna tıklayın.</p>
            </div>
        `;
        return;
    }
    
    recentPlans.forEach(plan => {
        const planCard = createGamePlanCard(plan);
        container.appendChild(planCard);
    });
}

// Oyun planı kartı oluşturan fonksiyon
function createGamePlanCard(plan) {
    const col = document.createElement('div');
    col.className = 'col-xl-4 col-md-6 mb-4';
    
    const statusColor = getStatusColor(plan.status);
    const statusText = getStatusText(plan.status);
    const storeCount = plan.game_plan_stores ? plan.game_plan_stores.length : 0;
    const productCount = plan.game_plan_products ? plan.game_plan_products.length : 0;
    
    col.innerHTML = `
        <div class="card game-plan-card shadow h-100" onclick="viewGamePlan('${plan.id}')">
            <div class="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                <h6 class="m-0 font-weight-bold text-primary">${plan.title}</h6>
                <span class="badge ${statusColor} status-badge">${statusText}</span>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-6">
                        <div class="text-xs font-weight-bold text-uppercase mb-1">Tür</div>
                        <div class="h6 mb-0 font-weight-bold text-gray-800">${getTypeText(plan.type)}</div>
                    </div>
                    <div class="col-6">
                        <div class="text-xs font-weight-bold text-uppercase mb-1">Dönem</div>
                        <div class="h6 mb-0 font-weight-bold text-gray-800">${getPeriodText(plan.period_type)}</div>
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col-6">
                        <div class="text-xs font-weight-bold text-uppercase mb-1">Mağaza Sayısı</div>
                        <div class="h6 mb-0 font-weight-bold text-info">${storeCount}</div>
                    </div>
                    <div class="col-6">
                        <div class="text-xs font-weight-bold text-uppercase mb-1">Ürün Sayısı</div>
                        <div class="h6 mb-0 font-weight-bold text-info">${productCount}</div>
                    </div>
                </div>
                <div class="mt-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-xs font-weight-bold text-uppercase">Başlangıç</span>
                        <span class="text-xs font-weight-bold">${formatDate(plan.start_date)}</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-xs font-weight-bold text-uppercase">Bitiş</span>
                        <span class="text-xs font-weight-bold">${formatDate(plan.end_date)}</span>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">${formatDate(plan.created_at)}</small>
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-sm btn-primary" onclick="event.stopPropagation(); viewGamePlan('${plan.id}')" title="Detayları Görüntüle">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-success" onclick="event.stopPropagation(); exportToExcel('${plan.id}')" title="Excel'e Aktar">
                            <i class="fas fa-file-excel"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteGamePlan('${plan.id}')" title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

// Durum rengini döndüren fonksiyon
function getStatusColor(status) {
    const colors = {
        'draft': 'bg-secondary',
        'pending_account_manager': 'bg-warning',
        'pending_marketing_manager': 'bg-warning',
        'approved': 'bg-info',
        'active': 'bg-success',
        'completed': 'bg-primary',
        'cancelled': 'bg-danger'
    };
    return colors[status] || 'bg-secondary';
}

// Durum metnini döndüren fonksiyon
function getStatusText(status) {
    const texts = {
        'draft': 'Taslak',
        'pending_account_manager': 'Account Manager Onayı',
        'pending_marketing_manager': 'Pazarlama Onayı',
        'approved': 'Onaylandı',
        'active': 'Aktif',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal Edildi'
    };
    return texts[status] || 'Bilinmeyen';
}

// Tür metnini döndüren fonksiyon
function getTypeText(type) {
    const texts = {
        'free_wkz': 'Free WKZ',
        'product_prim': 'Ürün Başına Prim',
        'sipft': 'Sipft',
        'budget': 'Bütçe Yönetimi'
    };
    return texts[type] || 'Bilinmeyen';
}

// Dönem metnini döndüren fonksiyon
function getPeriodText(period) {
    const texts = {
        'monthly': 'Aylık',
        'weekly': 'Haftalık'
    };
    return texts[period] || 'Bilinmeyen';
}

// Oyun planı oluşturma formunu yükleyen fonksiyon (global)
window.loadCreateForm = function() {
    console.log('loadCreateForm() çağrıldı');
    
    const container = document.getElementById('create-form-container');
    if (!container) {
        console.error('create-form-container elementi bulunamadı!');
        return;
    }
    
    console.log('create-form-container elementi bulundu, form yükleniyor...');
    
    // Form HTML'ini yükle
    container.innerHTML = getGamePlanFormHTML();
    console.log('Oyun planı oluşturma formu yüklendi');
};

// Oyun planı form HTML'ini döndüren fonksiyon
function getGamePlanFormHTML() {
    return `
        <div class="row">
            <div class="col-12">
                <div class="card shadow">
                    <div class="card-header">
                        <h5 class="mb-0">Oyun Planı Bilgileri</h5>
                    </div>
                    <div class="card-body">
                        <form id="create-game-plan-form">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Oyun Planı Başlığı *</label>
                                        <input type="text" class="form-control" id="plan-title" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Oyun Planı Türü *</label>
                                        <select class="form-select" id="plan-type" required onchange="handleTypeChange()">
                                            <option value="">Seçiniz</option>
                                            <option value="free_wkz">Free WKZ</option>
                                            <option value="product_prim">Ürün Başına Prim</option>
                                            <option value="sipft">Sipft</option>
                                            <option value="budget">Bütçe Yönetimi</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Free WKZ için Çoklu Hedef Sistemi -->
                            <div class="row" id="target-ciro-container" style="display: none;">
                                <div class="col-12">
                                    <div class="mb-3">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <label class="form-label mb-0">Ciro Hedefleri ve Prim Oranları *</label>
                                            <button type="button" class="btn btn-sm btn-outline-primary" id="add-target-level-btn" onclick="addTargetLevel()">
                                                <i class="fas fa-plus me-1"></i>Hedef Ekle
                                            </button>
                                        </div>
                                        <div class="border rounded p-3 mb-2">
                                            <div class="row mb-2">
                                                <div class="col-md-3"><strong>Ciro Hedefi (₺)</strong></div>
                                                <div class="col-md-2"><strong>Prim Oranı (%)</strong></div>
                                                <div class="col-md-2"><strong>KDV Durumu</strong></div>
                                                <div class="col-md-2"><strong>Tahmini Bütçe (₺)</strong></div>
                                                <div class="col-md-3"><strong>İşlemler</strong></div>
                                            </div>
                                            <div id="target-levels-container">
                                                <!-- Hedef seviyeleri buraya eklenecek -->
                                            </div>
                                        </div>
                                        <div class="form-text">Örnek: 100.000₺ için %5, 150.000₺ için %6, 200.000₺ için %7. KDV durumu sadece bilgi amaçlıdır.</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Kanal *</label>
                                        <select class="form-select" id="plan-channel" required onchange="loadRegions()">
                                            <option value="">Seçiniz</option>
                                            <option value="1">Media Markt</option>
                                            <option value="2">Teknosa</option>
                                            <option value="3">Vatan Bilgisayar</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Bölge</label>
                                        <select class="form-select" id="plan-region" onchange="loadStores()">
                                            <option value="">Önce kanal seçiniz</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Başlangıç Tarihi *</label>
                                        <input type="date" class="form-control" id="start-date" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Bitiş Tarihi *</label>
                                        <input type="date" class="form-control" id="end-date" required>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-12">
                                    <div class="mb-3">
                                        <label class="form-label">Açıklama</label>
                                        <textarea class="form-control" id="plan-description" rows="3"></textarea>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="d-flex justify-content-end">
                                <button type="button" class="btn btn-secondary me-2" onclick="showSection('dashboard')">İptal</button>
                                <button type="submit" id="submit-game-plan-btn" class="btn btn-primary">Oyun Planı Oluştur</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Oyun planı oluşturma formunu yükleyen fonksiyon (global)
window.loadCreateForm = function() {
    console.log('loadCreateForm() fonksiyonu çağrıldı');
    
    const container = document.getElementById('create-form-container');
    if (!container) {
        console.error('create-form-container elementi bulunamadı!');
        return;
    }
    
    console.log('create-form-container elementi bulundu, form yükleniyor...');
    
    // Form HTML'ini oluştur
    const formHTML = getGamePlanFormHTML();
    container.innerHTML = formHTML;
    
    console.log('Oyun planı oluşturma formu yüklendi');
}

// Bölüm gösterme fonksiyonu (global)
window.showSection = function(sectionName) {
    // Tüm bölümleri gizle
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Tüm menü linklerini pasif yap
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Seçilen bölümü göster
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Seçilen menü linkini aktif yap
    const activeLink = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Bölüme özel veri yükleme
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'create':
            loadCreateForm();
            break;
        case 'pending':
            loadPendingPlans();
            break;
        case 'active':
            loadActivePlans();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

// Oyun planı detayını görüntüleme fonksiyonu
function viewGamePlan(planId) {
    console.log('Oyun planı detayı görüntüleniyor:', planId);
    // Bu fonksiyon daha sonra detay sayfası için kullanılacak
    showAlert('Oyun planı detay sayfası yakında eklenecek', 'info');
}

// Oyun planı oluşturma formunu yükleyen fonksiyon
function loadCreateForm() {
    console.log('Oyun planı oluşturma formu yükleniyor...');
    const container = document.getElementById('create-form-container');
    if (!container) {
        console.error('create-form-container bulunamadı!');
        return;
    }
    
    container.innerHTML = `
        <div class="row">
            <div class="col-12">
                <div class="card shadow">
                    <div class="card-header">
                        <h5 class="mb-0">Oyun Planı Bilgileri</h5>
                    </div>
                    <div class="card-body">
                        <form id="create-game-plan-form">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Oyun Planı Başlığı *</label>
                                        <input type="text" class="form-control" id="plan-title" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Oyun Planı Türü *</label>
                                        <select class="form-select" id="plan-type" required onchange="handleTypeChange()">
                                            <option value="">Seçiniz</option>
                                            <option value="free_wkz">Free WKZ</option>
                                            <option value="product_prim">Ürün Başına Prim</option>
                                            <option value="sipft">Sipft</option>
                                            <option value="budget">Bütçe Yönetimi</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Free WKZ için Çoklu Hedef Sistemi -->
                            <div class="row" id="target-ciro-container" style="display: none;">
                                <div class="col-12">
                                    <div class="mb-3">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <label class="form-label mb-0">Ciro Hedefleri ve Prim Oranları *</label>
                                            <button type="button" class="btn btn-sm btn-outline-primary" id="add-target-level-btn" onclick="addTargetLevel()">
                                                <i class="fas fa-plus me-1"></i>Hedef Ekle
                                            </button>
                                        </div>
                                        <div class="border rounded p-3 mb-2">
                                            <div class="row mb-2">
                                                <div class="col-md-3"><strong>Ciro Hedefi (₺)</strong></div>
                                                <div class="col-md-2"><strong>Prim Oranı (%)</strong></div>
                                                <div class="col-md-2"><strong>KDV Durumu</strong></div>
                                                <div class="col-md-2"><strong>Tahmini Bütçe (₺)</strong></div>
                                                <div class="col-md-3"><strong>İşlemler</strong></div>
                                            </div>
                                            <div id="target-levels-container">
                                                <!-- Hedef seviyeleri buraya eklenecek -->
                                            </div>
                                        </div>
                                        <div class="form-text">Örnek: 100.000₺ için %5, 150.000₺ için %6, 200.000₺ için %7. KDV durumu sadece bilgi amaçlıdır.</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Kanal *</label>
                                        <select class="form-select" id="plan-channel" required onchange="loadRegions()">
                                            <option value="">Seçiniz</option>
                                            <option value="1">Media Markt</option>
                                            <option value="2">Teknosa</option>
                                            <option value="3">Vatan Bilgisayar</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Bölge</label>
                                        <select class="form-select" id="plan-region" onchange="loadStores()">
                                            <option value="">Önce kanal seçiniz</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Başlangıç Tarihi *</label>
                                        <input type="date" class="form-control" id="start-date" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Bitiş Tarihi *</label>
                                        <input type="date" class="form-control" id="end-date" required>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Mağaza Seçimi -->
                            <div class="mb-3" id="store-selection-container" style="display: none;">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <label class="form-label mb-0">Mağaza Seçimi</label>
                                    <button type="button" class="btn btn-sm btn-outline-primary" id="add-store-btn">
                                        <i class="fas fa-plus me-1"></i>Başka Mağaza Ekle
                                    </button>
                                </div>
                                
                                <!-- Seçilen Mağazalar -->
                                <div class="border rounded p-3 mb-3" style="max-height: 200px; overflow-y: auto;">
                                    <h6 class="mb-3">Seçilen Mağazalar</h6>
                                    <div id="selected-stores-list">
                                        <p class="text-muted">Henüz mağaza seçilmedi</p>
                                    </div>
                                </div>
                                
                                <!-- Mağaza Arama ve Seçimi -->
                                <div class="border rounded p-3" style="max-height: 300px; overflow-y: auto;">
                                    <div class="row mb-3">
                                        <div class="col-md-8">
                                            <div class="input-group">
                                                <input type="text" class="form-control" id="store-search" placeholder="Mağaza adı ile arayın..." onkeyup="searchStores()">
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <button class="btn btn-primary w-100" type="button" id="select-all-stores-btn">
                                                <i class="fas fa-check-square me-1"></i>Tümünü Seç
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <!-- Arama Sonuçları -->
                                    <div id="store-search-results" class="mb-3" style="max-height: 200px; overflow-y: auto;">
                                        <!-- Arama sonuçları buraya eklenecek -->
                                    </div>
                                </div>
                            </div>
                            
                            
                            <!-- Prim Oranı -->
                            <div class="row" id="percentage-container" style="display: none;">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Prim Oranı (%)</label>
                                        <input type="number" class="form-control" id="percentage" step="0.01" min="0" max="100">
                                    </div>
                                </div>
                            </div>
                            
                            
                            <!-- Ürün Arama ve Seçimi (Ürün Başına Prim için) -->
                            <div class="mb-3" id="product-search-container" style="display: none;">
                                <label class="form-label">Ürün Seçimi</label>
                                
                                <!-- Ürün Arama -->
                                <div class="row mb-3">
                                    <div class="col-md-8">
                                            <div class="input-group">
                                                <input type="text" class="form-control" id="product-search" placeholder="Ürün kodu veya ismi ile arayın..." onkeyup="searchProducts()">
                                            </div>
                                    </div>
                                    <div class="col-md-4">
                                        <button class="btn btn-primary w-100" type="button" id="add-product-btn">
                                            <i class="fas fa-plus me-1"></i>Ürün Ekle
                                        </button>
                                    </div>
                                </div>
                                
                                <!-- Arama Sonuçları -->
                                <div id="product-search-results" class="border rounded p-3 mb-3" style="max-height: 200px; overflow-y: auto; display: none;">
                                    <!-- Arama sonuçları buraya eklenecek -->
                                </div>
                                
                                <!-- Seçilen Ürünler -->
                                <div class="border rounded p-3" style="max-height: 300px; overflow-y: auto;">
                                    <h6 class="mb-3">Seçilen Ürünler</h6>
                                    <div id="selected-products-list">
                                        <p class="text-muted">Henüz ürün seçilmedi</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Açıklama</label>
                                <textarea class="form-control" id="plan-description" rows="3"></textarea>
                            </div>
                            
                            <div class="d-flex justify-content-end">
                                <button type="button" class="btn btn-secondary me-2" onclick="showSection('dashboard')">İptal</button>
                                <button type="submit" id="submit-game-plan-btn" class="btn btn-primary">Oyun Planı Oluştur</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Form submit event'ini KALDIR - sadece submit butonuna click listener ekle
    const form = document.getElementById('create-game-plan-form');
    if (form) {
        // Form submit event'ini kaldır
        // form.addEventListener('submit', handleCreateGamePlan);
        
        // Tüm butonlara click event listener ekle (form submit'i engellemek için)
        form.addEventListener('click', function(event) {
            const target = event.target;
            if (target.tagName === 'BUTTON' && target.type === 'button') {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                console.log('Button click engellendi:', target.id);
                return false;
            }
        }, true); // capture phase'de çalıştır
        
        // Buton event listener'larını ekle
        setTimeout(() => {
            const addStoreBtn = document.getElementById('add-store-btn');
            if (addStoreBtn) {
                addStoreBtn.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    console.log('Başka Mağaza Ekle butonuna tıklandı');
                    showAddStoreModal();
                    return false;
                });
            }
            
            const selectAllStoresBtn = document.getElementById('select-all-stores-btn');
            if (selectAllStoresBtn) {
                selectAllStoresBtn.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    console.log('Tümünü Seç butonuna tıklandı');
                    toggleAllStores();
                    return false;
                });
            }
            
            // Hedef Ekle butonunu bul ve event listener ekle
            const addTargetLevelBtn = document.getElementById('add-target-level-btn');
            if (addTargetLevelBtn) {
                console.log('Hedef Ekle butonu bulundu, event listener ekleniyor');
                
                // Önce mevcut event listener'ları temizle
                addTargetLevelBtn.removeEventListener('click', addTargetLevelHandler);
                
                // Yeni event listener ekle
                addTargetLevelBtn.addEventListener('click', addTargetLevelHandler);
                
                // Global olarak da erişilebilir yap
                window.addTargetLevel = addTargetLevel;
                
            } else {
                console.error('Hedef Ekle butonu bulunamadı!');
            }
            
            const addProductBtn = document.getElementById('add-product-btn');
            if (addProductBtn) {
                addProductBtn.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    console.log('Ürün Ekle butonuna tıklandı');
                    showAddProductModal();
                    return false;
                });
            }
            
            // Submit butonuna özel click listener ekle
            const submitBtn = document.getElementById('submit-game-plan-btn');
            if (submitBtn) {
                submitBtn.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    console.log('Submit butonuna tıklandı - handleCreateGamePlan çağrılıyor');
                    handleCreateGamePlan(event);
                    return false;
                });
            } else {
                console.error('Submit butonu bulunamadı!');
            }
        }, 100);
    }
}

// Oyun planı oluşturma işlemini yöneten fonksiyon
async function handleCreateGamePlan(event) {
    event.preventDefault();
    
    console.log('Oyun planı oluşturma işlemi başlatılıyor');
    
    try {
        const planType = document.getElementById('plan-type').value;

        // Seçilen mağazaları al (yeni sistemden) - güvenli şekilde
        const storeAssignments = (selectedStores || []).map(store => ({
            store_id: store.id,
            target_value: 0, // Hedef değerler kaldırıldı
            target_quantity: 0 // Hedef adet kaldırıldı
        }));
        
        if (storeAssignments.length === 0) {
            if (typeof showAlert === 'function') {
                showAlert('En az bir mağaza seçmelisiniz!', 'danger');
            } else {
                alert('En az bir mağaza seçmelisiniz!');
            }
            return;
        }
        
        // Element varlığını kontrol et
        const titleElement = document.getElementById('plan-title');
        const descriptionElement = document.getElementById('plan-description');
        const typeElement = document.getElementById('plan-type');
        const startDateElement = document.getElementById('start-date');
        const endDateElement = document.getElementById('end-date');
        
        console.log('Form elementleri kontrol ediliyor:', {
            titleElement: !!titleElement,
            descriptionElement: !!descriptionElement,
            typeElement: !!typeElement,
            startDateElement: !!startDateElement,
            endDateElement: !!endDateElement
        });
        
        if (!titleElement || !descriptionElement || !typeElement || !startDateElement || !endDateElement) {
            console.error('Eksik form elementleri:', {
                titleElement: titleElement,
                descriptionElement: descriptionElement,
                typeElement: typeElement,
                startDateElement: startDateElement,
                endDateElement: endDateElement
            });
            
            if (typeof showAlert === 'function') {
                showAlert('Form elementleri bulunamadı! Sayfayı yenileyin.', 'danger');
            } else {
                alert('Form elementleri bulunamadı! Sayfayı yenileyin.');
            }
            return;
        }
        
        const formData = {
            title: titleElement.value,
            description: descriptionElement.value,
            type: typeElement.value,
            target_type: storeAssignments.length === 1 ? 'single_store' : 'multi_store',
            target_value: null, // Çoklu hedef sistemi için null, sonra güncellenecek
            target_quantity: null, // Hedef adet kaldırıldı
            percentage: null, // Çoklu hedef sistemi için null
            start_date: startDateElement.value,
            end_date: endDateElement.value,
            created_by: (currentUser && currentUser.id) || '00000000-0000-0000-0000-000000000000' // Geçici UUID
        };
        
        // Basit doğrulama
        if (!formData.title || !formData.type || !formData.start_date || !formData.end_date) {
            if (typeof showAlert === 'function') {
                showAlert('Lütfen tüm zorunlu alanları doldurun!', 'danger');
            } else {
                alert('Lütfen tüm zorunlu alanları doldurun!');
            }
            return;
        }

        // Free WKZ için çoklu hedef doğrulaması
        if (planType === 'free_wkz') {
            console.log('Free WKZ doğrulaması - targetLevels:', targetLevels);
            console.log('targetLevels.length:', (targetLevels || []).length);
            
            if (!targetLevels || targetLevels.length === 0) {
                console.log('HATA: targetLevels boş!');
                if (typeof showAlert === 'function') {
                    showAlert('Free WKZ oyun planı için en az bir hedef seviyesi ekleyiniz!', 'danger');
                } else {
                    alert('Free WKZ oyun planı için en az bir hedef seviyesi ekleyiniz!');
                }
                return;
            }

            // Hedef seviyelerini doğrula - sadece dolu olanları kontrol et
            console.log('Hedef seviyeleri doğrulanıyor:', targetLevels);
            
            // Boş hedef seviyelerini filtrele (ciro ve percentage 0 olanları) - güvenli şekilde
            const filledLevels = (targetLevels || []).filter(level => 
                level && level.ciro > 0 && level.percentage > 0
            );
            
            console.log('Dolu hedef seviyeleri:', filledLevels);
            
            // En az bir dolu hedef seviyesi olmalı
            if (filledLevels.length === 0) {
                console.log('HATA: Hiç dolu hedef seviyesi yok!');
                if (typeof showAlert === 'function') {
                    showAlert('En az bir hedef seviyesi için ciro ve prim oranı giriniz!', 'danger');
                } else {
                    alert('En az bir hedef seviyesi için ciro ve prim oranı giriniz!');
                }
                return;
            }

            // En yüksek hedefi target_value olarak kaydet (sadece dolu seviyelerden)
            const maxTarget = Math.max(...filledLevels.map(level => level.ciro));
            formData.target_value = maxTarget;
            
            console.log('En yüksek hedef:', maxTarget);
        } else {
            // Diğer oyun planı türleri için target_value'yu null yap
            formData.target_value = null;
        }

        // Tarih kontrolü
        if (new Date(formData.start_date) >= new Date(formData.end_date)) {
            if (typeof showAlert === 'function') {
                showAlert('Bitiş tarihi başlangıç tarihinden sonra olmalıdır!', 'danger');
            } else {
                alert('Bitiş tarihi başlangıç tarihinden sonra olmalıdır!');
            }
            return;
        }
        
        // Özet popup'ını göster - güvenli şekilde
        showGamePlanSummary(formData, storeAssignments, selectedStores || [], selectedProducts || [], targetLevels || []);
        
    } catch (error) {
        console.error('Form doğrulama hatası:', error);
        if (typeof showAlert === 'function') {
            showAlert('Form doğrulama sırasında hata oluştu: ' + error.message, 'danger');
        } else {
            alert('Form doğrulama sırasında hata oluştu: ' + error.message);
        }
    }
}

// Oyun planı özet popup'ını gösteren fonksiyon
function showGamePlanSummary(formData, storeAssignments, selectedStores, selectedProducts, targetLevels) {
    // Popup HTML'i oluştur
    const popupHTML = `
        <div class="modal fade" id="gamePlanSummaryModal" tabindex="-1" aria-labelledby="gamePlanSummaryModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title" id="gamePlanSummaryModalLabel">
                            <i class="fas fa-clipboard-check me-2"></i>Oyun Planı Özeti
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6 class="text-primary mb-3">Genel Bilgiler</h6>
                                <table class="table table-sm">
                                    <tr>
                                        <td><strong>Başlık:</strong></td>
                                        <td>${formData.title}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Açıklama:</strong></td>
                                        <td>${formData.description || 'Açıklama yok'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Tür:</strong></td>
                                        <td><span class="badge bg-info">${getPlanTypeName(formData.type)}</span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Hedef Türü:</strong></td>
                                        <td><span class="badge bg-secondary">${formData.target_type === 'single_store' ? 'Tek Mağaza' : 'Çoklu Mağaza'}</span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Başlangıç:</strong></td>
                                        <td>${formatDate(formData.start_date)}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Bitiş:</strong></td>
                                        <td>${formatDate(formData.end_date)}</td>
                                    </tr>
                                </table>
                            </div>
                            <div class="col-md-6">
                                <h6 class="text-primary mb-3">Seçilen Mağazalar (${selectedStores.length})</h6>
                                <div class="max-height-200 overflow-auto">
                                    ${selectedStores.map(store => `
                                        <div class="d-flex justify-content-between align-items-center border-bottom py-1">
                                            <div>
                                                <strong>${store.name}</strong>
                                                <br><small class="text-muted">${store.manager_name || 'Manager yok'}</small>
                                            </div>
                                            <span class="badge bg-success">Eklendi</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        
                        ${formData.type === 'free_wkz' ? `
                            <div class="mt-4">
                                <h6 class="text-primary mb-3">Free WKZ Hedef Seviyeleri</h6>
                                <div class="table-responsive">
                                    <table class="table table-sm table-striped">
                                        <thead>
                                            <tr>
                                                <th>Ciro Hedefi</th>
                                                <th>Prim Oranı</th>
                                                <th>KDV Durumu</th>
                                                <th>Tahmini Bütçe</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${targetLevels.map(level => `
                                                <tr>
                                                    <td>${formatCurrency(level.ciro)}₺</td>
                                                    <td>%${level.percentage}</td>
                                                    <td><span class="badge ${level.tax === 'dahil' ? 'bg-success' : 'bg-warning'}">${level.tax === 'dahil' ? 'KDV Dahil' : 'KDV Hariç'}</span></td>
                                                    <td>${formatCurrency(level.budget)}₺</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${(formData.type === 'product_prim' || formData.type === 'sipft') && selectedProducts.length > 0 ? `
                            <div class="mt-4">
                                <h6 class="text-primary mb-3">Seçilen Ürünler (${selectedProducts.length})</h6>
                                <div class="table-responsive">
                                    <table class="table table-sm table-striped">
                                        <thead>
                                            <tr>
                                                <th>Ürün Kodu</th>
                                                <th>Ürün Adı</th>
                                                <th>Destek Tutarı</th>
                                                <th>KDV Durumu</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${selectedProducts.map(product => `
                                                <tr>
                                                    <td>${product.code}</td>
                                                    <td>${product.name}</td>
                                                    <td>${formatCurrency(product.support_amount)}₺</td>
                                                    <td><span class="badge ${product.tax_included ? 'bg-success' : 'bg-warning'}">${product.tax_included ? 'KDV Dahil' : 'KDV Hariç'}</span></td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-edit me-1"></i>Düzenle
                        </button>
                        <button type="button" class="btn btn-primary" onclick="confirmCreateGamePlan()">
                            <i class="fas fa-paper-plane me-1"></i>Onaya Gönder
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Mevcut popup'ı kaldır
    const existingModal = document.getElementById('gamePlanSummaryModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Yeni popup'ı ekle
    document.body.insertAdjacentHTML('beforeend', popupHTML);
    
    // Modal'ı göster
    const modal = new bootstrap.Modal(document.getElementById('gamePlanSummaryModal'));
    modal.show();
    
    // Modal kapandığında popup'ı kaldır
    document.getElementById('gamePlanSummaryModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Oyun planı türü adını döndüren fonksiyon
function getPlanTypeName(type) {
    const typeNames = {
        'free_wkz': 'Free WKZ',
        'product_prim': 'Ürün Başına Prim',
        'sipft': 'Sipft',
        'budget': 'Bütçe Yönetimi'
    };
    return typeNames[type] || type;
}

// Tarih formatlama fonksiyonu
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Oyun planı onaylama fonksiyonu
async function confirmCreateGamePlan() {
    // Modal'ı kapat
    const modal = bootstrap.Modal.getInstance(document.getElementById('gamePlanSummaryModal'));
    if (modal) {
        modal.hide();
    }
    
    // Oyun planını oluştur
    await createGamePlan();
}

// Gerçek oyun planı oluşturma fonksiyonu
async function createGamePlan() {
    let hideLoading = null;
    
    try {
        const planType = document.getElementById('plan-type').value;
        const storeAssignments = selectedStores.map(store => ({
            store_id: store.id,
            target_value: 0,
            target_quantity: 0
        }));
        
        // Element varlığını kontrol et
        const titleElement = document.getElementById('plan-title');
        const descriptionElement = document.getElementById('plan-description');
        const typeElement = document.getElementById('plan-type');
        const startDateElement = document.getElementById('start-date');
        const endDateElement = document.getElementById('end-date');
        
        if (!titleElement || !descriptionElement || !typeElement || !startDateElement || !endDateElement) {
            console.error('createGamePlan: Form elementleri bulunamadı');
            if (typeof showAlert === 'function') {
                showAlert('Form elementleri bulunamadı! Sayfayı yenileyin.', 'danger');
            } else {
                alert('Form elementleri bulunamadı! Sayfayı yenileyin.');
            }
            return;
        }
        
        const formData = {
            title: titleElement.value,
            description: descriptionElement.value,
            type: typeElement.value,
            target_type: storeAssignments.length === 1 ? 'single_store' : 'multi_store',
            target_value: null,
            target_quantity: null,
            percentage: null,
            start_date: startDateElement.value,
            end_date: endDateElement.value,
            status: 'pending_account_manager', // Account Manager onayı bekliyor
            created_by: (currentUser && currentUser.id) || '00000000-0000-0000-0000-000000000000'
        };

        // Free WKZ için hedef değeri ayarla
        if (planType === 'free_wkz') {
            const maxTarget = Math.max(...targetLevels.map(level => level.ciro));
            formData.target_value = maxTarget;
        }

        // Yükleme göstergesi
        const submitBtn = document.querySelector('#create-game-plan-form button[type="submit"]');
        if (submitBtn && typeof showLoading === 'function') {
            hideLoading = showLoading(submitBtn);
        }
        
        // Oyun planını oluştur
        const { data: gamePlan, error: planError } = await supabase
            .from('game_plans')
            .insert([formData])
            .select()
            .single();

        if (planError) throw planError;

        // Mağaza atamalarını oluştur
        const { error: assignmentError } = await supabase
            .from('game_plan_stores')
            .insert(storeAssignments.map(assignment => ({
                ...assignment,
                game_plan_id: gamePlan.id
            })));

        if (assignmentError) throw assignmentError;

        // Ürün detaylarını oluştur (product_prim ve sipft için)
        if ((planType === 'product_prim' || planType === 'sipft') && selectedProducts.length > 0) {
            const productDetails = selectedProducts.map(product => ({
                game_plan_id: gamePlan.id,
                product_code: product.code,
                product_name: product.name,
                prim_amount: product.support_amount
            }));

            const { error: productError } = await supabase
                .from('game_plan_products')
                .insert(productDetails);
            
            if (productError) throw productError;
        }
        
        // Mail gönderme işlemi
        await sendGamePlanNotificationEmails(gamePlan, 'created');
        
        if (typeof showAlert === 'function') {
            showAlert('Oyun planı başarıyla oluşturuldu ve onaya gönderildi! Bildirim e-postaları gönderildi.', 'success');
        } else {
            alert('Oyun planı başarıyla oluşturuldu ve onaya gönderildi! Bildirim e-postaları gönderildi.');
        }
        
        // Formu temizle
        document.getElementById('create-game-plan-form').reset();
        selectedProducts = [];
        selectedStores = [];
        targetLevels = [];
        updateSelectedProductsList();
        updateSelectedStoresList();

        // Çoklu hedef sistemini temizle
        const targetLevelsContainer = document.getElementById('target-levels-container');
        if (targetLevelsContainer) {
            targetLevelsContainer.innerHTML = '';
        }

        // Dashboard'a dön
        showSection('dashboard');

        // Verileri yenile
        await loadGamePlans();
        updateStatistics();
        displayRecentPlans();
        
    } catch (error) {
        console.error('Oyun planı oluşturma hatası:', error);
        if (typeof showAlert === 'function') {
            showAlert('Oyun planı oluşturulurken hata oluştu: ' + error.message, 'danger');
        } else {
            alert('Oyun planı oluşturulurken hata oluştu: ' + error.message);
        }
    } finally {
        if (hideLoading) hideLoading();
    }
}

// Mail gönderme fonksiyonu
async function sendGamePlanNotificationEmails(gamePlan, action) {
    try {
        // Admin, oluşturan kişi ve onaylayacak kişilerin e-postalarını al
        const emails = await getNotificationEmails(gamePlan, action);
        
        // Mail içeriğini hazırla
        const mailContent = prepareMailContent(gamePlan, action);
        
        // Her e-postaya gönder
        for (const email of emails) {
            await sendEmail(email, mailContent.subject, mailContent.body);
        }
        
        console.log('Bildirim e-postaları gönderildi:', emails);
        
    } catch (error) {
        console.error('Mail gönderme hatası:', error);
        // Mail hatası oyun planı oluşturmayı engellemez
    }
}

// Bildirim e-postalarını alan fonksiyon
async function getNotificationEmails(gamePlan, action) {
    const emails = [];
    
    try {
        // Admin e-postalarını al
        const { data: admins } = await supabase
            .from('users')
            .select('email')
            .eq('role', 'admin');
        
        if (admins) {
            emails.push(...admins.map(admin => admin.email));
        }
        
        // Oluşturan kişinin e-postasını al
        if (gamePlan.created_by) {
            const { data: creator } = await supabase
                .from('users')
                .select('email')
                .eq('id', gamePlan.created_by)
                .single();
            
            if (creator && creator.email) {
                emails.push(creator.email);
            }
        }
        
        // Onaylayacak kişilerin e-postalarını al
        const { data: approvers } = await supabase
            .from('users')
            .select('email')
            .in('role', ['account_manager', 'marketing_manager']);
        
        if (approvers) {
            emails.push(...approvers.map(approver => approver.email));
        }
        
        // Tekrarlanan e-postaları kaldır
        return [...new Set(emails)];
        
    } catch (error) {
        console.error('E-posta listesi alınırken hata:', error);
        return [];
    }
}

// Mail içeriğini hazırlayan fonksiyon
function prepareMailContent(gamePlan, action) {
    const planTypeNames = {
        'free_wkz': 'Free WKZ',
        'product_prim': 'Ürün Başına Prim',
        'sipft': 'Sipft',
        'budget': 'Bütçe Yönetimi'
    };
    
    const actionNames = {
        'created': 'Oluşturuldu',
        'approved_account': 'Account Manager Tarafından Onaylandı',
        'approved_marketing': 'Pazarlama Müdürü Tarafından Onaylandı',
        'rejected': 'Reddedildi'
    };
    
    const subject = `Oyun Planı ${actionNames[action]} - ${gamePlan.title}`;
    
    const body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #007bff; color: white; padding: 20px; text-align: center;">
                <h2>Oyun Planı Bildirimi</h2>
            </div>
            
            <div style="padding: 20px; background-color: #f8f9fa;">
                <h3>${gamePlan.title}</h3>
                <p><strong>Durum:</strong> ${actionNames[action]}</p>
                <p><strong>Tür:</strong> ${planTypeNames[gamePlan.type]}</p>
                <p><strong>Başlangıç Tarihi:</strong> ${formatDate(gamePlan.start_date)}</p>
                <p><strong>Bitiş Tarihi:</strong> ${formatDate(gamePlan.end_date)}</p>
                
                ${gamePlan.description ? `<p><strong>Açıklama:</strong> ${gamePlan.description}</p>` : ''}
                
                <div style="margin-top: 20px; padding: 15px; background-color: white; border-left: 4px solid #007bff;">
                    <p><strong>Sonraki Adım:</strong></p>
                    ${action === 'created' ? 
                        '<p>Bu oyun planı Account Manager onayı bekliyor. Lütfen sisteme giriş yaparak onaylayın.</p>' :
                        action === 'approved_account' ?
                        '<p>Bu oyun planı Pazarlama Müdürü onayı bekliyor. Lütfen sisteme giriş yaparak onaylayın.</p>' :
                        action === 'approved_marketing' ?
                        '<p>Bu oyun planı onaylandı ve aktif hale getirildi.</p>' :
                        '<p>Bu oyun planı reddedildi. Lütfen sisteme giriş yaparak detayları görüntüleyin.</p>'
                    }
                </div>
                
                <div style="margin-top: 20px; text-align: center;">
                    <a href="${window.location.origin}/game-plans-dashboard.html" 
                       style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                        Sisteme Git
                    </a>
                </div>
            </div>
            
            <div style="background-color: #6c757d; color: white; padding: 10px; text-align: center; font-size: 12px;">
                <p>Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.</p>
            </div>
        </div>
    `;
    
    return { subject, body };
}

// E-posta gönderme fonksiyonu (mock - gerçek uygulamada API çağrısı yapılır)
async function sendEmail(to, subject, body) {
    // Gerçek uygulamada burada e-posta servisi API'si çağrılır
    // Örnek: SendGrid, Mailgun, AWS SES, vb.
    
    console.log('E-posta gönderiliyor:', {
        to: to,
        subject: subject,
        body: body.substring(0, 100) + '...'
    });
    
    // Mock başarılı gönderim
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`E-posta ${to} adresine gönderildi`);
            resolve(true);
        }, 1000);
    });
}

// Onay bekleyen planları yükleyen fonksiyon
function loadPendingPlans() {
    const container = document.getElementById('pending-plans-container');
    if (!container) return;
    
    const pendingPlans = allGamePlans.filter(plan => 
        plan.status === 'pending_account_manager' || 
        plan.status === 'pending_marketing_manager'
    );
    
    if (pendingPlans.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-clock fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">Onay bekleyen oyun planı yok</h5>
            </div>
        `;
        return;
    }
    
    container.innerHTML = pendingPlans.map(plan => `
        <div class="card mb-3 game-plan-card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="card-title text-primary">${plan.title}</h6>
                        <p class="card-text text-muted small mb-2">${plan.description || 'Açıklama yok'}</p>
                        
                        <div class="row mb-2">
                            <div class="col-md-6">
                                <small class="text-muted">
                                    <i class="fas fa-calendar me-1"></i>
                                    ${formatDate(plan.start_date)} - ${formatDate(plan.end_date)}
                                </small>
                            </div>
                            <div class="col-md-6">
                                <small class="text-muted">
                                    <i class="fas fa-user me-1"></i>
                                    Oluşturan: ${plan.creator_name || 'Bilinmiyor'}
                                </small>
                            </div>
                        </div>
                        
                        <div class="d-flex gap-2 mb-2">
                            <span class="badge bg-info">${getPlanTypeName(plan.type)}</span>
                            <span class="badge bg-warning">${getStatusName(plan.status)}</span>
                            <span class="badge bg-secondary">${plan.target_type === 'single_store' ? 'Tek Mağaza' : 'Çoklu Mağaza'}</span>
                        </div>
                        
                        ${plan.target_value ? `
                            <div class="mt-2">
                                <small class="text-muted">
                                    <i class="fas fa-target me-1"></i>
                                    Hedef: ${formatCurrency(plan.target_value)}₺
                                </small>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="text-end">
                        <small class="text-muted d-block mb-2">
                            <i class="fas fa-clock me-1"></i>
                            ${formatDateTime(plan.created_at)}
                        </small>
                        
                        <div class="btn-group-vertical btn-group-sm">
                            <button class="btn btn-outline-primary mb-1" onclick="viewGamePlan('${plan.id}')">
                                <i class="fas fa-eye me-1"></i>Detayları Gör
                            </button>
                            
                            ${plan.status === 'pending_account_manager' ? `
                                <button class="btn btn-success mb-1" onclick="approveGamePlan('${plan.id}', 'account_manager')">
                                    <i class="fas fa-check me-1"></i>Account Manager Onayı
                                </button>
                            ` : ''}
                            
                            ${plan.status === 'pending_marketing_manager' ? `
                                <button class="btn btn-success mb-1" onclick="approveGamePlan('${plan.id}', 'marketing_manager')">
                                    <i class="fas fa-check me-1"></i>Pazarlama Müdürü Onayı
                                </button>
                            ` : ''}
                            
                            <button class="btn btn-danger" onclick="rejectGamePlan('${plan.id}')">
                                <i class="fas fa-times me-1"></i>Reddet
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Aktif planları yükleyen fonksiyon
function loadActivePlans() {
    const container = document.getElementById('active-plans-container');
    if (!container) return;
    
    const activePlans = allGamePlans.filter(plan => plan.status === 'active');
    
    if (activePlans.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-play-circle fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">Aktif oyun planı yok</h5>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    activePlans.forEach(plan => {
        const planCard = createGamePlanCard(plan);
        container.appendChild(planCard);
    });
}

// Raporları yükleyen fonksiyon
function loadReports() {
    const container = document.getElementById('reports-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="text-center py-5">
            <i class="fas fa-chart-bar fa-3x text-muted mb-3"></i>
            <h5 class="text-muted">Performans raporları yakında eklenecek</h5>
            <p class="text-muted">Detaylı performans analizi ve raporlama özellikleri geliştiriliyor.</p>
        </div>
    `;
}

// Oyun planı türü değiştiğinde çalışan fonksiyon (global)
window.handleTypeChange = function() {
    const planType = document.getElementById('plan-type').value;
    console.log('handleTypeChange() çağrıldı, planType:', planType);
    
    const percentageContainer = document.getElementById('percentage-container');
    const targetCiroContainer = document.getElementById('target-ciro-container');
    const storeSelectionContainer = document.getElementById('store-selection-container');
    const productSearchContainer = document.getElementById('product-search-container');
    
    console.log('Container elementleri:', {
        percentageContainer: !!percentageContainer,
        targetCiroContainer: !!targetCiroContainer,
        storeSelectionContainer: !!storeSelectionContainer,
        productSearchContainer: !!productSearchContainer
    });
    
    // Tüm container'ları gizle
    if (percentageContainer) percentageContainer.style.display = 'none';
    if (targetCiroContainer) targetCiroContainer.style.display = 'none';
    if (storeSelectionContainer) storeSelectionContainer.style.display = 'none';
    if (productSearchContainer) productSearchContainer.style.display = 'none';
    
    // Türüne göre gerekli alanları göster
    switch(planType) {
        case 'free_wkz':
            console.log('Free WKZ seçildi, targetCiroContainer gösteriliyor');
            if (targetCiroContainer) {
                targetCiroContainer.style.display = 'block';
                console.log('targetCiroContainer gösterildi');
                // Çoklu hedef sistemini başlat
                setTimeout(() => {
                    console.log('initializeTargetLevels() çağrılıyor (100ms gecikme ile)');
                    initializeTargetLevels();
                }, 100);
            } else {
                console.error('targetCiroContainer elementi bulunamadı!');
            }
            if (storeSelectionContainer) storeSelectionContainer.style.display = 'block';
            break;
        case 'product_prim':
            if (storeSelectionContainer) storeSelectionContainer.style.display = 'block';
            if (productSearchContainer) productSearchContainer.style.display = 'block';
            break;
        case 'sipft':
            if (storeSelectionContainer) storeSelectionContainer.style.display = 'block';
            if (productSearchContainer) productSearchContainer.style.display = 'block';
            break;
        case 'budget':
            if (storeSelectionContainer) storeSelectionContainer.style.display = 'block';
            break;
    }
}

// Kanal seçildiğinde bölgeleri yükleyen fonksiyon
async function loadRegions() {
    const channelId = document.getElementById('plan-channel').value;
    const regionSelect = document.getElementById('plan-region');
    const storeSelectionContainer = document.getElementById('store-selection-container');
    
    if (!channelId) {
        regionSelect.innerHTML = '<option value="">Önce kanal seçiniz</option>';
        if (storeSelectionContainer) storeSelectionContainer.style.display = 'none';
        return;
    }
    
    try {
        // Mağaza verilerinden manager'ları bölge olarak al
        const { data: stores, error } = await supabase
            .from('stores')
            .select(`
                region_id,
                regions(name),
                manager_id,
                users(name)
            `)
            .eq('channel_id', channelId)
            .eq('is_active', true);
        
        if (error) throw error;
        
        regionSelect.innerHTML = '<option value="">Bölge Seçiniz</option>';
        
        if (stores && stores.length > 0) {
            // Benzersiz bölgeleri al
            const uniqueRegions = new Map();
            stores.forEach(store => {
                if (store.region_id && store.regions) {
                    uniqueRegions.set(store.region_id, {
                        id: store.region_id,
                        name: store.regions.name
                    });
                }
            });
            
            // Bölgeleri ekle
            Array.from(uniqueRegions.values()).forEach(region => {
                const option = document.createElement('option');
                option.value = region.id;
                option.textContent = region.name;
                regionSelect.appendChild(option);
            });
            
            // Teknosa ve Vatan için tüm mağazalar seçeneği
            if (channelId == 2 || channelId == 3) {
                const allOption = document.createElement('option');
                allOption.value = 'all';
                allOption.textContent = 'Tüm Mağazalar';
                regionSelect.appendChild(allOption);
            }
        } else {
            // Teknosa ve Vatan için bölge yok, tüm mağazaları göster
            if (channelId == 2 || channelId == 3) {
                regionSelect.innerHTML = '<option value="all">Tüm Mağazalar</option>';
                await loadStores();
            }
        }
        
    } catch (error) {
        console.error('Bölgeler yüklenirken hata:', error);
        showAlert('Bölgeler yüklenirken hata oluştu: ' + error.message, 'danger');
    }
}

// Bölge seçildiğinde mağazaları yükleyen fonksiyon
async function loadStores() {
    const channelId = document.getElementById('plan-channel').value;
    const regionId = document.getElementById('plan-region').value;
    const storeSelectionContainer = document.getElementById('store-selection-container');
    
    if (!channelId) {
        if (storeSelectionContainer) storeSelectionContainer.style.display = 'none';
        return;
    }
    
    try {
        let query = supabase
            .from('stores')
            .select(`
                id, 
                name, 
                manager_id,
                regions(name)
            `)
            .eq('channel_id', channelId)
            .eq('is_active', true)
            .order('name');
        
        // Media Markt için bölge filtresi
        if (channelId == 1 && regionId && regionId !== 'all') {
            query = query.eq('region_id', regionId);
        }
        
        const { data: stores, error } = await query;
        
        if (error) throw error;
        
        // Seçilen mağazalar listesini güncelle
        if (stores && stores.length > 0) {
            // Manager isimlerini çek
            const managerIds = [...new Set(stores.map(store => store.manager_id))];
            const { data: managers, error: managerError } = await supabase
                .from('users')
                .select('id, name')
                .in('id', managerIds);
            
            if (managerError) {
                console.error('Manager isimleri çekilirken hata:', managerError);
            }
            
            // Manager isimlerini ID'ye göre eşleştir
            const managerMap = {};
            if (managers) {
                managers.forEach(manager => {
                    managerMap[manager.id] = manager.name;
                });
            }
            
            // Bölge seçildiğinde o bölgedeki mağazaları otomatik olarak seçilen listeye ekle
            selectedStores = stores.map(store => ({
                id: store.id,
                name: store.name,
                region: store.regions ? store.regions.name : 'Bölge Yok',
                manager: managerMap[store.manager_id] || 'Manager Yok'
            }));
            
            updateSelectedStoresList();
        } else {
            selectedStores = [];
            updateSelectedStoresList();
        }
        
        if (storeSelectionContainer) storeSelectionContainer.style.display = 'block';
        
    } catch (error) {
        console.error('Mağazalar yüklenirken hata:', error);
        showAlert('Mağazalar yüklenirken hata oluştu: ' + error.message, 'danger');
    }
}

// Tüm mağazaları seç/seçme fonksiyonu
async function toggleAllStores() {
    const channelId = document.getElementById('plan-channel').value;
    
    if (!channelId) {
        showAlert('Önce kanal seçiniz!', 'warning');
        return;
    }
    
    try {
        // Tüm mağazaları getir
        const { data: stores, error } = await supabase
            .from('stores')
            .select(`
                id, 
                name, 
                manager_id,
                regions(name)
            `)
            .eq('channel_id', channelId)
            .eq('is_active', true)
            .order('name');
        
        if (error) throw error;
        
        if (stores && stores.length > 0) {
            // Manager isimlerini çek
            const managerIds = [...new Set(stores.map(store => store.manager_id))];
            const { data: managers, error: managerError } = await supabase
                .from('users')
                .select('id, name')
                .in('id', managerIds);
            
            if (managerError) {
                console.error('Manager isimleri çekilirken hata:', managerError);
            }
            
            // Manager isimlerini ID'ye göre eşleştir
            const managerMap = {};
            if (managers) {
                managers.forEach(manager => {
                    managerMap[manager.id] = manager.name;
                });
            }
            
            // Tüm mağazaları seçilen listeye ekle
            selectedStores = stores.map(store => ({
                id: store.id,
                name: store.name,
                region: store.regions ? store.regions.name : 'Bölge Yok',
                manager: managerMap[store.manager_id] || 'Manager Yok'
            }));
            
            updateSelectedStoresList();
            showAlert(`${stores.length} mağaza seçildi!`, 'success');
        } else {
            showAlert('Seçilecek mağaza bulunamadı!', 'warning');
        }
        
    } catch (error) {
        console.error('Tüm mağazaları seçme hatası:', error);
        showAlert('Mağazalar seçilirken hata oluştu: ' + error.message, 'danger');
    }
}

// Seçilen ürünler listesi
let selectedProducts = [];

// Seçilen mağazalar listesi
let selectedStores = [];

// Çoklu hedef seviyeleri
let targetLevels = [];

// Hedef Ekle butonuna tıklandığında çalışan handler (global)
window.addTargetLevelHandler = function(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    console.log('Hedef Ekle butonuna tıklandı - addTargetLevel() çağrılıyor');
    addTargetLevel();
    return false;
}

// Hedef seviyesi ekleme fonksiyonu (global)
window.addTargetLevel = function() {
    console.log('addTargetLevel() fonksiyonu çağrıldı');
    
    // targetLevels array'ini başlat (eğer yoksa)
    if (!targetLevels) {
        targetLevels = [];
        console.log('targetLevels array\'i başlatıldı');
    }
    
    const container = document.getElementById('target-levels-container');
    if (!container) {
        console.error('target-levels-container elementi bulunamadı!');
        console.log('Mevcut DOM elementleri:', document.querySelectorAll('[id*="target"]));
        return;
    }
    console.log('target-levels-container elementi bulundu:', container);
    
    const levelId = Date.now(); // Basit ID
    console.log('Yeni levelId oluşturuldu:', levelId);
    
    // Yeni seviyeyi array'e ekle (boş olarak)
    targetLevels.push({
        id: levelId,
        ciro: 0,
        percentage: 0,
        tax_included: true,
        budget: 0
    });
    console.log('Yeni seviye array\'e eklendi. Toplam seviye sayısı:', targetLevels.length);
    
    const levelHtml = `
        <div class="row mb-2 target-level-row" data-level-id="${levelId}">
            <div class="col-md-3">
                <input type="text" class="form-control target-ciro-input" 
                       placeholder="Ciro hedefi giriniz" 
                       onkeyup="formatCurrency(this)"
                       onblur="updateTargetLevel(${levelId})">
            </div>
            <div class="col-md-2">
                <input type="number" class="form-control target-percentage-input" 
                       placeholder="%" step="0.01" min="0" max="100"
                       onchange="updateTargetLevel(${levelId})">
            </div>
            <div class="col-md-2">
                <select class="form-select target-tax-select" 
                        onchange="updateTargetLevel(${levelId})">
                    <option value="true">KDV Dahil</option>
                    <option value="false">KDV Hariç</option>
                </select>
            </div>
            <div class="col-md-2">
                <input type="text" class="form-control target-budget-input" 
                       readonly placeholder="0₺">
            </div>
            <div class="col-md-3">
                <button type="button" class="btn btn-sm btn-outline-danger" 
                        onclick="removeTargetLevel(${levelId})">
                    <i class="fas fa-trash"></i> Sil
                </button>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', levelHtml);
    
    console.log('Yeni hedef seviyesi eklendi. Toplam seviye sayısı:', targetLevels.length);
    console.log('Eklenen HTML:', levelHtml);
}

// Hedef seviyesi güncelleme fonksiyonu
function updateTargetLevel(levelId) {
    const row = document.querySelector(`[data-level-id="${levelId}"]`);
    if (!row) return;
    
    const ciroInput = row.querySelector('.target-ciro-input');
    const percentageInput = row.querySelector('.target-percentage-input');
    const taxSelect = row.querySelector('.target-tax-select');
    const budgetInput = row.querySelector('.target-budget-input');
    
    if (!ciroInput || !percentageInput || !taxSelect || !budgetInput) return;
    
    // Ciro değerini sayıya çevir - güvenli şekilde
    const ciroValue = parseFloat((ciroInput.value || '').replace(/[^\d]/g, '')) || 0;
    const percentageValue = parseFloat(percentageInput.value || 0) || 0;
    const taxIncluded = taxSelect.value === 'true';
    
    console.log('updateTargetLevel - Değerler:', {
        levelId: levelId,
        ciroInputValue: ciroInput.value,
        ciroValue: ciroValue,
        percentageInputValue: percentageInput.value,
        percentageValue: percentageValue,
        taxIncluded: taxIncluded
    });
    
    // Bütçe hesaplaması - Sadece prim tutarı (KDV hesaplaması yok)
    let budget = 0;
    if (ciroValue > 0 && percentageValue > 0) {
        budget = (ciroValue * percentageValue) / 100;
    }
    
    // Bütçe input'unu güncelle
    budgetInput.value = budget.toLocaleString('tr-TR') + '₺';
    
    // Mevcut seviyeyi güncelle (mutlaka bulunmalı çünkü addTargetLevel'da ekleniyor)
    const existingIndex = targetLevels.findIndex(level => level.id === levelId);
    if (existingIndex >= 0) {
        targetLevels[existingIndex] = {
            id: levelId,
            ciro: ciroValue,
            percentage: percentageValue,
            tax_included: taxIncluded,
            budget: budget
        };
        console.log('Hedef seviyesi güncellendi:', targetLevels[existingIndex]);
    } else {
        console.error('Hedef seviyesi bulunamadı! LevelId:', levelId, 'Mevcut seviyeler:', targetLevels);
    }
}

// Hedef seviyesi silme fonksiyonu
function removeTargetLevel(levelId) {
    // Event'i engelle
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const row = document.querySelector(`[data-level-id="${levelId}"]`);
    if (row) {
        row.remove();
    }
    
    // Array'den de sil
    const initialLength = targetLevels.length;
    targetLevels = targetLevels.filter(level => level.id !== levelId);
    
    console.log('Hedef seviyesi silindi. Önceki sayı:', initialLength, 'Yeni sayı:', targetLevels.length);
    return false;
}

// Para birimi formatlama fonksiyonu
function formatCurrency(input) {
    if (!input || !input.value) return;
    
    let value = (input.value || '').replace(/[^\d]/g, '');
    if (value) {
        value = parseFloat(value).toLocaleString('tr-TR');
        input.value = value;
    }
}

// Para birimi input'larını başlatma
function initializeCurrencyInputs() {
    const ciroInputs = document.querySelectorAll('.target-ciro-input');
    ciroInputs.forEach(input => {
        input.addEventListener('keyup', function() {
            formatCurrency(this);
        });
    });
}

// Çoklu hedef sistemini başlatma
function initializeTargetLevels() {
    console.log('initializeTargetLevels() fonksiyonu çağrıldı');
    const container = document.getElementById('target-levels-container');
    if (!container) {
        console.error('target-levels-container elementi bulunamadı!');
        return;
    }
    console.log('target-levels-container elementi bulundu:', container);
    
    // Mevcut hedefleri temizle
    container.innerHTML = '';
    targetLevels = [];
    
    console.log('Hedef seviyeleri başlatılıyor...');
    
    // Sadece boş bir hedef seviyesi ekle
    addTargetLevel();
    
    console.log('Hedef seviyeleri başlatıldı. Toplam sayı:', targetLevels.length);
}

// Satır güncelleme yardımcı fonksiyonu
function updateRow(row, ciro, percentage, tax, delay) {
    const ciroInput = row.querySelector('.target-ciro-input');
    const percentageInput = row.querySelector('.target-percentage-input');
    const taxSelect = row.querySelector('.target-tax-select');
    
    if (ciroInput && percentageInput && taxSelect) {
        // Değerleri ayarla
        ciroInput.value = ciro;
        percentageInput.value = percentage;
        taxSelect.value = tax;
        
        // Hemen hesapla (gecikme olmadan)
        setTimeout(() => {
            const levelId = parseInt(row.dataset.levelId);
            const budgetInput = row.querySelector('.target-budget-input');
            
            if (budgetInput) {
                const ciroValue = parseFloat(ciro.replace(/[^\d]/g, '')) || 0;
                const percentageValue = parseFloat(percentage) || 0;
                let budget = 0;
                
                if (ciroValue > 0 && percentageValue > 0) {
                    budget = (ciroValue * percentageValue) / 100;
                }
                
                budgetInput.value = budget.toLocaleString('tr-TR') + '₺';
                
                // Array'i de güncelle
                const existingIndex = targetLevels.findIndex(level => level.id === levelId);
                if (existingIndex >= 0) {
                    targetLevels[existingIndex] = {
                        id: levelId,
                        ciro: ciroValue,
                        percentage: percentageValue,
                        tax_included: tax === 'true',
                        budget: budget
                    };
                } else {
                    targetLevels.push({
                        id: levelId,
                        ciro: ciroValue,
                        percentage: percentageValue,
                        tax_included: tax === 'true',
                        budget: budget
                    });
                }
            }
        }, delay);
    }
}

// Ürün arama fonksiyonu
async function searchProducts() {
    const searchTerm = document.getElementById('product-search').value.trim();
    const resultsContainer = document.getElementById('product-search-results');
    
    if (!searchTerm) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    try {
        // Veritabanından ürünleri ara
        const { data: products, error } = await supabase
            .from('products')
            .select('id, code, name, category, brand, price')
            .eq('is_active', true)
            .or(`code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
            .order('name');
        
        if (error) throw error;
        
        const filteredProducts = products || [];
        
        if (filteredProducts.length === 0) {
            resultsContainer.innerHTML = '<p class="text-muted">Arama kriterlerine uygun ürün bulunamadı.</p>';
            resultsContainer.style.display = 'block';
        } else {
            resultsContainer.innerHTML = '';
            resultsContainer.style.display = 'block';
            filteredProducts.forEach(product => {
                const div = document.createElement('div');
                div.className = 'border-bottom py-2 d-flex justify-content-between align-items-center';
                div.innerHTML = `
                    <div>
                        <strong>${product.code}</strong> - ${product.name}
                        <br><small class="text-muted">${product.category} | ${product.brand} | ${product.price ? product.price.toLocaleString('tr-TR') + ' ₺' : 'Fiyat yok'}</small>
                    </div>
                    <button class="btn btn-sm btn-outline-primary" onclick="addProduct(${product.id}, '${product.code}', '${product.name}')">
                        <i class="fas fa-plus me-1"></i>Ekle
                    </button>
                `;
                resultsContainer.appendChild(div);
            });
        }
        
        resultsContainer.style.display = 'block';
        
    } catch (error) {
        console.error('Ürün arama hatası:', error);
        showAlert('Ürün aranırken hata oluştu: ' + error.message, 'danger');
    }
}

// Ürün ekleme fonksiyonu
function addProduct(productId, productCode, productName) {
    // Zaten eklenmiş mi kontrol et
    if (selectedProducts.find(p => p.id === productId)) {
        showAlert('Bu ürün zaten seçilmiş!', 'warning');
        return;
    }
    
    // Ürünü seçilen listeye ekle
    selectedProducts.push({
        id: productId,
        code: productCode,
        name: productName,
        support_amount: 0,
        tax_included: true
    });
    
    // Seçilen ürünler listesini güncelle
    updateSelectedProductsList();
    
    // Arama sonuçlarını gizle
    document.getElementById('product-search-results').style.display = 'none';
    document.getElementById('product-search').value = '';
    
    showAlert('Ürün başarıyla eklendi!', 'success');
}

// Seçilen ürünler listesini güncelleyen fonksiyon
function updateSelectedProductsList() {
    const container = document.getElementById('selected-products-list');
    
    if (selectedProducts.length === 0) {
        container.innerHTML = '<p class="text-muted">Henüz ürün seçilmedi</p>';
        return;
    }
    
    container.innerHTML = '';
    selectedProducts.forEach((product, index) => {
        const div = document.createElement('div');
        div.className = 'border rounded p-3 mb-2';
        div.innerHTML = `
            <div class="row align-items-center">
                <div class="col-md-4">
                    <strong>${product.code}</strong><br>
                    <small class="text-muted">${product.name}</small>
                </div>
                <div class="col-md-3">
                    <label class="form-label small">Destek Tutarı (₺)</label>
                    <input type="text" class="form-control form-control-sm" 
                           value="${product.support_amount ? product.support_amount.toLocaleString('tr-TR') : ''}" 
                           onkeyup="formatCurrency(this)"
                           onchange="updateProductSupport(${index}, this.value)"
                           placeholder="0">
                </div>
                <div class="col-md-3">
                    <label class="form-label small">KDV Durumu</label>
                    <select class="form-select form-select-sm" 
                            onchange="updateProductTax(${index}, this.value)">
                        <option value="true" ${product.tax_included ? 'selected' : ''}>KDV Dahil</option>
                        <option value="false" ${!product.tax_included ? 'selected' : ''}>KDV Hariç</option>
                    </select>
                </div>
                <div class="col-md-2 text-end">
                    <button class="btn btn-sm btn-outline-danger" onclick="removeProduct(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// Ürün destek tutarını güncelleyen fonksiyon
function updateProductSupport(index, value) {
    // Formatlanmış değeri sayıya çevir
    const numericValue = parseFloat(value.replace(/[^\d]/g, '')) || 0;
    selectedProducts[index].support_amount = numericValue;
}

// Ürün KDV durumunu güncelleyen fonksiyon
function updateProductTax(index, value) {
    selectedProducts[index].tax_included = value === 'true';
}

// Ürün kaldırma fonksiyonu
function removeProduct(index) {
    selectedProducts.splice(index, 1);
    updateSelectedProductsList();
    showAlert('Ürün kaldırıldı!', 'info');
}

// Ürün ekleme modal'ını gösteren fonksiyon
function showAddProductModal() {
    // Arama alanını temizle ve odakla
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
        if (typeof showAlert === 'function') {
            showAlert('Ürün arama alanına odaklandı. Arama yaparak ürün ekleyebilirsiniz.', 'info');
        } else {
            alert('Ürün arama alanına odaklandı. Arama yaparak ürün ekleyebilirsiniz.');
        }
    }
}

// Mağaza arama fonksiyonu
async function searchStores() {
    const searchTerm = document.getElementById('store-search').value.trim();
    const resultsContainer = document.getElementById('store-search-results');
    
    if (!searchTerm) {
        resultsContainer.innerHTML = '<p class="text-muted">Arama yapmak için mağaza adı yazın...</p>';
        return;
    }
    
    try {
        const channelId = document.getElementById('plan-channel').value;
        
        // Tüm mağazaları ara (bölge filtresi olmadan)
        const { data: stores, error } = await supabase
            .from('stores')
            .select(`
                id, 
                name, 
                manager_id,
                regions(name)
            `)
            .eq('channel_id', channelId)
            .eq('is_active', true)
            .ilike('name', `%${searchTerm}%`)
            .order('name');
        
        if (error) throw error;
        
        if (stores && stores.length === 0) {
            resultsContainer.innerHTML = '<p class="text-muted">Arama kriterlerine uygun mağaza bulunamadı.</p>';
        } else {
            // Manager isimlerini çek
            const managerIds = [...new Set(stores.map(store => store.manager_id))];
            const { data: managers, error: managerError } = await supabase
                .from('users')
                .select('id, name')
                .in('id', managerIds);
            
            if (managerError) {
                console.error('Manager isimleri çekilirken hata:', managerError);
            }
            
            // Manager isimlerini ID'ye göre eşleştir
            const managerMap = {};
            if (managers) {
                managers.forEach(manager => {
                    managerMap[manager.id] = manager.name;
                });
            }
            
            resultsContainer.innerHTML = '';
            stores.forEach(store => {
                const div = document.createElement('div');
                div.className = 'border-bottom py-2 d-flex justify-content-between align-items-center';
                const regionName = store.regions ? store.regions.name : 'Bölge Yok';
                const managerName = managerMap[store.manager_id] || 'Manager Yok';
                const isSelected = selectedStores.find(s => s.id === store.id);
                
                div.innerHTML = `
                    <div>
                        <strong>${store.name}</strong>
                        <br><small class="text-muted">${regionName} | Manager: ${managerName}</small>
                    </div>
                    <button class="btn btn-sm ${isSelected ? 'btn-success' : 'btn-outline-primary'}" 
                            onclick="${isSelected ? 'removeStoreFromSelection' : 'addStoreToSelection'}(${store.id}, '${store.name}', '${regionName}', '${managerName}')">
                        <i class="fas fa-${isSelected ? 'check' : 'plus'} me-1"></i>${isSelected ? 'Eklendi' : 'Ekle'}
                    </button>
                `;
                resultsContainer.appendChild(div);
            });
        }
        
    } catch (error) {
        console.error('Mağaza arama hatası:', error);
        showAlert('Mağaza aranırken hata oluştu: ' + error.message, 'danger');
    }
}

// Mağazayı seçime ekleme fonksiyonu
function addStoreToSelection(storeId, storeName, regionName, managerName) {
    // Event'i engelle
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Zaten eklenmiş mi kontrol et
    if (selectedStores.find(s => s.id === storeId)) {
        showAlert('Bu mağaza zaten seçilmiş!', 'warning');
        return false;
    }
    
    // Mağazayı seçilen listeye ekle
    selectedStores.push({
        id: storeId,
        name: storeName,
        region: regionName,
        manager: managerName
    });
    
    // Seçilen mağazalar listesini güncelle
    updateSelectedStoresList();
    
    // Arama sonuçlarını yenile
    searchStores();
    
    showAlert('Mağaza başarıyla eklendi!', 'success');
    return false;
}

// Mağazayı seçimden çıkarma fonksiyonu
function removeStoreFromSelection(storeId) {
    // Event'i engelle
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    selectedStores = selectedStores.filter(s => s.id !== storeId);
    updateSelectedStoresList();
    searchStores(); // Arama sonuçlarını yenile
    showAlert('Mağaza kaldırıldı!', 'info');
    return false;
}

// Seçilen mağazalar listesini güncelleyen fonksiyon
function updateSelectedStoresList() {
    const container = document.getElementById('selected-stores-list');
    
    if (selectedStores.length === 0) {
        container.innerHTML = '<p class="text-muted">Henüz mağaza seçilmedi</p>';
        return;
    }
    
    container.innerHTML = '';
    selectedStores.forEach(store => {
        const div = document.createElement('div');
        div.className = 'border rounded p-2 mb-2 d-flex justify-content-between align-items-center';
        div.innerHTML = `
            <div>
                <strong>${store.name}</strong>
                <br><small class="text-muted">${store.region} | Manager: ${store.manager}</small>
            </div>
            <button class="btn btn-sm btn-outline-danger" onclick="removeStoreFromSelection(${store.id})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(div);
    });
}

// Başka mağaza ekleme modal'ını gösteren fonksiyon
function showAddStoreModal() {
    // Arama alanını temizle ve odakla
    const searchInput = document.getElementById('store-search');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
        if (typeof showAlert === 'function') {
            showAlert('Mağaza arama alanına odaklandı. Arama yaparak mağaza ekleyebilirsiniz.', 'info');
        } else {
            alert('Mağaza arama alanına odaklandı. Arama yaparak mağaza ekleyebilirsiniz.');
        }
    }
}

// Oyun planlarını yeniden yükleme fonksiyonu
async function refreshGamePlans() {
    try {
        await loadGamePlans();
        updateStatistics();
        
        // Mevcut bölüme göre içeriği güncelle
        const activeSection = document.querySelector('.content-section[style="display: block;"]');
        if (activeSection) {
            const sectionId = activeSection.id.replace('-section', '');
            showSection(sectionId);
        }
        
        showAlert('Veriler başarıyla yenilendi!', 'success');
    } catch (error) {
        console.error('Veri yenileme hatası:', error);
        showAlert('Veriler yenilenirken hata oluştu: ' + error.message, 'danger');
    }
}

// Oyun planı onaylama fonksiyonu
async function approveGamePlan(planId, approverType) {
    try {
        const newStatus = approverType === 'account_manager' ? 'pending_marketing_manager' : 'approved';
        const approvalField = approverType === 'account_manager' ? 'account_manager_approval' : 'marketing_manager_approval';
        
        // Oyun planını güncelle
        const { data: updatedPlan, error: updateError } = await supabase
            .from('game_plans')
            .update({
                status: newStatus,
                [approvalField]: currentUser.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', planId)
            .select()
            .single();
        
        if (updateError) throw updateError;
        
        // Mail gönder
        await sendGamePlanNotificationEmails(updatedPlan, 
            newStatus === 'approved' ? 'approved_marketing' : 'approved_account');
        
        // Verileri yenile
        await loadGamePlans();
        updateStatistics();
        displayRecentPlans();
        loadPendingPlans();
        
        const actionText = approverType === 'account_manager' ? 'Account Manager onayı' : 'Pazarlama Müdürü onayı';
        if (typeof showAlert === 'function') {
            showAlert(`Oyun planı ${actionText} ile onaylandı! Bildirim e-postaları gönderildi.`, 'success');
        } else {
            alert(`Oyun planı ${actionText} ile onaylandı! Bildirim e-postaları gönderildi.`);
        }
        
    } catch (error) {
        console.error('Onaylama hatası:', error);
        if (typeof showAlert === 'function') {
            showAlert('Onaylama sırasında hata oluştu: ' + error.message, 'danger');
        } else {
            alert('Onaylama sırasında hata oluştu: ' + error.message);
        }
    }
}

// Oyun planı reddetme fonksiyonu
async function rejectGamePlan(planId) {
    const reason = prompt('Reddetme sebebini giriniz:');
    if (!reason) {
        if (typeof showAlert === 'function') {
            showAlert('Reddetme sebebi girilmedi!', 'warning');
        } else {
            alert('Reddetme sebebi girilmedi!');
        }
        return;
    }
    
    try {
        // Oyun planını reddedildi olarak işaretle
        const { data: updatedPlan, error: updateError } = await supabase
            .from('game_plans')
            .update({
                status: 'rejected',
                updated_at: new Date().toISOString()
            })
            .eq('id', planId)
            .select()
            .single();
        
        if (updateError) throw updateError;
        
        // Mail gönder
        await sendGamePlanNotificationEmails(updatedPlan, 'rejected');
        
        // Verileri yenile
        await loadGamePlans();
        updateStatistics();
        displayRecentPlans();
        loadPendingPlans();
        
        if (typeof showAlert === 'function') {
            showAlert('Oyun planı reddedildi! Bildirim e-postaları gönderildi.', 'warning');
        } else {
            alert('Oyun planı reddedildi! Bildirim e-postaları gönderildi.');
        }
        
    } catch (error) {
        console.error('Reddetme hatası:', error);
        if (typeof showAlert === 'function') {
            showAlert('Reddetme sırasında hata oluştu: ' + error.message, 'danger');
        } else {
            alert('Reddetme sırasında hata oluştu: ' + error.message);
        }
    }
}

// Oyun planı detaylarını görüntüleme fonksiyonu
function viewGamePlan(planId) {
    const plan = allGamePlans.find(p => p.id === planId);
    if (!plan) {
        if (typeof showAlert === 'function') {
            showAlert('Oyun planı bulunamadı!', 'danger');
        } else {
            alert('Oyun planı bulunamadı!');
        }
        return;
    }
    
    // Detay popup'ı göster
    showGamePlanDetailModal(plan);
}

// Oyun planı detay modal'ını gösteren fonksiyon
function showGamePlanDetailModal(plan) {
    const modalHTML = `
        <div class="modal fade" id="gamePlanDetailModal" tabindex="-1" aria-labelledby="gamePlanDetailModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title" id="gamePlanDetailModalLabel">
                            <i class="fas fa-info-circle me-2"></i>Oyun Planı Detayları
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6 class="text-primary mb-3">Genel Bilgiler</h6>
                                <table class="table table-sm">
                                    <tr>
                                        <td><strong>Başlık:</strong></td>
                                        <td>${plan.title}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Açıklama:</strong></td>
                                        <td>${plan.description || 'Açıklama yok'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Tür:</strong></td>
                                        <td><span class="badge bg-info">${getPlanTypeName(plan.type)}</span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Durum:</strong></td>
                                        <td><span class="badge bg-warning">${getStatusName(plan.status)}</span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Hedef Türü:</strong></td>
                                        <td><span class="badge bg-secondary">${plan.target_type === 'single_store' ? 'Tek Mağaza' : 'Çoklu Mağaza'}</span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Başlangıç:</strong></td>
                                        <td>${formatDate(plan.start_date)}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Bitiş:</strong></td>
                                        <td>${formatDate(plan.end_date)}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Oluşturan:</strong></td>
                                        <td>${plan.creator_name || 'Bilinmiyor'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Oluşturulma:</strong></td>
                                        <td>${formatDateTime(plan.created_at)}</td>
                                    </tr>
                                </table>
                            </div>
                            <div class="col-md-6">
                                <h6 class="text-primary mb-3">Onay Durumu</h6>
                                <div class="timeline">
                                    <div class="timeline-item ${plan.status !== 'draft' ? 'completed' : ''}">
                                        <div class="timeline-marker bg-success"></div>
                                        <div class="timeline-content">
                                            <h6>Oluşturuldu</h6>
                                            <small class="text-muted">${formatDateTime(plan.created_at)}</small>
                                        </div>
                                    </div>
                                    <div class="timeline-item ${plan.status === 'pending_marketing_manager' || plan.status === 'approved' ? 'completed' : ''}">
                                        <div class="timeline-marker ${plan.status === 'pending_marketing_manager' || plan.status === 'approved' ? 'bg-success' : 'bg-warning'}"></div>
                                        <div class="timeline-content">
                                            <h6>Account Manager Onayı</h6>
                                            <small class="text-muted">${plan.account_manager_approval ? 'Onaylandı' : 'Bekliyor'}</small>
                                        </div>
                                    </div>
                                    <div class="timeline-item ${plan.status === 'approved' ? 'completed' : ''}">
                                        <div class="timeline-marker ${plan.status === 'approved' ? 'bg-success' : 'bg-warning'}"></div>
                                        <div class="timeline-content">
                                            <h6>Pazarlama Müdürü Onayı</h6>
                                            <small class="text-muted">${plan.marketing_manager_approval ? 'Onaylandı' : 'Bekliyor'}</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Mevcut modal'ı kaldır
    const existingModal = document.getElementById('gamePlanDetailModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Yeni modal'ı ekle
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Modal'ı göster
    const modal = new bootstrap.Modal(document.getElementById('gamePlanDetailModal'));
    modal.show();
    
    // Modal kapandığında kaldır
    document.getElementById('gamePlanDetailModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Tarih ve saat formatlama fonksiyonu
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Durum adını döndüren fonksiyon
function getStatusName(status) {
    const statusNames = {
        'draft': 'Taslak',
        'pending_account_manager': 'Account Manager Onayı Bekliyor',
        'pending_marketing_manager': 'Pazarlama Müdürü Onayı Bekliyor',
        'approved': 'Onaylandı',
        'active': 'Aktif',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal Edildi',
        'rejected': 'Reddedildi'
    };
    return statusNames[status] || status;
}

// Durum rengini döndüren fonksiyon
function getStatusColor(status) {
    const statusColors = {
        'draft': 'bg-secondary',
        'pending_account_manager': 'bg-warning',
        'pending_marketing_manager': 'bg-info',
        'approved': 'bg-success',
        'active': 'bg-primary',
        'completed': 'bg-success',
        'cancelled': 'bg-danger',
        'rejected': 'bg-danger'
    };
    return statusColors[status] || 'bg-secondary';
}

// Durum metnini döndüren fonksiyon
function getStatusText(status) {
    const statusTexts = {
        'draft': 'Taslak',
        'pending_account_manager': 'Onay Bekliyor',
        'pending_marketing_manager': 'Onay Bekliyor',
        'approved': 'Onaylandı',
        'active': 'Aktif',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal',
        'rejected': 'Reddedildi'
    };
    return statusTexts[status] || status;
}

// Tür metnini döndüren fonksiyon
function getTypeText(type) {
    const typeTexts = {
        'individual': 'Bireysel',
        'team': 'Takım',
        'store': 'Mağaza',
        'regional': 'Bölgesel'
    };
    return typeTexts[type] || type;
}

// Dönem metnini döndüren fonksiyon
function getPeriodText(periodType) {
    const periodTexts = {
        'daily': 'Günlük',
        'weekly': 'Haftalık',
        'monthly': 'Aylık',
        'quarterly': 'Çeyreklik',
        'yearly': 'Yıllık'
    };
    return periodTexts[periodType] || periodType;
}

// Tarih formatlama fonksiyonu
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
}

// Tarih ve saat formatlama fonksiyonu
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Excel'e aktarma fonksiyonu
function exportToExcel(planId) {
    console.log('Excel export başlatıldı, planId:', planId);
    
    const plan = allGamePlans.find(p => p.id === planId);
    if (!plan) {
        console.error('Plan bulunamadı:', planId);
        showAlert('Oyun planı bulunamadı!', 'danger');
        return;
    }
    
    console.log('Plan bulundu:', plan);
    
    try {
        // Excel verilerini hazırla
        const excelData = prepareExcelData(plan);
        console.log('Excel verileri hazırlandı:', excelData);
        
        // Excel dosyasını oluştur ve indir
        downloadExcelFile(excelData, plan.title);
        
        showAlert('Excel dosyası başarıyla oluşturuldu!', 'success');
        
    } catch (error) {
        console.error('Excel aktarım hatası:', error);
        showAlert('Excel aktarımında hata oluştu: ' + error.message, 'danger');
    }
}

// Excel verilerini hazırlayan fonksiyon
function prepareExcelData(plan) {
    const data = [
        ['Oyun Planı Detayları'],
        ['Başlık', plan.title],
        ['Açıklama', plan.description || ''],
        ['Tür', getTypeText(plan.type)],
        ['Durum', getStatusText(plan.status)],
        ['Başlangıç Tarihi', formatDate(plan.start_date)],
        ['Bitiş Tarihi', formatDate(plan.end_date)],
        ['Oluşturan', plan.creator_name || ''],
        ['Oluşturulma Tarihi', formatDateTime(plan.created_at)],
        [''],
        ['Mağaza Bilgileri'],
        ['Mağaza Adı', 'Hedef Değer', 'Hedef Miktar']
    ];
    
    // Mağaza bilgilerini ekle
    if (plan.game_plan_stores && plan.game_plan_stores.length > 0) {
        plan.game_plan_stores.forEach(store => {
            data.push([
                store.stores?.name || 'Bilinmiyor',
                store.target_value || 0,
                store.target_quantity || 0
            ]);
        });
    }
    
    data.push(['']);
    data.push(['Ürün Bilgileri']);
    data.push(['Ürün Kodu', 'Ürün Adı', 'Prim Tutarı']);
    
    // Ürün bilgilerini ekle
    if (plan.game_plan_products && plan.game_plan_products.length > 0) {
        plan.game_plan_products.forEach(product => {
            data.push([
                product.product_code || '',
                product.product_name || '',
                product.prim_amount || 0
            ]);
        });
    }
    
    return data;
}

// Excel dosyasını indiren fonksiyon
function downloadExcelFile(data, filename) {
    // CSV formatında veri oluştur
    const csvContent = data.map(row => 
        row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    // BOM ekle (Türkçe karakterler için)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Dosyayı indir
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename.replace(/[^a-z0-9]/gi, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Oyun planı durumunu değiştiren fonksiyon (pasife al/aktif et)
async function togglePlanStatus(planId) {
    const plan = allGamePlans.find(p => p.id === planId);
    if (!plan) {
        showAlert('Oyun planı bulunamadı!', 'danger');
        return;
    }
    
    const isActive = plan.status === 'active';
    const newStatus = isActive ? 'inactive' : 'active';
    const actionText = isActive ? 'pasife almak' : 'aktif etmek';
    
    // Onay iste
    if (!confirm(`"${plan.title}" oyun planını ${actionText} istediğinizden emin misiniz?`)) {
        return;
    }
    
    try {
        // Supabase'de durumu güncelle
        const { error } = await supabase
            .from('game_plans')
            .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', planId);
        
        if (error) throw error;
        
        // Yerel listede güncelle
        plan.status = newStatus;
        plan.updated_at = new Date().toISOString();
        
        // UI'yi güncelle
        displayRecentPlans();
        updateStatistics();
        
        const statusText = isActive ? 'pasife alındı' : 'aktif edildi';
        showAlert(`Oyun planı başarıyla ${statusText}!`, 'success');
        
    } catch (error) {
        console.error('Durum değiştirme hatası:', error);
        showAlert('Durum değiştirme sırasında hata oluştu: ' + error.message, 'danger');
    }
}

// Oyun planını silen fonksiyon
function deleteGamePlan(planId) {
    const plan = allGamePlans.find(p => p.id === planId);
    if (!plan) {
        showAlert('Oyun planı bulunamadı!', 'danger');
        return;
    }
    
    // Onay iste
    if (!confirm(`"${plan.title}" oyun planını silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!`)) {
        return;
    }
    
    try {
        // Supabase'den sil
        const { error } = await supabase
            .from('game_plans')
            .delete()
            .eq('id', planId);
        
        if (error) throw error;
        
        // Yerel listeden kaldır
        allGamePlans = allGamePlans.filter(p => p.id !== planId);
        
        // UI'yi güncelle
        displayRecentPlans();
        updateStatistics();
        
        showAlert('Oyun planı başarıyla silindi!', 'success');
        
    } catch (error) {
        console.error('Silme hatası:', error);
        showAlert('Silme sırasında hata oluştu: ' + error.message, 'danger');
    }
}

// Logout fonksiyonu
function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}
