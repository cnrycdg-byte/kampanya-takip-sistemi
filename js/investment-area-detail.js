// Yatırım Alanı Detay Sayfası - JavaScript Fonksiyonları

let currentAreaId = null;
let currentAreaData = null;
let ticketsData = [];
let photosData = [];

// Yatırım alanı detayını yükle
async function loadAreaDetail(areaId) {
    currentAreaId = areaId;

    try {
        // Yatırım alanı bilgilerini al
        const { data: area, error: areaError } = await supabase
            .from('investment_areas')
            .select(`
                *,
                stores!inner(
                    id,
                    name,
                    channel_id,
                    region_id,
                    channels(id, name),
                    regions(id, name)
                )
            `)
            .eq('id', areaId)
            .single();

        if (areaError) throw areaError;
        currentAreaData = area;

        // Header'ı güncelle
        const store = area.stores;
        const channel = store?.channels;
        const region = store?.regions;

        document.getElementById('area-name').textContent = area.name;
        document.getElementById('area-location').textContent = 
            `${channel?.name || ''} / ${region?.name || ''} / ${store?.name || ''}`;

        const typeLabels = {
            'ada_stand': 'Ada Stand',
            'duvar_standi': 'Duvar Standı',
            'alinlik': 'Alınlık',
            'reyon_giydirme': 'Reyon Giydirme',
            'gondol_basi': 'Gondol Başı',
            'diger': 'Diğer'
        };

        const brandLabels = {
            'philips': 'Philips',
            'ugreen': 'Ugreen'
        };

        const statusLabels = {
            'planned': 'Planlanmış',
            'active': 'Aktif',
            'removed': 'Kaldırılmış'
        };

        document.getElementById('area-type').textContent = `${brandLabels[area.brand] || ''} - ${typeLabels[area.type] || area.type}`;
        document.getElementById('area-status').textContent = statusLabels[area.status] || area.status;
        
        // Kurulum tarihi
        const installationDateEl = document.getElementById('area-installation-date');
        if (area.installation_date) {
            installationDateEl.textContent = `Kurulum: ${formatDate(area.installation_date)}`;
            installationDateEl.style.display = 'inline-block';
        } else {
            installationDateEl.style.display = 'none';
        }
        
        // Kiralama bedeli
        const rentalFeeEl = document.getElementById('area-rental-fee');
        if (area.rental_fee) {
            rentalFeeEl.textContent = `Kira: ${parseFloat(area.rental_fee).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
            rentalFeeEl.style.display = 'inline-block';
        } else {
            rentalFeeEl.style.display = 'none';
        }

        // Özet bilgileri yükle
        await loadSummary(areaId);

        // Ticketları yükle
        await loadTickets();

        // Fotoğrafları yükle
        await loadPhotos();

        // Timeline'ı yükle
        await loadTimeline();

    } catch (error) {
        console.error('Yatırım alanı detay yükleme hatası:', error);
        showAlert('Yatırım alanı detayı yüklenirken hata oluştu', 'danger');
    }
}

// Özet bilgileri yükle
async function loadSummary(areaId) {
    try {
        // Ticket sayılarını al
        const { data: tickets, error: ticketsError } = await supabase
            .from('investment_tickets')
            .select('status')
            .eq('investment_area_id', areaId);

        if (ticketsError) throw ticketsError;

        const openTickets = tickets.filter(t => ['open', 'in_progress', 'pending_approval'].includes(t.status));
        const closedTickets = tickets.filter(t => ['completed', 'cancelled'].includes(t.status));

        document.getElementById('total-tickets').textContent = tickets.length;
        document.getElementById('open-tickets').textContent = openTickets.length;
        document.getElementById('closed-tickets').textContent = closedTickets.length;

        // Son 30 günde fotoğraf sayısı
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: photos, error: photosError } = await supabase
            .from('investment_photos')
            .select('id')
            .eq('investment_area_id', areaId)
            .eq('source', 'weekly_check')
            .gte('created_at', thirtyDaysAgo.toISOString());

        if (!photosError) {
            document.getElementById('recent-photos').textContent = photos.length;
        }

        // Son işlem tarihi
        const { data: lastActivity, error: activityError } = await supabase
            .from('investment_tickets')
            .select('updated_at, status')
            .eq('investment_area_id', areaId)
            .order('updated_at', { ascending: false })
            .limit(1);

        if (!activityError && lastActivity && lastActivity.length > 0) {
            const lastDate = new Date(lastActivity[0].updated_at);
            document.getElementById('last-activity').textContent = formatDate(lastActivity[0].updated_at);
            document.getElementById('last-activity-desc').textContent = 'Son ticket güncellemesi';
        } else {
            // Fotoğraf tarihine bak
            const { data: lastPhoto, error: photoError } = await supabase
                .from('investment_photos')
                .select('created_at')
                .eq('investment_area_id', areaId)
                .order('created_at', { ascending: false })
                .limit(1);

            if (!photoError && lastPhoto && lastPhoto.length > 0) {
                document.getElementById('last-activity').textContent = formatDate(lastPhoto[0].created_at);
                document.getElementById('last-activity-desc').textContent = 'Son fotoğraf yüklemesi';
            }
        }

    } catch (error) {
        console.error('Özet yükleme hatası:', error);
    }
}

// Ticketları yükle
async function loadTickets() {
    try {
        const container = document.getElementById('tickets-container');
        container.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Yükleniyor...</span></div></div>';

        let query = supabase
            .from('investment_tickets')
            .select(`
                *,
                created_by_user:users!investment_tickets_created_by_fkey(id, name, email),
                assigned_to_user:users!investment_tickets_assigned_to_fkey(id, name, email)
            `)
            .eq('investment_area_id', currentAreaId)
            .order('created_at', { ascending: false });

        const statusFilter = document.getElementById('ticket-filter-status').value;
        if (statusFilter) {
            query = query.eq('status', statusFilter);
        }

        const assignedFilter = document.getElementById('ticket-filter-assigned').value;
        if (assignedFilter === 'assigned') {
            // Sadece atama yapılan ticketlar
            query = query.not('assigned_to', 'is', null);
        } else if (assignedFilter === 'unassigned') {
            // Sadece atanmamış ticketlar
            query = query.is('assigned_to', null);
        } else if (assignedFilter === 'my_assigned') {
            // Bana atanan ticketlar
            const userId = getUserId();
            if (userId) {
                query = query.eq('assigned_to', userId);
            }
        }

        const { data: tickets, error } = await query;

        if (error) throw error;
        ticketsData = tickets || [];

        if (tickets.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Ticket bulunamadı</p>';
            return;
        }

        container.innerHTML = '';

        tickets.forEach(ticket => {
            const card = createTicketCard(ticket);
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Ticket yükleme hatası:', error);
        document.getElementById('tickets-container').innerHTML = 
            '<p class="text-center text-danger">Ticketlar yüklenirken hata oluştu</p>';
    }
}

// Ticket kartı oluştur
function createTicketCard(ticket) {
    const card = document.createElement('div');
    card.className = 'ticket-card';
    card.onclick = () => openTicketDetail(ticket.id);

    const typeLabels = {
        'new_stand': 'Yeni Stand',
        'revision': 'Revizyon',
        'correction': 'Düzeltme'
    };

    const statusLabels = {
        'open': 'Açık',
        'in_progress': 'Üzerinde Çalışılıyor',
        'pending_approval': 'Onay Bekliyor',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal'
    };

    const statusColors = {
        'open': 'danger',
        'in_progress': 'warning',
        'pending_approval': 'info',
        'completed': 'success',
        'cancelled': 'secondary'
    };

    const daysOpen = ticket.closed_at 
        ? Math.floor((new Date(ticket.closed_at) - new Date(ticket.created_at)) / (1000 * 60 * 60 * 24))
        : Math.floor((new Date() - new Date(ticket.created_at)) / (1000 * 60 * 60 * 24));

    card.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
                <div class="d-flex align-items-center mb-2">
                    <span class="badge bg-primary me-2">${typeLabels[ticket.type] || ticket.type}</span>
                    <span class="badge bg-${statusColors[ticket.status] || 'secondary'}">${statusLabels[ticket.status] || ticket.status}</span>
                </div>
                <h6 class="mb-1">${ticket.subject}</h6>
                <p class="text-muted small mb-2">${ticket.description || 'Açıklama yok'}</p>
                <div class="d-flex flex-wrap gap-2 small text-muted">
                    <span><i class="fas fa-user me-1"></i>Oluşturan: ${ticket.created_by_user?.name || '-'}</span>
                    <span><i class="fas fa-user-tie me-1"></i>Sorumlu: ${ticket.assigned_to_user?.name || 'Atanmamış'}</span>
                    <span><i class="fas fa-calendar me-1"></i>Açılış: ${formatDate(ticket.created_at)}</span>
                    <span><i class="fas fa-clock me-1"></i>${daysOpen} gündür açık</span>
                </div>
            </div>
        </div>
    `;

    return card;
}

// Ticket detayını aç
async function openTicketDetail(ticketId) {
    try {
        const { data: ticket, error } = await supabase
            .from('investment_tickets')
            .select(`
                *,
                created_by_user:users!investment_tickets_created_by_fkey(id, name, email),
                assigned_to_user:users!investment_tickets_assigned_to_fkey(id, name, email),
                investment_areas!inner(
                    id,
                    name,
                    stores!inner(id, name)
                )
            `)
            .eq('id', ticketId)
            .single();

        if (error) throw error;

        // Yorumları al (tarihe göre sıralı - en eski en üstte)
        let comments = [];
        const { data: commentsData, error: commentsError } = await supabase
            .from('investment_ticket_comments')
            .select(`
                *,
                users(id, name, email)
            `)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });
        
        if (commentsError) {
            console.error('Yorum yükleme hatası:', commentsError);
            // Hata durumunda basit sorgu dene
            const { data: simpleComments } = await supabase
                .from('investment_ticket_comments')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });
            comments = simpleComments || [];
        } else {
            comments = commentsData || [];
        }

        // assigned_to_user bilgisini ayrı sorgu ile al (hem commentsData hem de simpleComments için)
        if (comments && comments.length > 0) {
            const assignedToIds = comments.filter(c => c.assigned_to).map(c => c.assigned_to);
            if (assignedToIds.length > 0) {
                try {
                    const { data: assignedUsers } = await supabase
                        .from('users')
                        .select('id, name')
                        .in('id', assignedToIds);
                    
                    if (assignedUsers && assignedUsers.length > 0) {
                        const userMap = {};
                        assignedUsers.forEach(u => userMap[u.id] = u);
                        comments.forEach(comment => {
                            if (comment.assigned_to && userMap[comment.assigned_to]) {
                                comment.assigned_to_user = userMap[comment.assigned_to];
                            }
                        });
                    }
                } catch (err) {
                    console.error('Assigned user yükleme hatası:', err);
                }
            }
        }

        // Her yorum için fotoğrafları al
        const commentIds = comments.map(c => c.id);
        let commentPhotos = {};
        if (commentIds.length > 0) {
            try {
                // Önce tüm fotoğrafları al, sonra JavaScript'te filtrele (comment_id kolonu yoksa hata vermemesi için)
                const { data: allPhotos, error: photosError } = await supabase
                    .from('investment_photos')
                    .select('id, photo_url, ticket_id, comment_id, created_at')
                    .eq('ticket_id', ticketId)
                    .order('created_at', { ascending: true });
                
                if (!photosError && allPhotos) {
                    // comment_id olan fotoğrafları filtrele ve grupla
                    allPhotos.forEach(photo => {
                        if (photo.comment_id && commentIds.includes(photo.comment_id)) {
                            if (!commentPhotos[photo.comment_id]) {
                                commentPhotos[photo.comment_id] = [];
                            }
                            commentPhotos[photo.comment_id].push(photo);
                        }
                    });
                }
            } catch (err) {
                console.error('Yorum fotoğrafları yükleme hatası:', err);
            }
        }

        // Fotoğrafları al (sadece comment_id olmayanlar - ticket'a direkt bağlı olanlar)
        let photos = [];
        try {
            const { data: photosData, error: photosError } = await supabase
                .from('investment_photos')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: false });
            
            if (!photosError && photosData) {
                // comment_id null olanları filtrele
                photos = photosData.filter(p => !p.comment_id);
            }
        } catch (err) {
            console.error('Ticket fotoğrafları yükleme hatası:', err);
        }

        // Modal içeriğini oluştur
        const modalBody = document.getElementById('ticket-modal-body');
        modalBody.innerHTML = createTicketDetailHTML(ticket, comments, photos || [], commentPhotos);

        // Modal'ı göster
        const modal = new bootstrap.Modal(document.getElementById('ticketDetailModal'));
        modal.show();

        // Yorum formu için kullanıcıları yükle
        await loadUsersForCommentAssignment();
        
        // Yorum yapan kişi bilgisini göster
        const currentCommentUser = document.getElementById('current-comment-user');
        if (currentCommentUser) {
            const userName = getCurrentUserName();
            currentCommentUser.textContent = userName || 'Bilinmeyen';
        }

        // Durum değiştirme event'ini ekle
        const statusSelect = document.getElementById('ticket-status-select');
        if (statusSelect) {
            statusSelect.addEventListener('change', async function() {
                await updateTicketStatus(ticketId, this.value, comments);
            });
        }

    } catch (error) {
        console.error('Ticket detay yükleme hatası:', error);
        showAlert('Ticket detayı yüklenirken hata oluştu', 'danger');
    }
}

