-- Yatırım Alanları Sistemi - Veritabanı Şeması
-- Bu script Supabase'de yatırım alanları modülü için gerekli tabloları oluşturur

-- 1. Yatırım Alanları Tablosu
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

-- 2. Yatırım Alanı Ticket'ları Tablosu
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

-- 3. Ticket Yorumları Tablosu
CREATE TABLE IF NOT EXISTS investment_ticket_comments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES investment_tickets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    comment TEXT NOT NULL,
    is_system_message BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Yatırım Alanı Fotoğrafları Tablosu
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

-- 5. Ticket Durum Geçmişi (Timeline için)
CREATE TABLE IF NOT EXISTS investment_ticket_status_history (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES investment_tickets(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_investment_areas_store ON investment_areas(store_id);
CREATE INDEX IF NOT EXISTS idx_investment_areas_status ON investment_areas(status);
CREATE INDEX IF NOT EXISTS idx_investment_tickets_area ON investment_tickets(investment_area_id);
CREATE INDEX IF NOT EXISTS idx_investment_tickets_status ON investment_tickets(status);
CREATE INDEX IF NOT EXISTS idx_investment_tickets_type ON investment_tickets(type);
CREATE INDEX IF NOT EXISTS idx_investment_ticket_comments_ticket ON investment_ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_investment_photos_area ON investment_photos(investment_area_id);
CREATE INDEX IF NOT EXISTS idx_investment_photos_ticket ON investment_photos(ticket_id);
CREATE INDEX IF NOT EXISTS idx_investment_photos_source ON investment_photos(source);
CREATE INDEX IF NOT EXISTS idx_investment_photos_created ON investment_photos(created_at);

-- Trigger: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_investment_areas_updated_at BEFORE UPDATE ON investment_areas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investment_tickets_updated_at BEFORE UPDATE ON investment_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Ticket durum değişikliğinde geçmiş kaydı
CREATE OR REPLACE FUNCTION log_ticket_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO investment_ticket_status_history (ticket_id, old_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.assigned_to);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_ticket_status_change_trigger
    AFTER UPDATE ON investment_tickets
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION log_ticket_status_change();

-- RLS Politikaları (Geçici olarak devre dışı - gerekirse sonra eklenebilir)
ALTER TABLE investment_areas DISABLE ROW LEVEL SECURITY;
ALTER TABLE investment_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE investment_ticket_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE investment_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE investment_ticket_status_history DISABLE ROW LEVEL SECURITY;

-- Örnek veri ekleme (opsiyonel - test için)
-- INSERT INTO investment_areas (store_id, name, type, status, description) 
-- SELECT s.id, 'Stand 1', 'stand', 'active', 'Ana giriş standı'
-- FROM stores s LIMIT 1;

COMMENT ON TABLE investment_areas IS 'Mağaza yatırım alanları (stand, corner, gondol vb.)';
COMMENT ON TABLE investment_tickets IS 'Yatırım alanı ticket''ları (yeni stand, revizyon, düzeltme)';
COMMENT ON TABLE investment_ticket_comments IS 'Ticket yorumları ve mesajlaşma';
COMMENT ON TABLE investment_photos IS 'Yatırım alanı fotoğrafları (haftalık kontrol, ticket fotoğrafları)';
COMMENT ON TABLE investment_ticket_status_history IS 'Ticket durum değişiklik geçmişi (timeline için)';

