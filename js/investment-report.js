/**
 * Yatırım Alanı Raporu JavaScript - Tamamen Yeniden Yazıldı
 * Filtreler ve grafikler düzgün çalışacak şekilde optimize edildi
 */

let investmentReportData = {
    surveys: [],
    stores: [],
    regions: [],
    channels: [],
    brands: [],
    areasAnalysis: [],
    currentFilters: {
        surveys: [],
        region: '',
        channel: '',
        store: '',
        brand: []
    },
    filteredData: [],
    currentPage: 1,
    itemsPerPage: 25
};

// Sayfa yüklendiğinde çalışacak ana fonksiyon
async function initializeInvestmentReport() {
    let loadingId = null;
    try {
        console.log('🚀 Yatırım Alanı Raporu başlatılıyor...');
        
        // Loading başlat
        loadingId = showLoading('Yatırım Alanı Raporu Yükleniyor', 'Veriler hazırlanıyor...');
        
        // Verileri yükle
        updateLoading(loadingId, 'Veriler Yükleniyor', 'Anket ve mağaza verileri çekiliyor...');
        await loadInvestmentReportData();
        
        // Event listener'ları kur
        updateLoading(loadingId, 'Sistem Hazırlanıyor', 'Filtreler ve grafikler ayarlanıyor...');
        setupEventListeners();
        
        // Filtreleri uygula
        updateLoading(loadingId, 'Son Hazırlıklar', 'Filtreler uygulanıyor...');
        await applyFilters();
        
        console.log('✅ Yatırım Alanı Raporu başarıyla başlatıldı');
    } catch (error) {
        console.error('❌ Yatırım Alanı Raporu başlatma hatası:', error);
        showAlert('Yatırım Alanı Raporu başlatılırken hata oluştu', 'error');
    } finally {
        // Loading'i kapat
        if (loadingId) {
            hideLoading(loadingId);
        }
    }
}

// Tüm verileri yükle
async function loadInvestmentReportData() {
    console.log('📊 Yatırım Alanı Raporu verileri yükleniyor...');
    
    try {
        // Paralel olarak tüm verileri yükle
        const [surveysResult, storesResult, regionsResult, channelsResult, brandsResult] = await Promise.all([
            supabase.from('surveys').select('*').order('created_at', { ascending: false }),
            supabase.from('stores').select('*').order('name'),
            supabase.from('regions').select('*').order('name'),
            supabase.from('channels').select('*').order('name'),
            supabase.from('brands').select('name').eq('status', 'active').order('name')
        ]);

        if (surveysResult.error) throw surveysResult.error;
        if (storesResult.error) throw storesResult.error;
        if (regionsResult.error) throw regionsResult.error;
        if (channelsResult.error) throw channelsResult.error;
        if (brandsResult.error) throw brandsResult.error;

        investmentReportData.surveys = surveysResult.data;
        investmentReportData.stores = storesResult.data;
        investmentReportData.regions = regionsResult.data;
        investmentReportData.channels = channelsResult.data;
        investmentReportData.brands = brandsResult.data.map(b => b.name);

        // Aktif anketleri belirle (survey_store_assignments tablosunda ataması olan anketler)
        const { data: assignments, error: assignmentError } = await supabase
            .from('survey_store_assignments')
            .select('survey_id')
            .order('survey_id');
        
        if (assignmentError) {
            console.warn('Survey assignments yüklenemedi:', assignmentError);
            console.log('⚠️ Tüm anketler gösterilecek (atama tablosu hatası)');
        } else {
            const activeSurveyIds = [...new Set(assignments.map(a => a.survey_id))];
            console.log('🔍 Toplam atama sayısı:', activeSurveyIds.length);
            console.log('🔍 Aktif anket ID\'leri:', activeSurveyIds);
            
            // Tüm anketleri göster (ataması olan + olmayan, sadece status = 'active' olan)
            investmentReportData.surveys = investmentReportData.surveys.filter(survey => 
                survey.status === 'active'
            );
            
            console.log('🔍 Aktif anketler filtrelendi:', investmentReportData.surveys.length, 'anket');
            console.log('🔍 Anket başlıkları:', investmentReportData.surveys.map(s => s.title).join(', '));
        }

        console.log('📋 Anketler yüklendi:', investmentReportData.surveys.length);
        console.log('🏪 Mağazalar yüklendi:', investmentReportData.stores.length);
        console.log('🏷️ Bölgeler yüklendi:', investmentReportData.regions.length);
        console.log('🏷️ Kanallar yüklendi:', investmentReportData.channels.length);
        console.log('🏷️ Markalar yüklendi:', investmentReportData.brands.length);
        
        // Debug: Anket detaylarını logla
        if (investmentReportData.surveys.length > 0) {
            console.log('📋 İlk anket:', investmentReportData.surveys[0]);
        } else {
            console.warn('⚠️ Hiç aktif anket bulunamadı!');
        }

        // Survey answers verilerini çek ve işle
        await loadSurveyAnswersData();

        // Filtreleri doldur
        populateFilters();
        
        console.log('✅ Veriler yüklendi:', investmentReportData.surveys.length, 'anket,', investmentReportData.stores.length, 'mağaza');
    } catch (error) {
        console.error('❌ Veri yükleme hatası:', error);
        showAlert('Veri yüklenirken hata oluştu: ' + error.message, 'error');
    }
}

// Survey answers verilerini yükle
async function loadSurveyAnswersData() {
    console.log('📊 Survey answers verileri yükleniyor...');
    
    try {
        const { data, error } = await supabase
            .from('survey_answers')
            .select('*, survey_responses(survey_id, store_id)')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        console.log('📊 Survey answers verisi yüklendi:', data.length, 'kayıt');

        // Areas verilerini işle
        const areasData = data.filter(item => {
            try {
                let answerData;
                if (typeof item.answer_data === 'string') {
                    answerData = JSON.parse(item.answer_data);
                } else {
                    answerData = item.answer_data;
                }
                return answerData && answerData.areas && Array.isArray(answerData.areas) && answerData.areas.length > 0;
            } catch (e) {
                return false;
            }
        });

        console.log('📊 Areas verisi filtrelendi:', areasData.length, 'kayıt');

        const areasAnalysis = areasData.map(item => {
            let answerData;
            try {
                answerData = typeof item.answer_data === 'string' ? 
                    JSON.parse(item.answer_data) : item.answer_data;
            } catch (e) {
                return null;
            }
            
            // survey_response_id'yi kontrol et
            let surveyResponseId = item.survey_response_id || item.response_id;
            if (!surveyResponseId) {
                console.log('⚠️ survey_response_id bulunamadı, item:', item);
                surveyResponseId = null;
            }
            
            // survey_id'yi survey_responses'dan al
            let surveyId = null;
            if (item.survey_responses && item.survey_responses.survey_id) {
                surveyId = item.survey_responses.survey_id;
            } else if (item.survey_id) {
                surveyId = item.survey_id;
            }
            
            // store_id'yi survey_responses'dan al
            let storeId = null;
            if (item.survey_responses && item.survey_responses.store_id) {
                storeId = item.survey_responses.store_id;
            }
            
            return {
                id: item.id,
                survey_response_id: surveyResponseId,
                survey_id: surveyId,
                store_id: storeId,
                areas_count: answerData.areas.length,
                areas: answerData.areas.map(area => ({
                    brand: area.brand,
                    area_type: area.area_type || area.type || (area.photos && area.photos.length > 0 ? 'wall' : 'middle'),
                    photos: area.photos || [],
                    photos_count: area.photos ? area.photos.length : 0
                }))
            };
        }).filter(Boolean);

        investmentReportData.areasAnalysis = areasAnalysis;
        console.log('✅ Areas analizi tamamlandı:', areasAnalysis.length, 'item');
        
        if (areasAnalysis.length === 0) {
            console.log('⚠️ Hiç veri yok, filtreler çalışmayacak');
        }
        
    } catch (error) {
        console.error('❌ Survey answers yükleme hatası:', error);
        showAlert('Survey answers yüklenirken hata oluştu: ' + error.message, 'error');
    }
}

// Filtreleri doldur
function populateFilters() {
    console.log('🔧 Filtreler dolduruluyor...');
    
    // Anket seçimi
    const surveySelect = document.getElementById('filter-surveys-multi');
    if (surveySelect) {
        surveySelect.innerHTML = '<option value="">Tüm Anketler</option>';
        investmentReportData.surveys.forEach(survey => {
            const option = document.createElement('option');
            option.value = survey.id;
            option.textContent = survey.title || `Anket ${survey.id}`;
            surveySelect.appendChild(option);
        });
        console.log('✅ Anket filtresi dolduruldu:', investmentReportData.surveys.length, 'anket');
    } else {
        console.error('❌ filter-surveys-multi elementi bulunamadı!');
    }

    // Bölge seçimi
    const regionSelect = document.getElementById('filter-region');
    if (regionSelect) {
        regionSelect.innerHTML = '<option value="">Tüm Bölgeler</option>';
        investmentReportData.regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region.id;
            option.textContent = region.name;
            regionSelect.appendChild(option);
        });
        console.log('✅ Bölge filtresi dolduruldu:', investmentReportData.regions.length, 'bölge');
    }

    // Kanal seçimi
    const channelSelect = document.getElementById('filter-channel');
    if (channelSelect) {
        channelSelect.innerHTML = '<option value="">Tüm Kanallar</option>';
        investmentReportData.channels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel.id;
            option.textContent = channel.name;
            channelSelect.appendChild(option);
        });
        console.log('✅ Kanal filtresi dolduruldu:', investmentReportData.channels.length, 'kanal');
    }

    // Mağaza seçimi
    const storeSelect = document.getElementById('filter-store');
    if (storeSelect) {
        storeSelect.innerHTML = '<option value="">Tüm Mağazalar</option>';
        investmentReportData.stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.name;
            storeSelect.appendChild(option);
        });
        console.log('✅ Mağaza filtresi dolduruldu:', investmentReportData.stores.length, 'mağaza');
    }

    // Marka seçimi
    const brandSelect = document.getElementById('filter-brand');
    if (brandSelect) {
        brandSelect.innerHTML = '<option value="">Tüm Markalar</option>';
        investmentReportData.brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            brandSelect.appendChild(option);
        });
        console.log('✅ Marka filtresi dolduruldu:', investmentReportData.brands.length, 'marka');
    }
}

