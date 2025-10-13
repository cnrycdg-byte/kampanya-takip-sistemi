// ============================================
// ADMIN ANKET YÖNETİMİ - JavaScript
// ============================================
// Bu dosya admin dashboard için anket oluşturma ve raporlama fonksiyonlarını içerir
// ============================================

console.log('Admin Survey JS yüklendi');

// Global değişkenler
let surveyQuestionCounter = 0;
let currentEditingSurvey = null;
// Not: allStores, allChannels, allRegions admin.js'de tanımlı

// SORU ŞABLONLARI
const QUESTION_TEMPLATES = {
    promoter: {
        type: 'promoter_count',
        text: 'Mağazanızda sizden başka hangi markaların promotörleri bulunmaktadır?',
        help: 'Lütfen gördüğünüz tüm marka promotörlerini seçin ve kişi sayılarını girin'
    },
    investment: {
        type: 'investment_area',
        text: 'Mağazanızda bulunan duvar standı veya orta alan standı olan markaları seçin ve fotoğraflarını yükleyiniz',
        help: 'Her yatırım alanı için marka, alan tipi ve fotoğraf eklemeyi unutmayın'
    },
    basket: {
        type: 'basket_dynamic',
        text: 'Mağazanızdaki sepetleri ekleyiniz (Kulaklık ve GSM Aksesuar)',
        help: 'Her sepet için sepet türü, üst grup, alt grup, marka, artikel ve fiyat bilgilerini girin. "Sepet Ekle" butonuna tıklayarak istediğiniz kadar sepet ekleyebilirsiniz.'
    }
};

// ============================================
// 1. ANKET OLUŞTURMA
// ============================================

