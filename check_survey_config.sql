-- ============================================
-- ANKET KONFİGÜRASYONUNU KONTROL ET
-- ============================================

-- Mevcut anketleri ve konfigürasyonlarını görüntüle
SELECT 
    s.id,
    s.title,
    sq.question_type,
    sq.question_order,
    sq.question_config
FROM surveys s
JOIN survey_questions sq ON s.id = sq.survey_id
WHERE s.status = 'active'
ORDER BY s.id, sq.question_order;

-- Özellikle yatırım alanı sorusunu kontrol et
SELECT 
    s.id,
    s.title,
    sq.question_text,
    sq.question_config
FROM surveys s
JOIN survey_questions sq ON s.id = sq.survey_id
WHERE sq.question_type = 'investment_area'
ORDER BY s.id;
