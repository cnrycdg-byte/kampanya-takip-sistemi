// Mağaza Çalışanı Panel JavaScript Dosyası

let currentTask = null;
let selectedPhotos = [];

// Sayfa yüklendiğinde çalışacak kod
document.addEventListener('DOMContentLoaded', function() {
    console.log('Mağaza paneli yüklendi');
    
    // Kullanıcı oturumunu kontrol et
    const user = checkUserSession();
    if (!user) {
        return;
    }
    
    // Mağaza çalışanı yetkisi kontrolü
    if (user.role !== 'employee') {
        showAlert('Bu sayfaya erişim yetkiniz yok!', 'danger');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    // Kullanıcı bilgilerini göster
    displayUserInfo(user);
    
    // Mağaza seçilmişse görevleri yükle
    if (user.storeId) {
        loadTasks();
    } else {
        // Mağaza seçilmemişse mağaza seçim sayfasına yönlendir
        window.location.href = 'store-selection.html';
    }
    
    // Fotoğraf yükleme olayını dinle
    const galleryUpload = document.getElementById('gallery-upload');
    
    if (galleryUpload) {
        galleryUpload.addEventListener('change', handleGalleryUpload);
    }
});

// Kullanıcı bilgilerini gösteren fonksiyon
function displayUserInfo(user) {
    document.getElementById('user-name').textContent = user.name || 'Kullanıcı';
    document.getElementById('profile-name').textContent = user.name || '-';
    document.getElementById('profile-email').textContent = user.email || '-';
    document.getElementById('profile-store').textContent = user.store || '-';
    document.getElementById('profile-role').textContent = 'Mağaza Çalışanı';
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
async function loadTasks() {
    try {
        console.log('=== loadTasks() başladı ===');
        const user = checkUserSession();
        console.log('Kullanıcı oturumu:', user);
        
        if (!user) {
            console.error('Kullanıcı oturumu bulunamadı');
            displayTasks([]);
            return;
        }
        
        if (!user.storeId) {
            console.error('Kullanıcı mağaza ID\'si bulunamadı');
            console.log('Kullanıcı detayları:', JSON.stringify(user, null, 2));
            displayTasks([]);
            return;
        }

        console.log('Görevler yükleniyor, mağaza ID:', user.storeId);
        console.log('Supabase bağlantısı:', supabase);
        
        // Çalışanın mağazasına atanan görevleri getir
        console.log('Supabase sorgusu başlatılıyor...');
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
                    channels(name)
                ),
                stores(name, manager_id, regions(name, manager_name))
            `)
            .eq('store_id', user.storeId);

        console.log('Supabase sorgu sonucu:');
        console.log('Data:', taskAssignments);
        console.log('Error:', error);

        if (error) {
            console.error('Supabase hatası:', error);
            throw error;
        }

        console.log('Görev atamaları yüklendi:', taskAssignments);

        // Görevleri işle
        const tasks = taskAssignments
            .filter(assignment => assignment.tasks) // Görev silinmemiş olanları filtrele
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
                    channelName: task.channels?.name || 'Bilinmiyor',
                    storeName: assignment.stores?.name || 'Bilinmiyor',
                    storeManager: assignment.stores?.regions?.manager_name || 'Yönetici bilgisi yok',
                    isLate: isLate,
                    daysLeft: daysLeft
                };
            });

        console.log('İşlenen görevler:', tasks);
        displayTasks(tasks);
        
    } catch (error) {
        console.error('Görevler yüklenirken hata:', error);
        showAlert('Görevler yüklenirken hata oluştu: ' + error.message, 'danger');
        displayTasks([]);
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
    console.log('=== displayTasks() başladı ===');
    console.log('Gösterilecek görevler:', tasks);
    
    const container = document.getElementById('tasks-container');
    if (!container) {
        console.error('tasks-container elementi bulunamadı!');
        return;
    }
    
    container.innerHTML = '';
    
    if (tasks.length === 0) {
        console.log('Gösterilecek görev yok, boş mesaj gösteriliyor');
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
    
    console.log(`${tasks.length} görev gösteriliyor`);
    tasks.forEach((task, index) => {
        console.log(`Görev ${index + 1}:`, task);
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
                <div class="mb-2">
                    <small class="text-muted">
                        <i class="fas fa-store me-1"></i>
                        ${task.storeName}
                    </small>
                </div>
                <div class="mb-2">
                    <small class="text-muted">
                        <i class="fas fa-user me-1"></i>
                        ${task.storeManager}
                    </small>
                </div>
                <div class="mb-3">
                    <small class="text-muted">
                        <i class="fas fa-camera me-1"></i>
                        ${task.photoCount}/${task.maxPhotos} fotoğraf
                        ${task.responseTextEnabled ? '<br><i class="fas fa-comment me-1"></i>Yazılı yanıt' : ''}
                    </small>
                </div>
                ${isLate ? `<div class="alert alert-danger alert-sm mb-3 alert-dismissible">
                    <i class="fas fa-exclamation-triangle me-1"></i>
                    ${Math.abs(daysLeft)} gün gecikti!
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>` : ''}
                ${!isLate && daysLeft <= 1 ? `<div class="alert alert-warning alert-sm mb-3 alert-dismissible">
                    <i class="fas fa-clock me-1"></i>
                    ${daysLeft === 0 ? 'Bugün bitiyor!' : '1 gün kaldı!'}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
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
                    responsePhotoEnabled: true,
                    storeName: 'Mevcut Mağaza',
                    storeManager: 'Yönetici Bilgisi'
                };
            }
        }
    }
    
    return null;
}