// Soru ekle
function addSurveyQuestion(questionType) {
    const container = document.getElementById('survey-questions-builder');
    const questionIndex = surveyQuestionCounter++;
    
    let questionHtml = `
        <div class="card mb-3 survey-question-card" id="question-card-${questionIndex}" data-type="${questionType}">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span><i class="fas fa-grip-vertical me-2"></i>Soru ${questionIndex + 1}: ${getQuestionTypeName(questionType)}</span>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeSurveyQuestion(${questionIndex})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label class="form-label">Soru Metni *</label>
                    <textarea class="form-control question-text" rows="2" required></textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label">Yardım Metni</label>
                    <input type="text" class="form-control question-help" placeholder="Opsiyonel">
                </div>
                ${renderQuestionConfig(questionType, questionIndex)}
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', questionHtml);
}

// Soru tipine göre konfigürasyon
function renderQuestionConfig(type, index) {
    switch (type) {
        case 'promoter_count':
            return `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Bu soru tipi otomatik olarak marka listesini kullanır ve her marka için kişi sayısı ister.
                </div>
            `;
        case 'investment_area':
            return `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Bu soru tipi kullanıcıdan yatırım alanı tipi, marka ve fotoğraf yüklemesini ister.
                </div>
                <div class="mb-2">
                    <label class="form-label">Maksimum Fotoğraf Sayısı</label>
                    <input type="number" class="form-control config-max-photos" value="5" min="1" max="20">
                </div>
            `;
        case 'basket_dynamic':
            return `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Bu soru tipi dinamik sepet formu oluşturur. Kullanıcı sepet sayısı girer ve her sepet için detay doldurur.
                </div>
            `;
        default:
            return '';
    }
}

function getQuestionTypeName(type) {
    const names = {
        'promoter_count': 'Promotör Sayısı',
        'investment_area': 'Yatırım Alanı',
        'basket_dynamic': 'Sepet Analizi'
    };
    return names[type] || type;
}

function removeSurveyQuestion(index) {
    const card = document.getElementById(`question-card-${index}`);
    if (card && confirm('Bu soruyu silmek istediğinizden emin misiniz?')) {
        card.remove();
    }
}

// Anket formunu kaydet
document.addEventListener('DOMContentLoaded', function() {
    const createSurveyForm = document.getElementById('create-survey-form');
    if (createSurveyForm) {
        createSurveyForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await createSurvey();
        });
    }
});

async function createSurvey() {
    try {
        const title = document.getElementById('survey-title').value;
        const month = parseInt(document.getElementById('survey-month').value);
        const year = parseInt(document.getElementById('survey-year').value);
        const description = document.getElementById('survey-description').value;
        
        // Soruları topla
        const questionCards = document.querySelectorAll('.survey-question-card');
        if (questionCards.length === 0) {
            showAlert('Lütfen en az bir soru ekleyiniz', 'warning');
            return;
        }
        
        const questions = [];
        for (let i = 0; i < questionCards.length; i++) {
            const card = questionCards[i];
            const type = card.dataset.type;
            const text = card.querySelector('.question-text').value;
            const help = card.querySelector('.question-help').value;
            
            let config = await getDefaultQuestionConfig(type);
            
            // Investment area için max photos
            if (type === 'investment_area') {
                const maxPhotos = card.querySelector('.config-max-photos')?.value;
                if (maxPhotos) {
                    config.max_photos = parseInt(maxPhotos);
                }
            }
            
            questions.push({
                question_text: text,
                question_type: type,
                question_order: i + 1,
                question_config: config,
                is_required: true,
                help_text: help || null
            });
        }
        
        const user = checkUserSession();
        if (!user) {
            showAlert('Oturum bulunamadı', 'danger');
            return;
        }
        
        // Anketi oluştur
        const { data: survey, error: surveyError } = await supabase
            .from('surveys')
            .insert({
                title,
                description,
                month,
                year,
                status: 'active',
                created_by: user.id
            })
            .select()
            .single();
            
        if (surveyError) throw surveyError;
        
        // Soruları ekle
        const questionsWithSurveyId = questions.map(q => ({ ...q, survey_id: survey.id }));
        const { error: questionsError } = await supabase
            .from('survey_questions')
            .insert(questionsWithSurveyId);
            
        if (questionsError) throw questionsError;
        
        showAlert('Anket başarıyla oluşturuldu ve aktifleştirildi!', 'success');
        
        // Formu temizle
        document.getElementById('create-survey-form').reset();
        document.getElementById('survey-questions-builder').innerHTML = '<p class="text-muted">Aşağıdaki butonları kullanarak soru ekleyin...</p>';
        surveyQuestionCounter = 0;
        
        // Anket listesine git
        setTimeout(() => {
            showSection('surveys-list');
            loadSurveysList();
        }, 1500);
        
    } catch (error) {
        console.error('Anket oluşturma hatası:', error);
        showAlert('Anket oluşturulurken hata oluştu: ' + error.message, 'danger');
    }
}

async function getDefaultQuestionConfig(type) {
    try {
        // Veritabanından markaları çek
        const { data: brands, error } = await supabase
            .from('brands')
            .select('name')
            .order('name');
        
        if (error) {
            console.error('❌ Marka yükleme hatası:', error);
            // Hata durumunda varsayılan markalar
            return getFallbackQuestionConfig(type);
        }
        
        const brandNames = brands.map(b => b.name);
        console.log('✅ Veritabanından markalar yüklendi:', brandNames);
        
        switch (type) {
            case 'promoter_count':
                return {
                    type: "multiple_choice_with_count",
                    options: brandNames.map(brand => ({
                        "label": brand,
                        "value": brand.toLowerCase().replace(/\s+/g, '_')
                    })).concat([{"label": "Diğer", "value": "other", "allow_custom": true}]),
                    count_field: true,
                    count_label: "Kişi Sayısı"
                };
            case 'investment_area':
                return {
                    type: "investment_area",
                    categories: [
                        {"label": "Duvar Standı", "value": "wall"},
                        {"label": "Orta Alan Standı", "value": "middle"},
                        {"label": "Diğer", "value": "other", "allow_custom": true}
                    ],
                    brands: brandNames,
                    photo_required: true,
                    max_photos: 5
                };
            case 'basket_dynamic':
                return {
                    type: "dynamic_basket",
                    basket_label: "Sepet",
                    basket_count_label: "Sepet Sayısı",
                    basket_types: [
                        {"label": "Büyük boy Sepet", "value": "large_basket"},
                        {"label": "Basket Sepet", "value": "basket"}
                    ],
                    upper_groups: [
                        {
                            "label": "Kulaklık", 
                            "value": "headphone",
                            "lower_groups": [
                                {"label": "Kulak İçi Kulaklık", "value": "in_ear"},
                                {"label": "Kafa Bantlı Kulaklık", "value": "over_ear"},
                                {"label": "TWS Kulaklık", "value": "tws"}
                            ]
                        },
                        {
                            "label": "GSM Aksesuar", 
                            "value": "gsm_accessory",
                            "lower_groups": [
                                {"label": "Duvar Adaptörü", "value": "wall_adapter"},
                                {"label": "Powerbank", "value": "powerbank"},
                                {"label": "Araç İçi Tutucu", "value": "car_holder"},
                                {"label": "Çakmak Şarj Aleti", "value": "car_charger"},
                                {"label": "Kablo", "value": "cable"},
                                {"label": "Diğer", "value": "other"}
                            ]
                        }
                    ],
                    brands: brandNames.concat(["Diğer"]),
                    fields: [
                        {"name": "product_name", "label": "Ürün Adı", "type": "text", "required": true},
                        {"name": "artikel", "label": "Artikel No", "type": "text", "required": true},
                        {"name": "price", "label": "Fiyat", "type": "number", "required": true}
                    ]
                };
            case 'gsm_accessory_basket':
                return {
                    type: "gsm_accessory_basket",
                    basket_label: "GSM Aksesuar Sepeti",
                    basket_count_label: "Sepet Sayısı",
                    brands: brandNames.concat(["Diğer"]),
                    fields: [
                        {"name": "brand", "label": "Marka", "type": "select", "required": true},
                        {"name": "artikel", "label": "Artikel No", "type": "text", "required": true},
                        {"name": "product_name", "label": "Ürün Adı", "type": "text", "required": true},
                        {"name": "price", "label": "Fiyat", "type": "number", "required": true}
                    ]
                };
            default:
                return {};
        }
    } catch (error) {
        console.error('❌ Konfigürasyon oluşturma hatası:', error);
        return getFallbackQuestionConfig(type);
    }
}

// Fallback konfigürasyon (veritabanı hatası durumunda)
function getFallbackQuestionConfig(type) {
    const fallbackBrands = ["Philips", "Ugreen", "JBL", "Anker", "Baseus", "Ttec", "Cellurline", "Shokz", "Fresh'N Rebul", "Sennheiser", "Huawei", "Momax", "Piili"];
    
    switch (type) {
        case 'promoter_count':
            return {
                type: "multiple_choice_with_count",
                options: fallbackBrands.map(brand => ({
                    "label": brand,
                    "value": brand.toLowerCase().replace(/\s+/g, '_')
                })).concat([{"label": "Diğer", "value": "other", "allow_custom": true}]),
                count_field: true,
                count_label: "Kişi Sayısı"
            };
        case 'investment_area':
            return {
                type: "investment_area",
                categories: [
                    {"label": "Duvar Standı", "value": "wall"},
                    {"label": "Orta Alan Standı", "value": "middle"},
                    {"label": "Diğer", "value": "other", "allow_custom": true}
                ],
                brands: fallbackBrands,
                photo_required: true,
                max_photos: 5
            };
        case 'basket_dynamic':
            return {
                type: "dynamic_basket",
                basket_label: "Sepet",
                basket_count_label: "Sepet Sayısı",
                basket_types: [
                    {"label": "Büyük boy Sepet", "value": "large_basket"},
                    {"label": "Basket Sepet", "value": "basket"}
                ],
                upper_groups: [
                    {
                        "label": "Kulaklık", 
                        "value": "headphone",
                        "lower_groups": [
                            {"label": "Kulak İçi Kulaklık", "value": "in_ear"},
                            {"label": "Kafa Bantlı Kulaklık", "value": "over_ear"},
                            {"label": "TWS Kulaklık", "value": "tws"}
                        ]
                    },
                    {
                        "label": "GSM Aksesuar", 
                        "value": "gsm_accessory",
                        "lower_groups": [
                            {"label": "Duvar Adaptörü", "value": "wall_adapter"},
                            {"label": "Powerbank", "value": "powerbank"},
                            {"label": "Araç İçi Tutucu", "value": "car_holder"},
                            {"label": "Çakmak Şarj Aleti", "value": "car_charger"},
                            {"label": "Kablo", "value": "cable"},
                            {"label": "Diğer", "value": "other"}
                        ]
                    }
                ],
                brands: fallbackBrands.concat(["Diğer"]),
                fields: [
                    {"name": "product_name", "label": "Ürün Adı", "type": "text", "required": true},
                    {"name": "artikel", "label": "Artikel No", "type": "text", "required": true},
                    {"name": "price", "label": "Fiyat", "type": "number", "required": true}
                ]
            };
        case 'gsm_accessory_basket':
            return {
                type: "gsm_accessory_basket",
                basket_label: "GSM Aksesuar Sepeti",
                basket_count_label: "Sepet Sayısı",
                brands: fallbackBrands.concat(["Diğer"]),
                fields: [
                    {"name": "brand", "label": "Marka", "type": "select", "required": true},
                    {"name": "artikel", "label": "Artikel No", "type": "text", "required": true},
                    {"name": "product_name", "label": "Ürün Adı", "type": "text", "required": true},
                    {"name": "price", "label": "Fiyat", "type": "number", "required": true}
                ]
            };
        default:
            return {};
    }
}

// ============================================
// 2. ANKET LİSTESİ
// ============================================

async function loadSurveysList() {
    try {
        const { data: surveys, error } = await supabase
            .from('surveys')
            .select('*, users(name)')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        const container = document.getElementById('surveys-list-table');
        
        if (!surveys || surveys.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Henüz anket oluşturulmamış.
                </div>
            `;
            return;
        }
        
        let html = `
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Başlık</th>
                        <th>Ay/Yıl</th>
                        <th>Durum</th>
                        <th>Oluşturan</th>
                        <th>Tarih</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        surveys.forEach(survey => {
            const monthName = getMonthName(survey.month);
            const statusBadge = getStatusBadge(survey.status);
            const createdAt = new Date(survey.created_at).toLocaleDateString('tr-TR');
            
            html += `
                <tr>
                    <td>${survey.title}</td>
                    <td>${monthName} ${survey.year}</td>
                    <td>${statusBadge}</td>
                    <td>${survey.users?.name || '-'}</td>
                    <td>${createdAt}</td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="viewSurveyDetails('${survey.id}')" title="Anket Detayları">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="viewPromoterTrends('${survey.id}', '${survey.title}')" title="Promotör Trend Analizi">
                            <i class="fas fa-chart-line"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="toggleSurveyStatus('${survey.id}', '${survey.status}')" title="Durum Değiştir">
                            <i class="fas fa-toggle-on"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteSurveyFromList('${survey.id}', '${survey.title}')" title="Anketi Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Anket listesi yükleme hatası:', error);
        showAlert('Anket listesi yüklenirken hata oluştu', 'danger');
    }
}

