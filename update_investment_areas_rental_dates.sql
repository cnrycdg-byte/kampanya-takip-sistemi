-- Yatırım Alanları - Kiralama Tarihleri Ekleme
-- Bu script investment_areas tablosuna kiralama başlangıç ve bitiş tarihi alanları ekler

-- 1. Kiralama başlangıç tarihi kolonunu ekle
ALTER TABLE investment_areas 
ADD COLUMN IF NOT EXISTS rental_start_date DATE;

-- 2. Kiralama bitiş tarihi kolonunu ekle
ALTER TABLE investment_areas 
ADD COLUMN IF NOT EXISTS rental_end_date DATE;

-- 3. Süresi belli değil flag'i ekle
ALTER TABLE investment_areas 
ADD COLUMN IF NOT EXISTS rental_indefinite BOOLEAN DEFAULT false;

-- 4. İndeks ekle
CREATE INDEX IF NOT EXISTS idx_investment_areas_rental_start_date ON investment_areas(rental_start_date);
CREATE INDEX IF NOT EXISTS idx_investment_areas_rental_end_date ON investment_areas(rental_end_date);

-- 5. Yorum ekle
COMMENT ON COLUMN investment_areas.rental_start_date IS 'Kiralama başlangıç tarihi';
COMMENT ON COLUMN investment_areas.rental_end_date IS 'Kiralama bitiş tarihi (null ise süresi belli değil)';
COMMENT ON COLUMN investment_areas.rental_indefinite IS 'Kiralama süresi belli değil mi?';

