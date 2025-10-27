/**
 * YENİ ANKET RAPORLARI SİSTEMİ
 * Temiz ve modüler tasarım
 */

// Global değişkenler
let currentReportType = null;
let currentReportData = null;

// Sayfa yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Yeni Anket Raporları JS yüklendi');
    initializeReports();
});

// Raporları başlat
async function initializeReports() {
    try {
        console.log('🔍 Raporlar başlatılıyor...');
        
        // Anket listesini yükle
        await loadSurveyList();
        
        // Kanal ve bölge listelerini yükle
        await loadFilterOptions();
        
        console.log('✅ Raporlar başlatıldı');
    } catch (error) {
        console.error('❌ Rapor başlatma hatası:', error);
    }
}

// Anket listesini yükle
async function loadSurveyList() {
    try {
        console.log('🔍 Anket listesi yükleniyor...');
        
        const { data: surveys, error } = await supabase
            .from('surveys')
            .select('id, title, created_at')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const surveySelect = document.getElementById('filter-survey');
        if (surveySelect) {
            surveySelect.innerHTML = '<option value="">Anket Seçiniz</option>';
            
            surveys.forEach(survey => {
                const option = document.createElement('option');
                option.value = survey.id;
                option.textContent = survey.title;
                surveySelect.appendChild(option);
            });
            
            // 🚀 YENİ: Anket seçimi değiştiğinde KPI'ları otomatik güncelle
            surveySelect.addEventListener('change', function() {
                const selectedSurveyId = this.value;
                if (selectedSurveyId) {
                    console.log('🔄 Anket değişti, KPI\'lar güncelleniyor:', selectedSurveyId);
                    updateKPIs(selectedSurveyId);
                    loadSurveyReports(selectedSurveyId);
                } else {
                    // Anket seçimi temizlendiğinde KPI'ları sıfırla
                    updateKPIElement('kpi-assigned-stores', 0);
                    updateKPIElement('kpi-completed-stores', 0);
                    updateKPIElement('kpi-pending-stores', 0);
                    updateKPIElement('kpi-total-promoters', 0);
                    updateKPIElement('kpi-total-investments', 0);
                    updateKPIElement('kpi-total-baskets', 0);
                }
            });
        }
        
        console.log('✅ Anket listesi yüklendi:', surveys?.length || 0);
        
        // 🚀 YENİ: Varsayılan olarak en son anketi seç ve KPI'ları güncelle
        if (surveys && surveys.length > 0 && surveySelect) {
            const latestSurvey = surveys[0]; // En son anket (created_at DESC sıralaması)
            surveySelect.value = latestSurvey.id;
            console.log('🔄 Varsayılan anket seçildi:', latestSurvey.title, latestSurvey.id);
            
            // KPI'ları güncelle
            setTimeout(() => {
                updateKPIs(latestSurvey.id);
                loadSurveyReports(latestSurvey.id);
            }, 500);
        }
    } catch (error) {
        console.error('❌ Anket listesi yükleme hatası:', error);
    }
}

// Filtre seçeneklerini yükle
async function loadFilterOptions() {
    try {
        console.log('🔍 Filtre seçenekleri yükleniyor...');
        
        // Kanalları yükle
        const { data: channels, error: channelError } = await supabase
            .from('channels')
            .select('id, name')
            .order('name');
        
        if (channelError) throw channelError;
        
        const channelSelect = document.getElementById('filter-channel');
        if (channelSelect && channels) {
            channelSelect.innerHTML = '<option value="">Tüm Kanallar</option>';
            channels.forEach(channel => {
                const option = document.createElement('option');
                option.value = channel.id;
                option.textContent = channel.name;
                channelSelect.appendChild(option);
            });
        }
        
        // Bölgeleri yükle
        const { data: regions, error: regionError } = await supabase
            .from('regions')
            .select('id, name')
            .order('name');
        
        if (regionError) throw regionError;
        
        const regionSelect = document.getElementById('filter-region');
        if (regionSelect && regions) {
            regionSelect.innerHTML = '<option value="">Tüm Bölgeler</option>';
            regions.forEach(region => {
                const option = document.createElement('option');
                option.value = region.id;
                option.textContent = region.name;
                regionSelect.appendChild(option);
            });
        }
        
        // Mağazaları yükle
        const { data: stores, error: storeError } = await supabase
            .from('stores')
            .select('id, name')
            .eq('is_active', true)
            .order('name');
        
        if (storeError) throw storeError;
        
        const storeSelect = document.getElementById('filter-store');
        if (storeSelect && stores) {
            storeSelect.innerHTML = '<option value="">Tüm Mağazalar</option>';
            stores.forEach(store => {
                const option = document.createElement('option');
                option.value = store.id;
                option.textContent = store.name;
                storeSelect.appendChild(option);
            });
        }
        
        console.log('✅ Filtre seçenekleri yüklendi');
    } catch (error) {
        console.error('❌ Filtre seçenekleri yükleme hatası:', error);
    }
}

// Anket seçildiğinde çalışacak fonksiyon
async function loadSurveyReports(surveyId = null) {
    try {
        // Eğer surveyId parametre olarak verilmediyse DOM'dan al
        if (!surveyId) {
            surveyId = document.getElementById('filter-survey').value;
        }
        
        if (!surveyId) {
            console.log('❌ Anket seçilmedi');
            return;
        }
        
        console.log('🔍 Anket raporları yükleniyor, survey ID:', surveyId);
        
        // KPI'ları güncelle
        await updateKPIs(surveyId);
        
        console.log('✅ Anket raporları yüklendi');
        
        // 🚀 YENİ: Raporlar yüklendikten sonra KPI'ları da güncelle
        if (surveyId) {
            console.log('🔄 Raporlar yüklendi, KPI\'lar güncelleniyor...');
            await updateKPIs(surveyId);
        }
    } catch (error) {
        console.error('❌ Anket raporları yükleme hatası:', error);
    }
}

