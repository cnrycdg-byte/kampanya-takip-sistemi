// ============================================
// ADMIN ANKET YÖNETİMİ - YARDIMCI FONKSİYONLAR
// ============================================

console.log('Admin Survey Helpers JS yüklendi');

// Global değişkenlere erişim kontrolü
if (typeof QUESTION_TEMPLATES === 'undefined') {
    console.error('❌ QUESTION_TEMPLATES tanımlı değil! admin-survey.js önce yüklenmeli.');
}
if (typeof allStores === 'undefined') {
    console.error('❌ allStores tanımlı değil! admin-survey.js önce yüklenmeli.');
}

// ============================================
// 1. ŞABLONDAN SORU EKLEME
// ============================================

function addQuestionFromTemplate(templateKey) {
    const template = QUESTION_TEMPLATES[templateKey];
    if (!template) {
        console.error('Template bulunamadı:', templateKey);
        return;
    }
    
    const container = document.getElementById('survey-questions-builder');
    const questionIndex = surveyQuestionCounter++;
    
    let questionHtml = `
        <div class="card mb-3 survey-question-card" id="question-card-${questionIndex}" data-type="${template.type}">
            <div class="card-header d-flex justify-content-between align-items-center bg-light">
                <span>
                    <i class="fas fa-grip-vertical me-2 text-muted"></i>
                    <strong>Soru ${questionIndex + 1}:</strong> ${getQuestionTypeName(template.type)}
                </span>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeSurveyQuestion(${questionIndex})">
                    <i class="fas fa-trash"></i> Sil
                </button>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label class="form-label">Soru Metni *</label>
                    <textarea class="form-control question-text" rows="2" required>${template.text}</textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label">Yardım Metni</label>
                    <input type="text" class="form-control question-help" 
                           value="${template.help || ''}" placeholder="Opsiyonel">
                </div>
                <div class="form-check mb-3">
                    <input class="form-check-input question-required" type="checkbox" 
                           id="required-${questionIndex}" ${template.type !== 'basket_dynamic' && template.type !== 'gsm_accessory_basket' ? 'checked' : ''}>
                    <label class="form-check-label" for="required-${questionIndex}">
                        Bu soru zorunlu
                    </label>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', questionHtml);
    
    // İlk mesajı kaldır
    const emptyMessage = container.querySelector('.text-muted');
    if (emptyMessage) emptyMessage.remove();
}

// ============================================
// 2. ATAMA SEÇENEKLERİNİ GÖSTER/GİZLE
// ============================================

function toggleAssignmentOptions() {
    const selectedType = document.querySelector('input[name="assignment-type"]:checked').value;
    
    // Tüm seçim alanlarını gizle
    document.getElementById('channel-selection').style.display = 'none';
    document.getElementById('region-selection').style.display = 'none';
    document.getElementById('store-selection').style.display = 'none';
    
    // Seçilen türe göre göster
    switch (selectedType) {
        case 'channel':
            document.getElementById('channel-selection').style.display = 'block';
            loadChannels();
            break;
        case 'region':
            document.getElementById('region-selection').style.display = 'block';
            loadRegions();
            break;
        case 'store':
            document.getElementById('store-selection').style.display = 'block';
            loadStores();
            break;
    }
}

// ============================================
// 3. KANAL/BÖLGE/MAĞAZA YÜKLEME
// ============================================

async function loadChannels() {
    if (allChannels.length > 0) {
        populateChannelSelect();
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('channels')
            .select('id, name')
            .order('name');
            
        if (error) throw error;
        
        allChannels = data;
        populateChannelSelect();
    } catch (error) {
        console.error('Kanallar yüklenemedi:', error);
    }
}

function populateChannelSelect() {
    const select = document.getElementById('selected-channels');
    select.innerHTML = allChannels.map(channel => 
        `<option value="${channel.id}">${channel.name}</option>`
    ).join('');
}

async function loadRegions() {
    if (allRegions.length > 0) {
        populateRegionSelect();
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('regions')
            .select('id, name')
            .order('name');
            
        if (error) throw error;
        
        allRegions = data;
        populateRegionSelect();
    } catch (error) {
        console.error('Bölgeler yüklenemedi:', error);
    }
}

function populateRegionSelect() {
    const select = document.getElementById('selected-regions');
    select.innerHTML = allRegions.map(region => 
        `<option value="${region.id}">${region.name}</option>`
    ).join('');
}

async function loadStores() {
    if (allStores.length > 0) {
        populateStoreSelect(allStores);
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('stores')
            .select('id, name, channel_id, region_id, channels(name), regions(name)')
            .eq('is_active', true)
            .order('name');
            
        if (error) throw error;
        
        allStores = data;
        populateStoreSelect(allStores);
    } catch (error) {
        console.error('Mağazalar yüklenemedi:', error);
    }
}

function populateStoreSelect(stores) {
    const select = document.getElementById('selected-stores');
    select.innerHTML = stores.map(store => 
        `<option value="${store.id}">${store.name} (${store.channels?.name || '-'} / ${store.regions?.name || '-'})</option>`
    ).join('');
}

function filterStores() {
    const searchTerm = document.getElementById('store-search').value.toLowerCase();
    const filteredStores = allStores.filter(store => 
        store.name.toLowerCase().includes(searchTerm)
    );
    populateStoreSelect(filteredStores);
}

// ============================================
// 4. ATANAN MAĞAZALARI BELİRLE
// ============================================

async function getAssignedStoreIds() {
    const assignmentType = document.querySelector('input[name="assignment-type"]:checked').value;
    
    switch (assignmentType) {
        case 'all':
            // Tüm aktif mağazalar
            const { data: allActiveStores, error: allError } = await supabase
                .from('stores')
                .select('id')
                .eq('is_active', true);
            if (allError) throw allError;
            return allActiveStores.map(s => s.id);
            
        case 'channel':
            // Seçili kanallardaki mağazalar
            const selectedChannels = Array.from(document.getElementById('selected-channels').selectedOptions)
                .map(opt => parseInt(opt.value));
            if (selectedChannels.length === 0) {
                throw new Error('Lütfen en az bir kanal seçin');
            }
            const { data: channelStores, error: channelError } = await supabase
                .from('stores')
                .select('id')
                .in('channel_id', selectedChannels)
                .eq('is_active', true);
            if (channelError) throw channelError;
            return channelStores.map(s => s.id);
            
        case 'region':
            // Seçili bölgelerdeki mağazalar
            const selectedRegions = Array.from(document.getElementById('selected-regions').selectedOptions)
                .map(opt => parseInt(opt.value));
            if (selectedRegions.length === 0) {
                throw new Error('Lütfen en az bir bölge seçin');
            }
            const { data: regionStores, error: regionError } = await supabase
                .from('stores')
                .select('id')
                .in('region_id', selectedRegions)
                .eq('is_active', true);
            if (regionError) throw regionError;
            return regionStores.map(s => s.id);
            
        case 'store':
            // Seçili mağazalar
            const selectedStores = Array.from(document.getElementById('selected-stores').selectedOptions)
                .map(opt => parseInt(opt.value));
            if (selectedStores.length === 0) {
                throw new Error('Lütfen en az bir mağaza seçin');
            }
            return selectedStores;
            
        default:
            throw new Error('Geçersiz atama tipi');
    }
}

console.log('Admin Survey Helpers JS tamamen yüklendi ✅');

