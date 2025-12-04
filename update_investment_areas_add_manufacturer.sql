-- Yatırım Alanları - Üretici Bilgisi Ekleme
-- Bu script investment_areas tablosuna 'manufacturer' kolonu ekler

-- 1. manufacturer kolonunu ekle
ALTER TABLE investment_areas 
ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255);

-- 2. İndeks ekle (opsiyonel - arama için)
CREATE INDEX IF NOT EXISTS idx_investment_areas_manufacturer ON investment_areas(manufacturer);

-- 3. Yorum ekle
COMMENT ON COLUMN investment_areas.manufacturer IS 'Yatırım alanının üretici bilgisi';

-- 4. Başarı mesajı
SELECT 'investment_areas tablosuna manufacturer kolonu başarıyla eklendi.' AS result;

