// Sepet Raporu JavaScript Dosyası

let basketReportData = {
    surveys: [],
    stores: [],
    regions: [],
    channels: [],
    brands: [],
    basketAnalysis: [],
    filteredData: [],
    currentFilters: {
        survey: [],
        region: '',
        channel: '',
        store: '',
        brand: []
    }
};

// Sepet raporu verilerini yükle
async function loadBasketReportData() {
    try {
        console.log('🔍 Sepet raporu verileri yükleniyor...');
        
        // Anketleri yükle - aktif anketler
        const { data: surveys, error: surveysError } = await supabase
            .from('surveys')
            .select('id, title, status')
            .eq('status', 'active')
            .order('created_at', { ascending: false });
        
        if (surveysError) throw surveysError;
        
        // Mağazaları yükle
        const { data: stores, error: storesError } = await supabase
            .from('stores')
            .select('id, name, region_id, channel_id');
        
        if (storesError) {
            console.warn('Mağaza verisi yüklenemedi, devam ediliyor...', storesError);
        }
        
        // Bölgeleri yükle
        const { data: regions, error: regionsError } = await supabase
            .from('regions')
            .select('id, name');
        
        if (regionsError) {
            console.warn('Bölge verisi yüklenemedi, devam ediliyor...', regionsError);
        }
        
        // Kanalları yükle
        const { data: channels, error: channelsError } = await supabase
            .from('channels')
            .select('id, name');
        
        if (channelsError) {
            console.warn('Kanal verisi yüklenemedi, devam ediliyor...', channelsError);
        }
        
        // Markaları yükle
        const { data: brands, error: brandsError } = await supabase
            .from('brands')
            .select('name');
        
        if (brandsError) {
            console.warn('Marka verisi yüklenemedi, devam ediliyor...', brandsError);
        }
        
        // Sepet verilerini analiz et
        const { data: allAnswers, error: answersError } = await supabase
            .from('survey_answers')
            .select('*, survey_responses(survey_id, store_id)')
            .limit(200);
        
        if (answersError) {
            console.warn('Survey answers verisi yüklenemedi, devam ediliyor...', answersError);
        }
        
        // Sepet analizi yap
        const basketAnalysis = [];
        
        console.log('🔍 Sepet analizi başlıyor, toplam cevap:', allAnswers.length);
        
        for (const item of allAnswers) {
            if (!item.answer_data) continue;
            
            console.log('🔍 Cevap analiz ediliyor:', { id: item.id, question_type: item.question_type, survey_response_id: item.survey_response_id, survey_responses: item.survey_responses });
            
            let answerData = {};
            if (typeof item.answer_data === 'string') {
                try {
                    answerData = JSON.parse(item.answer_data);
                } catch (e) {
                    continue;
                }
            } else {
                answerData = item.answer_data;
            }
            
            // Sepet verilerini ara
            let baskets = [];
            const possibleKeys = ['baskets', 'basket', 'sepet', 'sepetler', 'basket_data', 'basket_items', 'items', 'products', 'urunler', 'data'];
            
            console.log('🔍 Answer data analiz ediliyor:', answerData);
            console.log('🔍 Answer data anahtarları:', Object.keys(answerData));
            
            for (const key of possibleKeys) {
                if (answerData[key]) {
                    console.log('🔍 Sepet verisi bulundu, key:', key, 'value:', answerData[key]);
                    console.log('🔍 Sepet verisi tipi:', typeof answerData[key]);
                    console.log('🔍 Sepet verisi array mi:', Array.isArray(answerData[key]));
                    
                    if (Array.isArray(answerData[key])) {
                        baskets = answerData[key];
                        console.log('🔍 Array olarak alındı, uzunluk:', baskets.length);
                    } else if (typeof answerData[key] === 'object') {
                        baskets = [answerData[key]];
                        console.log('🔍 Object olarak array\'e çevrildi');
                    } else {
                        baskets = [{ value: answerData[key] }];
                        console.log('🔍 Diğer tip olarak array\'e çevrildi');
                    }
                    break;
                }
            }
            
            if (baskets.length > 0) {
                // Survey response bilgisini al
                let survey_id = null;
                let store_id = null;
                
                // Survey response bilgisini al
                if (item.survey_responses) {
                    survey_id = item.survey_responses.survey_id;
                    store_id = item.survey_responses.store_id;
                    console.log('✅ Survey response bilgisi alındı:', { survey_id, store_id });
                } else if (item.survey_response_id) {
                    try {
                        const { data: response, error: responseError } = await supabase
                            .from('survey_responses')
                            .select('survey_id, store_id')
                            .eq('id', item.survey_response_id)
                            .single();
                        
                        if (responseError) {
                            console.warn('Survey response bilgisi alınamadı:', responseError);
                        } else if (response) {
                            survey_id = response.survey_id;
                            store_id = response.store_id;
                            console.log('✅ Survey response bilgisi alındı:', { survey_id, store_id });
                        }
                    } catch (e) {
                        console.warn('Survey response bilgisi alınamadı:', e);
                    }
                }
                
                console.log('🔍 Sepet verisi bulundu:', { id: item.id, survey_id, store_id, baskets: baskets.length });
                
                // Sepet verilerini daha detaylı logla
                console.log('🔍 Sepet detayları:', baskets);
                
            // Sepet verilerini düzelt - iç içe geçmiş yapıyı düzelt
            let actualBaskets = [];
            
            baskets.forEach((basket, index) => {
                console.log(`🔍 Sepet ${index + 1} detayları:`, basket);
                console.log(`🔍 Sepet ${index + 1} tüm alanlar:`, Object.keys(basket));
                
                // Eğer basket içinde baskets array'i varsa, onu kullan
                if (basket.baskets && Array.isArray(basket.baskets)) {
                    console.log(`🔍 Sepet ${index + 1} içindeki baskets:`, basket.baskets);
                    actualBaskets = actualBaskets.concat(basket.baskets);
                    basket.baskets.forEach((innerBasket, innerIndex) => {
                        console.log(`🔍 Sepet ${index + 1} - İç Sepet ${innerIndex + 1}:`, innerBasket);
                        console.log(`🔍 Sepet ${index + 1} - İç Sepet ${innerIndex + 1} tüm alanlar:`, Object.keys(innerBasket));
                        
                        // İç sepet'in tüm değerlerini logla
                        Object.keys(innerBasket).forEach(key => {
                            console.log(`🔍 Sepet ${index + 1} - İç Sepet ${innerIndex + 1} - ${key}:`, innerBasket[key]);
                        });
                    });
                } else {
                    // Normal basket ise direkt ekle
                    actualBaskets.push(basket);
                    
                    // Normal basket'in tüm değerlerini logla
                    Object.keys(basket).forEach(key => {
                        console.log(`🔍 Sepet ${index + 1} - ${key}:`, basket[key]);
                    });
                }
            });
                
                console.log('🔍 Düzeltilmiş sepet verileri:', actualBaskets);
                
                // Her sepet öğesinin tüm alanlarını logla
                actualBaskets.forEach((basket, index) => {
                    console.log(`🔍 Sepet ${index + 1} TÜM ALANLAR:`, Object.keys(basket));
                    console.log(`🔍 Sepet ${index + 1} TÜM VERİLER:`, basket);
                });
                
                basketAnalysis.push({
                    id: item.id,
                    survey_response_id: item.survey_response_id,
                    survey_id: survey_id,
                    store_id: store_id,
                    baskets: actualBaskets,
                    created_at: item.created_at,
                    question_type: item.question_type
                });
            }
        }
        
        basketReportData.surveys = surveys || [];
        basketReportData.stores = stores || [];
        basketReportData.regions = regions || [];
        basketReportData.channels = channels || [];
        basketReportData.brands = brands || [];
        basketReportData.basketAnalysis = basketAnalysis;
        
        console.log('✅ Sepet raporu verileri yüklendi:', {
            surveys: basketReportData.surveys.length,
            stores: basketReportData.stores.length,
            regions: basketReportData.regions.length,
            channels: basketReportData.channels.length,
            brands: basketReportData.brands.length,
            basketAnalysis: basketReportData.basketAnalysis.length
        });
        
        console.log('🔍 Sepet analizi detayları:', basketReportData.basketAnalysis);
        
        // Her sepet verisinin survey_id'sini kontrol et
        basketReportData.basketAnalysis.forEach((item, index) => {
            console.log(`🔍 Sepet ${index + 1}:`, { id: item.id, survey_id: item.survey_id, store_id: item.store_id, baskets: item.baskets.length });
            console.log(`🔍 Sepet ${index + 1} baskets detayları:`, item.baskets);
            
            // Her basket'in tüm alanlarını detaylı logla
            item.baskets.forEach((basket, basketIndex) => {
                console.log(`🔍 Sepet ${index + 1} - Basket ${basketIndex + 1} TÜM ALANLAR:`, Object.keys(basket));
                console.log(`🔍 Sepet ${index + 1} - Basket ${basketIndex + 1} TÜM VERİLER:`, basket);
                
                // Eğer basket içinde başka objeler varsa onları da logla
                Object.keys(basket).forEach(key => {
                    if (typeof basket[key] === 'object' && basket[key] !== null) {
                        console.log(`🔍 Sepet ${index + 1} - Basket ${basketIndex + 1} - ${key}:`, basket[key]);
                    }
                });
            });
        });
        
        // Anket verisi yoksa survey_store_assignments'tan al
        if (basketReportData.surveys.length === 0) {
            console.log('⚠️ Anket verisi bulunamadı, survey_store_assignments\'tan alınıyor...');
            try {
                const { data: assignments, error: assignError } = await supabase
                    .from('survey_store_assignments')
                    .select('survey_id, surveys(id, title, status)')
                    .eq('surveys.status', 'active');
                
                if (!assignError && assignments) {
                    const uniqueSurveys = assignments
                        .map(a => a.surveys)
                        .filter((survey, index, self) => 
                            index === self.findIndex(s => s.id === survey.id)
                        );
                    basketReportData.surveys = uniqueSurveys;
                    console.log('✅ Survey_store_assignments\'tan anketler alındı:', uniqueSurveys.length);
                }
            } catch (error) {
                console.warn('Survey_store_assignments\'tan anket alınamadı:', error);
            }
        }
        
        // Mağaza verisi yoksa stores tablosundan al
        if (basketReportData.stores.length === 0) {
            console.log('⚠️ Mağaza verisi bulunamadı, stores tablosundan alınıyor...');
            try {
                const { data: allStores, error: storeError } = await supabase
                    .from('stores')
                    .select('*');
                
                if (!storeError && allStores) {
                    basketReportData.stores = allStores;
                    console.log('✅ Stores tablosundan mağazalar alındı:', allStores.length);
                } else {
                    console.error('❌ Stores tablosu hatası:', storeError);
                }
            } catch (error) {
                console.warn('Stores tablosundan mağaza alınamadı:', error);
            }
        }
        
        // Eğer hala mağaza verisi yoksa, mevcut verilerden al
        if (basketReportData.stores.length === 0) {
            console.log('⚠️ Stores tablosundan veri alınamadı, mevcut verilerden alınıyor...');
            try {
                const { data: allStores, error: filteredStoreError } = await supabase
                    .from('stores')
                    .select('id, name, region, channel');
                
                if (!filteredStoreError && allStores) {
                    basketReportData.stores = allStores;
                    console.log('✅ Stores tablosundan mağazalar alındı (filtered):', allStores.length);
                } else {
                    console.error('❌ Stores tablosu filtered hatası:', filteredStoreError);
                }
            } catch (error) {
                console.warn('Stores tablosundan mağaza alınamadı (filtered):', error);
            }
        }
        
        // Bölge verisi yoksa stores tablosundan unique region_id'leri al
        if (basketReportData.regions.length === 0) {
            console.log('⚠️ Bölge verisi bulunamadı, stores tablosundan alınıyor...');
            try {
                const { data: allStores, error: storeError } = await supabase
                    .from('stores')
                    .select('region_id');
                
                if (!storeError && allStores) {
                    console.log('🔍 Tüm mağaza verileri (bölge):', allStores);
                    const uniqueRegions = allStores
                        .map(s => s.region_id)
                        .filter((region_id, index, self) => 
                            region_id && index === self.findIndex(r => r === region_id)
                        )
                        .map(region_id => ({ id: region_id, name: region_id }));
                    
                    console.log('🔍 Unique bölgeler:', uniqueRegions);
                    basketReportData.regions = uniqueRegions;
                    console.log('✅ Stores tablosundan bölgeler alındı:', uniqueRegions.length);
                } else {
                    console.error('❌ Stores tablosu bölge hatası:', storeError);
                }
            } catch (error) {
                console.warn('Stores tablosundan bölge alınamadı:', error);
            }
        }
        
        // Eğer hala bölge verisi yoksa, mevcut mağaza verilerinden al
        if (basketReportData.regions.length === 0) {
            console.log('⚠️ Stores tablosundan bölge verisi alınamadı, mevcut mağaza verilerinden alınıyor...');
            try {
                if (basketReportData.stores && basketReportData.stores.length > 0) {
                    const uniqueRegions = basketReportData.stores
                        .map(s => s.region_id)
                        .filter((region_id, index, self) => 
                            region_id && index === self.findIndex(r => r === region_id)
                        )
                        .map(region_id => ({ id: region_id, name: region_id }));
                    
                    basketReportData.regions = uniqueRegions;
                    console.log('✅ Mevcut mağaza verilerinden bölgeler alındı:', uniqueRegions.length);
                } else {
                    console.warn('⚠️ Mevcut mağaza verisi bulunamadı');
                }
            } catch (error) {
                console.warn('Mevcut mağaza verilerinden bölge alınamadı:', error);
            }
        }
        
        // Kanal verisi yoksa stores tablosundan unique channel_id'leri al
        if (basketReportData.channels.length === 0) {
            console.log('⚠️ Kanal verisi bulunamadı, stores tablosundan alınıyor...');
            try {
                const { data: allStores, error: storeError } = await supabase
                    .from('stores')
                    .select('channel_id');
                
                if (!storeError && allStores) {
                    console.log('🔍 Tüm mağaza verileri (kanal):', allStores);
                    const uniqueChannels = allStores
                        .map(s => s.channel_id)
                        .filter((channel_id, index, self) => 
                            channel_id && index === self.findIndex(c => c === channel_id)
                        )
                        .map(channel_id => ({ id: channel_id, name: channel_id }));
                    
                    console.log('🔍 Unique kanallar:', uniqueChannels);
                    basketReportData.channels = uniqueChannels;
                    console.log('✅ Stores tablosundan kanallar alındı:', uniqueChannels.length);
                } else {
                    console.error('❌ Stores tablosu kanal hatası:', storeError);
                }
            } catch (error) {
                console.warn('Stores tablosundan kanal alınamadı:', error);
            }
        }
        
        // Eğer hala kanal verisi yoksa, mevcut mağaza verilerinden al
        if (basketReportData.channels.length === 0) {
            console.log('⚠️ Stores tablosundan kanal verisi alınamadı, mevcut mağaza verilerinden alınıyor...');
            try {
                if (basketReportData.stores && basketReportData.stores.length > 0) {
                    const uniqueChannels = basketReportData.stores
                        .map(s => s.channel_id)
                        .filter((channel_id, index, self) => 
                            channel_id && index === self.findIndex(c => c === channel_id)
                        )
                        .map(channel_id => ({ id: channel_id, name: channel_id }));
                    
                    basketReportData.channels = uniqueChannels;
                    console.log('✅ Mevcut mağaza verilerinden kanallar alındı:', uniqueChannels.length);
                } else {
                    console.warn('⚠️ Mevcut mağaza verisi bulunamadı');
                }
            } catch (error) {
                console.warn('Mevcut mağaza verilerinden kanal alınamadı:', error);
            }
        }
        
        // Marka verisi yoksa survey_answers'tan al
        if (basketReportData.brands.length === 0) {
            console.log('⚠️ Marka verisi bulunamadı, survey_answers\'tan alınıyor...');
            try {
                const { data: allAnswers, error: answersError } = await supabase
                    .from('survey_answers')
                    .select('answer_data')
                    .limit(100);
                
                if (!answersError && allAnswers) {
                    const brands = new Set();
                    allAnswers.forEach(answer => {
                        try {
                            let answerData = answer.answer_data;
                            if (typeof answerData === 'string') {
                                answerData = JSON.parse(answerData);
                            }
                            
                            // Sepet verilerinden markaları çıkar
                            if (answerData && answerData.baskets) {
                                answerData.baskets.forEach(basket => {
                                    if (basket.brand) brands.add(basket.brand);
                                });
                            }
                        } catch (e) {
                            // Parse hatası, devam et
                        }
                    });
                    
                    basketReportData.brands = Array.from(brands).map(brand => ({ name: brand }));
                    console.log('✅ Survey_answers\'tan markalar alındı:', basketReportData.brands.length);
                }
            } catch (error) {
                console.warn('Survey_answers\'tan marka alınamadı:', error);
            }
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Sepet raporu verileri yükleme hatası:', error);
        return false;
    }
}

// Filtreleri doldur
function populateBasketFilters() {
    try {
        // Anket filtreleri
        const surveyFilter = document.getElementById('basket-filter-survey');
        if (surveyFilter) {
            surveyFilter.innerHTML = '<option value="">Anket seçin...</option>';
            if (basketReportData.surveys && basketReportData.surveys.length > 0) {
                basketReportData.surveys.forEach(survey => {
                    surveyFilter.innerHTML += `<option value="${survey.id}">${survey.title}</option>`;
                });
                console.log('✅ Anket filtresi dolduruldu:', basketReportData.surveys.length);
            } else {
                console.warn('⚠️ Anket verisi bulunamadı');
            }
        }
        
        // Bölge filtreleri
        const regionFilter = document.getElementById('basket-filter-region');
        if (regionFilter) {
            regionFilter.innerHTML = '<option value="">Tüm Bölgeler</option>';
            if (basketReportData.regions && basketReportData.regions.length > 0) {
                basketReportData.regions.forEach(region => {
                    regionFilter.innerHTML += `<option value="${region.id}">${region.name}</option>`;
                });
                console.log('✅ Bölge filtresi dolduruldu:', basketReportData.regions.length);
            } else {
                console.warn('⚠️ Bölge verisi bulunamadı');
            }
        }
        
        // Kanal filtreleri
        const channelFilter = document.getElementById('basket-filter-channel');
        if (channelFilter) {
            channelFilter.innerHTML = '<option value="">Tüm Kanallar</option>';
            if (basketReportData.channels && basketReportData.channels.length > 0) {
                basketReportData.channels.forEach(channel => {
                    channelFilter.innerHTML += `<option value="${channel.id}">${channel.name}</option>`;
                });
                console.log('✅ Kanal filtresi dolduruldu:', basketReportData.channels.length);
            } else {
                console.warn('⚠️ Kanal verisi bulunamadı');
            }
        }
        
        // Mağaza filtreleri
        const storeFilter = document.getElementById('basket-filter-store');
        if (storeFilter) {
            storeFilter.innerHTML = '<option value="">Tüm Mağazalar</option>';
            if (basketReportData.stores && basketReportData.stores.length > 0) {
                basketReportData.stores.forEach(store => {
                    storeFilter.innerHTML += `<option value="${store.id}">${store.name}</option>`;
                });
                console.log('✅ Mağaza filtresi dolduruldu:', basketReportData.stores.length);
            } else {
                console.warn('⚠️ Mağaza verisi bulunamadı');
            }
        }
        
        // Marka filtreleri
        const brandFilter = document.getElementById('basket-filter-brand');
        if (brandFilter) {
            brandFilter.innerHTML = '<option value="">Marka seçin...</option>';
            if (basketReportData.brands && basketReportData.brands.length > 0) {
                basketReportData.brands.forEach(brand => {
                    brandFilter.innerHTML += `<option value="${brand.name}">${brand.name}</option>`;
                });
                console.log('✅ Marka filtresi dolduruldu:', basketReportData.brands.length);
            } else {
                console.warn('⚠️ Marka verisi bulunamadı');
            }
        }
        
        // Mağaza bazlı sepet listesi dropdown'ları
        const basketStoreSelect = document.getElementById('basket-store-select');
        if (basketStoreSelect) {
            basketStoreSelect.innerHTML = '<option value="">Mağaza seçin...</option>';
            if (basketReportData.stores && basketReportData.stores.length > 0) {
                basketReportData.stores.forEach(store => {
                    basketStoreSelect.innerHTML += `<option value="${store.id}">${store.name}</option>`;
                });
                console.log('✅ Mağaza seçim dropdown\'u dolduruldu:', basketReportData.stores.length);
            }
        }
        
        const basketSurveySelect = document.getElementById('basket-survey-select');
        if (basketSurveySelect) {
            basketSurveySelect.innerHTML = '<option value="">Anket seçin...</option>';
            if (basketReportData.surveys && basketReportData.surveys.length > 0) {
                basketReportData.surveys.forEach(survey => {
                    basketSurveySelect.innerHTML += `<option value="${survey.id}">${survey.title}</option>`;
                });
                console.log('✅ Anket seçim dropdown\'u dolduruldu:', basketReportData.surveys.length);
            }
        }
        
        // Sepet türü filtreleri
        const typeFilter = document.getElementById('basket-filter-type');
        if (typeFilter) {
            typeFilter.innerHTML = '<option value="">Tüm Sepet Türleri</option>';
            
            // Tüm sepet verilerini detaylı logla
            console.log('🔍 Sepet türü için basketAnalysis:', basketReportData.basketAnalysis);
            
            const types = [...new Set(basketReportData.basketAnalysis.flatMap(item => 
                item.baskets?.map(basket => {
                    console.log('🔍 Sepet türü için basket:', basket);
                    console.log('🔍 Basket tüm alanlar:', Object.keys(basket));
                    
                    // Sepet türü alanlarını kontrol et - daha geniş arama
                    const type = basket.basket_type || basket.type || basket.category || 
                                basket.sepet_turu || basket.sepet_tipi || basket.basket_category;
                    
                    console.log('🔍 Bulunan sepet türü:', type);
                    
                    // Eğer sepet türü bulunamazsa, basket'in tüm değerlerini logla
                    if (!type) {
                        console.log('🔍 Sepet türü bulunamadı, basket tüm değerler:', basket);
                        Object.keys(basket).forEach(key => {
                            console.log(`🔍 Basket ${key}:`, basket[key]);
                        });
                    }
                    
                    return type;
                }) || []
            ))].filter(Boolean);
            
            // Sepet türü değerlerini Türkçe'ye çevir
            const typeTranslations = {
                'large_basket': 'Büyük Boy Sepet',
                'basket': 'Basket Sepet',
                'small_basket': 'Küçük Boy Sepet'
            };
            
            types.forEach(type => {
                const displayName = typeTranslations[type] || type;
                typeFilter.innerHTML += `<option value="${type}">${displayName}</option>`;
            });
            console.log('✅ Sepet türü filtresi dolduruldu:', types.length);
            console.log('🔍 Sepet türleri:', types);
        }
        
        // Üst grup filtreleri
        const upperGroupFilter = document.getElementById('basket-filter-upper-group');
        if (upperGroupFilter) {
            upperGroupFilter.innerHTML = '<option value="">Tüm Üst Gruplar</option>';
            const upperGroups = [...new Set(basketReportData.basketAnalysis.flatMap(item => 
                item.baskets?.map(basket => {
                    console.log('🔍 Üst grup için basket:', basket);
                    
                    // Üst grup alanlarını kontrol et - daha geniş arama
                    const upperGroup = basket.upper_group || basket.group || basket.category || 
                                     basket.ust_grup || basket.ust_grup_adi || basket.main_group ||
                                     basket.parent_group || basket.group_name;
                    
                    console.log('🔍 Bulunan üst grup:', upperGroup);
                    
                    // Eğer üst grup bulunamazsa, basket'in tüm değerlerini logla
                    if (!upperGroup) {
                        console.log('🔍 Üst grup bulunamadı, basket tüm değerler:', basket);
                        Object.keys(basket).forEach(key => {
                            console.log(`🔍 Basket ${key}:`, basket[key]);
                        });
                    }
                    
                    return upperGroup;
                }) || []
            ))].filter(Boolean);
            
            // Üst grup değerlerini Türkçe'ye çevir
            const upperGroupTranslations = {
                'headphone': 'Kulaklık',
                'gsm_accessory': 'GSM Aksesuar',
                'phone': 'Telefon',
                'tablet': 'Tablet',
                'computer': 'Bilgisayar'
            };
            
            upperGroups.forEach(group => {
                const displayName = upperGroupTranslations[group] || group;
                upperGroupFilter.innerHTML += `<option value="${group}">${displayName}</option>`;
            });
            console.log('✅ Üst grup filtresi dolduruldu:', upperGroups.length);
            console.log('🔍 Üst gruplar:', upperGroups);
        }
        
        // Alt grup filtreleri - üst grup seçimine göre güncelle
        updateLowerGroupFilter();
        
        console.log('✅ Sepet raporu filtreleri dolduruldu');
        
        // Mağaza Bazlı Sepet Listesi dropdown'larını doldur
        populateStoreBasketDropdowns();
        
    } catch (error) {
        console.error('❌ Sepet raporu filtreleri doldurma hatası:', error);
    }
}

// Mağaza Bazlı Sepet Listesi dropdown'larını doldur
function populateStoreBasketDropdowns() {
    try {
        // Mağaza dropdown'ını doldur
        const storeSelect = document.getElementById('basket-store-select');
        const storeSearch = document.getElementById('basket-store-search');
        const storeSearchInfo = document.getElementById('basket-store-search-info');
        
        if (storeSelect) {
            storeSelect.innerHTML = '<option value="">Mağaza seçin...</option>';
            if (basketReportData.stores && basketReportData.stores.length > 0) {
                basketReportData.stores.forEach(store => {
                    storeSelect.innerHTML += `<option value="${store.id}">${store.name}</option>`;
                });
                console.log('✅ Mağaza Bazlı Sepet Listesi - Mağaza dropdown dolduruldu:', basketReportData.stores.length);
                
                // Arama fonksiyonu ekle
                if (storeSearch) {
                    storeSearch.addEventListener('input', function() {
                        const searchTerm = this.value.toLowerCase().trim();
                        const options = storeSelect.querySelectorAll('option');
                        let visibleCount = 0;
                        
                        options.forEach(option => {
                            if (option.value === '') {
                                option.style.display = 'block'; // Boş seçenek her zaman görünür
                                return;
                            }
                            
                            const storeName = option.textContent.toLowerCase();
                            if (searchTerm === '' || storeName.includes(searchTerm)) {
                                option.style.display = 'block';
                                visibleCount++;
                            } else {
                                option.style.display = 'none';
                            }
                        });
                        
                        // Arama sonucu sayısını göster
                        if (searchTerm !== '') {
                            if (storeSearchInfo) {
                                storeSearchInfo.textContent = `${visibleCount} mağaza bulundu`;
                                storeSearchInfo.style.display = 'block';
                                storeSearchInfo.style.color = visibleCount > 0 ? '#28a745' : '#dc3545';
                            }
                        } else {
                            if (storeSearchInfo) {
                                storeSearchInfo.style.display = 'none';
                            }
                        }
                    });
                    
                    // Enter tuşu ile dropdown'ı aç
                    storeSearch.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            storeSelect.focus();
                            storeSelect.click();
                        }
                    });
                    
                    console.log('✅ Mağaza arama fonksiyonu eklendi');
                }
            }
        }
        
        // Anket dropdown'ını doldur
        const surveySelect = document.getElementById('basket-survey-select');
        if (surveySelect) {
            surveySelect.innerHTML = '<option value="">Anket seçin...</option>';
            if (basketReportData.surveys && basketReportData.surveys.length > 0) {
                basketReportData.surveys.forEach(survey => {
                    surveySelect.innerHTML += `<option value="${survey.id}">${survey.title}</option>`;
                });
                console.log('✅ Mağaza Bazlı Sepet Listesi - Anket dropdown dolduruldu:', basketReportData.surveys.length);
            }
        }
        
    } catch (error) {
        console.error('❌ Mağaza Bazlı Sepet Listesi dropdown doldurma hatası:', error);
    }
}

