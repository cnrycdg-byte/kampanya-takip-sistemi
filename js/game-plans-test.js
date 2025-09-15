// Oyun Planları JavaScript Dosyası - Test Versiyonu

let allGamePlans = [];
let currentUser = null;
let selectedStores = [];
let selectedProducts = [];
let targetLevels = [];

// Supabase bağlantısı
let supabase = null;

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
    alert(message);
}

// Bölüm gösterme fonksiyonu (global)
window.showSection = function(sectionName) {
    console.log('showSection çağrıldı:', sectionName);
    
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
    console.log('Hedef bölüm:', sectionName + '-section', 'Bulundu:', !!targetSection);
    
    if (targetSection) {
        targetSection.style.display = 'block';
        console.log('Bölüm gösterildi:', sectionName);
    } else {
        console.error('Bölüm bulunamadı:', sectionName + '-section');
        // Tüm mevcut bölümleri listele
        const allSections = document.querySelectorAll('[id$="-section"]');
        console.log('Mevcut bölümler:', Array.from(allSections).map(s => s.id));
    }
    
    // Seçilen menü linkini aktif yap
    const activeLink = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Bölüme özel veri yükleme
    switch(sectionName) {
        case 'dashboard':
            console.log('Dashboard yükleniyor...');
            break;
        case 'create':
            console.log('Create form yükleniyor...');
            if (typeof loadCreateForm === 'function') {
                console.log('loadCreateForm fonksiyonu bulundu, çağrılıyor...');
                loadCreateForm();
            } else {
                console.error('loadCreateForm fonksiyonu bulunamadı!');
            }
            break;
        case 'pending':
            console.log('Pending plans yükleniyor...');
            break;
        case 'active':
            console.log('Active plans yükleniyor...');
            break;
        case 'reports':
            console.log('Reports yükleniyor...');
            break;
    }
};

// Oyun planı oluşturma formunu yükleyen fonksiyon (global)
window.loadCreateForm = function() {
    console.log('loadCreateForm() fonksiyonu çağrıldı');
    
    const container = document.getElementById('create-form-container');
    if (!container) {
        console.error('create-form-container elementi bulunamadı!');
        return;
    }
    
    console.log('create-form-container elementi bulundu, form yükleniyor...');
    
    // Detaylı form HTML'i
    const formHTML = `
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
                                        <select class="form-select" id="plan-channel" required>
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
                                        <select class="form-select" id="plan-region">
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
                                <button type="submit" class="btn btn-primary">Oyun Planı Oluştur</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = formHTML;
    console.log('Oyun planı oluşturma formu yüklendi');
};

// Oyun planı türü değiştiğinde çalışan fonksiyon (global)
window.handleTypeChange = function() {
    const planType = document.getElementById('plan-type').value;
    console.log('handleTypeChange() çağrıldı, planType:', planType);
    
    const targetCiroContainer = document.getElementById('target-ciro-container');
    
    if (targetCiroContainer) {
        if (planType === 'free_wkz') {
            targetCiroContainer.style.display = 'block';
            console.log('Free WKZ hedef sistemi gösterildi');
        } else {
            targetCiroContainer.style.display = 'none';
            console.log('Hedef sistemi gizlendi');
        }
    }
};

// Hedef seviyesi ekleme fonksiyonu (global)
window.addTargetLevel = function() {
    console.log('addTargetLevel() fonksiyonu çağrıldı');
    
    const container = document.getElementById('target-levels-container');
    if (!container) {
        console.error('target-levels-container elementi bulunamadı!');
        return;
    }
    
    const levelId = Date.now();
    console.log('Yeni hedef seviyesi eklendi, ID:', levelId);
    
    const levelHtml = `
        <div class="row mb-2 target-level-row" data-level-id="${levelId}">
            <div class="col-md-3">
                <input type="text" class="form-control target-ciro-input" 
                       placeholder="Ciro hedefi giriniz">
            </div>
            <div class="col-md-2">
                <input type="number" class="form-control target-percentage-input" 
                       placeholder="%" step="0.01" min="0" max="100">
            </div>
            <div class="col-md-2">
                <select class="form-select target-tax-select">
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
    console.log('Hedef seviyesi HTML\'i eklendi');
};

// Hedef seviyesi silme fonksiyonu
window.removeTargetLevel = function(levelId) {
    console.log('removeTargetLevel() çağrıldı, ID:', levelId);
    const row = document.querySelector(`[data-level-id="${levelId}"]`);
    if (row) {
        row.remove();
        console.log('Hedef seviyesi silindi');
    }
};

// Refresh fonksiyonu
window.refreshGamePlans = function() {
    console.log('refreshGamePlans çağrıldı');
    showAlert('Veriler yenileniyor...', 'info');
};