// Event listener'ları kur
function setupEventListeners() {
    console.log('🔧 Event listener\'lar kuruluyor...');
    
    // Filtre değişikliklerini dinle
    document.getElementById('filter-surveys-multi')?.addEventListener('change', applyFilters);
    document.getElementById('filter-region')?.addEventListener('change', applyFilters);
    document.getElementById('filter-channel')?.addEventListener('change', applyFilters);
    document.getElementById('filter-store')?.addEventListener('change', applyFilters);
    document.getElementById('filter-brand')?.addEventListener('change', applyFilters);
    document.getElementById('filter-area-type')?.addEventListener('change', applyFilters);
    
    // Arama kutusu
    document.getElementById('investment-store-search')?.addEventListener('input', updateStoreTable);
    
    // Filtreleri temizle butonu
    document.getElementById('clear-filters')?.addEventListener('click', () => {
        // Tüm filtreleri sıfırla
        document.getElementById('filter-surveys-multi').selectedIndex = 0;
        document.getElementById('filter-region').selectedIndex = 0;
        document.getElementById('filter-channel').selectedIndex = 0;
        document.getElementById('filter-store').selectedIndex = 0;
        document.getElementById('filter-brand').selectedIndex = 0;
        document.getElementById('filter-area-type').selectedIndex = 0;
        
        // Filtreleri uygula
        applyFilters();
    });
    
    // Sunum oluştur butonu
    document.getElementById('create-presentation-btn')?.addEventListener('click', createPresentation);
    
    // Excel export butonu
    document.getElementById('export-investment-report')?.addEventListener('click', exportInvestmentToExcel);
    
    // Yenile butonu
    document.getElementById('refresh-investment-report')?.addEventListener('click', async () => {
        console.log('🔄 Yatırım raporu yenileniyor...');
        await initializeInvestmentReport();
    });
    
    console.log('✅ Event listener\'lar kuruldu');
}

// Filtreleri uygula
async function applyFilters() {
    let loadingId = null;
    try {
        console.log('🔍 Filtreler uygulanıyor...');
        
        // Loading başlat
        loadingId = showLoading('Filtreler Uygulanıyor', 'Veriler filtreleniyor...');
        
        // Filtre değerlerini güncelle
        updateLoading(loadingId, 'Filtreler Uygulanıyor', 'Filtre değerleri güncelleniyor...');
        updateFilterValues();
        
        console.log('🔍 Aktif filtreler:', investmentReportData.currentFilters);
        
        // Filtrelenmiş veriyi yükle
        updateLoading(loadingId, 'Filtreler Uygulanıyor', 'Veriler filtreleniyor...');
        await loadFilteredInvestmentData();
        
        // Grafikleri güncelle
        updateLoading(loadingId, 'Filtreler Uygulanıyor', 'Grafikler güncelleniyor...');
        updateCharts();
        
        // Mağaza tablosunu güncelle
        updateLoading(loadingId, 'Filtreler Uygulanıyor', 'Tablo güncelleniyor...');
        updateStoreTable();
        
        console.log('✅ Filtreler başarıyla uygulandı');
    } catch (error) {
        console.error('❌ Filtre uygulama hatası:', error);
        showAlert('Filtreler uygulanırken hata oluştu: ' + error.message, 'error');
    } finally {
        // Loading'i kapat
        if (loadingId) {
            hideLoading(loadingId);
        }
    }
}

// Filtre değerlerini güncelle
function updateFilterValues() {
    console.log('🔄 Filtre değerleri güncelleniyor...');
    
    const surveySelect = document.getElementById('filter-surveys-multi');
    const regionSelect = document.getElementById('filter-region');
    const channelSelect = document.getElementById('filter-channel');
    const storeSelect = document.getElementById('filter-store');
    const brandSelect = document.getElementById('filter-brand');
    const areaTypeSelect = document.getElementById('filter-area-type');
    
    investmentReportData.currentFilters.surveys = Array.from(surveySelect?.selectedOptions || [])
        .map(opt => opt.value)
        .filter(value => value !== '');
    investmentReportData.currentFilters.region = regionSelect?.value || '';
    investmentReportData.currentFilters.channel = channelSelect?.value || '';
    investmentReportData.currentFilters.store = storeSelect?.value || '';
    investmentReportData.currentFilters.brand = Array.from(brandSelect?.selectedOptions || [])
        .map(opt => opt.value)
        .filter(value => value !== '');
    investmentReportData.currentFilters.areaType = areaTypeSelect?.value || '';
    
    console.log('📋 Güncel filtreler:', investmentReportData.currentFilters);
}

// Filtrelenmiş veriyi yükle
async function loadFilteredInvestmentData() {
    console.log('📊 Filtrelenmiş yatırım verileri yükleniyor...');
    
    try {
        // Areas analizi verilerini kullan
        let filteredData = [...(investmentReportData.areasAnalysis || [])];
        
        console.log('🔍 Filtreleme başlıyor, toplam veri:', filteredData.length);
        
        // Eğer veri yoksa, boş veri döndür
        if (filteredData.length === 0) {
            console.warn('⚠️ Hiç veri yok, filtreleme yapılamıyor');
            investmentReportData.filteredData = [];
            return;
        }
        
        // Anket filtresi
        if (investmentReportData.currentFilters.surveys.length > 0) {
            const originalLength = filteredData.length;
            filteredData = filteredData.filter(item => {
                const surveyId = item.survey_id?.toString();
                return investmentReportData.currentFilters.surveys.includes(surveyId);
            });
            console.log(`🔍 Anket filtresi: ${originalLength} → ${filteredData.length}`);
        }
        
        // Marka filtresi
        if (investmentReportData.currentFilters.brand.length > 0) {
            const originalLength = filteredData.length;
            console.log('🔍 Marka filtresi uygulanıyor:', investmentReportData.currentFilters.brand);
            filteredData = filteredData.filter(item => {
                const hasMatchingBrand = item.areas.some(area => 
                    investmentReportData.currentFilters.brand.includes(area.brand)
                );
                console.log(`🔍 Item ${item.id} marka kontrolü:`, item.areas.map(a => a.brand), '→', hasMatchingBrand);
                return hasMatchingBrand;
            });
            console.log(`🔍 Marka filtresi: ${originalLength} → ${filteredData.length}`);
        }
        
        // Alan Tipi filtresi
        if (investmentReportData.currentFilters.areaType) {
            const originalLength = filteredData.length;
            console.log('🔍 Alan Tipi filtresi uygulanıyor:', investmentReportData.currentFilters.areaType);
            filteredData = filteredData.filter(item => {
                const hasMatchingAreaType = item.areas.some(area => {
                    const areaType = area.area_type || area.areaType || 'wall'; // Default to wall if undefined
                    return areaType === investmentReportData.currentFilters.areaType;
                });
                console.log(`🔍 Item ${item.id} alan tipi kontrolü:`, item.areas.map(a => a.area_type || a.areaType), '→', hasMatchingAreaType);
                return hasMatchingAreaType;
            });
            console.log(`🔍 Alan Tipi filtresi: ${originalLength} → ${filteredData.length}`);
        }
        
        // Bölge filtresi
        if (investmentReportData.currentFilters.region) {
            const originalLength = filteredData.length;
            console.log('🔍 Bölge filtresi uygulanıyor:', investmentReportData.currentFilters.region);
            filteredData = filteredData.filter(item => {
                const storeId = item.store_id;
                const store = investmentReportData.stores.find(s => s.id === storeId);
                const isMatch = store && store.region_id == investmentReportData.currentFilters.region;
                console.log(`🔍 Item ${item.id} bölge kontrolü: store ${storeId}, region ${store?.region_id}, match: ${isMatch}`);
                return isMatch;
            });
            console.log(`🔍 Bölge filtresi: ${originalLength} → ${filteredData.length}`);
        }
        
        // Kanal filtresi
        if (investmentReportData.currentFilters.channel) {
            const originalLength = filteredData.length;
            console.log('🔍 Kanal filtresi uygulanıyor:', investmentReportData.currentFilters.channel);
            filteredData = filteredData.filter(item => {
                const storeId = item.store_id;
                const store = investmentReportData.stores.find(s => s.id === storeId);
                const isMatch = store && store.channel_id == investmentReportData.currentFilters.channel;
                console.log(`🔍 Item ${item.id} kanal kontrolü: store ${storeId}, channel ${store?.channel_id}, match: ${isMatch}`);
                return isMatch;
            });
            console.log(`🔍 Kanal filtresi: ${originalLength} → ${filteredData.length}`);
        }
        
        // Mağaza filtresi
        if (investmentReportData.currentFilters.store) {
            const originalLength = filteredData.length;
            filteredData = filteredData.filter(item => {
                return item.store_id == investmentReportData.currentFilters.store;
            });
            console.log(`🔍 Mağaza filtresi: ${originalLength} → ${filteredData.length}`);
        }
        
        investmentReportData.filteredData = filteredData;
        console.log('✅', filteredData.length, 'filtreli kayıt yüklendi');
        
    } catch (error) {
        console.error('❌ Filtreleme hatası:', error);
        investmentReportData.filteredData = [];
    }
}

