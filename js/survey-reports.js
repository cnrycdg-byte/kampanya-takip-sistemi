// ============================================
// ANKET RAPORLAMA SİSTEMİ
// ============================================

console.log('Survey Reports JS yüklendi');

// ============================================
// 1. GENEL DASHBOARD YÜ KLEMEN
// ============================================
async function loadSurveyDashboard() {
    console.log('Survey dashboard yükleniyor...');
    
    try {
        // KPI verilerini çek
        const { data: kpiData, error: kpiError } = await supabase
            .from('v_kpi_summary')
            .select('*')
            .order('year', { ascending: false })
            .order('month', { ascending: false })
            .limit(1)
            .single();
        
        if (kpiError) throw kpiError;
        
        console.log('KPI verileri:', kpiData);
        
        // KPI kartlarını doldur
        if (kpiData) {
            document.getElementById('kpi-total-stores').textContent = kpiData.total_stores_participated || 0;
            document.getElementById('kpi-completion-rate').textContent = (kpiData.completion_rate || 0) + '%';
            document.getElementById('kpi-total-promoters').textContent = kpiData.total_promoters || 0;
            document.getElementById('kpi-total-investments').textContent = kpiData.total_investment_areas || 0;
        }
        
        // Marka dağılımı grafiğini yükle
        await loadBrandDistributionChart();
        
        // Kanal dağılımı grafiğini yükle
        await loadChannelDistributionChart();
        
    } catch (error) {
        console.error('Dashboard yükleme hatası:', error);
        showAlert('Dashboard yüklenirken hata oluştu: ' + error.message, 'danger');
    }
}

// ============================================
// 2. PROMOTÖR RAPORU
// ============================================
async function loadPromoterReport() {
    console.log('Promotör raporu yükleniyor...');
    
    const surveyId = document.getElementById('promoter-survey-select').value;
    const channelFilter = document.getElementById('promoter-channel-filter')?.value || '';
    const regionFilter = document.getElementById('promoter-region-filter')?.value || '';
    
    if (!surveyId) {
        document.getElementById('promoter-report-table').innerHTML = '<div class="alert alert-info">Lütfen bir anket seçiniz</div>';
        return;
    }
    
    try {
        // Promotör verilerini çek
        let query = supabase
            .from('v_promoter_report')
            .select('*')
            .eq('survey_id', surveyId);
        
        if (channelFilter) query = query.eq('channel_name', channelFilter);
        if (regionFilter) query = query.eq('region', regionFilter);
        
        const { data, error } = await query.order('store_name');
        
        if (error) throw error;
        
        console.log('Promotör verileri:', data);
        
        // Veriyi işle ve tabloyu oluştur
        displayPromoterReport(data);
        
    } catch (error) {
        console.error('Promotör raporu yükleme hatası:', error);
        showAlert('Promotör raporu yüklenirken hata oluştu: ' + error.message, 'danger');
    }
}

