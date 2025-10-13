-- ============================================
-- STORES TABLOSU YAPISINI KONTROL ET
-- ============================================

-- 1. Stores tablosu kolonlarını listele
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'stores' 
ORDER BY ordinal_position;

-- 2. Stores tablosundan örnek veri çek (ilk 5 satır)
SELECT * FROM stores LIMIT 5;

-- 3. Channels tablosu kolonlarını listele
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'channels' 
ORDER BY ordinal_position;

-- 4. Channels tablosundan örnek veri çek
SELECT * FROM channels LIMIT 5;

-- ============================================
-- Bu sonuçları bana gönderin, view'ları düzeltelim!
-- ============================================

