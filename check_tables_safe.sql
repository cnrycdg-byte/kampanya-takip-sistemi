-- MEVCUT TABLOLARI KONTROL ETMEK İÇİN BU SCRIPTİ ÇALIŞTIRIN
-- Bu script sadece mevcut tabloları gösterir, hiçbir şey silmez

-- 1. Mevcut tabloları listele
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Her tablo için kayıt sayısını kontrol et (eğer tablo varsa)
DO $$
DECLARE
    tbl_name text;
    table_count integer;
BEGIN
    FOR tbl_name IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    LOOP
        EXECUTE format('SELECT count(*) FROM %I', tbl_name) INTO table_count;
        RAISE NOTICE 'Tablo: % - Kayıt sayısı: %', tbl_name, table_count;
    END LOOP;
END $$;
