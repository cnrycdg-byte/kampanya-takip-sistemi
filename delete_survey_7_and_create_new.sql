-- ============================================
-- ANKET ID 7'Yİ SİL VE YENİ OLUŞTUR
-- ============================================

-- 1. Anket ID 7'yi tamamen sil
DELETE FROM survey_answers 
WHERE response_id IN (SELECT id FROM survey_responses WHERE survey_id = 7);

DELETE FROM survey_responses WHERE survey_id = 7;
DELETE FROM survey_questions WHERE survey_id = 7;
DELETE FROM surveys WHERE id = 7;

-- 2. Yeni anket oluştur
INSERT INTO surveys (title, description, month, year, status) 
VALUES ('Test Anketi - Ekim 2025 v7', 'Test anketi - 13 marka ile', 10, 2025, 'active')
RETURNING id;

-- Bu ID'yi not alın (örneğin 9 çıktı diyelim)

-- 3. SORU 1: Promotör Sayısı (13 marka)
INSERT INTO survey_questions (survey_id, question_text, question_type, question_order, question_config, is_required) 
VALUES (
    9, -- YUKARIDAKİ ID'Yİ BURAYA YAZIN
    'Mağazanızda sizden başka hangi markaların promotörleri bulunmaktadır?',
    'promoter_count',
    1,
    '{
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
    }'::jsonb,
    true
);

-- 4. SORU 2: Yatırım Alanı (13 marka)
INSERT INTO survey_questions (survey_id, question_text, question_type, question_order, question_config, is_required) 
VALUES (
    9, -- YUKARIDAKİ ID'Yİ BURAYA YAZIN
    'Mağazanızda bulunan duvar standı veya orta alan standı olan markaları seçin ve fotoğraflarını yükleyiniz',
    'investment_area',
    2,
    '{
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
    }'::jsonb,
    true
);

-- 5. SORU 3: Sepet Analizi (13 marka)
INSERT INTO survey_questions (survey_id, question_text, question_type, question_order, question_config, is_required) 
VALUES (
    9, -- YUKARIDAKİ ID'Yİ BURAYA YAZIN
    'Mağazanızda kulaklık ürünlerinin bulunduğu sepet sayısını giriniz ve detaylarını doldurunuz',
    'basket_dynamic',
    3,
    '{
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
    }'::jsonb,
    true
);

-- 6. Kontrol et - sadece yeni anket kalmalı
SELECT 
    s.id,
    s.title,
    s.status,
    COUNT(sq.id) as soru_sayisi
FROM surveys s
LEFT JOIN survey_questions sq ON s.id = sq.survey_id
GROUP BY s.id, s.title, s.status
ORDER BY s.id;

-- 7. Yatırım alanı sorusunu detaylı kontrol et
SELECT 
    sq.question_type,
    jsonb_array_length(sq.question_config->'brands') as marka_sayisi,
    sq.question_config->'brands' as markalar
FROM survey_questions sq
WHERE sq.survey_id = 9 -- YUKARIDAKİ ID'Yİ BURAYA YAZIN
AND sq.question_type = 'investment_area';

-- ============================================
-- BAŞARILI! 
-- Artık sadece yeni anket var (ID 9).
-- ============================================
