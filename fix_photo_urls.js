// Fotoğraf URL'lerini düzelten script
// Bu script, veritabanındaki yanlış path'li fotoğraf URL'lerini düzeltir

async function fixPhotoUrls() {
    try {
        console.log('Fotoğraf URL\'leri düzeltiliyor...');
        
        // Tüm task_assignments'ları al
        const { data: assignments, error } = await supabase
            .from('task_assignments')
            .select('id, photo_urls')
            .not('photo_urls', 'is', null);
        
        if (error) {
            console.error('Veri çekme hatası:', error);
            return;
        }
        
        console.log(`${assignments.length} atama bulundu`);
        
        let fixedCount = 0;
        
        for (const assignment of assignments) {
            if (assignment.photo_urls && Array.isArray(assignment.photo_urls)) {
                const fixedUrls = assignment.photo_urls.map(url => {
                    // Eğer URL'de çift task-photos/ varsa düzelt
                    if (url.includes('/task-photos/task-photos/')) {
                        return url.replace('/task-photos/task-photos/', '/task-photos/');
                    }
                    return url;
                });
                
                // Eğer URL'ler değiştiyse güncelle
                if (JSON.stringify(fixedUrls) !== JSON.stringify(assignment.photo_urls)) {
                    const { error: updateError } = await supabase
                        .from('task_assignments')
                        .update({ photo_urls: fixedUrls })
                        .eq('id', assignment.id);
                    
                    if (updateError) {
                        console.error(`Assignment ${assignment.id} güncellenemedi:`, updateError);
                    } else {
                        console.log(`Assignment ${assignment.id} düzeltildi`);
                        fixedCount++;
                    }
                }
            }
        }
        
        console.log(`${fixedCount} fotoğraf URL'si düzeltildi`);
        alert(`✅ ${fixedCount} fotoğraf URL'si düzeltildi!`);
        
    } catch (error) {
        console.error('URL düzeltme hatası:', error);
        alert('❌ URL düzeltme hatası: ' + error.message);
    }
}

// Script'i çalıştır
if (typeof window !== 'undefined' && window.supabase) {
    fixPhotoUrls();
} else {
    console.log('Supabase yüklenmedi, sayfa yeniden yükleniyor...');
    window.addEventListener('load', () => {
        setTimeout(fixPhotoUrls, 2000);
    });
}
