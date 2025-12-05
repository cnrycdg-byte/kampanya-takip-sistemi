-- Satış Takibi Sistemi - Veritabanı Şeması
-- Bu script tüm satış takibi sistemini baştan oluşturur

-- 1. DEPARTMANLAR TABLOSU
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Varsayılan departmanları ekle
INSERT INTO departments (name, description) VALUES
('Ortak', 'Ortak departman'),
('Mobil ACC', 'Mobil Aksesuar departmanı'),
('Kulaklık', 'Kulaklık departmanı')
ON CONFLICT (name) DO NOTHING;

-- 2. SATIŞ HEDEFLERİ TABLOSU (Mağaza + Departman + Ay/Yıl bazlı)
-- Önce mevcut tabloyu kontrol et ve eksik kolonları ekle
DO $$ 
BEGIN
    -- Tablo yoksa oluştur
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sales_targets') THEN
        CREATE TABLE sales_targets (
            id SERIAL PRIMARY KEY,
            store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
            department VARCHAR(100) NOT NULL,
            month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
            year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
            
            -- Toplam hedefler (aylık)
            target_qty INTEGER DEFAULT 0,
            target_revenue NUMERIC(12, 2) DEFAULT 0,
            
            -- Kategori bazlı hedefler
            philips_headphone_qty INTEGER DEFAULT 0,
            philips_headphone_revenue NUMERIC(12, 2) DEFAULT 0,
            ugreen_headphone_qty INTEGER DEFAULT 0,
            ugreen_headphone_revenue NUMERIC(12, 2) DEFAULT 0,
            philips_mobile_acc_qty INTEGER DEFAULT 0,
            philips_mobile_acc_revenue NUMERIC(12, 2) DEFAULT 0,
            ugreen_mobile_acc_qty INTEGER DEFAULT 0,
            ugreen_mobile_acc_revenue NUMERIC(12, 2) DEFAULT 0,
            philips_other_qty INTEGER DEFAULT 0,
            philips_other_revenue NUMERIC(12, 2) DEFAULT 0,
            ugreen_other_qty INTEGER DEFAULT 0,
            ugreen_other_revenue NUMERIC(12, 2) DEFAULT 0,
            ugreen_it_aksesuar_qty INTEGER DEFAULT 0,
            ugreen_it_aksesuar_revenue NUMERIC(12, 2) DEFAULT 0,
            
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            
            UNIQUE(store_id, department, month, year)
        );
    ELSE
        -- Tablo varsa eksik kolonları ekle
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_targets' AND column_name = 'target_qty') THEN
            ALTER TABLE sales_targets ADD COLUMN target_qty INTEGER DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_targets' AND column_name = 'target_revenue') THEN
            ALTER TABLE sales_targets ADD COLUMN target_revenue NUMERIC(12, 2) DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_targets' AND column_name = 'philips_headphone_qty') THEN
            ALTER TABLE sales_targets ADD COLUMN philips_headphone_qty INTEGER DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_targets' AND column_name = 'philips_headphone_revenue') THEN
            ALTER TABLE sales_targets ADD COLUMN philips_headphone_revenue NUMERIC(12, 2) DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_targets' AND column_name = 'ugreen_headphone_qty') THEN
            ALTER TABLE sales_targets ADD COLUMN ugreen_headphone_qty INTEGER DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_targets' AND column_name = 'ugreen_headphone_revenue') THEN
            ALTER TABLE sales_targets ADD COLUMN ugreen_headphone_revenue NUMERIC(12, 2) DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_targets' AND column_name = 'philips_mobile_acc_qty') THEN
            ALTER TABLE sales_targets ADD COLUMN philips_mobile_acc_qty INTEGER DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_targets' AND column_name = 'philips_mobile_acc_revenue') THEN
            ALTER TABLE sales_targets ADD COLUMN philips_mobile_acc_revenue NUMERIC(12, 2) DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_targets' AND column_name = 'ugreen_mobile_acc_qty') THEN
            ALTER TABLE sales_targets ADD COLUMN ugreen_mobile_acc_qty INTEGER DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_targets' AND column_name = 'ugreen_mobile_acc_revenue') THEN
            ALTER TABLE sales_targets ADD COLUMN ugreen_mobile_acc_revenue NUMERIC(12, 2) DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_targets' AND column_name = 'philips_other_qty') THEN
            ALTER TABLE sales_targets ADD COLUMN philips_other_qty INTEGER DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_targets' AND column_name = 'philips_other_revenue') THEN
            ALTER TABLE sales_targets ADD COLUMN philips_other_revenue NUMERIC(12, 2) DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_targets' AND column_name = 'ugreen_other_qty') THEN
            ALTER TABLE sales_targets ADD COLUMN ugreen_other_qty INTEGER DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_targets' AND column_name = 'ugreen_other_revenue') THEN
            ALTER TABLE sales_targets ADD COLUMN ugreen_other_revenue NUMERIC(12, 2) DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_targets' AND column_name = 'ugreen_it_aksesuar_qty') THEN
            ALTER TABLE sales_targets ADD COLUMN ugreen_it_aksesuar_qty INTEGER DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_targets' AND column_name = 'ugreen_it_aksesuar_revenue') THEN
            ALTER TABLE sales_targets ADD COLUMN ugreen_it_aksesuar_revenue NUMERIC(12, 2) DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_targets' AND column_name = 'created_by') THEN
            ALTER TABLE sales_targets ADD COLUMN created_by INTEGER REFERENCES users(id);
        END IF;
    END IF;
