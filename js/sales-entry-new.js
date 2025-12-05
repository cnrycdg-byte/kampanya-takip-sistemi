// Satış Girişi Modülü - Yeni Tasarım
// Employee Dashboard için: Hedef gösterimi, gerçekleşen ciro, mobil uyumlu form

let currentMonthTarget = null;
let currentMonthSales = [];
let currentDate = new Date().toISOString().split('T')[0];
let salesFormData = {};

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    // Sales-entry section gösterildiğinde çalış
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1 && node.id === 'sales-entry-section' && node.style.display !== 'none') {
                    initializeSalesEntry();
                }
            });
        });
    });
    
    // Mevcut section'ı gözlemle
    const section = document.getElementById('sales-entry-section');
    if (section) {
        observer.observe(section.parentNode, { childList: true, subtree: true });
    }
    
    // İlk yükleme kontrolü
    if (section && section.style.display !== 'none') {
        initializeSalesEntry();
    }
    
    // Sales-entry link'ine tıklandığında
    document.addEventListener('click', function(e) {
        if (e.target.closest('a[href="#sales-entry"]')) {
            setTimeout(function() {
                initializeSalesEntry();
            }, 100);
        }
    });
});

// Satış girişi sayfasını başlat
async function initializeSalesEntry() {
    const container = document.getElementById('sales-entry-content');
    if (!container) return;
    
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
        const user = checkUserSession();
        if (!user || !user.storeId || !user.department) {
            container.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Lütfen önce mağaza ve departman seçimi yapınız.
                </div>
            `;
            return;
        }
        
        await Promise.all([
            loadSalesTarget(),
            loadCurrentMonthSales(),
            loadTodaySales()
        ]);
        
        renderSalesEntryPage();
    } catch (error) {
        console.error('Başlatma hatası:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Veriler yüklenirken bir hata oluştu: ${error.message}
            </div>
        `;
    }
}

// Mevcut ayın hedefini yükle
async function loadSalesTarget() {
    try {
        const user = checkUserSession();
        if (!user) return;
        
        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        
        const { data, error } = await supabase
            .from('sales_targets')
            .select('*')
            .eq('store_id', user.storeId)
            .eq('department', user.department || 'Ortak')
            .eq('month', month)
            .eq('year', year)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.error('Hedef yükleme hatası:', error);
        }
        
        currentMonthTarget = data || null;
    } catch (error) {
        console.error('Hedef yükleme hatası:', error);
        currentMonthTarget = null;
    }
}

// Bu ayın satışlarını yükle
async function loadCurrentMonthSales() {
    try {
        const user = checkUserSession();
        if (!user) return;
        
        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        
        const { data, error } = await supabase
            .from('sales_entries')
            .select('*')
            .eq('store_id', user.storeId)
            .eq('department', user.department || 'Ortak')
            .gte('entry_date', `${year}-${String(month).padStart(2, '0')}-01`)
            .lt('entry_date', `${year}-${String(month + 1).padStart(2, '0')}-01`);
        
        if (error) {
            console.error('Satış yükleme hatası:', error);
            currentMonthSales = [];
            return;
        }
        
        currentMonthSales = data || [];
    } catch (error) {
        console.error('Satış yükleme hatası:', error);
        currentMonthSales = [];
    }
}

// Bugünkü satış kaydını yükle
async function loadTodaySales() {
    try {
        const user = checkUserSession();
        if (!user) return;
        
        const { data, error } = await supabase
            .from('sales_entries')
            .select('*')
            .eq('user_id', user.id)
            .eq('store_id', user.storeId)
            .eq('department', user.department || 'Ortak')
            .eq('entry_date', currentDate)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.error('Bugünkü satış yükleme hatası:', error);
        }
        
        if (data) {
            salesFormData = data;
            // İzin durumunu da kontrol et
            await loadTodayAttendance();
        }
    } catch (error) {
        console.error('Bugünkü satış yükleme hatası:', error);
    }
}

