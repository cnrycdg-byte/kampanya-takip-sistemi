-- ============================================
-- RAPORLAMA VİEW'LARI
-- Mevcut channels, regions, stores tablolarını kullanarak
-- ============================================

-- ÖNCE MEVCUT VIEW'LARI SİL
DROP VIEW IF EXISTS v_survey_dashboard CASCADE;
DROP VIEW IF EXISTS v_promoter_report CASCADE;
DROP VIEW IF EXISTS v_investment_report CASCADE;
DROP VIEW IF EXISTS v_basket_report CASCADE;
DROP VIEW IF EXISTS v_gsm_accessory_report CASCADE;
DROP VIEW IF EXISTS v_brand_summary CASCADE;
DROP VIEW IF EXISTS v_kpi_summary CASCADE;

-- 1. GENEL DASHBOARD VIEW
-- Tüm anket istatistikleri (kanal, bölge, mağaza bazlı)
CREATE OR REPLACE VIEW v_survey_dashboard AS
SELECT 
    s.id as survey_id,
    s.title as survey_title,
    s.month,
    s.year,
    s.status as survey_status,
    
    -- Mağaza bilgileri
    st.id as store_id,
    st.name as store_name,
    st.channel_id,
    c.name as channel_name,
    st.region_id,
    r.name as region_name,
    st.manager,
    
    -- Response bilgileri
    sr.id as response_id,
    sr.status as response_status,
    sr.submitted_at,
    
    -- İstatistikler
    (SELECT COUNT(*) FROM survey_questions sq WHERE sq.survey_id = s.id) as total_questions,
    (SELECT COUNT(*) FROM survey_answers sa WHERE sa.response_id = sr.id) as answered_questions
    
FROM surveys s
CROSS JOIN stores st
LEFT JOIN channels c ON st.channel_id = c.id
LEFT JOIN regions r ON st.region_id = r.id
LEFT JOIN survey_responses sr ON sr.survey_id = s.id AND sr.store_id = st.id
WHERE s.status = 'active'
ORDER BY s.year DESC, s.month DESC, st.name;