END $$;

-- Tablo yapısını tamamla (CREATE TABLE IF NOT EXISTS sadece tablo yoksa çalışır)
CREATE TABLE IF NOT EXISTS sales_targets (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    department VARCHAR(100) NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
    
    -- Toplam hedefler (aylık)
    target_qty INTEGER DEFAULT 0, -- Adet hedefi
    target_revenue NUMERIC(12, 2) DEFAULT 0, -- Ciro hedefi (TL)
    
    -- Kategori bazlı hedefler (opsiyonel)
    philips_headphone_qty INTEGER DEFAULT 0,
    philips_headphone_revenue NUMERIC(12, 2) DEFAULT 0,
    ugreen_headphone_qty INTEGER DEFAULT 0,
    ugreen_headphone_revenue NUMERIC(12, 2) DEFAULT 0,
    philips_mobile_acc_qty INTEGER DEFAULT 0,
    philips_mobile_acc_revenue NUMERIC(12, 2) DEFAULT 0,
    ugreen_mobile_acc_qty INTEGER DEFAULT 0,
    ugreen_mobile_acc_revenue NUMERIC(12, 2) DEFAULT 0,
    philips_other_qty INTEGER DEFAULT 0,
    philips_other_revenue NUMERIC(12, 2) DEFAULT 0,
    ugreen_other_qty INTEGER DEFAULT 0,
    ugreen_other_revenue NUMERIC(12, 2) DEFAULT 0,
    ugreen_it_aksesuar_qty INTEGER DEFAULT 0,
    ugreen_it_aksesuar_revenue NUMERIC(12, 2) DEFAULT 0,
    
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Her mağaza + departman + ay/yıl kombinasyonu için tek hedef
    UNIQUE(store_id, department, month, year)
);

-- 3. SATIŞ GİRİŞLERİ TABLOSU (Günlük satış kayıtları)
CREATE TABLE IF NOT EXISTS sales_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    department VARCHAR(100) NOT NULL,
    entry_date DATE NOT NULL,
    
    -- Toplam satışlar
    total_qty INTEGER DEFAULT 0,
    total_revenue NUMERIC(12, 2) DEFAULT 0,
    
    -- Kategori bazlı satışlar
    philips_headphone_qty INTEGER DEFAULT 0,
    philips_headphone_revenue NUMERIC(12, 2) DEFAULT 0,
    ugreen_headphone_qty INTEGER DEFAULT 0,
    ugreen_headphone_revenue NUMERIC(12, 2) DEFAULT 0,
    philips_mobile_acc_qty INTEGER DEFAULT 0,
    philips_mobile_acc_revenue NUMERIC(12, 2) DEFAULT 0,
    ugreen_mobile_acc_qty INTEGER DEFAULT 0,
    ugreen_mobile_acc_revenue NUMERIC(12, 2) DEFAULT 0,
    philips_other_qty INTEGER DEFAULT 0,
    philips_other_revenue NUMERIC(12, 2) DEFAULT 0,
    ugreen_other_qty INTEGER DEFAULT 0,
    ugreen_other_revenue NUMERIC(12, 2) DEFAULT 0,
    ugreen_it_aksesuar_qty INTEGER DEFAULT 0,
    ugreen_it_aksesuar_revenue NUMERIC(12, 2) DEFAULT 0,
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Her kullanıcı + mağaza + departman + tarih için tek kayıt
    UNIQUE(user_id, store_id, department, entry_date)
);

-- 4. PUANTAJ/İZİN KAYITLARI TABLOSU
CREATE TABLE IF NOT EXISTS attendance_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    department VARCHAR(100) NOT NULL,
    attendance_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Aktif', 'Haftalık İzin', 'Raporlu', 'Yıllık İzin')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Her kullanıcı + mağaza + departman + tarih için tek kayıt
    UNIQUE(user_id, store_id, department, attendance_date)
);