// Grafikleri güncelle
function updateCharts() {
    console.log('📊 Grafikler güncelleniyor...');
    
    const data = investmentReportData.filteredData || [];
    console.log('📊 Grafikler için kullanılan veri:', data.length, 'kayıt');
    
    // Filtrelerin uygulanıp uygulanmadığını kontrol et
    const hasActiveFilters = investmentReportData.currentFilters && (
        investmentReportData.currentFilters.surveys.length > 0 ||
        investmentReportData.currentFilters.brand.length > 0 ||
        investmentReportData.currentFilters.region ||
        investmentReportData.currentFilters.channel ||
        investmentReportData.currentFilters.store ||
        investmentReportData.currentFilters.areaType
    );
    
    console.log('🔍 Aktif filtreler var mı:', hasActiveFilters);
    console.log('🔍 Current filters:', investmentReportData.currentFilters);
    console.log('🔍 Data length:', data.length);
    console.log('🔍 hasActiveFilters && data.length === 0:', hasActiveFilters && data.length === 0);
    
    // Eğer filtreler uygulanmışsa ve filtrelenmiş veri yoksa, grafikleri boş göster
        if (hasActiveFilters && data.length === 0) {
            console.log('⚠️ Filtreler uygulanmış ama veri yok, grafikleri boş gösteriliyor...');
            console.log('🔍 showInvestmentNoDataCharts() çağrılıyor...');
            showInvestmentNoDataCharts();
            console.log('🔍 showInvestmentNoDataCharts() çağrısı tamamlandı');
            return;
        }
    
    // Eğer hiç veri yoksa, grafikleri boş göster
    if (data.length === 0) {
        console.log('⚠️ Hiç veri yok, grafikleri boş gösteriliyor...');
        showEmptyCharts();
        return;
    }
    
    // Alan tipi dağılımı grafiği
    updateAreaTypeChart(data);
    
    // Marka bazlı yatırım analizi grafiği
    updateBrandAnalysisChart(data);
    
    // Marka yüzdesel dağılımı grafiği
    updateInvestmentBrandPercentageChart(data);
    
    // Trend analizi grafiği
    updateTrendAnalysisChart(data);
    
    console.log('✅ Grafikler güncellendi');
}

// Boş grafikleri göster
function showEmptyCharts() {
    try {
        console.log('🔍 Boş grafikler gösteriliyor...');
        
        // Önceki Chart.js grafiklerini temizle
        if (window.areaTypeChart) {
            window.areaTypeChart.destroy();
            window.areaTypeChart = null;
        }
        if (window.brandAnalysisChart) {
            window.brandAnalysisChart.destroy();
            window.brandAnalysisChart = null;
        }
        if (window.brandPercentageChart) {
            window.brandPercentageChart.destroy();
            window.brandPercentageChart = null;
        }
        if (window.trendAnalysisChart) {
            window.trendAnalysisChart.destroy();
            window.trendAnalysisChart = null;
        }
        
        // Alan tipi dağılımı grafiği
        const areaTypeCanvas = document.getElementById('area-type-chart');
        if (areaTypeCanvas) {
            const ctx = areaTypeCanvas.getContext('2d');
            ctx.clearRect(0, 0, areaTypeCanvas.width, areaTypeCanvas.height);
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Filtreleri uygulayın', areaTypeCanvas.width / 2, areaTypeCanvas.height / 2);
        }
        
        // Marka bazlı yatırım analizi grafiği
        const brandAnalysisCanvas = document.getElementById('brand-analysis-chart');
        if (brandAnalysisCanvas) {
            const ctx = brandAnalysisCanvas.getContext('2d');
            ctx.clearRect(0, 0, brandAnalysisCanvas.width, brandAnalysisCanvas.height);
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Filtreleri uygulayın', brandAnalysisCanvas.width / 2, brandAnalysisCanvas.height / 2);
        }
        
        // Marka yüzdesel dağılımı grafiği
        const brandPercentageCanvas = document.getElementById('brand-percentage-chart');
        if (brandPercentageCanvas) {
            const ctx = brandPercentageCanvas.getContext('2d');
            ctx.clearRect(0, 0, brandPercentageCanvas.width, brandPercentageCanvas.height);
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Filtreleri uygulayın', brandPercentageCanvas.width / 2, brandPercentageCanvas.height / 2);
        }
        
        // Trend analizi grafiği
        const trendAnalysisCanvas = document.getElementById('trend-analysis-chart');
        if (trendAnalysisCanvas) {
            const ctx = trendAnalysisCanvas.getContext('2d');
            ctx.clearRect(0, 0, trendAnalysisCanvas.width, trendAnalysisCanvas.height);
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Filtreleri uygulayın', trendAnalysisCanvas.width / 2, trendAnalysisCanvas.height / 2);
        }
        
        console.log('✅ Boş grafikler gösterildi');
        
    } catch (error) {
        console.error('❌ Boş grafikler gösterme hatası:', error);
    }
}

// Veri bulunamadı grafiklerini göster
function showInvestmentNoDataCharts() {
    console.log('🔍 showInvestmentNoDataCharts fonksiyonu başladı');
    
    try {
        console.log('🔍 Veri bulunamadı grafikleri gösteriliyor...');
        
        // Önceki Chart.js grafiklerini temizle
        if (window.areaTypeChart) {
            console.log('🔍 areaTypeChart temizleniyor...');
            window.areaTypeChart.destroy();
            window.areaTypeChart = null;
        }
        if (window.brandAnalysisChart) {
            console.log('🔍 brandAnalysisChart temizleniyor...');
            window.brandAnalysisChart.destroy();
            window.brandAnalysisChart = null;
        }
        if (window.brandPercentageChart) {
            console.log('🔍 brandPercentageChart temizleniyor...');
            window.brandPercentageChart.destroy();
            window.brandPercentageChart = null;
        }
        if (window.trendAnalysisChart) {
            console.log('🔍 trendAnalysisChart temizleniyor...');
            window.trendAnalysisChart.destroy();
            window.trendAnalysisChart = null;
        }
        
        console.log('🔍 Canvas mesajları yazılıyor...');
        
        // Tüm canvas'lara mesaj yaz
        const canvasIds = ['area-type-chart', 'brand-analysis-chart', 'brand-percentage-chart', 'trend-analysis-chart'];
        
        canvasIds.forEach(canvasId => {
            const canvas = document.getElementById(canvasId);
            console.log(`🔍 ${canvasId} canvas:`, canvas);
            
            if (canvas) {
                console.log(`🔍 ${canvasId} canvas bulundu`);
                
                // Canvas boyutlarını kontrol et
                console.log(`🔍 ${canvasId} Canvas boyutları:`, canvas.width, 'x', canvas.height);
                
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Mesajı yaz
                ctx.fillStyle = '#e74c3c';
                ctx.font = 'bold 18px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('📊 Veri Bulunamadı', canvas.width / 2, canvas.height / 2 - 10);
                
                ctx.fillStyle = '#7f8c8d';
                ctx.font = '14px Arial';
                ctx.fillText('Seçilen filtreler için', canvas.width / 2, canvas.height / 2 + 15);
                ctx.fillText('yatırım verisi mevcut değil', canvas.width / 2, canvas.height / 2 + 35);
                
                console.log(`✅ ${canvasId} mesajı yazıldı`);
            } else {
                console.error(`❌ ${canvasId} canvas bulunamadı`);
            }
        });
        
        console.log('✅ Veri bulunamadı grafikleri gösterildi');
        
    } catch (error) {
        console.error('❌ Veri bulunamadı grafikleri gösterme hatası:', error);
    }
    
    console.log('🔍 showInvestmentNoDataCharts fonksiyonu bitti');
}

// Alan tipi etiket fonksiyonu
function getAreaTypeLabel(type) {
    const labels = {
        'wall': 'Duvar Standı',
        'middle': 'Orta Alan Standı',
        'desk': 'Masa Üstü Standı',
        'other': 'Diğer'
    };
    return labels[type] || type;
}

