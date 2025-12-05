-- Sales Targets Tablosu Düzeltme Scripti
-- Eksik kolonları kontrol edip ekler

-- 1. Önce mevcut VIEW'ları sil
DROP VIEW IF EXISTS monthly_sales_summary;
DROP VIEW IF EXISTS daily_sales_stats;

-- 2. sales_targets tablosuna eksik kolonları ekle
DO $$ 
BEGIN
    -- target_qty kolonu
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales_targets' AND column_name = 'target_qty'
    ) THEN
        ALTER TABLE sales_targets ADD COLUMN target_qty INTEGER DEFAULT 0;
        RAISE NOTICE 'target_qty kolonu eklendi';
    END IF;
    
    -- target_revenue kolonu
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales_targets' AND column_name = 'target_revenue'
    ) THEN
        ALTER TABLE sales_targets ADD COLUMN target_revenue NUMERIC(12, 2) DEFAULT 0;
        RAISE NOTICE 'target_revenue kolonu eklendi';
    END IF;
    
    -- Diğer kategori kolonları
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales_targets' AND column_name = 'philips_headphone_qty'
    ) THEN
        ALTER TABLE sales_targets ADD COLUMN philips_headphone_qty INTEGER DEFAULT 0;
        ALTER TABLE sales_targets ADD COLUMN philips_headphone_revenue NUMERIC(12, 2) DEFAULT 0;
        ALTER TABLE sales_targets ADD COLUMN ugreen_headphone_qty INTEGER DEFAULT 0;
        ALTER TABLE sales_targets ADD COLUMN ugreen_headphone_revenue NUMERIC(12, 2) DEFAULT 0;
        ALTER TABLE sales_targets ADD COLUMN philips_mobile_acc_qty INTEGER DEFAULT 0;
        ALTER TABLE sales_targets ADD COLUMN philips_mobile_acc_revenue NUMERIC(12, 2) DEFAULT 0;
        ALTER TABLE sales_targets ADD COLUMN ugreen_mobile_acc_qty INTEGER DEFAULT 0;
        ALTER TABLE sales_targets ADD COLUMN ugreen_mobile_acc_revenue NUMERIC(12, 2) DEFAULT 0;
        ALTER TABLE sales_targets ADD COLUMN philips_other_qty INTEGER DEFAULT 0;
        ALTER TABLE sales_targets ADD COLUMN philips_other_revenue NUMERIC(12, 2) DEFAULT 0;
        ALTER TABLE sales_targets ADD COLUMN ugreen_other_qty INTEGER DEFAULT 0;
        ALTER TABLE sales_targets ADD COLUMN ugreen_other_revenue NUMERIC(12, 2) DEFAULT 0;
        ALTER TABLE sales_targets ADD COLUMN ugreen_it_aksesuar_qty INTEGER DEFAULT 0;
        ALTER TABLE sales_targets ADD COLUMN ugreen_it_aksesuar_revenue NUMERIC(12, 2) DEFAULT 0;
        RAISE NOTICE 'Kategori kolonları eklendi';
    END IF;
    
    -- created_by kolonu
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales_targets' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE sales_targets ADD COLUMN created_by INTEGER REFERENCES users(id);
        RAISE NOTICE 'created_by kolonu eklendi';
    END IF;
    
END $$;

-- 3. VIEW: AYLIK SATIŞ ÖZETİ (Hedef vs Gerçekleşen)
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

-- 4. VIEW: GÜNLÜK SATIŞ İSTATİSTİKLERİ
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

