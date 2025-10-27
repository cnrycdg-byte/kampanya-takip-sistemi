// ============================================
// ANKET SİSTEMİ - JavaScript
// ============================================

// Global değişkenler
let currentSurvey = null;
let surveyQuestions = [];
let currentQuestionIndex = 0;
let surveyAnswers = {};
let currentResponseId = null;

// ============================================
// 1. SAYFA YÜKLENDİĞİNDE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Survey.js yüklendi');
    
    // Anket menüsü tıklandığında anketleri yükle
    const surveyLink = document.querySelector('a[href="#surveys"]');
    if (surveyLink) {
        surveyLink.addEventListener('click', loadSurveys);
    }
    
    // Fiyat takibi menüsü tıklandığında verileri yükle
    const priceLink = document.querySelector('a[href="#price-tracking"]');
    if (priceLink) {
        priceLink.addEventListener('click', loadPriceTracking);
    }
});

// ============================================
// 2. ANKET LİSTESİNİ YÜKLE
// ============================================
async function loadSurveys() {
    console.log('=== LOAD SURVEYS BAŞLADI ===');
    
    const user = checkUserSession();
    console.log('Kullanıcı:', user);
    
    if (!user || !user.storeId) {
        console.error('Kullanıcı veya storeId bulunamadı:', user);
        showAlert('Lütfen önce bir mağaza seçiniz', 'warning');
        return;
    }
    
    try {
        console.log('Anketler yükleniyor...');
        console.log('Supabase bağlantısı:', supabase);
        
        // Aktif anketleri getir
        console.log('Supabase sorgusu başlatılıyor...');
        const { data: surveys, error: surveysError } = await supabase
            .from('surveys')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });
            
        console.log('Supabase sorgu sonucu:', { data: surveys, error: surveysError });
        
        if (surveysError) {
            console.error('Anket yükleme hatası:', surveysError);
            throw surveysError;
        }
        
        console.log('Aktif anketler:', surveys);
        
        // Bu mağaza için cevap durumlarını kontrol et
        const { data: responses, error: responsesError } = await supabase
            .from('survey_responses')
            .select('survey_id, status')
            .eq('store_id', user.storeId);
            
        if (responsesError) {
            console.error('Cevap yükleme hatası:', responsesError);
        }
        
        console.log('Mevcut cevaplar:', responses);
        
        // Anketleri grupla: bekleyen ve tamamlanan
        const pendingSurveys = [];
        const completedSurveys = [];
        
        surveys.forEach(survey => {
            const response = responses?.find(r => r.survey_id === survey.id);
            if (response && response.status === 'completed') {
                completedSurveys.push({ ...survey, response });
            } else {
                pendingSurveys.push({ ...survey, response });
            }
        });
        
        // Listeleri göster
        displayPendingSurveys(pendingSurveys);
        displayCompletedSurveys(completedSurveys);
        
        // Badge güncelle
        updateSurveyBadge(pendingSurveys.length);
        
    } catch (error) {
        console.error('Anket yükleme hatası:', error);
        showAlert('Anketler yüklenirken hata oluştu: ' + error.message, 'danger');
    }
}