// KPI'ları güncelle
async function updateKPIs(surveyId) {
    try {
        console.log('🔍 KPI\'lar güncelleniyor...');
        
        // Eğer surveyId undefined ise, varsayılan olarak ilk anketi al
        if (!surveyId) {
            const surveySelect = document.getElementById('filter-survey');
            if (surveySelect && surveySelect.options.length > 1) {
                surveyId = surveySelect.options[1].value; // İlk seçenek "Seçiniz" olduğu için 1'den başla
            }
        }
        
        // Eğer hala undefined ise, currentFilters'dan al
        if (!surveyId && window.currentFilters && window.currentFilters.survey) {
            surveyId = window.currentFilters.survey;
        }
        
        console.log('🔍 KPI güncelleme için survey ID:', surveyId);
        
        if (!surveyId) {
            console.log('❌ Survey ID bulunamadı, KPI güncellenmedi');
            return;
        }
        
        // Survey responses'ları çek
        const { data: responses, error } = await supabase
            .from('survey_responses')
            .select(`
                id,
                store_id,
                status,
                submitted_at,
                stores(
                    id,
                    name,
                    channels(name),
                    regions(name)
                )
            `)
            .eq('survey_id', surveyId);
        
        if (error) throw error;
        
        // Mağaza durumlarını hesapla - DÜZELTME: survey_store_assignments'dan atanan mağazaları al
        // Önce atanan tüm mağazaları al
        const { data: assignments, error: assignmentError } = await supabase
            .from('survey_store_assignments')
            .select('store_id')
            .eq('survey_id', surveyId);
        
        const assignedStores = assignments?.length || 0;
        const completedStores = responses?.filter(r => r.status === 'completed').length || 0;
        const pendingStores = assignedStores - completedStores;
        
        // KPI elementlerini güncelle
        updateKPIElement('kpi-assigned-stores', assignedStores);
        updateKPIElement('kpi-completed-stores', completedStores);
        updateKPIElement('kpi-pending-stores', pendingStores);
        
        // Promotör ve yatırım alanı sayılarını hesapla
        await updatePromoterCount(surveyId);
        await updateInvestmentCount(surveyId);
        await updateBasketCount(surveyId);
        
        console.log('✅ KPI\'lar güncellendi');
    } catch (error) {
        console.error('❌ KPI güncelleme hatası:', error);
    }
}

// KPI elementini güncelle
function updateKPIElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

// Promotör sayısını güncelle
async function updatePromoterCount(surveyId) {
    try {
        // 🚀 DÜZELTME: Seçili anketi filter-survey'den al
        const surveySelect = document.getElementById('filter-survey');
        const selectedSurveyId = surveySelect?.value || surveyId;
        const numericSurveyId = parseInt(selectedSurveyId);
        
        console.log('🔍 Promotör arama - survey_id:', numericSurveyId);
        
        // Survey_responses üzerinden survey_answers'ı join et - TÜM CEVAPLARI AL
        const { data: responses, error: responseError } = await supabase
            .from('survey_responses')
            .select(`
                id,
                survey_answers(
                    id,
                    answer_data,
                    question_type
                )
            `)
            .eq('survey_id', numericSurveyId);
        
        if (responseError) throw responseError;
        
        // Tüm cevapları al ve promoter verilerini bul
        const answers = responses.flatMap(response => response.survey_answers || []);
        
        console.log('📊 Tüm cevaplar bulundu:', answers.length);
        console.log('📊 Cevaplar detayı:', answers);

        let totalPromoters = 0;
        answers?.forEach(answer => {
            // answer_data.brands varsa promoter sayısı
            if (answer.answer_data?.brands && Array.isArray(answer.answer_data.brands)) {
                answer.answer_data.brands.forEach(brand => {
                    if (brand.selected && brand.count) {
                        totalPromoters += parseInt(brand.count) || 0;
                    }
                });
            }
        });

        console.log('📊 Toplam promotör sayısı:', totalPromoters);
        updateKPIElement('kpi-total-promoters', totalPromoters);
    } catch (error) {
        console.error('❌ Promotör sayısı güncelleme hatası:', error);
    }
}

// Yatırım alanı sayısını güncelle
async function updateInvestmentCount(surveyId) {
    try {
        // 🚀 DÜZELTME: Seçili anketi filter-survey'den al
        const surveySelect = document.getElementById('filter-survey');
        const selectedSurveyId = surveySelect?.value || surveyId;
        const numericSurveyId = parseInt(selectedSurveyId);
        
        console.log('🔍 Yatırım alanı arama - survey_id:', numericSurveyId);
        
        // Survey_responses üzerinden survey_answers'ı join et - TÜM CEVAPLARI AL
        const { data: responses, error: responseError } = await supabase
            .from('survey_responses')
            .select(`
                id,
                survey_answers(
                    id,
                    answer_data,
                    question_type
                )
            `)
            .eq('survey_id', numericSurveyId);
        
        if (responseError) throw responseError;
        
        // Tüm cevapları al ve investment verilerini bul
        const answers = responses.flatMap(response => response.survey_answers || []);
        
        console.log('📊 Tüm cevaplar bulundu:', answers.length);

        let totalInvestments = 0;
        answers?.forEach(answer => {
            // answer_data.areas varsa investment alanı
            if (answer.answer_data?.areas && Array.isArray(answer.answer_data.areas)) {
                totalInvestments += answer.answer_data.areas.length;
            }
        });

        console.log('📊 Toplam yatırım alanı sayısı:', totalInvestments);
        updateKPIElement('kpi-total-investments', totalInvestments);
    } catch (error) {
        console.error('❌ Yatırım alanı sayısı güncelleme hatası:', error);
    }
}

