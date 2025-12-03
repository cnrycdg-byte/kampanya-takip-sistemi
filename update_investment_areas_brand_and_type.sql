-- Yatırım Alanları - Marka ve Tip Güncellemesi
-- Bu script investment_areas tablosuna brand alanı ekler ve type değerlerini günceller

-- 1. Brand (marka) kolonunu ekle
ALTER TABLE investment_areas 
ADD COLUMN IF NOT EXISTS brand VARCHAR(50) CHECK (brand IN ('philips', 'ugreen'));

-- 2. Type constraint'ini kaldır ve yeni değerlerle güncelle
-- Önce mevcut constraint'i kaldır
ALTER TABLE investment_areas 
DROP CONSTRAINT IF EXISTS investment_areas_type_check;

-- Yeni type değerleri ile constraint ekle
ALTER TABLE investment_areas 
ADD CONSTRAINT investment_areas_type_check 
CHECK (type IN ('ada_stand', 'duvar_standi', 'alinlik', 'reyon_giydirme', 'diger'));

-- 3. Mevcut verileri güncelle (eğer varsa)
-- Eski type değerlerini yeni değerlere çevir
UPDATE investment_areas 
SET type = CASE 
    WHEN type = 'stand' THEN 'ada_stand'
    WHEN type = 'corner' THEN 'ada_stand'
    WHEN type = 'gondol' THEN 'reyon_giydirme'
    WHEN type = 'vitrin' THEN 'reyon_giydirme'
    WHEN type = 'other' THEN 'diger'
    ELSE 'diger'
END
WHERE type IN ('stand', 'corner', 'gondol', 'vitrin', 'other');

-- 4. İndeks ekle (marka için)
CREATE INDEX IF NOT EXISTS idx_investment_areas_brand ON investment_areas(brand);

COMMENT ON COLUMN investment_areas.brand IS 'Yatırım alanı markası (Philips, Ugreen)';
COMMENT ON COLUMN investment_areas.type IS 'Yatırım alanı tipi (Ada Stand, Duvar Standı, Alınlık, Reyon Giydirme, Diğer)';