// Ticket detay HTML'i oluştur
function createTicketDetailHTML(ticket, comments, photos, commentPhotos = {}) {
    const typeLabels = {
        'new_stand': 'Yeni Stand',
        'revision': 'Revizyon',
        'correction': 'Düzeltme'
    };

    const statusOptions = [
        { value: 'open', label: 'Açık' },
        { value: 'in_progress', label: 'Üzerinde Çalışılıyor' },
        { value: 'pending_approval', label: 'Onay Bekliyor' },
        { value: 'completed', label: 'Tamamlandı' },
        { value: 'cancelled', label: 'İptal' }
    ];

    const userId = getUserId();
    const userRole = getUserRole();

    return `
        <div class="row">
            <div class="col-md-8">
                <div class="mb-3">
                    <label class="form-label">Durum</label>
                    <select class="form-select" id="ticket-status-select" ${userRole === 'employee' ? 'disabled' : ''}>
                        ${statusOptions.map(opt => 
                            `<option value="${opt.value}" ${ticket.status === opt.value ? 'selected' : ''}>${opt.label}</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="mb-3">
                    <label class="form-label">Konu</label>
                    <input type="text" class="form-control" value="${ticket.subject}" readonly>
                </div>

                <div class="mb-3">
                    <label class="form-label">Açıklama</label>
                    <textarea class="form-control" rows="4" readonly>${ticket.description || ''}</textarea>
                </div>

                <div class="mb-3">
                    <label class="form-label">İlgili Fotoğraflar</label>
                    <div class="row g-2" id="ticket-photos-container">
                        ${photos.length > 0 ? photos.map(photo => `
                            <div class="col-md-3">
                                <div class="photo-item" onclick="openPhotoModal('${photo.photo_url}', '${photo.note || ''}', '${formatDate(photo.created_at)}')">
                                    <img src="${photo.photo_url}" alt="Fotoğraf" class="img-thumbnail">
                                </div>
                            </div>
                        `).join('') : '<div class="col-12"><p class="text-muted">Fotoğraf yok</p></div>'}
                    </div>
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="attachPhotoToTicket(${ticket.id})">
                        <i class="fas fa-plus me-1"></i>Fotoğraf Ekle
                    </button>
                </div>

                <div class="mb-3">
                    <label class="form-label">Yorumlar ve İşlemler</label>
                    ${ticket.assigned_to_user ? `
                        <div class="alert alert-info mb-3 py-2">
                            <i class="fas fa-user-tie me-2"></i><strong>Ticket Sorumlusu:</strong> ${ticket.assigned_to_user.name}
                        </div>
                    ` : ''}
                    <div id="ticket-comments-container" style="max-height: 500px; overflow-y: auto; padding: 15px 0;">
                        <div class="timeline-wrapper">
                            ${comments.length === 0 ? '<p class="text-muted text-center">Henüz yorum yok</p>' : ''}
                            ${comments.map((comment, index) => {
                                const photos = commentPhotos[comment.id] || [];
                                const isLast = index === comments.length - 1;
                                return `
                                    <div class="timeline-item-comment ${comment.is_system_message ? 'system-message' : ''}" style="position: relative; padding-left: 40px; margin-bottom: 25px;">
                                        ${!isLast ? '<div class="timeline-line" style="position: absolute; left: 15px; top: 35px; bottom: -25px; width: 2px; background: #dee2e6;"></div>' : ''}
                                        <div class="timeline-dot" style="position: absolute; left: 8px; top: 8px; width: 16px; height: 16px; border-radius: 50%; background: ${comment.is_system_message ? '#6c757d' : '#0d6efd'}; border: 3px solid white; box-shadow: 0 0 0 2px ${comment.is_system_message ? '#6c757d' : '#0d6efd'};"></div>
                                        <div class="card ${comment.is_system_message ? 'bg-light border-secondary' : 'border-primary'} shadow-sm">
                                            <div class="card-body p-3">
                                                <div class="d-flex justify-content-between align-items-start mb-2">
                                                    <div>
                                                        <strong class="${comment.is_system_message ? 'text-secondary' : 'text-primary'}">${comment.users?.name || 'Sistem'}</strong>
                                                    </div>
                                                </div>
                                                <p class="mb-2">${comment.comment}</p>
                                                <div class="mt-2 d-flex align-items-center flex-wrap gap-2">
                                                    <small class="text-muted">
                                                        <i class="fas fa-clock me-1"></i>${formatDateTime(comment.created_at)}
                                                    </small>
                                                    ${comment.assigned_to_user ? `
                                                        <span class="badge bg-info"><i class="fas fa-user-tag me-1"></i>Atanan: ${comment.assigned_to_user.name}</span>
                                                    ` : ''}
                                                </div>
                                                ${photos.length > 0 ? `
                                                    <div class="comment-photos mt-2">
                                                        <div class="row g-2">
                                                            ${photos.map(photo => `
                                                                <div class="col-auto">
                                                                    <img src="${photo.photo_url}" 
                                                                         class="img-thumbnail" 
                                                                         style="width: 80px; height: 80px; object-fit: cover; cursor: pointer;" 
                                                                         onclick="openPhotoModal('${photo.photo_url}', '', '${formatDateTime(photo.created_at)}', '', '')"
                                                                         alt="Yorum fotoğrafı">
                                                                </div>
                                                            `).join('')}
                                                        </div>
                                                    </div>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    <form id="ticket-comment-form" class="mt-3" onsubmit="handleAddComment(event, ${ticket.id})">
                        <div class="card border-primary">
                            <div class="card-body">
                                <div class="mb-2">
                                    <label class="form-label small">Yapılan İşlem / Yorum *</label>
                                    <textarea class="form-control" id="ticket-comment-text" rows="3" placeholder="Yapılan işlemi veya yorumu yazın..." required></textarea>
                                    <small class="text-muted d-block mt-1" id="comment-user-info">
                                        <i class="fas fa-user me-1"></i>Yorum yapan: <span id="current-comment-user">Yükleniyor...</span>
                                    </small>
                                </div>
                                <div class="mb-2">
                                    <label class="form-label small">Fotoğraflar (Opsiyonel)</label>
                                    <input type="file" class="form-control form-control-sm" id="ticket-comment-photos" multiple accept="image/*" onchange="handleCommentPhotoSelection(event)">
                                    <div id="ticket-comment-photo-preview" class="mt-2 d-flex flex-wrap gap-2"></div>
                                </div>
                                <div class="mb-2">
                                    <label class="form-label small">İlgiliye Ata (Opsiyonel)</label>
                                    <select class="form-select form-select-sm" id="ticket-comment-assign-to">
                                        <option value="">Atama yapma</option>
                                    </select>
                                </div>
                                <button class="btn btn-primary btn-sm" type="submit">
                                    <i class="fas fa-paper-plane me-1"></i>Gönder
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">Ticket Bilgileri</h6>
                    </div>
                    <div class="card-body">
                        <p class="mb-2"><strong>Tip:</strong> ${typeLabels[ticket.type] || ticket.type}</p>
                        <p class="mb-2"><strong>Oluşturan:</strong> ${ticket.created_by_user?.name || '-'}</p>
                        <p class="mb-2"><strong>Sorumlu:</strong> ${ticket.assigned_to_user?.name || 'Atanmamış'}</p>
                        <p class="mb-2"><strong>Açılış Tarihi:</strong> ${formatDate(ticket.created_at)}</p>
                        ${ticket.closed_at ? `<p class="mb-2"><strong>Kapanış Tarihi:</strong> ${formatDate(ticket.closed_at)}</p>` : ''}
                        <p class="mb-2"><strong>Kaç Gündür Açık:</strong> ${Math.floor((new Date() - new Date(ticket.created_at)) / (1000 * 60 * 60 * 24))} gün</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Ticket durumunu güncelle
async function updateTicketStatus(ticketId, newStatus, comments = []) {
    try {
        // Eski durumu al
        const { data: currentTicket } = await supabase
            .from('investment_tickets')
            .select('status')
            .eq('id', ticketId)
            .single();
        
        const oldStatus = currentTicket?.status;
        
        // Eğer durum değişmediyse işlem yapma
        if (oldStatus === newStatus) {
            return;
        }
        
        // Onay mesajı göster
        const statusLabel = getStatusLabel(newStatus);
        const confirmMessage = `Ticket durumunu "${statusLabel}" olarak güncelliyorsunuz. Onaylıyor musunuz?`;
        
        if (!confirm(confirmMessage)) {
            // Durum dropdown'ını eski değerine geri al
            const statusSelect = document.getElementById('ticket-status-select');
            if (statusSelect) {
                statusSelect.value = oldStatus;
            }
            return;
        }
        
        // Eğer ticket kapatılıyorsa (completed veya cancelled) kontrol et
        if (newStatus === 'completed' || newStatus === 'cancelled') {
            // Yorum kontrolü - sadece kullanıcı yorumlarını say (sistem mesajları hariç)
            const userComments = comments.filter(c => !c.is_system_message);
            
            if (userComments.length === 0) {
                showAlert('Ticket kapatılmadan önce en az bir yorum eklemeniz gerekiyor', 'warning');
                // Durum dropdown'ını eski değerine geri al
                const statusSelect = document.getElementById('ticket-status-select');
                if (statusSelect) {
                    statusSelect.value = oldStatus;
                }
                return;
            }
        }

        const updateData = { status: newStatus, updated_at: new Date().toISOString() };
        
        if (newStatus === 'completed' || newStatus === 'cancelled') {
            updateData.closed_at = new Date().toISOString();
        }

        const { error } = await supabase
            .from('investment_tickets')
            .update(updateData)
            .eq('id', ticketId);

        if (error) throw error;

        // Sistem mesajı ekle
        const userId = getUserId();
        if (!userId) {
            showAlert('Kullanıcı bilgisi bulunamadı', 'danger');
            return;
        }
        await supabase
            .from('investment_ticket_comments')
            .insert({
                ticket_id: ticketId,
                user_id: userId,
                comment: `Durum "${getStatusLabel(newStatus)}" olarak değiştirildi`,
                is_system_message: true
            });

        showAlert('Ticket durumu güncellendi', 'success');
        
        // Ticketları yeniden yükle
        await loadTickets();
        
        // Modal'ı yenile (kapatıp açmak yerine sadece içeriği güncelle)
        await refreshTicketModal(ticketId);

    } catch (error) {
        console.error('Ticket durum güncelleme hatası:', error);
        showAlert('Ticket durumu güncellenirken hata oluştu', 'danger');
    }
}

// Yorum formu için kullanıcıları yükle
async function loadUsersForCommentAssignment() {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, name, role')
            .eq('is_active', true)
            .in('role', ['admin', 'manager', 'field_manager'])
            .order('name');

        if (error) throw error;

        const select = document.getElementById('ticket-comment-assign-to');
        if (!select) return;
        
        select.innerHTML = '<option value="">Atama yapma</option>';

        if (users && users.length > 0) {
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.name} (${getRoleLabel(user.role)})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Kullanıcı yükleme hatası:', error);
    }
}

// Yorum ekle (global fonksiyon)
async function handleAddComment(event, ticketId) {
    event.preventDefault();
    
    const commentText = document.getElementById('ticket-comment-text').value.trim();
    
    if (!commentText) {
        showAlert('Lütfen yapılan işlemi veya yorumu yazın', 'warning');
        return;
    }
    
    const assignedTo = document.getElementById('ticket-comment-assign-to').value;
    
    await addTicketComment(ticketId, commentText, assignedTo);
}

// Kullanıcı ID'sini al (farklı kaynaklardan)
function getUserId() {
    // Önce userId'yi kontrol et
    let userId = localStorage.getItem('userId');
    if (userId) {
        return parseInt(userId);
    }
    
    // Sonra 'user' objesini kontrol et
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.id) {
                return parseInt(user.id);
            }
        } catch (e) {
            console.error('User parse hatası:', e);
        }
    }
    
    // Son olarak 'currentUser' objesini kontrol et
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
        try {
            const currentUser = JSON.parse(currentUserStr);
            if (currentUser.id) {
                return parseInt(currentUser.id);
            }
        } catch (e) {
            console.error('CurrentUser parse hatası:', e);
        }
    }
    
    return null;
}