// Sepet sayısını güncelle
async function updateBasketCount(surveyId) {
    try {
        // 🚀 DÜZELTME: Seçili anketi filter-survey'den al
        const surveySelect = document.getElementById('filter-survey');
        const selectedSurveyId = surveySelect?.value || surveyId;
        const numericSurveyId = parseInt(selectedSurveyId);
        
        console.log('🔍 Sepet arama - survey_id:', numericSurveyId);
        
        // Survey_responses üzerinden survey_answers'ı join et - TÜM CEVAPLARI AL
        const { data: responses, error: responseError } = await supabase
            .from('survey_responses')
            .select(`
                id,
                survey_answers(
                    id,
                    answer_data,
                    question_type
                )
            `)
            .eq('survey_id', numericSurveyId);
        
        if (responseError) throw responseError;
        
        // Tüm cevapları al ve basket verilerini bul
        const answers = responses.flatMap(response => response.survey_answers || []);
        
        console.log('📊 Tüm cevaplar bulundu:', answers.length);

        let totalBaskets = 0;
        answers?.forEach(answer => {
            // answer_data.data.baskets varsa sepet sayısı
            if (answer.answer_data?.data?.baskets && Array.isArray(answer.answer_data.data.baskets)) {
                totalBaskets += answer.answer_data.data.baskets.length;
            }
        });

        console.log('📊 Toplam sepet sayısı:', totalBaskets);
        updateKPIElement('kpi-total-baskets', totalBaskets);
    } catch (error) {
        console.error('❌ Sepet sayısı güncelleme hatası:', error);
    }
}

// Promotör raporunu göster
async function showPromoterReport() {
    try {
        const surveyId = document.getElementById('filter-survey').value;
        
        if (!surveyId) {
            showAlert('Lütfen önce bir anket seçin!', 'warning');
            return;
        }
        
        console.log('🔍 Promotör raporu yükleniyor - survey_id:', surveyId);
        
        currentReportType = 'promoter';
        
        // Rapor başlığını güncelle
        document.getElementById('report-title').textContent = 'Promotör Raporu';
        
        // Promotör verilerini çek - DÜZELTME: surveyId'yi integer'a çevir
        const numericSurveyId = parseInt(surveyId);
        console.log('🔍 Modal için numeric survey ID:', numericSurveyId);
        
        const { data: responses, error } = await supabase
            .from('survey_responses')
            .select(`
                id,
                store_id,
                submitted_at,
                stores(
                    id,
                    name,
                    channels(name),
                    regions(name)
                ),
                survey_answers(
                    answer_data
                )
            `)
            .eq('survey_id', numericSurveyId)
            .eq('status', 'completed');
        
        if (error) throw error;
        
        console.log('📊 Promotör responses bulundu:', responses?.length || 0);
        console.log('📊 Promotör responses detayı:', responses);
        
        // Promotör verilerini işle
        let reportData = [];
        
        responses?.forEach(response => {
            const store = response.stores;
            const promoterAnswer = response.survey_answers?.find(a => a.answer_data?.brands);
            
            console.log('🔍 Response işleniyor:', response.id, 'Store:', store?.name);
            console.log('🔍 Promoter answer bulundu mu?', !!promoterAnswer);
            
            if (promoterAnswer?.answer_data?.brands) {
                const brands = promoterAnswer.answer_data.brands
                    .filter(brand => brand.selected && brand.count > 0)
                    .map(brand => ({
                        name: brand.brand_label || brand.brand,
                        count: brand.count
                    }));
                
                if (brands.length > 0) {
                    reportData.push({
                        store: store,
                        brands: brands,
                        totalPromoters: brands.reduce((sum, brand) => sum + brand.count, 0)
                    });
                }
            }
        });
        
        currentReportData = reportData;
        
        // Rapor içeriğini oluştur
        let html = `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>Mağaza</th>
                            <th>Kanal</th>
                            <th>Bölge</th>
                            <th>Toplam Promotör</th>
                            <th>Marka Dağılımı</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        reportData.forEach(item => {
            const brandList = item.brands.map(brand => 
                `${brand.name}: ${brand.count}`
            ).join('<br>');
            
            html += `
                <tr>
                    <td><strong>${item.store.name}</strong></td>
                    <td>${item.store.channels?.name || '-'}</td>
                    <td>${item.store.regions?.name || '-'}</td>
                    <td><span class="badge bg-primary">${item.totalPromoters}</span></td>
                    <td><small>${brandList}</small></td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('report-content').innerHTML = html;
        document.getElementById('report-content-area').style.display = 'block';
        
        console.log('✅ Promotör raporu yüklendi');
    } catch (error) {
        console.error('❌ Promotör raporu yükleme hatası:', error);
        showAlert('Promotör raporu yüklenirken hata oluştu!', 'danger');
    }
}

