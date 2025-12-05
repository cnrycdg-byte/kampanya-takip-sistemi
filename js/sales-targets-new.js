// Satış Hedefleri Giriş Sistemi - Yeni Tasarım
// Mağaza bazlı, ay/yıl seçimi, departman bazlı hedef girişi

// IIFE ile scope oluştur - değişken çakışmalarını önle
(function() {
    'use strict';
    
    // Sales Targets modülü için özel değişkenler
    let salesTargetsAllStores = [];
    let salesTargetsAllDepartments = ['Ortak', 'Mobil ACC', 'Kulaklık'];
    let salesTargetsSelectedMonth = new Date().getMonth() + 1;
    let salesTargetsSelectedYear = new Date().getFullYear();
    let salesTargetsFilteredStores = [];
    let salesTargetsData = {};

    // Satış hedefleri sayfasını başlat
    async function initializeSalesTargets() {
        console.log('initializeSalesTargets çağrıldı');
        const container = document.getElementById('targets-container');
        
        if (!container) {
            console.error('targets-container bulunamadı!');
            const section = document.getElementById('sales-targets-section');
            if (section) {
                section.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Container elementi bulunamadı! Lütfen sayfayı yenileyin.
                    </div>
                `;
            }
            return;
        }
        
        console.log('Container bulundu, veriler yükleniyor...');
        
        // Loading göster
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Yükleniyor...</span>
                </div>
                <p class="mt-3 text-muted">Veriler yükleniyor...</p>
            </div>
        `;
        
        try {
            console.log('Veri yükleme başlatılıyor...');
            await Promise.all([
                loadStores(),
                loadDepartments(),
                loadSalesTargets()
            ]);
            
            console.log('Veriler yüklendi, sayfa render ediliyor...');
            renderSalesTargetsPage();
            console.log('Sayfa render edildi');
        } catch (error) {
            console.error('Başlatma hatası:', error);
            console.error('Hata detayları:', error.stack);
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Hata:</strong> Veriler yüklenirken bir sorun oluştu.<br>
                    <small>${error.message}</small><br>
                    <small class="text-muted">Lütfen tarayıcı konsolunu kontrol edin (F12)</small>
                </div>
            `;
        }
    }

    // Mağazaları yükle
    async function loadStores() {
        try {
            console.log('Mağazalar yükleniyor...');
            
            let { data, error } = await supabase
                .from('stores')
                .select('*, channels(name), regions(name)')
                .order('name');
            
            if (error) {
                console.warn('İlk deneme başarısız, tekrar deneniyor...', error);
                const { data: data2, error: error2 } = await supabase
                    .from('stores')
                    .select('id, name, channel_id, region_id, manager_id, channels(name), regions(name)')
                    .order('name');
                
                if (error2) throw error2;
                data = data2;
            }
            
            salesTargetsAllStores = data || [];
            salesTargetsFilteredStores = [...salesTargetsAllStores];
            console.log(`${salesTargetsAllStores.length} mağaza yüklendi`);
            
            if (salesTargetsAllStores.length === 0) {
                console.warn('Hiç mağaza bulunamadı!');
            }
        } catch (error) {
            console.error('Mağaza yükleme hatası:', error);
            if (typeof showAlert === 'function') {
                showAlert('Mağazalar yüklenemedi: ' + error.message, 'danger');
            }
            throw error;
        }
    }

    // Departmanları yükle
    async function loadDepartments() {
        try {
            const { data, error } = await supabase
                .from('departments')
                .select('name')
                .eq('is_active', true)
                .order('name');
            
            if (error && error.code !== 'PGRST116') {
                console.warn('Departman tablosu bulunamadı, varsayılanlar kullanılıyor');
            } else if (data && data.length > 0) {
                salesTargetsAllDepartments = data.map(d => d.name);
            }
        } catch (error) {
            console.warn('Departman yükleme hatası:', error);
        }
    }

    // Mevcut hedefleri yükle
    async function loadSalesTargets() {
        try {
            const { data, error } = await supabase
                .from('sales_targets')
                .select('*')
                .eq('month', salesTargetsSelectedMonth)
                .eq('year', salesTargetsSelectedYear);
            
            if (error) throw error;
            
            salesTargetsData = {};
            (data || []).forEach(target => {
                const key = `${target.store_id}_${target.department}`;
                salesTargetsData[key] = target;
            });
            
            console.log(`${Object.keys(salesTargetsData).length} hedef yüklendi`);
        } catch (error) {
            console.error('Hedef yükleme hatası:', error);
            salesTargetsData = {};
        }
    }

    // Sayfayı render et
    function renderSalesTargetsPage() {
        const container = document.getElementById('targets-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="card shadow mb-4">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0">
                        <i class="fas fa-bullseye me-2"></i>Satış Hedefleri Girişi
                    </h5>
                </div>
                <div class="card-body">
                    <div class="row g-3">
                        <div class="col-md-3">
                            <label class="form-label"><strong>Ay</strong></label>
                            <select class="form-select" id="target-month" onchange="onPeriodChange()">
                                ${generateMonthOptions()}
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label"><strong>Yıl</strong></label>
                            <select class="form-select" id="target-year" onchange="onPeriodChange()">
                                ${generateYearOptions()}
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label"><strong>Kanal Filtresi</strong></label>
                            <select class="form-select" id="channel-filter" onchange="filterStores()">
                                <option value="">Tüm Kanallar</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label"><strong>Bölge Filtresi</strong></label>
                            <select class="form-select" id="region-filter" onchange="filterStores()">
                                <option value="">Tüm Bölgeler</option>
                            </select>
                        </div>
                        <div class="col-md-12">
                            <label class="form-label"><strong>Mağaza Ara</strong></label>
                            <input type="text" class="form-control" id="store-search" 
                                   placeholder="Mağaza adı ile ara..." 
                                   onkeyup="filterStores()">
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card shadow">
                <div class="card-header bg-light">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">
                            <i class="fas fa-table me-2"></i>
                            Mağaza ve Departman Bazlı Hedef Girişi
                        </h6>
                        <button class="btn btn-sm btn-success" onclick="saveAllTargets()">
                            <i class="fas fa-save me-1"></i>Tümünü Kaydet
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive" id="targets-table-container">
                        ${renderTargetsTable()}
                    </div>
                </div>
            </div>
        `;
        
        populateFilters();
        document.getElementById('target-month').value = salesTargetsSelectedMonth;
        document.getElementById('target-year').value = salesTargetsSelectedYear;
    }

    // Ay seçenekleri
    function generateMonthOptions() {
        const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                       'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        let html = '';
        for (let i = 1; i <= 12; i++) {
            html += `<option value="${i}">${months[i-1]}</option>`;
        }
        return html;
    }

    // Yıl seçenekleri
    function generateYearOptions() {
        const currentYear = new Date().getFullYear();
        let html = '';
        for (let i = currentYear - 1; i <= currentYear + 2; i++) {
            html += `<option value="${i}">${i}</option>`;
        }
        return html;
    }

    // Filtre dropdown'larını doldur
    async function populateFilters() {
        try {
            const { data: channels } = await supabase
                .from('channels')
                .select('id, name')
                .order('name');
            
            if (channels) {
                const channelSelect = document.getElementById('channel-filter');
                channels.forEach(channel => {
                    const option = document.createElement('option');
                    option.value = channel.id;
                    option.textContent = channel.name;
                    channelSelect.appendChild(option);
                });
            }
            
            const { data: regions } = await supabase
                .from('regions')
                .select('id, name')
                .order('name');
            
            if (regions) {
                const regionSelect = document.getElementById('region-filter');
                regions.forEach(region => {
                    const option = document.createElement('option');
                    option.value = region.id;
                    option.textContent = region.name;
                    regionSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Filtre yükleme hatası:', error);
        }
    }

    // Mağazaları filtrele
    function filterStores() {
        const searchTerm = document.getElementById('store-search')?.value.toLowerCase() || '';
        const channelFilter = document.getElementById('channel-filter')?.value || '';
        const regionFilter = document.getElementById('region-filter')?.value || '';
        
        salesTargetsFilteredStores = salesTargetsAllStores.filter(store => {
            const matchesSearch = !searchTerm || store.name.toLowerCase().includes(searchTerm);
            const matchesChannel = !channelFilter || store.channel_id == channelFilter;
            const matchesRegion = !regionFilter || store.region_id == regionFilter;
            return matchesSearch && matchesChannel && matchesRegion;
        });
        
        document.getElementById('targets-table-container').innerHTML = renderTargetsTable();
    }

    // Hedef tablosunu render et
    function renderTargetsTable() {
        if (salesTargetsFilteredStores.length === 0) {
            return `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Filtre kriterlerinize uygun mağaza bulunamadı.
                </div>
            `;
        }
        
        let html = `
            <table class="table table-bordered table-hover">
                <thead class="table-dark">
                    <tr>
                        <th rowspan="2" class="align-middle">Mağaza</th>
                        <th rowspan="2" class="align-middle">Departman</th>
                        <th colspan="2" class="text-center">Toplam Hedef</th>
                        <th colspan="2" class="text-center">Philips Kulaklık</th>
                        <th colspan="2" class="text-center">UGreen Kulaklık</th>
                        <th colspan="2" class="text-center">Philips Mobil ACC</th>
                        <th colspan="2" class="text-center">UGreen Mobil ACC</th>
                        <th colspan="2" class="text-center">Philips Diğer</th>
                        <th colspan="2" class="text-center">UGreen Diğer</th>
                        <th colspan="2" class="text-center">UGreen IT Aksesuar</th>
                        <th rowspan="2" class="align-middle">İşlemler</th>
                    </tr>
                    <tr>
                        <th>Adet</th><th>Ciro</th>
                        <th>Adet</th><th>Ciro</th>
                        <th>Adet</th><th>Ciro</th>
                        <th>Adet</th><th>Ciro</th>
                        <th>Adet</th><th>Ciro</th>
                        <th>Adet</th><th>Ciro</th>
                        <th>Adet</th><th>Ciro</th>
                        <th>Adet</th><th>Ciro</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        salesTargetsFilteredStores.forEach(store => {
            salesTargetsAllDepartments.forEach(dept => {
                const key = `${store.id}_${dept}`;
                const target = salesTargetsData[key] || {};
                
                html += `
                    <tr data-store-id="${store.id}" data-department="${dept}">
                        <td>${store.name}</td>
                        <td>${dept}</td>
                        <td>
                            <input type="number" class="form-control form-control-sm" 
                                   data-field="target_qty" 
                                   value="${target.target_qty || 0}" min="0">
                        </td>
                        <td>
                            <input type="text" class="form-control form-control-sm" 
                                   data-field="target_revenue" 
                                   placeholder="0,00"
                                   value="${formatCurrencyInput(target.target_revenue || 0)}">
                        </td>
                        ${generateCategoryInputs(target)}
                        <td>
                            <button class="btn btn-sm btn-success" 
                                    onclick="saveTarget(${store.id}, '${dept}')"
                                    title="Bu satırı kaydet">
                                <i class="fas fa-save"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        return html;
    }

    // Kategori input'ları oluştur
    function generateCategoryInputs(target) {
        const categories = [
            { prefix: 'philips_headphone', label: 'Philips Kulaklık' },
            { prefix: 'ugreen_headphone', label: 'UGreen Kulaklık' },
            { prefix: 'philips_mobile_acc', label: 'Philips Mobil ACC' },
            { prefix: 'ugreen_mobile_acc', label: 'UGreen Mobil ACC' },
            { prefix: 'philips_other', label: 'Philips Diğer' },
            { prefix: 'ugreen_other', label: 'UGreen Diğer' },
            { prefix: 'ugreen_it_aksesuar', label: 'UGreen IT Aksesuar' }
        ];
        
        let html = '';
        categories.forEach(cat => {
            html += `
                <td>
                    <input type="number" class="form-control form-control-sm" 
                           data-field="${cat.prefix}_qty" 
                           value="${target[`${cat.prefix}_qty`] || 0}" min="0">
                </td>
                <td>
                    <input type="text" class="form-control form-control-sm" 
                           data-field="${cat.prefix}_revenue" 
                           placeholder="0,00"
                           value="${formatCurrencyInput(target[`${cat.prefix}_revenue`] || 0)}">
                </td>
            `;
        });
        
        return html;
    }

    // Para birimi formatı (input için)
    function formatCurrencyInput(amount) {
        if (!amount || amount === 0) return '';
        return new Intl.NumberFormat('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    // Ay/Yıl değiştiğinde
    async function onPeriodChange() {
        salesTargetsSelectedMonth = parseInt(document.getElementById('target-month').value);
        salesTargetsSelectedYear = parseInt(document.getElementById('target-year').value);
        
        await loadSalesTargets();
        document.getElementById('targets-table-container').innerHTML = renderTargetsTable();
    }

    // Tekil hedef kaydet
    async function saveTarget(storeId, department) {
        try {
            const row = document.querySelector(`tr[data-store-id="${storeId}"][data-department="${department}"]`);
            if (!row) {
                showAlert('Satır bulunamadı!', 'danger');
                return;
            }
            
            const targetData = collectTargetDataFromRow(row, storeId, department);
            
            const { error } = await supabase
                .from('sales_targets')
                .upsert(targetData, {
                    onConflict: 'store_id,department,month,year'
                });
            
            if (error) throw error;
            
            const key = `${storeId}_${department}`;
            salesTargetsData[key] = targetData;
            
            showAlert('Hedef başarıyla kaydedildi!', 'success');
        } catch (error) {
            console.error('Hedef kaydetme hatası:', error);
            showAlert('Hata: ' + error.message, 'danger');
        }
    }

    // Tüm hedefleri kaydet
    async function saveAllTargets() {
        try {
            const loadingId = showLoading('Kaydediliyor', 'Tüm hedefler kaydediliyor...');
            
            const rows = document.querySelectorAll('tbody tr[data-store-id]');
            const targetsToSave = [];
            
            rows.forEach(row => {
                const storeId = parseInt(row.dataset.storeId);
                const department = row.dataset.department;
                targetsToSave.push(collectTargetDataFromRow(row, storeId, department));
            });
            
            if (targetsToSave.length === 0) {
                hideLoading(loadingId);
                showAlert('Kaydedilecek hedef bulunamadı!', 'warning');
                return;
            }
            
            const { error } = await supabase
                .from('sales_targets')
                .upsert(targetsToSave, {
                    onConflict: 'store_id,department,month,year'
                });
            
            if (error) throw error;
            
            targetsToSave.forEach(target => {
                const key = `${target.store_id}_${target.department}`;
                salesTargetsData[key] = target;
            });
            
            hideLoading(loadingId);
            showAlert(`${targetsToSave.length} hedef başarıyla kaydedildi!`, 'success');
        } catch (error) {
            console.error('Toplu kaydetme hatası:', error);
            showAlert('Hata: ' + error.message, 'danger');
        }
    }

    // Satırdan hedef verilerini topla
    function collectTargetDataFromRow(row, storeId, department) {
        const user = checkUserSession();
        
        const data = {
            store_id: storeId,
            department: department,
            month: salesTargetsSelectedMonth,
            year: salesTargetsSelectedYear,
            target_qty: parseInt(row.querySelector('[data-field="target_qty"]').value) || 0,
            target_revenue: parseCurrency(row.querySelector('[data-field="target_revenue"]').value) || 0,
            philips_headphone_qty: parseInt(row.querySelector('[data-field="philips_headphone_qty"]').value) || 0,
            philips_headphone_revenue: parseCurrency(row.querySelector('[data-field="philips_headphone_revenue"]').value) || 0,
            ugreen_headphone_qty: parseInt(row.querySelector('[data-field="ugreen_headphone_qty"]').value) || 0,
            ugreen_headphone_revenue: parseCurrency(row.querySelector('[data-field="ugreen_headphone_revenue"]').value) || 0,
            philips_mobile_acc_qty: parseInt(row.querySelector('[data-field="philips_mobile_acc_qty"]').value) || 0,
            philips_mobile_acc_revenue: parseCurrency(row.querySelector('[data-field="philips_mobile_acc_revenue"]').value) || 0,
            ugreen_mobile_acc_qty: parseInt(row.querySelector('[data-field="ugreen_mobile_acc_qty"]').value) || 0,
            ugreen_mobile_acc_revenue: parseCurrency(row.querySelector('[data-field="ugreen_mobile_acc_revenue"]').value) || 0,
            philips_other_qty: parseInt(row.querySelector('[data-field="philips_other_qty"]').value) || 0,
            philips_other_revenue: parseCurrency(row.querySelector('[data-field="philips_other_revenue"]').value) || 0,
            ugreen_other_qty: parseInt(row.querySelector('[data-field="ugreen_other_qty"]').value) || 0,
            ugreen_other_revenue: parseCurrency(row.querySelector('[data-field="ugreen_other_revenue"]').value) || 0,
            ugreen_it_aksesuar_qty: parseInt(row.querySelector('[data-field="ugreen_it_aksesuar_qty"]').value) || 0,
            ugreen_it_aksesuar_revenue: parseCurrency(row.querySelector('[data-field="ugreen_it_aksesuar_revenue"]').value) || 0
        };
        
        if (user) {
            data.created_by = user.id;
        }
        
        return data;
    }

    // Para birimi parse et
    function parseCurrency(value) {
        if (!value) return 0;
        return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
    }

    // Sayfa yüklendiğinde
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Sales targets modülü yüklendi');
        
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const section = document.getElementById('sales-targets-section');
                    if (section && section.style.display !== 'none') {
                        console.log('Sales targets section görünür hale geldi');
                        initializeSalesTargets();
                    }
                }
            });
        });
        
        const section = document.getElementById('sales-targets-section');
        if (section) {
            observer.observe(section, { 
                attributes: true, 
                attributeFilter: ['style'],
                childList: true,
                subtree: true 
            });
            console.log('Sales targets section observer başlatıldı');
        }
        
        if (section && section.style.display !== 'none') {
            console.log('İlk yükleme başlatılıyor');
            initializeSalesTargets();
        }
    });

    // Global fonksiyonlar (window'a ekle)
    window.onPeriodChange = onPeriodChange;
    window.filterStores = filterStores;
    window.saveTarget = saveTarget;
    window.saveAllTargets = saveAllTargets;
    window.initializeSalesTargets = initializeSalesTargets;
    
})(); // IIFE kapat
