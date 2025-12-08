-- ============================================
-- SURVEYS PERSONNEL_STATUS CONSTRAINT DÜZELT
-- ============================================
-- Bu script mevcut personnel_status constraint'ini düzeltir
-- HTML formundaki değerlerle uyumlu hale getirir
-- ============================================

-- 1. Mevcut constraint'i kaldır
ALTER TABLE surveys DROP CONSTRAINT IF EXISTS surveys_personnel_status_check;

-- 2. Doğru constraint'i ekle
-- HTML formundaki değerler: 'has_personnel', 'no_personnel'
ALTER TABLE surveys 
ADD CONSTRAINT surveys_personnel_status_check 
CHECK (personnel_status IS NULL OR personnel_status IN ('has_personnel', 'no_personnel'));

-- 3. Kontrol sorgusu
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'surveys'::regclass 
AND conname = 'surveys_personnel_status_check';

-- 4. Mevcut değerleri kontrol et (eğer yanlış değerler varsa)
SELECT 
    id,
    title,
    assignment_type,
    personnel_status
FROM surveys
WHERE personnel_status IS NOT NULL
AND personnel_status NOT IN ('has_personnel', 'no_personnel');

-- ============================================
-- BAŞARILI! ✅
-- ============================================
-- personnel_status constraint'i düzeltildi.
-- Artık 'has_personnel' ve 'no_personnel' değerleri kabul edilecek.
-- ============================================

