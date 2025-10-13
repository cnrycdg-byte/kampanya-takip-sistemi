-- ============================================
-- ANKET VERİLERİNİ DEBUG ET
-- ============================================

-- 1. Promotör sorusu için ham veri kontrolü
SELECT 
    'PROMOTER DATA' as debug_type,
    sr.id as response_id,
    st.name as store_name,
    sa.answer_data,
    sa.answer_data->'brands' as brands_array,
    jsonb_array_length(sa.answer_data->'brands') as brands_count
FROM survey_responses sr
JOIN survey_answers sa ON sa.response_id = sr.id
JOIN survey_questions sq ON sq.id = sa.question_id
JOIN stores st ON st.id = sr.store_id
WHERE sq.question_type = 'promoter_count'
AND sr.status = 'completed'
LIMIT 3;

-- 2. Yatırım alanı sorusu için ham veri kontrolü
SELECT 
    'INVESTMENT DATA' as debug_type,
    sr.id as response_id,
    st.name as store_name,
    sa.answer_data,
    sa.answer_data->'areas' as areas_array,
    jsonb_array_length(sa.answer_data->'areas') as areas_count,
    sa.photos,
    jsonb_array_length(sa.photos) as photos_count
FROM survey_responses sr
JOIN survey_answers sa ON sa.response_id = sr.id
JOIN survey_questions sq ON sq.id = sa.question_id
JOIN stores st ON st.id = sr.store_id
WHERE sq.question_type = 'investment_area'
AND sr.status = 'completed'
LIMIT 3;

-- 3. View'lardan gelen veri kontrolü
SELECT 
    'VIEW PROMOTER' as debug_type,
    store_name,
    answer_data,
    brand_data
FROM v_promoter_report
LIMIT 3;

SELECT 
    'VIEW INVESTMENT' as debug_type,
    store_name,
    answer_data,
    area_data,
    photos
FROM v_investment_report
LIMIT 3;
