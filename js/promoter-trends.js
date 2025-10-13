/**
 * Promoter Trends Analysis
 * Promotör değişim analizi ve grafik gösterimi
 */

// Global değişkenler
let trendCharts = {
    promoterTrend: null,
    surveyComparison: null,
    brandDistribution: null
};

let trendData = {
    surveys: [],
    regions: [],
    channels: [],
    promoterData: []
};

/**
 * Promoter trends bölümünü yükle
 */
function loadPromoterTrendSection() {
    console.log('📊 Promoter trends bölümü yükleniyor...');
    
    // Filtreleri yükle
    loadTrendFilters();
    
    // Varsayılan verileri yükle
    loadTrendData();
}

/**
 * Trend filtrelerini yükle
 */
async function loadTrendFilters() {
    try {
        console.log('🔧 Trend filtreleri yükleniyor...');
        
        // Bölgeleri yükle
        const { data: regions, error: regionError } = await supabase
            .from('regions')
            .select('id, name')
            .order('name');
        
        if (regionError) throw regionError;
        
        // Kanalları yükle
        const { data: channels, error: channelError } = await supabase
            .from('channels')
            .select('id, name')
            .order('name');
        
        if (channelError) throw channelError;
        
        // Anketleri yükle
        const { data: surveys, error: surveyError } = await supabase
            .from('surveys')
            .select('id, title, created_at')
            .order('created_at', { ascending: false });
        
        if (surveyError) throw surveyError;
        
        // Markaları yükle
        const { data: brands, error: brandError } = await supabase
            .from('brands')
            .select('id, name')
            .order('name');
        
        if (brandError) throw brandError;
        
        // Filtreleri doldur
        fillRegionFilter(regions);
        fillChannelFilter(channels);
        fillSurveyFilter(surveys);
        fillBrandFilter(brands);
        
        // Global data'yı güncelle
        trendData.regions = regions;
        trendData.channels = channels;
        trendData.surveys = surveys;
        trendData.brands = brands;
        
        console.log('✅ Trend filtreleri yüklendi');
        
    } catch (error) {
        console.error('❌ Filtre yükleme hatası:', error);
        alert('Filtre yükleme hatası: ' + error.message);
    }
}

/**
 * Bölge filtresini doldur
 */
function fillRegionFilter(regions) {
    const select = document.getElementById('trend-region-filter');
    select.innerHTML = '<option value="">Tüm Bölgeler</option>';
    
    regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region.id;
        option.textContent = region.name;
        select.appendChild(option);
    });
}

/**
 * Kanal filtresini doldur
 */
function fillChannelFilter(channels) {
    const select = document.getElementById('trend-channel-filter');
    select.innerHTML = '<option value="">Tüm Kanallar</option>';
    
    channels.forEach(channel => {
        const option = document.createElement('option');
        option.value = channel.id;
        option.textContent = channel.name;
        select.appendChild(option);
    });
}

/**
 * Anket filtresini doldur
 */
function fillSurveyFilter(surveys) {
    const select = document.getElementById('trend-survey-filter');
    select.innerHTML = '';
    
    surveys.forEach(survey => {
        const option = document.createElement('option');
        option.value = survey.id;
        option.textContent = survey.title;
        select.appendChild(option);
    });
}

/**
 * Marka filtresini doldur
 */
function fillBrandFilter(brands) {
    const select = document.getElementById('trend-brand-filter');
    select.innerHTML = '';
    
    brands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand.name;
        option.textContent = brand.name;
        select.appendChild(option);
    });
}

/**
 * Trend verilerini yükle
 */
async function loadTrendData() {
    try {
        console.log('📊 Trend verileri yükleniyor...');
        
        // Promoter verilerini çek
        const { data: responses, error: responseError } = await supabase
            .from('survey_responses')
            .select(`
                id, survey_id, store_id, status,
                surveys(id, title, created_at),
                stores(id, name, region_id, channel_id, regions(name), channels(name))
            `)
            .eq('status', 'completed');
        
        if (responseError) throw responseError;
        
        // Survey answers'ları çek (promoter_count tipindeki sorular için)
        const responseIds = responses.map(r => r.id);
        const { data: answers, error: answerError } = await supabase
            .from('survey_answers')
            .select(`
                response_id, 
                question_id,
                answer_data,
                survey_questions(question_type)
            `)
            .in('response_id', responseIds);
        
        if (answerError) throw answerError;
        
        // Veriyi işle
        const processedData = processPromoterTrendData(responses, answers);
        trendData.promoterData = processedData;
        
        // Grafikleri oluştur
        createTrendCharts(processedData);
        
        console.log('✅ Trend verileri yüklendi');
        
    } catch (error) {
        console.error('❌ Trend veri yükleme hatası:', error);
        alert('Trend veri yükleme hatası: ' + error.message);
    }
}

