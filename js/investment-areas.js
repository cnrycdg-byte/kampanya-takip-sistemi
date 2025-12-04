// Yatırım Alanları Modülü - JavaScript Fonksiyonları

let currentFilters = {
    channel: '',
    region: '',
    store: '',
    brand: '',
    type: '',
    ticketStatus: '',
    areaStatus: '',
    personnel: ''
};

let investmentAreasData = [];
let channelsData = [];
let regionsData = [];
let storesData = [];

// Filtreleri yükle
async function loadFilters() {
    try {
        // Kanalları yükle
        const { data: channels, error: channelsError } = await supabase
            .from('channels')
            .select('id, name')
            .order('name');

        if (channelsError) throw channelsError;
        channelsData = channels || [];

        const channelSelect = document.getElementById('filter-channel');
        channels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel.id;
            option.textContent = channel.name;
            channelSelect.appendChild(option);
        });

        // Bölgeleri yükle
        const { data: regions, error: regionsError } = await supabase
            .from('regions')
            .select('id, name')
            .order('name');

        if (regionsError) throw regionsError;
        regionsData = regions || [];

        const regionSelect = document.getElementById('filter-region');
        regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region.id;
            option.textContent = region.name;
            regionSelect.appendChild(option);
        });

        // Mağazaları yükle
        await loadStoresForFilter();

        // Filtre değişikliklerini dinle
        document.getElementById('filter-channel').addEventListener('change', async function() {
            await loadStoresForFilter();
        });

        document.getElementById('filter-region').addEventListener('change', async function() {
            await loadStoresForFilter();
        });

    } catch (error) {
        console.error('Filtre yükleme hatası:', error);
        showAlert('Filtreler yüklenirken hata oluştu', 'danger');
    }
}

// Mağazaları filtreye göre yükle
async function loadStoresForFilter() {
    const channelId = document.getElementById('filter-channel').value;
    const regionId = document.getElementById('filter-region').value;

    let query = supabase
        .from('stores')
        .select('id, name, channel_id, region_id')
        .eq('is_active', true);

    if (channelId) {
        query = query.eq('channel_id', channelId);
    }

    if (regionId) {
        query = query.eq('region_id', regionId);
    }

    const { data: stores, error } = await query.order('name');

    if (error) {
        console.error('Mağaza yükleme hatası:', error);
        return;
    }

    storesData = stores || [];
    const storeSelect = document.getElementById('filter-store');
    storeSelect.innerHTML = '<option value="">Tüm Mağazalar</option>';

    stores.forEach(store => {
        const option = document.createElement('option');
        option.value = store.id;
        option.textContent = store.name;
        storeSelect.appendChild(option);
    });
}