// Kullanıcı rolünü al (farklı kaynaklardan)
function getUserRole() {
    // Önce userRole'ü kontrol et
    let userRole = localStorage.getItem('userRole');
    if (userRole) {
        return userRole;
    }
    
    // Sonra 'user' objesini kontrol et
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.role) {
                return user.role;
            }
        } catch (e) {
            console.error('User parse hatası:', e);
        }
    }
    
    // Son olarak 'currentUser' objesini kontrol et
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
        try {
            const currentUser = JSON.parse(currentUserStr);
            if (currentUser.role) {
                return currentUser.role;
            }
        } catch (e) {
            console.error('CurrentUser parse hatası:', e);
        }
    }
    
    return null;
}

// Yorum fotoğraf seçimi
function handleCommentPhotoSelection(event) {
    const files = Array.from(event.target.files);
    commentPhotoFiles = files;
    
    const container = document.getElementById('ticket-comment-photo-preview');
    container.innerHTML = '';
    
    if (files.length === 0) return;

    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'position-relative';
            previewDiv.style.width = '80px';
            previewDiv.style.height = '80px';
            previewDiv.style.display = 'inline-block';
            previewDiv.style.marginRight = '8px';
            previewDiv.style.marginBottom = '8px';
            previewDiv.innerHTML = `
                <img src="${e.target.result}" class="img-thumbnail" style="width: 100%; height: 100%; object-fit: cover;">
                <button type="button" class="btn btn-danger btn-sm position-absolute" style="top: 2px; right: 2px; padding: 2px 6px; font-size: 10px;" onclick="removeCommentPhoto(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(previewDiv);
        };
        reader.readAsDataURL(file);
    });
}

// Yorum fotoğrafını kaldır
function removeCommentPhoto(index) {
    commentPhotoFiles.splice(index, 1);
    const input = document.getElementById('ticket-comment-photos');
    const dt = new DataTransfer();
    commentPhotoFiles.forEach(file => dt.items.add(file));
    input.files = dt.files;
    handleCommentPhotoSelection({ target: { files: commentPhotoFiles } });
}

// Yorum ekle
async function addTicketComment(ticketId, commentText, assignedTo = null) {
    try {
        const userId = getUserId();
        
        if (!userId) {
            showAlert('Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.', 'danger');
            return;
        }

        const commentData = {
            ticket_id: ticketId,
            user_id: userId,
            comment: commentText,
            is_system_message: false
        };

        // Eğer ilgiliye atama yapıldıysa ve assigned_to kolonu varsa ekle
        if (assignedTo) {
            try {
                // Önce assigned_to kolonunun olup olmadığını test et
                commentData.assigned_to = parseInt(assignedTo);
                console.log('Yorum eklenirken assigned_to değeri:', commentData.assigned_to);
            } catch (e) {
                // assigned_to kolonu yoksa, atama yapma
                console.warn('assigned_to kolonu bulunamadı, atama yapılmıyor');
            }
        } else {
            console.log('Yorum eklenirken assigned_to değeri yok');
        }

        let newComment;
        let error;
        
        const { data: insertData, error: insertError } = await supabase
            .from('investment_ticket_comments')
            .insert([commentData])
            .select()
            .single();
        
        newComment = insertData;
        error = insertError;
        
        console.log('Yorum ekleme sonucu:', { newComment, error });
        if (newComment) {
            console.log('Eklenen yorumun assigned_to değeri:', newComment.assigned_to);
        }
        
        // Eğer assigned_to kolonu yoksa ve hata alıyorsak, assigned_to olmadan tekrar dene
        if (error && error.message && (error.message.includes('assigned_to') || error.message.includes('column') || error.code === '42703')) {
            console.warn('assigned_to kolonu bulunamadı, assigned_to olmadan tekrar deneniyor...');
            const retryData = {
                ticket_id: ticketId,
                user_id: userId,
                comment: commentText,
                is_system_message: false
            };
            
            const { data: retryComment, error: retryError } = await supabase
                .from('investment_ticket_comments')
                .insert([retryData])
                .select()
                .single();
            
            if (retryError) {
                console.error('Yorum ekleme hatası detayı:', retryError);
                throw retryError;
            }
            
            newComment = retryComment;
            error = null;
        }

        if (error) {
            console.error('Yorum ekleme hatası detayı:', error);
            throw error;
        }

        // Fotoğrafları yükle (varsa)
        if (commentPhotoFiles.length > 0) {
            for (const file of commentPhotoFiles) {
                try {
                    const compressedFile = await compressImage(file);
                    const timestamp = Date.now();
                    const fileName = `comment_${newComment.id}_${timestamp}_${Math.random().toString(36).substring(7)}.jpg`;
                    const filePath = `investment-areas/${currentAreaId}/tickets/${ticketId}/comments/${newComment.id}/${fileName}`;

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

                    const { data: urlData } = supabase.storage
                        .from('task-photos')
                        .getPublicUrl(filePath);

                    // comment_id kolonu varsa ekle, yoksa ekleme
                    const photoData = {
                        investment_area_id: currentAreaId,
                        ticket_id: ticketId,
                        photo_url: urlData.publicUrl,
                        source: 'ticket',
                        uploaded_by: userId
                    };
                    
                    // comment_id kolonu varsa ekle (kolon yoksa hata vermemesi için)
                    try {
                        photoData.comment_id = newComment.id;
                        await supabase
                            .from('investment_photos')
                            .insert(photoData);
                    } catch (photoInsertError) {
                        // Eğer comment_id kolonu yoksa, comment_id olmadan ekle
                        if (photoInsertError.message && photoInsertError.message.includes('comment_id')) {
                            delete photoData.comment_id;
                            await supabase
                                .from('investment_photos')
                                .insert(photoData);
                        } else {
                            throw photoInsertError;
                        }
                    }
                } catch (photoError) {
                    console.error('Fotoğraf yükleme hatası:', photoError);
                }
            }
        }

        // Eğer ilgiliye atama yapıldıysa, ticket'ın assigned_to'sunu da güncelle
        if (assignedTo) {
            await supabase
                .from('investment_tickets')
                .update({ 
                    assigned_to: parseInt(assignedTo),
                    updated_at: new Date().toISOString() 
                })
                .eq('id', ticketId);
        } else {
            // Sadece updated_at'i güncelle
            await supabase
                .from('investment_tickets')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', ticketId);
        }

        showAlert('Yorum eklendi' + (assignedTo ? ' ve ilgiliye atandı' : '') + (commentPhotoFiles.length > 0 ? ' (fotoğraflar yüklendi)' : ''), 'success');
        
        // Formu temizle
        document.getElementById('ticket-comment-text').value = '';
        document.getElementById('ticket-comment-assign-to').value = '';
        document.getElementById('ticket-comment-photos').value = '';
        commentPhotoFiles = [];
        document.getElementById('ticket-comment-photo-preview').innerHTML = '';
        
        // Modal'ı yenile (kapatıp açmak yerine sadece içeriği güncelle)
        await refreshTicketModal(ticketId);

    } catch (error) {
        console.error('Yorum ekleme hatası:', error);
        showAlert('Yorum eklenirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 'danger');
    }
}

// Fotoğrafları yükle
async function loadPhotos() {
    try {
        const container = document.getElementById('photos-container');
        container.innerHTML = '<div class="text-center w-100"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Yükleniyor...</span></div></div>';

        let query = supabase
            .from('investment_photos')
            .select(`
                *,
                users(id, name),
                investment_tickets(id, subject)
            `)
            .eq('investment_area_id', currentAreaId)
            .order('created_at', { ascending: false });

        const sourceFilter = document.getElementById('photo-filter-source').value;
        if (sourceFilter) {
            query = query.eq('source', sourceFilter);
        }

        const { data: photos, error } = await query;

        if (error) throw error;
        photosData = photos || [];

        if (photos.length === 0) {
            container.innerHTML = '<p class="text-center text-muted w-100">Fotoğraf bulunamadı</p>';
            return;
        }

        container.innerHTML = '';

        photos.forEach(photo => {
            const photoItem = createPhotoItem(photo);
            container.appendChild(photoItem);
        });

    } catch (error) {
        console.error('Fotoğraf yükleme hatası:', error);
        document.getElementById('photos-container').innerHTML = 
            '<p class="text-center text-danger w-100">Fotoğraflar yüklenirken hata oluştu</p>';
    }
}

// Fotoğraf öğesi oluştur
function createPhotoItem(photo) {
    const div = document.createElement('div');
    div.className = 'photo-item';
    div.onclick = () => openPhotoModal(photo.photo_url, photo.note || '', formatDate(photo.created_at), photo.users?.name || '', photo.investment_tickets?.subject || '');

    const sourceLabels = {
        'weekly_check': 'Haftalık Kontrol',
        'ticket': 'Ticket',
        'before': 'Önce',
        'after': 'Sonra'
    };

    div.innerHTML = `
        <img src="${photo.photo_url}" alt="Fotoğraf" loading="lazy">
        <div class="photo-overlay">
            <div><strong>${sourceLabels[photo.source] || photo.source}</strong></div>
            <div>${formatDate(photo.created_at)}</div>
            ${photo.note ? `<div>${photo.note}</div>` : ''}
        </div>
    `;

    return div;
}

// Fotoğraf modal'ını aç
function openPhotoModal(photoUrl, note, date, uploader, ticketSubject) {
    const modalBody = document.getElementById('photo-modal-body');
    modalBody.innerHTML = `
        <div class="text-center mb-3">
            <img src="${photoUrl}" alt="Fotoğraf" class="img-fluid rounded">
        </div>
        <div class="card">
            <div class="card-body">
                <p><strong>Tarih:</strong> ${date}</p>
                ${uploader ? `<p><strong>Yükleyen:</strong> ${uploader}</p>` : ''}
                ${ticketSubject ? `<p><strong>Ticket:</strong> ${ticketSubject}</p>` : ''}
                ${note ? `<p><strong>Not:</strong> ${note}</p>` : ''}
            </div>
        </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('photoModal'));
    modal.show();
}

