-- MEVCUT VERİLERİNİZİ KONTROL EDİN
-- Bu script mevcut verilerinizi gösterir, hiçbir şey silmez

-- 1. Bölgeler
SELECT 'BÖLGELER' as tablo_adi, count(*) as kayit_sayisi FROM regions;
SELECT * FROM regions ORDER BY id;

-- 2. Kanallar
SELECT 'KANALLAR' as tablo_adi, count(*) as kayit_sayisi FROM channels;
SELECT * FROM channels ORDER BY id;

-- 3. Kullanıcılar
SELECT 'KULLANICILAR' as tablo_adi, count(*) as kayit_sayisi FROM users;
SELECT * FROM users ORDER BY id;

-- 4. Mağazalar
SELECT 'MAĞAZALAR' as tablo_adi, count(*) as kayit_sayisi FROM stores;
SELECT * FROM stores ORDER BY id;

-- 5. Görevler
SELECT 'GÖREVLER' as tablo_adi, count(*) as kayit_sayisi FROM tasks;
SELECT * FROM tasks ORDER BY id;

-- 6. Oyun Planları kaldırıldı

-- 7. Görev Atamaları
SELECT 'GÖREV ATAMALARI' as tablo_adi, count(*) as kayit_sayisi FROM task_assignments;
SELECT * FROM task_assignments ORDER BY id;

-- 8. Görev Kategorileri
SELECT 'GÖREV KATEGORİLERİ' as tablo_adi, count(*) as kayit_sayisi FROM task_categories;
SELECT * FROM task_categories ORDER BY id;