-- 5. MAIL RAPOR AYARLARI TABLOSU
CREATE TABLE IF NOT EXISTS report_email_settings (
    id SERIAL PRIMARY KEY,
    report_name VARCHAR(255) NOT NULL UNIQUE,
    report_type VARCHAR(100) NOT NULL, -- 'daily', 'weekly', 'monthly'
    is_active BOOLEAN DEFAULT true,
    schedule_time TIME, -- Günlük raporlar için gönderim saati
    schedule_day INTEGER, -- Haftalık/aylık için gün (1-7: Pazartesi-Pazar)
    email_recipients TEXT[], -- Email adresleri listesi
    email_subject VARCHAR(500),
    email_template TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. MAIL RAPOR GÖNDERİM GEÇMİŞİ
CREATE TABLE IF NOT EXISTS report_email_history (
    id SERIAL PRIMARY KEY,
    report_setting_id INTEGER REFERENCES report_email_settings(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    email_recipients TEXT[],
    email_subject VARCHAR(500),
    email_body TEXT,
    status VARCHAR(50) DEFAULT 'sent', -- 'sent', 'failed', 'pending'
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. İNDEKSLER (Performans için)
CREATE INDEX idx_sales_targets_store_dept ON sales_targets(store_id, department, month, year);
CREATE INDEX idx_sales_entries_user_store_date ON sales_entries(user_id, store_id, entry_date);
CREATE INDEX idx_sales_entries_store_dept_date ON sales_entries(store_id, department, entry_date);
CREATE INDEX idx_attendance_user_store_date ON attendance_records(user_id, store_id, attendance_date);
CREATE INDEX idx_attendance_store_dept_date ON attendance_records(store_id, department, attendance_date);

-- 8. KULLANICILAR TABLOSUNA DEPARTMAN KOLONU EKLE (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'department'
    ) THEN
        ALTER TABLE users ADD COLUMN department VARCHAR(100);
    END IF;
END $$;

-- 9. ÖNCE MEVCUT VIEW'LARI SİL (eğer varsa)
DROP VIEW IF EXISTS monthly_sales_summary;
DROP VIEW IF EXISTS daily_sales_stats;

-- 10. VIEW: AYLIK SATIŞ ÖZETİ (Hedef vs Gerçekleşen)
CREATE OR REPLACE VIEW monthly_sales_summary AS
SELECT 
    st.store_id,
    s.name AS store_name,
    st.department,
    st.month,
    st.year,
    COALESCE(st.target_qty, 0) AS target_qty,
    COALESCE(st.target_revenue, 0) AS target_revenue,
    COALESCE(SUM(se.total_qty), 0) AS actual_qty,
    COALESCE(SUM(se.total_revenue), 0) AS actual_revenue,
    CASE 
        WHEN COALESCE(st.target_revenue, 0) > 0 THEN 
            ROUND((COALESCE(SUM(se.total_revenue), 0) / st.target_revenue) * 100, 2)
        ELSE 0 
    END AS achievement_percentage,
    CASE 
        WHEN COALESCE(st.target_qty, 0) > 0 THEN 
            ROUND((COALESCE(SUM(se.total_qty), 0) / st.target_qty) * 100, 2)
        ELSE 0 
    END AS qty_achievement_percentage
FROM sales_targets st
LEFT JOIN stores s ON st.store_id = s.id
LEFT JOIN sales_entries se ON 
    se.store_id = st.store_id 
    AND se.department = st.department
    AND EXTRACT(MONTH FROM se.entry_date) = st.month
    AND EXTRACT(YEAR FROM se.entry_date) = st.year
GROUP BY st.id, st.store_id, s.name, st.department, st.month, st.year, st.target_qty, st.target_revenue;

-- 11. VIEW: GÜNLÜK SATIŞ İSTATİSTİKLERİ
CREATE OR REPLACE VIEW daily_sales_stats AS
SELECT 
    entry_date,
    store_id,
    department,
    COUNT(DISTINCT user_id) AS active_users,
    SUM(total_qty) AS total_qty,
    SUM(total_revenue) AS total_revenue,
    AVG(total_qty) AS avg_qty_per_user,
    AVG(total_revenue) AS avg_revenue_per_user
FROM sales_entries
GROUP BY entry_date, store_id, department;

COMMENT ON TABLE sales_targets IS 'Mağaza ve departman bazlı aylık satış hedefleri';
COMMENT ON TABLE sales_entries IS 'Günlük satış girişleri';
COMMENT ON TABLE attendance_records IS 'Puantaj ve izin kayıtları';
COMMENT ON TABLE report_email_settings IS 'Mail rapor ayarları ve zamanlamaları';

