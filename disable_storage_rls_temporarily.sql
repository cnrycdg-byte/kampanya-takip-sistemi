-- ============================================
-- GEÇİCİ ÇÖZÜM: STORAGE RLS'Yİ KAPAT (SADECE TEST İÇİN)
-- ============================================

-- UYARI: Bu sadece test amaçlıdır!
-- Production ortamında RLS açık olmalıdır.

-- 1. storage.objects tablosunda RLS'yi kapat
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- 2. Kontrol et
SELECT 
    schemaname, 
    tablename, 
    rowsecurity
FROM pg_tables
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- Beklenen sonuç: rowsecurity = false

-- ============================================
-- RLS KAPATILDI!
-- Artık herkes storage'a yazabilir.
-- Test tamamlandıktan sonra RLS'yi tekrar açalım.
-- ============================================

