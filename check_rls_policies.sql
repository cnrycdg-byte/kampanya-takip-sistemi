-- RLS POLİTİKALARINI KONTROL EDİN
-- Bu script mevcut RLS politikalarını gösterir

-- 1. RLS durumunu kontrol et
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_aktif
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. Mevcut RLS politikalarını listele
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
