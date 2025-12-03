// Employee Dashboard - Yatırım Alanları Fotoğraf ve Ürün Kontrolü JavaScript

let currentWeek = null;
let currentYear = null;

// Sayfa yüklendiğinde hafta ve yıl bilgilerini ayarla
document.addEventListener('DOMContentLoaded', function() {
    const now = new Date();
    currentYear = now.getFullYear();
    
    // ISO hafta numarasını hesapla
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now - startOfYear) / 86400000;
    currentWeek = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    
    // Yıl dropdown'larını doldur
    populateYearDropdowns();
    
    // Hafta dropdown'larını doldur
    populateWeekDropdowns();
    
    // Yıl değiştiğinde hafta dropdown'ını güncelle
    const photoYearSelect = document.getElementById('photo-year');
    const checkYearSelect = document.getElementById('check-year');
    
    if (photoYearSelect) {
        photoYearSelect.addEventListener('change', function() {
            populateWeekDropdowns();
        });
    }
    
    if (checkYearSelect) {
        checkYearSelect.addEventListener('change', function() {
            populateWeekDropdowns();
        });
    }
    
    // Yatırım alanlarını yükle
    loadInvestmentAreasForEmployee();
});

// Yıl dropdown'larını doldur
function populateYearDropdowns() {
    const yearSelects = ['photo-year', 'check-year'];
    const currentYear = new Date().getFullYear();
    
    yearSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = '<option value="">Yıl Seçiniz</option>';
        // 2025 ve 2026 yıllarını ekle
        for (let year = 2025; year <= 2026; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) {
                option.selected = true;
            }
            select.appendChild(option);
        }
    });
}

// Hafta numarasından başlangıç ve bitiş tarihlerini hesapla
function getWeekDateRange(weekNumber, year) {
    // Yılın ilk gününü al
    const jan1 = new Date(year, 0, 1);
    // İlk Pazartesi'yi bul (ISO 8601 standardına göre hafta Pazartesi başlar)
    const dayOfWeek = jan1.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Pazar = 0, Pazartesi = 1
    const firstMonday = new Date(jan1);
    firstMonday.setDate(jan1.getDate() - daysToMonday);
    
    // İlk Pazartesi yılın dışındaysa, bir sonraki Pazartesi'yi al
    if (firstMonday.getFullYear() < year) {
        firstMonday.setDate(firstMonday.getDate() + 7);
    }
    
    // İstenen haftanın başlangıç tarihini hesapla (Pazartesi)
    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
    
    // Haftanın bitiş tarihini hesapla (Pazar)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return {
        start: weekStart,
        end: weekEnd
    };
}

// Tarihi formatla (DD.MM.YYYY)
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

// Hafta dropdown'larını doldur
function populateWeekDropdowns() {
    const weekSelects = [
        { id: 'photo-week', yearId: 'photo-year' },
        { id: 'check-week', yearId: 'check-year' }
    ];
    
    weekSelects.forEach(({ id: selectId, yearId }) => {
        const select = document.getElementById(selectId);
        const yearSelect = document.getElementById(yearId);
        if (!select || !yearSelect) return;
        
        // Seçili yılı al, yoksa mevcut yılı kullan
        const selectedYear = parseInt(yearSelect.value) || currentYear;
        
        select.innerHTML = '<option value="">Hafta Seçiniz</option>';
        for (let i = 1; i <= 53; i++) {
            const option = document.createElement('option');
            option.value = i;
            
            // Hafta tarih aralığını hesapla
            const weekRange = getWeekDateRange(i, selectedYear);
            const startDate = formatDate(weekRange.start);
            const endDate = formatDate(weekRange.end);
            
            option.textContent = `${i}. Hafta (${startDate} - ${endDate})`;
            if (i === currentWeek && selectedYear === currentYear) {
                option.selected = true;
            }
            select.appendChild(option);
        }
    });
}

