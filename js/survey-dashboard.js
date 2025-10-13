// ============================================
// ANKET RAPORLARI DASHBOARD - İNTERAKTİF KPI'LAR
// ============================================

console.log('Survey Dashboard JS yüklendi');

// Global veri saklama
let dashboardData = {
    assignedStores: [],
    completedStores: [],
    pendingStores: [],
    promotersByBrand: {},
    investmentsByBrand: {}
};

// ============================================
// 1. MAĞAZA DURUMU MODAL'I
// ============================================

function showStoreStatusModal() {
    const { assignedStores, completedStores, pendingStores } = dashboardData;
    
    let html = `
        <div class="modal fade" id="storeStatusModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-store me-2"></i>
                            Mağaza Katılım Durumu
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <ul class="nav nav-pills mb-3" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" data-bs-toggle="pill" data-bs-target="#completed-tab">
                                    <i class="fas fa-check-circle text-success"></i> Tamamlanan (${completedStores.length})
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" data-bs-toggle="pill" data-bs-target="#pending-tab">
                                    <i class="fas fa-clock text-warning"></i> Bekleyen (${pendingStores.length})
                                </button>
                            </li>
                        </ul>
                        
                        <div class="tab-content">
                            <!-- Tamamlanan Tab -->
                            <div class="tab-pane fade show active" id="completed-tab">
                                ${generateStoreList(completedStores, 'success')}
                            </div>
                            
                            <!-- Bekleyen Tab -->
                            <div class="tab-pane fade" id="pending-tab">
                                ${generateStoreList(pendingStores, 'warning')}
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
    
    // Eski modal'ı kaldır
    const oldModal = document.getElementById('storeStatusModal');
    if (oldModal) oldModal.remove();
    
    // Yeni modal'ı ekle
    document.body.insertAdjacentHTML('beforeend', html);
    
    // Modal'ı göster
    const modal = new bootstrap.Modal(document.getElementById('storeStatusModal'));
    modal.show();
}

function generateStoreList(stores, badgeClass) {
    if (stores.length === 0) {
        return '<p class="text-muted text-center py-4">Mağaza bulunamadı</p>';
    }
    
    let html = '<div class="list-group">';
    stores.forEach(store => {
        html += `
            <div class="list-group-item">
                <div class="d-flex w-100 justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${store.name}</h6>
                        <small class="text-muted">
                            <i class="fas fa-map-marker-alt"></i> ${store.channel_name || '-'} / ${store.region_name || '-'}
                        </small>
                    </div>
                    <span class="badge bg-${badgeClass}">
                        ${badgeClass === 'success' ? 'Tamamlandı' : 'Bekliyor'}
                    </span>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    return html;
}

// ============================================
// 2. PROMOTÖR DAĞILIM MODAL'I
// ============================================