/**
 * Promoter trend verilerini işle
 */
function processPromoterTrendData(responses, answers) {
    const processedData = [];
    
    responses.forEach(response => {
        const survey = response.surveys;
        const store = response.stores;
        
        // Bu response için promoter cevaplarını bul
        const promoterAnswers = answers.filter(a => a.response_id === response.id);
        
        promoterAnswers.forEach(answer => {
            // Sadece promoter_count tipindeki soruları işle
            if (answer.survey_questions?.question_type === 'promoter_count' && 
                answer.answer_data && answer.answer_data.brands) {
                answer.answer_data.brands.forEach(brand => {
                    if (brand.selected && brand.count > 0) {
                        processedData.push({
                            surveyId: survey.id,
                            surveyTitle: survey.title,
                            surveyDate: survey.created_at,
                            regionId: store.region_id,
                            regionName: store.regions?.name || 'Bilinmeyen',
                            channelId: store.channel_id,
                            channelName: store.channels?.name || 'Bilinmeyen',
                            storeId: store.id,
                            storeName: store.name,
                            brandLabel: brand.brand_label || brand.brand,
                            brandValue: brand.brand,
                            promoterCount: brand.count,
                            customName: brand.custom_name
                        });
                    }
                });
            }
        });
    });
    
    return processedData;
}

/**
 * Trend grafiklerini oluştur
 */
function createTrendCharts(data) {
    console.log('📈 Trend grafikleri oluşturuluyor...', data);
    
    // Zaman serisi grafiği
    createPromoterTrendChart(data);
    
    // Marka dağılım grafiği
    createBrandDistributionChart(data);
    
    // Detay tablosunu doldur
    fillTrendDetailsTable(data);
}

/**
 * Promoter trend line chart oluştur
 */
function createPromoterTrendChart(data) {
    const ctx = document.getElementById('promoterTrendChart').getContext('2d');
    
    // Eğer önceki chart varsa yok et
    if (trendCharts.promoterTrend) {
        trendCharts.promoterTrend.destroy();
    }
    
    // Veriyi anket bazında grupla
    const surveyData = {};
    data.forEach(item => {
        const surveyKey = `${item.surveyId}-${item.surveyTitle}`;
        
        if (!surveyData[surveyKey]) {
            surveyData[surveyKey] = {
                surveyId: item.surveyId,
                surveyTitle: item.surveyTitle,
                surveyDate: item.surveyDate,
                totalPromoters: 0,
                brandCounts: {}
            };
        }
        
        surveyData[surveyKey].totalPromoters += item.promoterCount;
        
        if (!surveyData[surveyKey].brandCounts[item.brandLabel]) {
            surveyData[surveyKey].brandCounts[item.brandLabel] = 0;
        }
        surveyData[surveyKey].brandCounts[item.brandLabel] += item.promoterCount;
    });
    
    // Anketleri tarihe göre sırala
    const sortedSurveys = Object.values(surveyData).sort((a, b) => 
        new Date(a.surveyDate) - new Date(b.surveyDate)
    );
    
    const labels = sortedSurveys.map(s => s.surveyTitle);
    const totalPromoters = sortedSurveys.map(s => s.totalPromoters);
    
    // Marka filtresi kontrolü
    const selectedBrands = Array.from(document.getElementById('trend-brand-filter').selectedOptions)
        .map(option => option.value);
    
    console.log('🔍 Seçili markalar:', selectedBrands);
    console.log('🔍 Survey data:', surveyData);
    
    // Datasets'i oluştur
    const datasets = [];
    
    if (selectedBrands.length === 0) {
        // Hiç marka seçilmemişse toplam göster
        datasets.push({
            label: 'Toplam Promotör Sayısı',
            data: totalPromoters,
            borderColor: '#36A2EB',
            backgroundColor: '#36A2EB20',
            tension: 0.4,
            fill: true,
            pointRadius: 6,
            pointHoverRadius: 8
        });
    } else {
        // Seçili markalar için ayrı çizgiler
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'];
        
        selectedBrands.forEach((brand, index) => {
            const brandData = sortedSurveys.map(survey => 
                survey.brandCounts[brand] || 0
            );
            
            datasets.push({
                label: brand,
                data: brandData,
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length] + '20',
                tension: 0.4,
                fill: false,
                pointRadius: 6,
                pointHoverRadius: 8
            });
        });
    }
    
    trendCharts.promoterTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: selectedBrands.length === 0 ? 
                        'Anket Bazında Promotör Sayısı Trendi' : 
                        `Seçili Markaların Promotör Trendi (${selectedBrands.join(', ')})`,
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Promotör Sayısı',
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Anketler',
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}