// ============================================
// 3. BEKLEYEN ANKETLERİ GÖSTER
// ============================================
function displayPendingSurveys(surveys) {
    console.log('=== DISPLAY PENDING SURVEYS ===');
    console.log('Gelen surveys:', surveys);
    
    const container = document.getElementById('pending-surveys-container');
    console.log('Container bulundu:', container);
    
    if (!container) {
        console.error('pending-surveys-container bulunamadı!');
        return;
    }
    
    if (surveys.length === 0) {
        console.log('Anket yok, boş mesaj gösteriliyor...');
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                Bekleyen anket bulunmamaktadır.
            </div>
        `;
        return;
    }
    
    console.log(`${surveys.length} anket gösteriliyor...`);
    
    let html = '<div class="list-group">';
    
    surveys.forEach(survey => {
        const monthName = getMonthName(survey.month);
        const isInProgress = survey.response && survey.response.status === 'in_progress';
        
        html += `
            <div class="list-group-item list-group-item-action">
                <div class="d-flex w-100 justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${survey.title}</h6>
                        <p class="mb-1 text-muted small">${survey.description || ''}</p>
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>${monthName} ${survey.year}
                        </small>
                        ${isInProgress ? '<span class="badge bg-warning ms-2">Devam Ediyor</span>' : ''}
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="startSurvey('${survey.id}')">
                        <i class="fas fa-play me-1"></i>
                        ${isInProgress ? 'Devam Et' : 'Başla'}
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ============================================
// 4. TAMAMLANAN ANKETLERİ GÖSTER
// ============================================
function displayCompletedSurveys(surveys) {
    const container = document.getElementById('completed-surveys-container');
    
    if (surveys.length === 0) {
        container.innerHTML = ''; // Boş bırak, uyarı gösterme
        return;
    }
    
    let html = '<div class="list-group">';
    
    surveys.forEach(survey => {
        const monthName = getMonthName(survey.month);
        
        html += `
            <div class="list-group-item">
                <div class="d-flex w-100 justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${survey.title}</h6>
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>${monthName} ${survey.year}
                            <i class="fas fa-check ms-2 text-success"></i>Tamamlandı
                        </small>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ============================================
// 5. ANKETİ BAŞLAT
// ============================================
async function startSurvey(surveyId) {
    try {
        const user = checkUserSession();
        if (!user || !user.storeId) return;
        
        console.log('Anket başlatılıyor:', surveyId);
        
        // Anket bilgilerini ve sorularını çek
        const { data: survey, error: surveyError } = await supabase
            .from('surveys')
            .select('*')
            .eq('id', surveyId)
            .single();
            
        if (surveyError) throw surveyError;
        
        const { data: questions, error: questionsError } = await supabase
            .from('survey_questions')
            .select('*')
            .eq('survey_id', surveyId)
            .order('question_order', { ascending: true });
            
        if (questionsError) throw questionsError;
        
        console.log('Anket soruları:', questions);
        
        // Mevcut cevabı kontrol et
        const { data: existingResponse, error: responseError } = await supabase
            .from('survey_responses')
            .select('*')
            .eq('survey_id', surveyId)
            .eq('store_id', user.storeId)
            .maybeSingle();
            
        if (responseError && responseError.code !== 'PGRST116') {
            throw responseError;
        }
        
        // Response yoksa oluştur
        if (!existingResponse) {
            console.log('🔍 User bilgileri:', user);
            console.log('🔍 User ID:', user.id);
            
            // User ID kontrolü
            if (!user.id) {
                console.error('❌ User ID bulunamadı!');
                showAlert('Kullanıcı bilgileri eksik. Lütfen tekrar giriş yapın.', 'danger');
                return;
            }
            
            const { data: newResponse, error: createError } = await supabase
                .from('survey_responses')
                .insert({
                    survey_id: surveyId,
                    store_id: user.storeId,
                    user_id: user.id,
                    status: 'in_progress'
                })
                .select()
                .single();
                
            if (createError) throw createError;
            currentResponseId = newResponse.id;
            console.log('Yeni response oluşturuldu:', currentResponseId);
        } else {
            currentResponseId = existingResponse.id;
            console.log('Mevcut response kullanılıyor:', currentResponseId);
            
            // Daha önce verilen cevapları yükle
            const { data: existingAnswers } = await supabase
                .from('survey_answers')
                .select('*')
                .eq('response_id', currentResponseId);
                
            // Cevapları surveyAnswers objesine doldur
            surveyAnswers = {};
            existingAnswers?.forEach(answer => {
                surveyAnswers[answer.question_id] = {
                    answer_data: answer.answer_data,
                    photos: answer.photos || []
                };
            });
        }
        
        // Global değişkenleri ayarla
        currentSurvey = survey;
        surveyQuestions = questions;
        currentQuestionIndex = 0;
        
        // Modal'ı aç ve ilk soruyu göster
        document.getElementById('surveyWizardTitle').textContent = survey.title;
        document.getElementById('total-questions').textContent = questions.length;
        
        const modal = new bootstrap.Modal(document.getElementById('surveyWizardModal'));
        modal.show();
        
        // İlk soruyu göster
        renderQuestion(0);
        
    } catch (error) {
        console.error('Anket başlatma hatası:', error);
        showAlert('Anket başlatılırken hata oluştu: ' + error.message, 'danger');
    }
}

// ============================================
// 6. NAVİGASYON BUTONLARINI GÜNCELLE
// ============================================
function updateNavigationButtons() {
    const index = currentQuestionIndex;
    const isLastQuestion = index === surveyQuestions.length - 1;
    const currentQuestion = surveyQuestions[index];
    
    // Soru bulunamazsa hata önle
    if (!currentQuestion) {
        console.warn('⚠️ updateNavigationButtons: Question bulunamadı, index:', index);
        return;
    }
    
    // Sepet tipi sorular için özel kontrol
    const isBasketType = currentQuestion.question_type === 'basket_dynamic' || 
                         currentQuestion.question_type === 'gsm_accessory_basket';
    
    // Sepet formu açılmış mı kontrol et
    let hasBasketForms = false;
    if (isBasketType) {
        const containerId = currentQuestion.question_type === 'basket_dynamic' 
            ? 'basket-forms-container' 
            : 'gsm-accessory-forms-container';
        const container = document.getElementById(containerId);
        hasBasketForms = container && container.innerHTML.trim().length > 0;
    }
    
    // Geri butonu
    document.getElementById('prev-question-btn').style.display = index > 0 ? 'inline-block' : 'none';
    
    // İleri / Anketi Tamamla butonu kontrolü
    if (isLastQuestion) {
        // Son soru
        if (isBasketType && !hasBasketForms) {
            // Sepet formu açılmamış, İleri göster
            document.getElementById('next-question-btn').style.display = 'inline-block';
            document.getElementById('submit-survey-btn').style.display = 'none';
        } else {
            // Normal son soru veya sepet formu açılmış
            document.getElementById('next-question-btn').style.display = 'none';
            document.getElementById('submit-survey-btn').style.display = 'inline-block';
        }
    } else {
        // Son soru değil, her zaman İleri göster
        document.getElementById('next-question-btn').style.display = 'inline-block';
        document.getElementById('submit-survey-btn').style.display = 'none';
    }
}

// ============================================
// 7. SORUYU RENDER ET
// ============================================
function renderQuestion(index) {
    if (index < 0 || index >= surveyQuestions.length) return;
    
    const question = surveyQuestions[index];
    const container = document.getElementById('survey-question-container');
    
    // Progress güncelle
    const progress = ((index + 1) / surveyQuestions.length) * 100;
    document.getElementById('current-question-num').textContent = index + 1;
    document.getElementById('progress-percentage').textContent = Math.round(progress) + '%';
    document.getElementById('survey-progress-bar').style.width = progress + '%';
    
    // Buton kontrolü
    updateNavigationButtons();
    
    // Soru tipine göre render et
    let html = `
        <div class="card border-primary">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">Soru ${index + 1}</h5>
            </div>
            <div class="card-body">
                <p class="lead">${question.question_text}</p>
                ${question.help_text ? `<p class="text-muted small"><i class="fas fa-info-circle me-1"></i>${question.help_text}</p>` : ''}
                <hr>
                ${renderQuestionType(question)}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Daha önce verilen cevabı yükle
    loadPreviousAnswer(question.id);
}

// ============================================
// 7. VERİTABANINDAN MARKA ÇEK
// ============================================
async function fetchBrandsFromDatabase() {
    try {
        const { data, error } = await supabase
            .from('brands')
            .select('name')
            .eq('status', 'active')
            .order('name');
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Marka çekme hatası:', error);
        return null;
    }
}

// ============================================
// 8. SORU TİPİNE GÖRE RENDER
// ============================================
function renderQuestionType(question) {
    const config = question.question_config;
    
    console.log('=== SORU RENDER EDİLİYOR ===');
    console.log('Soru tipi:', question.question_type);
    console.log('Soru ID:', question.id);
    console.log('Config:', config);
    console.log('Config brands:', config?.brands);
    console.log('Config options:', config?.options);
    console.log('Config categories:', config?.categories);
    console.log('Config basket_types:', config?.basket_types);
    console.log('Config upper_groups:', config?.upper_groups);
    
    switch (question.question_type) {
        case 'promoter_count':
            console.log('Promotör sorusu render ediliyor...');
            return renderPromoterCountQuestion(question, config);
        case 'investment_area':
            console.log('Investment area sorusu render ediliyor...');
            console.log('Investment config brands:', config?.brands);
            return renderInvestmentAreaQuestion(question, config);
        case 'basket_dynamic':
            console.log('Sepet sorusu render ediliyor...');
            return renderDynamicBasketQuestion(question, config);
        case 'gsm_accessory_basket':
            console.log('GSM Aksesuar sorusu render ediliyor...');
            return renderGSMAccessoryBasketQuestion(question, config);
        default:
            console.log('Bilinmeyen soru tipi:', question.question_type);
            return '<p class="text-danger">Bilinmeyen soru tipi</p>';
    }
}

// ============================================
// 8. PROMOTÖR SAYISI SORUSU
// ============================================
function renderPromoterCountQuestion(question, config) {
    console.log('🔍 Promoter render - Config:', config);
    console.log('🔍 Promoter render - Options:', config?.options);
    console.log('🔍 Promoter render - Options length:', config?.options?.length);
    
    if (!config || !config.options || config.options.length === 0) {
        console.error('❌ Config veya options bulunamadı!');
        return '<div class="alert alert-danger">Marka listesi yüklenemedi!</div>';
    }
    
    let html = '<div id="promoter-answer">';
    
    config.options.forEach((option, index) => {
        const isOther = option.allow_custom;
        html += `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-4">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" 
                                    id="brand-${index}" 
                                    value="${option.value}"
                                    onchange="toggleBrandCount(${index})">
                                <label class="form-check-label fw-bold" for="brand-${index}">
                                    ${option.label}
                                </label>
                            </div>
                        </div>
                        <div class="col-md-4" id="count-container-${index}" style="display: none;">
                            <label class="form-label small">Kişi Sayısı</label>
                            <input type="number" class="form-control" 
                                id="count-${index}" 
                                min="0" 
                                placeholder="0">
                        </div>
                        ${isOther ? `
                        <div class="col-md-4" id="custom-container-${index}" style="display: none;">
                            <label class="form-label small">Marka Adı</label>
                            <input type="text" class="form-control" 
                                id="custom-${index}" 
                                placeholder="Marka adını yazın">
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

// ============================================
// 9. YATIRIM ALANI SORUSU
// ============================================
function renderInvestmentAreaQuestion(question, config) {
    console.log('=== RENDER INVESTMENT AREA QUESTION ===');
    console.log('Question:', question);
    console.log('Config:', config);
    console.log('Config brands:', config?.brands);
    console.log('Config categories:', config?.categories);
    
    // Güvenlik kontrolü
    if (!config) {
        console.error('Investment area config bulunamadı!');
        return '<p class="text-danger">Yatırım alanı konfigürasyonu yüklenemedi.</p>';
    }
    
    // Eksik konfigürasyonları tamamla
    if (!config.categories) {
        console.log('Categories eksik, varsayılan ekleniyor...');
        config.categories = [
            {"label": "Duvar Standı", "value": "wall"},
            {"label": "Orta Alan Standı", "value": "middle"},
            {"label": "Masa Üstü Standı", "value": "desk"},
            {"label": "Diğer", "value": "other", "allow_custom": true}
        ];
    }
    
    if (!config.brands) {
        console.log('Brands eksik, varsayılan markalar kullanılıyor...');
        config.brands = ["Philips", "Ugreen", "JBL", "Anker", "Baseus", "Ttec", "Cellurline", "Shokz", "Fresh'N Rebul", "Sennheiser", "Huawei", "Momax", "Piili", "Samsung", "Apple"];
        console.log('Varsayılan markalar kullanılıyor:', config.brands);
    }
    
    if (!config.max_photos) {
        console.log('Max photos eksik, varsayılan ekleniyor...');
        config.max_photos = 5;
    }
    
    console.log('Final config:', config);
    console.log('Final brands:', config.brands);
    console.log('Final categories:', config.categories);
    
    // Config'i global olarak set et
    window.investmentConfig = config;
    window.investmentAreaCount = 0;
    window.currentSurveyQuestion = question;
    console.log('🔧 Investment config direkt set edildi:', window.investmentConfig);
    
    let html = `
        <div id="investment-answer">
            <div id="investment-areas-container"></div>
            <div class="text-center mt-3">
                <button type="button" class="btn btn-primary" onclick="addInvestmentArea()">
                    <i class="fas fa-plus me-2"></i>Yatırım Alanı Ekle
                </button>
            </div>
        </div>
        
    `;
    return html;
}

// Loading göstergesi fonksiyonları
function showInvestmentLoading() {
    const container = document.getElementById('investment-areas-container');
    if (container) {
        container.innerHTML = `
            <div class="text-center p-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Yükleniyor...</span>
                </div>
                <p class="mt-2 text-muted">Yatırım alanı yükleniyor, lütfen bekleyiniz...</p>
            </div>
        `;
    }
}

function hideInvestmentLoading() {
    // Loading zaten addInvestmentArea içinde kaldırılıyor, sadece emniyet için
    const container = document.getElementById('investment-areas-container');
    if (container) {
        const loadingDiv = container.querySelector('.spinner-border');
        if (loadingDiv && loadingDiv.closest('.text-center')) {
            loadingDiv.closest('.text-center').remove();
        }
    }
}

function showSaveLoading() {
    // Kaydetme butonlarını disable et ve loading göster
    const saveButtons = document.querySelectorAll('button[onclick*="nextQuestion"], button[onclick*="previousQuestion"]');
    saveButtons.forEach(btn => {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Kaydediliyor...';
    });
}

function hideSaveLoading() {
    // Kaydetme butonlarını normale döndür
    const saveButtons = document.querySelectorAll('button[onclick*="nextQuestion"], button[onclick*="previousQuestion"]');
    saveButtons.forEach(btn => {
        btn.disabled = false;
        btn.innerHTML = btn.innerHTML.replace(/<i class="fas fa-spinner fa-spin me-2"><\/i>Kaydediliyor\.\.\./, 'İleri');
        if (btn.innerHTML.includes('Geri')) {
            btn.innerHTML = '<i class="fas fa-arrow-left me-2"></i>Geri';
        }
    });
}

function showGeneralLoading(message = 'İşlem yapılıyor...') {
    // Genel loading modal
    const existingModal = document.getElementById('generalLoadingModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHtml = `
        <div class="modal fade" id="generalLoadingModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-body text-center p-4">
                        <div class="spinner-border text-primary mb-3" role="status">
                            <span class="visually-hidden">Yükleniyor...</span>
                        </div>
                        <p class="mb-0">${message}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('generalLoadingModal'));
    modal.show();
    
    return modal;
}

function hideGeneralLoading() {
    const modal = document.getElementById('generalLoadingModal');
    if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) {
            bsModal.hide();
        }
        modal.remove();
    }
}

// ============================================
// 10. DİNAMİK SEPET SORUSU (YATIRIM ALANI MANTIĞI GİBİ)
// ============================================
function renderDynamicBasketQuestion(question, config) {
    console.log('🔍 Dynamic Basket render - Config:', config);
    console.log('🔍 Config detayları:', {
        hasConfig: !!config,
        hasBasketTypes: !!config?.basket_types,
        hasUpperGroups: !!config?.upper_groups,
        hasBrands: !!config?.brands,
        basketTypes: config?.basket_types,
        upperGroups: config?.upper_groups,
        brands: config?.brands
    });
    
    if (!config || !config.basket_types || !config.upper_groups || !config.brands) {
        console.error('❌ Config eksik! Config:', config);
        return '<div class="alert alert-danger">Sepet konfigürasyonu bulunamadı! Config eksik veya yanlış format.</div>';
    }
    
    // Config'i global olarak set et
    window.basketConfig = config;
    window.basketItemCount = 0;
    console.log('🔧 Basket config direkt set edildi:', window.basketConfig);
    
    let html = `
        <div id="dynamic-basket-answer">
            <div id="baskets-container"></div>
            <div class="text-center mt-3">
                <button type="button" class="btn btn-success" onclick="addBasketItem()">
                    <i class="fas fa-plus me-2"></i>Sepet Ekle
                </button>
            </div>
        </div>
    `;
    
    return html;
}

// ============================================
// 11. ESKİ SEPET SORUSU (DEPRECATED)
// ============================================
function renderBasketDynamicQuestion(question, config) {
    let html = `
        <div id="basket-answer">
            <div class="mb-4">
                <label class="form-label fw-bold">${config.basket_count_label || 'Sepet Sayısı'}</label>
                <div class="input-group" style="max-width: 300px;">
                    <input type="number" class="form-control form-control-lg" 
                        id="basket-count" 
                        min="1" 
                        max="50" 
                        placeholder="0"
                        onchange="generateBasketForms()">
                    <button class="btn btn-primary" type="button" onclick="generateBasketForms()">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
            <div id="basket-forms-container"></div>
        </div>
        
        <script>
            window.basketConfig = ${JSON.stringify(config)};
        </script>
    `;
    return html;
}

// ============================================
// 10. GSM AKSESUAR SEPET SORUSU
// ============================================
function renderGSMAccessoryBasketQuestion(question, config) {
    let html = `
        <div id="gsm-accessory-answer">
            <div class="mb-4">
                <label class="form-label fw-bold">${config.basket_count_label || 'GSM Aksesuar Sepeti Sayısı'}</label>
                <div class="input-group" style="max-width: 300px;">
                    <input type="number" class="form-control form-control-lg" 
                        id="gsm-accessory-count" 
                        min="1" 
                        max="50" 
                        placeholder="0"
                        onchange="generateGSMAccessoryForms()">
                    <button class="btn btn-primary" type="button" onclick="generateGSMAccessoryForms()">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
            <div id="gsm-accessory-forms-container"></div>
        </div>
        
        <script>
            window.gsmAccessoryConfig = ${JSON.stringify(config)};
        </script>
    `;
    return html;
}

// ============================================
// 11. YARDIMCI FONKSİYONLAR
// ============================================

// Marka seçimi toggle
function toggleBrandCount(index) {
    const checkbox = document.getElementById(`brand-${index}`);
    const countContainer = document.getElementById(`count-container-${index}`);
    const customContainer = document.getElementById(`custom-container-${index}`);
    
    if (checkbox.checked) {
        countContainer.style.display = 'block';
        if (customContainer) customContainer.style.display = 'block';
    } else {
        countContainer.style.display = 'none';
        if (customContainer) customContainer.style.display = 'none';
    }
}

// Yatırım alanı ekle
async function addInvestmentArea() {
    const container = document.getElementById('investment-areas-container');
    const count = window.investmentAreaCount || 0;
    let config = window.investmentConfig;
    
    console.log('addInvestmentArea çağrıldı, config:', config);
    
    // Loading göstergesi göster
    showInvestmentLoading();
    
    // Güvenlik kontrolü
    if (!config) {
        console.error('Investment config bulunamadı! Global config kontrol ediliyor...');
        
        // Alternatif: Global config'den çek
        const currentQuestion = window.currentSurveyQuestion;
        if (currentQuestion && currentQuestion.question_config) {
            config = currentQuestion.question_config;
            console.log('Global config bulundu:', config);
        } else {
            console.error('Hiçbir config bulunamadı! Veritabanından çekiliyor...');
            // Son çare: Veritabanından çek
            try {
                const brands = await fetchBrandsFromDatabase();
                config = {
                    categories: [
                        {"label": "Duvar Standı", "value": "wall"},
                        {"label": "Orta Alan Standı", "value": "middle"},
                        {"label": "Masa Üstü Standı", "value": "desk"},
                        {"label": "Diğer", "value": "other", "allow_custom": true}
                    ],
                    brands: brands ? brands.map(b => b.name) : ["Philips", "Ugreen", "JBL", "Anker", "Baseus", "Ttec", "Cellurline", "Shokz", "Fresh'N Rebul", "Sennheiser", "Huawei", "Momax", "Piili", "Samsung", "Apple"],
                    max_photos: 5
                };
                console.log('Veritabanından config oluşturuldu:', config);
            } catch (error) {
                console.error('Veritabanından config çekme hatası:', error);
                config = {
                    categories: [
                        {"label": "Duvar Standı", "value": "wall"},
                        {"label": "Orta Alan Standı", "value": "middle"},
                        {"label": "Masa Üstü Standı", "value": "desk"},
                        {"label": "Diğer", "value": "other", "allow_custom": true}
                    ],
                    brands: ["Philips", "Ugreen", "JBL", "Anker", "Baseus", "Ttec", "Cellurline", "Shokz", "Fresh'N Rebul", "Sennheiser", "Huawei", "Momax", "Piili", "Samsung", "Apple"],
                    max_photos: 5
                };
                console.log('Varsayılan config kullanılıyor:', config);
            }
        }
    }
    
    if (!config.categories) {
        console.error('Categories bulunamadı! Config:', config);
        // Varsayılan kategoriler
        config.categories = [
            {"label": "Duvar Standı", "value": "wall"},
            {"label": "Orta Alan Standı", "value": "middle"},
            {"label": "Masa Üstü Standı", "value": "desk"},
            {"label": "Diğer", "value": "other", "allow_custom": true}
        ];
    } else if (config.categories && config.categories.length === 3) {
        // Mevcut ankette 3 kategori varsa "Masa Üstü Standı" ekle
        console.log('⚠️ 3 kategori tespit edildi, "Masa Üstü Standı" ekleniyor...');
        const hasDesk = config.categories.some(cat => cat.value === 'desk');
        if (!hasDesk) {
            // "Masa Üstü Standı" ekle (Orta Alan Standı'dan sonra)
            config.categories.splice(2, 0, {"label": "Masa Üstü Standı", "value": "desk"});
            console.log('✅ "Masa Üstü Standı" eklendi. Yeni config:', config.categories);
        }
    }
    
    if (!config.brands) {
        console.error('Brands bulunamadı! Config:', config);
        config.brands = ["JBL", "Baseus", "Anker", "Ttec", "Diğer"];
    }
    
    const html = `
        <div class="card mb-3 investment-area-card" id="investment-area-${count}">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span>Yatırım Alanı #${count + 1}</span>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeInvestmentArea(${count})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Alan Tipi *</label>
                        <select class="form-control area-type" data-index="${count}" required>
                            <option value="">Seçiniz</option>
                            ${config.categories.map(cat => `
                                <option value="${cat.value}" ${cat.allow_custom ? 'data-custom="true"' : ''}>
                                    ${cat.label}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="col-md-6 mb-3" id="custom-area-${count}" style="display: none;">
                        <label class="form-label">Alan Adı</label>
                        <input type="text" class="form-control custom-area-name" placeholder="Özel alan adı">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Marka *</label>
                        <select class="form-control area-brand" data-index="${count}" required onchange="checkOtherBrand(${count})">
                            <option value="">Seçiniz</option>
                            ${config.brands.map(brand => `<option value="${brand}">${brand}</option>`).join('')}
                            <option value="other">Diğer</option>
                        </select>
                    </div>
                    <div class="col-md-6 mb-3" id="custom-brand-${count}" style="display: none;">
                        <label class="form-label">Marka Adı</label>
                        <input type="text" class="form-control custom-brand-name" placeholder="Marka adını yazın">
                    </div>
                    <div class="col-12 mb-3">
                        <label class="form-label">Fotoğraflar (Maks. ${config.max_photos}) *</label>
                        <input type="file" class="form-control area-photos" 
                            accept="image/*" 
                            multiple 
                            data-index="${count}"
                            onchange="previewAreaPhotos(${count})">
                        <div id="photo-preview-${count}" class="mt-2"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Loading göstergesini gizle (HTML eklemeden önce)
    hideInvestmentLoading();
    console.log('✅ Yatırım alanı eklendi, loading gizleniyor...');
    
    container.insertAdjacentHTML('beforeend', html);
    window.investmentAreaCount = count + 1;
    
    // Yeni eklenen kartı görünür yap ve kaydır
    setTimeout(() => {
        const newCard = document.getElementById(`investment-area-${count}`);
        if (newCard) {
            newCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, 100);
    
    // Alan tipi değişimi dinle
    document.querySelector(`select.area-type[data-index="${count}"]`).addEventListener('change', function(e) {
        const customContainer = document.getElementById(`custom-area-${count}`);
        if (e.target.selectedOptions[0]?.dataset.custom === 'true') {
            customContainer.style.display = 'block';
        } else {
            customContainer.style.display = 'none';
        }
    });
}

// Yatırım alanı sil
function removeInvestmentArea(index) {
    const card = document.getElementById(`investment-area-${index}`);
    if (card) card.remove();
}

// Diğer marka kontrolü
function checkOtherBrand(index) {
    const select = document.querySelector(`select.area-brand[data-index="${index}"]`);
    const customContainer = document.getElementById(`custom-brand-${index}`);
    
    if (select.value === 'other') {
        customContainer.style.display = 'block';
    } else {
        customContainer.style.display = 'none';
    }
}

// Fotoğraf önizleme
function previewAreaPhotos(index) {
    const input = document.querySelector(`input.area-photos[data-index="${index}"]`);
    const preview = document.getElementById(`photo-preview-${index}`);
    
    // Marka seçimi kontrolü
    const brandSelect = document.querySelector(`select.area-brand[data-index="${index}"]`);
    const selectedBrand = brandSelect ? brandSelect.value : '';
    
    if (!selectedBrand || selectedBrand === '') {
        showAlert('Lütfen önce marka seçin!', 'warning');
        input.value = ''; // Dosya seçimini temizle
        preview.innerHTML = '';
        return;
    }
    
    preview.innerHTML = '';
    
    if (input.files && input.files.length > 0) {
        Array.from(input.files).forEach((file, i) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML += `
                    <div class="d-inline-block me-2 mb-2">
                        <img src="${e.target.result}" class="img-thumbnail" style="width: 100px; height: 100px; object-fit: cover;">
                        <small class="d-block text-center">${i + 1}</small>
                    </div>
                `;
            };
            reader.readAsDataURL(file);
        });
    }
}

// ============================================
// YENİ SEPET FONKSİYONLARI (YATIRIM ALANI MANTIĞI)
// ============================================

// Sepet ekle
async function addBasketItem() {
    const container = document.getElementById('baskets-container');
    const count = window.basketItemCount || 0;
    let config = window.basketConfig;
    
    console.log('addBasketItem çağrıldı, config:', config);
    
    // Güvenlik kontrolü
    if (!config) {
        console.error('❌ Basket config bulunamadı! window.basketConfig:', window.basketConfig);
        config = {
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
                        {"label": "Şarj Standı", "value": "charging_stand"},
                        {"label": "Diğer", "value": "other"}
                    ]
                }
            ],
            brands: ["Philips", "Ugreen", "JBL", "Anker", "Baseus", "Ttec", "Cellurline", "Shokz", "Fresh'N Rebul", "Sennheiser", "Huawei", "Momax", "Piili", "Samsung", "Apple", "Diğer"]
        };
    }
    
    const html = `
        <div class="card mb-3 basket-item-card" id="basket-item-${count}">
            <div class="card-header d-flex justify-content-between align-items-center bg-success text-white">
                <span><i class="fas fa-shopping-basket me-2"></i>Sepet #${count + 1}</span>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeBasketItem(${count})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="card-body">
                <div class="row g-3">
                    <!-- Sepet Türü -->
                    <div class="col-md-6">
                        <label class="form-label fw-bold">Sepet Türü *</label>
                        <select class="form-control basket-type" data-index="${count}" required>
                            <option value="">Seçiniz</option>
                            ${config.basket_types.map(type => `
                                <option value="${type.value}">${type.label}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <!-- Üst Grup -->
                    <div class="col-md-6">
                        <label class="form-label fw-bold">Üst Grup *</label>
                        <select class="form-control basket-upper-group" data-index="${count}" required>
                            <option value="">Seçiniz</option>
                            ${config.upper_groups.map(group => `
                                <option value="${group.value}">${group.label}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <!-- Alt Grup -->
                    <div class="col-md-6">
                        <label class="form-label fw-bold">Alt Grup *</label>
                        <select class="form-control basket-lower-group" data-index="${count}" id="basket-lower-group-${count}" required>
                            <option value="">Önce üst grup seçin</option>
                        </select>
                    </div>
                    
                    <!-- Marka -->
                    <div class="col-md-6">
                        <label class="form-label fw-bold">Marka *</label>
                        <select class="form-control basket-brand" data-index="${count}" required>
                            <option value="">Seçiniz</option>
                            ${config.brands.map(brand => `<option value="${brand}">${brand}</option>`).join('')}
                        </select>
                    </div>
                    
                    <!-- Özel Marka (Diğer seçilirse) -->
                    <div class="col-md-6" id="custom-basket-brand-${count}" style="display: none;">
                        <label class="form-label fw-bold">Marka Adı *</label>
                        <input type="text" class="form-control custom-basket-brand-name" data-index="${count}" placeholder="Marka adını yazın">
                    </div>
                    
                    <!-- Ürün Adı -->
                    <div class="col-md-6">
                        <label class="form-label fw-bold">Ürün Adı *</label>
                        <input type="text" class="form-control basket-product-name" data-index="${count}" placeholder="Ürün adını girin" required>
                    </div>
                    
                    <!-- Artikel -->
                    <div class="col-md-6">
                        <label class="form-label fw-bold">Artikel No *</label>
                        <input type="text" class="form-control basket-artikel" data-index="${count}" placeholder="Artikel numarasını girin" required>
                    </div>
                    
                    <!-- Fiyat -->
                    <div class="col-md-6">
                        <label class="form-label fw-bold">Fiyat (₺) *</label>
                        <input type="number" class="form-control basket-price" data-index="${count}" placeholder="Fiyatı girin" step="0.01" min="0" required>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', html);
    window.basketItemCount = count + 1;
    
    console.log('🔧 Sepet kartı eklendi, count:', count);
    console.log('🔧 window.basketConfig:', window.basketConfig);
    
    // Yeni eklenen kartı görünür yap ve kaydır
    setTimeout(() => {
        const newCard = document.getElementById(`basket-item-${count}`);
        if (newCard) {
            newCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, 100);
    
    // Event listener'ları ekle
    setTimeout(() => {
        const upperGroupSelect = document.querySelector(`select.basket-upper-group[data-index="${count}"]`);
        const brandSelect = document.querySelector(`select.basket-brand[data-index="${count}"]`);
        
        console.log('🔧 Event listener ekleniyor, selectors:', { upperGroupSelect, brandSelect });
        
        if (upperGroupSelect) {
            upperGroupSelect.addEventListener('change', function() {
                console.log('🔧 Üst grup değişti:', this.value);
                updateBasketLowerGroup(count);
            });
        } else {
            console.error('❌ upperGroupSelect bulunamadı!');
        }
        
        if (brandSelect) {
            brandSelect.addEventListener('change', function() {
                console.log('🔧 Marka değişti:', this.value);
                checkOtherBasketBrand(count);
            });
        } else {
            console.error('❌ brandSelect bulunamadı!');
        }
    }, 100);
}

// Sepet sil
function removeBasketItem(index) {
    const card = document.getElementById(`basket-item-${index}`);
    if (card) card.remove();
}

// Alt grup güncelle (üst gruba göre)
function updateBasketLowerGroup(index) {
    console.log('🔄 updateBasketLowerGroup çağrıldı, index:', index);
    
    const upperGroupSelect = document.querySelector(`select.basket-upper-group[data-index="${index}"]`);
    const lowerGroupSelect = document.getElementById(`basket-lower-group-${index}`);
    
    console.log('🔍 Selectors:', { upperGroupSelect, lowerGroupSelect });
    
    if (!upperGroupSelect || !lowerGroupSelect) {
        console.error('❌ Selector bulunamadı!');
        return;
    }
    
    const selectedUpperGroup = upperGroupSelect.value;
    console.log('🔍 Seçilen üst grup:', selectedUpperGroup);
    
    lowerGroupSelect.innerHTML = '<option value="">Seçiniz</option>';
    
    if (selectedUpperGroup) {
        const config = window.basketConfig;
        console.log('🔍 Config:', config);
        
        if (!config || !config.upper_groups) {
            console.error('❌ Config veya upper_groups bulunamadı!');
            return;
        }
        
        const upperGroup = config.upper_groups.find(g => g.value === selectedUpperGroup);
        console.log('🔍 Bulunan upper group:', upperGroup);
        
        if (upperGroup && upperGroup.lower_groups) {
            console.log('✅ Alt gruplar ekleniyor:', upperGroup.lower_groups);
            upperGroup.lower_groups.forEach(lowerGroup => {
                lowerGroupSelect.innerHTML += `<option value="${lowerGroup.value}">${lowerGroup.label}</option>`;
            });
        } else {
            console.error('❌ Alt gruplar bulunamadı!');
        }
    }
}

// Diğer marka kontrolü (sepet için)
function checkOtherBasketBrand(index) {
    const select = document.querySelector(`select.basket-brand[data-index="${index}"]`);
    const customContainer = document.getElementById(`custom-basket-brand-${index}`);
    
    if (select.value === 'Diğer' || select.value === 'other') {
        customContainer.style.display = 'block';
    } else {
        customContainer.style.display = 'none';
    }
}

// Sepet formları oluştur
function generateBasketForms() {
    const count = parseInt(document.getElementById('basket-count').value);
    if (!count || count < 1) {
        showAlert('Lütfen geçerli bir sepet sayısı girin', 'warning');
        return;
    }
    
    const container = document.getElementById('basket-forms-container');
    let config = window.basketConfig;
    
    console.log('generateBasketForms çağrıldı, config:', config);
    
    // Config yoksa varsayılan kullan
    if (!config || !config.brands) {
        console.log('Config bulunamadı, varsayılan kullanılıyor...');
        config = {
            brands: ["Philips", "Ugreen", "JBL", "Anker", "Baseus", "Ttec", "Cellurline", "Shokz", "Fresh'N Rebul", "Sennheiser", "Huawei", "Momax", "Piili", "Samsung", "Apple", "Diğer"]
        };
    }
    
    let html = '<div class="row">';
    
    for (let i = 0; i < count; i++) {
        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card">
                    <div class="card-header bg-light">
                        <strong>Sepet ${i + 1}</strong>
                    </div>
                    <div class="card-body">
                        <div class="mb-2">
                            <label class="form-label small">Marka *</label>
                            <select class="form-select form-select-sm basket-brand" 
                                data-basket="${i}" 
                                required 
                                onchange="checkBasketOther(${i})">
                                <option value="">Seçiniz</option>
                                ${config.brands.map(brand => `<option value="${brand}">${brand}</option>`).join('')}
                            </select>
                        </div>
                        <div class="mb-2" id="custom-basket-brand-${i}" style="display: none;">
                            <label class="form-label small">Diğer Marka</label>
                            <input type="text" class="form-control form-control-sm custom-basket-brand" 
                                data-basket="${i}" 
                                placeholder="Marka adı">
                        </div>
                        <div class="mb-2">
                            <label class="form-label small">Artikel No *</label>
                            <input type="text" class="form-control form-control-sm basket-artikel" 
                                data-basket="${i}" 
                                required 
                                placeholder="Artikel">
                        </div>
                        <div class="mb-2">
                            <label class="form-label small">Ürün Adı *</label>
                            <input type="text" class="form-control form-control-sm basket-product" 
                                data-basket="${i}" 
                                required 
                                placeholder="Ürün adı">
                        </div>
                        <div class="mb-2">
                            <label class="form-label small">Fiyat (TL) *</label>
                            <input type="number" class="form-control form-control-sm basket-price" 
                                data-basket="${i}" 
                                required 
                                step="0.01"
                                min="0"
                                placeholder="0.00">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
    
    // Butonları güncelle (sepet formu açıldığında "Anketi Tamamla" göster)
    updateNavigationButtons();
}

// GSM Aksesuar formları oluştur
function generateGSMAccessoryForms() {
    const count = parseInt(document.getElementById('gsm-accessory-count').value);
    if (!count || count < 1) {
        showAlert('Lütfen geçerli bir GSM aksesuar sepet sayısı girin', 'warning');
        return;
    }
    
    const container = document.getElementById('gsm-accessory-forms-container');
    let config = window.gsmAccessoryConfig;
    
    console.log('generateGSMAccessoryForms çağrıldı, config:', config);
    
    // Config yoksa varsayılan kullan
    if (!config || !config.brands) {
        console.log('Config bulunamadı, varsayılan kullanılıyor...');
        config = {
            brands: ["Philips", "Ugreen", "JBL", "Anker", "Baseus", "Ttec", "Cellurline", "Shokz", "Fresh'N Rebul", "Sennheiser", "Huawei", "Momax", "Piili", "Samsung", "Apple", "Diğer"]
        };
    }
    
    let html = '<div class="row">';
    
    for (let i = 0; i < count; i++) {
        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card">
                    <div class="card-header bg-light">
                        <strong>GSM Aksesuar Sepeti ${i + 1}</strong>
                    </div>
                    <div class="card-body">
                        <div class="mb-2">
                            <label class="form-label small">Marka *</label>
                            <select class="form-select form-select-sm gsm-accessory-brand" 
                                data-gsm-accessory="${i}" 
                                required 
                                onchange="checkGSMAccessoryOther(${i})">
                                <option value="">Seçiniz</option>
                                ${config.brands.map(brand => `<option value="${brand}">${brand}</option>`).join('')}
                            </select>
                        </div>
                        <div class="mb-2" id="custom-gsm-accessory-brand-${i}" style="display: none;">
                            <label class="form-label small">Diğer Marka</label>
                            <input type="text" class="form-control form-control-sm custom-gsm-accessory-brand" 
                                data-gsm-accessory="${i}" 
                                placeholder="Marka adı">
                        </div>
                        <div class="mb-2">
                            <label class="form-label small">Artikel No *</label>
                            <input type="text" class="form-control form-control-sm gsm-accessory-artikel" 
                                data-gsm-accessory="${i}" 
                                required 
                                placeholder="Artikel">
                        </div>
                        <div class="mb-2">
                            <label class="form-label small">Ürün Adı *</label>
                            <input type="text" class="form-control form-control-sm gsm-accessory-product" 
                                data-gsm-accessory="${i}" 
                                required 
                                placeholder="Ürün adı">
                        </div>
                        <div class="mb-2">
                            <label class="form-label small">Fiyat (TL) *</label>
                            <input type="number" class="form-control form-control-sm gsm-accessory-price" 
                                data-gsm-accessory="${i}" 
                                required 
                                step="0.01"
                                min="0"
                                placeholder="0.00">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
    
    // Butonları güncelle (sepet formu açıldığında "Anketi Tamamla" göster)
    updateNavigationButtons();
}

// Sepet "Diğer" kontrolü
function checkBasketOther(index) {
    const select = document.querySelector(`select.basket-brand[data-basket="${index}"]`);
    const customContainer = document.getElementById(`custom-basket-brand-${index}`);
    
    if (select.value === 'Diğer') {
        customContainer.style.display = 'block';
    } else {
        customContainer.style.display = 'none';
    }
}

// GSM Aksesuar "Diğer" kontrolü
function checkGSMAccessoryOther(index) {
    const select = document.querySelector(`select.gsm-accessory-brand[data-gsm-accessory="${index}"]`);
    const customContainer = document.getElementById(`custom-gsm-accessory-brand-${index}`);
    
    if (select.value === 'Diğer') {
        customContainer.style.display = 'block';
    } else {
        customContainer.style.display = 'none';
    }
}

// ÖNCEKİ CEVABI YÜKLE
function loadPreviousAnswer(questionId) {
    const answer = surveyAnswers[questionId];
    if (!answer) return;
    
    const question = surveyQuestions.find(q => q.id === questionId);
    if (!question) return;
    
    // Soru tipine göre cevabı yükle
    switch (question.question_type) {
        case 'promoter_count':
            loadPromoterAnswer(answer.answer_data);
            break;
        case 'investment_area':
            loadInvestmentAnswer(answer.answer_data, answer.photos);
            break;
        case 'basket_dynamic':
            loadBasketAnswer(answer.answer_data);
            break;
        case 'gsm_accessory_basket':
            loadGSMAccessoryAnswer(answer.answer_data);
            break;
    }
}

function loadPromoterAnswer(data) {
    // Promotör cevabını form alanlarına yükle
    if (data && data.brands) {
        data.brands.forEach((brand, index) => {
            const checkbox = document.getElementById(`brand-${index}`);
            if (checkbox && brand.selected) {
                checkbox.checked = true;
                toggleBrandCount(index);
                const countInput = document.getElementById(`count-${index}`);
                if (countInput) countInput.value = brand.count || 0;
                if (brand.custom_name) {
                    const customInput = document.getElementById(`custom-${index}`);
                    if (customInput) customInput.value = brand.custom_name;
                }
            }
        });
    }
}

function loadInvestmentAnswer(data, photos) {
    // Yatırım alanı cevabını yükle
    // Bu fonksiyon daha sonra implement edilecek
}

function loadBasketAnswer(data) {
    // Sepet cevabını yükle
    if (data && data.basket_count) {
        document.getElementById('basket-count').value = data.basket_count;
        generateBasketForms();
        
        // Form verilerini doldur
        setTimeout(() => {
            if (data.baskets) {
                data.baskets.forEach((basket, i) => {
                    const brandSelect = document.querySelector(`select.basket-brand[data-basket="${i}"]`);
                    if (brandSelect) brandSelect.value = basket.brand;
                    
                    const artikelInput = document.querySelectorAll('.basket-artikel')[i];
                    if (artikelInput) artikelInput.value = basket.artikel;
                    
                    const productInput = document.querySelectorAll('.basket-product')[i];
                    if (productInput) productInput.value = basket.product_name;
                    
                    const priceInput = document.querySelectorAll('.basket-price')[i];
                    if (priceInput) priceInput.value = basket.price || '';
                });
            }
        }, 100);
    }
}

function loadGSMAccessoryAnswer(data) {
    // GSM Aksesuar cevabını yükle
    if (data && data.gsm_accessory_count) {
        document.getElementById('gsm-accessory-count').value = data.gsm_accessory_count;
        generateGSMAccessoryForms();
        
        // Form verilerini doldur
        setTimeout(() => {
            if (data.gsm_accessories) {
                data.gsm_accessories.forEach((accessory, i) => {
                    const brandSelect = document.querySelector(`select.gsm-accessory-brand[data-gsm-accessory="${i}"]`);
                    if (brandSelect) brandSelect.value = accessory.brand;
                    
                    const artikelInput = document.querySelectorAll('.gsm-accessory-artikel')[i];
                    if (artikelInput) artikelInput.value = accessory.artikel;
                    
                    const productInput = document.querySelectorAll('.gsm-accessory-product')[i];
                    if (productInput) productInput.value = accessory.product_name;
                    
                    const priceInput = document.querySelectorAll('.gsm-accessory-price')[i];
                    if (priceInput) priceInput.value = accessory.price || '';
                });
            }
        }, 100);
    }
}

// SONRAKİ SORU
async function nextQuestion() {
    console.log('🚀 === NEXT QUESTION BAŞLADI ===');
    console.log('🚀 Mevcut soru index:', currentQuestionIndex);
    console.log('🚀 Toplam soru:', surveyQuestions.length);
    
    // Loading göstergesi göster - Global loading sistemini kullan
    let loadingId;
    if (typeof window.loadingSystem !== 'undefined') {
        loadingId = window.loadingSystem.show('Kaydediliyor...', 'Lütfen bekleyiniz...');
        console.log('⏳ Global Loading gösterildi, ID:', loadingId);
    } else {
        console.warn('⚠️ Global Loading sistemi bulunamadı! Window.loadingSystem:', typeof window.loadingSystem);
        // Fallback: alert göster
        alert('Lütfen bekleyiniz...');
    }
    
    try {
        // Mevcut soruyu kaydet
        console.log('💾 Mevcut cevap kaydediliyor...');
        if (loadingId && typeof window.loadingSystem !== 'undefined') {
            window.loadingSystem.update(loadingId, 'Kaydediliyor...', 'Cevabınız kaydediliyor...');
        }
        const saved = await saveCurrentAnswer(loadingId);
        if (!saved) {
            if (loadingId && typeof window.loadingSystem !== 'undefined') {
                window.loadingSystem.hide(loadingId);
            }
            return;
        }
        
        if (loadingId && typeof window.loadingSystem !== 'undefined') {
            window.loadingSystem.update(loadingId, 'Yükleniyor...', 'Sonraki soruya geçiliyor...');
        }
    
        // Son soru mu kontrol et (bir sonraki soru yoksa)
        const nextQuestionIndex = currentQuestionIndex + 1;
        const isLastQuestion = nextQuestionIndex >= surveyQuestions.length;
        
        if (isLastQuestion) {
            console.log('✅ Son soru tamamlandı, anket bitiriliyor...');
            console.log('🔍 Current index:', currentQuestionIndex, 'Next index would be:', nextQuestionIndex, 'Total questions:', surveyQuestions.length);
            if (loadingId && typeof window.loadingSystem !== 'undefined') {
                window.loadingSystem.hide(loadingId);
            }
            submitSurvey();
            return;
        }
        
        currentQuestionIndex++;
        console.log('➡️ Sonraki soruya geçiliyor. Yeni index:', currentQuestionIndex);
        renderQuestion(currentQuestionIndex);
        
        // Başarıyla tamamlandı
        if (loadingId && typeof window.loadingSystem !== 'undefined') {
            window.loadingSystem.hide(loadingId);
        }
    } catch (error) {
        console.error('❌ Next question hatası:', error);
        showAlert('Bir hata oluştu. Lütfen tekrar deneyin.', 'danger');
        if (loadingId && typeof window.loadingSystem !== 'undefined') {
            window.loadingSystem.hide(loadingId);
        }
    }
}

// ÖNCEKİ SORU
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion(currentQuestionIndex);
    }
}

// MEVCUT CEVABI KAYDET
async function saveCurrentAnswer(loadingId = null) {
    console.log('💾 === SAVE CURRENT ANSWER BAŞLADI ===');
    console.log('💾 currentQuestionIndex:', currentQuestionIndex);
    console.log('💾 surveyQuestions:', surveyQuestions);
    console.log('💾 surveyQuestions.length:', surveyQuestions?.length);
    
    const question = surveyQuestions[currentQuestionIndex];
    console.log('💾 Current question:', question);
    
    if (!question) {
        console.error('❌ Question bulunamadı! Index:', currentQuestionIndex);
        console.error('❌ Available questions:', surveyQuestions);
        showAlert('Soru bulunamadı. Lütfen sayfayı yenileyin.', 'danger');
        return false;
    }
    
    let answerData = {};
    let photos = [];
    
    try {
        // Soru tipine göre cevabı topla
        switch (question.question_type) {
            case 'promoter_count':
                // Promotör sorusu için loading yoksa göstermeyelim
                if (loadingId && typeof window.loadingSystem !== 'undefined') {
                    window.loadingSystem.update(loadingId, 'Cevap Kaydediliyor', 'Promotör bilgileri kaydediliyor...');
                }
                answerData = collectPromoterAnswer();
                break;
            case 'investment_area':
                console.log('🏗️ Investment area cevabı toplanıyor...');
                const investmentResult = await collectInvestmentAnswer(loadingId);
                console.log('📦 Investment result:', investmentResult);
                answerData = investmentResult.data;
                photos = investmentResult.photos;
                console.log('💾 Answer data:', answerData);
                console.log('📸 Photos array:', photos);
                break;
            case 'basket_dynamic':
                if (loadingId && typeof window.loadingSystem !== 'undefined') {
                    window.loadingSystem.update(loadingId, 'Cevap Kaydediliyor', 'Sepet bilgileri kaydediliyor...');
                }
                answerData = collectDynamicBasketAnswer();
                break;
            case 'gsm_accessory_basket':
                if (loadingId && typeof window.loadingSystem !== 'undefined') {
                    window.loadingSystem.update(loadingId, 'Cevap Kaydediliyor', 'GSM Aksesuar bilgileri kaydediliyor...');
                }
                answerData = collectGSMAccessoryAnswer();
                break;
        }
        
        // Zorunlu alan kontrolü (sepet sorularını zorunlu tutma)
        const isBasketType = question.question_type === 'basket_dynamic' || 
                             question.question_type === 'gsm_accessory_basket';
        
        if (question.is_required && !isBasketType && Object.keys(answerData).length === 0) {
            showAlert('Lütfen soruyu cevaplayınız', 'warning');
            return false;
        }
        
        // Cevabı kaydet
        console.log('💾 === VERİTABANINA KAYDEDILIYOR ===');
        console.log('💾 Response ID:', currentResponseId);
        console.log('💾 Question ID:', question.id);
        console.log('💾 Answer data:', JSON.stringify(answerData, null, 2));
        console.log('💾 Photos:', photos);
        
        const { error } = await supabase
            .from('survey_answers')
            .upsert({
                response_id: currentResponseId,
                question_id: question.id,
                answer_data: answerData,
                photos: photos
            }, {
                onConflict: 'response_id,question_id'
            });
            
        if (error) {
            console.error('❌ Veritabanı kayıt hatası:', error);
            throw error;
        }
        
        console.log('✅ Veritabanına başarıyla kaydedildi!');
        
        // Global objeye ekle
        surveyAnswers[question.id] = { answer_data: answerData, photos };
        
        return true;
        
    } catch (error) {
        console.error('Cevap kaydetme hatası:', error);
        showAlert('Cevap kaydedilirken hata oluştu: ' + error.message, 'danger');
        return false;
    }
}

// PROMOTÖR CEVABINI TOPLA
function collectPromoterAnswer() {
    const brands = [];
    const config = surveyQuestions[currentQuestionIndex].question_config;
    
    config.options.forEach((option, index) => {
        const checkbox = document.getElementById(`brand-${index}`);
        if (checkbox && checkbox.checked) {
            const countInput = document.getElementById(`count-${index}`);
            const customInput = document.getElementById(`custom-${index}`);
            
            brands.push({
                brand: option.value,
                brand_label: option.label,
                selected: true,
                count: parseInt(countInput?.value) || 0,
                custom_name: customInput?.value || null
            });
        }
    });
    
    return { brands };
}

// YATIRIM ALANI CEVABINI TOPLA
async function collectInvestmentAnswer(loadingId = null) {
    const areas = [];
    const photoUrls = [];
    const cards = document.querySelectorAll('.investment-area-card');
    
    for (const card of cards) {
        const index = card.id.split('-')[2];
        const typeSelect = card.querySelector('.area-type');
        const brandSelect = card.querySelector('.area-brand');
        const customAreaInput = card.querySelector('.custom-area-name');
        const customBrandInput = card.querySelector('.custom-brand-name');
        const photosInput = card.querySelector('.area-photos');
        
        if (!typeSelect?.value || !brandSelect?.value) {
            showAlert('Lütfen tüm alanları doldurun', 'warning');
            throw new Error('Eksik alan');
        }
        
        // Fotoğrafları yükle
        const areaPhotos = [];
        console.log(`🖼️ Area ${index} - Fotoğraf input:`, photosInput);
        console.log(`🖼️ Area ${index} - Dosya sayısı:`, photosInput?.files.length);
        
        if (photosInput && photosInput.files.length > 0) {
            console.log(`📤 ${photosInput.files.length} fotoğraf yükleniyor...`);
            // Loading güncelle
            if (loadingId && typeof window.loadingSystem !== 'undefined') {
                window.loadingSystem.update(loadingId, 'Fotoğraflar Yükleniyor...', `Alan ${index + 1} - ${photosInput.files.length} fotoğraf`);
            }
            for (let i = 0; i < photosInput.files.length; i++) {
                const file = photosInput.files[i];
                console.log(`📤 Fotoğraf ${i+1}/${photosInput.files.length} - ${file.name} (${(file.size/1024).toFixed(2)} KB)`);
                
                // Loading göster
                if (loadingId && typeof window.loadingSystem !== 'undefined') {
                    const fileSizeKB = (file.size / 1024).toFixed(0);
                    window.loadingSystem.update(loadingId, 'Fotoğraf Yükleniyor...', `Fotoğraf ${i+1}/${photosInput.files.length} - ${fileSizeKB} KB`);
                }
                
                console.log(`⏳ uploadSurveyPhoto başladı...`);
                const photoUrl = await uploadSurveyPhoto(file);
                console.log(`✅ uploadSurveyPhoto tamamlandı:`, photoUrl);
                
                if (photoUrl) {
                    console.log(`✅ Fotoğraf ${i+1} yüklendi:`, photoUrl);
                    areaPhotos.push(photoUrl);
                    photoUrls.push(photoUrl);
                } else {
                    console.error(`❌ Fotoğraf ${i+1} yüklenemedi!`);
                }
            }
        } else {
            console.log(`⚠️ Area ${index} - Fotoğraf seçilmemiş`);
        }
        
        console.log(`🎯 Area ${index} - Toplam yüklenen fotoğraf:`, areaPhotos.length);
        console.log(`🎯 Area ${index} - Fotoğraf URL'leri:`, areaPhotos);
        
        areas.push({
            type: typeSelect.value,
            custom_type: customAreaInput?.value || null,
            brand: brandSelect.value === 'other' ? customBrandInput?.value : brandSelect.value,
            photos: areaPhotos
        });
    }
    
    console.log('🎉 === TOPLANAN TÜM VERİLER ===');
    console.log('🎉 Toplam area sayısı:', areas.length);
    console.log('🎉 Areas:', JSON.stringify(areas, null, 2));
    console.log('🎉 Toplam fotoğraf sayısı:', photoUrls.length);
    console.log('🎉 Photo URLs:', photoUrls);
    
    return { data: { areas }, photos: photoUrls };
}

// DİNAMİK SEPET CEVABINI TOPLA (YENİ)
function collectDynamicBasketAnswer() {
    const baskets = [];
    const basketCards = document.querySelectorAll('.basket-item-card');
    
    console.log('🔍 Sepet kartları bulundu:', basketCards.length);
    
    basketCards.forEach((card, index) => {
        const cardIndex = card.id.replace('basket-item-', '');
        
        const basketType = card.querySelector(`.basket-type[data-index="${cardIndex}"]`)?.value;
        const upperGroup = card.querySelector(`.basket-upper-group[data-index="${cardIndex}"]`)?.value;
        const lowerGroup = card.querySelector(`.basket-lower-group[data-index="${cardIndex}"]`)?.value;
        
        let brand = card.querySelector(`.basket-brand[data-index="${cardIndex}"]`)?.value;
        const customBrandInput = card.querySelector(`#custom-basket-brand-${cardIndex} .custom-basket-brand-name`);
        
        // Eğer "Diğer" seçilmişse özel marka adını al
        if ((brand === 'Diğer' || brand === 'other') && customBrandInput) {
            brand = customBrandInput.value || brand;
        }
        
        const productName = card.querySelector(`.basket-product-name[data-index="${cardIndex}"]`)?.value;
        const artikel = card.querySelector(`.basket-artikel[data-index="${cardIndex}"]`)?.value;
        const price = parseFloat(card.querySelector(`.basket-price[data-index="${cardIndex}"]`)?.value) || 0;
        
        console.log(`Sepet ${index + 1}:`, { basketType, upperGroup, lowerGroup, brand, productName, artikel, price });
        
        // Tüm alanlar doluysa ekle
        if (basketType && upperGroup && lowerGroup && brand && productName && artikel) {
            baskets.push({
                basket_type: basketType,
                upper_group: upperGroup,
                lower_group: lowerGroup,
                brand: brand,
                product_name: productName,
                artikel: artikel,
                price: price
            });
        }
    });
    
    console.log('🔍 Toplanan sepet verileri:', baskets);
    return { data: { baskets } };
}

// ESKİ SEPET CEVABINI TOPLA (DEPRECATED)
function collectBasketAnswer() {
    const basketCount = parseInt(document.getElementById('basket-count')?.value);
    if (!basketCount) return {};
    
    const baskets = [];
    const brandSelects = document.querySelectorAll('.basket-brand');
    const artikelInputs = document.querySelectorAll('.basket-artikel');
    const productInputs = document.querySelectorAll('.basket-product');
    const priceInputs = document.querySelectorAll('.basket-price');
    
    for (let i = 0; i < basketCount; i++) {
        const customBrandInput = document.querySelector(`#custom-basket-brand-${i} input`);
        const brand = brandSelects[i].value === 'Diğer' ? customBrandInput?.value : brandSelects[i].value;
        
        baskets.push({
            brand: brand,
            artikel: artikelInputs[i].value,
            product_name: productInputs[i].value,
            price: parseFloat(priceInputs[i].value) || 0
        });
    }
    
    return {
        basket_count: basketCount,
        baskets
    };
}

// GSM AKSESUAR CEVABINI TOPLA
function collectGSMAccessoryAnswer() {
    const gsmAccessoryCount = parseInt(document.getElementById('gsm-accessory-count')?.value);
    if (!gsmAccessoryCount) return {};
    
    const gsmAccessories = [];
    const brandSelects = document.querySelectorAll('.gsm-accessory-brand');
    const artikelInputs = document.querySelectorAll('.gsm-accessory-artikel');
    const productInputs = document.querySelectorAll('.gsm-accessory-product');
    const priceInputs = document.querySelectorAll('.gsm-accessory-price');
    
    for (let i = 0; i < gsmAccessoryCount; i++) {
        const customBrandInput = document.querySelector(`#custom-gsm-accessory-brand-${i} input`);
        const brand = brandSelects[i].value === 'Diğer' ? customBrandInput?.value : brandSelects[i].value;
        
        gsmAccessories.push({
            brand: brand,
            artikel: artikelInputs[i].value,
            product_name: productInputs[i].value,
            price: parseFloat(priceInputs[i].value) || 0
        });
    }
    
    return {
        gsm_accessory_count: gsmAccessoryCount,
        gsm_accessories: gsmAccessories
    };
}

// FOTOĞRAF YÜKLEME
async function uploadSurveyPhoto(file) {
    console.log('📸 === FOTOĞRAF YÜKLEME BAŞLADI ===');
    console.log('📸 Dosya:', file.name, `(${(file.size/1024).toFixed(2)} KB)`);
    
    try {
        const user = checkUserSession();
        console.log('👤 Kullanıcı:', user);
        console.log('🏪 Store ID:', user.storeId);
        
        if (!user || !user.storeId) {
            console.error('❌ Kullanıcı veya store ID bulunamadı!');
            throw new Error('Kullanıcı bilgisi eksik');
        }
        
        const fileName = `${user.storeId}/${Date.now()}_${file.name}`;
        console.log('📁 Dosya adı:', fileName);
        console.log('🪣 Bucket: survey-photos');
        
        console.log('📤 Supabase Storage\'a yükleniyor...');
        const { data, error } = await supabase.storage
            .from('survey-photos')
            .upload(fileName, file);
        
        if (error) {
            console.error('❌ Supabase Storage hatası:', error);
            throw error;
        }
        
        console.log('✅ Storage\'a yüklendi:', data);
        
        console.log('🔗 Public URL alınıyor...');
        const { data: urlData } = supabase.storage
            .from('survey-photos')
            .getPublicUrl(fileName);
        
        console.log('✅ Public URL:', urlData.publicUrl);
        console.log('📸 === FOTOĞRAF YÜKLEME TAMAMLANDI ===');
        
        return urlData.publicUrl;
        
    } catch (error) {
        console.error('💥 === FOTOĞRAF YÜKLEME HATASI ===');
        console.error('❌ Hata detayı:', error);
        console.error('❌ Hata mesajı:', error.message);
        console.error('❌ Hata stack:', error.stack);
        return null;
    }
}

// ANKETİ TAMAMLA
async function submitSurvey() {
    // Loading göster - Global loading sistemini kullan
    let loadingId;
    if (typeof window.loadingSystem !== 'undefined') {
        loadingId = window.loadingSystem.show('Anket Tamamlanıyor', 'Son soruyu kaydediliyor...');
    }
    
    try {
        // Son soruyu kaydet
        const saved = await saveCurrentAnswer(loadingId);
        if (!saved) {
            if (loadingId && typeof window.loadingSystem !== 'undefined') {
                window.loadingSystem.hide(loadingId);
            }
            return;
        }
        
        if (loadingId && typeof window.loadingSystem !== 'undefined') {
            window.loadingSystem.update(loadingId, 'Anket Tamamlanıyor', 'Anket veritabanına kaydediliyor...');
        }
        
        // Response'u completed olarak işaretle
        const { error } = await supabase
            .from('survey_responses')
            .update({
                status: 'completed',
                submitted_at: new Date().toISOString()
            })
            .eq('id', currentResponseId);
            
        if (error) throw error;
        
        if (loadingId && typeof window.loadingSystem !== 'undefined') {
            window.loadingSystem.hide(loadingId);
        }
        showAlert('Anket başarıyla tamamlandı! Teşekkür ederiz.', 'success');
        
        // Modal'ı kapat
        const modal = bootstrap.Modal.getInstance(document.getElementById('surveyWizardModal'));
        modal.hide();
        
        // Anket listesini yenile
        setTimeout(() => {
            loadSurveys();
        }, 1000);
        
    } catch (error) {
        console.error('Anket tamamlama hatası:', error);
        if (loadingId && typeof window.loadingSystem !== 'undefined') {
            window.loadingSystem.hide(loadingId);
        }
        showAlert('Anket tamamlanırken hata oluştu: ' + error.message, 'danger');
    }
}

// ANKET KAPATMA ONAY
function confirmCloseSurvey() {
    if (confirm('Anketten çıkmak istediğinizden emin misiniz? İlerlemeniz kaydedilecektir.')) {
        const modal = bootstrap.Modal.getInstance(document.getElementById('surveyWizardModal'));
        modal.hide();
    }
}

// BADGE GÜNCELLE
function updateSurveyBadge(count) {
    const badge = document.getElementById('pending-surveys-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// AY ADI
function getMonthName(month) {
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return months[month - 1] || '';
}

// ============================================
// FİYAT TAKİBİ FONKSİYONLARI
// ============================================

async function loadPriceTracking() {
    try {
        // Markaları yükle
        await loadBrandsForPriceTracking();
        
        // Fiyat kayıtlarını yükle
        await loadPriceTrackingList();
        
    } catch (error) {
        console.error('Fiyat takibi yükleme hatası:', error);
    }
}

async function loadBrandsForPriceTracking() {
    const { data: brands, error } = await supabase
        .from('brands')
        .select('name')
        .eq('status', 'active')
        .order('name');
        
    if (error) throw error;
    
    const competitorSelect = document.getElementById('competitor-brand');
    const ourSelect = document.getElementById('our-brand');
    
    let options = '<option value="">Marka Seçiniz</option>';
    brands.forEach(brand => {
        options += `<option value="${brand.name}">${brand.name}</option>`;
    });
    
    if (competitorSelect) competitorSelect.innerHTML = options;
    if (ourSelect) ourSelect.innerHTML = options;
}

async function loadPriceTrackingList() {
    const user = checkUserSession();
    if (!user || !user.storeId) return;
    
    const { data: prices, error } = await supabase
        .from('competitor_price_tracking')
        .select('*, stores(name)')
        .eq('store_id', user.storeId)
        .order('date', { ascending: false })
        .limit(50);
        
    if (error) throw error;
    
    const container = document.getElementById('price-tracking-list');
    
    if (!prices || prices.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                Henüz fiyat kaydı bulunmamaktadır.
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Tarih</th>
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
    
    prices.forEach(price => {
        const diffClass = price.price_difference > 0 ? 'text-danger' : 'text-success';
        const diffIcon = price.price_difference > 0 ? '▲' : '▼';
        
        html += `
            <tr>
                <td>${new Date(price.date).toLocaleDateString('tr-TR')}</td>
                <td>${price.competitor_brand}</td>
                <td>
                    ${price.competitor_product}
                    ${price.competitor_artikel ? `<br><small class="text-muted">${price.competitor_artikel}</small>` : ''}
                </td>
                <td>${price.competitor_price.toFixed(2)} ₺</td>
                <td>
                    ${price.our_product}
                    ${price.our_artikel ? `<br><small class="text-muted">${price.our_artikel}</small>` : ''}
                </td>
                <td>${price.our_price.toFixed(2)} ₺</td>
                <td class="${diffClass}">
                    ${diffIcon} ${Math.abs(price.price_difference).toFixed(2)} ₺
                    <br><small>(${price.price_difference_percentage}%)</small>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function showAddPriceForm() {
    document.getElementById('add-price-form').style.display = 'block';
}

function hideAddPriceForm() {
    document.getElementById('add-price-form').style.display = 'none';
    document.getElementById('price-form').reset();
}

async function submitPriceTracking(event) {
    event.preventDefault();
    
    const user = checkUserSession();
    if (!user || !user.storeId) return;
    
    const data = {
        store_id: user.storeId,
        user_id: user.id,
        competitor_brand: document.getElementById('competitor-brand').value,
        competitor_product: document.getElementById('competitor-product').value,
        competitor_artikel: document.getElementById('competitor-artikel').value || null,
        competitor_price: parseFloat(document.getElementById('competitor-price').value),
        our_brand: document.getElementById('our-brand').value,
        our_product: document.getElementById('our-product').value,
        our_artikel: document.getElementById('our-artikel').value || null,
        our_price: parseFloat(document.getElementById('our-price').value),
        notes: document.getElementById('price-notes').value || null
    };
    
    try {
        const { error } = await supabase
            .from('competitor_price_tracking')
            .insert(data);
            
        if (error) throw error;
        
        showAlert('Fiyat kaydı başarıyla eklendi', 'success');
        hideAddPriceForm();
        loadPriceTrackingList();
        
    } catch (error) {
        console.error('Fiyat kaydetme hatası:', error);
        showAlert('Fiyat kaydedilirken hata oluştu: ' + error.message, 'danger');
    }
}

console.log('Survey.js tamamen yüklendi ✅');

