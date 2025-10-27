// ============================================
// ANKET RAPORLARI - MAĞAZA BAZLI ÖZET
// ============================================

console.log('Survey Reports Overview JS yüklendi');

// Global veriler
let surveyReportsData = {
    selectedSurvey: null,
    stores: [],
    completedStores: [],
    storeStatistics: {},
    allStatistics: {} // Filtrelenmemiş tüm istatistikler
};

// Filtreleri yükle
async function initializeSurveyReports() {
    console.log('📊 Survey Reports Overview başlatılıyor...');
    
    try {
        // Anket filtrelerini yükle
        await loadSurveyFilters();
        
        console.log('✅ Survey Reports Overview başlatıldı');
        
    } catch (error) {
        console.error('❌ Survey Reports Overview başlatma hatası:', error);
    }
}

// Anket filtrelerini yükle
async function loadSurveyFilters() {
    try {
        const { data: surveys, error } = await supabase
            .from('surveys')
            .select('id, title, month, year, status')
            .eq('status', 'active')
            .order('year', { ascending: false })
            .order('month', { ascending: false });
        
        if (error) throw error;
        
        const surveySelect = document.getElementById('filter-overview-survey');
        surveySelect.innerHTML = '<option value="">Anket Seçiniz</option>';
        
        surveys.forEach(survey => {
            const option = document.createElement('option');
            option.value = survey.id;
            option.textContent = `${survey.title} (${survey.month}/${survey.year})`;
            surveySelect.appendChild(option);
        });
        
        // Event listener ekle
        surveySelect.addEventListener('change', onSurveyFilterChange);
        
        // Durum filtresi için event listener ekle
        const statusFilter = document.getElementById('filter-overview-status');
        if (statusFilter) {
            statusFilter.addEventListener('change', applyStoreFilters);
        }
        
        console.log(`✅ ${surveys.length} anket yüklendi`);
        
    } catch (error) {
        console.error('❌ Anket filtreleri yükleme hatası:', error);
    }
}

// Anket filtresi değiştiğinde
async function onSurveyFilterChange(e) {
    const surveyId = e.target.value;
    
    if (!surveyId) {
        surveyReportsData.selectedSurvey = null;
        document.getElementById('completion-card').style.display = 'none';
        return;
    }
    
    surveyReportsData.selectedSurvey = surveyId;
    console.log('📊 Seçilen anket:', surveyId);
    
    // Mağaza özet raporunu yükle
    await loadStoreBasedReport();
}

