// Satış Girişi Modülü JavaScript

// Durum değiştiğinde
function handleStatusChange() {
    const status = document.querySelector('input[name="dayStatus"]:checked').value;
    const salesForm = document.getElementById('sales-entry-form');
    
    if (status === 'Aktif') {
        salesForm.style.display = 'block';
    } else {
        salesForm.style.display = 'none';
    }
}

// Toplam hesaplama
function calculateTotal() {
    // Adet toplamı
    let totalQty = 0;
    totalQty += parseInt(document.getElementById('philips-headphone-qty').value) || 0;
    totalQty += parseInt(document.getElementById('ugreen-headphone-qty').value) || 0;
    totalQty += parseInt(document.getElementById('philips-mobile-acc-qty').value) || 0;
    totalQty += parseInt(document.getElementById('ugreen-mobile-acc-qty').value) || 0;
    totalQty += parseInt(document.getElementById('philips-other-qty').value) || 0;
    totalQty += parseInt(document.getElementById('ugreen-other-qty').value) || 0;
    totalQty += parseInt(document.getElementById('ugreen-it-aksesuar-qty')?.value || 0) || 0;
    
    // Ciro toplamı
    let totalRevenue = 0;
    totalRevenue += parseFloat(document.getElementById('philips-headphone-revenue').value.replace(/[.]/g, '').replace(',', '.')) || 0;
    totalRevenue += parseFloat(document.getElementById('ugreen-headphone-revenue').value.replace(/[.]/g, '').replace(',', '.')) || 0;
    totalRevenue += parseFloat(document.getElementById('philips-mobile-acc-revenue').value.replace(/[.]/g, '').replace(',', '.')) || 0;
    totalRevenue += parseFloat(document.getElementById('ugreen-mobile-acc-revenue').value.replace(/[.]/g, '').replace(',', '.')) || 0;
    totalRevenue += parseFloat(document.getElementById('philips-other-revenue').value.replace(/[.]/g, '').replace(',', '.')) || 0;
    totalRevenue += parseFloat(document.getElementById('ugreen-other-revenue').value.replace(/[.]/g, '').replace(',', '.')) || 0;
    totalRevenue += parseFloat(document.getElementById('ugreen-it-aksesuar-revenue')?.value?.replace(/[.]/g, '').replace(',', '.') || '0') || 0;
    
    // Göster
    document.getElementById('total-qty-display').textContent = totalQty + ' Adet';
    document.getElementById('total-revenue-display').textContent = formatCurrency(totalRevenue);
}

// Para birimi formatı
function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TL',
        minimumFractionDigits: 2
    }).format(amount);
}