// Sepet filtrelerini temizle
function clearBasketFilters() {
    try {
        console.log('🔍 Sepet filtreleri temizleniyor...');
        
        // Tüm filtreleri varsayılan değerlere sıfırla
        document.getElementById('basket-filter-survey').value = '';
        document.getElementById('basket-filter-region').value = '';
        document.getElementById('basket-filter-channel').value = '';
        document.getElementById('basket-filter-store').value = '';
        document.getElementById('basket-filter-brand').value = '';
        document.getElementById('basket-filter-type').value = '';
        document.getElementById('basket-filter-upper-group').value = '';
        document.getElementById('basket-filter-lower-group').value = '';
        
        // Filtrelenmiş veriyi temizle
        basketReportData.filteredData = [];
        basketReportData.currentFilters = {
            survey: [],
            region: '',
            channel: '',
            store: '',
            brand: [],
            type: '',
            upperGroup: '',
            lowerGroup: ''
        };
        
        // Grafikleri güncelle
        updateBasketCharts();
        
        console.log('✅ Sepet filtreleri temizlendi');
        
    } catch (error) {
        console.error('❌ Sepet filtreleri temizleme hatası:', error);
    }
}

// Filtreleri uygula
function applyBasketFilters() {
    let loadingId = null;
    try {
        console.log('🔍 Sepet filtreleri uygulanıyor...');
        
        // Loading başlat
        loadingId = showLoading('Sepet Filtreleri Uygulanıyor', 'Veriler filtreleniyor...');
        
        const surveyFilter = Array.from(document.getElementById('basket-filter-survey').selectedOptions).map(o => o.value);
        const regionFilter = document.getElementById('basket-filter-region').value;
        const channelFilter = document.getElementById('basket-filter-channel').value;
        const storeFilter = document.getElementById('basket-filter-store').value;
        const brandFilter = Array.from(document.getElementById('basket-filter-brand').selectedOptions).map(o => o.value);
        const typeFilter = document.getElementById('basket-filter-type').value;
        const upperGroupFilter = document.getElementById('basket-filter-upper-group').value;
        const lowerGroupFilter = document.getElementById('basket-filter-lower-group').value;
        
        console.log('🔍 Filtre değerleri:', {
            survey: surveyFilter,
            region: regionFilter,
            channel: channelFilter,
            store: storeFilter,
            brand: brandFilter,
            type: typeFilter,
            upperGroup: upperGroupFilter,
            lowerGroup: lowerGroupFilter
        });
        
        let filteredData = [...basketReportData.basketAnalysis];
        const originalLength = filteredData.length;
        
        console.log('🔍 Başlangıç veri sayısı:', originalLength);
        
        // Anket filtresi
        if (surveyFilter.length > 0) {
            filteredData = filteredData.filter(item => {
                const surveyId = item.survey_id?.toString();
                const matches = surveyFilter.includes(surveyId);
                console.log(`🔍 Anket filtresi: ${surveyId} - ${matches ? 'EŞLEŞTİ' : 'EŞLEŞMEDİ'}`);
                return matches;
            });
            console.log(`🔍 Anket filtresi sonrası: ${originalLength} → ${filteredData.length}`);
        }
        
        // Bölge filtresi
        if (regionFilter) {
            filteredData = filteredData.filter(item => {
                const store = basketReportData.stores.find(s => s.id === item.store_id);
                const matches = store && store.region_id == regionFilter;
                console.log(`🔍 Bölge filtresi: store ${item.store_id}, region_id ${store?.region_id}, filter ${regionFilter} - ${matches ? 'EŞLEŞTİ' : 'EŞLEŞMEDİ'}`);
                return matches;
            });
            console.log(`🔍 Bölge filtresi sonrası: ${originalLength} → ${filteredData.length}`);
        }
        
        // Kanal filtresi
        if (channelFilter) {
            filteredData = filteredData.filter(item => {
                const store = basketReportData.stores.find(s => s.id === item.store_id);
                const matches = store && store.channel_id == channelFilter;
                console.log(`🔍 Kanal filtresi: store ${item.store_id}, channel_id ${store?.channel_id}, filter ${channelFilter} - ${matches ? 'EŞLEŞTİ' : 'EŞLEŞMEDİ'}`);
                return matches;
            });
            console.log(`🔍 Kanal filtresi sonrası: ${originalLength} → ${filteredData.length}`);
        }
        
        // Mağaza filtresi
        if (storeFilter) {
            filteredData = filteredData.filter(item => {
                const matches = item.store_id == storeFilter;
                console.log(`🔍 Mağaza filtresi: store ${item.store_id}, filter ${storeFilter} - ${matches ? 'EŞLEŞTİ' : 'EŞLEŞMEDİ'}`);
                return matches;
            });
            console.log(`🔍 Mağaza filtresi sonrası: ${originalLength} → ${filteredData.length}`);
        }
        
        // Marka filtresi
        if (brandFilter.length > 0) {
            filteredData = filteredData.filter(item => {
                const hasMatchingBrand = item.baskets.some(basket => {
                    const brand = basket.brand || basket.brand_name || basket.product_brand || basket.item_brand;
                    const matches = brandFilter.includes(brand);
                    console.log(`🔍 Marka filtresi: ${brand} - ${matches ? 'EŞLEŞTİ' : 'EŞLEŞMEDİ'}`);
                    return matches;
                });
                return hasMatchingBrand;
            });
            console.log(`🔍 Marka filtresi sonrası: ${originalLength} → ${filteredData.length}`);
        }
        
        // Sepet türü filtresi
        if (typeFilter) {
            const originalLength = filteredData.length;
            filteredData = filteredData.filter(item => {
                const hasMatchingType = item.baskets.some(basket => {
                    const basketType = basket.basket_type || basket.type || basket.category || 
                                     basket.sepet_turu || basket.sepet_tipi || basket.basket_category;
                    const matches = basketType === typeFilter;
                    console.log(`🔍 Sepet türü filtresi: ${basketType} - ${matches ? 'EŞLEŞTİ' : 'EŞLEŞMEDİ'}`);
                    return matches;
                });
                return hasMatchingType;
            });
            console.log(`🔍 Sepet türü filtresi sonrası: ${originalLength} → ${filteredData.length}`);
        }
        
        // Üst grup filtresi
        if (upperGroupFilter) {
            const originalLength = filteredData.length;
            filteredData = filteredData.filter(item => {
                const hasMatchingUpperGroup = item.baskets.some(basket => {
                    const upperGroup = basket.upper_group || basket.group || basket.category || 
                                     basket.ust_grup || basket.ust_grup_adi || basket.main_group ||
                                     basket.parent_group || basket.group_name;
                    const matches = upperGroup === upperGroupFilter;
                    console.log(`🔍 Üst grup filtresi: ${upperGroup} - ${matches ? 'EŞLEŞTİ' : 'EŞLEŞMEDİ'}`);
                    return matches;
                });
                return hasMatchingUpperGroup;
            });
            console.log(`🔍 Üst grup filtresi sonrası: ${originalLength} → ${filteredData.length}`);
        }
        
        // Alt grup filtresi
        if (lowerGroupFilter) {
            const originalLength = filteredData.length;
            filteredData = filteredData.filter(item => {
                const hasMatchingLowerGroup = item.baskets.some(basket => {
                    const lowerGroup = basket.lower_group || basket.sub_group || basket.subcategory || 
                                     basket.alt_grup || basket.alt_grup_adi || basket.sub_group_name ||
                                     basket.child_group || basket.subcategory_name;
                    const matches = lowerGroup === lowerGroupFilter;
                    console.log(`🔍 Alt grup filtresi: ${lowerGroup} - ${matches ? 'EŞLEŞTİ' : 'EŞLEŞMEDİ'}`);
                    return matches;
                });
                return hasMatchingLowerGroup;
            });
            console.log(`🔍 Alt grup filtresi sonrası: ${originalLength} → ${filteredData.length}`);
        }
        
        basketReportData.filteredData = filteredData;
        basketReportData.currentFilters = {
            survey: surveyFilter,
            region: regionFilter,
            channel: channelFilter,
            store: storeFilter,
            brand: brandFilter,
            type: typeFilter,
            upperGroup: upperGroupFilter,
            lowerGroup: lowerGroupFilter
        };
        
        console.log('✅ Sepet filtreleri uygulandı:', {
            orijinal: originalLength,
            filtrelenmiş: filteredData.length
        });
        
        // Grafikleri güncelle
        updateBasketCharts();
        
    } catch (error) {
        console.error('❌ Sepet filtreleri uygulama hatası:', error);
        alert('Filtreler uygulanırken hata oluştu!');
    } finally {
        // Loading'i kapat
        if (loadingId) {
            hideLoading(loadingId);
        }
    }
}

