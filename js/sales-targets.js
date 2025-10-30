// Sales Targets Modülü JavaScript

let targetsStores = [];
let allTargets = [];
let selectedMonth = new Date().getMonth() + 1;
let selectedYear = new Date().getFullYear();

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('sales-targets-section')) {
        loadStoresForTargets();
        loadTargets();
    }
});

// Mağazaları yükle
async function loadStoresForTargets() {
    try {
        const { data, error } = await supabase
            .from('stores')
            .select('*')
            .order('name');
        
        if (error) throw error;
        targetsStores = data || [];
        console.log('Mağazalar yüklendi:', targetsStores.length);
    } catch (error) {
        console.error('Mağaza yükleme hatası:', error);
        showAlert('Mağazalar yüklenemedi!', 'danger');
    }
}

// Hedefleri yükle
async function loadTargets() {
    try {
        const { data, error } = await supabase
            .from('sales_targets')
            .select('*')
            .eq('month', selectedMonth)
            .eq('year', selectedYear);
        
        if (error) throw error;
        allTargets = data || [];
        console.log('Hedefler yüklendi:', allTargets.length);
        
        displayTargetsTable();
    } catch (error) {
        console.error('Hedef yükleme hatası:', error);
        showAlert('Hedefler yüklenemedi!', 'danger');
    }
}

// Hedef tablosunu göster
function displayTargetsTable() {
    const container = document.getElementById('targets-table-container');
    if (!container) return;
    
    let html = `
        <div class="table-responsive">
            <table class="table table-bordered table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Mağaza</th>
                        <th>Departman</th>
                        <th>PPK Hedef (Adet/Ciro)</th>
                        <th>Aksesuar Hedef (Adet/Ciro)</th>
                        <th>GSM ACC Hedef (Adet/Ciro)</th>
                        <th>Toplam Hedef (Adet/Ciro)</th>
                        <th>UGreen Hedef (Adet/Ciro)</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody id="targets-tbody">
    `;
    
    targetsStores.forEach(store => {
        ['Mobil ACC', 'Kulaklık', 'Ortak'].forEach(dept => {
            const existingTarget = allTargets.find(t => 
                t.store_id === store.id && t.department === dept
            );
            
            html += `
                <tr data-store-id="${store.id}" data-department="${dept}">
                    <td>${store.name}</td>
                    <td>${dept}</td>
                    <td>
                        <input type="number" class="form-control form-control-sm" 
                               data-type="ppk-qty" value="${existingTarget?.ppk_target_qty || 0}">
                        <input type="text" class="form-control form-control-sm mt-1" 
                               placeholder="Ciro" data-type="ppk-rev" 
                               value="${existingTarget?.ppk_target_revenue || ''}">
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm" 
                               data-type="aksesuar-qty" value="${existingTarget?.aksesuar_target_qty || 0}">
                        <input type="text" class="form-control form-control-sm mt-1" 
                               placeholder="Ciro" data-type="aksesuar-rev" 
                               value="${existingTarget?.aksesuar_target_revenue || ''}">
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm" 
                               data-type="gsm-qty" value="${existingTarget?.gsm_acc_target_qty || 0}">
                        <input type="text" class="form-control form-control-sm mt-1" 
                               placeholder="Ciro" data-type="gsm-rev" 
                               value="${existingTarget?.gsm_acc_target_revenue || ''}">
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm" 
                               data-type="toplam-qty" value="${existingTarget?.toplam_target_qty || 0}">
                        <input type="text" class="form-control form-control-sm mt-1" 
                               placeholder="Ciro" data-type="toplam-rev" 
                               value="${existingTarget?.toplam_target_revenue || ''}">
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm" 
                               data-type="ugreen-qty" value="${existingTarget?.ugreen_target_qty || 0}">
                        <input type="text" class="form-control form-control-sm mt-1" 
                               placeholder="Ciro" data-type="ugreen-rev" 
                               value="${existingTarget?.ugreen_target_revenue || ''}">
                    </td>
                    <td>
                        <button class="btn btn-success btn-sm" onclick="saveTarget('${store.id}', '${dept}')">
                            <i class="fas fa-save"></i> Kaydet
                        </button>
                    </td>
                </tr>
            `;
        });
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

// Hedef kaydet
async function saveTarget(storeId, department) {
    try {
        const row = document.querySelector(`tr[data-store-id="${storeId}"][data-department="${department}"]`);
        if (!row) return;
        
        const targetData = {
            store_id: storeId,
            month: selectedMonth,
            year: selectedYear,
            department: department,
            ppk_target_qty: parseInt(row.querySelector('[data-type="ppk-qty"]').value) || 0,
            ppk_target_revenue: parseFloat(row.querySelector('[data-type="ppk-rev"]').value.replace(/[.]/g, '').replace(',', '.')) || 0,
            aksesuar_target_qty: parseInt(row.querySelector('[data-type="aksesuar-qty"]').value) || 0,
            aksesuar_target_revenue: parseFloat(row.querySelector('[data-type="aksesuar-rev"]').value.replace(/[.]/g, '').replace(',', '.')) || 0,
            gsm_acc_target_qty: parseInt(row.querySelector('[data-type="gsm-qty"]').value) || 0,
            gsm_acc_target_revenue: parseFloat(row.querySelector('[data-type="gsm-rev"]').value.replace(/[.]/g, '').replace(',', '.')) || 0,
            toplam_target_qty: parseInt(row.querySelector('[data-type="toplam-qty"]').value) || 0,
            toplam_target_revenue: parseFloat(row.querySelector('[data-type="toplam-rev"]').value.replace(/[.]/g, '').replace(',', '.')) || 0,
            ugreen_target_qty: parseInt(row.querySelector('[data-type="ugreen-qty"]').value) || 0,
            ugreen_target_revenue: parseFloat(row.querySelector('[data-type="ugreen-rev"]').value.replace(/[.]/g, '').replace(',', '.')) || 0
        };
        
        const { error } = await supabase
            .from('sales_targets')
            .upsert(targetData, {
                onConflict: 'store_id,month,year,department'
            });
        
        if (error) throw error;
        
        showAlert('Hedef başarıyla kaydedildi!', 'success');
        loadTargets();
        
    } catch (error) {
        console.error('Hedef kaydetme hatası:', error);
        showAlert('Hata: ' + error.message, 'danger');
    }
}

// Ay/Yıl değiştir
function changeTargetPeriod() {
    selectedMonth = parseInt(document.getElementById('target-month').value);
    selectedYear = parseInt(document.getElementById('target-year').value);
    loadTargets();
}