// Employee'nin mağazasına ait yatırım alanlarını yükle
async function loadInvestmentAreasForEmployee() {
    try {
        const user = checkUserSession();
        if (!user || !user.storeId) {
            console.error('Kullanıcı veya mağaza bilgisi bulunamadı');
            return;
        }
        
        const { data: areas, error } = await supabase
            .from('investment_areas')
            .select('id, name, type, brand, status')
            .eq('store_id', user.storeId)
            .eq('status', 'active')
            .order('name');
        
        if (error) throw error;
        
        // Fotoğraf yükleme dropdown'ını doldur
        const photoAreaSelect = document.getElementById('photo-investment-area');
        if (photoAreaSelect) {
            photoAreaSelect.innerHTML = '<option value="">Yatırım Alanı Seçiniz</option>';
            areas.forEach(area => {
                const option = document.createElement('option');
                option.value = area.id;
                option.textContent = `${area.name} (${getTypeLabel(area.type)})`;
                photoAreaSelect.appendChild(option);
            });
        }
        
        // Ürün kontrolü dropdown'ını doldur
        const checkAreaSelect = document.getElementById('check-investment-area');
        if (checkAreaSelect) {
            checkAreaSelect.innerHTML = '<option value="">Yatırım Alanı Seçiniz</option>';
            areas.forEach(area => {
                const option = document.createElement('option');
                option.value = area.id;
                option.textContent = `${area.name} (${getTypeLabel(area.type)})`;
                checkAreaSelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Yatırım alanları yükleme hatası:', error);
        showAlert('Yatırım alanları yüklenirken hata oluştu', 'danger');
    }
}

// Tip etiketini döndür
function getTypeLabel(type) {
    const labels = {
        'ada_stand': 'Ada Stand',
        'duvar_standi': 'Duvar Standı',
        'alinlik': 'Alınlık',
        'reyon_giydirme': 'Reyon Giydirme',
        'gondol_basi': 'Gondol Başı',
        'diger': 'Diğer'
    };
    return labels[type] || type;
}

// Haftalık fotoğraf yükleme
async function uploadWeeklyInvestmentPhoto(event) {
    event.preventDefault();
    
    try {
        const user = checkUserSession();
        if (!user || !user.id) {
            showAlert('Kullanıcı bilgisi bulunamadı', 'danger');
            return;
        }
        
        const areaId = document.getElementById('photo-investment-area').value;
        const weekNumber = parseInt(document.getElementById('photo-week').value);
        const year = parseInt(document.getElementById('photo-year').value);
        const note = document.getElementById('photo-note').value;
        const files = document.getElementById('photo-file').files;
        
        if (!areaId || !weekNumber || !year || files.length === 0) {
            showAlert('Lütfen tüm gerekli alanları doldurun', 'warning');
            return;
        }
        
        // Haftalık fotoğraf kaydı oluştur
        const { data: weeklyPhoto, error: weeklyError } = await supabase
            .from('investment_weekly_photos')
            .insert({
                investment_area_id: parseInt(areaId),
                week_number: weekNumber,
                year: year,
                uploaded_by: user.id,
                note: note || null
            })
            .select()
            .single();
        
        if (weeklyError) {
            // Eğer zaten bu hafta için kayıt varsa, mevcut kaydı al
            if (weeklyError.code === '23505') { // Unique constraint violation
                const { data: existing } = await supabase
                    .from('investment_weekly_photos')
                    .select('id')
                    .eq('investment_area_id', areaId)
                    .eq('week_number', weekNumber)
                    .eq('year', year)
                    .single();
                
                if (existing) {
                    weeklyPhoto = existing;
                } else {
                    throw weeklyError;
                }
            } else {
                throw weeklyError;
            }
        }
        
        // Fotoğrafları yükle
        const uploadedPhotos = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                // Fotoğrafı sıkıştır
                const compressedFile = await compressImage(file);
                
                // Dosya adı oluştur
                const timestamp = Date.now();
                const fileName = `weekly_${weeklyPhoto.id}_${timestamp}_${i}_${Math.random().toString(36).substring(7)}.jpg`;
                const filePath = `investment-areas/${areaId}/weekly/${year}/week-${weekNumber}/${fileName}`;
                
                // Supabase Storage'a yükle
                const { error: uploadError } = await supabase.storage
                    .from('task-photos')
                    .upload(filePath, compressedFile, {
                        contentType: 'image/jpeg',
                        upsert: false
                    });
                
                if (uploadError) {
                    console.error('Fotoğraf yükleme hatası:', uploadError);
                    continue;
                }
                
                // Public URL'i al
                const { data: urlData } = supabase.storage
                    .from('task-photos')
                    .getPublicUrl(filePath);
                
                // Veritabanına kaydet
                const { error: photoError } = await supabase
                    .from('investment_photos')
                    .insert({
                        investment_area_id: parseInt(areaId),
                        weekly_photo_id: weeklyPhoto.id,
                        photo_url: urlData.publicUrl,
                        source: 'weekly_check',
                        uploaded_by: user.id,
                        note: note || null
                    });
                
                if (!photoError) {
                    uploadedPhotos.push(urlData.publicUrl);
                }
            } catch (photoError) {
                console.error('Fotoğraf işleme hatası:', photoError);
            }
        }
        
        if (uploadedPhotos.length > 0) {
            showAlert(`${uploadedPhotos.length} fotoğraf başarıyla yüklendi`, 'success');
            // Formu temizle
            document.getElementById('investment-photo-form').reset();
            document.getElementById('photo-year').value = currentYear;
            document.getElementById('photo-week').value = currentWeek;
            // Yıl ve hafta dropdown'larını yeniden doldur
            populateYearDropdowns();
            populateWeekDropdowns();
            document.getElementById('photo-preview-container').innerHTML = '';
            // Haftalık ilerlemeyi yenile
            loadWeeklyProgress();
        } else {
            showAlert('Fotoğraf yüklenirken hata oluştu', 'danger');
        }
        
    } catch (error) {
        console.error('Haftalık fotoğraf yükleme hatası:', error);
        showAlert('Fotoğraf yüklenirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 'danger');
    }
}

// Ürünleri yükle (ürün kontrolü için)
async function loadProductsForCheck() {
    const areaId = document.getElementById('check-investment-area').value;
    if (!areaId) {
        document.getElementById('products-check-container').innerHTML = '';
        return;
    }
    
    try {
        const { data: products, error } = await supabase
            .from('investment_area_products')
            .select('id, product_name, product_code, display_order')
            .eq('investment_area_id', areaId)
            .order('display_order');
        
        if (error) throw error;
        
        const container = document.getElementById('products-check-container');
        if (!container) return;
        
        if (!products || products.length === 0) {
            container.innerHTML = '<div class="alert alert-warning">Bu yatırım alanı için planlanan ürün bulunmamaktadır.</div>';
            return;
        }
        
        // Mevcut haftalık kontrolleri yükle
        const weekNumber = parseInt(document.getElementById('check-week').value);
        const year = parseInt(document.getElementById('check-year').value);
        
        let existingChecks = {};
        if (weekNumber && year) {
            const { data: checks } = await supabase
                .from('investment_weekly_product_checks')
                .select('product_id, is_available, reason')
                .eq('investment_area_id', areaId)
                .eq('week_number', weekNumber)
                .eq('year', year);
            
            if (checks) {
                checks.forEach(check => {
                    existingChecks[check.product_id] = check;
                });
            }
        }
        
        container.innerHTML = '<h6 class="mb-3">Planlanan Ürünler</h6>';
        
        products.forEach((product, index) => {
            const check = existingChecks[product.id];
            const productDiv = document.createElement('div');
            productDiv.className = 'card mb-3';
            productDiv.innerHTML = `
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-4">
                            <h6 class="mb-0">${product.product_name}</h6>
                            ${product.product_code ? `<small class="text-muted">Kod: ${product.product_code}</small>` : ''}
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Durum *</label>
                            <select class="form-select product-status" data-product-id="${product.id}" required>
                                <option value="true" ${check && check.is_available ? 'selected' : ''}>Var</option>
                                <option value="false" ${check && !check.is_available ? 'selected' : ''}>Yok</option>
                            </select>
                        </div>
                        <div class="col-md-5">
                            <label class="form-label">Açıklama (Yok ise neden)</label>
                            <input type="text" class="form-control product-reason" data-product-id="${product.id}" 
                                   value="${check && check.reason ? check.reason : ''}" 
                                   placeholder="Ürün yoksa neden belirtin...">
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(productDiv);
        });
        
    } catch (error) {
        console.error('Ürünler yükleme hatası:', error);
        showAlert('Ürünler yüklenirken hata oluştu', 'danger');
    }
}

// Ürün kontrolünü kaydet
async function submitProductCheck(event) {
    event.preventDefault();
    
    try {
        const user = checkUserSession();
        if (!user || !user.id) {
            showAlert('Kullanıcı bilgisi bulunamadı', 'danger');
            return;
        }
        
        const areaId = document.getElementById('check-investment-area').value;
        const weekNumber = parseInt(document.getElementById('check-week').value);
        const year = parseInt(document.getElementById('check-year').value);
        const comment = document.getElementById('check-comment').value;
        
        if (!areaId || !weekNumber || !year) {
            showAlert('Lütfen tüm gerekli alanları doldurun', 'warning');
            return;
        }
        
        // Ürün kontrollerini topla
        const statusSelects = document.querySelectorAll('.product-status');
        const checks = [];
        
        statusSelects.forEach(select => {
            const productId = parseInt(select.dataset.productId);
            const isAvailable = select.value === 'true';
            const reasonInput = document.querySelector(`.product-reason[data-product-id="${productId}"]`);
            const reason = reasonInput ? reasonInput.value : null;
            
            checks.push({
                investment_area_id: parseInt(areaId),
                product_id: productId,
                week_number: weekNumber,
                year: year,
                is_available: isAvailable,
                reason: (!isAvailable && reason) ? reason : null,
                checked_by: user.id
            });
        });
        
        if (checks.length === 0) {
            showAlert('Kontrol edilecek ürün bulunamadı', 'warning');
            return;
        }
        
        // Kontrolleri kaydet (upsert - varsa güncelle, yoksa ekle)
        for (const check of checks) {
            const { error } = await supabase
                .from('investment_weekly_product_checks')
                .upsert(check, {
                    onConflict: 'investment_area_id,product_id,week_number,year'
                });
            
            if (error) {
                console.error('Ürün kontrolü kaydetme hatası:', error);
            }
        }
        
        // Genel yorumu haftalık fotoğraf kaydına ekle (varsa)
        if (comment) {
            const { data: weeklyPhoto } = await supabase
                .from('investment_weekly_photos')
                .select('id')
                .eq('investment_area_id', areaId)
                .eq('week_number', weekNumber)
                .eq('year', year)
                .single();
            
            if (weeklyPhoto) {
                await supabase
                    .from('investment_weekly_photos')
                    .update({ note: comment })
                    .eq('id', weeklyPhoto.id);
            }
        }
        
        showAlert('Ürün kontrolü başarıyla kaydedildi', 'success');
        
        // Formu temizle
        document.getElementById('product-check-form').reset();
        document.getElementById('check-year').value = currentYear;
        document.getElementById('check-week').value = currentWeek;
        // Yıl ve hafta dropdown'larını yeniden doldur
        populateYearDropdowns();
        populateWeekDropdowns();
        document.getElementById('products-check-container').innerHTML = '';
        
    } catch (error) {
        console.error('Ürün kontrolü kaydetme hatası:', error);
        showAlert('Ürün kontrolü kaydedilirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 'danger');
    }
}

// Haftalık ilerlemeyi yükle
async function loadWeeklyProgress() {
    try {
        const user = checkUserSession();
        if (!user || !user.storeId) return;
        
        const container = document.getElementById('weekly-progress-container');
        if (!container) return;
        
        const { data: weeklyPhotos, error } = await supabase
            .from('investment_weekly_photos')
            .select(`
                id,
                week_number,
                year,
                uploaded_at,
                note,
                investment_areas(id, name),
                investment_photos(id, photo_url)
            `)
            .eq('investment_areas.store_id', user.storeId)
            .eq('year', currentYear)
            .eq('week_number', currentWeek)
            .order('uploaded_at', { ascending: false });
        
        if (error) throw error;
        
        if (!weeklyPhotos || weeklyPhotos.length === 0) {
            container.innerHTML = '<p class="text-muted">Bu hafta henüz fotoğraf yüklenmemiş.</p>';
            return;
        }
        
        // Hafta tarih aralığını hesapla
        const weekRange = getWeekDateRange(currentWeek, currentYear);
        const weekDateRange = `${formatDate(weekRange.start)} - ${formatDate(weekRange.end)}`;
        
        container.innerHTML = `
            <div class="alert alert-info mb-3">
                <strong>${currentWeek}. Hafta ${currentYear}</strong> - ${weekDateRange}
            </div>
            ${weeklyPhotos.map(wp => `
                <div class="card mb-2">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${wp.investment_areas.name}</h6>
                                <small class="text-muted">${wp.investment_photos?.length || 0} fotoğraf</small>
                            </div>
                            <div>
                                <small class="text-muted">${formatDateTime(wp.uploaded_at)}</small>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        `;
        
    } catch (error) {
        console.error('Haftalık ilerleme yükleme hatası:', error);
    }
}

// Fotoğraf sıkıştırma (employee.js'den kopyalandı)
async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            try {
                const maxWidth = 1024;
                const maxHeight = 768;
                
                let { width, height } = img;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Fotoğraf sıkıştırılamadı'));
                    }
                }, 'image/jpeg', 0.9);
                
            } catch (error) {
                reject(error);
            }
        };
        
        img.onerror = () => reject(new Error('Fotoğraf yüklenemedi'));
        img.src = URL.createObjectURL(file);
    });
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