/**
 * Marka dağılım pie chart oluştur
 */
function createBrandDistributionChart(data) {
    const ctx = document.getElementById('brandDistributionChart').getContext('2d');
    
    if (trendCharts.brandDistribution) {
        trendCharts.brandDistribution.destroy();
    }
    
    // Marka bazında toplam promotör sayısını hesapla
    const brandTotals = {};
    data.forEach(item => {
        if (!brandTotals[item.brandLabel]) {
            brandTotals[item.brandLabel] = 0;
        }
        brandTotals[item.brandLabel] += item.promoterCount;
    });
    
    // Markaları promotör sayısına göre sırala
    const sortedBrands = Object.entries(brandTotals)
        .sort(([,a], [,b]) => b - a);
    
    const brands = sortedBrands.map(([brand]) => brand);
    const counts = sortedBrands.map(([,count]) => count);
    
    // Renk paleti
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384',
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
    ];
    
    trendCharts.brandDistribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: brands,
            datasets: [{
                data: counts,
                backgroundColor: colors.slice(0, brands.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Marka Bazında Promotör Dağılımı',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                }
            }
        }
    });
    
    // Marka listesini oluştur
    createBrandDistributionList(sortedBrands);
}

/**
 * Marka dağılım listesini oluştur
 */
function createBrandDistributionList(sortedBrands) {
    const container = document.getElementById('brandDistributionList');
    container.innerHTML = '';
    
    const totalPromoters = sortedBrands.reduce((sum, [,count]) => sum + count, 0);
    
    const title = document.createElement('h6');
    title.className = 'mb-3 fw-bold';
    title.textContent = 'Marka Detayları';
    container.appendChild(title);
    
    sortedBrands.forEach(([brand, count], index) => {
        const percentage = ((count / totalPromoters) * 100).toFixed(1);
        
        const item = document.createElement('div');
        item.className = 'd-flex justify-content-between align-items-center mb-2 p-2 border rounded';
        item.style.backgroundColor = '#f8f9fa';
        
        const brandInfo = document.createElement('div');
        brandInfo.className = 'd-flex align-items-center';
        
        const colorDot = document.createElement('div');
        colorDot.style.width = '12px';
        colorDot.style.height = '12px';
        colorDot.style.borderRadius = '50%';
        colorDot.style.backgroundColor = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
        ][index % 10];
        colorDot.style.marginRight = '8px';
        
        const brandName = document.createElement('span');
        brandName.className = 'fw-semibold';
        brandName.textContent = brand;
        
        brandInfo.appendChild(colorDot);
        brandInfo.appendChild(brandName);
        
        const countInfo = document.createElement('div');
        countInfo.className = 'text-end';
        
        const countText = document.createElement('div');
        countText.className = 'fw-bold text-primary';
        countText.textContent = count + ' kişi';
        
        const percentageText = document.createElement('div');
        percentageText.className = 'small text-muted';
        percentageText.textContent = percentage + '%';
        
        countInfo.appendChild(countText);
        countInfo.appendChild(percentageText);
        
        item.appendChild(brandInfo);
        item.appendChild(countInfo);
        
        container.appendChild(item);
    });
}

/**
 * Detay tablosunu doldur
 */
