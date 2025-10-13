-- ============================================
-- ANKETİ YENİDEN OLUŞTUR (13 MARKA İLE)
-- ============================================

-- Önce mevcut anketi ve ilgili verileri sil
DELETE FROM survey_answers WHERE response_id IN (SELECT id FROM survey_responses WHERE survey_id = 2);
DELETE FROM survey_responses WHERE survey_id = 2;
DELETE FROM survey_questions WHERE survey_id = 2;
DELETE FROM surveys WHERE id = 2;

-- Yeni anket oluştur
INSERT INTO surveys (title, description, month, year, status) 
VALUES ('Test Anketi - Ekim 2025', 'Test anketi - 13 marka ile', 10, 2025, 'active')
RETURNING id;

-- Şimdi bu ID'yi not alın ve aşağıdaki survey_id değerlerini değiştirin
-- Örneğin ID = 3 çıktıysa, aşağıdaki tüm survey_id değerlerini 3 yapın

-- SORU 1: Promotör Sayısı (13 marka)
INSERT INTO survey_questions (survey_id, question_text, question_type, question_order, question_config, is_required) 
VALUES (
    3, -- YUKARIDAKİ ID'Yİ BURAYA YAZIN
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

-- SORU 2: Yatırım Alanı (13 marka)
INSERT INTO survey_questions (survey_id, question_text, question_type, question_order, question_config, is_required) 
VALUES (
    3, -- YUKARIDAKİ ID'Yİ BURAYA YAZIN
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

-- SORU 3: Sepet Analizi (13 marka)
INSERT INTO survey_questions (survey_id, question_text, question_type, question_order, question_config, is_required) 
VALUES (
    3, -- YUKARIDAKİ ID'Yİ BURAYA YAZIN
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

-- Kontrol et
SELECT s.id, s.title, COUNT(sq.id) as soru_sayisi
FROM surveys s
LEFT JOIN survey_questions sq ON s.id = sq.id
WHERE s.id = 3 -- YUKARIDAKİ ID'Yİ BURAYA YAZIN
GROUP BY s.id, s.title;

-- ============================================
-- BAŞARILI! 
-- Yeni anket oluşturuldu, 13 marka ile.
-- ============================================

