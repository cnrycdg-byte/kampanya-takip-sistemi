// Saha Satış Uzmanı Panel JavaScript Dosyası

let currentTask = null;
let selectedPhotos = [];

// Sayfa yüklendiğinde çalışacak kod
document.addEventListener('DOMContentLoaded', function() {
    console.log('Employee dashboard yükleniyor...');
    
    // Kullanıcı oturumunu kontrol et (redirectOnFail = false, çünkü kendimiz yöneteceğiz)
    const user = checkUserSession(false);
    if (!user) {
        console.log('Kullanıcı oturumu bulunamadı, store-selection\'a yönlendiriliyor');
        // Store-selection sayfasına yönlendir, orada giriş kontrolü yapılacak
        window.location.href = 'store-selection.html';
        return;
    }
    
    console.log('Kullanıcı oturumu bulundu:', user);
    
    // Mağaza çalışanı yetkisi kontrolü
    if (user.role !== 'employee') {
        showAlert('Bu sayfaya erişim yetkiniz yok!', 'danger');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    // Mağaza ve departman kontrolü - daha esnek kontrol
    // Önce storeId kontrolü, yoksa store_id kontrolü, yoksa yönlendir
    const storeId = user.storeId || user.store_id;
    const department = user.department;
    
    if (!storeId || !department) {
        console.log('Mağaza veya departman eksik:', { storeId, department });
        
        // Store-selection sayfasından geliyorsa, localStorage'ı hemen kontrol et
        const urlParams = new URLSearchParams(window.location.search);
        const fromStoreSelection = urlParams.get('from') === 'store-selection' || 
                                   document.referrer.includes('store-selection');
        
        if (fromStoreSelection) {
            // Store-selection'dan geliyorsa, localStorage'ı birkaç kez kontrol et (yazılması gecikebilir)
            let attempts = 0;
            const checkUserData = setInterval(() => {
                attempts++;
                const updatedUser = getFromStorage('currentUser');
                
                if (updatedUser && (updatedUser.storeId || updatedUser.store_id) && updatedUser.department) {
                    console.log('✅ Kullanıcı bilgileri bulundu, sayfa yenileniyor');
                    clearInterval(checkUserData);
                    // URL parametresini temizle ve yeniden yükle
                    window.location.replace('employee-dashboard.html');
                    return;
                }
                
                // 10 denemeden sonra vazgeç (2 saniye)
                if (attempts >= 10) {
                    console.warn('⚠️ Kullanıcı bilgileri yüklenemedi, store-selection\'a yönlendiriliyor');
                    clearInterval(checkUserData);
                    window.location.replace('store-selection.html');
                    return;
                }
            }, 200);
            
            // Loading mesajı göster (kullanıcıya bilgi ver)
            const container = document.getElementById('tasks-container');
            if (container) {
                container.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Yükleniyor...</span>
                        </div>
                        <p class="mt-3 text-muted">Mağaza bilgileri yükleniyor, lütfen bekleyin...</p>
                    </div>
                `;
            }
            return; // Kontrol tamamlanana kadar bekle (yönlendirme yapılacak)
        }
        
        // Store-selection'dan gelmiyorsa direkt yönlendir
        console.log('Mağaza/departman seçilmemiş, store-selection\'a yönlendiriliyor');
        window.location.replace('store-selection.html');
        return;
    }
    
    // Kullanıcı bilgilerini göster
    displayUserInfo(user);
    
    // Fotoğraf yükleme olayını dinle
    const galleryUpload = document.getElementById('gallery-upload');
    
    if (galleryUpload) {
        galleryUpload.addEventListener('change', handleGalleryUpload);
    }
    
    // Global mağaza güncelleme eventini dinle
    window.addEventListener('storesUpdated', function() {
        // Kullanıcı oturumunu yeniden kontrol et
        const user = checkUserSession();
        if (user) {
            displayUserInfo(user);
        }
    });
    
    // Sayfa yüklendiğinde görevleri yükle
    setTimeout(() => {
        if (typeof loadTasks === 'function') {
            loadTasks();
        }
    }, 300);
});

// Kullanıcı bilgilerini gösteren fonksiyon
function displayUserInfo(user) {
    document.getElementById('user-name').textContent = user.name || 'Kullanıcı';
    document.getElementById('profile-name').textContent = user.name || '-';
    document.getElementById('profile-email').textContent = user.email || '-';
    document.getElementById('profile-store').textContent = user.store || '-';
    document.getElementById('profile-role').textContent = 'Saha Satış Uzmanı';
    document.getElementById('profile-date').textContent = user.createdAt ? formatDate(user.createdAt) : '-';
    
    // Mağaza bilgilerini göster
    if (user.store) {
        const userInfoElement = document.getElementById('user-info');
        if (userInfoElement) {
            userInfoElement.innerHTML = `
                <i class="fas fa-user me-1"></i>
                <span id="user-name">${user.name || 'Kullanıcı'}</span>
                <small class="text-muted ms-2">(${user.store})</small>
            `;
        }
    }
}

// Görevleri yükleyen fonksiyon
let isLoadingTasks = false;
async function loadTasks() {
    // Çift yükleme önlemi
    if (isLoadingTasks) {
        return;
    }
    
    let loadingId = null;
    
    try {
        isLoadingTasks = true;
        const user = checkUserSession();
        
        // Loading başlat
        loadingId = showLoading('Görevler Yükleniyor', 'Görev listesi çekiliyor...');
        
        if (!user) {
            console.error('Kullanıcı oturumu bulunamadı');
            displayTasks([]);
            if (loadingId) hideLoading(loadingId);
            isLoadingTasks = false;
            return;
        }
        
        const storeId = user.storeId || user.store_id;
        if (!storeId) {
            console.error('Kullanıcı mağaza ID\'si bulunamadı');
            displayTasks([]);
            if (loadingId) hideLoading(loadingId);
            isLoadingTasks = false;
            return;
        }
        
        // Çalışanın mağazasına atanan görevleri getir
        const { data: taskAssignments, error } = await supabase
            .from('task_assignments')
            .select(`
                *,
                tasks(
                    id,
                    title,
                    description,
                    category,
                    start_date,
                    end_date,
                    status,
                    response_text_enabled,
                    response_photo_enabled,
                    photo_limit,
                    example_photo_url,
                    channels(name)
                )
            `)
            .eq('store_id', storeId);

        if (error) {
            console.error('Supabase hatası:', error);
            throw error;
        }

        // Görevleri işle - Kapanmış ve arşivlenmiş görevleri filtrele
        const tasks = (taskAssignments || [])
            .filter(assignment => assignment.tasks) // Görev silinmemiş olanları filtrele
            .filter(assignment => {
                const task = assignment.tasks;
                // Kapanmış ve arşivlenmiş görevleri filtrele
                return task.status !== 'closed' && task.status !== 'archived';
            })
            .map(assignment => {
                const task = assignment.tasks;
                const daysLeft = calculateDaysLeft(task.end_date);
                const isLate = daysLeft < 0;
                
                return {
                    id: task.id,
                    assignmentId: assignment.id,
                    title: task.title,
                    description: task.description,
                    category: getCategoryDisplayName(task.category),
                    startDate: task.start_date,
                    endDate: task.end_date,
                    status: getTaskStatusDisplay(assignment.status),
                    statusClass: getTaskStatusClass(assignment.status, isLate),
                    photoCount: 0, // TODO: Gerçek fotoğraf sayısını al
                    maxPhotos: task.photo_limit || 5,
                    responseTextEnabled: task.response_text_enabled,
                    responsePhotoEnabled: task.response_photo_enabled,
                    examplePhotoUrl: task.example_photo_url,
                    channelName: task.channels?.name || 'Bilinmiyor',
                    isLate: isLate,
                    daysLeft: daysLeft
                };
            });

        displayTasks(tasks);
        
        // Loading kapat
        if (loadingId) hideLoading(loadingId);
        isLoadingTasks = false;
        
    } catch (error) {
        console.error('Görevler yüklenirken hata:', error);
        console.error('Hata detayları:', error.stack);
        showAlert('Görevler yüklenirken hata oluştu: ' + error.message, 'danger');
        displayTasks([]);
        if (loadingId) hideLoading(loadingId);
        isLoadingTasks = false;
    }
}

// Kategori görüntüleme adını döndüren fonksiyon
function getCategoryDisplayName(category) {
    const categories = {
        'reyon': 'Reyon',
        'sepet': 'Sepet', 
        'kampanya': 'Kampanya',
        'diger': 'Diğer'
    };
    return categories[category] || 'Bilinmiyor';
}

// Görev durumu görüntüleme adını döndüren fonksiyon
function getTaskStatusDisplay(status) {
    const statuses = {
        'assigned': 'Atandı',
        'in_progress': 'Devam Ediyor',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal'
    };
    return statuses[status] || 'Bilinmiyor';
}

// Görev durumu CSS sınıfını döndüren fonksiyon
function getTaskStatusClass(status, isLate) {
    if (isLate) return 'danger';
    
    const classes = {
        'assigned': 'primary',
        'in_progress': 'warning',
        'completed': 'success',
        'cancelled': 'secondary'
    };
    return classes[status] || 'secondary';
}

// Görevleri görüntüleyen fonksiyon
function displayTasks(tasks) {
    const container = document.getElementById('tasks-container');
    if (!container) {
        console.error('tasks-container elementi bulunamadı!');
        return;
    }
    
    container.innerHTML = '';
    
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle me-2"></i>
                    Henüz atanmış görev bulunmuyor.
                </div>
            </div>
        `;
        return;
    }
    
    tasks.forEach((task, index) => {
        const taskCard = createTaskCard(task);
        container.appendChild(taskCard);
    });
}

// Görev kartı oluşturan fonksiyon
function createTaskCard(task) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';
    
    const daysLeft = task.daysLeft || calculateDaysLeft(task.endDate);
    const isLate = task.isLate || daysLeft < 0;
    
    col.innerHTML = `
        <div class="card h-100 ${isLate ? 'border-danger' : ''}">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">${task.title}</h6>
                <span class="badge bg-${task.statusClass}">${task.status}</span>
            </div>
            <div class="card-body">
                <p class="card-text text-muted">${task.description}</p>
                <div class="mb-2">
                    <small class="text-muted">
                        <i class="fas fa-calendar me-1"></i>
                        ${formatDate(task.startDate)} - ${formatDate(task.endDate)}
                    </small>
                </div>
                <div class="mb-2">
                    <small class="text-muted">
                        <i class="fas fa-tag me-1"></i>
                        ${task.category}
                    </small>
                </div>
                <div class="mb-2">
                    <small class="text-muted">
                        <i class="fas fa-sitemap me-1"></i>
                        ${task.channelName}
                    </small>
                </div>
                <div class="mb-3">
                    <small class="text-muted">
                        <i class="fas fa-camera me-1"></i>
                        ${task.photoCount}/${task.maxPhotos} fotoğraf
                        ${task.responseTextEnabled ? '<br><i class="fas fa-comment me-1"></i>Yazılı yanıt' : ''}
                    </small>
                </div>
                ${isLate ? `<div class="alert alert-danger alert-sm mb-3">
                    <i class="fas fa-exclamation-triangle me-1"></i>
                    ${Math.abs(daysLeft)} gün gecikti!
                </div>` : ''}
                ${!isLate && daysLeft <= 1 ? `<div class="alert alert-warning alert-sm mb-3">
                    <i class="fas fa-clock me-1"></i>
                    ${daysLeft === 0 ? 'Bugün bitiyor!' : '1 gün kaldı!'}
                </div>` : ''}
            </div>
            <div class="card-footer">
                <button class="btn btn-primary btn-sm w-100" onclick="openTaskModal(${task.id}, ${task.assignmentId})">
                    <i class="fas fa-eye me-1"></i>Detay
                </button>
            </div>
        </div>
    `;
    
    return col;
}

// Görev detay modalını açan fonksiyon
function openTaskModal(taskId, assignmentId) {
    // Görev bilgilerini bul
    const task = findTaskById(taskId);
    if (!task) {
        showAlert('Görev bulunamadı!', 'danger');
        return;
    }
    
    currentTask = task;
    currentTask.assignmentId = assignmentId;
    
    // Modal içeriğini doldur
    document.getElementById('taskModalTitle').textContent = task.title;
    document.getElementById('modal-category').textContent = task.category;
    document.getElementById('modal-start-date').textContent = formatDate(task.startDate);
    document.getElementById('modal-end-date').textContent = formatDate(task.endDate);
    document.getElementById('modal-status').textContent = task.status;
    document.getElementById('modal-description').textContent = task.description;
    
    // Örnek fotoğrafı göster/gizle
    const examplePhotoSection = document.getElementById('example-photo-section');
    const examplePhotoImg = document.getElementById('modal-example-photo');
    
    if (task.examplePhotoUrl) {
        // Supabase storage URL'sini oluştur
        const photoUrl = `${supabase.supabaseUrl}/storage/v1/object/public/task-photos/${task.examplePhotoUrl}`;
        examplePhotoImg.src = photoUrl;
        examplePhotoSection.style.display = 'block';
        
        // Fotoğraf yüklenme hatası durumunda
        examplePhotoImg.onerror = function() {
            console.error('Örnek fotoğraf yüklenemedi:', photoUrl);
            examplePhotoSection.style.display = 'none';
        };
    } else {
        examplePhotoSection.style.display = 'none';
    }
    
    // Fotoğraf yükleme alanını sıfırla
    document.getElementById('gallery-upload').value = '';
    document.getElementById('photo-preview').innerHTML = '';
    selectedPhotos = [];
    
    // Fotoğraf yükleme alanını göster/gizle
    const photoUploadDiv = document.querySelector('#gallery-upload').closest('.mb-3');
    if (photoUploadDiv) {
        photoUploadDiv.style.display = task.responsePhotoEnabled ? 'block' : 'none';
    }
    
    // Modal'ı aç
    const modal = new bootstrap.Modal(document.getElementById('taskModal'));
    modal.show();
}

// Görev ID'sine göre görev bulan fonksiyon
function findTaskById(taskId) {
    // Mevcut görevler listesinden bul
    const tasksContainer = document.getElementById('tasks-container');
    if (!tasksContainer) return null;
    
    // Tüm görev kartlarından taskId'yi bul
    const taskCards = tasksContainer.querySelectorAll('[onclick*="openTaskModal"]');
    for (let card of taskCards) {
        const onclickAttr = card.getAttribute('onclick');
        const match = onclickAttr.match(/openTaskModal\((\d+),/);
        if (match && parseInt(match[1]) === taskId) {
            // Bu görev kartından verileri çıkar
            const cardElement = card.closest('.col-md-6');
            if (cardElement) {
                const title = cardElement.querySelector('h6').textContent;
                const description = cardElement.querySelector('.card-text').textContent;
                const category = cardElement.querySelector('[class*="fas fa-tag"]').parentElement.textContent.trim();
                const status = cardElement.querySelector('.badge').textContent;
                const statusClass = cardElement.querySelector('.badge').className.match(/bg-(\w+)/)?.[1] || 'secondary';
                
                // Tarih bilgilerini çıkar
                const dateText = cardElement.querySelector('[class*="fas fa-calendar"]').parentElement.textContent;
                const dates = dateText.split(' - ');
                
                return {
                    id: taskId,
                    title: title,
                    description: description,
                    category: category,
                    startDate: dates[0] || '',
                    endDate: dates[1] || '',
                    status: status,
                    statusClass: statusClass,
                    photoCount: 0,
                    maxPhotos: 5,
                    responseTextEnabled: true,
                    responsePhotoEnabled: true
                };
            }
        }
    }
    
    return null;
}

// Galeri açma fonksiyonu
function openGallery() {
    const input = document.getElementById('gallery-upload');
    input.click();
}

// Kamera ile fotoğraf yükleme (kaldırıldı)

// Galeri ile fotoğraf yükleme
async function handleGalleryUpload(event) {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) {
        return;
    }
    
    // Maksimum fotoğraf sayısını kontrol et
    if (selectedPhotos.length + files.length > currentTask.maxPhotos) {
        showAlert(`Maksimum ${currentTask.maxPhotos} fotoğraf yükleyebilirsiniz!`, 'danger');
        return;
    }
    
    // Her dosyayı işle (async olarak)
    for (let index = 0; index < files.length; index++) {
        const file = files[index];
        
        // Dosya boyutunu kontrol et
        if (!validateImageSize(file)) {
            continue;
        }
        
        // Fotoğrafı sıkıştır
        try {
            const compressedFile = await compressImage(file);
            selectedPhotos.push(compressedFile);
            
        } catch (error) {
            console.error('Fotoğraf sıkıştırma hatası:', error);
            // Sıkıştırma başarısız olursa orijinal dosyayı kullan
            selectedPhotos.push(file);
        }
    }
    
    // Tüm fotoğraflar işlendikten sonra önizlemeleri oluştur
    updatePhotoPreviews();
    
    // Input'u temizle
    event.target.value = '';
}

// Fotoğraf önizlemesi oluşturan fonksiyon
function createPhotoPreview(file, index) {
    // File objesinin geçerli olduğunu kontrol et
    if (!file || !(file instanceof File || file instanceof Blob)) {
        console.error('Geçersiz file objesi:', file);
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewContainer = document.getElementById('photo-preview');
        const col = document.createElement('div');
        col.className = 'col-md-3 mb-2';
        col.innerHTML = `
            <div class="position-relative">
                <img src="${e.target.result}" class="img-thumbnail" style="width: 100%; height: 150px; object-fit: cover;">
                <button type="button" class="btn btn-danger btn-sm position-absolute" style="top: 5px; right: 5px; z-index: 10;" onclick="removePhoto(${index})" title="Fotoğrafı Sil">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        previewContainer.appendChild(col);
    };
    reader.onerror = function(error) {
        console.error('FileReader hatası:', error);
    };
    reader.readAsDataURL(file);
}

// Fotoğraf önizlemelerini güncelleyen fonksiyon
function updatePhotoPreviews() {
    const previewContainer = document.getElementById('photo-preview');
    previewContainer.innerHTML = '';
    
    selectedPhotos.forEach((file, i) => {
        createPhotoPreview(file, i);
    });
}

// Fotoğrafı kaldıran fonksiyon
function removePhoto(index) {
    selectedPhotos.splice(index, 1);
    updatePhotoPreviews();
}

// Görevi başlatan fonksiyon (kaldırıldı)

// Görevi tamamlayan fonksiyon
async function completeTask() {
    if (!currentTask || !currentTask.assignmentId) {
        showAlert('Görev bulunamadı!', 'danger');
        return;
    }
    
    // Fotoğraf yükleme kontrolü (eğer fotoğraf gerekliyse)
    if (currentTask.responsePhotoEnabled && selectedPhotos.length === 0) {
        showAlert('Görevi tamamlamak için en az bir fotoğraf yüklemelisiniz!', 'danger');
        return;
    }
    
    // Yorum kontrolü (eğer yazılı yanıt gerekliyse)
    const comment = document.getElementById('task-comment').value.trim();
    if (currentTask.responseTextEnabled && !comment) {
        showAlert('Görevi tamamlamak için yorum yazmalısınız!', 'danger');
        return;
    }
    
    try {
        // Yükleme göstergesi
        const completeBtn = document.querySelector('[onclick="completeTask()"]');
        const hideLoading = showLoading(completeBtn);
        
        // Fotoğrafları yükle (eğer varsa)
        let photoUrls = [];
        if (selectedPhotos.length > 0) {
            try {
                photoUrls = await uploadPhotos(selectedPhotos, currentTask.id);
            } catch (photoError) {
                console.error('Fotoğraf yükleme hatası:', photoError);
                showAlert('Fotoğraflar yüklenemedi, ancak görev tamamlandı!', 'warning');
            }
        }
        
        // Görev atamasını tamamla
        const { error } = await supabase
            .from('task_assignments')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                comment: comment || null,
                photo_urls: photoUrls.length > 0 ? photoUrls : null
            })
            .eq('id', currentTask.assignmentId);

        if (error) throw error;
        
        showAlert('Görev başarıyla tamamlandı!', 'success');
        
        // Modal'ı kapat
        const modal = bootstrap.Modal.getInstance(document.getElementById('taskModal'));
        modal.hide();
        
        // Görevleri yenile
        loadTasks();
        
        hideLoading();
        
    } catch (error) {
        console.error('Görev tamamlama hatası:', error);
        showAlert('Görev tamamlanırken bir hata oluştu!', 'danger');
    }
}

// Fotoğrafları yükleyen fonksiyon
async function uploadPhotos(photos, taskId) {
    const photoUrls = [];
    
    // Supabase storage bucket'ını kontrol et
    try {
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        if (bucketError) {
            console.error('Bucket listesi alınamadı:', bucketError);
        } else {
            console.log('Mevcut bucket\'lar:', buckets);
            const taskPhotosBucket = buckets.find(bucket => bucket.name === 'task-photos');
            if (taskPhotosBucket) {
                console.log('task-photos bucket bulundu:', taskPhotosBucket);
            } else {
                console.error('task-photos bucket bulunamadı!');
            }
        }
    } catch (error) {
        console.error('Bucket kontrolü hatası:', error);
    }
    
    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const fileName = `task_${taskId}_${Date.now()}_${i}.jpg`;
        const filePath = fileName;
        
        try {
            const { data, error } = await supabase.storage
                .from('task-photos')
                .upload(filePath, photo, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (error) throw error;
            
            // Public URL'i al
            const { data: urlData } = supabase.storage
                .from('task-photos')
                .getPublicUrl(filePath);
            
            photoUrls.push(urlData.publicUrl);
            console.log(`Fotoğraf ${i + 1} yüklendi:`, urlData.publicUrl);
            console.log(`Fotoğraf ${i + 1} dosya yolu:`, filePath);
            console.log(`Fotoğraf ${i + 1} boyut:`, photo.size, 'bytes');
            
            // URL'yi test et
            const testImg = new Image();
            testImg.onload = function() {
                console.log(`Fotoğraf ${i + 1} URL testi başarılı`);
            };
            testImg.onerror = function() {
                console.error(`Fotoğraf ${i + 1} URL testi başarısız:`, urlData.publicUrl);
            };
            testImg.src = urlData.publicUrl;
            
        } catch (error) {
            console.error(`Fotoğraf ${i + 1} yükleme hatası:`, error);
            console.error('Hata detayları:', JSON.stringify(error, null, 2));
            throw new Error(`Fotoğraf ${i + 1} yüklenemedi: ${error.message || 'Bilinmeyen hata'}`);
        }
    }
    
    return photoUrls;
}

// Kalan gün sayısını hesaplayan fonksiyon
function calculateDaysLeft(endDate) {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// Tarih formatlayan fonksiyon
// Tarih formatla fonksiyonu - hem string hem Date objesi kabul eder
function formatDate(dateInput) {
    if (!dateInput) return '-';
    
    let date;
    
    // Eğer zaten Date objesi ise direkt kullan
    if (dateInput instanceof Date) {
        date = dateInput;
    } 
    // String ise Date'e çevir
    else if (typeof dateInput === 'string') {
        // ISO format veya diğer formatları destekle
        date = new Date(dateInput);
        
        // Geçersiz tarih kontrolü
        if (isNaN(date.getTime())) {
            console.warn('Geçersiz tarih formatı:', dateInput);
            return '-';
        }
    } 
    // Sayı ise timestamp olarak kabul et
    else if (typeof dateInput === 'number') {
        date = new Date(dateInput);
    }
    else {
        console.warn('Desteklenmeyen tarih tipi:', typeof dateInput, dateInput);
        return '-';
    }
    
    // Geçerli bir tarih mi kontrol et
    if (isNaN(date.getTime())) {
        return '-';
    }
    
    // Türkçe format: DD.MM.YYYY
    try {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    } catch (error) {
        console.error('Tarih formatlama hatası:', error, dateInput);
        return '-';
    }
}

// Fotoğraf boyutunu kontrol eden fonksiyon
function validateImageSize(file) {
    const maxSize = 20 * 1024 * 1024; // 20MB (daha büyük limit)
    if (file.size > maxSize) {
        showAlert('Fotoğraf boyutu 20MB\'dan büyük olamaz!', 'danger');
        return false;
    }
    return true;
}

// Fotoğraf sıkıştıran fonksiyon
async function compressImage(file) {
    console.log('Sıkıştırma başladı, dosya boyutu:', file.size);
    
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            try {
                console.log('Resim yüklendi, boyutlar:', img.width, 'x', img.height);
                
                // Maksimum boyutları belirle - 1024x768 formatında
                const maxWidth = 1024;
                const maxHeight = 768;
                
                let { width, height } = img;
                
                // Oranları koruyarak boyutlandır
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
                
                console.log('Yeni boyutlar:', width, 'x', height);
                
                canvas.width = width;
                canvas.height = height;
                
                // Fotoğrafı çiz
                ctx.drawImage(img, 0, 0, width, height);
                
                // Blob olarak döndür
                canvas.toBlob((blob) => {
                    if (blob) {
                        console.log('Sıkıştırma tamamlandı, yeni boyut:', blob.size);
                        resolve(blob);
                    } else {
                        console.error('Blob oluşturulamadı');
                        reject(new Error('Fotoğraf sıkıştırılamadı'));
                    }
                }, 'image/jpeg', 0.9);
                
            } catch (error) {
                console.error('Canvas hatası:', error);
                reject(error);
            }
        };
        
        img.onerror = (error) => {
            console.error('Resim yükleme hatası:', error);
            reject(new Error('Fotoğraf yüklenemedi'));
        };
        
        console.log('Resim URL oluşturuluyor...');
        img.src = URL.createObjectURL(file);
    });
}

// Yükleme göstergesi
function showLoading(button) {
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Yükleniyor...';
    button.disabled = true;
    
    return () => {
        button.innerHTML = originalText;
        button.disabled = false;
    };
}

// Bölümleri gösteren fonksiyon
function showSection(sectionName) {
    // Tüm bölümleri gizle
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Seçilen bölümü göster
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Menü aktif durumunu güncelle
    const menuItems = document.querySelectorAll('.nav-link');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });
    
    const activeItem = document.querySelector(`[href="#${sectionName}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
    
    // Sayfa başlığını güncelle
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        const titles = {
            'tasks': 'Görevlerim',
            'completed': 'Tamamlanan Görevler',
            'profile': 'Profil'
        };
        pageTitle.textContent = titles[sectionName] || 'Görevlerim';
    }
    
    // Bölüme özel veri yükleme
    switch(sectionName) {
        case 'tasks':
            // Görevler bölümü gösterildiğinde görevleri yükle
            if (typeof loadTasks === 'function') {
                loadTasks();
            }
            break;
        case 'tasks':
            loadTasks();
            break;
        case 'completed':
            loadCompletedTasks();
            break;
        case 'surveys':
            loadSurveys();
            break;
        case 'price-tracking':
            // Fiyat takibi verisi zaten yüklü
            break;
        case 'investment-photos':
            showInvestmentPhotosSection();
            break;
        case 'profile':
            // Profil bilgileri zaten yüklü
            break;
    }
}

// Tamamlanan görevleri yükleyen fonksiyon
function loadCompletedTasks() {
    // Şimdilik örnek veriler
    const mockCompletedTasks = [
        {
            id: 4,
            title: 'Reyon Düzenleme',
            description: 'Elektronik reyonunun düzenlenmesi',
            category: 'Reyon',
            completedDate: '2024-01-12T16:30',
            photoCount: 3,
            statusClass: 'success'
        }
    ];
    
    displayCompletedTasks(mockCompletedTasks);
}

// Tamamlanan görevleri görüntüleyen fonksiyon
function displayCompletedTasks(tasks) {
    const container = document.getElementById('completed-tasks-container');
    container.innerHTML = '';
    
    tasks.forEach(task => {
        const taskCard = createCompletedTaskCard(task);
        container.appendChild(taskCard);
    });
}

// Tamamlanan görev kartı oluşturan fonksiyon
function createCompletedTaskCard(task) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';
    
    col.innerHTML = `
        <div class="card h-100 border-success">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">${task.title}</h6>
                <span class="badge bg-success">Tamamlandı</span>
            </div>
            <div class="card-body">
                <p class="card-text text-muted">${task.description}</p>
                <div class="mb-2">
                    <small class="text-muted">
                        <i class="fas fa-tag me-1"></i>
                        ${task.category}
                    </small>
                </div>
                <div class="mb-2">
                    <small class="text-muted">
                        <i class="fas fa-camera me-1"></i>
                        ${task.photoCount} fotoğraf
                    </small>
                </div>
                <div class="mb-3">
                    <small class="text-muted">
                        <i class="fas fa-check-circle me-1"></i>
                        Tamamlandı: ${formatDate(task.completedDate)}
                    </small>
                </div>
            </div>
            <div class="card-footer">
                <button class="btn btn-outline-success btn-sm w-100" onclick="viewCompletedTask(${task.id})">
                    <i class="fas fa-eye me-1"></i>Detay
                </button>
            </div>
        </div>
    `;
    
    return col;
}

// Tamamlanan görev detayını görüntüleyen fonksiyon
function viewCompletedTask(taskId) {
    console.log('Tamamlanan görev detayı:', taskId);
    showAlert('Tamamlanan görev detay sayfası açılacak', 'info');
}

// Mobil menüyü açıp kapatan fonksiyon
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('show');
}

// Mağaza değiştirme fonksiyonu
function changeStore() {
    if (confirm('Mağaza değiştirmek istediğinizden emin misiniz?')) {
        window.location.href = 'store-selection.html';
    }
}

// Mobil cihazlarda menü dışına tıklayınca menüyü kapat
document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebar');
    const menuButton = document.querySelector('[onclick="toggleSidebar()"]');
    
    if (window.innerWidth <= 768 && 
        !sidebar.contains(event.target) && 
        !menuButton.contains(event.target)) {
        sidebar.classList.remove('show');
    }
});