function showPromoterBreakdownModal() {
    const { promotersByBrand } = dashboardData;
    
    // Verileri sırala (en çok promotörden en aza)
    const sortedBrands = Object.entries(promotersByBrand)
        .sort((a, b) => b[1] - a[1]);
    
    let html = `
        <div class="modal fade" id="promoterModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-info text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-users me-2"></i>
                            Promotör Marka Dağılımı
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Marka</th>
                                        <th>Promotör Sayısı</th>
                                        <th>Oran</th>
                                    </tr>
                                </thead>
                                <tbody>
    `;
    
    const totalPromoters = sortedBrands.reduce((sum, [brand, count]) => sum + count, 0);
    
    sortedBrands.forEach(([brand, count], index) => {
        const percentage = ((count / totalPromoters) * 100).toFixed(1);
        html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${brand}</strong></td>
                <td>${count} kişi</td>
                <td>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar bg-info" role="progressbar" 
                             style="width: ${percentage}%" 
                             aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
                            ${percentage}%
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                                </tbody>
                                <tfoot>
                                    <tr class="table-primary">
                                        <th colspan="2">TOPLAM</th>
                                        <th>${totalPromoters} kişi</th>
                                        <th>100%</th>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Eski modal'ı kaldır
    const oldModal = document.getElementById('promoterModal');
    if (oldModal) oldModal.remove();
    
    // Yeni modal'ı ekle
    document.body.insertAdjacentHTML('beforeend', html);
    
    // Modal'ı göster
    const modal = new bootstrap.Modal(document.getElementById('promoterModal'));
    modal.show();
}

// ============================================
// 3. YATIRIM ALANI DAĞILIM MODAL'I
// ============================================

function showInvestmentBreakdownModal() {
    const { investmentsByBrand } = dashboardData;
    
    let html = `
        <div class="modal fade" id="investmentModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header bg-warning">
                        <h5 class="modal-title">
                            <i class="fas fa-store-alt me-2"></i>
                            Yatırım Alanı Marka + Alan Tipi Dağılımı
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table class="table table-hover table-bordered">
                                <thead class="table-warning">
                                    <tr>
                                        <th>#</th>
                                        <th>Marka</th>
                                        <th>Duvar Standı</th>
                                        <th>Orta Alan Standı</th>
                                        <th>Diğer</th>
                                        <th>Toplam</th>
                                    </tr>
                                </thead>
                                <tbody>
    `;
    
    let totalWall = 0, totalMiddle = 0, totalOther = 0, totalAll = 0;
    let rowIndex = 1;
    
    Object.entries(investmentsByBrand).forEach(([brand, types]) => {
        const wall = types.wall || 0;
        const middle = types.middle || 0;
        const other = types.other || 0;
        const brandTotal = wall + middle + other;
        
        totalWall += wall;
        totalMiddle += middle;
        totalOther += other;
        totalAll += brandTotal;
        
        html += `
            <tr>
                <td>${rowIndex++}</td>
                <td><strong>${brand}</strong></td>
                <td class="text-center">${wall > 0 ? `<span class="badge bg-primary">${wall}</span>` : '-'}</td>
                <td class="text-center">${middle > 0 ? `<span class="badge bg-info">${middle}</span>` : '-'}</td>
                <td class="text-center">${other > 0 ? `<span class="badge bg-secondary">${other}</span>` : '-'}</td>
                <td class="text-center"><strong>${brandTotal}</strong></td>
            </tr>
        `;
    });
    
    html += `
                                </tbody>
                                <tfoot>
                                    <tr class="table-warning">
                                        <th colspan="2">TOPLAM</th>
                                        <th class="text-center">${totalWall}</th>
                                        <th class="text-center">${totalMiddle}</th>
                                        <th class="text-center">${totalOther}</th>
                                        <th class="text-center">${totalAll}</th>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Eski modal'ı kaldır
    const oldModal = document.getElementById('investmentModal');
    if (oldModal) oldModal.remove();
    
    // Yeni modal'ı ekle
    document.body.insertAdjacentHTML('beforeend', html);
    
    // Modal'ı göster
    const modal = new bootstrap.Modal(document.getElementById('investmentModal'));
    modal.show();
}

// ============================================
// 4. EXCEL EXPORT
// ============================================

async function exportSurveyToExcel() {
    console.log('📊 Excel export başlatılıyor...');
    
    try {
        // Filtre bilgilerini al
        const surveyId = document.getElementById('filter-survey').value;
        const channelFilter = document.getElementById('filter-channel').value;
        const regionFilter = document.getElementById('filter-region').value;
        
        if (!surveyId) {
            alert('Lütfen önce bir anket seçin!');
            return;
        }
        
        // Yükleniyor göstergesi
        const btn = event.target;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Hazırlanıyor...';
        btn.disabled = true;
        
        // Excel dosyası oluştur
        const wb = XLSX.utils.book_new();
        
        // Sheet 1: Mağaza Durumları
        const storeSheet = createStoreStatusSheet();
        XLSX.utils.book_append_sheet(wb, storeSheet, "Mağaza Durumları");
        
        // Sheet 2: Promotör Dağılımı
        const promoterSheet = createPromoterSheet();
        XLSX.utils.book_append_sheet(wb, promoterSheet, "Promotör Dağılımı");
        
        // Sheet 3: Yatırım Alanları
        const investmentSheet = createInvestmentSheet();
        XLSX.utils.book_append_sheet(wb, investmentSheet, "Yatırım Alanları");
        
        // Dosyayı indir
        const surveyTitle = document.getElementById('filter-survey').selectedOptions[0].text;
        XLSX.writeFile(wb, `Anket_Raporu_${surveyTitle}.xlsx`);
        
        // Butonu eski haline getir
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        console.log('✅ Excel export tamamlandı!');
        
    } catch (error) {
        console.error('❌ Excel export hatası:', error);
        alert('Excel oluşturulurken hata oluştu: ' + error.message);
    }
}

function createStoreStatusSheet() {
    const data = [
        ['Mağaza Adı', 'Kanal', 'Bölge', 'Durum'],
        ...dashboardData.completedStores.map(s => [s.name, s.channel_name || '-', s.region_name || '-', 'Tamamlandı']),
        ...dashboardData.pendingStores.map(s => [s.name, s.channel_name || '-', s.region_name || '-', 'Bekliyor'])
    ];
    return XLSX.utils.aoa_to_sheet(data);
}

function createPromoterSheet() {
    const data = [
        ['Marka', 'Promotör Sayısı']
    ];
    Object.entries(dashboardData.promotersByBrand).forEach(([brand, count]) => {
        data.push([brand, count]);
    });
    return XLSX.utils.aoa_to_sheet(data);
}

function createInvestmentSheet() {
    const data = [
        ['Marka', 'Duvar Standı', 'Orta Alan Standı', 'Diğer', 'Toplam']
    ];
    Object.entries(dashboardData.investmentsByBrand).forEach(([brand, types]) => {
        data.push([
            brand,
            types.wall || 0,
            types.middle || 0,
            types.other || 0,
            (types.wall || 0) + (types.middle || 0) + (types.other || 0)
        ]);
    });
    return XLSX.utils.aoa_to_sheet(data);
}

console.log('Survey Dashboard JS tamamen yüklendi ✅');