function getMonthName(month) {
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return months[month - 1] || '';
}

function getStatusBadge(status) {
    const badges = {
        'active': '<span class="badge bg-success">Aktif</span>',
        'completed': '<span class="badge bg-secondary">Tamamlandı</span>',
        'draft': '<span class="badge bg-warning">Taslak</span>',
        'archived': '<span class="badge bg-dark">Arşivlendi</span>'
    };
    return badges[status] || status;
}

function viewSurveyDetails(surveyId) {
    showAlert('Anket detayları henüz implement edilmedi', 'info');
}

async function toggleSurveyStatus(surveyId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'completed' : 'active';
    
    try {
        const { error } = await supabase
            .from('surveys')
            .update({ status: newStatus })
            .eq('id', surveyId);
            
        if (error) throw error;
        
        showAlert('Anket durumu güncellendi', 'success');
        loadSurveysList();
        
    } catch (error) {
        console.error('Durum güncelleme hatası:', error);
        showAlert('Durum güncellenirken hata oluştu', 'danger');
    }
}

// ============================================
// 3. PROMOTÖR RAPORU
// ============================================

async function loadPromoterReport() {
    const surveyId = document.getElementById('promoter-survey-select').value;
    if (!surveyId) return;
    
    try {
        // View'den veri çek
        const { data, error } = await supabase
            .from('v_promoter_report')
            .select('*')
            .eq('survey_id', surveyId);
            
        if (error) throw error;
        
        // Mağaza x Marka matrisi oluştur
        const matrix = buildPromoterMatrix(data);
        renderPromoterMatrix(matrix);
        
    } catch (error) {
        console.error('Promotör raporu yükleme hatası:', error);
        showAlert('Rapor yüklenirken hata oluştu', 'danger');
    }
}

