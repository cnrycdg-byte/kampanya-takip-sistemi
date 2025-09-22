-- Kampanya Takip Sistemi - Kapsamlı Veritabanı Düzeltme Scripti
-- Bu script Supabase veritabanındaki RLS politikalarını ve tablo yapılarını düzeltir

-- 1. RLS'yi geçici olarak devre dışı bırak (sadece admin kullanıcısı için)
-- DİKKAT: Bu işlemler sadece admin kullanıcısı tarafından çalıştırılmalıdır

-- 2. Eksik tabloları oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS regions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    manager_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'employee')),
    region_id INTEGER REFERENCES regions(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    channel_id INTEGER REFERENCES channels(id),
    region_id INTEGER REFERENCES regions(id),
    manager_id INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    channel_id INTEGER REFERENCES channels(id),
    store_ids INTEGER[],
    response_type TEXT[], -- ['text', 'photo']
    photo_limit INTEGER DEFAULT 5,
    example_photo_url TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS task_responses (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    store_id INTEGER REFERENCES stores(id),
    response_text TEXT,
    photo_urls TEXT[],
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game plans table removed

-- 3. RLS politikalarını kaldır (geçici olarak)
ALTER TABLE regions DISABLE ROW LEVEL SECURITY;
ALTER TABLE channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_responses DISABLE ROW LEVEL SECURITY;

-- 4. Örnek veriler ekle
INSERT INTO regions (name, description, manager_name, status) VALUES
('İstanbul', 'İstanbul bölgesi', 'Ahmet Yılmaz', 'active'),
('Ankara', 'Ankara bölgesi', 'Mehmet Kaya', 'active'),
('İzmir', 'İzmir bölgesi', 'Ayşe Demir', 'active'),
('Bursa', 'Bursa bölgesi', 'Fatma Öz', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO channels (name, description, status) VALUES
('Migros', 'Migros kanalı', 'active'),
('Carrefour', 'Carrefour kanalı', 'active'),
('A101', 'A101 kanalı', 'active'),
('BIM', 'BIM kanalı', 'active'),
('Şok', 'Şok kanalı', 'active')
ON CONFLICT (id) DO NOTHING;

-- Admin kullanıcısı ekle
INSERT INTO users (name, email, password, role, region_id, is_active) VALUES
('Admin User', 'admin@kampanya.com', 'admin123', 'admin', 1, true),
('Test Manager', 'manager@kampanya.com', 'manager123', 'manager', 1, true),
('Test Employee', 'employee@kampanya.com', 'employee123', 'employee', 1, true)
ON CONFLICT (email) DO NOTHING;

-- Örnek mağazalar ekle
INSERT INTO stores (name, channel_id, region_id, manager_id, status) VALUES
('Migros Kadıköy', 1, 1, 2, 'active'),
('Migros Beşiktaş', 1, 1, 2, 'active'),
('Carrefour Ataşehir', 2, 1, 2, 'active'),
('A101 Ankara Merkez', 3, 2, 2, 'active'),
('BIM İzmir Konak', 4, 3, 2, 'active')
ON CONFLICT (id) DO NOTHING;

-- Örnek görevler ekle
INSERT INTO tasks (title, description, category, start_date, end_date, channel_id, store_ids, response_type, photo_limit, status, created_by) VALUES
('Reyon Düzenleme', 'Migros mağazalarında reyon düzenleme görevi', 'reyon', NOW(), NOW() + INTERVAL '7 days', 1, ARRAY[1,2], ARRAY['text', 'photo'], 3, 'active', 1),
('Kampanya Kontrolü', 'Carrefour mağazalarında kampanya kontrolü', 'kampanya', NOW(), NOW() + INTERVAL '5 days', 2, ARRAY[3], ARRAY['photo'], 5, 'active', 1),
('Sepet Analizi', 'A101 mağazalarında sepet analizi', 'sepet', NOW(), NOW() + INTERVAL '3 days', 3, ARRAY[4], ARRAY['text'], 0, 'active', 1)
ON CONFLICT (id) DO NOTHING;

-- 5. RLS'yi yeniden etkinleştir (basit politikalar ile)
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_responses ENABLE ROW LEVEL SECURITY;

-- 6. Basit RLS politikaları oluştur (herkese okuma/yazma izni)
CREATE POLICY "Enable all operations for all users" ON regions FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON channels FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON users FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON stores FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON tasks FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON task_responses FOR ALL USING (true);

-- 7. Index'ler oluştur (performans için)
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_channel_id ON tasks(channel_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_stores_channel_id ON stores(channel_id);
CREATE INDEX IF NOT EXISTS idx_stores_region_id ON stores(region_id);
CREATE INDEX IF NOT EXISTS idx_task_responses_task_id ON task_responses(task_id);
CREATE INDEX IF NOT EXISTS idx_task_responses_user_id ON task_responses(user_id);

-- 8. Trigger'lar oluştur (updated_at otomatik güncelleme için)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON regions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_responses_updated_at BEFORE UPDATE ON task_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Veritabanı durumunu kontrol et
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