// Grafikleri güncelle
function updateBasketCharts() {
    try {
        // Filtrelenmiş veri varsa onu kullan, yoksa orijinal veriyi kullan
        const dataToUse = basketReportData.filteredData.length > 0 ? basketReportData.filteredData : basketReportData.basketAnalysis;
        
        console.log('🔍 Sepet grafikleri güncelleniyor:', dataToUse.length);
        console.log('🔍 Filtrelenmiş veri:', basketReportData.filteredData.length);
        console.log('🔍 Orijinal veri:', basketReportData.basketAnalysis.length);
        
        // Filtrelerin uygulanıp uygulanmadığını kontrol et
        const hasActiveFilters = basketReportData.currentFilters && (
            basketReportData.currentFilters.survey.length > 0 ||
            basketReportData.currentFilters.region ||
            basketReportData.currentFilters.channel ||
            basketReportData.currentFilters.store ||
            basketReportData.currentFilters.brand.length > 0 ||
            basketReportData.currentFilters.type ||
            basketReportData.currentFilters.upperGroup ||
            basketReportData.currentFilters.lowerGroup
        );
        
        console.log('🔍 Aktif filtreler var mı:', hasActiveFilters);
        console.log('🔍 Current filters:', basketReportData.currentFilters);
        
        // Eğer filtreler uygulanmışsa ve filtrelenmiş veri yoksa, grafikleri boş göster
        if (hasActiveFilters && basketReportData.filteredData.length === 0) {
            console.log('⚠️ Filtreler uygulanmış ama veri yok, grafikleri boş gösteriliyor...');
            showNoDataCharts();
            return;
        }
        
        // Eğer hiç veri yoksa, grafikleri boş göster
        if (dataToUse.length === 0) {
            console.log('⚠️ Hiç veri yok, grafikleri boş gösteriliyor...');
            showEmptyCharts();
            return;
        }
        
        // Önceki grafikleri temizle
        if (window.basketBrandChart) window.basketBrandChart.destroy();
        if (window.basketTrendChart) window.basketTrendChart.destroy();
        if (window.basketPercentageChart) window.basketPercentageChart.destroy();
        if (window.basketTopArticlesChart) window.basketTopArticlesChart.destroy();
        
        // Grafikleri oluştur
        updateBrandBasketChart(dataToUse);
        updateBasketTrendChart(dataToUse);
        updateBrandPercentageChart(dataToUse);
        updateTopArticleCodesChart(dataToUse);
        
        console.log('✅ Sepet grafikleri güncellendi');
        
    } catch (error) {
        console.error('❌ Sepet grafikleri güncelleme hatası:', error);
    }
}