// Timeline yükle
async function loadTimeline() {
    try {
        const container = document.getElementById('timeline-container');
        container.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Yükleniyor...</span></div></div>';

        const events = [];

        // Ticket oluşturma olayları
        const { data: tickets, error: ticketsError } = await supabase
            .from('investment_tickets')
            .select('id, type, subject, created_at, created_by_user:users!investment_tickets_created_by_fkey(name)')
            .eq('investment_area_id', currentAreaId)
            .order('created_at', { ascending: false });

        if (!ticketsError && tickets) {
            tickets.forEach(ticket => {
                events.push({
                    date: ticket.created_at,
                    type: 'ticket_created',
                    title: `${getTicketTypeLabel(ticket.type)} ticket açıldı`,
                    description: ticket.subject,
                    user: ticket.created_by_user?.name || ''
                });
            });
        }

        // Durum değişiklikleri - önce ticket'ları al, sonra history'yi al
        const { data: areaTickets, error: areaTicketsError } = await supabase
            .from('investment_tickets')
            .select('id')
            .eq('investment_area_id', currentAreaId);
        
        if (!areaTicketsError && areaTickets && areaTickets.length > 0) {
            const ticketIds = areaTickets.map(t => t.id);
            const { data: statusHistory, error: statusError } = await supabase
                .from('investment_ticket_status_history')
                .select(`
                    *,
                    users!investment_ticket_status_history_changed_by_fkey(name)
                `)
                .in('ticket_id', ticketIds)
                .order('created_at', { ascending: false });
            
            if (!statusError && statusHistory) {
                statusHistory.forEach(history => {
                    events.push({
                        date: history.created_at,
                        type: 'status_change',
                        title: `Ticket durumu değiştirildi`,
                        description: `${getStatusLabel(history.old_status || '')} → ${getStatusLabel(history.new_status)}`,
                        user: history.users?.name || ''
                    });
                });
            }
        }

        // Fotoğraf yükleme olayları
        const { data: photos, error: photosError } = await supabase
            .from('investment_photos')
            .select('created_at, source, note, users!investment_photos_uploaded_by_fkey(name)')
            .eq('investment_area_id', currentAreaId)
            .order('created_at', { ascending: false });

        if (!photosError && photos) {
            photos.forEach(photo => {
                events.push({
                    date: photo.created_at,
                    type: 'photo_uploaded',
                    title: `Fotoğraf yüklendi (${getSourceLabel(photo.source)})`,
                    description: photo.note || '',
                    user: photo.users?.name || ''
                });
            });
        }

        // Tarihe göre sırala
        events.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (events.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Zaman çizelgesi verisi bulunamadı</p>';
            return;
        }

        container.innerHTML = '';

        events.forEach(event => {
            const timelineItem = document.createElement('div');
            timelineItem.className = 'timeline-item';
            timelineItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${event.title}</h6>
                        <p class="text-muted small mb-1">${event.description || ''}</p>
                        <small class="text-muted">${event.user ? `Yapan: ${event.user} - ` : ''}${formatDateTime(event.date)}</small>
                    </div>
                </div>
            `;
            container.appendChild(timelineItem);
        });

    } catch (error) {
        console.error('Timeline yükleme hatası:', error);
        document.getElementById('timeline-container').innerHTML = 
            '<p class="text-center text-danger">Zaman çizelgesi yüklenirken hata oluştu</p>';
    }
}

// Yeni ticket oluştur
function createNewTicket() {
    // Modal'ı aç ve kullanıcıları yükle
    const modal = new bootstrap.Modal(document.getElementById('createTicketModal'));
    loadUsersForTicketAssignment();
    modal.show();
}

// Ticket oluşturma formu için kullanıcıları yükle
async function loadUsersForTicketAssignment() {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, name, role')
            .eq('is_active', true)
            .in('role', ['admin', 'manager', 'field_manager'])
            .order('name');

        if (error) throw error;

        const select = document.getElementById('ticket-assigned-to');
        select.innerHTML = '<option value="">Atanmamış</option>';

        if (users && users.length > 0) {
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.name} (${getRoleLabel(user.role)})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Kullanıcı yükleme hatası:', error);
    }
}

// Rol etiketini döndür
function getRoleLabel(role) {
    const labels = {
        'admin': 'Admin',
        'manager': 'Yönetici',
        'field_manager': 'Saha Yöneticisi'
    };
    return labels[role] || role;
}

// Ticket fotoğrafları için global değişken
let ticketPhotoFiles = [];
// Yorum fotoğrafları için global değişken
let commentPhotoFiles = [];

// Ticket fotoğraf seçimi
function handleTicketPhotoSelection(event) {
    const files = Array.from(event.target.files);
    ticketPhotoFiles = files;
    
    // Önizleme oluştur
    const container = document.getElementById('ticket-photo-preview');
    container.innerHTML = '';
    
    if (files.length === 0) return;

    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'position-relative';
            previewDiv.style.width = '100px';
            previewDiv.style.height = '100px';
            previewDiv.style.marginRight = '10px';
            previewDiv.style.marginBottom = '10px';
            previewDiv.style.display = 'inline-block';
            previewDiv.innerHTML = `
                <img src="${e.target.result}" class="img-thumbnail" style="width: 100%; height: 100%; object-fit: cover;">
                <button type="button" class="btn btn-danger btn-sm position-absolute" style="top: 2px; right: 2px; padding: 2px 6px;" onclick="removeTicketPhoto(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(previewDiv);
        };
        reader.readAsDataURL(file);
    });
}

