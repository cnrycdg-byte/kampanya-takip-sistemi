-- ============================================================
-- KAMPANYA TAKİP SİSTEMİ - MASTER SETUP SCRIPT
-- ============================================================
-- Bu script tüm gerekli veritabanı güncellemelerini yapar
-- Supabase SQL Editor'da tek seferde çalıştırılabilir
-- ============================================================

-- ⚠️ ÖNEMLİ: Bu scripti çalıştırmadan önce veritabanı yedeği alın!

-- ============================================================
-- 1. YATIRIM ALANLARI SİSTEMİ - TEMEL TABLOLAR
-- ============================================================

-- 1.1. Yatırım Alanları Tablosu
CREATE TABLE IF NOT EXISTS investment_areas (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('stand', 'corner', 'gondol', 'vitrin', 'other')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('planned', 'active', 'removed')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id)
);

-- 1.2. Yatırım Alanı Ticket'ları Tablosu
CREATE TABLE IF NOT EXISTS investment_tickets (
    id SERIAL PRIMARY KEY,
    investment_area_id INTEGER NOT NULL REFERENCES investment_areas(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('new_stand', 'revision', 'correction')),
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending_approval', 'completed', 'cancelled')),
    created_by INTEGER NOT NULL REFERENCES users(id),
    assigned_to INTEGER REFERENCES users(id),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    estimated_close_date TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.3. Ticket Yorumları Tablosu
CREATE TABLE IF NOT EXISTS investment_ticket_comments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES investment_tickets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    comment TEXT NOT NULL,
    is_system_message BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.4. Yatırım Alanı Fotoğrafları Tablosu
CREATE TABLE IF NOT EXISTS investment_photos (
    id SERIAL PRIMARY KEY,
    investment_area_id INTEGER NOT NULL REFERENCES investment_areas(id) ON DELETE CASCADE,
    ticket_id INTEGER REFERENCES investment_tickets(id) ON DELETE SET NULL,
    photo_url TEXT NOT NULL,
    source VARCHAR(50) NOT NULL CHECK (source IN ('weekly_check', 'ticket', 'before', 'after')),
    note TEXT,
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.5. Ticket Durum Geçmişi (Timeline için)
CREATE TABLE IF NOT EXISTS investment_ticket_status_history (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES investment_tickets(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. YATIRIM ALANLARI - MARKA VE TİP GÜNCELLEMELERİ
-- ============================================================

-- 2.1. Brand (marka) kolonu ekle
ALTER TABLE investment_areas 
ADD COLUMN IF NOT EXISTS brand VARCHAR(50) CHECK (brand IN ('philips', 'ugreen'));

-- 2.2. Type constraint'ini güncelle (gondol_basi dahil)
ALTER TABLE investment_areas 
DROP CONSTRAINT IF EXISTS investment_areas_type_check;

ALTER TABLE investment_areas 
ADD CONSTRAINT investment_areas_type_check 
CHECK (type IN ('ada_stand', 'duvar_standi', 'alinlik', 'reyon_giydirme', 'gondol_basi', 'diger'));

-- 2.3. Mevcut verileri güncelle (eğer varsa)
UPDATE investment_areas 
SET type = CASE 
    WHEN type = 'stand' THEN 'ada_stand'
    WHEN type = 'corner' THEN 'ada_stand'
    WHEN type = 'gondol' THEN 'gondol_basi'
    WHEN type = 'vitrin' THEN 'reyon_giydirme'
    WHEN type = 'other' THEN 'diger'
    ELSE 'diger'
END
WHERE type IN ('stand', 'corner', 'gondol', 'vitrin', 'other');

-- ============================================================
-- 3. YATIRIM ALANLARI - KURULUM TARİHİ VE KİRALAMA BEDELİ
-- ============================================================

-- 3.1. Kurulum tarihi kolonu
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'investment_areas' AND column_name = 'installation_date') THEN
        ALTER TABLE investment_areas ADD COLUMN installation_date DATE;
        COMMENT ON COLUMN investment_areas.installation_date IS 'Yatırım alanının kurulum tarihi';
    END IF;
END $$;

-- 3.2. Kiralama bedeli kolonu
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'investment_areas' AND column_name = 'rental_fee') THEN
        ALTER TABLE investment_areas ADD COLUMN rental_fee DECIMAL(10, 2);
        COMMENT ON COLUMN investment_areas.rental_fee IS 'Yatırım alanının aylık kiralama bedeli';
    END IF;
END $$;

-- ============================================================
-- 4. YATIRIM ALANLARI - KİRALAMA TARİHLERİ
-- ============================================================

-- 4.1. Kiralama başlangıç tarihi
ALTER TABLE investment_areas 
ADD COLUMN IF NOT EXISTS rental_start_date DATE;

-- 4.2. Kiralama bitiş tarihi
ALTER TABLE investment_areas 
ADD COLUMN IF NOT EXISTS rental_end_date DATE;

-- 4.3. Süresi belli değil flag'i
ALTER TABLE investment_areas 
ADD COLUMN IF NOT EXISTS rental_indefinite BOOLEAN DEFAULT false;

-- 4.4. Yorumlar
COMMENT ON COLUMN investment_areas.rental_start_date IS 'Kiralama başlangıç tarihi';
COMMENT ON COLUMN investment_areas.rental_end_date IS 'Kiralama bitiş tarihi (null ise süresi belli değil)';
COMMENT ON COLUMN investment_areas.rental_indefinite IS 'Kiralama süresi belli değil mi?';

-- ============================================================
-- 5. YATIRIM ALANLARI - PLANLANAN ÜRÜNLER VE HAFTALIK TAKİP
-- ============================================================

-- 5.1. Planlanan Ürünler Tablosu
CREATE TABLE IF NOT EXISTS investment_area_products (
    id SERIAL PRIMARY KEY,
    investment_area_id INTEGER NOT NULL REFERENCES investment_areas(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5.2. Haftalık Fotoğraf Yükleme Takibi
CREATE TABLE IF NOT EXISTS investment_weekly_photos (
    id SERIAL PRIMARY KEY,
    investment_area_id INTEGER NOT NULL REFERENCES investment_areas(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(investment_area_id, week_number, year)
);

-- 5.3. Haftalık Ürün Kontrolü
CREATE TABLE IF NOT EXISTS investment_weekly_product_checks (
    id SERIAL PRIMARY KEY,
    investment_area_id INTEGER NOT NULL REFERENCES investment_areas(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES investment_area_products(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    reason TEXT,
    checked_by INTEGER NOT NULL REFERENCES users(id),
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(investment_area_id, product_id, week_number, year)
);

-- 5.4. investment_photos tablosuna weekly_photo_id kolonu
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'investment_photos' AND column_name = 'weekly_photo_id') THEN
        ALTER TABLE investment_photos ADD COLUMN weekly_photo_id INTEGER REFERENCES investment_weekly_photos(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_investment_photos_weekly ON investment_photos(weekly_photo_id);
    END IF;
END $$;

-- ============================================================
-- 6. YATIRIM ALANLARI - TICKET YORUMLARI VE FOTOĞRAFLAR
-- ============================================================

-- 6.1. investment_ticket_comments tablosuna assigned_to kolonu
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'investment_ticket_comments' AND column_name = 'assigned_to') THEN
        ALTER TABLE investment_ticket_comments ADD COLUMN assigned_to INTEGER REFERENCES users(id);
        COMMENT ON COLUMN investment_ticket_comments.assigned_to IS 'Yorum ile birlikte ticket atanan kullanıcı';
    END IF;
END $$;

-- 6.2. investment_photos tablosuna comment_id kolonu
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'investment_photos' AND column_name = 'comment_id') THEN
        ALTER TABLE investment_photos ADD COLUMN comment_id INTEGER REFERENCES investment_ticket_comments(id) ON DELETE SET NULL;
        COMMENT ON COLUMN investment_photos.comment_id IS 'Yorum ile ilişkili fotoğraf';
        CREATE INDEX IF NOT EXISTS idx_investment_photos_comment ON investment_photos(comment_id);
    END IF;
END $$;

-- ============================================================
-- 7. MAĞAZALAR - PERSONEL DURUMU
-- ============================================================

-- 7.1. has_personnel kolonu ekle
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS has_personnel BOOLEAN DEFAULT TRUE;

-- 7.2. Yorum ekle
COMMENT ON COLUMN stores.has_personnel IS 'Mağazada personel bulunup bulunmadığı (true: personelli, false: personelsiz)';

-- ============================================================
-- 8. KULLANICILAR - PAZARLAMA ROLÜ
-- ============================================================

-- 8.1. Önce mevcut kullanıcıların rollerini kontrol et
-- (Eğer account_manager gibi geçersiz roller varsa, önce onları düzeltin)
-- UPDATE users SET role = 'manager' WHERE role = 'account_manager';

-- 8.2. Mevcut CHECK constraint'i kaldır
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check CASCADE;

-- 8.3. Yeni CHECK constraint ekle (marketing rolü dahil)
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'employee', 'marketing'));

-- ============================================================
-- 9. İNDEKSLER
-- ============================================================

-- Investment Areas
CREATE INDEX IF NOT EXISTS idx_investment_areas_store ON investment_areas(store_id);
CREATE INDEX IF NOT EXISTS idx_investment_areas_status ON investment_areas(status);
CREATE INDEX IF NOT EXISTS idx_investment_areas_brand ON investment_areas(brand);
CREATE INDEX IF NOT EXISTS idx_investment_areas_rental_start_date ON investment_areas(rental_start_date);
CREATE INDEX IF NOT EXISTS idx_investment_areas_rental_end_date ON investment_areas(rental_end_date);

-- Investment Tickets
CREATE INDEX IF NOT EXISTS idx_investment_tickets_area ON investment_tickets(investment_area_id);
CREATE INDEX IF NOT EXISTS idx_investment_tickets_status ON investment_tickets(status);
CREATE INDEX IF NOT EXISTS idx_investment_tickets_type ON investment_tickets(type);

-- Investment Ticket Comments
CREATE INDEX IF NOT EXISTS idx_investment_ticket_comments_ticket ON investment_ticket_comments(ticket_id);

-- Investment Photos
CREATE INDEX IF NOT EXISTS idx_investment_photos_area ON investment_photos(investment_area_id);
CREATE INDEX IF NOT EXISTS idx_investment_photos_ticket ON investment_photos(ticket_id);
CREATE INDEX IF NOT EXISTS idx_investment_photos_source ON investment_photos(source);
CREATE INDEX IF NOT EXISTS idx_investment_photos_created ON investment_photos(created_at);

-- Investment Area Products
CREATE INDEX IF NOT EXISTS idx_investment_area_products_area ON investment_area_products(investment_area_id);

-- Investment Weekly Photos
CREATE INDEX IF NOT EXISTS idx_investment_weekly_photos_area ON investment_weekly_photos(investment_area_id);
CREATE INDEX IF NOT EXISTS idx_investment_weekly_photos_week ON investment_weekly_photos(week_number, year);

-- Investment Weekly Product Checks
CREATE INDEX IF NOT EXISTS idx_investment_weekly_product_checks_area ON investment_weekly_product_checks(investment_area_id);
CREATE INDEX IF NOT EXISTS idx_investment_weekly_product_checks_week ON investment_weekly_product_checks(week_number, year);
CREATE INDEX IF NOT EXISTS idx_investment_weekly_product_checks_product ON investment_weekly_product_checks(product_id);

-- Stores
CREATE INDEX IF NOT EXISTS idx_stores_has_personnel ON stores(has_personnel);

-- ============================================================
-- 10. TRİGGER'LAR
-- ============================================================

-- 10.1. updated_at otomatik güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10.2. investment_areas için trigger
DROP TRIGGER IF EXISTS update_investment_areas_updated_at ON investment_areas;
CREATE TRIGGER update_investment_areas_updated_at BEFORE UPDATE ON investment_areas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10.3. investment_tickets için trigger
DROP TRIGGER IF EXISTS update_investment_tickets_updated_at ON investment_tickets;
CREATE TRIGGER update_investment_tickets_updated_at BEFORE UPDATE ON investment_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10.4. investment_area_products için trigger
DROP TRIGGER IF EXISTS update_investment_area_products_updated_at ON investment_area_products;
CREATE TRIGGER update_investment_area_products_updated_at BEFORE UPDATE ON investment_area_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10.5. Ticket durum değişikliğinde geçmiş kaydı
CREATE OR REPLACE FUNCTION log_ticket_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO investment_ticket_status_history (ticket_id, old_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, COALESCE(NEW.assigned_to, NEW.created_by));
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS log_ticket_status_change_trigger ON investment_tickets;
CREATE TRIGGER log_ticket_status_change_trigger
    AFTER UPDATE ON investment_tickets
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION log_ticket_status_change();

-- ============================================================
-- 11. RLS POLİTİKALARI (Geçici olarak devre dışı)
-- ============================================================

ALTER TABLE investment_areas DISABLE ROW LEVEL SECURITY;
ALTER TABLE investment_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE investment_ticket_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE investment_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE investment_ticket_status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE investment_area_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE investment_weekly_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE investment_weekly_product_checks DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 12. YORUMLAR
-- ============================================================

COMMENT ON TABLE investment_areas IS 'Mağaza yatırım alanları (stand, corner, gondol vb.)';
COMMENT ON TABLE investment_tickets IS 'Yatırım alanı ticket''ları (yeni stand, revizyon, düzeltme)';
COMMENT ON TABLE investment_ticket_comments IS 'Ticket yorumları ve mesajlaşma';
COMMENT ON TABLE investment_photos IS 'Yatırım alanı fotoğrafları (haftalık kontrol, ticket fotoğrafları)';
COMMENT ON TABLE investment_ticket_status_history IS 'Ticket durum değişiklik geçmişi (timeline için)';
COMMENT ON TABLE investment_area_products IS 'Yatırım alanlarında planlanan ürünler listesi';
COMMENT ON TABLE investment_weekly_photos IS 'Haftalık fotoğraf yükleme takibi';
COMMENT ON TABLE investment_weekly_product_checks IS 'Haftalık ürün kontrolü (var/yok)';

-- ============================================================
-- 13. BAŞARI MESAJI
-- ============================================================

SELECT '✅ Tüm veritabanı güncellemeleri başarıyla tamamlandı!' AS result;