// Boş grafikleri göster
function showEmptyCharts() {
    try {
        // Marka bazlı sepet grafiği
        const brandCanvas = document.getElementById('basket-brand-chart');
        if (brandCanvas) {
            const ctx = brandCanvas.getContext('2d');
            ctx.clearRect(0, 0, brandCanvas.width, brandCanvas.height);
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Filtreleri uygulayın', brandCanvas.width / 2, brandCanvas.height / 2);
        }
        
        // Sepet trend grafiği
        const trendCanvas = document.getElementById('basket-trend-chart');
        if (trendCanvas) {
            const ctx = trendCanvas.getContext('2d');
            ctx.clearRect(0, 0, trendCanvas.width, trendCanvas.height);
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Filtreleri uygulayın', trendCanvas.width / 2, trendCanvas.height / 2);
        }
        
        // Marka yüzdesel dağılımı grafiği
        const percentageCanvas = document.getElementById('basket-percentage-chart');
        if (percentageCanvas) {
            const ctx = percentageCanvas.getContext('2d');
            ctx.clearRect(0, 0, percentageCanvas.width, percentageCanvas.height);
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Filtreleri uygulayın', percentageCanvas.width / 2, percentageCanvas.height / 2);
        }
        
        // Top 10 artikel grafiği
        const topArticlesCanvas = document.getElementById('basket-top-articles-chart');
        if (topArticlesCanvas) {
            const ctx = topArticlesCanvas.getContext('2d');
            ctx.clearRect(0, 0, topArticlesCanvas.width, topArticlesCanvas.height);
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Filtreleri uygulayın', topArticlesCanvas.width / 2, topArticlesCanvas.height / 2);
        }
        
        console.log('✅ Boş grafikler gösterildi');
        
    } catch (error) {
        console.error('❌ Boş grafikler gösterme hatası:', error);
    }
}

// Veri bulunamadı grafiklerini göster
function showNoDataCharts() {
    try {
        console.log('🔍 Sepet raporu - Veri bulunamadı grafikleri gösteriliyor...');
        
        // Önceki Chart.js grafiklerini temizle
        if (window.basketBrandChart) {
            console.log('🔍 basketBrandChart temizleniyor...');
            window.basketBrandChart.destroy();
            window.basketBrandChart = null;
        }
        if (window.basketTrendChart) {
            console.log('🔍 basketTrendChart temizleniyor...');
            window.basketTrendChart.destroy();
            window.basketTrendChart = null;
        }
        if (window.basketPercentageChart) {
            console.log('🔍 basketPercentageChart temizleniyor...');
            window.basketPercentageChart.destroy();
            window.basketPercentageChart = null;
        }
        if (window.basketTopArticlesChart) {
            console.log('🔍 basketTopArticlesChart temizleniyor...');
            window.basketTopArticlesChart.destroy();
            window.basketTopArticlesChart = null;
        }
        
        console.log('🔍 Canvas mesajları yazılıyor...');
        
        // Tüm canvas'lara mesaj yaz
        const canvasIds = ['basket-brand-chart', 'basket-trend-chart', 'basket-percentage-chart', 'basket-top-articles-chart'];
        
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
                ctx.fillText('sepet verisi mevcut değil', canvas.width / 2, canvas.height / 2 + 35);
                
                console.log(`✅ ${canvasId} mesajı yazıldı`);
            } else {
                console.error(`❌ ${canvasId} canvas bulunamadı`);
            }
        });
        
        console.log('✅ Sepet raporu - Veri bulunamadı grafikleri gösterildi');
        
    } catch (error) {
        console.error('❌ Veri bulunamadı grafikleri gösterme hatası:', error);
    }
}