function displayPromoterReport(data) {
    if (!data || data.length === 0) {
        document.getElementById('promoter-report-table').innerHTML = '<div class="alert alert-info">Veri bulunamadı</div>';
        return;
    }
    
    // Mağazaları grupla
    const storeData = {};
    
    data.forEach(row => {
        const storeKey = row.store_id;
        
        if (!storeData[storeKey]) {
            storeData[storeKey] = {
                store_name: row.store_name,
                channel_name: row.channel_name,
                region: row.region,
                brands: {}
            };
        }
        
        // Brand data'yı parse et
        const brands = row.answer_data?.brands || [];
        brands.forEach(brand => {
            if (brand.selected) {
                storeData[storeKey].brands[brand.label] = brand.count || 0;
            }
        });
    });
    
    // Tüm markaları topla (sütun başlıkları için)
    const allBrands = new Set();
    Object.values(storeData).forEach(store => {
        Object.keys(store.brands).forEach(brand => allBrands.add(brand));
    });
    
    const brandList = Array.from(allBrands).sort();
    
    // Tablo oluştur
    let html = `
        <div class="table-responsive">
            <table class="table table-bordered table-hover">
                <thead class="table-primary">
                    <tr>
                        <th>Mağaza</th>
                        <th>Kanal</th>
                        <th>Bölge</th>
                        ${brandList.map(brand => `<th>${brand}</th>`).join('')}
                        <th>Toplam</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    Object.values(storeData).forEach(store => {
        let total = 0;
        const brandCells = brandList.map(brand => {
            const count = store.brands[brand] || 0;
            total += count;
            return `<td class="text-center">${count || '-'}</td>`;
        }).join('');
        
        html += `
            <tr>
                <td>${store.store_name}</td>
                <td>${store.channel_name || '-'}</td>
                <td>${store.region || '-'}</td>
                ${brandCells}
                <td class="fw-bold text-center">${total}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <div class="mt-3">
            <button class="btn btn-success" onclick="exportPromoterToExcel()">
                <i class="fas fa-file-excel me-2"></i>Excel'e Aktar
            </button>
        </div>
    `;
    
    document.getElementById('promoter-report-table').innerHTML = html;
}

// ============================================
// 3. YATIRIM ALANI RAPORU
// ============================================
async function loadInvestmentReport() {
    console.log('Yatırım alanı raporu yükleniyor...');
    
    const surveyId = document.getElementById('investment-survey-select').value;
    
    if (!surveyId) {
        document.getElementById('investment-report-table').innerHTML = '<div class="alert alert-info">Lütfen bir anket seçiniz</div>';
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('v_investment_report')
            .select('*')
            .eq('survey_id', surveyId)
            .order('store_name');
        
        if (error) throw error;
        
        console.log('Yatırım alanı verileri:', data);
        
        displayInvestmentReport(data);
        
    } catch (error) {
        console.error('Yatırım alanı raporu yükleme hatası:', error);
        showAlert('Yatırım alanı raporu yüklenirken hata oluştu: ' + error.message, 'danger');
    }
}

function displayInvestmentReport(data) {
    if (!data || data.length === 0) {
        document.getElementById('investment-report-table').innerHTML = '<div class="alert alert-info">Veri bulunamadı</div>';
        return;
    }
    
    let html = `
        <div class="table-responsive">
            <table class="table table-bordered table-hover">
                <thead class="table-primary">
                    <tr>
                        <th>Mağaza</th>
                        <th>Kanal</th>
                        <th>Bölge</th>
                        <th>Marka</th>
                        <th>Alan Tipi</th>
                        <th>Fotoğraflar</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    data.forEach(row => {
        const areas = row.answer_data?.areas || [];
        const photos = row.photos || [];
        
        areas.forEach((area, index) => {
            const areaPhotos = photos.filter(p => p.area_index === index);
            const photoLinks = areaPhotos.map(p => 
                `<a href="${p.url}" target="_blank" class="btn btn-sm btn-outline-primary me-1">
                    <i class="fas fa-image"></i>
                </a>`
            ).join('');
            
            html += `
                <tr>
                    <td>${row.store_name}</td>
                    <td>${row.channel_name || '-'}</td>
                    <td>${row.region || '-'}</td>
                    <td>${area.brand || '-'}</td>
                    <td>${area.category_label || '-'}</td>
                    <td>${photoLinks || '-'}</td>
                </tr>
            `;
        });
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <div class="mt-3">
            <button class="btn btn-success" onclick="exportInvestmentToExcel()">
                <i class="fas fa-file-excel me-2"></i>Excel'e Aktar
            </button>
        </div>
    `;
    
    document.getElementById('investment-report-table').innerHTML = html;
}

// ============================================
// 4. SEPET ANALİZİ RAPORU
// ============================================
async function loadBasketReport() {
    console.log('Sepet raporu yükleniyor...');
    
    const surveyId = document.getElementById('basket-survey-select').value;
    
    if (!surveyId) {
        document.getElementById('basket-report-table').innerHTML = '<div class="alert alert-info">Lütfen bir anket seçiniz</div>';
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('v_basket_report')
            .select('*')
            .eq('survey_id', surveyId)
            .order('store_name');
        
        if (error) throw error;
        
        console.log('Sepet verileri:', data);
        
        displayBasketReport(data);
        
    } catch (error) {
        console.error('Sepet raporu yükleme hatası:', error);
        showAlert('Sepet raporu yüklenirken hata oluştu: ' + error.message, 'danger');
    }
}

function displayBasketReport(data) {
    if (!data || data.length === 0) {
        document.getElementById('basket-report-table').innerHTML = '<div class="alert alert-info">Veri bulunamadı</div>';
        return;
    }
    
    // Mağazaları grupla
    const storeData = {};
    
    data.forEach(row => {
        const storeKey = row.store_id;
        
        if (!storeData[storeKey]) {
            storeData[storeKey] = {
                store_name: row.store_name,
                channel_name: row.channel_name,
                region: row.region,
                basket_count: row.basket_count || 0,
                brands: {}
            };
        }
        
        // Sepet verilerini parse et
        const baskets = row.answer_data?.baskets || [];
        baskets.forEach(basket => {
            const brand = basket.brand;
            if (!storeData[storeKey].brands[brand]) {
                storeData[storeKey].brands[brand] = {
                    count: 0,
                    total_price: 0,
                    products: []
                };
            }
            storeData[storeKey].brands[brand].count++;
            storeData[storeKey].brands[brand].total_price += parseFloat(basket.price || 0);
            storeData[storeKey].brands[brand].products.push({
                name: basket.product_name,
                artikel: basket.artikel,
                price: basket.price
            });
        });
    });
    
    // Tüm markaları topla
    const allBrands = new Set();
    Object.values(storeData).forEach(store => {
        Object.keys(store.brands).forEach(brand => allBrands.add(brand));
    });
    
    const brandList = Array.from(allBrands).sort();
    
    // Tablo oluştur
    let html = `
        <div class="table-responsive">
            <table class="table table-bordered table-hover">
                <thead class="table-primary">
                    <tr>
                        <th rowspan="2">Mağaza</th>
                        <th rowspan="2">Kanal</th>
                        <th rowspan="2">Toplam Sepet</th>
                        ${brandList.map(brand => `<th colspan="2" class="text-center">${brand}</th>`).join('')}
                    </tr>
                    <tr>
                        ${brandList.map(() => `<th>Adet</th><th>%</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    Object.values(storeData).forEach(store => {
        const brandCells = brandList.map(brand => {
            const brandData = store.brands[brand];
            const count = brandData ? brandData.count : 0;
            const percentage = store.basket_count > 0 ? ((count / store.basket_count) * 100).toFixed(1) : 0;
            
            return `<td class="text-center">${count || '-'}</td><td class="text-center">${percentage}%</td>`;
        }).join('');
        
        html += `
            <tr>
                <td>${store.store_name}</td>
                <td>${store.channel_name || '-'}</td>
                <td class="fw-bold text-center">${store.basket_count}</td>
                ${brandCells}
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <div class="mt-3">
            <button class="btn btn-success" onclick="exportBasketToExcel()">
                <i class="fas fa-file-excel me-2"></i>Excel'e Aktar
            </button>
        </div>
    `;
    
    document.getElementById('basket-report-table').innerHTML = html;
}

// ============================================
// 5. ANKET LİSTESİNİ YÜKLE (Filtre için)
// ============================================
async function loadSurveyFilters() {
    try {
        const { data: surveys, error } = await supabase
            .from('surveys')
            .select('id, title, month, year')
            .eq('status', 'active')
            .order('year', { ascending: false })
            .order('month', { ascending: false });
        
        if (error) throw error;
        
        // Tüm select elementlerini doldur
        const selects = [
            'promoter-survey-select',
            'investment-survey-select',
            'basket-survey-select',
            'gsm-survey-select'
        ];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Seçiniz</option>';
                surveys.forEach(survey => {
                    const option = document.createElement('option');
                    option.value = survey.id;
                    option.textContent = `${survey.title} (${getMonthName(survey.month)} ${survey.year})`;
                    select.appendChild(option);
                });
            }
        });
        
        // Kanal filtrelerini yükle
        await loadChannelFilters();
        
    } catch (error) {
        console.error('Anket filtreleri yükleme hatası:', error);
    }
}

async function loadChannelFilters() {
    try {
        const { data: channels, error } = await supabase
            .from('channels')
            .select('id, channel_name')
            .order('channel_name');
        
        if (error) throw error;
        
        const channelSelects = [
            'promoter-channel-filter',
            'investment-channel-filter',
            'basket-channel-filter'
        ];
        
        channelSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Tüm Kanallar</option>';
                channels.forEach(channel => {
                    const option = document.createElement('option');
                    option.value = channel.channel_name;
                    option.textContent = channel.channel_name;
                    select.appendChild(option);
                });
            }
        });
        
    } catch (error) {
        console.error('Kanal filtreleri yükleme hatası:', error);
    }
}

// ============================================
// 6. EXCEL EXPORT FONKSİYONLARI
// ============================================
function exportPromoterToExcel() {
    // TODO: SheetJS ile Excel export
    showAlert('Excel export özelliği yakında eklenecek', 'info');
}

function exportInvestmentToExcel() {
    // TODO: SheetJS ile Excel export
    showAlert('Excel export özelliği yakında eklenecek', 'info');
}

function exportBasketToExcel() {
    // TODO: SheetJS ile Excel export
    showAlert('Excel export özelliği yakında eklenecek', 'info');
}

// ============================================
// 7. YARDIMCI FONKSİYONLAR
// ============================================
function getMonthName(month) {
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return months[month - 1] || '';
}

// ============================================
// 8. SAYFA YÜKLENDİĞİNDE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Survey Reports yüklendi');
    
    // Anket filtrelerini yükle
    loadSurveyFilters();
});

console.log('Survey Reports JS tamamen yüklendi ✅');