// Alert mesajı gösteren fonksiyon (tekrar önleme ile)
let lastAlertMessage = '';
let lastAlertTime = 0;
const ALERT_COOLDOWN = 2000; // 2 saniye içinde aynı mesaj tekrar gösterilmez

function showAlert(message, type = 'info') {
    // Aynı mesajın çok sık gösterilmesini önle
    const now = Date.now();
    if (message === lastAlertMessage && (now - lastAlertTime) < ALERT_COOLDOWN) {
        return; // Aynı mesaj çok yakın zamanda gösterilmişse, tekrar gösterme
    }
    
    lastAlertMessage = message;
    lastAlertTime = now;
    
    // Önceki alert'leri kaldır
    const existingAlerts = document.querySelectorAll('.custom-alert');
    existingAlerts.forEach(alert => {
        alert.style.transition = 'opacity 0.3s';
        alert.style.opacity = '0';
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 300);
    });
    
    // Yeni alert oluştur
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} custom-alert`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.style.maxWidth = '500px';
    alertDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    alertDiv.style.borderRadius = '8px';
    alertDiv.style.padding = '12px 16px';
    alertDiv.style.display = 'flex';
    alertDiv.style.alignItems = 'center';
    alertDiv.style.justifyContent = 'space-between';
    alertDiv.style.gap = '12px';
    
    // X butonu için renk belirle
    let closeButtonColor = '#333';
    if (type === 'danger') closeButtonColor = '#721c24';
    else if (type === 'success') closeButtonColor = '#155724';
    else if (type === 'warning') closeButtonColor = '#856404';
    else if (type === 'info') closeButtonColor = '#004085';
    
    alertDiv.innerHTML = `
        <span style="flex: 1;">${message}</span>
        <button type="button" class="btn-close-alert" aria-label="Kapat" 
                style="background: none; border: none; font-size: 1.5rem; font-weight: bold; 
                       color: ${closeButtonColor}; opacity: 0.7; cursor: pointer; 
                       padding: 0; line-height: 1; transition: opacity 0.2s; 
                       width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
            &times;
        </button>
    `;
    
    // Mobil için özel stil
    if (window.innerWidth <= 768) {
        alertDiv.style.top = '10px';
        alertDiv.style.right = '10px';
        alertDiv.style.left = '10px';
        alertDiv.style.minWidth = 'auto';
        alertDiv.style.maxWidth = 'none';
    }
    
    // Alert'i body'ye ekle
    document.body.appendChild(alertDiv);
    
    // Kapat butonuna tıklama eventi ekle
    const closeBtn = alertDiv.querySelector('.btn-close-alert');
    if (closeBtn) {
        // Hover efekti
        closeBtn.addEventListener('mouseenter', function() {
            this.style.opacity = '1';
        });
        closeBtn.addEventListener('mouseleave', function() {
            this.style.opacity = '0.7';
        });
        
        // Click eventi
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            alertDiv.style.transition = 'opacity 0.3s';
            alertDiv.style.opacity = '0';
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 300);
        });
    }
    
    // 5 saniye sonra otomatik kaldır
    const autoCloseTimer = setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.style.transition = 'opacity 0.3s';
            alertDiv.style.opacity = '0';
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 300);
        }
    }, 5000);
    
    // X butonuna tıklanınca timer'ı iptal et
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            clearTimeout(autoCloseTimer);
        });
    }
}

// Global fonksiyonlar
window.uploadWeeklyInvestmentPhoto = uploadWeeklyInvestmentPhoto;
window.loadProductsForCheck = loadProductsForCheck;
window.submitProductCheck = submitProductCheck;
window.showAlert = showAlert;

