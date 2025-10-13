-- ============================================
-- FOTOĞRAF VERİLERİNİ KONTROL ET
-- ============================================

-- 1. En son doldurulan investment area cevaplarını getir
SELECT 
    sa.id as answer_id,
    sa.response_id,
    sa.question_id,
    sr.store_id,
    st.name as store_name,
    sa.answer_data,
    sa.photos as photos_field,
    sa.created_at
FROM survey_answers sa
JOIN survey_responses sr ON sr.id = sa.response_id
JOIN stores st ON st.id = sr.store_id
JOIN survey_questions sq ON sq.id = sa.question_id
WHERE sq.question_type = 'investment_area'
ORDER BY sa.created_at DESC
LIMIT 5;

-- 2. Answer_data içindeki areas array'ini detaylı incele
SELECT 
    sa.id,
    sr.store_id,
    st.name as store_name,
    jsonb_pretty(sa.answer_data) as formatted_answer_data,
    sa.created_at
FROM survey_answers sa
JOIN survey_responses sr ON sr.id = sa.response_id
JOIN stores st ON st.id = sr.store_id
JOIN survey_questions sq ON sq.id = sa.question_id
WHERE sq.question_type = 'investment_area'
ORDER BY sa.created_at DESC
LIMIT 3;

-- 3. Her area'nın photos array'ini ayrı ayrı göster
SELECT 
    sa.id,
    st.name as store_name,
    area_index,
    area_data->>'brand' as brand,
    area_data->>'type' as area_type,
    area_data->'photos' as photos_array,
    jsonb_array_length(COALESCE(area_data->'photos', '[]'::jsonb)) as photo_count
FROM survey_answers sa
JOIN survey_responses sr ON sr.id = sa.response_id
JOIN stores st ON st.id = sr.store_id
JOIN survey_questions sq ON sq.id = sa.question_id,
jsonb_array_elements(sa.answer_data->'areas') WITH ORDINALITY AS t(area_data, area_index)
WHERE sq.question_type = 'investment_area'
ORDER BY sa.created_at DESC, area_index
LIMIT 10;

-- 4. Survey photos bucket'ı kontrol et
SELECT 
    id, 
    name, 
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets 
WHERE id = 'survey-photos';

-- 5. Bucket'ta yüklenen dosyaları kontrol et
SELECT 
    name,
    bucket_id,
    created_at,
    metadata
FROM storage.objects
WHERE bucket_id = 'survey-photos'
ORDER BY created_at DESC
LIMIT 10;

