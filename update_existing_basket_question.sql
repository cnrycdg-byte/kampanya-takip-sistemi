-- MEVCUT ANKET SORUSUNU GÜNCELLE
-- Bu script mevcut basket_dynamic sorularının config'ini günceller

-- Önce mevcut anketleri kontrol et
SELECT 
    sq.id,
    sq.question_type,
    sq.question_config,
    s.title as survey_title
FROM survey_questions sq
JOIN surveys s ON sq.survey_id = s.id
WHERE sq.question_type = 'basket_dynamic'
ORDER BY sq.id DESC;

-- Mevcut basket_dynamic sorularını güncelle
UPDATE survey_questions 
SET question_config = '{
    "type": "dynamic_basket",
    "basket_label": "Sepet",
    "basket_count_label": "Sepet Sayısı",
    "basket_types": [
        {"label": "Büyük boy Sepet", "value": "large_basket"},
        {"label": "Basket Sepet", "value": "basket"}
    ],
    "upper_groups": [
        {
            "label": "Kulaklık", 
            "value": "headphone",
            "lower_groups": [
                {"label": "Kulak İçi Kulaklık", "value": "in_ear"},
                {"label": "Kafa Bantlı Kulaklık", "value": "over_ear"},
                {"label": "TWS Kulaklık", "value": "tws"}
            ]
        },
        {
            "label": "GSM Aksesuar", 
            "value": "gsm_accessory",
            "lower_groups": [
                {"label": "Duvar Adaptörü", "value": "wall_adapter"},
                {"label": "Powerbank", "value": "powerbank"},
                {"label": "Araç İçi Tutucu", "value": "car_holder"},
                {"label": "Çakmak Şarj Aleti", "value": "car_charger"},
                {"label": "Kablo", "value": "cable"},
                {"label": "Diğer", "value": "other"}
            ]
        }
    ],
    "brands": ["Philips", "Ugreen", "JBL", "Anker", "Baseus", "Ttec", "Cellurline", "Shokz", "Fresh''N Rebul", "Sennheiser", "Huawei", "Momax", "Piili", "Diğer"],
    "fields": [
        {"name": "product_name", "label": "Ürün Adı", "type": "text", "required": true},
        {"name": "artikel", "label": "Artikel No", "type": "text", "required": true},
        {"name": "price", "label": "Fiyat", "type": "number", "required": true}
    ]
}'::jsonb
WHERE question_type = 'basket_dynamic';

-- Güncellenmiş konfigürasyonu kontrol et
SELECT 
    sq.id,
    sq.question_type,
    sq.question_config->'upper_groups' as upper_groups_config,
    s.title as survey_title
FROM survey_questions sq
JOIN surveys s ON sq.survey_id = s.id
WHERE sq.question_type = 'basket_dynamic'
ORDER BY sq.id DESC;
