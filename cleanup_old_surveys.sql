-- ============================================
-- ESKİ ANKETLERİ TEMİZLE - SADECE ID 7 KALSIN
-- ============================================

-- 1. Eski anketlerin cevaplarını sil
DELETE FROM survey_answers 
WHERE response_id IN (
    SELECT sr.id 
    FROM survey_responses sr 
    WHERE sr.survey_id IN (3, 4, 5, 6)
);

-- 2. Eski anketlerin response'larını sil
DELETE FROM survey_responses 
WHERE survey_id IN (3, 4, 5, 6);

-- 3. Eski anketlerin sorularını sil
DELETE FROM survey_questions 
WHERE survey_id IN (3, 4, 5, 6);

-- 4. Eski anketleri sil
DELETE FROM surveys 
WHERE id IN (3, 4, 5, 6);

-- 5. Kontrol et - sadece ID 7 kalmalı
SELECT 
    s.id,
    s.title,
    s.status,
    COUNT(sq.id) as soru_sayisi
FROM surveys s
LEFT JOIN survey_questions sq ON s.id = sq.survey_id
GROUP BY s.id, s.title, s.status
ORDER BY s.id;

-- 6. ID 7'nin yatırım alanı sorusunu kontrol et
SELECT 
    sq.question_type,
    sq.question_config->'brands' as brands,
    jsonb_array_length(sq.question_config->'brands') as brand_count
FROM survey_questions sq
WHERE sq.survey_id = 7 AND sq.question_type = 'investment_area';

-- ============================================
-- BAŞARILI! 
-- Artık sadece ID 7 (13 marka ile) kaldı.
-- ============================================
