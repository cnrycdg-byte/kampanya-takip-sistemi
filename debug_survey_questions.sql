-- ============================================
-- ANKET SORULARINI DEBUG ET
-- ============================================

-- 1. Aktif anketleri listele
SELECT 
    s.id,
    s.title,
    s.status,
    s.month,
    s.year
FROM surveys s
WHERE s.status = 'active'
ORDER BY s.id DESC;

-- 2. En son anketin sorularını detaylı göster
SELECT 
    sq.id,
    sq.survey_id,
    sq.question_type,
    sq.question_order,
    sq.question_text,
    sq.question_config,
    sq.is_required
FROM survey_questions sq
JOIN surveys s ON sq.survey_id = s.id
WHERE s.status = 'active'
ORDER BY sq.survey_id DESC, sq.question_order;

-- 3. Özellikle investment_area sorusunu kontrol et
SELECT 
    s.id as survey_id,
    s.title,
    sq.question_type,
    sq.question_config,
    jsonb_pretty(sq.question_config) as pretty_config
FROM surveys s
JOIN survey_questions sq ON s.id = sq.survey_id
WHERE sq.question_type = 'investment_area'
ORDER BY s.id DESC;