// Satış kaydet
async function saveSalesEntry() {
    try {
        const user = getFromStorage('currentUser');
        if (!user) {
            showAlert('Oturum bilgisi bulunamadı!', 'danger');
            return;
        }
        
        const status = document.querySelector('input[name="dayStatus"]:checked').value;
        const department = user.department || 'Ortak';
        const entryDate = new Date().toISOString().split('T')[0];
        
        // Eğer Aktif değilse, sadece attendance kaydı yap
        if (status !== 'Aktif') {
            const { error: attendanceError } = await supabase
                .from('attendance_records')
                .upsert({
                    user_id: parseInt(user.id),
                    store_id: parseInt(user.storeId),
                    department: department,
                    attendance_date: entryDate,
                    status: status
                }, {
                    onConflict: 'user_id,store_id,department,attendance_date'
                });
            
            if (attendanceError) throw attendanceError;
            
            showAlert('Durum başarıyla kaydedildi!', 'success');
            return;
        }
        
        // Satış verilerini topla
        const salesData = {
            user_id: parseInt(user.id),
            store_id: parseInt(user.storeId),
            department: department,
            entry_date: entryDate,
            philips_headphone_qty: parseInt(document.getElementById('philips-headphone-qty').value) || 0,
            philips_headphone_revenue: parseFloat(document.getElementById('philips-headphone-revenue').value.replace(/[.]/g, '').replace(',', '.')) || 0,
            ugreen_headphone_qty: parseInt(document.getElementById('ugreen-headphone-qty').value) || 0,
            ugreen_headphone_revenue: parseFloat(document.getElementById('ugreen-headphone-revenue').value.replace(/[.]/g, '').replace(',', '.')) || 0,
            philips_mobile_acc_qty: parseInt(document.getElementById('philips-mobile-acc-qty').value) || 0,
            philips_mobile_acc_revenue: parseFloat(document.getElementById('philips-mobile-acc-revenue').value.replace(/[.]/g, '').replace(',', '.')) || 0,
            ugreen_mobile_acc_qty: parseInt(document.getElementById('ugreen-mobile-acc-qty').value) || 0,
            ugreen_mobile_acc_revenue: parseFloat(document.getElementById('ugreen-mobile-acc-revenue').value.replace(/[.]/g, '').replace(',', '.')) || 0,
            philips_other_qty: parseInt(document.getElementById('philips-other-qty').value) || 0,
            philips_other_revenue: parseFloat(document.getElementById('philips-other-revenue').value.replace(/[.]/g, '').replace(',', '.')) || 0,
            ugreen_other_qty: parseInt(document.getElementById('ugreen-other-qty').value) || 0,
            ugreen_other_revenue: parseFloat(document.getElementById('ugreen-other-revenue').value.replace(/[.]/g, '').replace(',', '.')) || 0,
            ugreen_it_aksesuar_qty: parseInt(document.getElementById('ugreen-it-aksesuar-qty')?.value || 0) || 0,
            ugreen_it_aksesuar_revenue: parseFloat(document.getElementById('ugreen-it-aksesuar-revenue')?.value?.replace(/[.]/g, '').replace(',', '.') || '0') || 0,
            notes: document.getElementById('sales-notes').value
        };
        
        // Sales entry kaydet
        const { error: salesError } = await supabase
            .from('sales_entries')
            .upsert(salesData, {
                onConflict: 'user_id,store_id,department,entry_date'
            });
        
        if (salesError) throw salesError;
        
        // Attendance kaydet
        const { error: attendanceError2 } = await supabase
            .from('attendance_records')
            .upsert({
                user_id: parseInt(user.id),
                store_id: parseInt(user.storeId),
                department: department,
                attendance_date: entryDate,
                status: 'Aktif'
            }, {
                onConflict: 'user_id,store_id,department,attendance_date'
            });
        
        if (attendanceError2) throw attendanceError2;
        
        showAlert('Satış verileri başarıyla kaydedildi!', 'success');
        
        // Formu temizle
        setTimeout(() => {
            document.getElementById('philips-headphone-qty').value = 0;
            document.getElementById('philips-headphone-revenue').value = '';
            document.getElementById('ugreen-headphone-qty').value = 0;
            document.getElementById('ugreen-headphone-revenue').value = '';
            document.getElementById('philips-mobile-acc-qty').value = 0;
            document.getElementById('philips-mobile-acc-revenue').value = '';
            document.getElementById('ugreen-mobile-acc-qty').value = 0;
            document.getElementById('ugreen-mobile-acc-revenue').value = '';
            document.getElementById('philips-other-qty').value = 0;
            document.getElementById('philips-other-revenue').value = '';
            document.getElementById('ugreen-other-qty').value = 0;
            document.getElementById('ugreen-other-revenue').value = '';
            if (document.getElementById('ugreen-it-aksesuar-qty')) {
                document.getElementById('ugreen-it-aksesuar-qty').value = 0;
                document.getElementById('ugreen-it-aksesuar-revenue').value = '';
            }
            document.getElementById('sales-notes').value = '';
            calculateTotal();
        }, 1500);
        
    } catch (error) {
        console.error('Satış kaydetme hatası:', error);
        showAlert('Hata: ' + error.message, 'danger');
    }
}

// Satış girişi sayfası yüklendiğinde çalışacak kod
function loadSalesEntryPage() {
    calculateTotal();
    handleStatusChange();
}