// Alan tipi dağılımı grafiği
function updateAreaTypeChart(data) {
    const canvas = document.getElementById('area-type-chart');
    if (!canvas) {
        console.error('❌ area-type-chart canvas bulunamadı');
        return;
    }
    
    // Önceki grafiği temizle
    if (window.areaTypeChart) {
        window.areaTypeChart.destroy();
    }
    
    const areaTypeCounts = {};
    data.forEach(item => {
        item.areas.forEach(area => {
            // Marka filtresi varsa sadece seçili markaları say
            if (investmentReportData.currentFilters.brand.length > 0) {
                if (!investmentReportData.currentFilters.brand.includes(area.brand)) {
                    return; // Bu area'yı atla
                }
            }
            const areaType = area.area_type || 'middle';
            areaTypeCounts[areaType] = (areaTypeCounts[areaType] || 0) + 1;
        });
    });
    
    const labels = Object.keys(areaTypeCounts).map(type => getAreaTypeLabel(type));
    const values = Object.values(areaTypeCounts);
    
    window.areaTypeChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Alan Tipi Dağılımı'
                },
                legend: {
                    position: 'bottom'
                }
            },
            onClick: (event, elements) => {
                console.log('🔍 Chart.js onClick tetiklendi:', { event, elements });
                
                // Eğer grafik elemanına tıklandıysa
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const label = labels[index];
                    const value = values[index];
                    showChartModal('area-type-chart', 'Alan Tipi Dağılımı', { labels, values });
                } else {
                    // Eğer boş alana tıklandıysa (başlık alanı olabilir)
                    const rect = event.native.target.getBoundingClientRect();
                    const y = event.native.offsetY;
                    console.log('🔍 Boş alana tıklandı, pozisyon:', { y, rect });
                    
                    if (y < 50) {
                        console.log('🔍 Başlık alanına tıklandı (Chart.js onClick)');
                        showChartModal('area-type-chart', 'Alan Tipi Dağılımı', { labels, values });
                    }
                }
            }
        }
    });
    
    // Canvas'a başlık tıklama event'i ekle
    canvas.addEventListener('click', function(event) {
        console.log('🔍 Canvas click event tetiklendi:', event);
        const rect = canvas.getBoundingClientRect();
        const y = event.clientY - rect.top;
        
        console.log('🔍 Click pozisyonu:', { y, rect });
        
        // Başlık alanı yaklaşık olarak üst 50px'de
        if (y < 50) {
            console.log('🔍 Başlık alanına tıklandı, modal açılıyor...');
            console.log('🔍 showChartModal fonksiyonu var mı?', typeof showChartModal);
            if (typeof showChartModal === 'function') {
                showChartModal('area-type-chart', 'Alan Tipi Dağılımı', { labels, values });
            } else {
                console.error('❌ showChartModal fonksiyonu tanımlı değil!');
            }
        }
    });
    
    // Canvas'a hover event'i ekle
    canvas.addEventListener('mousemove', function(event) {
        const rect = canvas.getBoundingClientRect();
        const y = event.clientY - rect.top;
        
        // Başlık alanı yaklaşık olarak üst 50px'de
        if (y < 50) {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'default';
        }
    });
}

// Marka bazlı yatırım analizi grafiği
function updateBrandAnalysisChart(data) {
    const canvas = document.getElementById('brand-analysis-chart');
    if (!canvas) {
        console.error('❌ brand-analysis-chart canvas bulunamadı');
        return;
    }
    
    if (window.brandAnalysisChart) {
        window.brandAnalysisChart.destroy();
    }
    
    const brandCounts = {};
    
    // Önce tüm alan tiplerini tespit et
    const allAreaTypes = new Set();
    data.forEach(item => {
        item.areas.forEach(area => {
            allAreaTypes.add(area.area_type || 'middle');
        });
    });
    
    // Brand counts'u dinamik olarak oluştur
    data.forEach(item => {
        item.areas.forEach(area => {
            const brand = area.brand;
            if (!brandCounts[brand]) {
                // Tüm area tiplerini içeren bir obje oluştur
                brandCounts[brand] = {};
                allAreaTypes.forEach(type => {
                    brandCounts[brand][type] = 0;
                });
                brandCounts[brand].total = 0;
            }
            const areaType = area.area_type || 'middle';
            if (brandCounts[brand][areaType] !== undefined) {
                brandCounts[brand][areaType]++;
                brandCounts[brand].total++;
            }
        });
    });
    
    const brands = Object.keys(brandCounts);
    
    // Tüm area tiplerini label'lara çevir
    const areaTypeLabels = {
        'wall': 'Duvar Standı',
        'middle': 'Orta Alan Standı',
        'desk': 'Masa Üstü Standı',
        'other': 'Diğer'
    };
    
    // Dataset'leri dinamik oluştur
    const datasets = Array.from(allAreaTypes).map((areaType, index) => {
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
        return {
            label: areaTypeLabels[areaType] || areaType,
            data: brands.map(brand => brandCounts[brand][areaType] || 0),
            backgroundColor: colors[index % colors.length]
        };
    });
    
    window.brandAnalysisChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: brands,
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Marka Bazlı Yatırım Analizi'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            onClick: (event, elements) => {
                console.log('🔍 Brand Analysis Chart.js onClick tetiklendi:', { event, elements });
                
                // Eğer grafik elemanına tıklandıysa
                if (elements.length > 0) {
                    showChartModal('brand-analysis-chart', 'Marka Bazlı Yatırım Analizi', { brands, datasets });
                } else {
                    // Eğer boş alana tıklandıysa (başlık alanı olabilir)
                    const rect = event.native.target.getBoundingClientRect();
                    const y = event.native.offsetY;
                    console.log('🔍 Brand Analysis boş alana tıklandı, pozisyon:', { y, rect });
                    
                    if (y < 50) {
                        console.log('🔍 Brand Analysis başlık alanına tıklandı (Chart.js onClick)');
                        showChartModal('brand-analysis-chart', 'Marka Bazlı Yatırım Analizi', { brands, datasets });
                    }
                }
            }
        }
    });
    
    // Canvas'a başlık tıklama event'i ekle
    canvas.addEventListener('click', function(event) {
        console.log('🔍 Brand Analysis Canvas click event tetiklendi:', event);
        const rect = canvas.getBoundingClientRect();
        const y = event.clientY - rect.top;
        
        console.log('🔍 Brand Analysis Click pozisyonu:', { y, rect });
        
        // Başlık alanı yaklaşık olarak üst 50px'de
        if (y < 50) {
            console.log('🔍 Brand Analysis başlık alanına tıklandı, modal açılıyor...');
            console.log('🔍 Brand Analysis showChartModal fonksiyonu var mı?', typeof showChartModal);
            console.log('🔍 showChartModal tipi:', typeof showChartModal);
            console.log('🔍 showChartModal değeri:', showChartModal);
            if (typeof showChartModal === 'function') {
                console.log('✅ showChartModal fonksiyonu tespit edildi, çağrılıyor...');
                console.log('🔍 Çağrı parametreleri:', { 
                    chartId: 'brand-analysis-chart', 
                    title: 'Marka Bazlı Yatırım Analizi', 
                    data: { brands, datasets } 
                });
                console.log('🔍 showChartModal çağrılmadan önce...');
                try {
                    showChartModal('brand-analysis-chart', 'Marka Bazlı Yatırım Analizi', { brands, datasets });
                    console.log('✅ showChartModal çağrısı tamamlandı');
                } catch (error) {
                    console.error('❌ showChartModal çağrısı başarısız:', error);
                    alert('Modal açma hatası: ' + error.message);
                }
            } else {
                console.error('❌ Brand Analysis showChartModal fonksiyonu tanımlı değil!');
                console.error('❌ Type:', typeof showChartModal);
                console.error('❌ Değer:', showChartModal);
            }
        }
    });
    
    // Canvas'a hover event'i ekle
    canvas.addEventListener('mousemove', function(event) {
        const rect = canvas.getBoundingClientRect();
        const y = event.clientY - rect.top;
        
        // Başlık alanı yaklaşık olarak üst 50px'de
        if (y < 50) {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'default';
        }
    });
}