// Marka bazlı sepet dağılımı grafiği
function updateBrandBasketChart(data) {
    try {
        const brandCounts = {};
        
        data.forEach(item => {
            console.log('🔍 Item analiz ediliyor:', item);
            if (item.baskets && Array.isArray(item.baskets)) {
                console.log('🔍 Item baskets:', item.baskets);
                item.baskets.forEach(basket => {
                    console.log('🔍 Basket analiz ediliyor:', basket);
                    
                    // Marka bilgisini farklı alanlardan çıkar
                    const brand = basket.brand || basket.marka || basket.brand_name || basket.marka_adi || 
                                 basket.product_brand || basket.urun_marka || basket.item_brand;
                    
                    console.log('🔍 Bulunan brand:', brand);
                    
                    // Sepet türü, üst grup, alt grup bilgilerini de logla
                    console.log('🔍 Basket türü:', basket.basket_type || basket.type || basket.category);
                    console.log('🔍 Üst grup:', basket.upper_group || basket.group || basket.category);
                    console.log('🔍 Alt grup:', basket.lower_group || basket.sub_group || basket.subcategory);
                    console.log('🔍 Artikel kodu:', basket.artikel || basket.article_code || basket.product_code);
                    
                    if (brand) {
                        brandCounts[brand] = (brandCounts[brand] || 0) + (basket.count || basket.quantity || basket.amount || 1);
                    }
                });
            }
        });
        
        console.log('🔍 Marka bazlı sepet grafiği oluşturuluyor...', brandCounts);
        console.log('🔍 Gelen veri:', data);
        
        if (Object.keys(brandCounts).length > 0) {
            const canvas = document.getElementById('basket-brand-chart');
            if (!canvas) {
                console.error('❌ basket-brand-chart canvas bulunamadı');
                return;
            }
            console.log('✅ basket-brand-chart canvas bulundu');
            const ctx = canvas.getContext('2d');
            
            // Marka isimlerinin yanına sepet sayısını ekle
            const labelsWithCount = Object.keys(brandCounts).map(brand => {
                const count = brandCounts[brand];
                return `${brand} (${count} sepet)`;
            });
            
            window.basketBrandChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labelsWithCount,
                    datasets: [{
                        data: Object.values(brandCounts),
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Marka Bazlı Sepet Dağılımı'
                        },
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return `${context.label}: ${context.parsed} sepet (${percentage}%)`;
                                }
                            }
                        }
                    },
                    onClick: (event, elements) => {
                        // Grafik üzerine tıklama
                        if (elements.length > 0) {
                            showChartModal('basket-brand-chart', 'Marka Bazlı Sepet Dağılımı', { labels: labelsWithCount, values: Object.values(brandCounts) });
                        }
                    }
                }
            });
            
            // Canvas'a başlık tıklama event'i ekle
            canvas.addEventListener('click', function(event) {
                const rect = canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                
                // Başlık alanı yaklaşık olarak üst 50px'de
                if (y < 50) {
                    showChartModal('basket-brand-chart', 'Marka Bazlı Sepet Dağılımı', { labels: labelsWithCount, values: Object.values(brandCounts) });
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
        
    } catch (error) {
        console.error('❌ Marka bazlı sepet grafiği oluşturma hatası:', error);
    }
}

// Sepet trend analizi grafiği
function updateBasketTrendChart(data) {
    try {
        const brandTrends = {};
        
        // Her marka için trend verilerini topla
        data.forEach(item => {
            if (item.baskets && Array.isArray(item.baskets)) {
                item.baskets.forEach(basket => {
                    const brand = basket.brand || basket.marka || basket.brand_name || basket.marka_adi || 
                                 basket.product_brand || basket.urun_marka || basket.item_brand;
                    
                    if (brand) {
                        if (!brandTrends[brand]) {
                            brandTrends[brand] = {};
                        }
                        
            const surveyId = item.survey_id;
            if (surveyId) {
                            if (!brandTrends[brand][surveyId]) {
                                brandTrends[brand][surveyId] = 0;
                }
                            brandTrends[brand][surveyId] += (basket.count || basket.quantity || basket.amount || 1);
                        }
                    }
                });
            }
        });
        
        console.log('🔍 Marka trend verileri:', brandTrends);
        
        if (Object.keys(brandTrends).length > 0) {
            const canvas = document.getElementById('basket-trend-chart');
            if (!canvas) {
                console.error('❌ basket-trend-chart canvas bulunamadı');
                return;
            }
            console.log('✅ basket-trend-chart canvas bulundu');
            const ctx = canvas.getContext('2d');
            
            // Tüm survey ID'lerini topla
            const allSurveyIds = new Set();
            Object.values(brandTrends).forEach(trend => {
                Object.keys(trend).forEach(surveyId => allSurveyIds.add(surveyId));
            });
            const sortedSurveyIds = Array.from(allSurveyIds).sort((a, b) => parseInt(a) - parseInt(b));
            
            // Her marka için dataset oluştur
            const datasets = Object.keys(brandTrends).map((brand, index) => {
                const colors = [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                    '#FF9F40', '#C9CBCF', '#8AC926', '#FF5A5F', '#00B8D9'
                ];
                
                const data = sortedSurveyIds.map(surveyId => brandTrends[brand][surveyId] || 0);
                
                return {
                    label: brand,
                    data: data,
                    borderColor: colors[index % colors.length],
                    backgroundColor: colors[index % colors.length] + '20',
                    fill: false,
                    tension: 0.1
                };
            });
            
            window.basketTrendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: sortedSurveyIds.map(id => `Anket ${id}`),
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Marka Bazlı Sepet Trend Analizi'
                        },
                        legend: {
                            position: 'top',
                            labels: {
                                font: {
                                    size: 12
                                }
                            }
                        }
                    },
                    onClick: (event, elements) => {
                        // Grafik üzerine tıklama
                        if (elements.length > 0) {
                            showChartModal('basket-trend-chart', 'Marka Bazlı Sepet Trend Analizi', { brands: Object.keys(brandTrends), surveys: sortedSurveyIds, brandTrends });
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Sepet Sayısı'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Anketler'
                            }
                        }
                    }
                }
            });
            
            // Canvas'a başlık tıklama event'i ekle
            canvas.addEventListener('click', function(event) {
                const rect = canvas.getBoundingClientRect();
                const y = event.clientY - rect.top;
                
                // Başlık alanı yaklaşık olarak üst 50px'de
                if (y < 50) {
                    showChartModal('basket-trend-chart', 'Marka Bazlı Sepet Trend Analizi', { brands: Object.keys(brandTrends), surveys: sortedSurveyIds, brandTrends });
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
        
    } catch (error) {
        console.error('❌ Marka trend grafiği oluşturma hatası:', error);
    }
}

// Marka yüzdesel dağılımı grafiği
function updateBrandPercentageChart(data) {
    try {
        const brandCounts = {};
        
        data.forEach(item => {
            if (item.baskets && Array.isArray(item.baskets)) {
                item.baskets.forEach(basket => {
                    const brand = basket.brand || basket.brand_name || basket.product_brand || basket.item_brand;
                    if (brand) {
                        brandCounts[brand] = (brandCounts[brand] || 0) + (basket.count || basket.quantity || basket.amount || 1);
                    }
                });
            }
        });
        
        console.log('🔍 Marka yüzdesel dağılımı grafiği oluşturuluyor...', brandCounts);
        console.log('🔍 Brand counts keys:', Object.keys(brandCounts));
        console.log('🔍 Brand counts values:', Object.values(brandCounts));
        
        if (Object.keys(brandCounts).length > 0) {
            const canvas = document.getElementById('basket-percentage-chart');
            if (!canvas) {
                console.error('❌ basket-percentage-chart canvas bulunamadı');
                return;
            }
            console.log('✅ basket-percentage-chart canvas bulundu');
            
            // Toplam sepet sayısını hesapla
            const totalBaskets = Object.values(brandCounts).reduce((sum, count) => sum + count, 0);
            
            // Labels'ı yüzde değerleriyle birlikte oluştur
            const labelsWithPercentage = Object.keys(brandCounts).map(brand => {
                const count = brandCounts[brand];
                const percentage = ((count / totalBaskets) * 100).toFixed(1);
                return `${brand} (${percentage}%)`;
            });
            
            const ctx = canvas.getContext('2d');
            window.basketPercentageChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labelsWithPercentage,
                    datasets: [{
                        data: Object.values(brandCounts),
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Marka Yüzdesel Dağılımı'
                        },
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    // Label'dan yüzde değerini çıkar (çünkü zaten labels'da var)
                                    const brandName = context.label.replace(/ \(\d+\.\d+%\)$/, '');
                                    return `${brandName}: ${context.parsed} sepet (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
            
            // Canvas'a başlık tıklama event'i ekle
            canvas.addEventListener('click', function(event) {
                const rect = canvas.getBoundingClientRect();
                const y = event.clientY - rect.top;
                
                // Başlık alanı yaklaşık olarak üst 50px'de
                if (y < 50) {
                    showChartModal('basket-percentage-chart', 'Marka Yüzdesel Dağılımı', { labels: labelsWithPercentage, values: Object.values(brandCounts) });
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
            
            console.log('✅ Marka yüzdesel dağılımı grafiği oluşturuldu');
            console.log('🔍 Chart instance:', window.basketPercentageChart);
        } else {
            console.warn('⚠️ Brand counts boş, grafik oluşturulamadı');
        }
        
    } catch (error) {
        console.error('❌ Marka yüzdesel dağılımı grafiği oluşturma hatası:', error);
    }
}

// Top 10 Artikel Kodları grafiği
function updateTopArticleCodesChart(data) {
    try {
        const articleCounts = {};
        
        data.forEach(item => {
            console.log('🔍 Top 10 için item analiz ediliyor:', item);
            if (item.baskets && Array.isArray(item.baskets)) {
                console.log('🔍 Item baskets:', item.baskets);
                item.baskets.forEach(basket => {
                    console.log('🔍 Top 10 için basket analiz ediliyor:', basket);
                    console.log('🔍 Basket tüm alanlar:', Object.keys(basket));
                    
                    // Console'dan görülen gerçek alan adı: artikel
                    const articleCode = basket.artikel || basket.article_code || basket.product_code || basket.code || basket.sku;
                    
                    console.log('🔍 Bulunan artikel kodu:', articleCode);
                    
                    // Eğer artikel kodu bulunamazsa, basket'in tüm değerlerini logla
                    if (!articleCode) {
                        console.log('🔍 Artikel kodu bulunamadı, basket tüm değerler:', basket);
                        Object.keys(basket).forEach(key => {
                            console.log(`🔍 Basket ${key}:`, basket[key]);
                        });
                    }
                    
                    if (articleCode) {
                        articleCounts[articleCode] = (articleCounts[articleCode] || 0) + (basket.count || basket.quantity || basket.amount || 1);
                    }
                });
            }
        });
        
        console.log('🔍 Top 10 artikel grafiği oluşturuluyor...', articleCounts);
        
        if (Object.keys(articleCounts).length > 0) {
            // Top 10'u al
            const sortedArticles = Object.entries(articleCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10);
            
            console.log('🔍 Top 10 artikel kodları:', sortedArticles);
            
            const canvas = document.getElementById('basket-top-articles-chart');
            if (!canvas) {
                console.error('❌ basket-top-articles-chart canvas bulunamadı');
                return;
            }
            console.log('✅ basket-top-articles-chart canvas bulundu');
            
            // Önceki grafiği temizle
            if (window.basketTopArticlesChart) {
                window.basketTopArticlesChart.destroy();
            }
            
            const ctx = canvas.getContext('2d');
            window.basketTopArticlesChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sortedArticles.map(([code]) => code),
                    datasets: [{
                        label: 'Sepet Sayısı',
                        data: sortedArticles.map(([,count]) => count),
                        backgroundColor: '#4BC0C0'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Top 10 Artikel Kodları'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            
            // Canvas'a başlık tıklama event'i ekle
            canvas.addEventListener('click', function(event) {
                const rect = canvas.getBoundingClientRect();
                const y = event.clientY - rect.top;
                
                // Başlık alanı yaklaşık olarak üst 50px'de
                if (y < 50) {
                    showChartModal('basket-top-articles-chart', 'Top 10 Artikel Kodları', { labels: sortedArticles.map(([code]) => code), values: sortedArticles.map(([,count]) => count) });
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
        } else {
            console.log('⚠️ Top 10 artikel grafiği için veri bulunamadı');
            
            // Canvas'ı temizle
            const canvas = document.getElementById('basket-top-articles-chart');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // "Veri bulunamadı" mesajı göster
                ctx.fillStyle = '#666';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Veri bulunamadı', canvas.width / 2, canvas.height / 2);
            }
        }
        
    } catch (error) {
        console.error('❌ Top 10 Artikel Kodları grafiği oluşturma hatası:', error);
    }
}

// Mağaza bazlı sepet listesi yükle
async function loadStoreBasketList() {
    let loadingId = null;
    try {
        const storeId = document.getElementById('basket-store-select').value;
        const surveyId = document.getElementById('basket-survey-select').value;
        const tableContainer = document.getElementById('basket-store-table-container');
        const tableBody = document.getElementById('basket-store-table-body');
        
        if (!storeId || !surveyId) {
            alert('Lütfen mağaza ve anket seçin!');
            return;
        }
        
        // Loading başlat
        loadingId = showLoading('Sepet Listesi Yükleniyor', 'Mağaza verileri çekiliyor...');
        
        // Filtrelenmiş veriyi al
        updateLoading(loadingId, 'Sepet Listesi Yükleniyor', 'Veriler filtreleniyor...');
        const filteredData = basketReportData.filteredData.length > 0 ? basketReportData.filteredData : basketReportData.basketAnalysis;
        
        console.log('🔍 Mağaza Bazlı Sepet Listesi Debug:');
        console.log('🔍 Seçilen mağaza ID:', storeId);
        console.log('🔍 Seçilen anket ID:', surveyId);
        console.log('🔍 FilteredData uzunluğu:', basketReportData.filteredData.length);
        console.log('🔍 BasketAnalysis uzunluğu:', basketReportData.basketAnalysis.length);
        console.log('🔍 Kullanılacak veri uzunluğu:', filteredData.length);
        console.log('🔍 Kullanılacak veri:', filteredData);
        
        // Seçilen mağaza ve anket için filtrele
        updateLoading(loadingId, 'Sepet Listesi Yükleniyor', 'Mağaza ve anket filtreleniyor...');
        const storeBaskets = filteredData.filter(item => {
            const storeMatch = item.store_id?.toString() === storeId;
            const surveyMatch = item.survey_id?.toString() === surveyId;
            console.log(`🔍 Item ${item.id}: store_id=${item.store_id}, survey_id=${item.survey_id}, storeMatch=${storeMatch}, surveyMatch=${surveyMatch}`);
            return storeMatch && surveyMatch;
        });
        
        console.log('🔍 Filtrelenmiş mağaza sepetleri:', storeBaskets.length);
        console.log('🔍 Filtrelenmiş mağaza sepetleri detayı:', storeBaskets);
        
        if (storeBaskets.length === 0) {
            alert('Bu mağaza ve anket için sepet verisi bulunamadı!');
            tableContainer.style.display = 'none';
            return;
        }
        
        // Tabloyu doldur
        tableBody.innerHTML = '';
        
        storeBaskets.forEach(storeBasket => {
            if (storeBasket.baskets && Array.isArray(storeBasket.baskets)) {
                storeBasket.baskets.forEach(basket => {
                    const articleCode = basket.artikel || basket.article_code || basket.articleCode || basket.product_code || basket.code || basket.sku || 'N/A';
                    const productName = basket.product_name || basket.name || basket.title || 'N/A';
                    const brand = basket.brand || basket.brand_name || basket.product_brand || basket.item_brand || 'N/A';
                    const price = basket.price || basket.unit_price || basket.cost || 0;
                    const quantity = basket.count || basket.quantity || basket.amount || 1;
                    const total = price * quantity;
                    
                    const row = `
                        <tr>
                            <td>${articleCode}</td>
                            <td>${productName}</td>
                            <td>${brand}</td>
                            <td>${price.toFixed(2)} ₺</td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            }
        });
        
        tableContainer.style.display = 'block';
        
        console.log('✅ Mağaza bazlı sepet listesi yüklendi');
        
    } catch (error) {
        console.error('❌ Mağaza bazlı sepet listesi yükleme hatası:', error);
        alert('Sepet listesi yüklenirken hata oluştu!');
    } finally {
        // Loading'i kapat
        if (loadingId) {
            hideLoading(loadingId);
        }
    }
}