// Ticket fotoğrafını kaldır
function removeTicketPhoto(index) {
    ticketPhotoFiles.splice(index, 1);
    const input = document.getElementById('ticket-photos');
    const dt = new DataTransfer();
    ticketPhotoFiles.forEach(file => dt.items.add(file));
    input.files = dt.files;
    handleTicketPhotoSelection({ target: { files: ticketPhotoFiles } });
}

// Fotoğraf sıkıştırma
async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            try {
                const maxWidth = 1024;
                const maxHeight = 768;
                
                let { width, height } = img;
                
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
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Fotoğraf sıkıştırılamadı'));
                    }
                }, 'image/jpeg', 0.9);
                
            } catch (error) {
                reject(error);
            }
        };
        
        img.onerror = () => reject(new Error('Fotoğraf yüklenemedi'));
        img.src = URL.createObjectURL(file);
    });
}

// Ticket oluştur
async function handleCreateTicket(event) {
    event.preventDefault();

    try {
        const type = document.getElementById('ticket-type').value;
        const subject = document.getElementById('ticket-subject').value;
        const description = document.getElementById('ticket-description').value;
        const assignedTo = document.getElementById('ticket-assigned-to').value;

        const userId = getUserId();
        if (!userId) {
            showAlert('Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.', 'danger');
            return;
        }

        const ticketData = {
            investment_area_id: currentAreaId,
            type: type,
            subject: subject,
            description: description,
            status: 'open',
            created_by: userId
        };

        if (assignedTo) {
            ticketData.assigned_to = parseInt(assignedTo);
        }

        // Ticket'ı oluştur
        const { data: ticket, error } = await supabase
            .from('investment_tickets')
            .insert([ticketData])
            .select()
            .single();

        if (error) throw error;

        // Fotoğrafları yükle (varsa)
        if (ticketPhotoFiles.length > 0) {
            showAlert('Fotoğraflar yükleniyor...', 'info');
            
            for (const file of ticketPhotoFiles) {
                try {
                    // Fotoğrafı sıkıştır
                    const compressedFile = await compressImage(file);

                    // Dosya adı oluştur
                    const timestamp = Date.now();
                    const fileName = `ticket_${ticket.id}_${timestamp}_${Math.random().toString(36).substring(7)}.jpg`;
                    const filePath = `investment-areas/${currentAreaId}/tickets/${fileName}`;

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
                    await supabase
                        .from('investment_photos')
                        .insert({
                            investment_area_id: currentAreaId,
                            ticket_id: ticket.id,
                            photo_url: urlData.publicUrl,
                            source: 'ticket',
                            uploaded_by: userId
                        });
                } catch (photoError) {
                    console.error('Fotoğraf yükleme hatası:', photoError);
                }
            }
        }

        showAlert('Ticket başarıyla oluşturuldu' + (ticketPhotoFiles.length > 0 ? ' ve fotoğraflar yüklendi' : ''), 'success');

        // Modal'ı kapat
        const modal = bootstrap.Modal.getInstance(document.getElementById('createTicketModal'));
        modal.hide();

        // Formu temizle
        document.getElementById('create-ticket-form').reset();
        ticketPhotoFiles = [];
        document.getElementById('ticket-photo-preview').innerHTML = '';

        // Ticket listesini yenile (özeti yenileme - tekrar açılmasını önlemek için)
        await loadTickets();
        // loadSummary çağrısını kaldırdık - tekrar açılmasını önlemek için
        await loadTimeline();
        await loadPhotos();

    } catch (error) {
        console.error('Ticket oluşturma hatası:', error);
        showAlert('Ticket oluşturulurken hata oluştu: ' + error.message, 'danger');
    }
}