-- 2. PROMOTÖR RAPORU VIEW
CREATE OR REPLACE VIEW v_promoter_report AS
SELECT 
    s.id as survey_id,
    s.title as survey_title,
    s.month,
    s.year,
    
    -- Mağaza bilgileri
    st.id as store_id,
    st.name as store_name,
    c.name as channel_name,
    st.region_id,
    r.name as region_name,
    st.manager,
    
    -- Soru bilgileri
    sq.id as question_id,
    sq.question_text,
    
    -- Cevap bilgileri
    sr.id as response_id,
    sr.submitted_at,
    sa.answer_data,
    
    -- Promotör detayları (JSONB'den çıkar)
    jsonb_array_elements(sa.answer_data->'brands') as brand_data
    
FROM surveys s
JOIN survey_questions sq ON sq.survey_id = s.id AND sq.question_type = 'promoter_count'
JOIN survey_responses sr ON sr.survey_id = s.id
JOIN survey_answers sa ON sa.response_id = sr.id AND sa.question_id = sq.id
JOIN stores st ON st.id = sr.store_id
LEFT JOIN channels c ON st.channel_id = c.id
LEFT JOIN regions r ON st.region_id = r.id
WHERE s.status = 'active' AND sr.status = 'completed'
ORDER BY s.year DESC, s.month DESC, st.name;

-- 3. YATIRIM ALANI RAPORU VIEW
CREATE OR REPLACE VIEW v_investment_report AS
SELECT 
    s.id as survey_id,
    s.title as survey_title,
    s.month,
    s.year,
    
    -- Mağaza bilgileri
    st.id as store_id,
    st.name as store_name,
    c.name as channel_name,
    st.region_id,
    r.name as region_name,
    st.manager,
    
    -- Soru bilgileri
    sq.id as question_id,
    sq.question_text,
    
    -- Cevap bilgileri
    sr.id as response_id,
    sr.submitted_at,
    sa.answer_data,
    sa.photos,
    
    -- Yatırım alanı detayları
    jsonb_array_elements(sa.answer_data->'areas') as area_data
    
FROM surveys s
JOIN survey_questions sq ON sq.survey_id = s.id AND sq.question_type = 'investment_area'
JOIN survey_responses sr ON sr.survey_id = s.id
JOIN survey_answers sa ON sa.response_id = sr.id AND sa.question_id = sq.id
JOIN stores st ON st.id = sr.store_id
LEFT JOIN channels c ON st.channel_id = c.id
LEFT JOIN regions r ON st.region_id = r.id
WHERE s.status = 'active' AND sr.status = 'completed'
ORDER BY s.year DESC, s.month DESC, st.name;

-- 4. KULAKLIK SEPET RAPORU VIEW
CREATE OR REPLACE VIEW v_basket_report AS
SELECT 
    s.id as survey_id,
    s.title as survey_title,
    s.month,
    s.year,
    
    -- Mağaza bilgileri
    st.id as store_id,
    st.name as store_name,
    c.name as channel_name,
    st.region_id,
    r.name as region_name,
    st.manager,
    
    -- Soru bilgileri
    sq.id as question_id,
    sq.question_text,
    
    -- Cevap bilgileri
    sr.id as response_id,
    sr.submitted_at,
    sa.answer_data,
    
    -- Sepet detayları
    (sa.answer_data->>'basket_count')::INTEGER as basket_count,
    jsonb_array_elements(sa.answer_data->'baskets') as basket_data
    
FROM surveys s
JOIN survey_questions sq ON sq.survey_id = s.id AND sq.question_type = 'basket_dynamic'
JOIN survey_responses sr ON sr.survey_id = s.id
JOIN survey_answers sa ON sa.response_id = sr.id AND sa.question_id = sq.id
JOIN stores st ON st.id = sr.store_id
LEFT JOIN channels c ON st.channel_id = c.id
LEFT JOIN regions r ON st.region_id = r.id
WHERE s.status = 'active' AND sr.status = 'completed'
ORDER BY s.year DESC, s.month DESC, st.name;

-- 5. GSM AKSESUAR RAPORU VIEW
CREATE OR REPLACE VIEW v_gsm_accessory_report AS
SELECT 
    s.id as survey_id,
    s.title as survey_title,
    s.month,
    s.year,
    
    -- Mağaza bilgileri
    st.id as store_id,
    st.name as store_name,
    c.name as channel_name,
    st.region_id,
    r.name as region_name,
    st.manager,
    
    -- Soru bilgileri
    sq.id as question_id,
    sq.question_text,
    
    -- Cevap bilgileri
    sr.id as response_id,
    sr.submitted_at,
    sa.answer_data,
    
    -- GSM Aksesuar detayları
    (sa.answer_data->>'gsm_accessory_count')::INTEGER as gsm_accessory_count,
    jsonb_array_elements(sa.answer_data->'gsm_accessories') as accessory_data
    
FROM surveys s
JOIN survey_questions sq ON sq.survey_id = s.id AND sq.question_type = 'gsm_accessory_basket'
JOIN survey_responses sr ON sr.survey_id = s.id
JOIN survey_answers sa ON sa.response_id = sr.id AND sa.question_id = sq.id
JOIN stores st ON st.id = sr.store_id
LEFT JOIN channels c ON st.channel_id = c.id
LEFT JOIN regions r ON st.region_id = r.id
WHERE s.status = 'active' AND sr.status = 'completed'
ORDER BY s.year DESC, s.month DESC, st.name;

-- 6. MARKA BAZLI ÖZET VIEW (Tüm sorularda markaları topla)
CREATE OR REPLACE VIEW v_brand_summary AS
WITH brand_counts AS (
    -- Promotör markalarını say
    SELECT 
        s.month,
        s.year,
        st.channel_id,
        c.name as channel_name,
        st.region_id,
        r.name as region_name,
        brand_data->>'label' as brand_name,
        'promoter' as source_type,
        COALESCE((brand_data->>'count')::INTEGER, 0) as count
    FROM v_promoter_report vpr
    JOIN stores st ON vpr.store_id = st.id
    LEFT JOIN channels c ON st.channel_id = c.id
    LEFT JOIN regions r ON st.region_id = r.id
    JOIN surveys s ON vpr.survey_id = s.id,
    jsonb_array_elements(vpr.answer_data->'brands') as brand_data
    WHERE (brand_data->>'selected')::boolean = true
    
    UNION ALL
    
    -- Yatırım alanı markalarını say
    SELECT 
        s.month,
        s.year,
        st.channel_id,
        c.name as channel_name,
        st.region_id,
        r.name as region_name,
        area_data->>'brand' as brand_name,
        'investment' as source_type,
        1 as count
    FROM v_investment_report vir
    JOIN stores st ON vir.store_id = st.id
    LEFT JOIN channels c ON st.channel_id = c.id
    LEFT JOIN regions r ON st.region_id = r.id
    JOIN surveys s ON vir.survey_id = s.id,
    jsonb_array_elements(vir.answer_data->'areas') as area_data
    
    UNION ALL
    
    -- Sepet markalarını say
    SELECT 
        s.month,
        s.year,
        st.channel_id,
        c.name as channel_name,
        st.region_id,
        r.name as region_name,
        basket_data->>'brand' as brand_name,
        'basket' as source_type,
        1 as count
    FROM v_basket_report vbr
    JOIN stores st ON vbr.store_id = st.id
    LEFT JOIN channels c ON st.channel_id = c.id
    LEFT JOIN regions r ON st.region_id = r.id
    JOIN surveys s ON vbr.survey_id = s.id,
    jsonb_array_elements(vbr.answer_data->'baskets') as basket_data
    
    UNION ALL
    
    -- GSM Aksesuar markalarını say
    SELECT 
        s.month,
        s.year,
        st.channel_id,
        c.name as channel_name,
        st.region_id,
        r.name as region_name,
        accessory_data->>'brand' as brand_name,
        'gsm_accessory' as source_type,
        1 as count
    FROM v_gsm_accessory_report vgar
    JOIN stores st ON vgar.store_id = st.id
    LEFT JOIN channels c ON st.channel_id = c.id
    LEFT JOIN regions r ON st.region_id = r.id
    JOIN surveys s ON vgar.survey_id = s.id,
    jsonb_array_elements(vgar.answer_data->'gsm_accessories') as accessory_data
)
SELECT 
    month,
    year,
    channel_id,
    channel_name,
    region_id,
    region_name,
    brand_name,
    source_type,
    SUM(count) as total_count
FROM brand_counts
WHERE brand_name IS NOT NULL AND brand_name != ''
GROUP BY month, year, channel_id, channel_name, region_id, region_name, brand_name, source_type
ORDER BY year DESC, month DESC, channel_name, brand_name;

-- 7. KPI ÖZET VIEW (Dashboard için)
CREATE OR REPLACE VIEW v_kpi_summary AS
SELECT 
    s.month,
    s.year,
    
    -- Toplam mağaza sayısı
    COUNT(DISTINCT sr.store_id) as total_stores_participated,
    (SELECT COUNT(*) FROM stores WHERE is_active = true) as total_active_stores,
    
    -- Tamamlanma oranı
    COUNT(DISTINCT CASE WHEN sr.status = 'completed' THEN sr.id END) as completed_responses,
    COUNT(DISTINCT sr.id) as total_responses,
    ROUND(
        (COUNT(DISTINCT CASE WHEN sr.status = 'completed' THEN sr.id END)::DECIMAL / 
         NULLIF(COUNT(DISTINCT sr.id), 0)) * 100, 
        2
    ) as completion_rate,
    
    -- Promotör sayısı
    (SELECT SUM(COALESCE((brand_data->>'count')::INTEGER, 0))
     FROM survey_answers sa
     JOIN survey_questions sq ON sa.question_id = sq.id
     JOIN survey_responses sr2 ON sa.response_id = sr2.id
     JOIN surveys s2 ON sr2.survey_id = s2.id,
     jsonb_array_elements(sa.answer_data->'brands') as brand_data
     WHERE sq.question_type = 'promoter_count'
     AND s2.month = s.month AND s2.year = s.year
     AND (brand_data->>'selected')::boolean = true
    ) as total_promoters,
    
    -- Yatırım alanı sayısı
    (SELECT COUNT(*)
     FROM survey_answers sa
     JOIN survey_questions sq ON sa.question_id = sq.id
     JOIN survey_responses sr2 ON sa.response_id = sr2.id
     JOIN surveys s2 ON sr2.survey_id = s2.id,
     jsonb_array_elements(sa.answer_data->'areas') as area_data
     WHERE sq.question_type = 'investment_area'
     AND s2.month = s.month AND s2.year = s.year
    ) as total_investment_areas
    
FROM surveys s
LEFT JOIN survey_responses sr ON sr.survey_id = s.id
WHERE s.status = 'active'
GROUP BY s.month, s.year
ORDER BY s.year DESC, s.month DESC;

-- ============================================
-- İNDEXLER (Performans için)
-- ============================================

-- Survey responses için index
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_store 
ON survey_responses(survey_id, store_id);

CREATE INDEX IF NOT EXISTS idx_survey_responses_status 
ON survey_responses(status);

-- Survey answers için index
CREATE INDEX IF NOT EXISTS idx_survey_answers_response_question 
ON survey_answers(response_id, question_id);

-- Survey questions için index
CREATE INDEX IF NOT EXISTS idx_survey_questions_type 
ON survey_questions(question_type);

-- Stores için index
CREATE INDEX IF NOT EXISTS idx_stores_channel 
ON stores(channel_id);

CREATE INDEX IF NOT EXISTS idx_stores_manager 
ON stores(manager);

-- ============================================
-- TEST SORGUSU
-- ============================================

-- View'ların çalıştığını kontrol et
SELECT 'v_survey_dashboard' as view_name, COUNT(*) as row_count FROM v_survey_dashboard
UNION ALL
SELECT 'v_promoter_report', COUNT(*) FROM v_promoter_report
UNION ALL
SELECT 'v_investment_report', COUNT(*) FROM v_investment_report
UNION ALL
SELECT 'v_basket_report', COUNT(*) FROM v_basket_report
UNION ALL
SELECT 'v_gsm_accessory_report', COUNT(*) FROM v_gsm_accessory_report
UNION ALL
SELECT 'v_brand_summary', COUNT(*) FROM v_brand_summary
UNION ALL
SELECT 'v_kpi_summary', COUNT(*) FROM v_kpi_summary;

-- ============================================
-- BAŞARILI! 
-- Raporlama view'ları oluşturuldu.
-- ============================================
