-- Yatırım Alanları - Gondol Başı Tipi Ekleme
-- Bu script investment_areas tablosuna 'gondol_basi' tipini ekler

-- 1. Mevcut constraint'i kaldır
ALTER TABLE investment_areas 
DROP CONSTRAINT IF EXISTS investment_areas_type_check;

-- 2. Yeni type değerleri ile constraint ekle (gondol_basi dahil)
ALTER TABLE investment_areas 
ADD CONSTRAINT investment_areas_type_check 
CHECK (type IN ('ada_stand', 'duvar_standi', 'alinlik', 'reyon_giydirme', 'gondol_basi', 'diger'));

-- 3. Kontrol et
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'investment_areas'::regclass
AND conname = 'investment_areas_type_check';

COMMENT ON COLUMN investment_areas.type IS 'Yatırım alanı tipi (Ada Stand, Duvar Standı, Alınlık, Reyon Giydirme, Gondol Başı, Diğer)';

