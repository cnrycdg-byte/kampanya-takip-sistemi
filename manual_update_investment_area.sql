-- ============================================
-- YATIRIM ALANI SORUSUNU MANUEL GÜNCELLE
-- ============================================

-- 1. Hangi anket ID'si aktif kontrol et
SELECT 
    s.id,
    s.title,
    s.status
FROM surveys s
WHERE s.status = 'active'
ORDER BY s.id DESC;

-- 2. Yatırım alanı sorusunu güncelle (ID'yi yukarıdaki sonuçtan alın)
UPDATE survey_questions 
SET question_config = '{
    "type": "investment_area",
    "categories": [
        {"label": "Duvar Standı", "value": "wall"},
        {"label": "Orta Alan Standı", "value": "middle"},
        {"label": "Diğer", "value": "other", "allow_custom": true}
    ],
    "brands": ["Philips", "Ugreen", "JBL", "Anker", "Baseus", "Ttec", "Cellurline", "Shokz", "Fresh''N Rebul", "Sennheiser", "Huawei", "Momax", "Piili"],
    "photo_required": true,
    "max_photos": 5,
    "photo_label": "Standın fotoğraflarını yükleyin"
}'::jsonb
WHERE question_type = 'investment_area' 
AND survey_id = (SELECT id FROM surveys WHERE status = 'active' ORDER BY id DESC LIMIT 1);

-- 3. Güncelleme sonrası kontrol
SELECT 
    sq.question_type,
    jsonb_array_length(sq.question_config->'brands') as marka_sayisi,
    sq.question_config->'brands' as markalar
FROM survey_questions sq
JOIN surveys s ON sq.survey_id = s.id
WHERE sq.question_type = 'investment_area'
AND s.status = 'active'
ORDER BY s.id DESC;

-- ============================================
-- BAŞARILI! 
-- Yatırım alanı sorusunda 13 marka olmalı.
-- ============================================