// Global olarak tanımla
window.handleCreateTicket = handleCreateTicket;
window.createNewTicket = createNewTicket;
window.loadUsersForTicketAssignment = loadUsersForTicketAssignment;
window.handleTicketPhotoSelection = handleTicketPhotoSelection;
window.removeTicketPhoto = removeTicketPhoto;
window.handleAddComment = handleAddComment;
window.loadUsersForCommentAssignment = loadUsersForCommentAssignment;
window.handleCommentPhotoSelection = handleCommentPhotoSelection;
window.removeCommentPhoto = removeCommentPhoto;

// Yardımcı fonksiyonlar
function getStatusLabel(status) {
    const labels = {
        'open': 'Açık',
        'in_progress': 'Üzerinde Çalışılıyor',
        'pending_approval': 'Onay Bekliyor',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal'
    };
    return labels[status] || status;
}

function getTicketTypeLabel(type) {
    const labels = {
        'new_stand': 'Yeni Stand',
        'revision': 'Revizyon',
        'correction': 'Düzeltme'
    };
    return labels[type] || type;
}

function getSourceLabel(source) {
    const labels = {
        'weekly_check': 'Haftalık Kontrol',
        'ticket': 'Ticket',
        'before': 'Önce',
        'after': 'Sonra'
    };
    return labels[source] || source;
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function attachPhotoToTicket(ticketId) {
    // Bu fonksiyon fotoğraf galerisinden seçim yapılmasını sağlayacak
    // Şimdilik basit bir alert gösterelim
    alert('Fotoğraf ekleme özelliği yakında eklenecek');
}

// Alert göster (tekrar önleme ile)
let lastAlertMessageDetail = '';
let lastAlertTimeDetail = 0;
const ALERT_COOLDOWN_DETAIL = 2000;

function showAlert(message, type = 'info') {
    // Aynı mesajın çok sık gösterilmesini önle
    const now = Date.now();
    if (message === lastAlertMessageDetail && (now - lastAlertTimeDetail) < ALERT_COOLDOWN_DETAIL) {
        return;
    }
    
    lastAlertMessageDetail = message;
    lastAlertTimeDetail = now;
    
    // Önceki alert'leri kaldır
    const existingAlerts = document.querySelectorAll('.custom-alert-detail');
    existingAlerts.forEach(alert => {
        alert.style.transition = 'opacity 0.3s';
        alert.style.opacity = '0';
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 300);
    });
    
    // Yeni alert oluştur
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} custom-alert-detail`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.style.maxWidth = '500px';
    alertDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    alertDiv.style.borderRadius = '8px';
    alertDiv.style.padding = '12px 16px';
    alertDiv.style.display = 'flex';
    alertDiv.style.alignItems = 'center';
    alertDiv.style.justifyContent = 'space-between';
    alertDiv.style.gap = '12px';
    
    // X butonu için renk belirle
    let closeButtonColor = '#333';
    if (type === 'danger') closeButtonColor = '#721c24';
    else if (type === 'success') closeButtonColor = '#155724';
    else if (type === 'warning') closeButtonColor = '#856404';
    else if (type === 'info') closeButtonColor = '#004085';
    
    alertDiv.innerHTML = `
        <span style="flex: 1;">${message}</span>
        <button type="button" class="btn-close-alert-detail" aria-label="Kapat" 
                style="background: none; border: none; font-size: 1.5rem; font-weight: bold; 
                       color: ${closeButtonColor}; opacity: 0.7; cursor: pointer; 
                       padding: 0; line-height: 1; transition: opacity 0.2s; 
                       width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
            &times;
        </button>
    `;
    
    // Mobil için özel stil
    if (window.innerWidth <= 768) {
        alertDiv.style.top = '10px';
        alertDiv.style.right = '10px';
        alertDiv.style.left = '10px';
        alertDiv.style.minWidth = 'auto';
        alertDiv.style.maxWidth = 'none';
    }
    
    // Alert'i body'ye ekle
    document.body.appendChild(alertDiv);
    
    // 5 saniye sonra otomatik kaldır - Timer'ı önce tanımla
    let autoCloseTimer = setTimeout(() => {
        if (alertDiv && alertDiv.parentNode) {
            alertDiv.style.transition = 'opacity 0.3s';
            alertDiv.style.opacity = '0';
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 300);
        }
    }, 5000);
    
    // Kapat butonuna tıklama eventi ekle
    const closeBtn = alertDiv.querySelector('.btn-close-alert-detail');
    if (closeBtn) {
        // Hover efekti
        closeBtn.addEventListener('mouseenter', function() {
            this.style.opacity = '1';
        });
        closeBtn.addEventListener('mouseleave', function() {
            this.style.opacity = '0.7';
        });
        
        // Click eventi - Timer'ı iptal et ve alert'i kapat
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            clearTimeout(autoCloseTimer);
            alertDiv.style.transition = 'opacity 0.3s';
            alertDiv.style.opacity = '0';
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 300);
        });
    }
}

// Modal'ı yenile (kapatıp açmak yerine sadece içeriği güncelle)
async function refreshTicketModal(ticketId) {
    try {
        const { data: ticket, error } = await supabase
            .from('investment_tickets')
            .select(`
                *,
                created_by_user:users!investment_tickets_created_by_fkey(id, name, email),
                assigned_to_user:users!investment_tickets_assigned_to_fkey(id, name, email),
                investment_areas!inner(
                    id,
                    name,
                    stores!inner(id, name)
                )
            `)
            .eq('id', ticketId)
            .single();

        if (error) throw error;

        // Yorumları al
        let comments = [];
        const { data: commentsData, error: commentsError } = await supabase
            .from('investment_ticket_comments')
            .select(`
                *,
                users(id, name, email)
            `)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });
        
        if (commentsError) {
            console.error('Yorum yükleme hatası:', commentsError);
            const { data: simpleComments } = await supabase
                .from('investment_ticket_comments')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });
            comments = simpleComments || [];
        } else {
            comments = commentsData || [];
        }

        // assigned_to_user bilgisini ayrı sorgu ile al (hem commentsData hem de simpleComments için)
        if (comments && comments.length > 0) {
            const assignedToIds = comments.filter(c => c.assigned_to).map(c => c.assigned_to);
            if (assignedToIds.length > 0) {
                try {
                    const { data: assignedUsers } = await supabase
                        .from('users')
                        .select('id, name')
                        .in('id', assignedToIds);
                    
                    if (assignedUsers && assignedUsers.length > 0) {
                        const userMap = {};
                        assignedUsers.forEach(u => userMap[u.id] = u);
                        comments.forEach(comment => {
                            if (comment.assigned_to && userMap[comment.assigned_to]) {
                                comment.assigned_to_user = userMap[comment.assigned_to];
                            }
                        });
                    }
                } catch (err) {
                    console.error('Assigned user yükleme hatası:', err);
                }
            }
        }

        // Her yorum için fotoğrafları al
        const commentIds = comments.map(c => c.id);
        let commentPhotos = {};
        if (commentIds.length > 0) {
            try {
                // Önce tüm fotoğrafları al, sonra JavaScript'te filtrele (comment_id kolonu yoksa hata vermemesi için)
                const { data: allPhotos, error: photosError } = await supabase
                    .from('investment_photos')
                    .select('id, photo_url, ticket_id, comment_id, created_at')
                    .eq('ticket_id', ticketId)
                    .order('created_at', { ascending: true });
                
                if (!photosError && allPhotos) {
                    // comment_id olan fotoğrafları filtrele ve grupla
                    allPhotos.forEach(photo => {
                        if (photo.comment_id && commentIds.includes(photo.comment_id)) {
                            if (!commentPhotos[photo.comment_id]) {
                                commentPhotos[photo.comment_id] = [];
                            }
                            commentPhotos[photo.comment_id].push(photo);
                        }
                    });
                }
            } catch (err) {
                console.error('Yorum fotoğrafları yükleme hatası:', err);
            }
        }

        // Fotoğrafları al (sadece comment_id olmayanlar - ticket'a direkt bağlı olanlar)
        let photos = [];
        try {
            const { data: photosData, error: photosError } = await supabase
                .from('investment_photos')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: false });
            
            if (!photosError && photosData) {
                // comment_id null olanları filtrele
                photos = photosData.filter(p => !p.comment_id);
            }
        } catch (err) {
            console.error('Ticket fotoğrafları yükleme hatası:', err);
        }

        // Modal içeriğini güncelle
        const modalBody = document.getElementById('ticket-modal-body');
        modalBody.innerHTML = createTicketDetailHTML(ticket, comments, photos || [], commentPhotos);

        // Yorum formu için kullanıcıları yükle
        await loadUsersForCommentAssignment();
        
        // Yorum yapan kişi bilgisini göster
        const currentCommentUser = document.getElementById('current-comment-user');
        if (currentCommentUser) {
            const userName = getCurrentUserName();
            currentCommentUser.textContent = userName || 'Bilinmeyen';
        }

        // Durum değiştirme event'ini ekle
        const statusSelect = document.getElementById('ticket-status-select');
        if (statusSelect) {
            // Önceki event listener'ı kaldır
            const newStatusSelect = statusSelect.cloneNode(true);
            statusSelect.parentNode.replaceChild(newStatusSelect, statusSelect);
            
            // Yeni event listener ekle
            newStatusSelect.addEventListener('change', async function() {
                await updateTicketStatus(ticketId, this.value, comments);
            });
        }

    } catch (error) {
        console.error('Modal yenileme hatası:', error);
    }
}

// Mevcut kullanıcı adını al
function getCurrentUserName() {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user') || localStorage.getItem('currentUser');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            return user.name || null;
        } catch (e) {
            // JSON değilse direkt string olabilir
            return userStr;
        }
    }
    return null;
}

// Haftalık karşılaştırma yükle
async function loadWeeklyComparison() {
    try {
        const year = parseInt(document.getElementById('weekly-year-select').value);
        const week = parseInt(document.getElementById('weekly-week-select').value);
        const container = document.getElementById('weekly-comparison-container');
        
        if (!year || !week || !currentAreaId) {
            container.innerHTML = '<p class="text-muted">Lütfen yıl ve hafta seçiniz</p>';
            return;
        }
        
        container.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div></div>';
        
        // Haftalık fotoğrafları al
        const { data: weeklyPhoto, error: weeklyError } = await supabase
            .from('investment_weekly_photos')
            .select(`
                id,
                week_number,
                year,
                uploaded_at,
                note,
                uploaded_by,
                users(id, name),
                investment_photos(id, photo_url, created_at)
            `)
            .eq('investment_area_id', currentAreaId)
            .eq('week_number', week)
            .eq('year', year)
            .single();
        
        // Ürün kontrollerini al
        const { data: productChecks, error: checksError } = await supabase
            .from('investment_weekly_product_checks')
            .select(`
                id,
                product_id,
                is_available,
                reason,
                checked_at,
                investment_area_products(id, product_name, product_code)
            `)
            .eq('investment_area_id', currentAreaId)
            .eq('week_number', week)
            .eq('year', year);
        
        // Planlanan ürünleri al
        const { data: plannedProducts, error: productsError } = await supabase
            .from('investment_area_products')
            .select('id, product_name, product_code, display_order')
            .eq('investment_area_id', currentAreaId)
            .order('display_order');
        
        let html = `
            <div class="row mb-4">
                <div class="col-md-12">
                    <h5>${week}. Hafta ${year} - Haftalık Rapor</h5>
                    ${weeklyPhoto ? `
                        <p class="text-muted">
                            <i class="fas fa-user me-1"></i>Yükleyen: ${weeklyPhoto.users?.name || 'Bilinmiyor'} | 
                            <i class="fas fa-clock me-1"></i>${formatDateTime(weeklyPhoto.uploaded_at)}
                        </p>
                        ${weeklyPhoto.note ? `<p class="alert alert-info">${weeklyPhoto.note}</p>` : ''}
                    ` : '<p class="alert alert-warning">Bu hafta için fotoğraf yüklenmemiş</p>'}
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <h6>Yüklenen Fotoğraflar</h6>
                    <div class="row g-2">
                        ${weeklyPhoto && weeklyPhoto.investment_photos ? weeklyPhoto.investment_photos.map(photo => `
                            <div class="col-md-4">
                                <img src="${photo.photo_url}" class="img-thumbnail w-100" style="height: 150px; object-fit: cover; cursor: pointer;" 
                                     onclick="openPhotoModal('${photo.photo_url}', '', '${formatDateTime(photo.created_at)}', '', '')">
                            </div>
                        `).join('') : '<p class="text-muted">Fotoğraf yok</p>'}
                    </div>
                </div>
                <div class="col-md-6">
                    <h6>Ürün Kontrolü</h6>
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Ürün</th>
                                <th>Durum</th>
                                <th>Açıklama</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${plannedProducts && plannedProducts.length > 0 ? plannedProducts.map(product => {
                                const check = productChecks?.find(c => c.product_id === product.id);
                                return `
                                    <tr>
                                        <td>${product.product_name}${product.product_code ? ` (${product.product_code})` : ''}</td>
                                        <td>
                                            ${check ? `
                                                <span class="badge ${check.is_available ? 'bg-success' : 'bg-danger'}">
                                                    ${check.is_available ? 'Var' : 'Yok'}
                                                </span>
                                            ` : '<span class="badge bg-secondary">Kontrol Edilmedi</span>'}
                                        </td>
                                        <td>${check && !check.is_available && check.reason ? check.reason : '-'}</td>
                                    </tr>
                                `;
                            }).join('') : '<tr><td colspan="3" class="text-muted">Planlanan ürün bulunmamaktadır</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Haftalık karşılaştırma yükleme hatası:', error);
        document.getElementById('weekly-comparison-container').innerHTML = 
            '<p class="text-danger">Haftalık karşılaştırma yüklenirken hata oluştu</p>';
    }
}