// Kanal seçildiğinde bölgeleri yükleyen fonksiyon
window.loadRegions = async function() {
    const channelId = document.getElementById('plan-channel').value;
    const regionSelect = document.getElementById('plan-region');
    const storeSelectionContainer = document.getElementById('store-selection-container');
    
    if (!channelId) {
        regionSelect.innerHTML = '<option value="">Önce kanal seçiniz</option>';
        if (storeSelectionContainer) storeSelectionContainer.style.display = 'none';
        return;
    }
    
    try {
        if (supabase) {
            // Gerçek Supabase bağlantısı ile bölgeleri yükle
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
            }
        } else {
            // Demo veriler (Supabase bağlantısı yoksa)
            const regions = {
                '1': [
                    { id: 1, name: 'İstanbul Avrupa' },
                    { id: 2, name: 'İstanbul Anadolu' },
                    { id: 3, name: 'Ankara' },
                    { id: 4, name: 'İzmir' }
                ],
                '2': [
                    { id: 5, name: 'İstanbul' },
                    { id: 6, name: 'Ankara' },
                    { id: 7, name: 'İzmir' },
                    { id: 8, name: 'Bursa' }
                ],
                '3': [
                    { id: 9, name: 'İstanbul' },
                    { id: 10, name: 'Ankara' },
                    { id: 11, name: 'İzmir' }
                ]
            };
            
            regionSelect.innerHTML = '<option value="">Bölge Seçiniz</option>';
            
            if (regions[channelId]) {
                regions[channelId].forEach(region => {
                    const option = document.createElement('option');
                    option.value = region.id;
                    option.textContent = region.name;
                    regionSelect.appendChild(option);
                });
            }
        }
        
        if (storeSelectionContainer) storeSelectionContainer.style.display = 'block';
        
    } catch (error) {
        console.error('Bölge yükleme hatası:', error);
        showAlert('Bölgeler yüklenirken hata oluştu: ' + error.message, 'danger');
    }
};

// Bölge seçildiğinde mağazaları yükleyen fonksiyon
window.loadStores = async function() {
    const regionId = document.getElementById('plan-region').value;
    const storeSelectionContainer = document.getElementById('store-selection-container');
    
    if (!regionId) {
        if (storeSelectionContainer) storeSelectionContainer.style.display = 'none';
        return;
    }
    
    try {
        if (supabase) {
            // Gerçek Supabase bağlantısı ile mağazaları yükle
            const { data: stores, error } = await supabase
                .from('stores')
                .select(`
                    id,
                    name,
                    code,
                    manager_id,
                    users(name)
                `)
                .eq('region_id', regionId)
                .eq('is_active', true)
                .order('name');
            
            if (error) throw error;
            
            // Mağaza listesini güncelle
            updateStoreList(stores || []);
            
        } else {
            // Demo veriler (Supabase bağlantısı yoksa)
            const stores = {
                '1': [
                    { id: 1, name: 'Media Markt Avcılar', code: 'MM001' },
                    { id: 2, name: 'Media Markt Bakırköy', code: 'MM002' },
                    { id: 3, name: 'Media Markt Kadıköy', code: 'MM003' }
                ],
                '2': [
                    { id: 4, name: 'Media Markt Çankaya', code: 'MM004' },
                    { id: 5, name: 'Media Markt Keçiören', code: 'MM005' }
                ],
                '3': [
                    { id: 6, name: 'Media Markt Konak', code: 'MM006' },
                    { id: 7, name: 'Media Markt Bornova', code: 'MM007' }
                ]
            };
            
            // Mağaza listesini güncelle
            updateStoreList(stores[regionId] || []);
        }
        
    } catch (error) {
        console.error('Mağaza yükleme hatası:', error);
        showAlert('Mağazalar yüklenirken hata oluştu: ' + error.message, 'danger');
    }
};

// Mağaza listesini güncelleyen fonksiyon
function updateStoreList(stores) {
    const storeList = document.getElementById('selected-stores-list');
    if (!storeList) return;
    
    if (stores.length === 0) {
        storeList.innerHTML = '<p class="text-muted">Bu bölgede mağaza bulunamadı</p>';
        return;
    }
    
    storeList.innerHTML = stores.map(store => `
        <div class="d-flex justify-content-between align-items-center border-bottom py-2">
            <div>
                <strong>${store.name}</strong>
                <br><small class="text-muted">${store.code}</small>
            </div>
            <button class="btn btn-sm btn-outline-primary" onclick="selectStore(${store.id}, '${store.name}', '${store.code}')">
                <i class="fas fa-plus me-1"></i>Seç
            </button>
        </div>
    `).join('');
}

// Mağaza seçme fonksiyonu
window.selectStore = function(storeId, storeName, storeCode) {
    console.log('Mağaza seçildi:', storeId, storeName, storeCode);
    // Burada seçilen mağazayı listeye ekleyebilirsiniz
    showAlert(`${storeName} mağazası seçildi`, 'success');
};

