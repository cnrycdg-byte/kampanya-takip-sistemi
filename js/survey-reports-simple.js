// ============================================
// ANKET RAPORLAMA - HIZLI TEST
// ============================================

console.log('Survey Reports Simple JS yüklendi');

// Global filtre değerleri
let currentFilters = {
    survey: '',
    channel: '',
    region: ''
};

// ============================================
// 0. FİLTRELERİ YÜKLE
// ============================================
async function loadFilters() {
    try {
        // Anketleri yükle
        const { data: surveys, error: surveyError } = await supabase
            .from('surveys')
            .select('id, title, month, year')
            .eq('status', 'active')
            .order('year', { ascending: false })
            .order('month', { ascending: false });
        
        if (!surveyError) {
            const surveySelect = document.getElementById('filter-survey');
            // Eski option'ları temizle (ilk "Tüm Anketler" hariç)
            while (surveySelect.options.length > 1) {
                surveySelect.remove(1);
            }
            // Yeni option'ları ekle
            surveys.forEach(s => {
                const option = document.createElement('option');
                option.value = s.id;
                option.textContent = `${s.title} (${s.month}/${s.year})`;
                surveySelect.appendChild(option);
            });
        }
        
        // Kanalları yükle
        const { data: channels, error: channelError } = await supabase
            .from('channels')
            .select('id, name')
            .order('name');
        
        if (!channelError) {
            const channelSelect = document.getElementById('filter-channel');
            // Eski option'ları temizle (ilk "Tüm Kanallar" hariç)
            while (channelSelect.options.length > 1) {
                channelSelect.remove(1);
            }
            // Yeni option'ları ekle
            channels.forEach(c => {
                const option = document.createElement('option');
                option.value = c.name;
                option.textContent = c.name;
                channelSelect.appendChild(option);
            });
        }
        
        // Bölgeleri yükle
        const { data: regions, error: regionError } = await supabase
            .from('regions')
            .select('id, name')
            .order('name');
        
        if (!regionError) {
            const regionSelect = document.getElementById('filter-region');
            // Eski option'ları temizle (ilk "Tüm Bölgeler" hariç)
            while (regionSelect.options.length > 1) {
                regionSelect.remove(1);
            }
            // Yeni option'ları ekle
            regions.forEach(r => {
                const option = document.createElement('option');
                option.value = r.name;
                option.textContent = r.name;
                regionSelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Filtre yükleme hatası:', error);
    }
}

// Filtreleri uygula
async function applyFilters() {
    currentFilters.survey = document.getElementById('filter-survey').value;
    currentFilters.channel = document.getElementById('filter-channel').value;
    currentFilters.region = document.getElementById('filter-region').value;
    
    console.log('Filtreler uygulanıyor:', currentFilters);
    
    // KPI'ları güncelle
    await updateKPIs();
    
    // Tüm verileri yeniden yükle
    await loadPromoterData();
    await loadInvestmentData();
    await loadBasketData();
    await loadGSMData();
}

// Fotoğrafları göster
function showPhotos(storeName, brand, areaType, photos) {
    if (!photos || photos.length === 0) {
        alert('Bu alan için fotoğraf bulunmuyor.');
        return;
    }
    
    let html = `
        <div class="modal fade" id="photoModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-images me-2"></i>
                            ${storeName} - ${brand} ${areaType}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
    `;
    
    photos.forEach((photo, index) => {
        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card">
                    <img src="${photo}" class="card-img-top" style="height: 200px; object-fit: cover;" 
                         alt="Fotoğraf ${index + 1}" onclick="openPhotoInNewTab('${photo}')">
                    <div class="card-body p-2">
                        <small class="text-muted">Fotoğraf ${index + 1}</small>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
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
    const oldModal = document.getElementById('photoModal');
    if (oldModal) {
        oldModal.remove();
    }
    
    // Yeni modal'ı ekle
    document.body.insertAdjacentHTML('beforeend', html);
    
    // Modal'ı göster
    const modal = new bootstrap.Modal(document.getElementById('photoModal'));
    modal.show();
}

// Fotoğrafı yeni sekmede aç
function openPhotoInNewTab(photoUrl) {
    window.open(photoUrl, '_blank');
}

// ============================================
// 1. DASHBOARD YÜKLE
// ============================================
async function loadSurveyDashboard() {
    console.log('Survey dashboard yükleniyor...');
    
    try {
        // Filtreleri yükle
        await loadFilters();
        
        // KPI verilerini hesapla ve güncelle
        await updateKPIs();
        
        // Tüm verileri yükle
        await loadPromoterData();
        await loadInvestmentData();
        await loadBasketData();
        await loadGSMData();
        
    } catch (error) {
        console.error('Dashboard yükleme hatası:', error);
    }
}

// KPI'ları güncelle
async function updateKPIs() {
    try {
        // Seçili anketi al
        const surveyId = currentFilters.survey || document.getElementById('filter-survey').value;
        
        if (!surveyId) {
            console.log('Anket seçilmedi, KPI güncellenmedi');
            return;
        }
        
        // Ankete atanan tüm mağazaları çek
        // Önce survey_responses'dan katılmış mağazaları bul
        const { data: responseStores, error: responseStoreError } = await supabase
            .from('survey_responses')
            .select('store_id, stores(id, name, channel_id, region_id, channels(name), regions(name))')
            .eq('survey_id', surveyId);
        
        if (responseStoreError) {
            console.error('Mağaza bilgisi çekme hatası:', responseStoreError);
            throw responseStoreError;
        }
        
        // Atanan tüm mağazaları al (survey_store_assignments'dan)
        const { data: assignments, error: assignmentError } = await supabase
            .from('survey_store_assignments')
            .select('store_id, stores(id, name, channels(name), regions(name))')
            .eq('survey_id', surveyId);
        
        if (assignmentError) {
            console.warn('⚠️ survey_store_assignments bulunamadı, responses kullanılıyor:', assignmentError);
            // Fallback: sadece anket başlatmış mağazalar
            const uniqueStoreIds = [...new Set(responseStores.map(r => r.store_id))];
            var assignedStores = uniqueStoreIds.map(storeId => {
                const storeData = responseStores.find(r => r.store_id === storeId);
                return {
                    id: storeData.stores.id,
                    name: storeData.stores.name,
                    channel_name: storeData.stores.channels?.name,
                    region_name: storeData.stores.regions?.name
                };
            });
        } else {
            // Tüm atanan mağazalar
            var assignedStores = assignments.map(a => ({
                id: a.stores.id,
                name: a.stores.name,
                channel_name: a.stores.channels?.name,
                region_name: a.stores.regions?.name
            }));
        }
        
        // Tamamlanan ve bekleyen yanıtları çek
        const { data: responses, error: responseError } = await supabase
            .from('survey_responses')
            .select('store_id, status')
            .eq('survey_id', surveyId);
        
        if (responseError) throw responseError;
        
        // Tamamlanan ve bekleyen mağazaları ayır
        const completedStoreIds = responses.filter(r => r.status === 'completed').map(r => r.store_id);
        const pendingStoreIds = responses.filter(r => r.status === 'pending' || r.status === 'in_progress').map(r => r.store_id);
        
        const completedStores = assignedStores.filter(s => completedStoreIds.includes(s.id));
        const pendingStores = assignedStores.filter(s => 
            pendingStoreIds.includes(s.id) || // Anket başlatmış ama tamamlamamış
            !responses.some(r => r.store_id === s.id) // Anket hiç başlatmamış
        );
        
        console.log('📊 Mağaza durumları:', {
            assigned: assignedStores.length,
            completed: completedStores.length,
            pending: pendingStores.length,
            completedIds: completedStoreIds,
            pendingIds: pendingStoreIds
        });
        
        // Promotör ve yatırım alanı sayılarını hesapla
        let totalPromoters = 0;
        let totalInvestments = 0;
        let promotersByBrand = {};
        let investmentsByBrand = {};
        
        // Tamamlanan response ID'lerini al
        const completedResponseIds = responses
            .filter(r => r.status === 'completed')
            .map(r => responseStores.find(rs => rs.store_id === r.store_id))
            .filter(r => r)
            .map((_, index) => responseStores.filter(rs => responses[index] && rs.store_id === responses[index].store_id)[0])
            .map(r => r ? responseStores.indexOf(r) + 1 : null)
            .filter(id => id);
        
        // Basit yaklaşım: Survey ID'ye göre tüm yanıtları çek
        const { data: allResponses, error: allResponsesError } = await supabase
            .from('survey_responses')
            .select('id, status')
            .eq('survey_id', surveyId)
            .eq('status', 'completed');
        
        if (allResponsesError) throw allResponsesError;
        
        const completedIds = allResponses.map(r => r.id);
        
        // Tamamlanan yanıtlara ait cevapları çek
        const { data: completedAnswers, error: completedError } = await supabase
            .from('survey_answers')
            .select('answer_data, survey_questions(question_type)')
            .in('response_id', completedIds);
        
        // Promotör ve yatırım verilerini işle
        if (completedAnswers) {
            completedAnswers.forEach(answer => {
                if (answer.survey_questions?.question_type === 'promoter_count' && answer.answer_data?.brands) {
                    answer.answer_data.brands.forEach(brand => {
                        if (brand.count > 0) {
                            const brandName = brand.brand_label || brand.label || brand.custom_name || 'Diğer';
                            promotersByBrand[brandName] = (promotersByBrand[brandName] || 0) + brand.count;
                            totalPromoters += brand.count;
                        }
                    });
                }
                
                if (answer.survey_questions?.question_type === 'investment_area' && answer.answer_data?.areas) {
                    answer.answer_data.areas.forEach(area => {
                        const brandName = area.brand || area.custom_brand || 'Diğer';
                        const areaType = area.type || 'other';
                        
                        if (!investmentsByBrand[brandName]) {
                            investmentsByBrand[brandName] = { wall: 0, middle: 0, other: 0 };
                        }
                        investmentsByBrand[brandName][areaType]++;
                        totalInvestments++;
                    });
                }
            });
        }
        
        // Global dashboardData'yı güncelle
        if (typeof dashboardData !== 'undefined') {
            dashboardData.assignedStores = assignedStores;
            dashboardData.completedStores = completedStores;
            dashboardData.pendingStores = pendingStores;
            dashboardData.promotersByBrand = promotersByBrand;
            dashboardData.investmentsByBrand = investmentsByBrand;
        }
        
        // KPI kartlarını güncelle
        document.getElementById('kpi-assigned-stores').textContent = assignedStores.length;
        document.getElementById('kpi-completed-stores').textContent = completedStores.length;
        document.getElementById('kpi-pending-stores').textContent = pendingStores.length;
        
        const completionRate = assignedStores.length > 0 
            ? ((completedStores.length / assignedStores.length) * 100).toFixed(1) 
            : 0;
        document.getElementById('kpi-completion-rate').textContent = completionRate + '%';
        
        document.getElementById('kpi-total-promoters').textContent = totalPromoters;
        document.getElementById('kpi-total-investments').textContent = totalInvestments;
        
        console.log('✅ KPI güncellendi:', { 
            assigned: assignedStores.length, 
            completed: completedStores.length, 
            pending: pendingStores.length,
            promoters: totalPromoters,
            investments: totalInvestments
        });
        
    } catch (error) {
        console.error('KPI güncelleme hatası:', error);
    }
}

// ============================================
// 2. PROMOTÖR VERİLERİ
// ============================================
async function loadPromoterData() {
    try {
        // EN BASIT YAKLAŞIM - sadece survey_responses
        let query = supabase
            .from('survey_responses')
            .select('id, store_id, submitted_at, survey_id')
            .eq('status', 'completed');
        
        // Filtreleri uygula
        if (currentFilters.survey) query = query.eq('survey_id', currentFilters.survey);
        
        const { data: responses, error: responseError } = await query
            .limit(100);
        
        if (responseError) throw responseError;
        
        console.log('Responses:', responses);
        
        // Şimdi her response için gerekli verileri çek
        const allData = [];
        
        for (const response of responses) {
            // Store bilgilerini çek
            const { data: store, error: storeError } = await supabase
                .from('stores')
                .select('name, channel_id, region_id')
                .eq('id', response.store_id)
                .single();
            
            if (storeError) continue;
            
            // Channel bilgilerini çek
            const { data: channel, error: channelError } = await supabase
                .from('channels')
                .select('name')
                .eq('id', store.channel_id)
                .single();
            
            // Region bilgilerini çek
            const { data: region, error: regionError } = await supabase
                .from('regions')
                .select('name')
                .eq('id', store.region_id)
                .single();
            
            // Channel ve region filtrelerini kontrol et
            let includeResponse = true;
            
            if (currentFilters.channel && channel?.name !== currentFilters.channel) {
                includeResponse = false;
            }
            if (currentFilters.region && region?.name !== currentFilters.region) {
                includeResponse = false;
            }
            
            if (!includeResponse) continue;
            
            // Survey answers'ları çek
            const { data: answers, error: answerError } = await supabase
                .from('survey_answers')
                .select(`
                    answer_data,
                    survey_questions!inner(question_type)
                `)
                .eq('response_id', response.id)
                .eq('survey_questions.question_type', 'promoter_count');
            
            if (!answerError && answers.length > 0) {
                allData.push({
                    ...response,
                    stores: store,
                    channels: channel || { name: '-' },
                    regions: region || { name: '-' },
                    survey_answers: answers
                });
            }
        }
        
        const data = allData;
        
        console.log('=== PROMOTER DATA DEBUG ===');
        console.log('Raw data:', data);
        console.log('Data length:', data.length);
        
        if (data.length > 0) {
            console.log('First row:', data[0]);
            console.log('First row answer_data:', data[0].answer_data);
            console.log('First row brand_data:', data[0].brand_data);
        }
        
        let html = `
            <table class="table table-sm table-hover">
                <thead class="table-light">
                    <tr>
                        <th>Mağaza</th>
                        <th>Kanal</th>
                        <th>Bölge</th>
                        <th>Anket</th>
                        <th>Markalar</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        if (data.length === 0) {
            html += '<tr><td colspan="5" class="text-center text-muted py-4">Veri bulunamadı</td></tr>';
        } else {
            // Mağazaları grupla (tekrarları önlemek için)
            const storeData = {};
            
            data.forEach(row => {
                const storeKey = row.store_id;
                
                if (!storeData[storeKey]) {
                    storeData[storeKey] = {
                        store_name: row.stores.name,
                        channel_name: row.channels.name,
                        region_name: row.regions.name,
                        brands: []
                    };
                }
                
                // Answer_data'dan brands array'ini çıkar
                console.log('Survey answers array:', row.survey_answers);
                console.log('Survey answers length:', row.survey_answers?.length);
                
                if (row.survey_answers && row.survey_answers.length > 0) {
                    const answerData = row.survey_answers[0].answer_data;
                    console.log('Answer data:', answerData);
                    console.log('Answer data brands:', answerData.brands);
                    if (answerData.brands) {
                        console.log('Brands array length:', answerData.brands.length);
                        answerData.brands.forEach((brand, index) => {
                            console.log(`Brand ${index}:`, brand);
                        });
                    } else {
                        console.log('❌ Brands array is null or undefined!');
                        console.log('Full answer_data structure:', JSON.stringify(answerData, null, 2));
                    }
                
                    if (answerData && answerData.brands) {
                        answerData.brands.forEach(brand => {
                            if (brand.selected && brand.count > 0) { // Sadece count > 0 olanları göster
                                const brandName = brand.brand_label || brand.label || brand.brand || 'Bilinmeyen';
                                const customName = brand.custom_name;
                                const finalBrandName = customName || brandName;
                                storeData[storeKey].brands.push(`${finalBrandName} (${brand.count})`);
                            }
                        });
                    }
                }
            });
            
            Object.values(storeData).forEach(store => {
                const brandList = store.brands.join(', ') || '-';
                
                html += `
                    <tr>
                        <td>${store.store_name}</td>
                        <td>${store.channel_name || '-'}</td>
                        <td>${store.region_name || '-'}</td>
                        <td><small>Anket</small></td>
                        <td><small>${brandList}</small></td>
                    </tr>
                `;
            });
        }
        
        html += '</tbody></table>';
        document.getElementById('promoter-data-table').innerHTML = html;
        
    } catch (error) {
        console.error('Promotör verileri yükleme hatası:', error);
        document.getElementById('promoter-data-table').innerHTML = 
            `<div class="alert alert-danger">Hata: ${error.message}</div>`;
    }
}

// ============================================
// 3. YATIRIM ALANI VERİLERİ
// ============================================
async function loadInvestmentData() {
    try {
        // EN BASIT YAKLAŞIM - sadece survey_responses
        let query = supabase
            .from('survey_responses')
            .select('id, store_id, submitted_at, survey_id')
            .eq('status', 'completed');
        
        // Filtreleri uygula
        if (currentFilters.survey) query = query.eq('survey_id', currentFilters.survey);
        
        const { data: responses, error: responseError } = await query
            .limit(100);
        
        if (responseError) throw responseError;
        
        console.log('Investment Responses:', responses);
        
        // Şimdi her response için gerekli verileri çek
        const allData = [];
        
        for (const response of responses) {
            // Store bilgilerini çek
            const { data: store, error: storeError } = await supabase
                .from('stores')
                .select('name, channel_id, region_id')
                .eq('id', response.store_id)
                .single();
            
            if (storeError) continue;
            
            // Channel bilgilerini çek
            const { data: channel, error: channelError } = await supabase
                .from('channels')
                .select('name')
                .eq('id', store.channel_id)
                .single();
            
            // Region bilgilerini çek
            const { data: region, error: regionError } = await supabase
                .from('regions')
                .select('name')
                .eq('id', store.region_id)
                .single();
            
            // Channel ve region filtrelerini kontrol et
            let includeResponse = true;
            
            if (currentFilters.channel && channel?.name !== currentFilters.channel) {
                includeResponse = false;
            }
            if (currentFilters.region && region?.name !== currentFilters.region) {
                includeResponse = false;
            }
            
            if (!includeResponse) continue;
            
            // Survey answers'ları çek
            const { data: answers, error: answerError } = await supabase
                .from('survey_answers')
                .select(`
                    answer_data,
                    photos,
                    survey_questions!inner(question_type)
                `)
                .eq('response_id', response.id)
                .eq('survey_questions.question_type', 'investment_area');
            
            if (!answerError && answers.length > 0) {
                allData.push({
                    ...response,
                    stores: store,
                    channels: channel || { name: '-' },
                    regions: region || { name: '-' },
                    survey_answers: answers
                });
            }
        }
        
        const data = allData;
        
        console.log('=== INVESTMENT DATA DEBUG ===');
        console.log('Raw data:', data);
        console.log('Data length:', data.length);
        
        if (data.length > 0) {
            console.log('First row:', data[0]);
            console.log('First row answer_data:', data[0].answer_data);
            console.log('First row area_data:', data[0].area_data);
            console.log('First row photos:', data[0].photos);
        }
        
        let html = `
            <table class="table table-sm table-hover">
                <thead class="table-light">
                    <tr>
                        <th>Mağaza</th>
                        <th>Kanal</th>
                        <th>Bölge</th>
                        <th>Marka</th>
                        <th>Alan Tipi</th>
                        <th>Fotoğraf</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        if (data.length === 0) {
            html += '<tr><td colspan="6" class="text-center text-muted py-4">Veri bulunamadı</td></tr>';
        } else {
            // Mağazaları grupla
            const storeData = {};
            
            data.forEach(row => {
                const storeKey = row.store_id + '_' + row.id;
                
                if (!storeData[storeKey]) {
                    storeData[storeKey] = {
                        store_name: row.stores.name,
                        channel_name: row.channels.name,
                        region_name: row.regions.name,
                        photos: [],
                        areas: []
                    };
                }
                
                // Answer_data'dan areas array'ini çıkar
                console.log('Investment survey answers array:', row.survey_answers);
                console.log('Investment survey answers length:', row.survey_answers?.length);
                
                if (row.survey_answers && row.survey_answers.length > 0) {
                    const answerData = row.survey_answers[0].answer_data;
                    const photos = row.survey_answers[0].photos;
                    console.log('Investment answer data:', answerData);
                    console.log('Investment answer data areas:', answerData.areas);
                    console.log('Investment photos:', photos);
                    if (answerData.areas) {
                        console.log('Areas array length:', answerData.areas.length);
                        answerData.areas.forEach((area, index) => {
                            console.log(`Area ${index}:`, area);
                        });
                    } else {
                        console.log('❌ Areas array is null or undefined!');
                        console.log('Full investment answer_data structure:', JSON.stringify(answerData, null, 2));
                    }
                    
                    // Photos'u storeData'ya ata
                    storeData[storeKey].photos = photos || [];
                
                    if (answerData && answerData.areas) {
                        answerData.areas.forEach(area => {
                            // Area tipini düzelt
                            let areaType = '';
                            if (area.type === 'wall') areaType = 'Duvar Standı';
                            else if (area.type === 'middle') areaType = 'Orta Alan Standı';
                            else if (area.type === 'other') areaType = 'Diğer';
                            else areaType = area.type || '-';
                            
                            // Area'ya category_label ekle
                            const areaWithLabel = {
                                ...area,
                                category_label: areaType,
                                brand: area.brand || area.custom_brand || 'Bilinmeyen'
                            };
                            
                            storeData[storeKey].areas.push(areaWithLabel);
                        });
                    }
                }
            });
            
            Object.values(storeData).forEach(store => {
                        store.areas.forEach((area, areaIndex) => {
                            // Area içindeki photos array'ini kullan
                            const areaPhotos = area.photos || [];
                            const photoCount = areaPhotos.length;
                            
                            console.log(`Area ${areaIndex} photos:`, areaPhotos);
                            console.log(`Area ${areaIndex} photo count:`, photoCount);
                            
                            const photoButton = photoCount > 0 
                                ? `<button class="btn btn-sm btn-primary" onclick="showPhotos('${store.store_name}', '${area.brand}', '${area.category_label}', ${JSON.stringify(areaPhotos).replace(/"/g, '&quot;')})">
                                    <i class="fas fa-images me-1"></i>${photoCount} fotoğraf
                                   </button>`
                                : `<span class="badge bg-secondary">0 fotoğraf</span>`;
                            
                            html += `
                                <tr>
                                    <td>${store.store_name}</td>
                                    <td>${store.channel_name || '-'}</td>
                                    <td>${store.region_name || '-'}</td>
                                    <td>${area.brand || '-'}</td>
                                    <td>${area.category_label || '-'}</td>
                                    <td>${photoButton}</td>
                                </tr>
                            `;
                        });
            });
        }
        
        html += '</tbody></table>';
        document.getElementById('investment-data-table').innerHTML = html;
        
    } catch (error) {
        console.error('Yatırım alanı verileri yükleme hatası:', error);
        document.getElementById('investment-data-table').innerHTML = 
            `<div class="alert alert-danger">Hata: ${error.message}</div>`;
    }
}

// ============================================
// 4. SEPET VERİLERİ
// ============================================
async function loadBasketData() {
    try {
        let query = supabase
            .from('v_basket_report')
            .select('*');
        
        // Filtreleri uygula
        if (currentFilters.survey) query = query.eq('survey_id', currentFilters.survey);
        if (currentFilters.channel) query = query.eq('channel_name', currentFilters.channel);
        if (currentFilters.region) query = query.eq('region_name', currentFilters.region);
        
        const { data, error } = await query
            .order('store_name')
            .limit(200);
        
        if (error) throw error;
        
        console.log('Sepet verileri:', data);
        
        let html = `
            <table class="table table-sm table-hover">
                <thead class="table-light">
                    <tr>
                        <th>Mağaza</th>
                        <th>Kanal</th>
                        <th>Marka</th>
                        <th>Ürün Adı</th>
                        <th>Artikel</th>
                        <th>Fiyat (TL)</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        if (data.length === 0) {
            html += '<tr><td colspan="6" class="text-center text-muted py-4">Veri bulunamadı</td></tr>';
        } else {
            // Mağazaları grupla
            const storeData = {};
            
            data.forEach(row => {
                const storeKey = row.store_id + '_' + row.response_id;
                
                if (!storeData[storeKey]) {
                    storeData[storeKey] = {
                        store_name: row.store_name,
                        channel_name: row.channel_name,
                        basket_count: row.basket_count || 0,
                        baskets: []
                    };
                }
                
                // Basket_data JSONB field'den gelen veriyi parse et
                if (row.basket_data) {
                    const basket = row.basket_data;
                    storeData[storeKey].baskets.push(basket);
                }
            });
            
            Object.values(storeData).forEach(store => {
                // Başlık satırı
                html += `
                    <tr class="table-secondary">
                        <td colspan="6">
                            <strong>${store.store_name}</strong> - ${store.channel_name || '-'} 
                            <span class="badge bg-primary">${store.basket_count} sepet</span>
                        </td>
                    </tr>
                `;
                
                // Sepet detayları
                store.baskets.forEach(basket => {
                    html += `
                        <tr>
                            <td></td>
                            <td></td>
                            <td>${basket.brand || '-'}</td>
                            <td>${basket.product_name || '-'}</td>
                            <td>${basket.artikel || '-'}</td>
                            <td class="fw-bold">${parseFloat(basket.price || 0).toFixed(2)} TL</td>
                        </tr>
                    `;
                });
            });
        }
        
        html += '</tbody></table>';
        document.getElementById('basket-data-table').innerHTML = html;
        
    } catch (error) {
        console.error('Sepet verileri yükleme hatası:', error);
        document.getElementById('basket-data-table').innerHTML = 
            `<div class="alert alert-danger">Hata: ${error.message}</div>`;
    }
}

// ============================================
// 5. GSM AKSESUAR VERİLERİ
// ============================================
async function loadGSMData() {
    try {
        let query = supabase
            .from('v_gsm_accessory_report')
            .select('*');
        
        // Filtreleri uygula
        if (currentFilters.survey) query = query.eq('survey_id', currentFilters.survey);
        if (currentFilters.channel) query = query.eq('channel_name', currentFilters.channel);
        if (currentFilters.region) query = query.eq('region_name', currentFilters.region);
        
        const { data, error } = await query
            .order('store_name')
            .limit(200);
        
        if (error) throw error;
        
        console.log('GSM Aksesuar verileri:', data);
        
        let html = `
            <table class="table table-sm table-hover">
                <thead class="table-light">
                    <tr>
                        <th>Mağaza</th>
                        <th>Kanal</th>
                        <th>Marka</th>
                        <th>Ürün Adı</th>
                        <th>Artikel</th>
                        <th>Fiyat (TL)</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        if (data.length === 0) {
            html += '<tr><td colspan="6" class="text-center text-muted py-4">Veri bulunamadı</td></tr>';
        } else {
            // Mağazaları grupla
            const storeData = {};
            
            data.forEach(row => {
                const storeKey = row.store_id + '_' + row.response_id;
                
                if (!storeData[storeKey]) {
                    storeData[storeKey] = {
                        store_name: row.store_name,
                        channel_name: row.channel_name,
                        gsm_count: row.gsm_accessory_count || 0,
                        accessories: []
                    };
                }
                
                // Accessory_data JSONB field'den gelen veriyi parse et
                if (row.accessory_data) {
                    const accessory = row.accessory_data;
                    storeData[storeKey].accessories.push(accessory);
                }
            });
            
            Object.values(storeData).forEach(store => {
                // Başlık satırı
                html += `
                    <tr class="table-secondary">
                        <td colspan="6">
                            <strong>${store.store_name}</strong> - ${store.channel_name || '-'} 
                            <span class="badge bg-primary">${store.gsm_count} sepet</span>
                        </td>
                    </tr>
                `;
                
                // GSM Aksesuar detayları
                store.accessories.forEach(acc => {
                    html += `
                        <tr>
                            <td></td>
                            <td></td>
                            <td>${acc.brand || '-'}</td>
                            <td>${acc.product_name || '-'}</td>
                            <td>${acc.artikel || '-'}</td>
                            <td class="fw-bold">${parseFloat(acc.price || 0).toFixed(2)} TL</td>
                        </tr>
                    `;
                });
            });
        }
        
        html += '</tbody></table>';
        document.getElementById('gsm-data-table').innerHTML = html;
        
    } catch (error) {
        console.error('GSM Aksesuar verileri yükleme hatası:', error);
        document.getElementById('gsm-data-table').innerHTML = 
            `<div class="alert alert-danger">Hata: ${error.message}</div>`;
    }
}

console.log('Survey Reports Simple JS tamamen yüklendi ✅');

