-- GÜVENLİ RLS DÜZELTME SCRIPTİ - VERİLERİNİZİ SİLMEZ
-- Bu script sadece RLS politikalarını düzeltir, mevcut verilerinizi korur

-- 1. Mevcut RLS politikalarını kaldır (veriler etkilenmez)
DROP POLICY IF EXISTS "Enable all operations for all users" ON regions;
DROP POLICY IF EXISTS "Enable all operations for all users" ON channels;
DROP POLICY IF EXISTS "Enable all operations for all users" ON users;
DROP POLICY IF EXISTS "Enable all operations for all users" ON stores;
DROP POLICY IF EXISTS "Enable all operations for all users" ON tasks;
DROP POLICY IF EXISTS "Enable all operations for all users" ON task_responses;
DROP POLICY IF EXISTS "Enable all operations for all users" ON game_plans;

-- 2. RLS'yi geçici olarak devre dışı bırak (veriler etkilenmez)
ALTER TABLE regions DISABLE ROW LEVEL SECURITY;
ALTER TABLE channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_plans DISABLE ROW LEVEL SECURITY;

-- 3. Eksik kolonları ekle (eğer yoksa) - mevcut veriler korunur
-- regions tablosuna status kolonu ekle (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'regions' AND column_name = 'status') THEN
        ALTER TABLE regions ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    END IF;
END $$;

-- channels tablosuna status kolonu ekle (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'channels' AND column_name = 'status') THEN
        ALTER TABLE channels ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    END IF;
END $$;

-- tasks tablosuna closed_at kolonu ekle (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'closed_at') THEN
        ALTER TABLE tasks ADD COLUMN closed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 4. RLS'yi yeniden etkinleştir
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_plans ENABLE ROW LEVEL SECURITY;

-- 5. Basit RLS politikaları oluştur (herkese okuma/yazma izni)
CREATE POLICY "Enable all operations for all users" ON regions FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON channels FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON users FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON stores FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON tasks FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON task_responses FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON game_plans FOR ALL USING (true);

-- 6. Mevcut verilerinizi kontrol edin
SELECT 'İŞLEM TAMAMLANDI - VERİLERİNİZ KORUNDU' as durum;
SELECT 'Bölgeler: ' || count(*) as kontrol FROM regions;
SELECT 'Kanallar: ' || count(*) as kontrol FROM channels;
SELECT 'Kullanıcılar: ' || count(*) as kontrol FROM users;
SELECT 'Mağazalar: ' || count(*) as kontrol FROM stores;
SELECT 'Görevler: ' || count(*) as kontrol FROM tasks;