// Yatırım alanlarını yükle
async function loadInvestmentAreas() {
    try {
        const tbody = document.getElementById('investment-areas-tbody');
        tbody.innerHTML = '<tr><td colspan="14" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Yükleniyor...</span></div></td></tr>';

        // Filtreleri uygula
        let query = supabase
            .from('investment_areas')
            .select(`
                id,
                name,
                type,
                brand,
                manufacturer,
                status,
                store_id,
                stores!inner(
                    id,
                    name,
                    channel_id,
                    region_id,
                    has_personnel,
                    channels(id, name),
                    regions(id, name)
                )
            `);

        // Filtreleri uygula
        if (currentFilters.store) {
            query = query.eq('store_id', currentFilters.store);
        } else if (currentFilters.channel || currentFilters.region) {
            // Store filtreleri uygulanacak
            if (currentFilters.channel) {
                query = query.eq('stores.channel_id', currentFilters.channel);
            }
            if (currentFilters.region) {
                query = query.eq('stores.region_id', currentFilters.region);
            }
        }

        if (currentFilters.brand) {
            query = query.eq('brand', currentFilters.brand);
        }

        if (currentFilters.type) {
            query = query.eq('type', currentFilters.type);
        }

        if (currentFilters.areaStatus) {
            query = query.eq('status', currentFilters.areaStatus);
        }

        const { data: areas, error } = await query.order('name');
        
        // Personel durumu filtresini uygula (client-side)
        let areasAfterPersonnelFilter = areas || [];
        if (currentFilters.personnel) {
            if (currentFilters.personnel === 'with_personnel') {
                areasAfterPersonnelFilter = areasAfterPersonnelFilter.filter(area => 
                    area.stores?.has_personnel !== false
                );
            } else if (currentFilters.personnel === 'without_personnel') {
                areasAfterPersonnelFilter = areasAfterPersonnelFilter.filter(area => 
                    area.stores?.has_personnel === false
                );
            }
        }

        if (error) throw error;

        investmentAreasData = areasAfterPersonnelFilter || [];

        // Ticket durumu filtresini uygula
        let filteredAreas = investmentAreasData;
        if (currentFilters.ticketStatus) {
            const areaIds = filteredAreas.map(a => a.id);
            
            let ticketQuery = supabase
                .from('investment_tickets')
                .select('investment_area_id, status')
                .in('investment_area_id', areaIds);

            if (currentFilters.ticketStatus === 'has_open') {
                ticketQuery = ticketQuery.in('status', ['open', 'in_progress', 'pending_approval']);
            } else if (currentFilters.ticketStatus === 'no_open') {
                ticketQuery = ticketQuery.not('status', 'in', '(open,in_progress,pending_approval)');
            }

            const { data: tickets, error: ticketError } = await ticketQuery;

            if (!ticketError && tickets) {
                const areasWithOpenTickets = new Set(tickets.map(t => t.investment_area_id));
                
                if (currentFilters.ticketStatus === 'has_open') {
                    filteredAreas = filteredAreas.filter(a => areasWithOpenTickets.has(a.id));
                } else if (currentFilters.ticketStatus === 'no_open') {
                    filteredAreas = filteredAreas.filter(a => !areasWithOpenTickets.has(a.id));
                }
            }
        }

        // Her alan için ticket sayılarını al
        const areaIds = filteredAreas.map(a => a.id);
        const { data: tickets, error: ticketsError } = await supabase
            .from('investment_tickets')
            .select('investment_area_id, type, status')
            .in('investment_area_id', areaIds);

        const ticketCounts = {};
        if (tickets) {
            tickets.forEach(ticket => {
                if (!ticketCounts[ticket.investment_area_id]) {
                    ticketCounts[ticket.investment_area_id] = {
                        open: 0,
                        new_stand: 0,
                        revision: 0,
                        correction: 0
                    };
                }
                if (['open', 'in_progress', 'pending_approval'].includes(ticket.status)) {
                    ticketCounts[ticket.investment_area_id].open++;
                }
                if (ticket.type === 'new_stand') {
                    ticketCounts[ticket.investment_area_id].new_stand++;
                } else if (ticket.type === 'revision') {
                    ticketCounts[ticket.investment_area_id].revision++;
                } else if (ticket.type === 'correction') {
                    ticketCounts[ticket.investment_area_id].correction++;
                }
            });
        }

        // Son fotoğraf tarihlerini al
        const { data: photos, error: photosError } = await supabase
            .from('investment_photos')
            .select('investment_area_id, created_at')
            .in('investment_area_id', areaIds)
            .order('created_at', { ascending: false });

        const lastPhotoDates = {};
        if (photos) {
            photos.forEach(photo => {
                if (!lastPhotoDates[photo.investment_area_id] || 
                    new Date(photo.created_at) > new Date(lastPhotoDates[photo.investment_area_id])) {
                    lastPhotoDates[photo.investment_area_id] = photo.created_at;
                }
            });
        }

        // Tabloyu oluştur
        tbody.innerHTML = '';

        if (filteredAreas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="15" class="text-center text-muted">Yatırım alanı bulunamadı</td></tr>';
            document.getElementById('total-count').textContent = '0';
            return;
        }

        filteredAreas.forEach(area => {
            const store = area.stores;
            const channel = store?.channels;
            const region = store?.regions;
            const counts = ticketCounts[area.id] || { open: 0, new_stand: 0, revision: 0, correction: 0 };
            const lastPhotoDate = lastPhotoDates[area.id];
            
            // Personel durumu
            const hasPersonnel = store?.has_personnel !== false; // null veya undefined ise true
            const personnelBadge = hasPersonnel 
                ? '<span class="badge bg-success"><i class="fas fa-users me-1"></i>Personelli</span>' 
                : '<span class="badge bg-warning"><i class="fas fa-user-slash me-1"></i>Personelsiz</span>';

            const row = document.createElement('tr');
            // Satıra tıklama - sadece butonlar dışındaki alanlara
            row.onclick = (e) => {
                // Eğer butonlara tıklandıysa detay sayfasına gitme
                if (!e.target.closest('button')) {
                    openAreaDetail(area.id);
                }
            };
            row.style.cursor = 'pointer';

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

            row.innerHTML = `
                <td>${channel?.name || '-'}</td>
                <td>${region?.name || '-'}</td>
                <td>${store?.name || '-'}</td>
                <td><strong>${area.name}</strong></td>
                <td>${brandLabels[area.brand] || '-'}</td>
                <td>${area.manufacturer || '-'}</td>
                <td>${typeLabels[area.type] || area.type}</td>
                <td>${personnelBadge}</td>
                <td><span class="status-badge status-${area.status}">${statusLabels[area.status] || area.status}</span></td>
                <td>${lastPhotoDate ? formatDate(lastPhotoDate) : '-'}</td>
                <td><span class="badge bg-danger badge-ticket">${counts.open}</span></td>
                <td><span class="badge bg-info badge-ticket">${counts.new_stand}</span></td>
                <td><span class="badge bg-warning badge-ticket">${counts.revision}</span></td>
                <td><span class="badge bg-secondary badge-ticket">${counts.correction}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="event.stopPropagation(); editInvestmentArea(${area.id})" title="Düzenle">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteInvestmentArea(${area.id})" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });

        document.getElementById('total-count').textContent = filteredAreas.length;

    } catch (error) {
        console.error('Yatırım alanları yükleme hatası:', error);
        let errorMessage = 'Veri yüklenirken hata oluştu';
        
        if (error.message && error.message.includes('investment_areas')) {
            errorMessage = 'investment_areas tablosu bulunamadı. Lütfen SQL scriptini (create_investment_areas_system.sql) çalıştırın.';
        }
        
        document.getElementById('investment-areas-tbody').innerHTML = 
            `<tr><td colspan="14" class="text-center text-danger">${errorMessage}</td></tr>`;
        showAlert(errorMessage, 'danger');
    }
}

// Filtreleri uygula
function applyFilters() {
    currentFilters = {
        channel: document.getElementById('filter-channel').value,
        region: document.getElementById('filter-region').value,
        store: document.getElementById('filter-store').value,
        brand: document.getElementById('filter-brand').value,
        type: document.getElementById('filter-type').value,
        ticketStatus: document.getElementById('filter-ticket-status').value,
        areaStatus: document.getElementById('filter-area-status').value,
        personnel: document.getElementById('filter-personnel').value
    };

    loadInvestmentAreas();
}

// Filtreleri temizle
function clearFilters() {
    document.getElementById('filter-channel').value = '';
    document.getElementById('filter-region').value = '';
    document.getElementById('filter-store').value = '';
    document.getElementById('filter-brand').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-ticket-status').value = '';
    document.getElementById('filter-area-status').value = '';
    document.getElementById('filter-personnel').value = '';

    currentFilters = {
        channel: '',
        region: '',
        store: '',
        brand: '',
        type: '',
        ticketStatus: '',
        areaStatus: '',
        personnel: ''
    };

    loadInvestmentAreas();
}

// Yatırım alanı detay sayfasına git
function openAreaDetail(areaId) {
    window.location.href = `investment-area-detail.html?id=${areaId}`;
}

// Excel export
async function exportToExcel() {
    try {
        showAlert('Excel dosyası hazırlanıyor...', 'info');

        // Filtrelenmiş verileri al
        const data = [];
        
        for (const area of investmentAreasData) {
            const store = area.stores;
            const channel = store?.channels;
            const region = store?.regions;

            // Ticket sayılarını al
            const { data: tickets } = await supabase
                .from('investment_tickets')
                .select('type, status, created_at, closed_at')
                .eq('investment_area_id', area.id);

            const openTickets = tickets?.filter(t => ['open', 'in_progress', 'pending_approval'].includes(t.status)) || [];
            const closedTickets = tickets?.filter(t => ['completed', 'cancelled'].includes(t.status)) || [];

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

            data.push({
                'Kanal': channel?.name || '',
                'Bölge': region?.name || '',
                'Mağaza': store?.name || '',
                'Yatırım Alanı': area.name,
                'Marka': brandLabels[area.brand] || '',
                'Üretici': area.manufacturer || '',
                'Tip': typeLabels[area.type] || area.type,
                'Durum': area.status,
                'Açık Ticket': openTickets.length,
                'Kapalı Ticket': closedTickets.length,
                'Toplam Ticket': tickets?.length || 0
            });
        }

        // Excel formatına çevir
        if (!data || data.length === 0) {
            showAlert('Export edilecek veri bulunamadı', 'warning');
            return;
        }

        const headers = Object.keys(data[0]);
        const wsData = [
            headers,
            ...data.map(row => headers.map(header => row[header] || ''))
        ];

        // Worksheet oluştur
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Kolon genişliklerini ayarla
        const colWidths = headers.map(() => ({ wch: 20 }));
        ws['!cols'] = colWidths;

        // Workbook oluştur
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Yatırım Alanları');

        // Excel dosyasını indir
        const fileName = `yatirim-alanlari-${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        showAlert('Excel dosyası indirildi', 'success');

    } catch (error) {
        console.error('Excel export hatası:', error);
        showAlert('Excel dosyası oluşturulurken hata oluştu', 'danger');
    }
}

// Tarih formatla
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Alert göster (tekrar önleme ile)
let lastAlertMessageAreas = '';
let lastAlertTimeAreas = 0;
const ALERT_COOLDOWN_AREAS = 2000;

function showAlert(message, type = 'info') {
    // Aynı mesajın çok sık gösterilmesini önle
    const now = Date.now();
    if (message === lastAlertMessageAreas && (now - lastAlertTimeAreas) < ALERT_COOLDOWN_AREAS) {
        return;
    }
    
    lastAlertMessageAreas = message;
    lastAlertTimeAreas = now;
    
    // Önceki alert'leri kaldır
    const existingAlerts = document.querySelectorAll('.custom-alert-areas');
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
    alertDiv.className = `alert alert-${type} custom-alert-areas`;
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
        <button type="button" class="btn-close-alert-areas" aria-label="Kapat" 
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
    
    // Kapat butonuna tıklama eventi ekle
    const closeBtn = alertDiv.querySelector('.btn-close-alert-areas');
    if (closeBtn) {
        // Hover efekti
        closeBtn.addEventListener('mouseenter', function() {
            this.style.opacity = '1';
        });
        closeBtn.addEventListener('mouseleave', function() {
            this.style.opacity = '0.7';
        });
        
        // Click eventi
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            alertDiv.style.transition = 'opacity 0.3s';
            alertDiv.style.opacity = '0';
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 300);
        });
    }
    
    // 5 saniye sonra otomatik kaldır
    const autoCloseTimer = setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.style.transition = 'opacity 0.3s';
            alertDiv.style.opacity = '0';
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 300);
        }
    }, 5000);
    
    // X butonuna tıklanınca timer'ı iptal et
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            clearTimeout(autoCloseTimer);
        });
    }
}