// Sepet raporu bölümü gösterildiğinde çalışacak fonksiyon
function showBasketReport() {
    let loadingId = null;
    try {
    console.log('🔍 Sepet raporu bölümü gösteriliyor...');
        
        // Loading başlat
        loadingId = showLoading('Sepet Raporu Yükleniyor', 'Veriler hazırlanıyor...');
    
    // Verileri yükle ve filtreleri doldur
    loadBasketReportData().then(success => {
        if (success) {
                updateLoading(loadingId, 'Sepet Raporu Yükleniyor', 'Filtreler dolduruluyor...');
            populateBasketFilters();
                
                updateLoading(loadingId, 'Sepet Raporu Yükleniyor', 'Grafikler hazırlanıyor...');
            updateBasketCharts();
            
                updateLoading(loadingId, 'Sepet Raporu Yükleniyor', 'Sistem ayarlanıyor...');
            // Event listener'ları ekle
            setupBasketEventListeners();
            
            // Test için filtre fonksiyonunu global olarak erişilebilir yap
            window.applyBasketFilters = applyBasketFilters;
                window.clearBasketFilters = clearBasketFilters;
                
                console.log('✅ Sepet raporu başarıyla yüklendi');
            }
        }).catch(error => {
            console.error('❌ Sepet raporu yükleme hatası:', error);
        }).finally(() => {
            // Loading'i kapat
            if (loadingId) {
                hideLoading(loadingId);
            }
        });
    } catch (error) {
        console.error('❌ Sepet raporu başlatma hatası:', error);
        if (loadingId) {
            hideLoading(loadingId);
        }
    }
}

// Alt grup filtrelerini üst grup seçimine göre güncelle
function updateLowerGroupFilter() {
    try {
        const lowerGroupFilter = document.getElementById('basket-filter-lower-group');
        const upperGroupFilter = document.getElementById('basket-filter-upper-group');
        
        if (!lowerGroupFilter) {
            console.error('❌ Alt grup filtresi bulunamadı');
            return;
        }
        
        // Alt grup filtresini temizle
        lowerGroupFilter.innerHTML = '<option value="">Tüm Alt Gruplar</option>';
        
        // Üst grup seçimi yoksa tüm alt grupları göster
        const selectedUpperGroup = upperGroupFilter ? upperGroupFilter.value : '';
        
        console.log('🔍 Seçilen üst grup:', selectedUpperGroup);
        
        // Alt grup değerlerini Türkçe'ye çevir
        const lowerGroupTranslations = {
            'in_ear': 'Kulak İçi Kulaklık',
            'charging_stand': 'Şarj Standı',
            'powerbank': 'Powerbank',
            'car_charger': 'Araç İçi Tutucu',
            'wall_charger': 'Duvar Adaptörü',
            'cable': 'Kablo',
            'tws': 'TWS Kulaklık',
            'over_ear': 'Kafa Bantlı Kulaklık',
            'other': 'Diğer'
        };
        
        // Tüm alt grupları topla
        let allLowerGroups = [];
        
        if (selectedUpperGroup) {
            // Üst grup seçilmişse, sadece o üst gruba ait alt grupları göster
            console.log(`🔍 ${selectedUpperGroup} üst grubuna ait basket'ler aranıyor...`);
            
            // Önce verilerden alt grupları çıkar
            const dataLowerGroups = [...new Set(basketReportData.basketAnalysis.flatMap(item => 
                item.baskets?.filter(basket => {
                    const upperGroup = basket.upper_group || basket.group || basket.category || 
                                     basket.ust_grup || basket.ust_grup_adi || basket.main_group ||
                                     basket.parent_group || basket.group_name;
                    
                    const matches = upperGroup === selectedUpperGroup;
                    if (matches) {
                        console.log(`🔍 Eşleşen basket bulundu:`, {
                            upper_group: upperGroup,
                            lower_group: basket.lower_group || basket.sub_group || basket.subcategory,
                            basket: basket
                        });
                    }
                    
                    return matches;
                }).map(basket => {
                    const lowerGroup = basket.lower_group || basket.sub_group || basket.subcategory || 
                                     basket.alt_grup || basket.alt_grup_adi || basket.sub_group_name ||
                                     basket.child_group || basket.subcategory_name;
                    console.log(`🔍 Alt grup çıkarıldı: ${lowerGroup}`);
                    return lowerGroup;
                }).filter(Boolean) || []
            ))];
            
            // Eğer verilerde eksiklik varsa, sabit değerler ekle
            let additionalGroups = [];
            if (selectedUpperGroup === 'headphone') {
                // Kulaklık için tüm alt grupları ekle
                additionalGroups = ['in_ear', 'tws', 'over_ear'];
            } else if (selectedUpperGroup === 'gsm_accessory') {
                // GSM Aksesuar için tüm alt grupları ekle
                additionalGroups = ['charging_stand', 'powerbank', 'car_charger', 'wall_charger', 'cable', 'other'];
            }
            
            // Verilerden gelen ve sabit değerleri birleştir
            allLowerGroups = [...new Set([...dataLowerGroups, ...additionalGroups])];
            
            console.log(`🔍 ${selectedUpperGroup} üst grubuna ait alt gruplar (veri):`, dataLowerGroups);
            console.log(`🔍 ${selectedUpperGroup} üst grubuna ait alt gruplar (sabit):`, additionalGroups);
            console.log(`🔍 ${selectedUpperGroup} üst grubuna ait alt gruplar (birleşik):`, allLowerGroups);
    } else {
            // Üst grup seçilmemişse, tüm alt grupları göster
            allLowerGroups = [...new Set(basketReportData.basketAnalysis.flatMap(item => 
                item.baskets?.map(basket => {
                    const lowerGroup = basket.lower_group || basket.sub_group || basket.subcategory || 
                                     basket.alt_grup || basket.alt_grup_adi || basket.sub_group_name ||
                                     basket.child_group || basket.subcategory_name;
                    return lowerGroup;
                }).filter(Boolean) || []
            ))];
            console.log('🔍 Tüm alt gruplar:', allLowerGroups);
        }
        
        // Alt grupları filtreye ekle
        allLowerGroups.forEach(group => {
            const displayName = lowerGroupTranslations[group] || group;
            lowerGroupFilter.innerHTML += `<option value="${group}">${displayName}</option>`;
        });
        
        console.log('✅ Alt grup filtresi güncellendi:', allLowerGroups.length);
        
    } catch (error) {
        console.error('❌ Alt grup filtresi güncelleme hatası:', error);
    }
}

