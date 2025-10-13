-- ============================================
-- MEVCUT ANKET KONFİGÜRASYONUNU KONTROL ET
-- ============================================

-- 1. Aktif anketleri listele
SELECT 
    s.id,
    s.title,
    s.status,
    s.created_at
FROM surveys s
WHERE s.status = 'active'
ORDER BY s.id DESC;

-- 2. En son anketin tüm sorularını detaylı göster
SELECT 
    sq.id,
    sq.survey_id,
    sq.question_type,
    sq.question_order,
    sq.question_text,
    CASE 
        WHEN sq.question_type = 'promoter_count' THEN jsonb_array_length(sq.question_config->'options')
        WHEN sq.question_type = 'investment_area' THEN jsonb_array_length(sq.question_config->'brands')
        WHEN sq.question_type = 'basket_dynamic' THEN jsonb_array_length(sq.question_config->'brands')
        ELSE 0
    END as marka_seçenek_sayisi,
    sq.question_config
FROM survey_questions sq
JOIN surveys s ON sq.survey_id = s.id
WHERE s.status = 'active'
ORDER BY sq.survey_id DESC, sq.question_order;

-- 3. Özellikle yatırım alanı sorusunu kontrol et
SELECT 
    s.id as survey_id,
    s.title,
    sq.question_type,
    jsonb_array_length(sq.question_config->'brands') as marka_sayisi,
    sq.question_config->'brands' as markalar,
    jsonb_pretty(sq.question_config) as pretty_config
FROM surveys s
JOIN survey_questions sq ON s.id = sq.survey_id
WHERE sq.question_type = 'investment_area'
AND s.status = 'active'
ORDER BY s.id DESC;
