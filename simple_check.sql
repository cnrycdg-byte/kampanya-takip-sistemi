-- EN BASİT KONTROL - HATA ALMAYACAK
-- Bu scripti çalıştırın

-- 1. Tüm tabloları listele
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
