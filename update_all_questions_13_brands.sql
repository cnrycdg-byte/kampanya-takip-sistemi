-- ============================================
-- TÜM SORULARI 13 MARKA İLE GÜNCELLE
-- ============================================

-- 1. Mevcut anketleri kontrol et
SELECT 
    s.id,
    s.title,
    sq.question_type,
    sq.question_order,
    jsonb_array_length(sq.question_config->'brands') as marka_sayisi,
    jsonb_array_length(sq.question_config->'options') as seçenek_sayisi
FROM surveys s
JOIN survey_questions sq ON s.id = sq.survey_id
WHERE s.status = 'active'
ORDER BY s.id, sq.question_order;

-- 2. PROMOTÖR SAYISI SORUSUNU GÜNCELLE (13 marka + Diğer)
UPDATE survey_questions 
SET question_config = '{
    "type": "multiple_choice_with_count",
    "options": [
        {"label": "Philips", "value": "philips"},
        {"label": "Ugreen", "value": "ugreen"},
        {"label": "JBL", "value": "jbl"},
        {"label": "Anker", "value": "anker"},
        {"label": "Baseus", "value": "baseus"},
        {"label": "Ttec", "value": "ttec"},
        {"label": "Cellurline", "value": "cellurline"},
        {"label": "Shokz", "value": "shokz"},
        {"label": "Fresh''N Rebul", "value": "freshn_rebul"},
        {"label": "Sennheiser", "value": "sennheiser"},
        {"label": "Huawei", "value": "huawei"},
        {"label": "Momax", "value": "momax"},
        {"label": "Piili", "value": "piili"},
        {"label": "Diğer", "value": "other", "allow_custom": true}
    ],
    "count_field": true,
    "count_label": "Kişi Sayısı"
}'::jsonb
WHERE question_type = 'promoter_count' AND survey_id IN (SELECT id FROM surveys WHERE status = 'active');

-- 3. YATIRIM ALANI SORUSUNU GÜNCELLE (13 marka)
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
WHERE question_type = 'investment_area' AND survey_id IN (SELECT id FROM surveys WHERE status = 'active');

-- 4. SEPET ANALİZİ SORUSUNU GÜNCELLE (13 marka + Diğer)
UPDATE survey_questions 
SET question_config = '{
    "type": "basket_dynamic",
    "basket_label": "Kulaklık Sepeti",
    "basket_count_label": "Toplam Sepet Sayısı",
    "brands": ["Philips", "Ugreen", "JBL", "Anker", "Baseus", "Ttec", "Cellurline", "Shokz", "Fresh''N Rebul", "Sennheiser", "Huawei", "Momax", "Piili", "Diğer"],
    "fields": [
        {"name": "brand", "label": "Marka", "type": "select", "required": true},
        {"name": "artikel", "label": "Artikel No", "type": "text", "required": true},
        {"name": "product_name", "label": "Ürün Adı", "type": "text", "required": true},
        {"name": "is_our_product", "label": "Bizim Ürün", "type": "checkbox", "required": false}
    ],
    "our_brands": []
}'::jsonb
WHERE question_type = 'basket_dynamic' AND survey_id IN (SELECT id FROM surveys WHERE status = 'active');

-- 5. GÜNCELLEME SONRASI KONTROL
SELECT 
    s.id,
    s.title,
    sq.question_type,
    sq.question_order,
    CASE 
        WHEN sq.question_type = 'promoter_count' THEN jsonb_array_length(sq.question_config->'options')
        WHEN sq.question_type = 'investment_area' THEN jsonb_array_length(sq.question_config->'brands')
        WHEN sq.question_type = 'basket_dynamic' THEN jsonb_array_length(sq.question_config->'brands')
        ELSE 0
    END as marka_seçenek_sayisi,
    sq.question_config
FROM surveys s
JOIN survey_questions sq ON s.id = sq.survey_id
WHERE s.status = 'active'
ORDER BY s.id, sq.question_order;

-- ============================================
-- BAŞARILI! 
-- Tüm sorularda 13 marka + Diğer seçeneği var.
-- ============================================