// Supabase'deki gerçek verileri say
async function countSupabaseData() {
    try {
        console.log('🔍 Supabase veritabanındaki gerçek veriler sayılıyor...');
        
        // Mevcut filtreleri al
        const surveyFilter = Array.from(document.getElementById('basket-filter-survey').selectedOptions).map(o => o.value);
        const regionFilter = document.getElementById('basket-filter-region').value;
        const channelFilter = document.getElementById('basket-filter-channel').value;
        const storeFilter = document.getElementById('basket-filter-store').value;
        const brandFilter = Array.from(document.getElementById('basket-filter-brand').selectedOptions).map(o => o.value);
        
        console.log('🔍 Aktif filtreler:', {
            survey: surveyFilter,
            region: regionFilter,
            channel: channelFilter,
            store: storeFilter,
            brand: brandFilter
        });
        
        // Supabase sorgusu oluştur - önce tablo yapısını kontrol et
        let query = supabase
            .from('survey_answers')
            .select(`
                id,
                survey_id,
                answer_data
            `);
        
        // Anket filtresi
        if (surveyFilter.length > 0) {
            query = query.in('survey_id', surveyFilter);
        }
        
        const { data: answers, error } = await query;
        
        if (error) {
            console.error('❌ Supabase sorgu hatası:', error);
            alert('Veritabanı sorgusu başarısız: ' + error.message);
            return;
        }
        
        console.log('📊 Supabase\'den gelen cevaplar:', answers.length);
        console.log('🔍 İlk cevap örneği:', answers[0]);
        
        if (answers.length === 0) {
            alert('Seçilen filtreler için hiç veri bulunamadı!');
            return;
        }
        
        // Answer data yapısını detaylı kontrol et
        if (answers.length > 0) {
            console.log('🔍 Answer data yapısı:', answers[0].answer_data);
            console.log('🔍 Answer data anahtarları:', Object.keys(answers[0].answer_data || {}));
            
            // Farklı olasılıkları kontrol et
            answers.slice(0, 3).forEach((answer, index) => {
                console.log(`🔍 Cevap ${index + 1} answer_data:`, answer.answer_data);
                
                if (answer.answer_data) {
                    console.log(`🔍 Cevap ${index + 1} answer_data anahtarları:`, Object.keys(answer.answer_data));
                    
                    // Olası store_id konumlarını kontrol et
                    console.log(`🔍 Cevap ${index + 1} store_id kontrolü:`);
                    console.log(`  - answer_data.store_id:`, answer.answer_data.store_id);
                    console.log(`  - answer_data.storeId:`, answer.answer_data.storeId);
                    console.log(`  - answer_data.store:`, answer.answer_data.store);
                    console.log(`  - answer_data.data:`, answer.answer_data.data);
                    
                    if (answer.answer_data.data) {
                        console.log(`🔍 Cevap ${index + 1} data anahtarları:`, Object.keys(answer.answer_data.data));
                        console.log(`  - data.store_id:`, answer.answer_data.data.store_id);
                        console.log(`  - data.storeId:`, answer.answer_data.data.storeId);
                        console.log(`  - data.store:`, answer.answer_data.data.store);
                    }
                }
            });
        }
        
        // Answer data'dan store_id'yi çıkar - farklı olasılıkları dene
        const storeIds = [];
        answers.forEach(answer => {
            let storeId = null;
            
            if (answer.answer_data) {
                // Olasılık 1: answer_data.store_id
                if (answer.answer_data.store_id) {
                    storeId = answer.answer_data.store_id;
                }
                // Olasılık 2: answer_data.storeId
                else if (answer.answer_data.storeId) {
                    storeId = answer.answer_data.storeId;
                }
                // Olasılık 3: answer_data.store
                else if (answer.answer_data.store) {
                    storeId = answer.answer_data.store;
                }
                // Olasılık 4: answer_data.data.store_id
                else if (answer.answer_data.data && answer.answer_data.data.store_id) {
                    storeId = answer.answer_data.data.store_id;
                }
                // Olasılık 5: answer_data.data.storeId
                else if (answer.answer_data.data && answer.answer_data.data.storeId) {
                    storeId = answer.answer_data.data.storeId;
                }
                // Olasılık 6: answer_data.data.store
                else if (answer.answer_data.data && answer.answer_data.data.store) {
                    storeId = answer.answer_data.data.store;
                }
            }
            
            if (storeId) {
                storeIds.push(storeId);
            }
        });
        
        console.log('🔍 Bulunan store ID\'leri:', storeIds);
        
        if (storeIds.length === 0) {
            alert('Hiç mağaza ID\'si bulunamadı! Console\'da answer_data yapısını kontrol edin.');
            return;
        }
        
        // Mağaza bilgilerini ayrı sorgu ile al
        const uniqueStoreIds = [...new Set(storeIds)];
        const { data: stores, error: storesError } = await supabase
            .from('stores')
            .select('id, name, region_id, channel_id')
            .in('id', uniqueStoreIds);
        
        if (storesError) {
            console.error('❌ Mağaza sorgu hatası:', storesError);
            alert('Mağaza sorgusu başarısız: ' + storesError.message);
            return;
        }
        
        // Mağaza bilgilerini ID'ye göre map'le
        const storeMap = {};
        stores.forEach(store => {
            storeMap[store.id] = store;
        });
        
        // Bölge ve kanal filtrelerini uygula
        let filteredAnswers = answers.filter(answer => {
            let storeId = null;
            
            if (answer.answer_data) {
                // Olasılık 1: answer_data.store_id
                if (answer.answer_data.store_id) {
                    storeId = answer.answer_data.store_id;
                }
                // Olasılık 2: answer_data.storeId
                else if (answer.answer_data.storeId) {
                    storeId = answer.answer_data.storeId;
                }
                // Olasılık 3: answer_data.store
                else if (answer.answer_data.store) {
                    storeId = answer.answer_data.store;
                }
                // Olasılık 4: answer_data.data.store_id
                else if (answer.answer_data.data && answer.answer_data.data.store_id) {
                    storeId = answer.answer_data.data.store_id;
                }
                // Olasılık 5: answer_data.data.storeId
                else if (answer.answer_data.data && answer.answer_data.data.storeId) {
                    storeId = answer.answer_data.data.storeId;
                }
                // Olasılık 6: answer_data.data.store
                else if (answer.answer_data.data && answer.answer_data.data.store) {
                    storeId = answer.answer_data.data.store;
                }
            }
            
            if (!storeId) return false;
            
            const store = storeMap[storeId];
            if (!store) return false;
            
            // Bölge filtresi
            if (regionFilter && store.region_id != regionFilter) {
                return false;
            }
            
            // Kanal filtresi
            if (channelFilter && store.channel_id != channelFilter) {
                return false;
            }
            
            // Mağaza filtresi
            if (storeFilter && storeId != storeFilter) {
                return false;
            }
            
            return true;
        });
        
        console.log('📊 Filtrelenmiş cevaplar:', filteredAnswers.length);
        
        // Sepet verilerini analiz et
        let totalBaskets = 0;
        let brandCounts = {};
        let regionCounts = {};
        let channelCounts = {};
        let storeCounts = {};
        
        filteredAnswers.forEach(answer => {
            let storeId = null;
            
            if (answer.answer_data) {
                // Olasılık 1: answer_data.store_id
                if (answer.answer_data.store_id) {
                    storeId = answer.answer_data.store_id;
                }
                // Olasılık 2: answer_data.storeId
                else if (answer.answer_data.storeId) {
                    storeId = answer.answer_data.storeId;
                }
                // Olasılık 3: answer_data.store
                else if (answer.answer_data.store) {
                    storeId = answer.answer_data.store;
                }
                // Olasılık 4: answer_data.data.store_id
                else if (answer.answer_data.data && answer.answer_data.data.store_id) {
                    storeId = answer.answer_data.data.store_id;
                }
                // Olasılık 5: answer_data.data.storeId
                else if (answer.answer_data.data && answer.answer_data.data.storeId) {
                    storeId = answer.answer_data.data.storeId;
                }
                // Olasılık 6: answer_data.data.store
                else if (answer.answer_data.data && answer.answer_data.data.store) {
                    storeId = answer.answer_data.data.store;
                }
            }
            
            const store = storeMap[storeId];
            
            console.log('🔍 Cevap analiz ediliyor:', {
                id: answer.id,
                survey_id: answer.survey_id,
                store_id: storeId,
                store_name: store?.name || 'Bilinmeyen',
                region_id: store?.region_id || 'Bilinmeyen',
                channel_id: store?.channel_id || 'Bilinmeyen'
            });
            
            // Region ve channel sayıları
            const regionId = store?.region_id;
            const channelId = store?.channel_id;
            
            if (regionId) regionCounts[regionId] = (regionCounts[regionId] || 0) + 1;
            if (channelId) channelCounts[channelId] = (channelCounts[channelId] || 0) + 1;
            if (storeId) storeCounts[storeId] = (storeCounts[storeId] || 0) + 1;
            
            // Answer data'dan sepet bilgilerini çıkar
            if (answer.answer_data && answer.answer_data.data) {
                const basketData = answer.answer_data.data;
                
                if (Array.isArray(basketData)) {
                    basketData.forEach(basket => {
                        if (basket.baskets && Array.isArray(basket.baskets)) {
                            basket.baskets.forEach(basketItem => {
                                totalBaskets++;
                                const brand = basketItem.brand;
                                if (brand) {
                                    brandCounts[brand] = (brandCounts[brand] || 0) + 1;
                                }
                                
                                console.log('📦 Sepet öğesi:', {
                                    brand: basketItem.brand,
                                    basket_type: basketItem.basket_type,
                                    upper_group: basketItem.upper_group,
                                    lower_group: basketItem.lower_group,
                                    artikel: basketItem.artikel,
                                    price: basketItem.price
                                });
                            });
                        }
                    });
                }
            }
        });
        
        // Sonuçları göster
        console.log('\n📊 SUPABASE SAYIM SONUÇLARI:');
        console.log('🔍 Toplam cevap sayısı:', filteredAnswers.length);
        console.log('🔍 Toplam sepet sayısı:', totalBaskets);
        console.log('🔍 Marka sayıları:', brandCounts);
        console.log('🔍 Bölge sayıları:', regionCounts);
        console.log('🔍 Kanal sayıları:', channelCounts);
        console.log('🔍 Mağaza sayıları:', storeCounts);
        
        // Alert ile göster
        let brandText = '';
        Object.keys(brandCounts).forEach(brand => {
            brandText += `\n${brand}: ${brandCounts[brand]}`;
        });
        
        let regionText = '';
        Object.keys(regionCounts).forEach(regionId => {
            const region = basketReportData.regions.find(r => r.id == regionId);
            regionText += `\n${region?.name || regionId}: ${regionCounts[regionId]}`;
        });
        
        let channelText = '';
        Object.keys(channelCounts).forEach(channelId => {
            const channel = basketReportData.channels.find(c => c.id == channelId);
            channelText += `\n${channel?.name || channelId}: ${channelCounts[channelId]}`;
        });
        
        alert(`SUPABASE SAYIM SONUÇLARI:\n\nToplam Cevap: ${filteredAnswers.length}\nToplam Sepet: ${totalBaskets}\n\nMarka Sayıları:${brandText}\n\nBölge Sayıları:${regionText}\n\nKanal Sayıları:${channelText}`);
        
    } catch (error) {
        console.error('❌ Supabase sayım hatası:', error);
        alert('Sayım işlemi başarısız: ' + error.message);
    }
}