// Ekran boyutu değiştiğinde menüyü kapat
window.addEventListener('resize', function() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth > 768) {
        sidebar.classList.remove('show');
    }
});

// ========== YATIRIM ALANLARI FOTOĞRAF YÜKLEME ==========

let investmentPhotoFiles = [];

// Yatırım alanları fotoğraf bölümü gösterildiğinde
function showInvestmentPhotosSection() {
    loadInvestmentPhotoFilters();
    loadWeeklyProgress();
    
    // Dosya seçimi event'ini ekle
    const fileInput = document.getElementById('photo-file');
    if (fileInput) {
        fileInput.addEventListener('change', handleInvestmentPhotoSelection);
    }
}

// Yatırım alanları fotoğraf filtrelerini yükle
async function loadInvestmentPhotoFilters() {
    try {
        const user = checkUserSession();
        if (!user || !user.storeId) {
            showAlert('Mağaza bilgisi bulunamadı', 'warning');
            return;
        }

        // Kullanıcının mağazasını al
        const { data: userStore, error: storeError } = await supabase
            .from('stores')
            .select('id, name, channel_id, region_id, channels(id, name), regions(id, name)')
            .eq('id', user.storeId)
            .single();

        if (storeError) throw storeError;

        // Kanal dropdown'ını doldur
        const channelSelect = document.getElementById('photo-channel');
        channelSelect.innerHTML = '<option value="">Kanal Seçiniz</option>';
        
        if (userStore.channels) {
            const option = document.createElement('option');
            option.value = userStore.channel_id;
            option.textContent = userStore.channels.name;
            option.selected = true;
            channelSelect.appendChild(option);
        }

        // Bölge dropdown'ını doldur
        const regionSelect = document.getElementById('photo-region');
        regionSelect.innerHTML = '<option value="">Bölge Seçiniz</option>';
        
        if (userStore.regions) {
            const option = document.createElement('option');
            option.value = userStore.region_id;
            option.textContent = userStore.regions.name;
            option.selected = true;
            regionSelect.appendChild(option);
        }

        // Mağaza dropdown'ını doldur
        const storeSelect = document.getElementById('photo-store');
        storeSelect.innerHTML = '<option value="">Mağaza Seçiniz</option>';
        
        const option = document.createElement('option');
        option.value = userStore.id;
        option.textContent = userStore.name;
        option.selected = true;
        storeSelect.appendChild(option);

        // Yatırım alanlarını yükle
        await loadPhotoInvestmentAreas();

    } catch (error) {
        console.error('Filtre yükleme hatası:', error);
        showAlert('Filtreler yüklenirken hata oluştu', 'danger');
    }
}