function buildPromoterMatrix(data) {
    const stores = {};
    const brands = new Set();
    
    data.forEach(row => {
        const storeName = row.store_name;
        if (!stores[storeName]) {
            stores[storeName] = {};
        }
        
        // answer_data içindeki brands dizisini parse et
        if (row.answer_data && row.answer_data.brands) {
            row.answer_data.brands.forEach(brand => {
                brands.add(brand.brand_label);
                stores[storeName][brand.brand_label] = brand.count;
            });
        }
    });
    
    return { stores, brands: Array.from(brands) };
}

function renderPromoterMatrix(matrix) {
    const container = document.getElementById('promoter-report-table');
    
    let html = `
        <table class="table table-bordered table-hover">
            <thead class="table-light">
                <tr>
                    <th>Mağaza</th>
                    ${matrix.brands.map(brand => `<th>${brand}</th>`).join('')}
                    <th>Toplam</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    Object.entries(matrix.stores).forEach(([storeName, brandCounts]) => {
        let total = 0;
        html += `<tr><td><strong>${storeName}</strong></td>`;
        
        matrix.brands.forEach(brand => {
            const count = brandCounts[brand] || 0;
            total += count;
            html += `<td class="text-center">${count || '-'}</td>`;
        });
        
        html += `<td class="text-center"><strong>${total}</strong></td></tr>`;
    });
    
    // Toplam satırı
    html += '<tr class="table-primary"><td><strong>TOPLAM</strong></td>';
    let grandTotal = 0;
    matrix.brands.forEach(brand => {
        let brandTotal = 0;
        Object.values(matrix.stores).forEach(store => {
            brandTotal += (store[brand] || 0);
        });
        grandTotal += brandTotal;
        html += `<td class="text-center"><strong>${brandTotal}</strong></td>`;
    });
    html += `<td class="text-center"><strong>${grandTotal}</strong></td></tr>`;
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ============================================
// 4. SEPET RAPORU
// ============================================

async function loadBasketReport() {
    const surveyId = document.getElementById('basket-survey-select').value;
    if (!surveyId) return;
    
    try {
        const { data, error } = await supabase
            .from('v_basket_report')
            .select('*')
            .eq('survey_id', surveyId);
            
        if (error) throw error;
        
        renderBasketSummary(data);
        
        // Mağaza dropdown'ını doldur
        const storeSelect = document.getElementById('basket-store-select');
        storeSelect.innerHTML = '<option value="">Mağaza Seçiniz</option>';
        
        const stores = [...new Set(data.map(d => d.store_name))];
        stores.forEach(store => {
            storeSelect.innerHTML += `<option value="${store}">${store}</option>`;
        });
        
    } catch (error) {
        console.error('Sepet raporu yükleme hatası:', error);
        showAlert('Rapor yüklenirken hata oluştu', 'danger');
    }
}

function renderBasketSummary(data) {
    const container = document.getElementById('basket-summary-table');
    
    let html = `
        <table class="table table-hover">
            <thead>
                <tr>
                    <th>Mağaza</th>
                    <th>Toplam Sepet</th>
                    <th>Bizim Sepet</th>
                    <th>Sepet Oranı</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    data.forEach(row => {
        const basketData = row.answer_data;
        const percentage = basketData.our_product_percentage || 0;
        
        html += `
            <tr>
                <td>${row.store_name}</td>
                <td>${basketData.basket_count || 0}</td>
                <td>${basketData.our_product_count || 0}</td>
                <td>
                    <div class="progress">
                        <div class="progress-bar bg-success" style="width: ${percentage}%">
                            ${percentage}%
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ============================================
// 5. FİYAT TAKİP RAPORU
// ============================================

async function loadPriceReport() {
    const startDate = document.getElementById('price-start-date').value;
    const endDate = document.getElementById('price-end-date').value;
    
    if (!startDate || !endDate) {
        showAlert('Lütfen tarih aralığı seçiniz', 'warning');
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('competitor_price_tracking')
            .select('*, stores(name)')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });
            
        if (error) throw error;
        
        renderPriceReport(data);
        
    } catch (error) {
        console.error('Fiyat raporu yükleme hatası:', error);
        showAlert('Rapor yüklenirken hata oluştu', 'danger');
    }
}

function renderPriceReport(data) {
    const container = document.getElementById('price-report-table');
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="alert alert-warning">
                Seçili tarih aralığında veri bulunamadı.
            </div>
        `;
        return;
    }
    
    let html = `
        <table class="table table-hover">
            <thead>
                <tr>
                    <th>Tarih</th>
                    <th>Mağaza</th>
                    <th>Rakip Marka</th>
                    <th>Rakip Ürün</th>
                    <th>Rakip Fiyat</th>
                    <th>Bizim Ürün</th>
                    <th>Bizim Fiyat</th>
                    <th>Fark</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    data.forEach(row => {
        const diffClass = row.price_difference > 0 ? 'text-danger' : 'text-success';
        const diffIcon = row.price_difference > 0 ? '▲' : '▼';
        
        html += `
            <tr>
                <td>${new Date(row.date).toLocaleDateString('tr-TR')}</td>
                <td>${row.stores?.name || '-'}</td>
                <td>${row.competitor_brand}</td>
                <td>${row.competitor_product}</td>
                <td>${row.competitor_price.toFixed(2)} ₺</td>
                <td>${row.our_product}</td>
                <td>${row.our_price.toFixed(2)} ₺</td>
                <td class="${diffClass}">
                    ${diffIcon} ${Math.abs(row.price_difference).toFixed(2)} ₺
                    <br><small>(${row.price_difference_percentage}%)</small>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ============================================
// 6. EXCEL EXPORT FONKSİYONLARI
// ============================================

function exportPromoterToExcel() {
    showAlert('Excel export fonksiyonu henüz implement edilmedi', 'info');
}

function exportInvestmentToExcel() {
    showAlert('Excel export fonksiyonu henüz implement edilmedi', 'info');
}

function exportBasketToExcel() {
    showAlert('Excel export fonksiyonu henüz implement edilmedi', 'info');
}

function exportPriceToExcel() {
    showAlert('Excel export fonksiyonu henüz implement edilmedi', 'info');
}

function exportComparisonToExcel() {
    showAlert('Excel export fonksiyonu henüz implement edilmedi', 'info');
}

function loadComparisonReport() {
    showAlert('Karşılaştırma raporu henüz implement edilmedi', 'info');
}

// Sayfa yüklendiğinde dropdown'ları doldur
document.addEventListener('DOMContentLoaded', function() {
    // Anket listesini yükle
    const surveysListLink = document.querySelector('a[href="#surveys-list"]');
    if (surveysListLink) {
        surveysListLink.addEventListener('click', loadSurveysList);
    }
    
    // Promotör raporu için anket dropdown'ını doldur
    const promoterReportLink = document.querySelector('a[href="#promoter-report"]');
    if (promoterReportLink) {
        promoterReportLink.addEventListener('click', async function() {
            try {
                const { data: surveys, error } = await supabase
                    .from('surveys')
                    .select('id, title, month, year')
                    .eq('status', 'active')
                    .order('created_at', { ascending: false });
                    
                if (error) throw error;
                
                const select = document.getElementById('promoter-survey-select');
                if (select) {
                    select.innerHTML = '<option value="">Seçiniz</option>';
                    surveys.forEach(survey => {
                        select.innerHTML += `<option value="${survey.id}">${survey.title}</option>`;
                    });
                }
                
                // Diğer select'leri de doldur
                const basketSelect = document.getElementById('basket-survey-select');
                if (basketSelect) {
                    basketSelect.innerHTML = select.innerHTML;
                }
            } catch (error) {
                console.error('Dropdown doldurma hatası:', error);
            }
        });
    }
});

/**
 * Anket detaylarını görüntüle
 */
function viewSurveyDetails(surveyId) {
    console.log('📊 Anket detayları görüntüleniyor:', surveyId);
    alert('Anket detayları özelliği yakında eklenecek!');
}

/**
 * Promotör trend analizi görüntüle
 */
function viewPromoterTrends(surveyId, surveyTitle) {
    console.log('📈 Promotör trend analizi:', surveyId, surveyTitle);
    
    // Promotör raporu bölümüne git
    showSection('promoter-report');
    
    // Belirli anketi seç
    setTimeout(() => {
        const surveySelect = document.getElementById('trend-survey-filter');
        if (surveySelect) {
            surveySelect.value = surveyId;
            // Filtreleri uygula
            if (typeof applyTrendFilters === 'function') {
                applyTrendFilters();
            }
        }
    }, 500);
}

/**
 * Seçili anketi sil (Anket Raporları bölümünden)
 */
async function deleteSelectedSurvey() {
    const surveySelect = document.getElementById('filter-survey');
    const surveyId = surveySelect.value;
    
    if (!surveyId) {
        alert('Lütfen silmek istediğiniz anketi seçin!');
        return;
    }
    
    const confirmDelete = confirm('Bu anketi ve tüm verilerini silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!');
    
    if (!confirmDelete) return;
    
    try {
        console.log('🗑️ Anket siliniyor:', surveyId);
        
        // İlişkili verileri sil (cascade delete)
        const { error } = await supabase
            .from('surveys')
            .delete()
            .eq('id', surveyId);
        
        if (error) throw error;
        
        alert('✅ Anket başarıyla silindi!');
        
        // Sayfayı yenile
        location.reload();
        
    } catch (error) {
        console.error('❌ Anket silme hatası:', error);
        alert('❌ Anket silme hatası: ' + error.message);
    }
}

/**
 * Anket listesinden anket sil
 */
async function deleteSurveyFromList(surveyId, surveyTitle) {
    const confirmDelete = confirm(`"${surveyTitle}" anketini ve tüm verilerini silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!`);
    
    if (!confirmDelete) return;
    
    try {
        console.log('🗑️ Anket siliniyor:', surveyId, surveyTitle);
        
        // İlişkili verileri sil (cascade delete)
        const { error } = await supabase
            .from('surveys')
            .delete()
            .eq('id', surveyId);
        
        if (error) throw error;
        
        alert('✅ Anket başarıyla silindi!');
        
        // Anket listesini yenile
        loadSurveysList();
        
    } catch (error) {
        console.error('❌ Anket silme hatası:', error);
        alert('❌ Anket silme hatası: ' + error.message);
    }
}

console.log('Admin Survey JS hazır ✅');