// Marka yüzdesel dağılımı grafiği
function updateInvestmentBrandPercentageChart(data) {
    console.log('🔍 Marka yüzdesel dağılım grafiği güncelleniyor...');
    console.log('🔍 Gelen veri:', data.length, 'kayıt');
    
    const canvas = document.getElementById('brand-percentage-chart');
    if (!canvas) {
        console.error('❌ brand-percentage-chart canvas bulunamadı');
        return;
    }
    
    if (window.brandPercentageChart) {
        window.brandPercentageChart.destroy();
    }
    
    const brandCounts = {};
    data.forEach((item, index) => {
        console.log(`🔍 Item ${index}:`, item);
        console.log(`🔍 Item ${index} tüm alanlar:`, Object.keys(item));
        
        // Veri yapısını kontrol et - areas field'ı var mı?
        if (item.areas && Array.isArray(item.areas)) {
            console.log(`🔍 Item ${index} areas bulundu:`, item.areas);
            item.areas.forEach((area, areaIndex) => {
                console.log(`🔍 Area ${areaIndex}:`, area);
                if (typeof area === 'string') {
                    // Eğer area string ise, direkt marka olarak kullan
                    brandCounts[area] = (brandCounts[area] || 0) + 1;
                } else if (area && typeof area === 'object') {
                    // Eğer area object ise, brand field'ını kullan
                    if (area.brand) {
                        brandCounts[area.brand] = (brandCounts[area.brand] || 0) + 1;
                    }
                }
            });
        } else {
            console.warn(`⚠️ Item ${index} areas bulunamadı veya array değil:`, item.areas);
            console.log(`🔍 Item ${index} mevcut alanlar:`, Object.keys(item));
        }
    });
    
    console.log('🔍 Brand counts:', brandCounts);
    
    // Marka filtresi varsa sadece seçili markaları kullan
    let filteredBrandCounts = brandCounts;
    if (investmentReportData.currentFilters.brand.length > 0) {
        console.log('🔍 Marka filtresi uygulanıyor - Marka Yüzdesel Dağılımı');
        console.log('🔍 Seçili markalar:', investmentReportData.currentFilters.brand);
        filteredBrandCounts = {};
        investmentReportData.currentFilters.brand.forEach(brand => {
            if (brandCounts[brand]) {
                filteredBrandCounts[brand] = brandCounts[brand];
            }
        });
        console.log('🔍 Filtrelenmiş brand counts:', filteredBrandCounts);
    }
    
    const total = Object.values(filteredBrandCounts).reduce((sum, count) => sum + count, 0);
    console.log('🔍 Total:', total);
    
    if (total === 0) {
        console.warn('⚠️ Hiç marka verisi bulunamadı!');
        // Boş grafik göster
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Marka verisi bulunamadı', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const labels = Object.keys(filteredBrandCounts).map(brand => {
        const count = filteredBrandCounts[brand];
        const percentage = ((count / total) * 100).toFixed(1);
        return `${brand} (${percentage}%)`;
    });
    const values = Object.values(filteredBrandCounts);
    
    console.log('🔍 Labels:', labels);
    console.log('🔍 Values:', values);
    
    window.brandPercentageChart = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `Marka Yüzdesel Dağılımı (Toplam: ${total} Yatırım Alanı)`
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return {
                                        text: `${label} (${value} alan)`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        strokeStyle: data.datasets[0].backgroundColor[i],
                                        lineWidth: 1,
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label.replace(/ \(\d+\.\d+%\)$/, ''); // Yüzde kısmını çıkar
                            const value = context.parsed;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} yatırım alanı (${percentage}%)`;
                        }
                    }
                }
            },
            onClick: (event, elements) => {
                console.log('🔍 Brand Percentage Chart.js onClick tetiklendi:', { event, elements });
                
                // Eğer grafik elemanına tıklandıysa
                if (elements.length > 0) {
                    showChartModal('brand-percentage-chart', 'Marka Yüzdesel Dağılımı', { labels, values });
                } else {
                    // Eğer boş alana tıklandıysa (başlık alanı olabilir)
                    const rect = event.native.target.getBoundingClientRect();
                    const y = event.native.offsetY;
                    console.log('🔍 Brand Percentage boş alana tıklandı, pozisyon:', { y, rect });
                    
                    if (y < 50) {
                        console.log('🔍 Brand Percentage başlık alanına tıklandı (Chart.js onClick)');
                        showChartModal('brand-percentage-chart', `Marka Yüzdesel Dağılımı (Toplam: ${total} Yatırım Alanı)`, { labels, values });
                    }
                }
            }
        }
    });
    
    // Canvas'a başlık tıklama event'i ekle
    canvas.addEventListener('click', function(event) {
        console.log('🔍 Brand Percentage Canvas click event tetiklendi:', event);
        const rect = canvas.getBoundingClientRect();
        const y = event.clientY - rect.top;
        
        console.log('🔍 Brand Percentage Click pozisyonu:', { y, rect });
        
        // Başlık alanı yaklaşık olarak üst 50px'de
        if (y < 50) {
            console.log('🔍 Brand Percentage başlık alanına tıklandı, modal açılıyor...');
            console.log('🔍 Brand Percentage showChartModal fonksiyonu var mı?', typeof showChartModal);
            if (typeof showChartModal === 'function') {
                showChartModal('brand-percentage-chart', `Marka Yüzdesel Dağılımı (Toplam: ${total} Yatırım Alanı)`, { labels, values });
            } else {
                console.error('❌ Brand Percentage showChartModal fonksiyonu tanımlı değil!');
            }
        }
    });
    
    // Canvas'a hover event'i ekle
    canvas.addEventListener('mousemove', function(event) {
        const rect = canvas.getBoundingClientRect();
        const y = event.clientY - rect.top;
        
        // Başlık alanı yaklaşık olarak üst 50px'de
        if (y < 50) {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'default';
        }
    });
    
    console.log('✅ Marka yüzdesel dağılım grafiği oluşturuldu');
}

// Trend analizi grafiği
function updateTrendAnalysisChart(data) {
    const canvas = document.getElementById('trend-analysis-chart');
    if (!canvas) {
        console.error('❌ trend-analysis-chart canvas bulunamadı');
        return;
    }
    
    if (window.trendAnalysisChart) {
        window.trendAnalysisChart.destroy();
    }
    
    // Survey bazlı analiz
    const surveyData = {};
    data.forEach(item => {
        const surveyId = item.survey_id;
        if (!surveyData[surveyId]) {
            surveyData[surveyId] = {};
        }
        item.areas.forEach(area => {
            const brand = area.brand;
            surveyData[surveyId][brand] = (surveyData[surveyId][brand] || 0) + 1;
        });
    });
    
    const surveys = Object.keys(surveyData);
    if (surveys.length < 2) {
        console.log('⚠️ Trend analizi için en az 2 anket gerekli');
        return;
    }
    
    // Tüm markaları topla
    let allBrands = [...new Set(data.flatMap(item => item.areas.map(area => area.brand)))];
    
    // Marka filtresi varsa sadece seçili markaları kullan
    if (investmentReportData.currentFilters.brand.length > 0) {
        console.log('🔍 Marka filtresi uygulanıyor - Trend Analizi');
        console.log('🔍 Seçili markalar:', investmentReportData.currentFilters.brand);
        console.log('🔍 Tüm markalar:', allBrands);
        allBrands = allBrands.filter(brand => investmentReportData.currentFilters.brand.includes(brand));
        console.log('🔍 Filtrelenmiş markalar:', allBrands);
    }
    
    const datasets = allBrands.map((brand, index) => ({
        label: brand,
        data: surveys.map(surveyId => surveyData[surveyId][brand] || 0),
        borderColor: `hsl(${index * 60}, 70%, 50%)`,
        backgroundColor: `hsla(${index * 60}, 70%, 50%, 0.1)`,
        fill: false
    }));
    
    const surveyNames = {};
    surveys.forEach(surveyId => {
        const survey = investmentReportData.surveys.find(s => s.id == surveyId);
        surveyNames[surveyId] = survey ? survey.title : `Anket ${surveyId}`;
    });
    
    window.trendAnalysisChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: surveys.map(id => surveyNames[id]),
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Marka Stand Sayısı Trend Analizi'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            onClick: (event, elements) => {
                console.log('🔍 Trend Analysis Chart.js onClick tetiklendi:', { event, elements });
                
                // Eğer grafik elemanına tıklandıysa
                if (elements.length > 0) {
                    showChartModal('trend-analysis-chart', 'Trend Analizi', { surveys, brands, surveyData });
                } else {
                    // Eğer boş alana tıklandıysa (başlık alanı olabilir)
                    const rect = event.native.target.getBoundingClientRect();
                    const y = event.native.offsetY;
                    console.log('🔍 Trend Analysis boş alana tıklandı, pozisyon:', { y, rect });
                    
                    if (y < 50) {
                        console.log('🔍 Trend Analysis başlık alanına tıklandı (Chart.js onClick)');
                        showChartModal('trend-analysis-chart', 'Trend Analizi', { surveys, brands, surveyData });
                    }
                }
            }
        }
    });
    
    // Canvas'a başlık tıklama event'i ekle
    canvas.addEventListener('click', function(event) {
        console.log('🔍 Trend Analysis Canvas click event tetiklendi:', event);
        const rect = canvas.getBoundingClientRect();
        const y = event.clientY - rect.top;
        
        console.log('🔍 Trend Analysis Click pozisyonu:', { y, rect });
        
        // Başlık alanı yaklaşık olarak üst 50px'de
        if (y < 50) {
            console.log('🔍 Trend Analysis başlık alanına tıklandı, modal açılıyor...');
            console.log('🔍 Trend Analysis showChartModal fonksiyonu var mı?', typeof showChartModal);
            if (typeof showChartModal === 'function') {
                showChartModal('trend-analysis-chart', 'Trend Analizi', { surveys, brands, surveyData });
            } else {
                console.error('❌ Trend Analysis showChartModal fonksiyonu tanımlı değil!');
            }
        }
    });
    
    // Canvas'a hover event'i ekle
    canvas.addEventListener('mousemove', function(event) {
        const rect = canvas.getBoundingClientRect();
        const y = event.clientY - rect.top;
        
        // Başlık alanı yaklaşık olarak üst 50px'de
        if (y < 50) {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'default';
        }
    });
}

// Grafik modalını göster
window.showChartModal = function(chartId, title, data) {
    try {
        console.log('🔍 showChartModal çağrıldı:', { chartId, title, data });
        console.log('🔍 Console output başladı');
        // Eski modalı kaldır
        const existingModal = document.getElementById('chartModal');
        if (existingModal) {
            console.log('🔍 Eski modal kaldırılıyor...');
            existingModal.remove();
        }
        
        const modalHtml = `
            <div class="modal fade" id="chartModal" tabindex="-1" aria-labelledby="chartModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="chartModalLabel">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div style="position: relative; height: 400px; width: 100%;">
                                <canvas id="modalChart"></canvas>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Yeni modalı ekle
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        console.log('✅ Modal HTML eklendi');
        
        const modalElement = document.getElementById('chartModal');
        console.log('✅ Modal element bulundu:', modalElement);
        console.log('🔍 Modal element var mı?', !!modalElement);
        
        // Modalı göster
        console.log('🔍 Modal gösteriliyor...');
        modalElement.classList.add('show');
        modalElement.style.display = 'block';
        document.body.classList.add('modal-open');
        
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        backdrop.id = 'modalBackdrop';
        document.body.appendChild(backdrop);
        
        // Kapat butonları için event listener
        let isClosing = false;
        const closeModal = () => {
            if (isClosing) return;
            isClosing = true;
            
            console.log('🔍 Modal kapatılıyor...');
            if (window.modalChart && typeof window.modalChart.destroy === 'function') {
                window.modalChart.destroy();
                window.modalChart = null;
            }
            modalElement.classList.remove('show');
            modalElement.style.display = 'none';
            document.body.classList.remove('modal-open');
            const backdropElement = document.getElementById('modalBackdrop');
            if (backdropElement) backdropElement.remove();
            
            setTimeout(() => {
                modalElement.remove();
                isClosing = false;
            }, 300);
        };
        
        modalElement.querySelectorAll('[data-bs-dismiss="modal"], .btn-secondary').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        
        // Backdrop tıklamasında kapat
        backdrop.addEventListener('click', closeModal);
        
        // Grafik için biraz bekle
        setTimeout(() => {
            console.log('🔍 Grafik oluşturuluyor...');
            createModalChart(chartId, title, data);
        }, 100);
        
        console.log('✅ Modal gösterildi');
    } catch (error) {
        console.error('❌ showChartModal hatası:', error);
        alert('Modal açılırken hata oluştu: ' + error.message);
    }
}