// Sayfa bölümü gösterildiğinde çağrılır
if (typeof window !== 'undefined') {
    window.addEventListener('load', function() {
        // Sales-entry section'a tıklandığında formu yükle
        document.addEventListener('click', function(e) {
            if (e.target.closest('a[href="#sales-entry"]')) {
                setTimeout(function() {
                    loadSalesEntryForm();
                }, 100);
            }
        });
    });
}

// Satış girişi formunu yükle
function loadSalesEntryForm() {
    const container = document.getElementById('sales-entry-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="row mb-4">
            <div class="col-12">
                <label class="form-label"><strong>Gün Durumu</strong></label>
                <div class="btn-group w-100" role="group">
                    <input type="radio" class="btn-check" name="dayStatus" id="status-aktif" value="Aktif" checked onchange="handleStatusChange()">
                    <label class="btn btn-outline-success" for="status-aktif">Aktif</label>
                    <input type="radio" class="btn-check" name="dayStatus" id="status-saglik" value="Sağlık Raporu" onchange="handleStatusChange()">
                    <label class="btn btn-outline-warning" for="status-saglik">Sağlık Raporu</label>
                    <input type="radio" class="btn-check" name="dayStatus" id="status-yillik" value="Yıllık İzin" onchange="handleStatusChange()">
                    <label class="btn btn-outline-info" for="status-yillik">Yıllık İzin</label>
                    <input type="radio" class="btn-check" name="dayStatus" id="status-diger" value="Diğer İzin" onchange="handleStatusChange()">
                    <label class="btn btn-outline-secondary" for="status-diger">Diğer</label>
                </div>
            </div>
        </div>
        
        <div id="sales-entry-form">
            <h6 class="mb-3">Satış Detayları</h6>
            
            <div class="row">
                <!-- Philips Kulaklık -->
                <div class="col-md-6 mb-3">
                    <div class="card border-primary">
                        <div class="card-header bg-primary text-white text-center py-2"><strong>Philips Kulaklık</strong></div>
                        <div class="card-body">
                            <label class="form-label small">Adet</label>
                            <input type="number" class="form-control form-control-sm mb-2" id="philips-headphone-qty" min="0" value="0" onchange="calculateTotal()">
                            <label class="form-label small">Ciro (TL) - Örn: 1.500,00</label>
                            <input type="text" class="form-control form-control-sm" id="philips-headphone-revenue" placeholder="1.500,00" onchange="calculateTotal()">
                        </div>
                    </div>
                </div>
                
                <!-- UGreen Kulaklık -->
                <div class="col-md-6 mb-3">
                    <div class="card border-success">
                        <div class="card-header bg-success text-white text-center py-2"><strong>UGreen Kulaklık</strong></div>
                        <div class="card-body">
                            <label class="form-label small">Adet</label>
                            <input type="number" class="form-control form-control-sm mb-2" id="ugreen-headphone-qty" min="0" value="0" onchange="calculateTotal()">
                            <label class="form-label small">Ciro (TL) - Örn: 1.500,00</label>
                            <input type="text" class="form-control form-control-sm" id="ugreen-headphone-revenue" placeholder="1.500,00" onchange="calculateTotal()">
                        </div>
                    </div>
                </div>
                
                <!-- Philips Mobil ACC -->
                <div class="col-md-6 mb-3">
                    <div class="card border-primary">
                        <div class="card-header bg-primary text-white text-center py-2"><strong>Philips Mobil ACC</strong></div>
                        <div class="card-body">
                            <label class="form-label small">Adet</label>
                            <input type="number" class="form-control form-control-sm mb-2" id="philips-mobile-acc-qty" min="0" value="0" onchange="calculateTotal()">
                            <label class="form-label small">Ciro (TL) - Örn: 1.500,00</label>
                            <input type="text" class="form-control form-control-sm" id="philips-mobile-acc-revenue" placeholder="1.500,00" onchange="calculateTotal()">
                        </div>
                    </div>
                </div>
                
                <!-- UGreen Mobil ACC -->
                <div class="col-md-6 mb-3">
                    <div class="card border-success">
                        <div class="card-header bg-success text-white text-center py-2"><strong>UGreen Mobil ACC</strong></div>
                        <div class="card-body">
                            <label class="form-label small">Adet</label>
                            <input type="number" class="form-control form-control-sm mb-2" id="ugreen-mobile-acc-qty" min="0" value="0" onchange="calculateTotal()">
                            <label class="form-label small">Ciro (TL) - Örn: 1.500,00</label>
                            <input type="text" class="form-control form-control-sm" id="ugreen-mobile-acc-revenue" placeholder="1.500,00" onchange="calculateTotal()">
                        </div>
                    </div>
                </div>
                
                <!-- Philips Diğer -->
                <div class="col-md-6 mb-3">
                    <div class="card border-primary">
                        <div class="card-header bg-primary text-white text-center py-2"><strong>Philips Diğer</strong></div>
                        <div class="card-body">
                            <label class="form-label small">Adet</label>
                            <input type="number" class="form-control form-control-sm mb-2" id="philips-other-qty" min="0" value="0" onchange="calculateTotal()">
                            <label class="form-label small">Ciro (TL) - Örn: 1.500,00</label>
                            <input type="text" class="form-control form-control-sm" id="philips-other-revenue" placeholder="1.500,00" onchange="calculateTotal()">
                        </div>
                    </div>
                </div>
                
                <!-- UGreen Diğer -->
                <div class="col-md-6 mb-3">
                    <div class="card border-success">
                        <div class="card-header bg-success text-white text-center py-2"><strong>UGreen Diğer</strong></div>
                        <div class="card-body">
                            <label class="form-label small">Adet</label>
                            <input type="number" class="form-control form-control-sm mb-2" id="ugreen-other-qty" min="0" value="0" onchange="calculateTotal()">
                            <label class="form-label small">Ciro (TL) - Örn: 1.500,00</label>
                            <input type="text" class="form-control form-control-sm" id="ugreen-other-revenue" placeholder="1.500,00" onchange="calculateTotal()">
                        </div>
                    </div>
                </div>
                
                <!-- UGreen IT Aksesuar -->
                <div class="col-md-6 mb-3">
                    <div class="card border-success">
                        <div class="card-header bg-success text-white text-center py-2"><strong>UGreen IT Aksesuar</strong></div>
                        <div class="card-body">
                            <label class="form-label small">Adet</label>
                            <input type="number" class="form-control form-control-sm mb-2" id="ugreen-it-aksesuar-qty" min="0" value="0" onchange="calculateTotal()">
                            <label class="form-label small">Ciro (TL) - Örn: 1.500,00</label>
                            <input type="text" class="form-control form-control-sm" id="ugreen-it-aksesuar-revenue" placeholder="1.500,00" onchange="calculateTotal()">
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Toplam Özet -->
            <div class="card border-info mt-4 mb-3">
                <div class="card-header bg-info text-white">
                    <h6 class="mb-0">Toplam Özet</h6>
                </div>
                <div class="card-body">
                    <div class="row text-center">
                        <div class="col-md-6">
                            <h5 class="text-primary" id="total-qty-display">0 Adet</h5>
                            <small class="text-muted">Toplam Adet</small>
                        </div>
                        <div class="col-md-6">
                            <h5 class="text-success" id="total-revenue-display">0,00 TL</h5>
                            <small class="text-muted">Toplam Ciro</small>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Notlar -->
            <div class="mb-3">
                <label class="form-label"><strong>Notlar</strong></label>
                <textarea class="form-control" id="sales-notes" rows="3" placeholder="Günlük satışlar hakkında notlarınızı buraya yazabilirsiniz..."></textarea>
            </div>
        </div>
        
        <div class="text-center mt-3">
            <button class="btn btn-success btn-lg" onclick="saveSalesEntry()">Kaydet</button>
        </div>
    `;
    loadSalesEntryPage();
}