// Debug fonksiyonu - gerçek sepet verilerini göster
function debugBasketData() {
    console.log('🔍 DEBUG: Sepet verileri analizi başlatılıyor...');
    console.log('🔍 Toplam sepet analizi:', basketReportData.basketAnalysis.length);
    
    if (basketReportData.basketAnalysis.length === 0) {
        console.log('⚠️ Sepet analizi verisi bulunamadı!');
        return;
    }
    
    // Tüm sepet verilerini detaylı analiz et
    basketReportData.basketAnalysis.forEach((item, index) => {
        console.log(`\n🔍 Sepet Analizi ${index + 1}:`, {
            id: item.id,
            survey_id: item.survey_id,
            store_id: item.store_id,
            baskets_count: item.baskets?.length || 0
        });
        
        if (item.baskets && item.baskets.length > 0) {
            item.baskets.forEach((basket, basketIndex) => {
                console.log(`  📦 Basket ${basketIndex + 1}:`, {
                    basket_type: basket.basket_type,
                    upper_group: basket.upper_group,
                    lower_group: basket.lower_group,
                    brand: basket.brand,
                    artikel: basket.artikel,
                    price: basket.price,
                    tüm_alanlar: Object.keys(basket)
                });
            });
        }
    });
    
    // Unique değerleri çıkar
    const uniqueTypes = [...new Set(basketReportData.basketAnalysis.flatMap(item => 
        item.baskets?.map(basket => basket.basket_type).filter(Boolean) || []
    ))];
    
    const uniqueUpperGroups = [...new Set(basketReportData.basketAnalysis.flatMap(item => 
        item.baskets?.map(basket => basket.upper_group).filter(Boolean) || []
    ))];
    
    const uniqueLowerGroups = [...new Set(basketReportData.basketAnalysis.flatMap(item => 
        item.baskets?.map(basket => basket.lower_group).filter(Boolean) || []
    ))];
    
    // Üst grup ve alt grup eşleşmelerini analiz et
    const upperLowerMappings = {};
    basketReportData.basketAnalysis.forEach(item => {
        item.baskets?.forEach(basket => {
            const upperGroup = basket.upper_group || basket.group || basket.category;
            const lowerGroup = basket.lower_group || basket.sub_group || basket.subcategory;
            
            if (upperGroup && lowerGroup) {
                if (!upperLowerMappings[upperGroup]) {
                    upperLowerMappings[upperGroup] = new Set();
                }
                upperLowerMappings[upperGroup].add(lowerGroup);
            }
        });
    });
    
    // Set'leri array'e çevir
    Object.keys(upperLowerMappings).forEach(key => {
        upperLowerMappings[key] = Array.from(upperLowerMappings[key]);
    });
    
    console.log('\n📊 UNIQUE DEĞERLER:');
    console.log('🔍 Sepet Türleri:', uniqueTypes);
    console.log('🔍 Üst Gruplar:', uniqueUpperGroups);
    console.log('🔍 Alt Gruplar:', uniqueLowerGroups);
    console.log('🔍 Üst Grup - Alt Grup Eşleşmeleri:', upperLowerMappings);
    
    // Mağaza bilgilerini kontrol et
    console.log('\n🔍 Mağaza bilgileri:');
    basketReportData.stores.forEach(store => {
        console.log(`  🏪 Mağaza ${store.id}: ${store.name}, Bölge: ${store.region_id}, Kanal: ${store.channel_id}`);
    });
    
    // Alert ile de göster
    let mappingText = '';
    Object.keys(upperLowerMappings).forEach(upperGroup => {
        mappingText += `\n${upperGroup}: ${upperLowerMappings[upperGroup].join(', ')}`;
    });
    
    alert(`Sepet Verileri:\n\nSepet Türleri: ${uniqueTypes.join(', ')}\nÜst Gruplar: ${uniqueUpperGroups.join(', ')}\nAlt Gruplar: ${uniqueLowerGroups.join(', ')}\n\nÜst Grup - Alt Grup Eşleşmeleri:${mappingText}\n\nMağaza Sayısı: ${basketReportData.stores.length}\nToplam Sepet Analizi: ${basketReportData.basketAnalysis.length}`);
}

// Event listener'ları kur
function setupBasketEventListeners() {
    try {
        console.log('🔍 Sepet raporu event listener\'ları kuruluyor...');
        
        // Filtre dropdown'larına event listener ekle
        const surveyFilter = document.getElementById('basket-filter-survey');
        const regionFilter = document.getElementById('basket-filter-region');
        const channelFilter = document.getElementById('basket-filter-channel');
        const storeFilter = document.getElementById('basket-filter-store');
        const brandFilter = document.getElementById('basket-filter-brand');
        const typeFilter = document.getElementById('basket-filter-type');
        const upperGroupFilter = document.getElementById('basket-filter-upper-group');
        const lowerGroupFilter = document.getElementById('basket-filter-lower-group');
        const applyBtn = document.getElementById('basket-apply-btn');
        
        console.log('🔍 Elementler bulundu:', {
            surveyFilter: !!surveyFilter,
            regionFilter: !!regionFilter,
            channelFilter: !!channelFilter,
            storeFilter: !!storeFilter,
            brandFilter: !!brandFilter,
            typeFilter: !!typeFilter,
            upperGroupFilter: !!upperGroupFilter,
            lowerGroupFilter: !!lowerGroupFilter,
            applyBtn: !!applyBtn
        });
        
        if (surveyFilter) {
            surveyFilter.addEventListener('change', applyBasketFilters);
            console.log('✅ Survey filter event listener eklendi');
        }
        if (regionFilter) {
            regionFilter.addEventListener('change', applyBasketFilters);
            console.log('✅ Region filter event listener eklendi');
        }
        if (channelFilter) {
            channelFilter.addEventListener('change', applyBasketFilters);
            console.log('✅ Channel filter event listener eklendi');
        }
        if (storeFilter) {
            storeFilter.addEventListener('change', applyBasketFilters);
            console.log('✅ Store filter event listener eklendi');
        }
        if (brandFilter) {
            brandFilter.addEventListener('change', applyBasketFilters);
            console.log('✅ Brand filter event listener eklendi');
        }
        if (typeFilter) {
            typeFilter.addEventListener('change', applyBasketFilters);
            console.log('✅ Type filter event listener eklendi');
        }
        if (upperGroupFilter) {
            upperGroupFilter.addEventListener('change', function() {
                // Alt grup filtrelerini güncelle
                updateLowerGroupFilter();
                // Filtreleri uygula
                applyBasketFilters();
            });
            console.log('✅ Upper group filter event listener eklendi');
        }
        if (lowerGroupFilter) {
            lowerGroupFilter.addEventListener('change', applyBasketFilters);
            console.log('✅ Lower group filter event listener eklendi');
        }
        if (applyBtn) {
            applyBtn.addEventListener('click', applyBasketFilters);
            console.log('✅ Apply button event listener eklendi');
        }
        
        console.log('✅ Sepet raporu event listener\'ları kuruldu');
        
    } catch (error) {
        console.error('❌ Sepet raporu event listener kurma hatası:', error);
    }
}

// Excel export fonksiyonu
function exportBasketToExcel() {
    try {
        const dataToUse = basketReportData.filteredData.length > 0 ? basketReportData.filteredData : basketReportData.basketAnalysis;
        
        if (dataToUse.length === 0) {
            alert('İhracat edilecek veri bulunamadı!');
            return;
        }
        
        // Excel verisi hazırla
        const excelData = [];
        
        dataToUse.forEach(item => {
            if (item.baskets && Array.isArray(item.baskets)) {
                item.baskets.forEach(basket => {
                    const store = basketReportData.stores.find(s => s.id === item.store_id);
                    const survey = basketReportData.surveys.find(s => s.id === item.survey_id);
                    
                    excelData.push({
                        'Anket': survey?.title || 'N/A',
                        'Mağaza': store?.name || 'N/A',
                        'Bölge': store ? basketReportData.regions.find(r => r.code === store.region)?.name || 'N/A' : 'N/A',
                        'Kanal': store ? basketReportData.channels.find(c => c.code === store.channel)?.name || 'N/A' : 'N/A',
                        'Marka': basket.brand || basket.brand_name || basket.product_brand || basket.item_brand || 'N/A',
                        'Artikel Kodu': basket.article_code || basket.articleCode || basket.product_code || basket.code || basket.sku || 'N/A',
                        'Ürün Adı': basket.product_name || basket.name || basket.title || 'N/A',
                        'Fiyat': basket.price || basket.unit_price || basket.cost || 0,
                        'Miktar': basket.count || basket.quantity || basket.amount || 1,
                        'Toplam': (basket.price || basket.unit_price || basket.cost || 0) * (basket.count || basket.quantity || basket.amount || 1),
                        'Tarih': new Date(item.created_at).toLocaleDateString('tr-TR')
                    });
                });
            }
        });
        
        // Excel dosyası oluştur
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sepet Raporu');
        
        // Dosyayı indir
        const fileName = `sepet_raporu_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        console.log('✅ Sepet raporu Excel olarak ihraç edildi');
        
    } catch (error) {
        console.error('❌ Sepet raporu Excel ihraç hatası:', error);
        alert('Excel ihraç edilirken hata oluştu!');
    }
}

// Sayfa yüklendiğinde sepet raporu bölümü gösterildiğinde çalışacak
document.addEventListener('DOMContentLoaded', function() {
    // showSection fonksiyonunu override et
    const originalShowSection = window.showSection;
    window.showSection = function(sectionName) {
        originalShowSection(sectionName);
        
        if (sectionName === 'basket-report') {
            showBasketReport();
        }
    };
});

// Modal grafiği göster
function showChartModal(chartId, title, data) {
    const modalHtml = `
        <div class="modal fade" id="chartModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <canvas id="modalChart" width="800" height="400"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Eski modalı kaldır
    const existingModal = document.getElementById('chartModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Yeni modalı ekle
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Modalı göster
    const modal = new bootstrap.Modal(document.getElementById('chartModal'));
    modal.show();
    
    // Modal kapatıldığında grafiği temizle
    document.getElementById('chartModal').addEventListener('hidden.bs.modal', function() {
        if (window.modalChart && typeof window.modalChart.destroy === 'function') {
            window.modalChart.destroy();
            window.modalChart = null;
        }
    });
    
    // Grafiği oluştur
    setTimeout(() => {
        createModalChart(chartId, title, data);
    }, 500);
}

// Modal grafiği oluştur
function createModalChart(chartId, title, data) {
    const canvas = document.getElementById('modalChart');
    if (!canvas) return;
    
    // Önceki grafiği temizle
    if (window.modalChart && typeof window.modalChart.destroy === 'function') {
        window.modalChart.destroy();
    }
    
    let chartConfig;
    
    switch (chartId) {
        case 'basket-brand-chart':
            chartConfig = {
                type: 'doughnut',
                data: {
                    labels: data.labels,
                    datasets: [{
                        data: data.values,
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { title: { display: true, text: title } }
                }
            };
            break;
            
        case 'basket-trend-chart':
            const datasets = data.brands.map((brand, index) => ({
                label: brand,
                data: data.surveys.map(surveyId => data.brandTrends[brand][surveyId] || 0),
                borderColor: `hsl(${index * 60}, 70%, 50%)`,
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
                    plugins: { title: { display: true, text: title } },
                    scales: { y: { beginAtZero: true } }
                }
            };
            break;
            
        case 'basket-percentage-chart':
            chartConfig = {
                type: 'pie',
                data: {
                    labels: data.labels,
                    datasets: [{
                        data: data.values,
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { title: { display: true, text: title } }
                }
            };
            break;
            
        case 'basket-top-articles-chart':
            chartConfig = {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Sepet Sayısı',
                        data: data.values,
                        backgroundColor: '#4BC0C0'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { title: { display: true, text: title } },
                    scales: { y: { beginAtZero: true } }
                }
            };
            break;
    }
    
    if (chartConfig) {
        window.modalChart = new Chart(canvas, chartConfig);
    }
}