// Modal grafiği oluştur
window.createModalChart = function(chartId, title, data) {
    console.log('🔍 createModalChart çağrıldı:', { chartId, title, data });
    
    const canvas = document.getElementById('modalChart');
    if (!canvas) {
        console.error('❌ Modal canvas bulunamadı');
        return;
    }
    
    console.log('✅ Modal canvas bulundu:', canvas);
    console.log('✅ Canvas boyutları:', canvas.offsetWidth, 'x', canvas.offsetHeight);
    
    // Önceki grafiği temizle
    if (window.modalChart && typeof window.modalChart.destroy === 'function') {
        console.log('🔍 Önceki grafik temizleniyor...');
        window.modalChart.destroy();
        window.modalChart = null;
    }
    
    // Canvas'ı temizle
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    let chartConfig;
    
    switch (chartId) {
        case 'area-type-chart':
            chartConfig = {
                type: 'doughnut',
                data: {
                    labels: data.labels,
                    datasets: [{
                        data: data.values,
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { 
                            display: true, 
                            text: title,
                            font: { size: 20 }
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            };
            break;
            
        case 'brand-analysis-chart':
            chartConfig = {
                type: 'bar',
                data: {
                    labels: data.brands,
                    datasets: data.datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        title: { 
                            display: true, 
                            text: title,
                            font: { size: 20 }
                        },
                        legend: {
                            position: 'bottom'
                        }
                    },
                    scales: { 
                        y: { 
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Stand Sayısı'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Markalar'
                            }
                        }
                    }
                }
            };
            break;
            
        case 'brand-percentage-chart':
            chartConfig = {
                type: 'pie',
                data: {
                    labels: data.labels,
                    datasets: [{
                        data: data.values,
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#FF6384']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        title: { 
                            display: true, 
                            text: title,
                            font: { size: 20 }
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            };
            break;
            
        case 'trend-analysis-chart':
            const datasets = data.brands.map((brand, index) => ({
                label: brand,
                data: data.surveys.map(surveyId => data.surveyData[surveyId] ? data.surveyData[surveyId][brand] || 0 : 0),
                borderColor: `hsl(${index * 60}, 70%, 50%)`,
                backgroundColor: `hsla(${index * 60}, 70%, 50%, 0.1)`,
                fill: false
            }));
            
            chartConfig = {
                type: 'line',
                data: {
                    labels: data.surveys.map(id => `Anket ${id}`),
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        title: { 
                            display: true, 
                            text: title,
                            font: { size: 20 }
                        },
                        legend: {
                            position: 'bottom'
                        }
                    },
                    scales: { 
                        y: { 
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Stand Sayısı'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Anket Dönemleri'
                            }
                        }
                    }
                }
            };
            break;
    }
    
    console.log('🔍 Chart config:', chartConfig);
    
    if (chartConfig) {
        console.log('✅ Chart oluşturuluyor...');
        try {
            window.modalChart = new Chart(canvas, chartConfig);
            console.log('✅ Chart başarıyla oluşturuldu:', window.modalChart);
            console.log('🔍 Chart data:', window.modalChart.data);
            console.log('🔍 Chart options:', window.modalChart.options);
        } catch (error) {
            console.error('❌ Chart oluşturma hatası:', error);
            // Hata durumunda modal içine hata mesajı göster
            const ctx = canvas.getContext('2d');
            ctx.font = '16px Arial';
            ctx.fillStyle = '#e74c3c';
            ctx.textAlign = 'center';
            ctx.fillText('Grafik oluşturulamadı', canvas.width / 2, canvas.height / 2);
        }
    } else {
        console.error('❌ Chart config bulunamadı!');
        console.error('🔍 Gelen veri:', { chartId, title, data });
    }
}

// Mağaza tablosunu güncelle
function updateStoreTable() {
    console.log('📊 Mağaza tablosu güncelleniyor...');
    
    const tbody = document.getElementById('investment-store-tbody');
    if (!tbody) {
        console.error('❌ investment-store-tbody bulunamadı');
        return;
    }
    
    const data = investmentReportData.filteredData || [];
    const searchTerm = document.getElementById('investment-store-search')?.value.toLowerCase() || '';
    
    console.log('📊 Tablo için veri:', data.length, 'kayıt, arama:', searchTerm);
    
    // Arama filtresi uygula
    let filteredData = data;
    if (searchTerm) {
        filteredData = data.filter(item => {
            const storeId = item.store_id;
            const store = investmentReportData.stores.find(s => s.id === storeId);
            const storeName = store ? store.name.toLowerCase() : '';
            
            const brandMatches = item.areas.some(area => 
                area.brand.toLowerCase().includes(searchTerm)
            );
            
            const survey = investmentReportData.surveys.find(s => s.id === item.survey_id);
            const surveyName = survey ? survey.title.toLowerCase() : '';
            
            return storeName.includes(searchTerm) || brandMatches || surveyName.includes(searchTerm);
        });
    }
    
    console.log('📊 Arama sonrası:', filteredData.length, 'kayıt');
    
    tbody.innerHTML = '';
    
    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">Veri bulunamadı</td></tr>';
        return;
    }
    
    filteredData.forEach(item => {
        const storeId = item.store_id;
        const store = investmentReportData.stores.find(s => s.id === storeId);
        const storeName = store ? store.name : 'Bilinmeyen Mağaza';
        
        const region = store ? investmentReportData.regions.find(r => r.id === store.region_id) : null;
        const regionName = region ? region.name : '-';
        
        const channel = store ? investmentReportData.channels.find(c => c.id === store.channel_id) : null;
        const channelName = channel ? channel.name : '-';
        
        const survey = investmentReportData.surveys.find(s => s.id === item.survey_id);
        const surveyName = survey ? survey.title : 'Bilinmeyen Anket';
        
        // Marka filtresi varsa sadece o markaları göster
        const areasToShow = investmentReportData.currentFilters.brand.length > 0 
            ? item.areas.filter(area => investmentReportData.currentFilters.brand.includes(area.brand))
            : item.areas;
        
        console.log(`🔍 Item ${item.id} için gösterilecek area'lar:`, areasToShow.map(a => a.brand));
        
        areasToShow.forEach(area => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${storeName}</td>
                <td>${regionName}</td>
                <td>${channelName}</td>
                <td>${surveyName}</td>
                <td>${area.brand}</td>
                                                <td>${getAreaTypeLabel(area.area_type || 'middle')}</td>
                <td>${area.photos_count}</td>
                <td>${new Date().toLocaleDateString('tr-TR')}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewPhotos(${item.id}, '${area.brand}', '${area.area_type || 'middle'}', '${storeName}')">
                        Fotoğraflar
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    });
    
    console.log('✅ Mağaza tablosu güncellendi:', filteredData.length, 'kayıt');
}

// Fotoğrafları görüntüle
function viewPhotos(itemId, brand, areaType, storeName) {
    console.log('📸 Fotoğraflar görüntüleniyor:', { itemId, brand, areaType, storeName });
    
    const item = investmentReportData.areasAnalysis.find(i => i.id === itemId);
    if (!item) {
        showAlert('Veri bulunamadı', 'error');
        return;
    }
    
    const area = item.areas.find(a => a.brand === brand && a.area_type === areaType);
    if (!area || !area.photos || area.photos.length === 0) {
        showAlert('Bu alan için fotoğraf bulunamadı', 'warning');
        return;
    }
    
    const normalizedAreaType = getAreaTypeLabel(areaType);
    
    const modalHtml = `
        <div class="modal fade" id="photosModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${storeName} - ${brand} (${normalizedAreaType})</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            ${area.photos.map((photo, index) => `
                                <div class="col-md-4 mb-3">
                                    <div class="card">
                                        <img src="${photo}" class="card-img-top" style="height: 200px; object-fit: cover;" 
                                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkZvdG9ncmFmIEJ1bHVuYW1hZGl8L3RleHQ+PC9zdmc+'">
                                        <div class="card-body p-2">
                                            <button class="btn btn-sm btn-primary w-100" onclick="window.open('${photo}', '_blank')">
                                                Tam Boyut
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Eski modalı kaldır
    const existingModal = document.getElementById('photosModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Yeni modalı ekle
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Modalı göster
    const modal = new bootstrap.Modal(document.getElementById('photosModal'));
    modal.show();
}

// Alert göster
function showAlert(message, type = 'info') {
    const alertHtml = `
        <div class="alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Alert container'ı bul veya oluştur
    let alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alert-container';
        alertContainer.style.position = 'fixed';
        alertContainer.style.top = '20px';
        alertContainer.style.right = '20px';
        alertContainer.style.zIndex = '9999';
        document.body.appendChild(alertContainer);
    }
    
    // Yeni alert oluştur
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    
    alertContainer.appendChild(alertDiv);
    
    // 5 saniye sonra otomatik kapat
    const autoCloseTimer = setTimeout(() => {
        if (alertDiv && alertDiv.parentNode) {
            try {
                const bsAlert = bootstrap.Alert.getOrCreateInstance(alertDiv);
                bsAlert.close();
            } catch (e) {
                // Bootstrap Alert API çalışmazsa manuel kapat
                alertDiv.style.transition = 'opacity 0.3s';
                alertDiv.style.opacity = '0';
                setTimeout(() => {
                    if (alertDiv.parentNode) {
                        alertDiv.remove();
                    }
                }, 300);
            }
        }
    }, 5000);
    
    // Alert kapandığında timer'ı temizle
    alertDiv.addEventListener('closed.bs.alert', () => {
        clearTimeout(autoCloseTimer);
    });
}

// Sunum sistemi
let presentationData = {
    slides: [],
    currentSlide: 0,
    totalSlides: 0
};

// Sunum oluştur
function createPresentation() {
    console.log('🎬 Sunum oluşturuluyor...');
    
    const data = investmentReportData.filteredData || [];
    if (data.length === 0) {
        showAlert('Sunum için veri bulunamadı. Lütfen filtreleri kontrol edin.', 'warning');
        return;
    }
    
    // Veriyi marka bazında grupla
    const brandGroups = {};
    data.forEach(item => {
        const storeId = item.store_id;
        const store = investmentReportData.stores.find(s => s.id === storeId);
        const storeName = store ? store.name : 'Bilinmeyen Mağaza';
        
        const region = store ? investmentReportData.regions.find(r => r.id === store.region_id) : null;
        const regionName = region ? region.name : '-';
        
        const channel = store ? investmentReportData.channels.find(c => c.id === store.channel_id) : null;
        const channelName = channel ? channel.name : '-';
        
        const survey = investmentReportData.surveys.find(s => s.id === item.survey_id);
        const surveyName = survey ? survey.title : 'Bilinmeyen Anket';
        
        item.areas.forEach(area => {
            if (!brandGroups[area.brand]) {
                brandGroups[area.brand] = [];
            }
            
            brandGroups[area.brand].push({
                storeId: storeId,
                storeName: storeName,
                regionName: regionName,
                channelName: channelName,
                surveyName: surveyName,
                brand: area.brand,
                areaType: area.area_type || 'middle',
                photos: area.photos || [],
                photosCount: area.photos_count || 0
            });
        });
    });
    
    console.log('📊 Marka grupları:', Object.keys(brandGroups));
    
    // Markaları alfabetik sırala
    const sortedBrands = Object.keys(brandGroups).sort();
    console.log('📊 Alfabetik markalar:', sortedBrands);
    
    // Her marka için slaytlar oluştur
    presentationData.slides = [];
    sortedBrands.forEach(brand => {
        const stores = brandGroups[brand];
        
        // Mağazaları 3'lü gruplara böl
        for (let i = 0; i < stores.length; i += 3) {
            const slideStores = stores.slice(i, i + 3);
            presentationData.slides.push({
                brand: brand,
                stores: slideStores,
                slideNumber: presentationData.slides.length + 1
            });
        }
    });
    
    presentationData.totalSlides = presentationData.slides.length;
    presentationData.currentSlide = 0;
    
    console.log('✅ Sunum hazırlandı:', presentationData.totalSlides, 'slayt');
    
    // Modalı göster
    showPresentationModal();
}

// Sunum modalını göster
function showPresentationModal() {
    const modal = new bootstrap.Modal(document.getElementById('presentationModal'));
    modal.show();
    
    // Sunum içeriğini oluştur
    generatePresentationSlides();
    
    // İlk slaytı göster
    showSlide(0);
    
    // Event listener'ları kur
    setupPresentationEventListeners();
}

// Sunum slaytlarını oluştur
function generatePresentationSlides() {
    const container = document.getElementById('presentation-container');
    container.innerHTML = '';
    
    presentationData.slides.forEach((slide, index) => {
        const slideElement = document.createElement('div');
        slideElement.className = 'presentation-slide';
        slideElement.id = `slide-${index}`;
        
        slideElement.innerHTML = `
            <div class="slide-header">
                <h1 class="slide-title">${slide.brand}</h1>
                <p class="slide-subtitle">Marka Yatırım Alanları</p>
            </div>
            
            <div class="stores-grid">
                ${slide.stores.map(store => `
                    <div class="store-card">
                        <div class="store-name">${store.storeName}</div>
                        <div class="brand-badge">${store.brand}</div>
                        <div class="photos-grid">
                            ${store.photos.slice(0, 4).map((photo, photoIndex) => `
                                <div class="photo-item">
                                    <img src="${photo}" alt="${store.storeName} - ${store.brand}" 
                                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkZvdG9ncmFmIEJ1bHVuYW1hZGl8L3RleHQ+PC9zdmc+'">
                                    ${photoIndex === 3 && store.photos.length > 4 ? `<div class="photo-count">+${store.photos.length - 4}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                        <div class="mt-2">
                            <small>${store.regionName} - ${store.channelName}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="slide-dots">
                ${presentationData.slides.map((_, dotIndex) => `
                    <div class="slide-dot ${dotIndex === index ? 'active' : ''}" onclick="showSlide(${dotIndex})"></div>
                `).join('')}
            </div>
        `;
        
        container.appendChild(slideElement);
    });
}

// Slayt göster
function showSlide(slideIndex) {
    // Tüm slaytları gizle
    document.querySelectorAll('.presentation-slide').forEach(slide => {
        slide.classList.remove('active');
    });
    
    // Seçili slaytı göster
    const targetSlide = document.getElementById(`slide-${slideIndex}`);
    if (targetSlide) {
        targetSlide.classList.add('active');
    }
    
    // Slayt sayacını güncelle
    document.getElementById('slide-counter').textContent = `${slideIndex + 1} / ${presentationData.totalSlides}`;
    
    // Butonları güncelle
    document.getElementById('prev-slide-btn').disabled = slideIndex === 0;
    document.getElementById('next-slide-btn').disabled = slideIndex === presentationData.totalSlides - 1;
    
    // Dot'ları güncelle
    document.querySelectorAll('.slide-dot').forEach((dot, index) => {
        dot.classList.toggle('active', index === slideIndex);
    });
    
    presentationData.currentSlide = slideIndex;
}

// Sunum event listener'larını kur
function setupPresentationEventListeners() {
    // Önceki slayt
    document.getElementById('prev-slide-btn').addEventListener('click', () => {
        if (presentationData.currentSlide > 0) {
            showSlide(presentationData.currentSlide - 1);
        }
    });
    
    // Sonraki slayt
    document.getElementById('next-slide-btn').addEventListener('click', () => {
        if (presentationData.currentSlide < presentationData.totalSlides - 1) {
            showSlide(presentationData.currentSlide + 1);
        }
    });
    
    // Klavye navigasyonu
    document.addEventListener('keydown', (e) => {
        if (document.getElementById('presentationModal').classList.contains('show')) {
            if (e.key === 'ArrowLeft' && presentationData.currentSlide > 0) {
                showSlide(presentationData.currentSlide - 1);
            } else if (e.key === 'ArrowRight' && presentationData.currentSlide < presentationData.totalSlides - 1) {
                showSlide(presentationData.currentSlide + 1);
            }
        }
    });
    
    // Sunum indirme
    document.getElementById('download-presentation-btn').addEventListener('click', downloadPresentation);
}

// Fotoğraf placeholder ekle
function addPhotoPlaceholder(slide, x, y, photoNumber) {
    slide.addText(`Fotoğraf ${photoNumber}\nYüklenemedi`, {
        x: x, y: y, w: 1.2, h: 1.2,
        fontSize: 12,
        color: '000000',
        align: 'center',
        fontFace: 'Arial',
        fill: { color: 'F0F0F0' },
        border: { color: 'CCCCCC', pt: 1 }
    });
}

// Sunumu indir
async function downloadPresentation() {
    console.log('📥 PowerPoint sunumu indiriliyor...');
    
    try {
        // PowerPoint sunumu oluştur
        const pptx = new PptxGenJS();
        
        // Sunum bilgilerini al
        const surveyName = investmentReportData.surveys.find(s => 
            investmentReportData.currentFilters.surveys.includes(s.id.toString())
        )?.title || 'Anket';
        
        const currentDate = new Date().toLocaleDateString('tr-TR');
        
        // 1. Giriş Slaytı
        const introSlide = pptx.addSlide();
        introSlide.background = { fill: '667eea' };
        
        introSlide.addText('ANKET SONUÇLARI', {
            x: 1, y: 2, w: 8, h: 1,
            fontSize: 48,
            color: 'FFFFFF',
            bold: true,
            align: 'center',
            fontFace: 'Arial'
        });
        
        introSlide.addText(surveyName, {
            x: 1, y: 3.5, w: 8, h: 0.8,
            fontSize: 32,
            color: 'FFFFFF',
            align: 'center',
            fontFace: 'Arial'
        });
        
        introSlide.addText(`Tarih: ${currentDate}`, {
            x: 1, y: 4.8, w: 8, h: 0.6,
            fontSize: 24,
            color: 'FFFFFF',
            align: 'center',
            fontFace: 'Arial'
        });
        
        introSlide.addText('Marka Bazlı Yatırım Alanları', {
            x: 1, y: 5.8, w: 8, h: 0.6,
            fontSize: 20,
            color: 'FFFFFF',
            align: 'center',
            fontFace: 'Arial'
        });
        
        // Tüm fotoğrafları önce yükle
        console.log('📸 Fotoğraflar yükleniyor...');
        const photoPromises = [];
        
        presentationData.slides.forEach((slide, slideIndex) => {
            slide.stores.forEach((store, storeIndex) => {
                const photosToShow = store.photos.slice(0, 4);
                photosToShow.forEach((photo, photoIndex) => {
                    if (photo && photo.trim() !== '') {
                        photoPromises.push(loadPhotoForPowerPoint(photo));
                    }
                });
            });
        });
        
        // Tüm fotoğrafları bekle
        const loadedPhotos = await Promise.allSettled(photoPromises);
        console.log('✅ Fotoğraflar yüklendi:', loadedPhotos.length);
        
        // Marka slaytları oluştur
        let globalPhotoIndex = 0;
        presentationData.slides.forEach((slide, slideIndex) => {
            const brandSlide = pptx.addSlide();
            brandSlide.background = { fill: 'FFFFFF' };
            
            // Marka başlığı
            brandSlide.addText(slide.brand, {
                x: 0.5, y: 0.5, w: 9, h: 1,
                fontSize: 44,
                color: '000000',
                bold: true,
                align: 'center',
                fontFace: 'Arial'
            });
            
            brandSlide.addText('Marka Yatırım Alanları', {
                x: 0.5, y: 1.2, w: 9, h: 0.5,
                fontSize: 20,
                color: '000000',
                align: 'center',
                fontFace: 'Arial'
            });
            
            // Mağaza kartları (3'lü grid)
            slide.stores.forEach((store, storeIndex) => {
                const x = 0.5 + (storeIndex * 3);
                const y = 2;
                
                // Mağaza adı
                brandSlide.addText(store.storeName, {
                    x: x, y: y, w: 2.5, h: 0.4,
                    fontSize: 18,
                    color: '000000',
                    bold: true,
                    align: 'center',
                    fontFace: 'Arial'
                });
                
                // Marka rozeti
                brandSlide.addText(store.brand, {
                    x: x, y: y + 0.4, w: 2.5, h: 0.3,
                    fontSize: 14,
                    color: '000000',
                    align: 'center',
                    fontFace: 'Arial',
                    fill: { color: 'F0F0F0', opacity: 50 }
                });
                
                // Fotoğraflar (2x2 grid) - Daha büyük boyutlar
                const photosToShow = store.photos.slice(0, 4);
                photosToShow.forEach((photo, photoIndex) => {
                    const photoX = x + (photoIndex % 2) * 1.3;
                    const photoY = y + 0.8 + Math.floor(photoIndex / 2) * 1.4;
                    
                    if (photo && photo.trim() !== '') {
                        const photoResult = loadedPhotos[globalPhotoIndex];
                        if (photoResult.status === 'fulfilled' && photoResult.value) {
                            try {
                                brandSlide.addImage({
                                    data: photoResult.value,
                                    x: photoX, y: photoY, w: 1.2, h: 1.2,
                                    sizing: { type: 'cover', w: 1.2, h: 1.2 }
                                });
                                console.log('✅ Fotoğraf PowerPoint\'e eklendi:', globalPhotoIndex);
                            } catch (error) {
                                console.warn('❌ Fotoğraf PowerPoint\'e eklenemedi:', error);
                                addPhotoPlaceholder(brandSlide, photoX, photoY, photoIndex + 1);
                            }
                        } else {
                            console.warn('❌ Fotoğraf yüklenemedi:', photo);
                            addPhotoPlaceholder(brandSlide, photoX, photoY, photoIndex + 1);
                        }
                        globalPhotoIndex++;
                    } else {
                        addPhotoPlaceholder(brandSlide, photoX, photoY, photoIndex + 1);
                    }
                });
                
                // Fotoğraf sayısı
                if (store.photos.length > 4) {
                    brandSlide.addText(`+${store.photos.length - 4}`, {
                        x: x + 1.2, y: y + 0.8, w: 0.3, h: 0.3,
                        fontSize: 12,
                        color: '000000',
                        bold: true,
                        align: 'center',
                        fontFace: 'Arial',
                        fill: { color: 'FFFFFF', opacity: 70 }
                    });
                }
                
                // Bölge-Kanal bilgisi
                brandSlide.addText(`${store.regionName} - ${store.channelName}`, {
                    x: x, y: y + 3.4, w: 2.5, h: 0.3,
                    fontSize: 12,
                    color: '000000',
                    align: 'center',
                    fontFace: 'Arial'
                });
            });
        });
        
        // Sunumu indir
        const fileName = `Anket_Sunumu_${surveyName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pptx`;
        
        await pptx.writeFile({ fileName: fileName });
        showAlert('PowerPoint sunumu başarıyla indirildi!', 'success');
        console.log('✅ PowerPoint sunumu indirildi:', fileName);
        
    } catch (error) {
        console.error('❌ Sunum oluşturma hatası:', error);
        showAlert('Sunum oluşturulurken hata oluştu: ' + error.message, 'error');
    }
}

// Fotoğrafı PowerPoint için yükle ve rotasyonu düzelt
async function loadPhotoForPowerPoint(photoUrl) {
    try {
        if (photoUrl.startsWith('data:image/')) {
            // Base64 formatında - rotasyonu düzelt
            return await fixImageOrientation(photoUrl);
        } else {
            // URL formatında - fetch ile yükle ve rotasyonu düzelt
            const response = await fetch(photoUrl);
            if (response.ok) {
                const blob = await response.blob();
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = async () => {
                        try {
                            const fixedImage = await fixImageOrientation(reader.result);
                            resolve(fixedImage);
                        } catch (error) {
                            reject(error);
                        }
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } else {
                throw new Error('Fotoğraf yüklenemedi');
            }
        }
    } catch (error) {
        console.warn('❌ Fotoğraf yükleme hatası:', photoUrl, error);
        return null;
    }
}

// Fotoğraf rotasyonunu düzelt
async function fixImageOrientation(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Canvas boyutlarını ayarla
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Fotoğrafı canvas'a çiz
            ctx.drawImage(img, 0, 0);
            
            // Canvas'ı Base64'e çevir
            const fixedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            resolve(fixedDataUrl);
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

// Excel export fonksiyonu
async function exportInvestmentToExcel() {
    try {
        console.log('📊 Excel export başlatılıyor...');
        
        const loadingId = showLoading('Excel Export', 'Veriler hazırlanıyor...');
        
        // Filtrelenmiş veriyi al
        const filteredData = investmentReportData.filteredData || [];
        
        if (filteredData.length === 0) {
            hideLoading(loadingId);
            showAlert('Export edilecek veri bulunamadı', 'warning');
            return;
        }
        
        updateLoading(loadingId, 'Excel Export', 'Excel dosyası oluşturuluyor...');
        
        // Excel workbook oluştur
        const wb = XLSX.utils.book_new();
        
        // Veri hazırlama
        const excelData = [];
        
        // Başlık satırı
        excelData.push([
            'Mağaza ID',
            'Mağaza Adı',
            'Bölge',
            'Kanal',
            'Anket ID',
            'Marka',
            'Alan Tipi',
            'Fotoğraf 1',
            'Fotoğraf 2',
            'Fotoğraf 3',
            'Fotoğraf 4',
            'Fotoğraf 5'
        ]);
        
        // Veri satırları
        for (const item of filteredData) {
            const store = investmentReportData.stores.find(s => s.id === item.store_id);
            const region = investmentReportData.regions.find(r => r.id === store?.region_id);
            const channel = investmentReportData.channels.find(c => c.id === store?.channel_id);
            
            for (const area of item.areas) {
                const photos = area.photos || [];
                const row = [
                    item.store_id,
                    store?.name || 'Bilinmiyor',
                    region?.name || 'Bilinmiyor',
                    channel?.name || 'Bilinmiyor',
                    item.survey_id,
                    area.brand,
                    area.area_type || area.areaType || 'wall',
                    photos[0] || '',
                    photos[1] || '',
                    photos[2] || '',
                    photos[3] || '',
                    photos[4] || ''
                ];
                excelData.push(row);
            }
        }
        
        // Worksheet oluştur
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        
        // Kolon genişliklerini ayarla
        ws['!cols'] = [
            { wch: 10 }, // Mağaza ID
            { wch: 25 }, // Mağaza Adı
            { wch: 15 }, // Bölge
            { wch: 15 }, // Kanal
            { wch: 10 }, // Anket ID
            { wch: 15 }, // Marka
            { wch: 15 }, // Alan Tipi
            { wch: 20 }, // Fotoğraf 1
            { wch: 20 }, // Fotoğraf 2
            { wch: 20 }, // Fotoğraf 3
            { wch: 20 }, // Fotoğraf 4
            { wch: 20 }  // Fotoğraf 5
        ];
        
        // Workbook'a worksheet ekle
        XLSX.utils.book_append_sheet(wb, ws, 'Yatırım Alanı Raporu');
        
        updateLoading(loadingId, 'Excel Export', 'Dosya indiriliyor...');
        
        // Dosyayı indir
        const fileName = `Yatirim_Alani_Raporu_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        hideLoading(loadingId);
        showAlert('Excel dosyası başarıyla indirildi!', 'success');
        
        console.log('✅ Excel export tamamlandı:', fileName);
        
    } catch (error) {
        console.error('❌ Excel export hatası:', error);
        showAlert('Excel export sırasında hata oluştu: ' + error.message, 'error');
        if (loadingId) hideLoading(loadingId);
    }
}

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM yüklendi, Yatırım Alanı Raporu başlatılıyor...');
    
    // Supabase'in yüklenmesini bekle
    if (typeof supabase !== 'undefined') {
        initializeInvestmentReport();
    } else {
        console.log('⏳ Supabase yüklenmesi bekleniyor...');
        const checkSupabase = setInterval(() => {
            if (typeof supabase !== 'undefined') {
                clearInterval(checkSupabase);
                initializeInvestmentReport();
            }
        }, 100);
    }
});