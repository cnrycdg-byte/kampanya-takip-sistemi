-- MEVCUT VERİLERİNİZİ YEDEKLEMEK İÇİN BU SCRIPTİ ÇALIŞTIRIN
-- Bu script sadece mevcut verilerinizi gösterir, hiçbir şey silmez

-- 1. Mevcut bölgeleri göster
SELECT 'BÖLGELER' as tablo_adi, count(*) as kayit_sayisi FROM regions;
SELECT * FROM regions ORDER BY id;

-- 2. Mevcut kanalları göster  
SELECT 'KANALLAR' as tablo_adi, count(*) as kayit_sayisi FROM channels;
SELECT * FROM channels ORDER BY id;

-- 3. Mevcut kullanıcıları göster
SELECT 'KULLANICILAR' as tablo_adi, count(*) as kayit_sayisi FROM users;
SELECT * FROM users ORDER BY id;

-- 4. Mevcut mağazaları göster
SELECT 'MAĞAZALAR' as tablo_adi, count(*) as kayit_sayisi FROM stores;
SELECT * FROM stores ORDER BY id;

-- 5. Mevcut görevleri göster
SELECT 'GÖREVLER' as tablo_adi, count(*) as kayit_sayisi FROM tasks;
SELECT * FROM tasks ORDER BY id;

-- 6. Mevcut görev yanıtlarını göster
SELECT 'GÖREV YANITLARI' as tablo_adi, count(*) as kayit_sayisi FROM task_responses;
SELECT * FROM task_responses ORDER BY id;

-- 7. Oyun planları kaldırıldı