// Bugünkü izin durumunu yükle
async function loadTodayAttendance() {
    try {
        const user = checkUserSession();
        if (!user) return;
        
        const { data, error } = await supabase
            .from('attendance_records')
            .select('status')
            .eq('user_id', user.id)
            .eq('store_id', user.storeId)
            .eq('department', user.department || 'Ortak')
            .eq('attendance_date', currentDate)
            .single();
        
        if (data) {
            salesFormData.attendanceStatus = data.status;
        }
    } catch (error) {
        // Hata durumunda devam et
    }
}

// Satış girişi sayfasını render et
function renderSalesEntryPage() {
    const container = document.getElementById('sales-entry-content');
    if (!container) return;
    
    const user = checkUserSession();
    const target = currentMonthTarget;
    const totalRevenue = calculateTotalRevenue();
    const achievementPercentage = target && target.target_revenue > 0 
        ? ((totalRevenue / target.target_revenue) * 100).toFixed(1)
        : 0;
    
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysPassed = today.getDate();
    const remainingDays = daysInMonth - daysPassed;
    const dailyTarget = target && remainingDays > 0 
        ? ((target.target_revenue - totalRevenue) / remainingDays).toFixed(2)
        : 0;
    
    container.innerHTML = `
        <!-- Üst Bilgi Paneli: Hedef ve İstatistikler -->
        <div class="card shadow mb-4">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">
                    <i class="fas fa-chart-line me-2"></i>
                    ${new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} - Satış Hedefleri
                </h5>
            </div>
            <div class="card-body">
                <div class="row g-3">
                    <!-- Aylık Hedef -->
                    <div class="col-6 col-md-3">
                        <div class="text-center p-3 bg-light rounded">
                            <div class="text-muted small mb-1">Aylık Hedef</div>
                            <div class="h5 mb-0 text-primary">
                                ${target ? formatCurrency(target.target_revenue) : 'Belirlenmemiş'}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Bugüne Kadar Gerçekleşen -->
                    <div class="col-6 col-md-3">
                        <div class="text-center p-3 bg-light rounded">
                            <div class="text-muted small mb-1">Gerçekleşen</div>
                            <div class="h5 mb-0 text-success">
                                ${formatCurrency(totalRevenue)}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Hedef Gerçekleştirme Oranı -->
                    <div class="col-6 col-md-3">
                        <div class="text-center p-3 bg-light rounded">
                            <div class="text-muted small mb-1">Gerçekleştirme</div>
                            <div class="h5 mb-0 ${achievementPercentage >= 100 ? 'text-success' : achievementPercentage >= 75 ? 'text-warning' : 'text-danger'}">
                                %${achievementPercentage}
                            </div>
                            <div class="progress mt-2" style="height: 5px;">
                                <div class="progress-bar ${achievementPercentage >= 100 ? 'bg-success' : achievementPercentage >= 75 ? 'bg-warning' : 'bg-danger'}" 
                                     role="progressbar" 
                                     style="width: ${Math.min(achievementPercentage, 100)}%"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Günlük Tahmini Ciro -->
                    <div class="col-6 col-md-3">
                        <div class="text-center p-3 bg-light rounded">
                            <div class="text-muted small mb-1">Günlük Hedef</div>
                            <div class="h5 mb-0 text-info">
                                ${formatCurrency(dailyTarget)}
                            </div>
                            <div class="text-muted small mt-1">${remainingDays} gün kaldı</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- İzin Durumu Seçimi -->
        <div class="card shadow mb-4">
            <div class="card-header bg-secondary text-white">
                <h6 class="mb-0">
                    <i class="fas fa-calendar-check me-2"></i>Gün Durumu
                </h6>
            </div>
            <div class="card-body">
                <div class="btn-group w-100" role="group">
                    <input type="radio" class="btn-check" name="dayStatus" id="status-aktif" value="Aktif" 
                           ${salesFormData.attendanceStatus === 'Aktif' || !salesFormData.attendanceStatus ? 'checked' : ''}
                           onchange="handleStatusChange()">
                    <label class="btn btn-outline-success" for="status-aktif">
                        <i class="fas fa-check-circle me-1"></i>Aktif
                    </label>
                    
                    <input type="radio" class="btn-check" name="dayStatus" id="status-haftalik-izin" value="Haftalık İzin"
                           ${salesFormData.attendanceStatus === 'Haftalık İzin' ? 'checked' : ''}
                           onchange="handleStatusChange()">
                    <label class="btn btn-outline-info" for="status-haftalik-izin">
                        <i class="fas fa-calendar-week me-1"></i>Haftalık İzin
                    </label>
                    
                    <input type="radio" class="btn-check" name="dayStatus" id="status-raporlu" value="Raporlu"
                           ${salesFormData.attendanceStatus === 'Raporlu' ? 'checked' : ''}
                           onchange="handleStatusChange()">
                    <label class="btn btn-outline-warning" for="status-raporlu">
                        <i class="fas fa-file-medical me-1"></i>Raporlu
                    </label>
                    
                    <input type="radio" class="btn-check" name="dayStatus" id="status-yillik-izin" value="Yıllık İzin"
                           ${salesFormData.attendanceStatus === 'Yıllık İzin' ? 'checked' : ''}
                           onchange="handleStatusChange()">
                    <label class="btn btn-outline-primary" for="status-yillik-izin">
                        <i class="fas fa-umbrella-beach me-1"></i>Yıllık İzin
                    </label>
                </div>
            </div>
        </div>
        
        <!-- Satış Girişi Formu -->
        <div class="card shadow mb-4" id="sales-entry-form-card">
            <div class="card-header bg-success text-white">
                <h6 class="mb-0">
                    <i class="fas fa-shopping-cart me-2"></i>Satış Girişi
                </h6>
            </div>
            <div class="card-body" id="sales-entry-form">
                ${renderSalesForm()}
            </div>
        </div>
        
        <!-- Kaydet Butonu -->
        <div class="text-center mb-4">
            <button class="btn btn-success btn-lg px-5" onclick="saveSalesEntry()">
                <i class="fas fa-save me-2"></i>Kaydet
            </button>
        </div>
    `;
    
    // Form değerlerini yükle
    loadFormValues();
    // Toplamı hesapla
    calculateTotal();
}

