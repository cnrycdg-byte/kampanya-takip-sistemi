-- BASİT TABLO KONTROLÜ - HATA ALMAYACAK
-- Bu scripti çalıştırın

-- 1. Mevcut tabloları listele
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Her tablo için ayrı ayrı kontrol et
-- Bölgeler tablosu var mı?
SELECT 'BÖLGELER' as tablo_adi, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'regions' AND table_schema = 'public') 
            THEN 'VAR' 
            ELSE 'YOK' 
       END as durum;

-- Kanallar tablosu var mı?
SELECT 'KANALLAR' as tablo_adi, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'channels' AND table_schema = 'public') 
            THEN 'VAR' 
            ELSE 'YOK' 
       END as durum;

-- Kullanıcılar tablosu var mı?
SELECT 'KULLANICILAR' as tablo_adi, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') 
            THEN 'VAR' 
            ELSE 'YOK' 
       END as durum;

-- Mağazalar tablosu var mı?
SELECT 'MAĞAZALAR' as tablo_adi, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores' AND table_schema = 'public') 
            THEN 'VAR' 
            ELSE 'YOK' 
       END as durum;

-- Görevler tablosu var mı?
SELECT 'GÖREVLER' as tablo_adi, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks' AND table_schema = 'public') 
            THEN 'VAR' 
            ELSE 'YOK' 
       END as durum;