// Galeri açma fonksiyonu
function openGallery() {
    console.log('Galeri açılıyor...');
    const input = document.getElementById('gallery-upload');
    input.click();
}

// Kamera ile fotoğraf yükleme (kaldırıldı)

// Galeri ile fotoğraf yükleme
function handleGalleryUpload(event) {
    console.log('Galeri fotoğraf yükleme başladı');
    const files = Array.from(event.target.files);
    console.log('Seçilen dosyalar:', files.length);
    
    if (files.length === 0) {
        console.log('Dosya seçilmedi');
        return;
    }
    
    // Maksimum fotoğraf sayısını kontrol et
    if (selectedPhotos.length + files.length > currentTask.maxPhotos) {
        showAlert(`Maksimum ${currentTask.maxPhotos} fotoğraf yükleyebilirsiniz!`, 'danger');
        return;
    }
    
    // Her dosyayı işle
    files.forEach((file, index) => {
        console.log(`Dosya ${index + 1} işleniyor:`, file.name, file.size);
        
        // Dosya boyutunu kontrol et
        if (!validateImageSize(file)) {
            return;
        }
        
        // Fotoğrafı sıkıştır
        try {
            console.log('Fotoğraf sıkıştırılıyor...');
            const compressedFile = compressImage(file);
            console.log('Sıkıştırma tamamlandı:', compressedFile.size);
            
            selectedPhotos.push(compressedFile);
            console.log('Toplam fotoğraf sayısı:', selectedPhotos.length);
            
            // Önizleme oluştur
            createPhotoPreview(compressedFile, selectedPhotos.length - 1);
            
        } catch (error) {
            console.error('Fotoğraf sıkıştırma hatası:', error);
            console.log('Orijinal dosya kullanılıyor...');
            
            // Sıkıştırma başarısız olursa orijinal dosyayı kullan
            selectedPhotos.push(file);
            console.log('Toplam fotoğraf sayısı (orijinal):', selectedPhotos.length);
            
            // Önizleme oluştur
            createPhotoPreview(file, selectedPhotos.length - 1);
        }
    });
    
    // Input'u temizle
    event.target.value = '';
}

// Fotoğraf önizlemesi oluşturan fonksiyon
function createPhotoPreview(file, index) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewContainer = document.getElementById('photo-preview');
        const col = document.createElement('div');
        col.className = 'col-md-3 mb-2';
        col.innerHTML = `
            <div class="position-relative">
                <img src="${e.target.result}" class="img-thumbnail" style="width: 100%; height: 150px; object-fit: cover;">
                <button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0" onclick="removePhoto(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        previewContainer.appendChild(col);
    };
    reader.readAsDataURL(file);
}

// Fotoğrafı kaldıran fonksiyon
function removePhoto(index) {
    selectedPhotos.splice(index, 1);
    
    // Önizlemeyi yenile
    const previewContainer = document.getElementById('photo-preview');
    previewContainer.innerHTML = '';
    
    selectedPhotos.forEach((file, i) => {
        createPhotoPreview(file, i);
    });
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
    
    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const fileName = `task_${taskId}_${Date.now()}_${i}.jpg`;
        const filePath = `task-photos/${fileName}`;
        
        try {
            const { data, error } = await supabase.storage
                .from('task-photos')
                .upload(filePath, photo, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            // Storage limiti kontrolü
            if (error && error.message && error.message.includes('quota')) {
                showAlert('⚠️ Depolama alanı dolu! Lütfen admin ile iletişime geçin.', 'warning');
                throw new Error('Depolama alanı dolu');
            }
            
            if (error) throw error;
            
            // Public URL'i al
            const { data: urlData } = supabase.storage
                .from('task-photos')
                .getPublicUrl(filePath);
            
            photoUrls.push(urlData.publicUrl);
            console.log(`Fotoğraf ${i + 1} yüklendi:`, urlData.publicUrl);
            
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
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
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
                
                // Maksimum boyutları belirle
                const maxWidth = 800;
                const maxHeight = 600;
                
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
                }, 'image/jpeg', 0.8);
                
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
            loadTasks();
            break;
        case 'completed':
            loadCompletedTasks();
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

// Bildirim test fonksiyonu
function testNotification() {
    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            // Test bildirimi gönder
            const notification = new Notification('Test Bildirimi', {
                body: 'Bildirim sistemi çalışıyor! Her gün saat 13:00\'da günlük hatırlatma alacaksınız.',
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                tag: 'test-notification',
                requireInteraction: true
            });
            
            notification.onclick = function() {
                window.focus();
                notification.close();
            };
            
            // 5 saniye sonra kapat
            setTimeout(() => {
                notification.close();
            }, 5000);
            
            showAlert('Test bildirimi gönderildi!', 'success');
        } else if (Notification.permission === 'denied') {
            showAlert('Bildirim izni reddedilmiş. Lütfen tarayıcı ayarlarından izin verin.', 'warning');
        } else {
            // İzin iste
            Notification.requestPermission().then(function(permission) {
                if (permission === 'granted') {
                    testNotification(); // Tekrar dene
                } else {
                    showAlert('Bildirim izni verilmedi.', 'danger');
                }
            });
        }
    } else {
        showAlert('Bu tarayıcı bildirimleri desteklemiyor.', 'warning');
    }
}
