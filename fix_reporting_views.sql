-- ============================================
-- RAPORLAMA VİEW'LARI - DÜZELTİLMİŞ VERSİYON
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

-- 2. PROMOTÖR RAPORU VIEW - DÜZELTİLMİŞ
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
    
    -- Promotör detayları (JSONB'den çıkar) - DÜZELTİLMİŞ
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

-- 3. YATIRIM ALANI RAPORU VIEW - DÜZELTİLMİŞ
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
    
    -- Yatırım alanı detayları (JSONB'den çıkar) - DÜZELTİLMİŞ
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

-- 4. KULAKLIK SEPET RAPORU VIEW - DÜZELTİLMİŞ
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
    
    -- Sepet detayları (JSONB'den çıkar) - DÜZELTİLMİŞ
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

-- 5. GSM AKSESUAR RAPORU VIEW - DÜZELTİLMİŞ
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
    
    -- GSM Aksesuar detayları (JSONB'den çıkar) - DÜZELTİLMİŞ
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
        (COUNT(DISTINCT CASE WHEN sr.status = 'completed' THEN sr.id END)::NUMERIC / 
        NULLIF(COUNT(DISTINCT sr.id), 0) * 100), 2
    ) as completion_rate,
    
    -- Toplam Promotör Sayısı
    COALESCE(SUM(CASE WHEN sq.question_type = 'promoter_count' THEN (sa.answer_data->>'total_promoters')::INTEGER ELSE 0 END), 0) as total_promoters,
    
    -- Toplam Yatırım Alanı Sayısı
    COALESCE(SUM(CASE WHEN sq.question_type = 'investment_area' THEN jsonb_array_length(sa.answer_data->'areas') ELSE 0 END), 0) as total_investment_areas,
    
    -- Toplam Kulaklık Sepeti Sayısı
    COALESCE(SUM(CASE WHEN sq.question_type = 'basket_dynamic' THEN (sa.answer_data->>'basket_count')::INTEGER ELSE 0 END), 0) as total_basket_counts,
    
    -- Toplam GSM Aksesuar Sepeti Sayısı
    COALESCE(SUM(CASE WHEN sq.question_type = 'gsm_accessory_basket' THEN (sa.answer_data->>'gsm_accessory_count')::INTEGER ELSE 0 END), 0) as total_gsm_accessory_counts
    
FROM surveys s
LEFT JOIN survey_responses sr ON sr.survey_id = s.id
LEFT JOIN survey_answers sa ON sa.response_id = sr.id
LEFT JOIN survey_questions sq ON sq.id = sa.question_id
WHERE s.status = 'active'
GROUP BY s.month, s.year
ORDER BY s.year DESC, s.month DESC;
