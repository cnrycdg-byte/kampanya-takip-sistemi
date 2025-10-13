-- ADIM ADIM YENİ ANKET OLUŞTURMA
-- Bu script güvenli şekilde adım adım çalışır

-- 1. ÖNCE MEVCUT ANKETLERİ KONTROL ET
SELECT id, title, month, year, status FROM surveys ORDER BY id DESC LIMIT 5;

-- 2. YENİ ANKET OLUŞTUR
INSERT INTO surveys (title, description, month, year, status, created_by)
VALUES (
    'Test Anketi - Düzeltilmiş Sepet Sistemi',
    'Alt grup sorunu düzeltilmiş anket',
    10,
    2025,
    'active',
    1
)
RETURNING id;

-- 3. YUKARIDAKİ SORGU SONUCUNDAN DÖNEN ID'Yİ KULLAN
-- Örnek: Eğer ID=9 döndüyse, aşağıdaki script'te 9 kullanın

-- 4. PROMOTÖR SORUSU EKLE (ID'yi manuel güncelleyin)
INSERT INTO survey_questions (
    survey_id, 
    question_text, 
    question_type, 
    question_order, 
    question_config, 
    is_required
) VALUES (
    (SELECT MAX(id) FROM surveys), -- En son oluşturulan anket ID'sini al
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
            {"label": "Fresh''N Rebul", "value": "fresh_n_rebul"},
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

-- 5. YATIRIM ALANI SORUSU EKLE
INSERT INTO survey_questions (
    survey_id, 
    question_text, 
    question_type, 
    question_order, 
    question_config, 
    is_required
) VALUES (
    (SELECT MAX(id) FROM surveys),
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
        "max_photos": 5
    }'::jsonb,
    true
);

-- 6. DÜZELTİLMİŞ SEPET SORUSU EKLE
INSERT INTO survey_questions (
    survey_id, 
    question_text, 
    question_type, 
    question_order, 
    question_config, 
    is_required
) VALUES (
    (SELECT MAX(id) FROM surveys),
    'Mağazanızdaki sepetleri ekleyiniz (Kulaklık ve GSM Aksesuar)',
    'basket_dynamic',
    3,
    '{
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
    }'::jsonb,
    false
);

-- 7. OLUŞTURULAN ANKETİ KONTROL ET
SELECT 
    s.id,
    s.title,
    sq.question_order,
    sq.question_type,
    sq.question_config->'upper_groups' as upper_groups_config
FROM surveys s
JOIN survey_questions sq ON s.id = sq.survey_id
WHERE s.title = 'Test Anketi - Düzeltilmiş Sepet Sistemi'
ORDER BY sq.question_order;
