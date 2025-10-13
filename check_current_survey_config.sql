-- Mevcut anket konfigürasyonunu kontrol et
SELECT 
    sq.id,
    sq.question_type,
    sq.question_text,
    sq.question_config,
    s.title as survey_title
FROM survey_questions sq
JOIN surveys s ON sq.survey_id = s.id
WHERE sq.question_type = 'basket_dynamic'
ORDER BY sq.id DESC
LIMIT 5;