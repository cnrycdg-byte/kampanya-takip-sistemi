// Yatırım Alanları Raporlama - JavaScript Fonksiyonları

let reportData = [];

// Haftalık fotoğraf raporu için filtreleri yükle
async function loadWeeklyPhotoReportFilters() {
    try {
        const currentYear = new Date().getFullYear();
        const yearSelect = document.getElementById('weekly-report-year');
        const weekSelect = document.getElementById('weekly-report-week');
        
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
            for (let week = 1; week <= 53; week++) {
                const option = document.createElement('option');
                option.value = week;
                option.textContent = `${week}. Hafta`;
                weekSelect.appendChild(option);
            }
        }
        
        // Kanalları yükle
        const { data: channels } = await supabase
            .from('channels')
            .select('id, name')
            .order('name');
        
        if (channels) {
            const channelSelect = document.getElementById('weekly-report-channel');
            channels.forEach(channel => {
                const option = document.createElement('option');
                option.value = channel.id;
                option.textContent = channel.name;
                channelSelect.appendChild(option);
            });
        }
        
        // Bölgeleri yükle
        const { data: regions } = await supabase
            .from('regions')
            .select('id, name')
            .order('name');
        
        if (regions) {
            const regionSelect = document.getElementById('weekly-report-region');
            regions.forEach(region => {
                const option = document.createElement('option');
                option.value = region.id;
                option.textContent = region.name;
                regionSelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Haftalık fotoğraf raporu filtreleri yükleme hatası:', error);
    }
}

// Haftalık fotoğraf raporunu yükle
async function loadWeeklyPhotoReport() {
    try {
        const year = parseInt(document.getElementById('weekly-report-year').value);
        const week = parseInt(document.getElementById('weekly-report-week').value);
        const channelId = document.getElementById('weekly-report-channel').value;
        const regionId = document.getElementById('weekly-report-region').value;
        
        if (!year || !week) {
            showAlert('Lütfen yıl ve hafta seçiniz', 'warning');
            return;
        }
        
        const tbody = document.getElementById('weekly-report-tbody');
        tbody.innerHTML = '<tr><td colspan="9" class="text-center"><div class="spinner-border text-primary"></div></td></tr>';
        
        // Tüm aktif yatırım alanlarını al
        let areasQuery = supabase
            .from('investment_areas')
            .select(`
                id,
                name,
                stores!inner(
                    id,
                    name,
                    channel_id,
                    region_id,
                    channels(id, name),
                    regions(id, name)
                )
            `)
            .eq('status', 'active');
        
        if (channelId) {
            areasQuery = areasQuery.eq('stores.channel_id', channelId);
        }
        if (regionId) {
            areasQuery = areasQuery.eq('stores.region_id', regionId);
        }
        
        const { data: areas, error: areasError } = await areasQuery;
        
        if (areasError) throw areasError;
        
        // Haftalık fotoğraf kayıtlarını al
        const areaIds = areas.map(a => a.id);
        const { data: weeklyPhotos, error: photosError } = await supabase
            .from('investment_weekly_photos')
            .select(`
                id,
                investment_area_id,
                uploaded_at,
                note,
                users(id, name),
                investment_photos(id)
            `)
            .in('investment_area_id', areaIds.length > 0 ? areaIds : [0])
            .eq('week_number', week)
            .eq('year', year);
        
        if (photosError) throw photosError;
        
        // Yatırım alanı ID'lerine göre map oluştur
        const weeklyPhotosMap = {};
        if (weeklyPhotos) {
            weeklyPhotos.forEach(wp => {
                weeklyPhotosMap[wp.investment_area_id] = wp;
            });
        }
        
        // Raporu oluştur
        let html = '';
        let uploadedCount = 0;
        let notUploadedCount = 0;
        
        areas.forEach(area => {
            const weeklyPhoto = weeklyPhotosMap[area.id];
            const store = area.stores;
            const channel = store?.channels;
            const region = store?.regions;
            
            if (weeklyPhoto) {
                uploadedCount++;
                html += `
                    <tr class="table-success">
                        <td>${channel?.name || '-'}</td>
                        <td>${region?.name || '-'}</td>
                        <td>${store?.name || '-'}</td>
                        <td>${area.name}</td>
                        <td><span class="badge bg-success">Evet</span></td>
                        <td>${weeklyPhoto.users?.name || '-'}</td>
                        <td>${formatDateTime(weeklyPhoto.uploaded_at)}</td>
                        <td>${weeklyPhoto.investment_photos?.length || 0}</td>
                        <td>${weeklyPhoto.note || '-'}</td>
                    </tr>
                `;
            } else {
                notUploadedCount++;
                html += `
                    <tr class="table-danger">
                        <td>${channel?.name || '-'}</td>
                        <td>${region?.name || '-'}</td>
                        <td>${store?.name || '-'}</td>
                        <td>${area.name}</td>
                        <td><span class="badge bg-danger">Hayır</span></td>
                        <td>-</td>
                        <td>-</td>
                        <td>0</td>
                        <td>-</td>
                    </tr>
                `;
            }
        });
        
        if (html === '') {
            html = '<tr><td colspan="9" class="text-center text-muted">Sonuç bulunamadı</td></tr>';
        }
        
        tbody.innerHTML = html;
        document.getElementById('weekly-report-count').textContent = `${areas.length} kayıt (${uploadedCount} yükleyen, ${notUploadedCount} yüklemeyen)`;
        
    } catch (error) {
        console.error('Haftalık fotoğraf raporu yükleme hatası:', error);
        showAlert('Rapor yüklenirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 'danger');
        document.getElementById('weekly-report-tbody').innerHTML = 
            '<tr><td colspan="9" class="text-center text-danger">Rapor yüklenirken hata oluştu</td></tr>';
    }
}

// Haftalık fotoğraf raporunu Excel'e aktar
async function exportWeeklyPhotoReportToExcel() {
    try {
        const year = parseInt(document.getElementById('weekly-report-year').value);
        const week = parseInt(document.getElementById('weekly-report-week').value);
        
        if (!year || !week) {
            showAlert('Lütfen yıl ve hafta seçiniz', 'warning');
            return;
        }
        
        const tbody = document.getElementById('weekly-report-tbody');
        const rows = tbody.querySelectorAll('tr');
        
        if (rows.length === 0) {
            showAlert('Rapor verisi bulunamadı', 'warning');
            return;
        }
        
        // Excel formatına çevir
        const headers = ['Kanal', 'Bölge', 'Mağaza', 'Yatırım Alanı', 'Fotoğraf Yüklendi', 'Yükleyen', 'Yükleme Tarihi', 'Fotoğraf Sayısı', 'Not'];
        
        const wsData = [headers];
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 9) {
                const rowData = [
                    cells[0].textContent.trim(),
                    cells[1].textContent.trim(),
                    cells[2].textContent.trim(),
                    cells[3].textContent.trim(),
                    cells[4].textContent.trim(),
                    cells[5].textContent.trim(),
                    cells[6].textContent.trim(),
                    cells[7].textContent.trim(),
                    cells[8].textContent.trim()
                ];
                wsData.push(rowData);
            }
        });
        
        // Worksheet oluştur
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // İlk satıra başlık ekle
        XLSX.utils.sheet_add_aoa(ws, [[`Haftalık Fotoğraf Yükleme Raporu`]], { origin: -1 });
        XLSX.utils.sheet_add_aoa(ws, [[`${week}. Hafta ${year}`]], { origin: -1 });
        XLSX.utils.sheet_add_aoa(ws, [[]], { origin: -1 }); // Boş satır
        
        // Kolon genişliklerini ayarla
        const colWidths = headers.map(() => ({ wch: 20 }));
        ws['!cols'] = colWidths;

        // Workbook oluştur
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Haftalık Fotoğraf Raporu');

        // Excel dosyasını indir
        const fileName = `Haftalik_Fotograf_Raporu_${week}_${year}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showAlert('Excel dosyası indirildi', 'success');
        
    } catch (error) {
        console.error('Excel export hatası:', error);
        showAlert('Excel export sırasında hata oluştu', 'danger');
    }
}

// Tarih formatla
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

// Global fonksiyonlar
window.loadWeeklyPhotoReport = loadWeeklyPhotoReport;
window.exportWeeklyPhotoReportToExcel = exportWeeklyPhotoReportToExcel;

// Sayfa yüklendiğinde haftalık rapor filtrelerini yükle
document.addEventListener('DOMContentLoaded', function() {
    // Haftalık fotoğraf raporu sekmesi açıldığında filtreleri yükle
    const weeklyTab = document.getElementById('weekly-photo-report-tab');
    if (weeklyTab) {
        weeklyTab.addEventListener('shown.bs.tab', function() {
            loadWeeklyPhotoReportFilters();
        });
    }
});

// Raporlama filtrelerini yükle
async function loadReportingFilters() {
    try {
        // Kanalları yükle
        const { data: channels, error: channelsError } = await supabase
            .from('channels')
            .select('id, name')
            .eq('status', 'active')
            .order('name');

        if (!channelsError && channels) {
            const channelSelect = document.getElementById('filter-channel');
            channels.forEach(channel => {
                const option = document.createElement('option');
                option.value = channel.id;
                option.textContent = channel.name;
                channelSelect.appendChild(option);
            });
        }

        // Bölgeleri yükle
        const { data: regions, error: regionsError } = await supabase
            .from('regions')
            .select('id, name')
            .eq('status', 'active')
            .order('name');

        if (!regionsError && regions) {
            const regionSelect = document.getElementById('filter-region');
            regions.forEach(region => {
                const option = document.createElement('option');
                option.value = region.id;
                option.textContent = region.name;
                regionSelect.appendChild(option);
            });
        }

        // Filtre değişikliklerini dinle
        document.getElementById('filter-channel').addEventListener('change', async function() {
            await loadReportingStores();
        });

        document.getElementById('filter-region').addEventListener('change', async function() {
            await loadReportingStores();
        });

        // Tarih aralığı varsayılan değerleri (son 30 gün)
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        document.getElementById('filter-date-from').value = thirtyDaysAgo.toISOString().split('T')[0];
        document.getElementById('filter-date-to').value = today.toISOString().split('T')[0];

    } catch (error) {
        console.error('Filtre yükleme hatası:', error);
        showAlert('Filtreler yüklenirken hata oluştu', 'danger');
    }
}

// Mağazaları yükle
async function loadReportingStores() {
    const channelId = document.getElementById('filter-channel').value;
    const regionId = document.getElementById('filter-region').value;

    let query = supabase
        .from('stores')
        .select('id, name')
        .eq('status', 'active');

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

    const storeSelect = document.getElementById('filter-store');
    storeSelect.innerHTML = '<option value="">Tüm Mağazalar</option>';

    if (stores) {
        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.name;
            storeSelect.appendChild(option);
        });
    }
}

// Raporu yükle
async function loadReport() {
    try {
        const tbody = document.getElementById('report-tbody');
        tbody.innerHTML = '<tr><td colspan="14" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Yükleniyor...</span></div></td></tr>';

        // Filtreleri al
        const dateFrom = document.getElementById('filter-date-from').value;
        const dateTo = document.getElementById('filter-date-to').value;
        const channelId = document.getElementById('filter-channel').value;
        const regionId = document.getElementById('filter-region').value;
        const storeId = document.getElementById('filter-store').value;
        const ticketType = document.getElementById('filter-ticket-type').value;
        const status = document.getElementById('filter-status').value;
        const assignedFilter = document.getElementById('filter-assigned').value;
        
        // Kullanıcı ID'sini al (getUserId fonksiyonunu kullan)
        // investment-area-detail.js'deki getUserId fonksiyonunu kullan
        let userId = null;
        
        // Önce userId'yi kontrol et
        let userIdFromStorage = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        if (userIdFromStorage) {
            userId = parseInt(userIdFromStorage);
        } else {
            // Sonra 'user' objesini kontrol et
            const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    if (user.id) {
                        userId = parseInt(user.id);
                    }
                } catch (e) {
                    console.error('User parse hatası:', e);
                }
            }
            
            // Son olarak 'currentUser' objesini kontrol et
            if (!userId) {
                const currentUserStr = localStorage.getItem('currentUser');
                if (currentUserStr) {
                    try {
                        const currentUser = JSON.parse(currentUserStr);
                        if (currentUser.id) {
                            userId = parseInt(currentUser.id);
                        }
                    } catch (e) {
                        console.error('CurrentUser parse hatası:', e);
                    }
                }
            }
        }
        
        // Debug için
        console.log('Filtre için kullanıcı ID:', userId, 'Filtre:', assignedFilter);

        // Ticket sorgusu oluştur
        let query = supabase
            .from('investment_tickets')
            .select(`
                id,
                type,
                subject,
                status,
                created_at,
                updated_at,
                closed_at,
                created_by,
                assigned_to,
                created_by_user:users!investment_tickets_created_by_fkey(id, name),
                assigned_to_user:users!investment_tickets_assigned_to_fkey(id, name),
                investment_areas!inner(
                    id,
                    name,
                    store_id,
                    stores!inner(
                        id,
                        name,
                        channel_id,
                        region_id,
                        channels(id, name),
                        regions(id, name)
                    )
                )
            `);

        // Tarih filtresi
        if (dateFrom) {
            query = query.gte('created_at', dateFrom + 'T00:00:00');
        }
        if (dateTo) {
            query = query.lte('created_at', dateTo + 'T23:59:59');
        }

        // Store filtresi
        if (storeId) {
            query = query.eq('investment_areas.store_id', storeId);
        } else if (channelId || regionId) {
            if (channelId) {
                query = query.eq('investment_areas.stores.channel_id', channelId);
            }
            if (regionId) {
                query = query.eq('investment_areas.stores.region_id', regionId);
            }
        }

        // Ticket tipi filtresi
        if (ticketType) {
            query = query.eq('type', ticketType);
        }

        // Durum filtresi
        if (status) {
            query = query.eq('status', status);
        }

        // Atama filtresi - SORUMLUYA (assigned_to) göre filtrele
        if (assignedFilter === 'assigned_to_me') {
            if (!userId) {
                showAlert('Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.', 'warning');
                tbody.innerHTML = '<tr><td colspan="14" class="text-center text-warning">Kullanıcı bilgisi bulunamadı</td></tr>';
                return;
            }
            // SORUMLUYA (assigned_to) göre filtrele - OLUŞTURANA (created_by) göre değil!
            query = query.eq('assigned_to', userId);
            console.log('Bana atananlar filtresi aktif - Sorumlu (assigned_to):', userId);
        } else if (assignedFilter === 'unassigned') {
            query = query.is('assigned_to', null);
        }

        const { data: tickets, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        reportData = tickets || [];

        // Tabloyu oluştur
        tbody.innerHTML = '';

        if (reportData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="14" class="text-center text-muted">Rapor verisi bulunamadı</td></tr>';
            document.getElementById('report-count').textContent = '0 kayıt';
            return;
        }

        reportData.forEach(ticket => {
            const area = ticket.investment_areas;
            const store = area?.stores;
            const channel = store?.channels;
            const region = store?.regions;

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

            const daysOpen = ticket.closed_at
                ? Math.floor((new Date(ticket.closed_at) - new Date(ticket.created_at)) / (1000 * 60 * 60 * 24))
                : Math.floor((new Date() - new Date(ticket.created_at)) / (1000 * 60 * 60 * 24));

            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.onclick = () => {
                // Ticket detay sayfasına git (yatırım alanı detay sayfasında ticket ID ile)
                window.location.href = `investment-area-detail.html?id=${area.id}&ticket=${ticket.id}`;
            };
            row.innerHTML = `
                <td>${channel?.name || '-'}</td>
                <td>${region?.name || '-'}</td>
                <td>${store?.name || '-'}</td>
                <td>${area?.name || '-'}</td>
                <td>#${ticket.id}</td>
                <td>${typeLabels[ticket.type] || ticket.type}</td>
                <td><span class="badge bg-${getStatusColor(ticket.status)}">${statusLabels[ticket.status] || ticket.status}</span></td>
                <td>${ticket.subject || '-'}</td>
                <td>${ticket.created_by_user?.name || '-'}</td>
                <td>${ticket.assigned_to_user?.name || 'Atanmamış'}</td>
                <td>${formatDate(ticket.created_at)}</td>
                <td>${ticket.closed_at ? formatDate(ticket.closed_at) : '-'}</td>
                <td>${daysOpen}</td>
                <td>${formatDate(ticket.updated_at)}</td>
            `;
            tbody.appendChild(row);
        });

        document.getElementById('report-count').textContent = `${reportData.length} kayıt`;

    } catch (error) {
        console.error('Rapor yükleme hatası:', error);
        document.getElementById('report-tbody').innerHTML = 
            '<tr><td colspan="14" class="text-center text-danger">Rapor yüklenirken hata oluştu</td></tr>';
        showAlert('Rapor yüklenirken hata oluştu', 'danger');
    }
}

// Filtreleri temizle
function clearFilters() {
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    document.getElementById('filter-channel').value = '';
    document.getElementById('filter-region').value = '';
    document.getElementById('filter-store').value = '';
    document.getElementById('filter-ticket-type').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-assigned').value = '';

    // Tarih aralığı varsayılan değerleri
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    document.getElementById('filter-date-from').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('filter-date-to').value = today.toISOString().split('T')[0];
}

// Excel export
async function exportToExcel() {
    try {
        if (reportData.length === 0) {
            showAlert('Önce raporu yükleyin', 'warning');
            return;
        }

        showAlert('Excel dosyası hazırlanıyor...', 'info');

        // Excel formatına çevir
        const headers = [
            'Kanal',
            'Bölge',
            'Mağaza',
            'Yatırım Alanı',
            'Ticket ID',
            'Ticket Tipi',
            'Durum',
            'Konu',
            'Oluşturan',
            'Sorumlu',
            'Açılış Tarihi',
            'Kapanış Tarihi',
            'Açık Kalma Süresi (Gün)',
            'Son Güncelleme'
        ];

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

        const rows = reportData.map(ticket => {
            const area = ticket.investment_areas;
            const store = area?.stores;
            const channel = store?.channels;
            const region = store?.regions;

            const daysOpen = ticket.closed_at
                ? Math.floor((new Date(ticket.closed_at) - new Date(ticket.created_at)) / (1000 * 60 * 60 * 24))
                : Math.floor((new Date() - new Date(ticket.created_at)) / (1000 * 60 * 60 * 24));

            return [
                channel?.name || '',
                region?.name || '',
                store?.name || '',
                area?.name || '',
                ticket.id,
                typeLabels[ticket.type] || ticket.type,
                statusLabels[ticket.status] || ticket.status,
                ticket.subject || '',
                ticket.created_by_user?.name || '',
                ticket.assigned_to_user?.name || 'Atanmamış',
                formatDate(ticket.created_at),
                ticket.closed_at ? formatDate(ticket.closed_at) : '',
                daysOpen,
                formatDate(ticket.updated_at)
            ];
        });

        // Worksheet oluştur
        const wsData = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Kolon genişliklerini ayarla
        const colWidths = headers.map(() => ({ wch: 20 }));
        ws['!cols'] = colWidths;

        // Workbook oluştur
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Yatırım Alanları Raporu');

        // Excel dosyasını indir
        const fileName = `yatirim-alanlari-raporu-${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        showAlert('Excel dosyası indirildi', 'success');

    } catch (error) {
        console.error('Excel export hatası:', error);
        showAlert('Excel dosyası oluşturulurken hata oluştu', 'danger');
    }
}

// Durum rengi
function getStatusColor(status) {
    const colors = {
        'open': 'danger',
        'in_progress': 'warning',
        'pending_approval': 'info',
        'completed': 'success',
        'cancelled': 'secondary'
    };
    return colors[status] || 'secondary';
}