// Logout fonksiyonu
window.logout = function() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
};

// Supabase bağlantısını başlatan fonksiyon
async function initializeSupabase() {
    try {
        // Supabase config dosyasından URL ve key'i al
        const response = await fetch('js/supabase-config.js');
        const configText = await response.text();
        
        // URL ve key'i çıkar
        const urlMatch = configText.match(/supabaseUrl:\s*['"`]([^'"`]+)['"`]/);
        const keyMatch = configText.match(/supabaseKey:\s*['"`]([^'"`]+)['"`]/);
        
        if (urlMatch && keyMatch) {
            const supabaseUrl = urlMatch[1];
            const supabaseKey = keyMatch[1];
            
            // Supabase client'ı oluştur
            supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
            console.log('Supabase bağlantısı başlatıldı');
            return true;
        } else {
            console.error('Supabase config bulunamadı');
            return false;
        }
    } catch (error) {
        console.error('Supabase başlatma hatası:', error);
        return false;
    }
}

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
    const totalPlansEl = document.getElementById('total-plans');
    const activePlansEl = document.getElementById('active-plans');
    const pendingPlansEl = document.getElementById('pending-plans');
    const completedPlansEl = document.getElementById('completed-plans');
    
    if (totalPlansEl) totalPlansEl.textContent = totalPlans;
    if (activePlansEl) activePlansEl.textContent = activePlans;
    if (pendingPlansEl) pendingPlansEl.textContent = pendingPlans;
    if (completedPlansEl) completedPlansEl.textContent = completedThisMonth;
    
    // Menüdeki badge'leri güncelle
    const pendingCountEl = document.getElementById('pending-count');
    const activeCountEl = document.getElementById('active-count');
    
    if (pendingCountEl) pendingCountEl.textContent = pendingPlans;
    if (activeCountEl) activeCountEl.textContent = activePlans;
}

// Son oyun planlarını gösteren fonksiyon
function displayRecentPlans() {
    const container = document.getElementById('recent-plans-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Son 6 oyun planını al
    const recentPlans = allGamePlans.slice(0, 6);
    
    if (recentPlans.length === 0) {
        container.innerHTML = '<p class="text-muted">Henüz oyun planı bulunmuyor</p>';
        return;
    }
    
    recentPlans.forEach(plan => {
        const planCard = createPlanCard(plan);
        container.appendChild(planCard);
    });
}

// Oyun planı kartı oluşturan fonksiyon
function createPlanCard(plan) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';
    
    col.innerHTML = `
        <div class="card h-100 shadow-sm">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="card-title text-truncate">${plan.title}</h6>
                    <span class="badge ${getStatusColor(plan.status)}">${getStatusText(plan.status)}</span>
                </div>
                <p class="card-text text-muted small">${plan.description || 'Açıklama yok'}</p>
                <div class="row text-center">
                    <div class="col-4">
                        <div class="h6 mb-0 font-weight-bold text-primary">${plan.type || 'N/A'}</div>
                        <small class="text-muted">Tür</small>
                    </div>
                    <div class="col-4">
                        <div class="h6 mb-0 font-weight-bold text-success">${plan.target_value || 0}</div>
                        <small class="text-muted">Hedef</small>
                    </div>
                    <div class="col-4">
                        <div class="h6 mb-0 font-weight-bold text-info">${plan.game_plan_stores?.length || 0}</div>
                        <small class="text-muted">Mağaza</small>
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
                <div class="d-flex justify-content-between">
                    <small class="text-muted">${formatDate(plan.created_at)}</small>
                    <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); viewGamePlan('${plan.id}')">
                        <i class="fas fa-eye me-1"></i>Detay
                    </button>
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

// Tarih formatlama fonksiyonu
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Oyun planı detayını gösteren fonksiyon
window.viewGamePlan = function(planId) {
    const plan = allGamePlans.find(p => p.id === planId);
    if (!plan) {
        showAlert('Oyun planı bulunamadı', 'error');
        return;
    }
    
    console.log('Oyun planı detayı gösteriliyor:', plan);
    showAlert(`${plan.title} detayları gösteriliyor`, 'info');
};

// Sayfa yüklendiğinde çalışacak kod
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Oyun planları dashboard yüklendi (test versiyonu)');
    
    // Supabase'i başlat
    const supabaseReady = await initializeSupabase();
    if (!supabaseReady) {
        console.error('Supabase başlatılamadı, demo modda çalışıyor');
    }
    
    // Kullanıcı oturumunu kontrol et
    currentUser = checkUserSession();
    if (!currentUser) {
        console.log('Kullanıcı oturumu bulunamadı');
        return;
    }
    
    console.log('Kullanıcı oturumu:', currentUser);
    
    // Dashboard verilerini yükle
    if (supabase) {
        await loadDashboardData();
    }
    
    // Varsayılan olarak dashboard'u göster
    showSection('dashboard');
});
