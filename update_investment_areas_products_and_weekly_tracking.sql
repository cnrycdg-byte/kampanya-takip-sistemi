-- Yatırım Alanları - Planlanan Ürünler ve Haftalık Takip Sistemi
-- Bu script planlanan ürünler, haftalık fotoğraf takibi ve ürün kontrolü için gerekli tabloları oluşturur

-- 1. Planlanan Ürünler Tablosu (Yatırım alanı başına birden fazla ürün olabilir)
CREATE TABLE IF NOT EXISTS investment_area_products (
    id SERIAL PRIMARY KEY,
    investment_area_id INTEGER NOT NULL REFERENCES investment_areas(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Haftalık Fotoğraf Yükleme Takibi
CREATE TABLE IF NOT EXISTS investment_weekly_photos (
    id SERIAL PRIMARY KEY,
    investment_area_id INTEGER NOT NULL REFERENCES investment_areas(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL, -- ISO hafta numarası (1-53)
    year INTEGER NOT NULL,
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(investment_area_id, week_number, year) -- Her hafta için bir kayıt
);

-- 3. Haftalık Ürün Kontrolü (Employee'nin ürün var/yok kontrolü)
CREATE TABLE IF NOT EXISTS investment_weekly_product_checks (
    id SERIAL PRIMARY KEY,
    investment_area_id INTEGER NOT NULL REFERENCES investment_areas(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES investment_area_products(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true, -- var = true, yok = false
    reason TEXT, -- Yok ise neden
    checked_by INTEGER NOT NULL REFERENCES users(id),
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(investment_area_id, product_id, week_number, year) -- Her ürün için haftalık bir kontrol
);

-- 4. Haftalık Fotoğrafları investment_photos tablosuna bağlama
-- investment_photos tablosuna weekly_photo_id kolonu ekle (eğer yoksa)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'investment_photos' AND column_name = 'weekly_photo_id') THEN
        ALTER TABLE investment_photos ADD COLUMN weekly_photo_id INTEGER REFERENCES investment_weekly_photos(id) ON DELETE SET NULL;
        COMMENT ON COLUMN investment_photos.weekly_photo_id IS 'Haftalık fotoğraf yükleme kaydına bağlı fotoğraf';
        CREATE INDEX IF NOT EXISTS idx_investment_photos_weekly ON investment_photos(weekly_photo_id);
        RAISE NOTICE 'investment_photos tablosuna "weekly_photo_id" kolonu eklendi.';
    ELSE
        RAISE NOTICE 'investment_photos tablosunda "weekly_photo_id" kolonu zaten mevcut.';
    END IF;
END $$;

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_investment_area_products_area ON investment_area_products(investment_area_id);
CREATE INDEX IF NOT EXISTS idx_investment_weekly_photos_area ON investment_weekly_photos(investment_area_id);
CREATE INDEX IF NOT EXISTS idx_investment_weekly_photos_week ON investment_weekly_photos(week_number, year);
CREATE INDEX IF NOT EXISTS idx_investment_weekly_product_checks_area ON investment_weekly_product_checks(investment_area_id);
CREATE INDEX IF NOT EXISTS idx_investment_weekly_product_checks_week ON investment_weekly_product_checks(week_number, year);
CREATE INDEX IF NOT EXISTS idx_investment_weekly_product_checks_product ON investment_weekly_product_checks(product_id);

-- Trigger: updated_at otomatik güncelleme
CREATE TRIGGER update_investment_area_products_updated_at BEFORE UPDATE ON investment_area_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Politikaları (Geçici olarak devre dışı)
ALTER TABLE investment_area_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE investment_weekly_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE investment_weekly_product_checks DISABLE ROW LEVEL SECURITY;

-- Yorumlar
COMMENT ON TABLE investment_area_products IS 'Yatırım alanlarında planlanan ürünler listesi';
COMMENT ON TABLE investment_weekly_photos IS 'Haftalık fotoğraf yükleme takibi';
COMMENT ON TABLE investment_weekly_product_checks IS 'Haftalık ürün kontrolü (var/yok)';