// Satış formunu render et (mobil uyumlu, 0 olanlar gizli)
function renderSalesForm() {
    const categories = [
        { id: 'philips-headphone', name: 'Philips Kulaklık', color: 'primary' },
        { id: 'ugreen-headphone', name: 'UGreen Kulaklık', color: 'success' },
        { id: 'philips-mobile-acc', name: 'Philips Mobil ACC', color: 'primary' },
        { id: 'ugreen-mobile-acc', name: 'UGreen Mobil ACC', color: 'success' },
        { id: 'philips-other', name: 'Philips Diğer', color: 'primary' },
        { id: 'ugreen-other', name: 'UGreen Diğer', color: 'success' },
        { id: 'ugreen-it-aksesuar', name: 'UGreen IT Aksesuar', color: 'success' }
    ];
    
    let html = '<div class="row g-3" id="sales-categories-container">';
    
    categories.forEach(cat => {
        html += `
            <div class="col-12 col-md-6 col-lg-4 sales-category-item" data-category="${cat.id}" style="display: none;">
                <div class="card border-${cat.color} h-100">
                    <div class="card-header bg-${cat.color} text-white text-center py-2">
                        <strong>${cat.name}</strong>
                    </div>
                    <div class="card-body">
                        <div class="mb-2">
                            <label class="form-label small">Adet</label>
                            <input type="number" 
                                   class="form-control form-control-sm sales-input" 
                                   id="${cat.id}-qty" 
                                   data-category="${cat.id}"
                                   min="0" 
                                   value="0" 
                                   onchange="onSalesInputChange('${cat.id}')">
                        </div>
                        <div>
                            <label class="form-label small">Ciro (TL)</label>
                            <input type="text" 
                                   class="form-control form-control-sm sales-input" 
                                   id="${cat.id}-revenue" 
                                   data-category="${cat.id}"
                                   placeholder="0,00" 
                                   onchange="onSalesInputChange('${cat.id}')">
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // Toplam özet
    html += `
        <div class="card border-info mt-4">
            <div class="card-header bg-info text-white">
                <h6 class="mb-0">Toplam Özet</h6>
            </div>
            <div class="card-body">
                <div class="row text-center">
                    <div class="col-6">
                        <h5 class="text-primary mb-0" id="total-qty-display">0</h5>
                        <small class="text-muted">Adet</small>
                    </div>
                    <div class="col-6">
                        <h5 class="text-success mb-0" id="total-revenue-display">0,00 TL</h5>
                        <small class="text-muted">Ciro</small>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Notlar -->
        <div class="mt-3">
            <label class="form-label"><strong>Notlar (Opsiyonel)</strong></label>
            <textarea class="form-control" id="sales-notes" rows="2" 
                      placeholder="Günlük satışlar hakkında notlarınızı buraya yazabilirsiniz..."></textarea>
        </div>
    `;
    
    return html;
}

// Form değerlerini yükle
function loadFormValues() {
    if (!salesFormData || Object.keys(salesFormData).length === 0) return;
    
    const categories = [
        'philips-headphone', 'ugreen-headphone', 
        'philips-mobile-acc', 'ugreen-mobile-acc',
        'philips-other', 'ugreen-other', 'ugreen-it-aksesuar'
    ];
    
    categories.forEach(cat => {
        const fieldName = cat.replace(/-/g, '_');
        const qtyField = document.getElementById(`${cat}-qty`);
        const revField = document.getElementById(`${cat}-revenue`);
        
        if (qtyField && salesFormData[`${fieldName}_qty`]) {
            qtyField.value = salesFormData[`${fieldName}_qty`] || 0;
        }
        
        if (revField && salesFormData[`${fieldName}_revenue`]) {
            revField.value = formatCurrencyInput(salesFormData[`${fieldName}_revenue`] || 0);
        }
        
        // Eğer değer varsa kategoriyi göster
        if (salesFormData[`${fieldName}_qty`] > 0 || salesFormData[`${fieldName}_revenue`] > 0) {
            const categoryItem = document.querySelector(`.sales-category-item[data-category="${cat}"]`);
            if (categoryItem) {
                categoryItem.style.display = '';
            }
        }
    });
    
    // Notlar
    if (salesFormData.notes && document.getElementById('sales-notes')) {
        document.getElementById('sales-notes').value = salesFormData.notes;
    }
}

// Satış input değiştiğinde
function onSalesInputChange(categoryId) {
    const qtyField = document.getElementById(`${categoryId}-qty`);
    const revField = document.getElementById(`${categoryId}-revenue`);
    const categoryItem = document.querySelector(`.sales-category-item[data-category="${categoryId}"]`);
    
    const qty = parseInt(qtyField.value) || 0;
    const rev = parseCurrency(revField.value) || 0;
    
    // Eğer değer varsa kategoriyi göster, yoksa gizle
    if (qty > 0 || rev > 0) {
        if (categoryItem) {
            categoryItem.style.display = '';
        }
    } else {
        // Tüm inputlar 0 ise gizle
        if (categoryItem && qty === 0 && rev === 0) {
            // Sadece her iki alan da 0 ise gizle
            qtyField.value = 0;
            revField.value = '';
            categoryItem.style.display = 'none';
        }
    }
    
    calculateTotal();
}

// Durum değiştiğinde
function handleStatusChange() {
    const status = document.querySelector('input[name="dayStatus"]:checked')?.value;
    const formCard = document.getElementById('sales-entry-form-card');
    
    if (status === 'Aktif') {
        if (formCard) formCard.style.display = 'block';
    } else {
        if (formCard) formCard.style.display = 'none';
    }
}

// Toplam hesapla
function calculateTotal() {
    let totalQty = 0;
    let totalRevenue = 0;
    
    const categories = [
        'philips-headphone', 'ugreen-headphone',
        'philips-mobile-acc', 'ugreen-mobile-acc',
        'philips-other', 'ugreen-other', 'ugreen-it-aksesuar'
    ];
    
    categories.forEach(cat => {
        const qtyField = document.getElementById(`${cat}-qty`);
        const revField = document.getElementById(`${cat}-revenue`);
        
        if (qtyField) {
            totalQty += parseInt(qtyField.value) || 0;
        }
        
        if (revField) {
            totalRevenue += parseCurrency(revField.value) || 0;
        }
    });
    
    // Toplam göster
    const totalQtyDisplay = document.getElementById('total-qty-display');
    const totalRevDisplay = document.getElementById('total-revenue-display');
    
    if (totalQtyDisplay) {
        totalQtyDisplay.textContent = totalQty;
    }
    
    if (totalRevDisplay) {
        totalRevDisplay.textContent = formatCurrency(totalRevenue);
    }
}

// Toplam geliri hesapla (bu ay)
function calculateTotalRevenue() {
    return currentMonthSales.reduce((sum, sale) => {
        return sum + (parseFloat(sale.total_revenue) || 0);
    }, 0);
}

// Satış kaydet
async function saveSalesEntry() {
    try {
        const loadingId = showLoading('Kaydediliyor', 'Satış verileri kaydediliyor...');
        
        const user = checkUserSession();
        if (!user || !user.storeId || !user.department) {
            hideLoading(loadingId);
            showAlert('Kullanıcı bilgisi bulunamadı!', 'danger');
            return;
        }
        
        const status = document.querySelector('input[name="dayStatus"]:checked')?.value || 'Aktif';
        const department = user.department || 'Ortak';
        
        // Eğer Aktif değilse, sadece attendance kaydı yap
        if (status !== 'Aktif') {
            await saveAttendanceOnly(user, department, status);
            hideLoading(loadingId);
            showAlert('Durum başarıyla kaydedildi!', 'success');
            return;
        }
        
        // Satış verilerini topla
        const salesData = collectSalesData(user, department);
        
        // Satış kaydını kaydet
        const { error: salesError } = await supabase
            .from('sales_entries')
            .upsert(salesData, {
                onConflict: 'user_id,store_id,department,entry_date'
            });
        
        if (salesError) throw salesError;
        
        // Attendance kaydını kaydet
        await saveAttendanceOnly(user, department, 'Aktif');
        
        hideLoading(loadingId);
        
        // Özet göster
        showSalesSummary(salesData);
        
    } catch (error) {
        console.error('Satış kaydetme hatası:', error);
        showAlert('Hata: ' + error.message, 'danger');
    }
}

// Sadece attendance kaydet
async function saveAttendanceOnly(user, department, status) {
    const { error } = await supabase
        .from('attendance_records')
        .upsert({
            user_id: parseInt(user.id),
            store_id: parseInt(user.storeId),
            department: department,
            attendance_date: currentDate,
            status: status
        }, {
            onConflict: 'user_id,store_id,department,attendance_date'
        });
    
    if (error) throw error;
}

// Satış verilerini topla
function collectSalesData(user, department) {
    const categories = [
        { id: 'philips-headphone', field: 'philips_headphone' },
        { id: 'ugreen-headphone', field: 'ugreen_headphone' },
        { id: 'philips-mobile-acc', field: 'philips_mobile_acc' },
        { id: 'ugreen-mobile-acc', field: 'ugreen_mobile_acc' },
        { id: 'philips-other', field: 'philips_other' },
        { id: 'ugreen-other', field: 'ugreen_other' },
        { id: 'ugreen-it-aksesuar', field: 'ugreen_it_aksesuar' }
    ];
    
    let totalQty = 0;
    let totalRevenue = 0;
    const data = {
        user_id: parseInt(user.id),
        store_id: parseInt(user.storeId),
        department: department,
        entry_date: currentDate,
        notes: document.getElementById('sales-notes')?.value || ''
    };
    
    categories.forEach(cat => {
        const qtyField = document.getElementById(`${cat.id}-qty`);
        const revField = document.getElementById(`${cat.id}-revenue`);
        
        const qty = parseInt(qtyField?.value) || 0;
        const rev = parseCurrency(revField?.value) || 0;
        
        data[`${cat.field}_qty`] = qty;
        data[`${cat.field}_revenue`] = rev;
        
        totalQty += qty;
        totalRevenue += rev;
    });
    
    data.total_qty = totalQty;
    data.total_revenue = totalRevenue;
    
    return data;
}

// Satış özeti göster
function showSalesSummary(salesData) {
    const container = document.getElementById('sales-entry-content');
    if (!container) return;
    
    const categories = [
        { field: 'philips_headphone', name: 'Philips Kulaklık' },
        { field: 'ugreen_headphone', name: 'UGreen Kulaklık' },
        { field: 'philips_mobile_acc', name: 'Philips Mobil ACC' },
        { field: 'ugreen_mobile_acc', name: 'UGreen Mobil ACC' },
        { field: 'philips_other', name: 'Philips Diğer' },
        { field: 'ugreen_other', name: 'UGreen Diğer' },
        { field: 'ugreen_it_aksesuar', name: 'UGreen IT Aksesuar' }
    ];
    
    let summaryHtml = `
        <div class="alert alert-success">
            <h5 class="alert-heading">
                <i class="fas fa-check-circle me-2"></i>Satış Başarıyla Kaydedildi!
            </h5>
            <hr>
            <div class="row g-3 mb-3">
                <div class="col-6">
                    <strong>Toplam Adet:</strong> ${salesData.total_qty}
                </div>
                <div class="col-6">
                    <strong>Toplam Ciro:</strong> ${formatCurrency(salesData.total_revenue)}
                </div>
            </div>
            
            <h6 class="mt-3">Kategori Detayları:</h6>
            <div class="table-responsive">
                <table class="table table-sm table-bordered">
                    <thead class="table-light">
                        <tr>
                            <th>Kategori</th>
                            <th class="text-end">Adet</th>
                            <th class="text-end">Ciro</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    categories.forEach(cat => {
        const qty = salesData[`${cat.field}_qty`] || 0;
        const rev = salesData[`${cat.field}_revenue`] || 0;
        
        if (qty > 0 || rev > 0) {
            summaryHtml += `
                <tr>
                    <td>${cat.name}</td>
                    <td class="text-end">${qty}</td>
                    <td class="text-end">${formatCurrency(rev)}</td>
                </tr>
            `;
        }
    });
    
    summaryHtml += `
                    </tbody>
                </table>
            </div>
            
            <div class="mt-3">
                <button class="btn btn-primary" onclick="initializeSalesEntry()">
                    <i class="fas fa-redo me-2"></i>Yeni Giriş
                </button>
                <button class="btn btn-secondary" onclick="location.reload()">
                    <i class="fas fa-home me-2"></i>Ana Sayfaya Dön
                </button>
            </div>
        </div>
    `;
    
    container.innerHTML = summaryHtml;
}

// Para birimi formatı
function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2
    }).format(amount || 0);
}

// Para birimi formatı (input için)
function formatCurrencyInput(amount) {
    if (!amount || amount === 0) return '';
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Para birimi parse et
function parseCurrency(value) {
    if (!value) return 0;
    // Türkçe formatı: 1.234,56 -> 1234.56
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
}

// Global fonksiyonlar
window.handleStatusChange = handleStatusChange;
window.onSalesInputChange = onSalesInputChange;
window.calculateTotal = calculateTotal;
window.saveSalesEntry = saveSalesEntry;
window.initializeSalesEntry = initializeSalesEntry;