// Bölgeleri yükle (employee için genelde sadece kendi bölgesi)
async function loadPhotoRegions() {
    const channelId = document.getElementById('photo-channel').value;
    if (!channelId) return;

    // Employee için genelde sadece kendi bölgesi gösterilir
    // Burada basit bir implementasyon yapıyoruz
}

// Mağazaları yükle (employee için genelde sadece kendi mağazası)
async function loadPhotoStores() {
    const regionId = document.getElementById('photo-region').value;
    if (!regionId) return;

    // Employee için genelde sadece kendi mağazası gösterilir
}

// Yatırım alanlarını yükle
async function loadPhotoInvestmentAreas() {
    try {
        const storeId = document.getElementById('photo-store').value;
        if (!storeId) {
            document.getElementById('photo-investment-area').innerHTML = '<option value="">Yatırım Alanı Seçiniz</option>';
            return;
        }

        const { data: areas, error } = await supabase
            .from('investment_areas')
            .select('id, name, type')
            .eq('store_id', storeId)
            .eq('status', 'active')
            .order('name');

        if (error) throw error;

        const areaSelect = document.getElementById('photo-investment-area');
        areaSelect.innerHTML = '<option value="">Yatırım Alanı Seçiniz</option>';

        if (areas && areas.length > 0) {
            areas.forEach(area => {
                const option = document.createElement('option');
                option.value = area.id;
                option.textContent = `${area.name} (${area.type})`;
                areaSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Yatırım alanı bulunamadı';
            option.disabled = true;
            areaSelect.appendChild(option);
        }

    } catch (error) {
        console.error('Yatırım alanları yükleme hatası:', error);
        showAlert('Yatırım alanları yüklenirken hata oluştu', 'danger');
    }
}

// Fotoğraf seçimi
function handleInvestmentPhotoSelection(event) {
    const files = Array.from(event.target.files);
    investmentPhotoFiles = files;
    
    // Önizleme oluştur
    const container = document.getElementById('photo-preview-container');
    container.innerHTML = '';

    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const col = document.createElement('div');
            col.className = 'col-md-3 mb-2';
            col.innerHTML = `
                <div class="position-relative">
                    <img src="${e.target.result}" class="img-thumbnail" style="width: 100%; height: 150px; object-fit: cover;">
                    <button type="button" class="btn btn-danger btn-sm position-absolute" style="top: 5px; right: 5px;" onclick="removeInvestmentPhoto(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            container.appendChild(col);
        };
        reader.readAsDataURL(file);
    });
}

// Fotoğraf kaldır
function removeInvestmentPhoto(index) {
    investmentPhotoFiles.splice(index, 1);
    handleInvestmentPhotoSelection({ target: { files: investmentPhotoFiles } });
}

// Yatırım alanı fotoğrafı yükle
async function uploadInvestmentPhoto(event) {
    event.preventDefault();

    try {
        const areaId = document.getElementById('photo-investment-area').value;
        const note = document.getElementById('photo-note').value;

        if (!areaId) {
            showAlert('Lütfen yatırım alanı seçin', 'warning');
            return;
        }

        if (investmentPhotoFiles.length === 0) {
            showAlert('Lütfen en az bir fotoğraf seçin', 'warning');
            return;
        }

        const userId = parseInt(localStorage.getItem('userId'));
        if (!userId) {
            showAlert('Kullanıcı bilgisi bulunamadı', 'danger');
            return;
        }

        showAlert('Fotoğraflar yükleniyor...', 'info');

        // Her fotoğrafı yükle
        for (const file of investmentPhotoFiles) {
            // Fotoğrafı sıkıştır
            const compressedFile = await compressImage(file);

            // Dosya adı oluştur
            const timestamp = Date.now();
            const fileName = `investment_${areaId}_${timestamp}_${Math.random().toString(36).substring(7)}.jpg`;
            const filePath = `investment-areas/${areaId}/${fileName}`;

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
            const { error: dbError } = await supabase
                .from('investment_photos')
                .insert({
                    investment_area_id: parseInt(areaId),
                    photo_url: urlData.publicUrl,
                    source: 'weekly_check',
                    note: note || null,
                    uploaded_by: userId
                });

            if (dbError) {
                console.error('Veritabanı kayıt hatası:', dbError);
            }
        }

        showAlert('Fotoğraflar başarıyla yüklendi', 'success');
        
        // Formu temizle
        document.getElementById('investment-photo-form').reset();
        investmentPhotoFiles = [];
        document.getElementById('photo-preview-container').innerHTML = '';
        
        // Haftalık ilerlemeyi yenile
        await loadWeeklyProgress();

    } catch (error) {
        console.error('Fotoğraf yükleme hatası:', error);
        showAlert('Fotoğraflar yüklenirken hata oluştu', 'danger');
    }
}

// Haftalık ilerlemeyi yükle
async function loadWeeklyProgress() {
    try {
        const container = document.getElementById('weekly-progress-container');
        const storeId = parseInt(localStorage.getItem('storeId'));

        if (!storeId) {
            container.innerHTML = '<p class="text-muted">Mağaza bilgisi bulunamadı</p>';
            return;
        }

        // Bu haftanın başlangıcı
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        startOfWeek.setHours(0, 0, 0, 0);

        // Bu mağazaya ait yatırım alanlarını al
        const { data: areas, error: areasError } = await supabase
            .from('investment_areas')
            .select('id, name, type')
            .eq('store_id', storeId)
            .eq('status', 'active');

        if (areasError) throw areasError;

        if (!areas || areas.length === 0) {
            container.innerHTML = '<p class="text-muted">Bu mağazada yatırım alanı bulunamadı</p>';
            return;
        }

        const areaIds = areas.map(a => a.id);

        // Bu hafta yüklenen fotoğrafları al
        const { data: photos, error: photosError } = await supabase
            .from('investment_photos')
            .select('investment_area_id, created_at')
            .in('investment_area_id', areaIds)
            .eq('source', 'weekly_check')
            .gte('created_at', startOfWeek.toISOString());

        if (photosError) throw photosError;

        // Her alan için fotoğraf sayısını hesapla
        const photoCounts = {};
        photos.forEach(photo => {
            if (!photoCounts[photo.investment_area_id]) {
                photoCounts[photo.investment_area_id] = 0;
            }
            photoCounts[photo.investment_area_id]++;
        });

        // Progress kartlarını oluştur
        container.innerHTML = '';

        areas.forEach(area => {
            const count = photoCounts[area.id] || 0;
            const progress = Math.min((count / 2) * 100, 100);
            const statusClass = count >= 2 ? 'success' : count >= 1 ? 'warning' : 'danger';

            const card = document.createElement('div');
            card.className = 'card mb-2';
            card.innerHTML = `
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <h6 class="mb-0">${area.name}</h6>
                            <small class="text-muted">${area.type}</small>
                        </div>
                        <span class="badge bg-${statusClass}">${count}/2</span>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar bg-${statusClass}" role="progressbar" style="width: ${progress}%"></div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Haftalık ilerleme yükleme hatası:', error);
        document.getElementById('weekly-progress-container').innerHTML = 
            '<p class="text-danger">İlerleme yüklenirken hata oluştu</p>';
    }
}

// showSection fonksiyonu zaten yukarıda tanımlı, investment-photos case'i eklendi