// Mağaza bazlı raporu yükle
async function loadStoreBasedReport() {
    if (!surveyReportsData.selectedSurvey) {
        console.log('⚠️ Anket seçilmedi');
        return;
    }
    
    try {
        console.log('📊 Mağaza bazlı rapor yükleniyor...');
        
        // Anket atamalarını al
        let { data: assignments, error: assignError } = await supabase
            .from('survey_store_assignments')
            .select(`
                store_id,
                stores(id, name, channel_id, region_id, channels(name), regions(name))
            `)
            .eq('survey_id', surveyReportsData.selectedSurvey);
        
        if (assignError) {
            console.error('❌ Survey store assignments hatası:', assignError);
            // Hata varsa boş array olarak devam et
            assignments = [];
        } else {
            assignments = assignments || [];
        }
        
        console.log(`✅ ${assignments.length} mağaza ataması bulundu (survey_store_assignments)`);
        
        // Anket cevaplarını al
        const { data: responses, error: responseError } = await supabase
            .from('survey_responses')
            .select('id, store_id, status, user_id')
            .eq('survey_id', surveyReportsData.selectedSurvey);
        
        if (responseError) throw responseError;
        
        console.log(`✅ ${responses?.length || 0} anket cevabı yanıtı bulundu`);
        
        // Eğer hiç atama yoksa, TÜM mağazaları çek (böylece hangi mağazalar yapıp yapmadığını görebiliriz)
        if (!assignments || assignments.length === 0) {
            console.log('⚠️ survey_store_assignments boş, TÜM mağazalar alınıyor...');
            
            // Tüm mağazaları al (status filtresi yok çünkü stores tablosunda status alanı olmayabilir)
            const { data: allStores, error: storesError } = await supabase
                .from('stores')
                .select('id, name, channel_id, region_id, channels(name), regions(name)');
            
            if (!storesError && allStores) {
                // Assignment formatına çevir
                assignments = allStores.map(store => ({
                    store_id: store.id,
                    stores: store
                }));
                console.log(`✅ ${assignments.length} mağaza veritabanından alındı (TÜM aktif mağazalar)`);
            }
        }
        
        // Survey answers'dan detaylı verileri al
        let answers = [];
        if (responses && responses.length > 0) {
            const responseIds = responses.map(r => r.id).filter(id => id != null);
            if (responseIds.length > 0) {
                const { data, error: answersError } = await supabase
                    .from('survey_answers')
                    .select(`
                        response_id,
                        answer_data,
                        survey_responses(store_id, user_id)
                    `)
                    .in('response_id', responseIds);
                
                if (answersError) throw answersError;
                answers = data || [];
            }
        }
        
        console.log(`✅ ${answers.length} anket cevabı bulundu`);
        
        // Eğer hiç atama yoksa
        if (!assignments || assignments.length === 0) {
            const tbody = document.getElementById('store-based-report-tbody');
            tbody.innerHTML = '<tr><td colspan="11" class="text-center text-warning"><i class="fas fa-exclamation-triangle me-2"></i>Bu anket için mağaza ataması bulunamadı</td></tr>';
            document.getElementById('completion-card').style.display = 'none';
            console.log('⚠️ Bu anket için mağaza ataması yok');
            return;
        }
        
        // İstatistikleri hesapla
        const statistics = calculateStoreStatistics(assignments, responses, answers);
        
        // Tüm istatistikleri kaydet (filtreleme için)
        surveyReportsData.allStatistics = statistics;
        
        // Tabloyu oluştur
        applyStoreFilters();
        
    } catch (error) {
        console.error('❌ Mağaza bazlı rapor yükleme hatası:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });
        
        const errorMsg = error.message || 'Bilinmeyen hata';
        alert('Rapor yüklenirken hata oluştu: ' + errorMsg);
        
        // Hata mesajını tabloya da yaz
        const tbody = document.getElementById('store-based-report-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="11" class="text-center text-danger"><i class="fas fa-times-circle me-2"></i>Hata: ${errorMsg}</td></tr>`;
        }
    }
}

// Mağaza istatistiklerini hesapla
function calculateStoreStatistics(assignments, responses, answers) {
    const stats = {};
    
    if (!assignments || !Array.isArray(assignments)) {
        console.warn('⚠️ Assignments boş veya geçersiz');
        return stats;
    }
    
    assignments.forEach(assignment => {
        const storeId = assignment.store_id;
        const store = assignment.stores;
        
        // Mağazanın cevabı var mı?
        const storeResponse = (responses || []).find(r => r.store_id === storeId);
        const hasResponse = storeResponse != null;
        const isCompleted = storeResponse && storeResponse.status === 'completed';
        const isStarted = storeResponse && storeResponse.status === 'in_progress';
        const hasNotStarted = !hasResponse;
        
        // Mağazanın cevaplarını filtrele
        const storeAnswers = answers.filter(a => a.survey_responses?.store_id === storeId);
        
        // Yatırım alanı sayısı ve tipleri
        const investmentAreas = [];
        let investmentAreaCount = 0;
        
        // Sepet sayıları
        let largeBasketCount = 0;
        let regularBasketCount = 0;
        let totalBasketItems = 0;
        
        // Personel sayısı - anketin ilk sorusundan (promoter_count)
        let totalPersonnelCount = 0;
        
        // Store answers'dan verileri çıkar
        (storeAnswers || []).forEach(answer => {
            const data = answer.answer_data || {};
            
            // Promoter/Personel data - ilk sorudan (promoter_count)
            // data.brands array'inden toplam personel sayısını hesapla
            if (data.brands && Array.isArray(data.brands)) {
                data.brands.forEach(brand => {
                    totalPersonnelCount += parseInt(brand.count) || 0;
                });
            }
            
            // Investment area data
            if (data.data && data.data.areas) {
                data.data.areas.forEach(area => {
                    investmentAreas.push({
                        type: area.type || area.area_type || 'middle',
                        brand: area.brand
                    });
                    investmentAreaCount++;
                });
            }
            
            // Basket data - data.data.baskets'ten okumalıyız çünkü survey.js bu şekilde kaydediyor
            if (data.data && data.data.baskets && Array.isArray(data.data.baskets)) {
                data.data.baskets.forEach(basket => {
                    // Basket tipine göre sayım
                    if (basket.basket_type === 'large_basket' || basket.basket_type === 'large') {
                        largeBasketCount++;
                    } else if (basket.basket_type === 'basket' || basket.basket_type === 'regular') {
                        regularBasketCount++;
                    } else {
                        // Varsayılan olarak normal sepet
                        regularBasketCount++;
                    }
                    totalBasketItems++;
                });
            }
        });
        
        // Yatırım alanı tip kırılımı
        const investmentTypeBreakdown = {};
        investmentAreas.forEach(area => {
            investmentTypeBreakdown[area.type] = (investmentTypeBreakdown[area.type] || 0) + 1;
        });
        
        stats[storeId] = {
            store: store,
            isCompleted: isCompleted,
            isStarted: isStarted,
            hasNotStarted: hasNotStarted,
            investmentAreaCount: investmentAreaCount,
            investmentTypeBreakdown: investmentTypeBreakdown,
            largeBasketCount: largeBasketCount,
            regularBasketCount: regularBasketCount,
            totalBasketItems: totalBasketItems,
            personnelCount: totalPersonnelCount || 0,
            responseId: storeResponse?.id || null
        };
    });
    
    return stats;
}

// Filtreleri uygula
function applyStoreFilters() {
    const statusFilter = document.getElementById('filter-overview-status')?.value;
    let filteredStats = { ...surveyReportsData.allStatistics };
    
    // Durum filtresini uygula
    if (statusFilter) {
        Object.keys(filteredStats).forEach(storeId => {
            const stat = filteredStats[storeId];
            let shouldShow = false;
            
            switch(statusFilter) {
                case 'completed':
                    shouldShow = stat.isCompleted;
                    break;
                case 'started':
                    shouldShow = stat.isStarted;
                    break;
                case 'not_started':
                    shouldShow = stat.hasNotStarted;
                    break;
                default:
                    shouldShow = true;
            }
            
            if (!shouldShow) {
                delete filteredStats[storeId];
            }
        });
    }
    
    // Tabloyu render et
    renderStoreBasedTable(filteredStats);
}

// Tabloyu render et
function renderStoreBasedTable(statistics) {
    const tbody = document.getElementById('store-based-report-tbody');
    if (!tbody) {
        console.error('❌ store-based-report-tbody bulunamadı!');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (!statistics || Object.keys(statistics).length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted"><i class="fas fa-info-circle me-2"></i>Veri bulunamadı</td></tr>';
        return;
    }
    
    Object.values(statistics).forEach(stat => {
        const store = stat.store;
        
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${store.name || '-'}</td>
            <td>${store.channels?.name || '-'}</td>
            <td>${store.regions?.name || '-'}</td>
            <td>${
                stat.isCompleted ? '<span class="badge bg-success">Tamamlandı</span>' :
                stat.isStarted ? '<span class="badge bg-warning">Başladı</span>' :
                '<span class="badge bg-secondary">Başlamadı</span>'
            }</td>
            <td>${stat.investmentTypeBreakdown['wall'] || 0}</td>
            <td>${stat.investmentTypeBreakdown['middle'] || 0}</td>
            <td>${stat.investmentTypeBreakdown['tabletop'] || 0}</td>
            <td>${stat.personnelCount}</td>
            <td>${stat.largeBasketCount}</td>
            <td>${stat.regularBasketCount}</td>
            <td>
                ${stat.isCompleted && stat.responseId ? 
                    `<button class="btn btn-sm btn-warning" onclick="rejectStoreSurvey('${stat.responseId}', '${store.name}')" title="Geri Gönder">
                        <i class="fas fa-undo"></i> Geri Gönder
                    </button>` : 
                    '<span class="text-muted">-</span>'}
            </td>
        `;
    });
    
    // Tamamlanma oranını hesapla (tüm istatistiklerden, filtrelenmiş olanlar değil)
    const allStats = surveyReportsData.allStatistics || {};
    const totalStores = Object.keys(allStats).length;
    const completedStores = Object.values(allStats).filter(s => s.isCompleted).length;
    const startedStores = Object.values(allStats).filter(s => s.isStarted && !s.isCompleted).length;
    const notStartedStores = Object.values(allStats).filter(s => s.hasNotStarted).length;
    const completionRate = totalStores > 0 ? ((completedStores / totalStores) * 100).toFixed(1) : 0;
    
    // KPI'ları güncelle
    document.getElementById('completion-rate').textContent = `${completionRate}% (${completedStores}/${totalStores})`;
    document.getElementById('total-assigned-stores').textContent = totalStores;
    document.getElementById('total-completed-stores').textContent = completedStores;
    document.getElementById('total-pending-stores').textContent = startedStores + notStartedStores;
    
    // Tamamlanma kartını göster
    document.getElementById('completion-card').style.display = 'block';
    
    console.log(`✅ Tablo render edildi: ${totalStores} mağaza`);
}

// Yatırım alanı tip adını al
function getInvestmentTypeName(type) {
    const names = {
        'wall': 'Duvar',
        'middle': 'Orta Alan',
        'desk': 'Masa Üstü',
        'tabletop': 'Masa Üstü',
        'other': 'Diğer'
    };
    return names[type] || type;
}

// Mağaza anketini geri gönder
async function rejectStoreSurvey(responseId, storeName) {
    if (!responseId || !storeName) {
        alert('❌ Veri eksik!');
        return;
    }
    
    const confirmReject = confirm(
        `"${storeName}" mağazasının anketini geri göndermek istediğinizden emin misiniz?\n\n` +
        `Bu işlem:\n` +
        `• Anket cevaplarını silecek\n` +
        `• Anket durumunu "bekliyor" olarak değiştirecek\n` +
        `• Mağaza tekrar anket girebilecek\n\n` +
        `Bu işlem geri alınamaz!`
    );
    
    if (!confirmReject) return;
    
    try {
        console.log('🔄 Mağaza anketi geri gönderiliyor:', responseId, storeName);
        
        // 1. Anket cevaplarını sil
        console.log('📝 Anket cevapları siliniyor...');
        const { error: answersError } = await supabase
            .from('survey_answers')
            .delete()
            .eq('response_id', responseId);
        
        if (answersError) {
            console.error('Anket cevapları silme hatası:', answersError);
            throw answersError;
        }
        console.log('✅ Anket cevapları başarıyla silindi');
        
        // 2. Anket durumunu "in_progress" olarak değiştir (veriyi silme, sadece durumu değiştir)
        console.log('🔄 Anket durumu güncelleniyor...');
        const { error: updateError } = await supabase
            .from('survey_responses')
            .update({ 
                status: 'in_progress',
                submitted_at: null
            })
            .eq('id', responseId);
        
        if (updateError) {
            console.error('Anket durumu güncelleme hatası:', updateError);
            throw updateError;
        }
        console.log('✅ Anket durumu "in_progress" olarak güncellendi');
        
        alert(`✅ "${storeName}" mağazasının anketi başarıyla geri gönderildi!\n\nMağaza tekrar anket girebilir.`);
        
        // Raporu yenile
        loadStoreBasedReport();
        
    } catch (error) {
        console.error('❌ Mağaza anketi geri gönderme hatası:', error);
        alert('❌ Mağaza anketi geri gönderilirken hata oluştu: ' + error.message);
    }
}

// Excel'e export
function exportStoreBasedReport() {
    console.log('📊 Excel export - TODO');
    alert('Excel export fonksiyonu yakında eklenecek');
}

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('survey-reports-section')) {
        initializeSurveyReports();
    }
});

console.log('✅ Survey Reports Overview JS hazır');

