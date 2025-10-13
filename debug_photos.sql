-- ============================================
-- FOTOĞRAF VERİLERİNİ DEBUG ET
-- ============================================

-- 1. Survey answers tablosunda photos field'ini kontrol et
SELECT 
    'SURVEY ANSWERS PHOTOS' as debug_type,
    sa.id,
    sa.response_id,
    sa.question_id,
    sa.photos,
    array_length(sa.photos, 1) as photos_count,
    sq.question_type
FROM survey_answers sa
JOIN survey_questions sq ON sq.id = sa.question_id
WHERE sq.question_type = 'investment_area'
ORDER BY sa.id DESC
LIMIT 5;

-- 2. Investment area answer_data içindeki photos'ları kontrol et
SELECT 
    'INVESTMENT AREA PHOTOS' as debug_type,
    sa.id,
    sa.response_id,
    sa.answer_data->'areas' as areas_array,
    jsonb_array_length(sa.answer_data->'areas') as areas_count
FROM survey_answers sa
JOIN survey_questions sq ON sq.id = sa.question_id
WHERE sq.question_type = 'investment_area'
ORDER BY sa.id DESC
LIMIT 3;

-- 3. Her area içindeki photos'ları detaylı kontrol et
SELECT 
    'AREA PHOTOS DETAIL' as debug_type,
    sa.id,
    sa.response_id,
    area_data->>'brand' as brand,
    area_data->>'type' as area_type,
    area_data->'photos' as area_photos,
    jsonb_array_length(area_data->'photos') as area_photos_count
FROM survey_answers sa
JOIN survey_questions sq ON sq.id = sa.question_id,
jsonb_array_elements(sa.answer_data->'areas') as area_data
WHERE sq.question_type = 'investment_area'
ORDER BY sa.id DESC
LIMIT 10;