function fillTrendDetailsTable(data) {
    const tbody = document.querySelector('#trendDetailsTable tbody');
    tbody.innerHTML = '';
    
    // Veriyi sırala (anket tarihi, marka)
    const sortedData = data.sort((a, b) => {
        const dateCompare = new Date(a.surveyDate) - new Date(b.surveyDate);
        if (dateCompare !== 0) return dateCompare;
        return a.brandLabel.localeCompare(b.brandLabel);
    });
    
    sortedData.forEach(item => {
        const row = document.createElement('tr');
        
        // Değişim hesapla (önceki anket ile karşılaştır)
        const previousData = data.filter(d => 
            d.brandLabel === item.brandLabel && 
            d.surveyDate < item.surveyDate
        );
        
        let changeText = '-';
        let changeClass = '';
        
        if (previousData.length > 0) {
            const previousCount = Math.max(...previousData.map(d => d.promoterCount));
            const change = item.promoterCount - previousCount;
            
            if (change > 0) {
                changeText = `+${change}`;
                changeClass = 'text-success';
            } else if (change < 0) {
                changeText = change.toString();
                changeClass = 'text-danger';
            } else {
                changeText = '0';
                changeClass = 'text-muted';
            }
        }
        
        row.innerHTML = `
            <td>${item.surveyTitle}</td>
            <td>${item.regionName}</td>
            <td>${item.channelName}</td>
            <td>${item.brandLabel}</td>
            <td>${item.promoterCount}</td>
            <td><span class="${changeClass}">${changeText}</span></td>
        `;
        
        tbody.appendChild(row);
    });
}

/**
 * Trend verilerini Excel'e aktar
 */
function exportTrendData() {
    try {
        console.log('📊 Trend verileri Excel\'e aktarılıyor...');
        
        // Veriyi hazırla
        const exportData = trendData.promoterData.map(item => ({
            'Anket': item.surveyTitle,
            'Tarih': new Date(item.surveyDate).toLocaleDateString('tr-TR'),
            'Bölge': item.regionName,
            'Kanal': item.channelName,
            'Mağaza': item.storeName,
            'Marka': item.brandLabel,
            'Promotör Sayısı': item.promoterCount,
            'Özel İsim': item.customName || '-'
        }));
        
        // Excel dosyası oluştur
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Promotör Trend Analizi');
        
        // Dosyayı indir
        const fileName = `Promotor_Trend_Analizi_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        console.log('✅ Excel dosyası oluşturuldu:', fileName);
        
    } catch (error) {
        console.error('❌ Excel export hatası:', error);
        alert('Excel export hatası: ' + error.message);
    }
}

// Event listener'ları ekle
document.addEventListener('DOMContentLoaded', function() {
    // Filtre uygulama butonu
    document.getElementById('apply-trend-filters')?.addEventListener('click', function() {
        applyTrendFilters();
    });
});

/**
 * Trend filtrelerini uygula
 */
function applyTrendFilters() {
    console.log('🔧 Trend filtreleri uygulanıyor...');
    
    // Filtre değerlerini al
    const regionFilter = document.getElementById('trend-region-filter').value;
    const channelFilter = document.getElementById('trend-channel-filter').value;
    const surveyFilter = Array.from(document.getElementById('trend-survey-filter').selectedOptions)
        .map(option => option.value);
    const brandFilter = Array.from(document.getElementById('trend-brand-filter').selectedOptions)
        .map(option => option.value);
    
    console.log('Filtreler:', { regionFilter, channelFilter, surveyFilter, brandFilter });
    
    // Veriyi filtrele
    let filteredData = trendData.promoterData;
    
    if (regionFilter) {
        filteredData = filteredData.filter(item => item.regionId == regionFilter);
    }
    
    if (channelFilter) {
        filteredData = filteredData.filter(item => item.channelId == channelFilter);
    }
    
    if (surveyFilter.length > 0) {
        filteredData = filteredData.filter(item => surveyFilter.includes(item.surveyId.toString()));
    }
    
    if (brandFilter.length > 0) {
        filteredData = filteredData.filter(item => brandFilter.includes(item.brandLabel));
    }
    
    console.log('Filtrelenmiş veri:', filteredData);
    
    // Grafikleri yeniden oluştur
    createTrendCharts(filteredData);
}

console.log('✅ Promoter Trends JS yüklendi');