// Yatırım alanı raporunu göster
async function showInvestmentReport() {
    try {
        const surveyId = document.getElementById('filter-survey').value;
        
        if (!surveyId) {
            showAlert('Lütfen önce bir anket seçin!', 'warning');
            return;
        }
        
        console.log('🔍 Yatırım alanı raporu yükleniyor - survey_id:', surveyId);
        
        currentReportType = 'investment';
        
        // Rapor başlığını günc Australia
        document.getElementById('report-title').textContent = 'Yatırım Alanı Raporu';
        
        // Yatırım alanı verilerini çek - DÜZELTME: surveyId'yi integer'a çevir
        const numericSurveyId = parseInt(surveyId);
        console.log('🔍 Investment modal için numeric survey ID:', numericSurveyId);
        
        const { data: responses, error } = await supabase
            .from('survey_responses')
            .select(`
                id,
                store_id,
                submitted_at,
                stores(
                    id,
                    name,
                    channels(name),
                    regions(name)
                ),
                survey_answers(
                    answer_data,
                    photo_urls
                )
            `)
            .eq('survey_id', numericSurveyId)
            .eq('status', 'completed');
        
        if (error) throw error;
        
        // Yatırım alanı verilerini işle
        let reportData = [];
        
        responses?.forEach(response => {
            const store = response.stores;
            const investmentAnswer = response.survey_answers?.find(a => a.answer_data?.areas);
            
            if (investmentAnswer?.answer_data?.areas) {
                const areas = investmentAnswer.answer_data.areas.map(area => ({
                    type: getAreaTypeLabel(area.type),
                    brand: area.brand,
                    photos: investmentAnswer.photo_urls || []
                }));
                
                if (areas.length > 0) {
                    reportData.push({
                        store: store,
                        areas: areas
                    });
                }
            }
        });
        
        currentReportData = reportData;
        
        // Rapor içeriğini oluştur - DÜZELTME: Mağaza listesi ve fotoğraf detayları
        let html = `
            <div class="row">
                <div class="col-12">
                    <h5 class="mb-3"><i class="fas fa-store me-2"></i>Mağaza Listesi ve Fotoğraf Detayları</h5>
                </div>
            </div>
            <div class="row">
        `;
        
        reportData.forEach((item, index) => {
            const areaList = item.areas.map(area => 
                `<span class="badge bg-warning me-1 mb-1">${area.type} - ${area.brand}</span>`
            ).join('<br>');
            
            const photoCount = item.areas.reduce((sum, area) => sum + (area.photos?.length || 0), 0);
            const allPhotos = item.areas.flatMap(area => area.photos || []);
            
            html += `
                <div class="col-md-6 mb-4">
                    <div class="card h-100">
                        <div class="card-header bg-light">
                            <h6 class="mb-0"><i class="fas fa-store me-2"></i>${item.store.name}</h6>
                            <small class="text-muted">
                                ${item.store.channels?.name || '-'} | ${item.store.regions?.name || '-'}
                            </small>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <strong>Yatırım Alanları:</strong><br>
                                ${areaList}
                            </div>
                            <div class="mb-3">
                                <strong>Fotoğraf Sayısı:</strong>
                                <span class="badge bg-info ms-2">${photoCount} fotoğraf</span>
                            </div>
            `;
            
            // Fotoğrafları göster
            if (allPhotos.length > 0) {
                html += `
                    <div class="mb-3">
                        <strong>Fotoğraflar:</strong>
                        <div class="row mt-2">
                `;
                
                allPhotos.forEach((photo, photoIndex) => {
                    html += `
                        <div class="col-6 mb-2">
                            <img src="${photo}" 
                                 class="img-fluid rounded border" 
                                 style="height: 80px; width: 100%; object-fit: cover; cursor: pointer;"
                                 alt="Yatırım alanı fotoğrafı ${photoIndex + 1}"
                                 onclick="openPhotoModal('${photo}', '${item.store.name}')"
                                 onerror="console.error('Fotoğraf yüklenemedi:', this.src); this.style.display='none';">
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="mb-3">
                        <span class="text-muted"><i class="fas fa-image me-1"></i>Fotoğraf yok</span>
                    </div>
                `;
            }
            
            html += `
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
            </div>
        `;
        
        document.getElementById('report-content').innerHTML = html;
        document.getElementById('report-content-area').style.display = 'block';
        
        console.log('✅ Yatırım alanı raporu yüklendi');
        
        // Fotoğraf modal'ını açacak fonksiyonu tanımla
        window.openPhotoModal = function(photoUrl, storeName) {
            const modalHtml = `
                <div class="modal fade" id="photoModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="fas fa-image me-2"></i>
                                    ${storeName} - Yatırım Alanı Fotoğrafı
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body text-center">
                                <img src="${photoUrl}" 
                                     class="img-fluid rounded" 
                                     alt="Yatırım alanı fotoğrafı"
                                     onerror="console.error('Fotoğraf yüklenemedi:', this.src);">
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Eski modal varsa kaldır
            const existingModal = document.getElementById('photoModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Yeni modal'ı ekle
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Modal'ı göster
            const modal = new bootstrap.Modal(document.getElementById('photoModal'));
            modal.show();
        };
        
    } catch (error) {
        console.error('❌ Yatırım alanı raporu yükleme hatası:', error);
        showAlert('Yatırım alanı raporu yüklenirken hata oluştu!', 'danger');
    }
}

// Sepet raporunu göster
async function showBasketReport() {
    try {
        const surveyId = document.getElementById('filter-survey').value;
        
        if (!surveyId) {
            showAlert('Lütfen önce bir anket seçin!', 'warning');
            return;
        }
        
        console.log('🔍 Sepet raporu yükleniyor - survey_id:', surveyId);
        
        currentReportType = 'basket';
        
        // Rapor başlığını güncelle
        document.getElementById('report-title').textContent = 'Sepet Raporu';
        
        // Sepet verilerini çek - DÜZELTME: surveyId'yi integer'a çevir
        const numericSurveyId = parseInt(surveyId);
        console.log('🔍 Basket modal için numeric survey ID:', numericSurveyId);
        
        const { data: responses, error } = await supabase
            .from('survey_responses')
            .select(`
                id,
                store_id,
                submitted_at,
                stores(
                    id,
                    name,
                    channels(name),
                    regions(name)
                ),
                survey_answers(
                    answer_data
                )
            `)
            .eq('survey_id', numericSurveyId)
            .eq('status', 'completed');
        
        if (error) throw error;
        
        // Sepet verilerini işle
        let reportData = [];
        
        responses?.forEach(response => {
            const store = response.stores;
            const basketAnswer = response.survey_answers?.find(a => a.answer_data?.data?.baskets);
            
            if (basketAnswer?.answer_data?.data?.baskets) {
                const baskets = basketAnswer.answer_data.data.baskets.map(basket => ({
                    type: getBasketTypeLabel(basket.basket_type),
                    upperGroup: getUpperGroupLabel(basket.upper_group),
                    lowerGroup: getLowerGroupLabel(basket.lower_group),
                    brand: basket.brand,
                    product: basket.product_name,
                    artikel: basket.artikel,
                    price: basket.price
                }));
                
                if (baskets.length > 0) {
                    reportData.push({
                        store: store,
                        baskets: baskets
                    });
                }
            }
        });
        
        currentReportData = reportData;
        
        // Rapor içeriğini oluştur
        let html = `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>Mağaza</th>
                            <th>Kanal</th>
                            <th>Bölge</th>
                            <th>Sepet Detayları</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        reportData.forEach(item => {
            const basketList = item.baskets.map(basket => 
                `<div class="border-bottom pb-1 mb-1">
                    <strong>${basket.type}</strong> - ${basket.upperGroup} / ${basket.lowerGroup}<br>
                    <small>${basket.brand} - ${basket.product} (${basket.artikel}) - ${basket.price}₺</small>
                </div>`
            ).join('');
            
            html += `
                <tr>
                    <td><strong>${item.store.name}</strong></td>
                    <td>${item.store.channels?.name || '-'}</td>
                    <td>${item.store.regions?.name || '-'}</td>
                    <td>${basketList}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('report-content').innerHTML = html;
        document.getElementById('report-content-area').style.display = 'block';
        
        console.log('✅ Sepet raporu yüklendi');
    } catch (error) {
        console.error('❌ Sepet raporu yükleme hatası:', error);
        showAlert('Sepet raporu yüklenirken hata oluştu!', 'danger');
    }
}

// Yardımcı fonksiyonlar
function getAreaTypeLabel(type) {
    const labels = {
        'wall': 'Duvar Standı',
        'middle': 'Orta Alan Standı',
        'desk': 'Masa Üstü Standı',
        'other': 'Diğer'
    };
    return labels[type] || type;
}

function getBasketTypeLabel(type) {
    const labels = {
        'large_basket': 'Büyük Boy Sepet',
        'basket': 'Basket Sepet'
    };
    return labels[type] || type;
}

function getUpperGroupLabel(group) {
    const labels = {
        'headphone': 'Kulaklık',
        'gsm_accessory': 'GSM Aksesuar'
    };
    return labels[group] || group;
}

function getLowerGroupLabel(group) {
    const labels = {
        'in_ear': 'Kulakiçi Kulaklık',
        'over_ear': 'Kafa Bantlı Kulaklık',
        'tws': 'TWS Kulaklık',
        'wall_adapter': 'Duvar Adaptörü',
        'powerbank': 'Powerbank',
        'car_holder': 'Araç İçi Tutucu',
        'lighter_charger': 'Çakmak Şarj Aleti',
        'cable': 'Kablo',
        'charging_stand': 'Şarj Standı',
        'other': 'Diğer'
    };
    return labels[group] || group;
}

// Raporu gizle
function hideReport() {
    document.getElementById('report-content-area').style.display = 'none';
    currentReportType = null;
    currentReportData = null;
}

// Mevcut raporu Excel olarak indir
function exportCurrentReport() {
    if (!currentReportType || !currentReportData) {
        showAlert('İndirilecek rapor bulunamadı!', 'warning');
        return;
    }
    
    try {
        let excelData = [];
        
        if (currentReportType === 'promoter') {
            currentReportData.forEach(item => {
                item.brands.forEach(brand => {
                    excelData.push({
                        'Mağaza': item.store.name,
                        'Kanal': item.store.channels?.name || '-',
                        'Bölge': item.store.regions?.name || '-',
                        'Marka': brand.name,
                        'Promotör Sayısı': brand.count
                    });
                });
            });
        } else if (currentReportType === 'investment') {
            currentReportData.forEach(item => {
                item.areas.forEach(area => {
                    excelData.push({
                        'Mağaza': item.store.name,
                        'Kanal': item.store.channels?.name || '-',
                        'Bölge': item.store.regions?.name || '-',
                        'Alan Tipi': area.type,
                        'Marka': area.brand,
                        'Fotoğraf Sayısı': area.photos?.length || 0
                    });
                });
            });
        } else if (currentReportType === 'basket') {
            currentReportData.forEach(item => {
                item.baskets.forEach(basket => {
                    excelData.push({
                        'Mağaza': item.store.name,
                        'Kanal': item.store.channels?.name || '-',
                        'Bölge': item.store.regions?.name || '-',
                        'Sepet Tipi': basket.type,
                        'Üst Grup': basket.upperGroup,
                        'Alt Grup': basket.lowerGroup,
                        'Marka': basket.brand,
                        'Ürün': basket.product,
                        'Artikel': basket.artikel,
                        'Fiyat': basket.price
                    });
                });
            });
        }
        
        // Excel dosyası oluştur
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Rapor');
        
        // Dosya adı oluştur
        const reportTypeNames = {
            'promoter': 'Promotor_Raporu',
            'investment': 'Yatirim_Alani_Raporu',
            'basket': 'Sepet_Raporu'
        };
        
        const fileName = `${reportTypeNames[currentReportType]}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Excel dosyasını indir
        XLSX.writeFile(wb, fileName);
        
        showAlert('Excel dosyası başarıyla indirildi!', 'success');
        
    } catch (error) {
        console.error('Excel export hatası:', error);
        showAlert('Excel dosyası indirilirken hata oluştu!', 'danger');
    }
}

// Tüm raporları indir
function exportAllReports() {
    showAlert('Tüm raporları indirme özelliği yakında eklenecek!', 'info');
}

// Modal render olduktan sonra güvenli çalıştırma helper'ı - BASİT VERSİYON
function runAfterModalRendered(contentElementId, callback, attempt = 0) {
    const el = document.getElementById(contentElementId);
    if (el) {
        try {
            callback();
        } catch (err) {
            console.error('Modal içerik yükleme hatası:', err);
        }
        return;
    }
    // Sadece 3 kez dene, 500ms aralıklarla
    if (attempt < 3) {
        setTimeout(() => runAfterModalRendered(contentElementId, callback, attempt + 1), 500);
    } else {
        console.error('Modal içerik elementi bulunamadı:', contentElementId);
    }
}

// Promotör sayısı KPI kartına tıklama
window.showPromoterBreakdownModal = function() {
    try {
        // 🚀 KALICI ÇÖZÜM: Her zaman filtre seçimini kontrol et
        const surveySelect = document.getElementById('filter-survey');
        if (!surveySelect || !surveySelect.value) {
            showAlert('Lütfen önce bir anket seçin!', 'warning');
            return;
        }
        
        const surveyId = surveySelect.value;
        const numericSurveyId = parseInt(surveyId);
        
        console.log('🔍 Promotör breakdown modal açılıyor - survey_id:', numericSurveyId);
        console.log('🔍 Survey select değeri:', surveySelect.value);
        console.log('🔍 Numeric survey ID:', numericSurveyId);
        
        // Modal HTML'i oluştur
        const modalHtml = `
            <div class="modal fade" id="promoterBreakdownModal" tabindex="-1" style="z-index: 9999;">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-info text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-users me-2"></i>Promotör Dağılımı
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div id="promoter-breakdown-content">
                                <div class="text-center py-4">
                                    <div class="spinner-border text-info" role="status"></div>
                                    <p class="mt-2">Yükleniyor...</p>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-success" onclick="exportPromoterBreakdown()">
                                <i class="fas fa-file-excel me-2"></i>Excel İndir
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>
                        </div>
                    </div>
                </div>
            </div>`;
        
        // Eski modal'ı kaldır
        const oldModal = document.getElementById('promoterBreakdownModal');
        if (oldModal) {
            oldModal.remove();
        }
        
        // Yeni modal'ı ekle
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Modal'ı göster
        const modal = new bootstrap.Modal(document.getElementById('promoterBreakdownModal'));
        modal.show();
        
        // Modal render edildikten sonra güvenle yükle
        runAfterModalRendered('promoter-breakdown-content', () => {
            loadPromoterBreakdown(numericSurveyId);
        });
        
    } catch (error) {
        console.error('❌ Promotör breakdown modal hatası:', error);
        showAlert('Modal açılırken hata oluştu!', 'danger');
    }
};

// Yatırım alanı KPI kartına tıklama
window.showInvestmentBreakdownModal = function() {
    try {
        // 🚀 KALICI ÇÖZÜM: Her zaman filtre seçimini kontrol et
        const surveySelect = document.getElementById('filter-survey');
        if (!surveySelect || !surveySelect.value) {
            showAlert('Lütfen önce bir anket seçin!', 'warning');
            return;
        }
        
        const surveyId = surveySelect.value;
        const numericSurveyId = parseInt(surveyId);
        
        console.log('🔍 Yatırım alanı breakdown modal açılıyor - survey_id:', numericSurveyId);
        console.log('🔍 Survey select değeri:', surveySelect.value);
        console.log('🔍 Numeric survey ID:', numericSurveyId);
        
        // Modal HTML'i oluştur
        const modalHtml = `
            <div class="modal fade" id="investmentBreakdownModal" tabindex="-1" style="z-index: 9999;">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-warning text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-store-alt me-2"></i>Yatırım Alanı Dağılımı
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div id="investment-breakdown-content">
                                <div class="text-center py-4">
                                    <div class="spinner-border text-warning" role="status"></div>
                                    <p class="mt-2">Yükleniyor...</p>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-success" onclick="exportInvestmentBreakdown()">
                                <i class="fas fa-file-excel me-2"></i>Excel İndir
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>
                        </div>
                    </div>
                </div>
            </div>`;
        
        // Eski modal'ı kaldır
        const oldModal = document.getElementById('investmentBreakdownModal');
        if (oldModal) {
            oldModal.remove();
        }
        
        // Yeni modal'ı ekle
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Modal'ı göster
        const modal = new bootstrap.Modal(document.getElementById('investmentBreakdownModal'));
        modal.show();
        
        // Modal render edildikten sonra güvenle yükle
        runAfterModalRendered('investment-breakdown-content', () => {
            loadInvestmentBreakdown(numericSurveyId);
        });
        
    } catch (error) {
        console.error('❌ Yatırım alanı breakdown modal hatası:', error);
        showAlert('Modal açılırken hata oluştu!', 'danger');
    }
};

// Sepet KPI kartına tıklama
window.showBasketBreakdownModal = function() {
    try {
        // 🚀 KALICI ÇÖZÜM: Her zaman filtre seçimini kontrol et
        const surveySelect = document.getElementById('filter-survey');
        if (!surveySelect || !surveySelect.value) {
            showAlert('Lütfen önce bir anket seçin!', 'warning');
            return;
        }
        
        const surveyId = surveySelect.value;
        const numericSurveyId = parseInt(surveyId);
        
        console.log('🔍 Sepet breakdown modal açılıyor - survey_id:', numericSurveyId);
        console.log('🔍 Survey select değeri:', surveySelect.value);
        console.log('🔍 Numeric survey ID:', numericSurveyId);
        
        // Modal HTML'i oluştur
        const modalHtml = `
            <div class="modal fade" id="basketBreakdownModal" tabindex="-1" style="z-index: 9999;">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-success text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-shopping-cart me-2"></i>Sepet Dağılımı
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div id="basket-breakdown-content">
                                <div class="text-center py-4">
                                    <div class="spinner-border text-success" role="status"></div>
                                    <p class="mt-2">Yükleniyor...</p>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-success" onclick="exportBasketBreakdown()">
                                <i class="fas fa-file-excel me-2"></i>Excel İndir
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>
                        </div>
                    </div>
                </div>
            </div>`;
        
        // Eski modal'ı kaldır
        const oldModal = document.getElementById('basketBreakdownModal');
        if (oldModal) {
            oldModal.remove();
        }
        
        // Yeni modal'ı ekle
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Modal'ı göster
        const modal = new bootstrap.Modal(document.getElementById('basketBreakdownModal'));
        modal.show();
        
        // Modal render edildikten sonra güvenle yükle
        runAfterModalRendered('basket-breakdown-content', () => {
            loadBasketBreakdown(numericSurveyId);
        });
        
    } catch (error) {
        console.error('❌ Sepet breakdown modal hatası:', error);
        showAlert('Modal açılırken hata oluştu!', 'danger');
    }
};

// Promotör breakdown verilerini yükle - BASİT VERSİYON
async function loadPromoterBreakdown(surveyId) {
    try {
        console.log('🔍 Promotör breakdown verileri yükleniyor - surveyId:', surveyId);
        
        // Promotör verilerini çek
        const { data: answers, error } = await supabase
            .from('survey_answers')
            .select(`
                answer_data,
                survey_responses(
                    stores(
                        id,
                        name,
                        channels(name),
                        regions(name)
                    )
                )
            `)
            .eq('survey_id', surveyId)
            .eq('question_type', 'promoter_count');
        
        if (error) throw error;
        
        // Marka bazında toplamları hesapla
        const brandTotals = {};
        let totalPromoters = 0;
        
        answers?.forEach(answer => {
            if (answer.answer_data?.brands) {
                answer.answer_data.brands.forEach(brand => {
                    if (brand.selected && brand.count > 0) {
                        const brandName = brand.brand_label || brand.brand;
                        if (!brandTotals[brandName]) {
                            brandTotals[brandName] = 0;
                        }
                        brandTotals[brandName] += parseInt(brand.count) || 0;
                        totalPromoters += parseInt(brand.count) || 0;
                    }
                });
            }
        });
        
        // HTML oluştur
        let html = `
            <div class="row mb-3">
                <div class="col-md-6">
                    <div class="card bg-info text-white">
                        <div class="card-body text-center">
                            <h3>${totalPromoters}</h3>
                            <p class="mb-0">Toplam Promotör</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card bg-primary text-white">
                        <div class="card-body text-center">
                            <h3>${Object.keys(brandTotals).length}</h3>
                            <p class="mb-0">Farklı Marka</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead class="table-dark">
                        <tr>
                            <th>Marka</th>
                            <th>Promotör Sayısı</th>
                            <th>Yüzde</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        // Markaları sırala (büyükten küçüğe)
        const sortedBrands = Object.entries(brandTotals).sort((a, b) => b[1] - a[1]);
        
        sortedBrands.forEach(([brandName, count]) => {
            const percentage = totalPromoters > 0 ? ((count / totalPromoters) * 100).toFixed(1) : 0;
            html += `
                <tr>
                    <td><strong>${brandName}</strong></td>
                    <td><span class="badge bg-info">${count}</span></td>
                    <td>${percentage}%</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        // DOM element güncelleme - BASİT VERSİYON
        const contentElement = document.getElementById('promoter-breakdown-content');
        if (contentElement) {
            contentElement.innerHTML = html;
            console.log('✅ Promotör breakdown verileri yüklendi');
        } else {
            console.error('❌ DOM element bulunamadı: promoter-breakdown-content');
        }
    } catch (error) {
        console.error('❌ Promotör breakdown yükleme hatası:', error);
        document.getElementById('promoter-breakdown-content').innerHTML = 
            '<div class="alert alert-danger">Veriler yüklenirken hata oluştu!</div>';
    }
}

// Yatırım alanı breakdown verilerini yükle - BASİT VERSİYON
async function loadInvestmentBreakdown(surveyId) {
    try {
        console.log('🔍 Yatırım alanı breakdown verileri yükleniyor - surveyId:', surveyId);
        
        // Yatırım alanı verilerini çek
        const { data: answers, error } = await supabase
            .from('survey_answers')
            .select(`
                answer_data,
                survey_responses(
                    stores(
                        id,
                        name,
                        channels(name),
                        regions(name)
                    )
                )
            `)
            .eq('survey_id', surveyId)
            .eq('question_type', 'investment_area');
        
        if (error) throw error;
        
        // Alan tipi ve marka bazında toplamları hesapla
        const areaTypeTotals = {};
        const brandTotals = {};
        let totalAreas = 0;
        
        answers?.forEach(answer => {
            if (answer.answer_data?.areas) {
                answer.answer_data.areas.forEach(area => {
                    totalAreas++;
                    
                    // Alan tipi toplamları
                    const areaType = getAreaTypeLabel(area.type);
                    if (!areaTypeTotals[areaType]) {
                        areaTypeTotals[areaType] = 0;
                    }
                    areaTypeTotals[areaType]++;
                    
                    // Marka toplamları
                    if (!brandTotals[area.brand]) {
                        brandTotals[area.brand] = 0;
                    }
                    brandTotals[area.brand]++;
                });
            }
        });
        
        // HTML oluştur
        let html = `
            <div class="row mb-3">
                <div class="col-md-4">
                    <div class="card bg-warning text-white">
                        <div class="card-body text-center">
                            <h3>${totalAreas}</h3>
                            <p class="mb-0">Toplam Alan</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-primary text-white">
                        <div class="card-body text-center">
                            <h3>${Object.keys(areaTypeTotals).length}</h3>
                            <p class="mb-0">Alan Tipi</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-info text-white">
                        <div class="card-body text-center">
                            <h3>${Object.keys(brandTotals).length}</h3>
                            <p class="mb-0">Farklı Marka</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <h5>Alan Tipi Dağılımı</h5>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Alan Tipi</th>
                                    <th>Sayı</th>
                                    <th>Yüzde</th>
                                </tr>
                            </thead>
                            <tbody>
        `;
        
        // Alan tiplerini sırala
        const sortedAreaTypes = Object.entries(areaTypeTotals).sort((a, b) => b[1] - a[1]);
        
        sortedAreaTypes.forEach(([areaType, count]) => {
            const percentage = totalAreas > 0 ? ((count / totalAreas) * 100).toFixed(1) : 0;
            html += `
                <tr>
                    <td>${areaType}</td>
                    <td><span class="badge bg-warning">${count}</span></td>
                    <td>${percentage}%</td>
                </tr>
            `;
        });
        
        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <h5>Marka Dağılımı</h5>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Marka</th>
                                    <th>Sayı</th>
                                    <th>Yüzde</th>
                                </tr>
                            </thead>
                            <tbody>
        `;
        
        // Markaları sırala
        const sortedBrands = Object.entries(brandTotals).sort((a, b) => b[1] - a[1]);
        
        sortedBrands.forEach(([brand, count]) => {
            const percentage = totalAreas > 0 ? ((count / totalAreas) * 100).toFixed(1) : 0;
            html += `
                <tr>
                    <td>${brand}</td>
                    <td><span class="badge bg-info">${count}</span></td>
                    <td>${percentage}%</td>
                </tr>
            `;
        });
        
        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // DOM element güncelleme - BASİT VERSİYON
        const contentElement = document.getElementById('investment-breakdown-content');
        if (contentElement) {
            contentElement.innerHTML = html;
            console.log('✅ Yatırım alanı breakdown verileri yüklendi');
        } else {
            console.error('❌ DOM element bulunamadı: investment-breakdown-content');
        }
    } catch (error) {
        console.error('❌ Yatırım alanı breakdown yükleme hatası:', error);
        document.getElementById('investment-breakdown-content').innerHTML = 
            '<div class="alert alert-danger">Veriler yüklenirken hata oluştu!</div>';
    }
}

// Sepet breakdown verilerini yükle - BASİT VERSİYON
async function loadBasketBreakdown(surveyId) {
    try {
        console.log('🔍 Sepet breakdown verileri yükleniyor - surveyId:', surveyId);
        
        // Sepet verilerini çek
        const { data: answers, error } = await supabase
            .from('survey_answers')
            .select(`
                answer_data,
                survey_responses(
                    stores(
                        id,
                        name,
                        channels(name),
                        regions(name)
                    )
                )
            `)
            .eq('survey_id', surveyId)
            .eq('question_type', 'basket_dynamic');
        
        if (error) throw error;
        
        // Sepet tipi ve üst grup bazında toplamları hesapla
        const basketTypeTotals = {};
        const upperGroupTotals = {};
        const brandTotals = {};
        let totalBaskets = 0;
        
        answers?.forEach(answer => {
            if (answer.answer_data?.data?.baskets) {
                answer.answer_data.data.baskets.forEach(basket => {
                    totalBaskets++;
                    
                    // Sepet tipi toplamları
                    const basketType = getBasketTypeLabel(basket.basket_type);
                    if (!basketTypeTotals[basketType]) {
                        basketTypeTotals[basketType] = 0;
                    }
                    basketTypeTotals[basketType]++;
                    
                    // Üst grup toplamları
                    const upperGroup = getUpperGroupLabel(basket.upper_group);
                    if (!upperGroupTotals[upperGroup]) {
                        upperGroupTotals[upperGroup] = 0;
                    }
                    upperGroupTotals[upperGroup]++;
                    
                    // Marka toplamları
                    if (!brandTotals[basket.brand]) {
                        brandTotals[basket.brand] = 0;
                    }
                    brandTotals[basket.brand]++;
                });
            }
        });
        
        // HTML oluştur
        let html = `
            <div class="row mb-3">
                <div class="col-md-3">
                    <div class="card bg-success text-white">
                        <div class="card-body text-center">
                            <h3>${totalBaskets}</h3>
                            <p class="mb-0">Toplam Sepet</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-primary text-white">
                        <div class="card-body text-center">
                            <h3>${Object.keys(basketTypeTotals).length}</h3>
                            <p class="mb-0">Sepet Tipi</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-info text-white">
                        <div class="card-body text-center">
                            <h3>${Object.keys(upperGroupTotals).length}</h3>
                            <p class="mb-0">Üst Grup</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-warning text-white">
                        <div class="card-body text-center">
                            <h3>${Object.keys(brandTotals).length}</h3>
                            <p class="mb-0">Farklı Marka</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-4">
                    <h5>Sepet Tipi Dağılımı</h5>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Sepet Tipi</th>
                                    <th>Sayı</th>
                                    <th>Yüzde</th>
                                </tr>
                            </thead>
                            <tbody>
        `;
        
        // Sepet tiplerini sırala
        const sortedBasketTypes = Object.entries(basketTypeTotals).sort((a, b) => b[1] - a[1]);
        
        sortedBasketTypes.forEach(([basketType, count]) => {
            const percentage = totalBaskets > 0 ? ((count / totalBaskets) * 100).toFixed(1) : 0;
            html += `
                <tr>
                    <td>${basketType}</td>
                    <td><span class="badge bg-success">${count}</span></td>
                    <td>${percentage}%</td>
                </tr>
            `;
        });
        
        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <h5>Üst Grup Dağılımı</h5>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Üst Grup</th>
                                    <th>Sayı</th>
                                    <th>Yüzde</th>
                                </tr>
                            </thead>
                            <tbody>
        `;
        
        // Üst grupları sırala
        const sortedUpperGroups = Object.entries(upperGroupTotals).sort((a, b) => b[1] - a[1]);
        
        sortedUpperGroups.forEach(([upperGroup, count]) => {
            const percentage = totalBaskets > 0 ? ((count / totalBaskets) * 100).toFixed(1) : 0;
            html += `
                <tr>
                    <td>${upperGroup}</td>
                    <td><span class="badge bg-info">${count}</span></td>
                    <td>${percentage}%</td>
                </tr>
            `;
        });
        
        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <h5>Marka Dağılımı</h5>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Marka</th>
                                    <th>Sayı</th>
                                    <th>Yüzde</th>
                                </tr>
                            </thead>
                            <tbody>
        `;
        
        // Markaları sırala
        const sortedBrands = Object.entries(brandTotals).sort((a, b) => b[1] - a[1]);
        
        sortedBrands.forEach(([brand, count]) => {
            const percentage = totalBaskets > 0 ? ((count / totalBaskets) * 100).toFixed(1) : 0;
            html += `
                <tr>
                    <td>${brand}</td>
                    <td><span class="badge bg-warning">${count}</span></td>
                    <td>${percentage}%</td>
                </tr>
            `;
        });
        
        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // DOM element güncelleme - BASİT VERSİYON
        const contentElement = document.getElementById('basket-breakdown-content');
        if (contentElement) {
            contentElement.innerHTML = html;
            console.log('✅ Sepet breakdown verileri yüklendi');
        } else {
            console.error('❌ DOM element bulunamadı: basket-breakdown-content');
        }
    } catch (error) {
        console.error('❌ Sepet breakdown yükleme hatası:', error);
        document.getElementById('basket-breakdown-content').innerHTML = 
            '<div class="alert alert-danger">Veriler yüklenirken hata oluştu!</div>';
    }
}

// Filtreleri uygula
function applyReportFilters() {
    // Şu anda açık olan raporu yeniden yükle
    if (currentReportType === 'promoter') {
        showPromoterReport();
    } else if (currentReportType === 'investment') {
        showInvestmentReport();
    } else if (currentReportType === 'basket') {
        showBasketReport();
    }
}

// Alert gösterme fonksiyonu
function showAlert(message, type) {
    // Bootstrap alert oluştur
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Sayfanın üstüne ekle
    const container = document.querySelector('.content-section');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        
        // 5 saniye sonra otomatik kapat
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

console.log('✅ Yeni Anket Raporları JS tamamen yüklendi');