// Haftalık karşılaştırma için yıl ve hafta dropdown'larını doldur
function populateWeeklyDropdowns() {
    const currentYear = new Date().getFullYear();
    const yearSelect = document.getElementById('weekly-year-select');
    const weekSelect = document.getElementById('weekly-week-select');
    
    // Yıl dropdown'ını doldur (2025 ve 2026)
    if (yearSelect) {
        for (let year = 2025; year <= 2026; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) option.selected = true;
            yearSelect.appendChild(option);
        }
    }
    
    // Hafta dropdown'ını doldur
    if (weekSelect) {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const pastDaysOfYear = (now - startOfYear) / 86400000;
        const currentWeek = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
        
        for (let week = 1; week <= 53; week++) {
            const option = document.createElement('option');
            option.value = week;
            option.textContent = `${week}. Hafta`;
            if (week === currentWeek) option.selected = true;
            weekSelect.appendChild(option);
        }
    }
}

// Haftalık karşılaştırmayı Excel'e aktar
async function exportWeeklyToExcel() {
    try {
        const year = parseInt(document.getElementById('weekly-year-select').value);
        const week = parseInt(document.getElementById('weekly-week-select').value);
        
        if (!year || !week || !currentAreaId) {
            showAlert('Lütfen yıl ve hafta seçiniz', 'warning');
            return;
        }
        
        // Verileri topla (loadWeeklyComparison'daki gibi)
        const { data: weeklyPhoto } = await supabase
            .from('investment_weekly_photos')
            .select(`
                id,
                week_number,
                year,
                uploaded_at,
                note,
                users(id, name),
                investment_photos(id, photo_url, created_at)
            `)
            .eq('investment_area_id', currentAreaId)
            .eq('week_number', week)
            .eq('year', year)
            .single();
        
        const { data: productChecks } = await supabase
            .from('investment_weekly_product_checks')
            .select(`
                product_id,
                is_available,
                reason,
                investment_area_products(id, product_name, product_code)
            `)
            .eq('investment_area_id', currentAreaId)
            .eq('week_number', week)
            .eq('year', year);
        
        const { data: plannedProducts } = await supabase
            .from('investment_area_products')
            .select('id, product_name, product_code')
            .eq('investment_area_id', currentAreaId)
            .order('display_order');
        
        // Excel formatına çevir
        const wb = XLSX.utils.book_new();
        
        // Bilgi sayfası oluştur
        const infoData = [
            ['Haftalık Yatırım Alanı Raporu'],
            [''],
            ['Hafta:', `${week}. Hafta ${year}`],
            ['Yatırım Alanı:', currentAreaData.name],
            ['Yükleyen:', weeklyPhoto?.users?.name || 'Yüklenmemiş'],
            ['Yükleme Tarihi:', weeklyPhoto ? formatDateTime(weeklyPhoto.uploaded_at) : 'Yüklenmemiş'],
            [''],
            ['Ürün Kontrolü']
        ];
        
        const infoWs = XLSX.utils.aoa_to_sheet(infoData);
        XLSX.utils.book_append_sheet(wb, infoWs, 'Bilgiler');
        
        // Ürün kontrolü sayfası oluştur
        const productHeaders = ['Ürün Adı', 'Ürün Kodu', 'Durum', 'Açıklama'];
        const productRows = [];
        
        if (plannedProducts && plannedProducts.length > 0) {
            plannedProducts.forEach(product => {
                const check = productChecks?.find(c => c.product_id === product.id);
                productRows.push([
                    product.product_name || '',
                    product.product_code || '',
                    check ? (check.is_available ? 'Var' : 'Yok') : 'Kontrol Edilmedi',
                    check && !check.is_available && check.reason ? check.reason : ''
                ]);
            });
        }
        
        const productData = [productHeaders, ...productRows];
        const productWs = XLSX.utils.aoa_to_sheet(productData);
        productWs['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 40 }];
        XLSX.utils.book_append_sheet(wb, productWs, 'Ürün Kontrolü');
        
        // Fotoğraflar sayfası oluştur
        const photoHeaders = ['Fotoğraf URL'];
        const photoRows = [];
        
        if (weeklyPhoto && weeklyPhoto.investment_photos) {
            weeklyPhoto.investment_photos.forEach(photo => {
                photoRows.push([photo.photo_url]);
            });
        }
        
        const photoData = [photoHeaders, ...photoRows];
        const photoWs = XLSX.utils.aoa_to_sheet(photoData);
        photoWs['!cols'] = [{ wch: 80 }];
        XLSX.utils.book_append_sheet(wb, photoWs, 'Fotoğraflar');
        
        // Excel dosyasını indir
        const fileName = `Haftalik_Rapor_${currentAreaData.name.replace(/[^a-zA-Z0-9]/g, '_')}_${week}_${year}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showAlert('Excel dosyası indirildi', 'success');
        
    } catch (error) {
        console.error('Excel export hatası:', error);
        showAlert('Excel export sırasında hata oluştu', 'danger');
    }
}

// Haftalık sunum oluştur
async function createWeeklyPresentation() {
    try {
        const year = parseInt(document.getElementById('weekly-year-select').value);
        const week = parseInt(document.getElementById('weekly-week-select').value);
        
        if (!year || !week || !currentAreaId) {
            showAlert('Lütfen yıl ve hafta seçiniz', 'warning');
            return;
        }
        
        // Verileri topla
        const { data: weeklyPhoto } = await supabase
            .from('investment_weekly_photos')
            .select(`
                id,
                week_number,
                year,
                uploaded_at,
                note,
                users(id, name),
                investment_photos(id, photo_url, created_at)
            `)
            .eq('investment_area_id', currentAreaId)
            .eq('week_number', week)
            .eq('year', year)
            .single();
        
        const { data: productChecks } = await supabase
            .from('investment_weekly_product_checks')
            .select(`
                product_id,
                is_available,
                reason,
                investment_area_products(id, product_name, product_code)
            `)
            .eq('investment_area_id', currentAreaId)
            .eq('week_number', week)
            .eq('year', year);
        
        // HTML sunum oluştur
        let html = `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <title>Haftalık Rapor - ${week}. Hafta ${year}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #667eea; }
                    .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
                    .photo-item img { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #667eea; color: white; }
                </style>
            </head>
            <body>
                <h1>Haftalık Yatırım Alanı Raporu</h1>
                <h2>${currentAreaData.name}</h2>
                <p><strong>Hafta:</strong> ${week}. Hafta ${year}</p>
                <p><strong>Yükleyen:</strong> ${weeklyPhoto?.users?.name || 'Yüklenmemiş'}</p>
                <p><strong>Yükleme Tarihi:</strong> ${weeklyPhoto ? formatDateTime(weeklyPhoto.uploaded_at) : 'Yüklenmemiş'}</p>
                ${weeklyPhoto?.note ? `<p><strong>Not:</strong> ${weeklyPhoto.note}</p>` : ''}
                
                <h3>Yüklenen Fotoğraflar</h3>
                <div class="photo-grid">
                    ${weeklyPhoto && weeklyPhoto.investment_photos ? weeklyPhoto.investment_photos.map(photo => `
                        <div class="photo-item">
                            <img src="${photo.photo_url}" alt="Fotoğraf">
                        </div>
                    `).join('') : '<p>Fotoğraf yok</p>'}
                </div>
                
                <h3>Ürün Kontrolü</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Ürün Adı</th>
                            <th>Ürün Kodu</th>
                            <th>Durum</th>
                            <th>Açıklama</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productChecks && productChecks.length > 0 ? productChecks.map(check => `
                            <tr>
                                <td>${check.investment_area_products?.product_name || ''}</td>
                                <td>${check.investment_area_products?.product_code || ''}</td>
                                <td>${check.is_available ? 'Var' : 'Yok'}</td>
                                <td>${check.reason || '-'}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="4">Kontrol edilmiş ürün yok</td></tr>'}
                    </tbody>
                </table>
            </body>
            </html>
        `;
        
        // HTML'i yeni pencerede aç
        const newWindow = window.open();
        newWindow.document.write(html);
        newWindow.document.close();
        
        showAlert('Sunum oluşturuldu', 'success');
        
    } catch (error) {
        console.error('Sunum oluşturma hatası:', error);
        showAlert('Sunum oluşturulurken hata oluştu', 'danger');
    }
}

// Global fonksiyonlar
window.loadWeeklyComparison = loadWeeklyComparison;
window.exportWeeklyToExcel = exportWeeklyToExcel;
window.createWeeklyPresentation = createWeeklyPresentation;

// Sayfa yüklendiğinde haftalık dropdown'ları doldur
document.addEventListener('DOMContentLoaded', function() {
    // URL'den area ID ve ticket ID'yi al
    const urlParams = new URLSearchParams(window.location.search);
    const areaId = urlParams.get('id');
    const ticketId = urlParams.get('ticket');
    
    if (areaId) {
        loadAreaDetail(parseInt(areaId)).then(async () => {
            // Eğer URL'de ticket ID varsa, ticket'ı otomatik aç
            if (ticketId) {
                // Ticket'ların yüklenmesini bekle (loadTickets zaten loadAreaDetail içinde çağrılıyor)
                // Ancak DOM'un güncellenmesi için kısa bir gecikme ekle
                await new Promise(resolve => setTimeout(resolve, 300));
                openTicketDetail(parseInt(ticketId));
            }
        });
        
        // Haftalık karşılaştırma sekmesi açıldığında dropdown'ları doldur
        const weeklyTab = document.getElementById('weekly-comparison-tab');
        if (weeklyTab) {
            weeklyTab.addEventListener('shown.bs.tab', function() {
                populateWeeklyDropdowns();
                loadWeeklyComparison();
            });
        }
    }
});

// Global olarak tanımla
window.showAlert = showAlert;

