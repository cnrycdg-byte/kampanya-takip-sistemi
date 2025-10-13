-- ============================================
-- GSM AKSESUAR SORUSU EKLE VE BİZİM ÜRÜN KUTUCUĞUNU KALDIR
-- ============================================

-- 1. Mevcut anket ID'sini bul
SELECT 
    s.id,
    s.title,
    COUNT(sq.id) as soru_sayisi
FROM surveys s
LEFT JOIN survey_questions sq ON s.id = sq.survey_id
WHERE s.status = 'active'
GROUP BY s.id, s.title
ORDER BY s.id DESC;

-- 2. GSM Aksesuar sorusunu ekle (ID'yi yukarıdaki sonuçtan alın)
INSERT INTO survey_questions (survey_id, question_text, question_type, question_order, question_config, is_required) 
VALUES (
    7, -- YUKARIDAKİ ANKET ID'SİNİ BURAYA YAZIN
    'Mağazanızda kaç adet GSM aksesuar sepeti bulunmaktadır?',
    'gsm_accessory_basket',
    4,
    '{
        "type": "gsm_accessory_basket",
        "basket_label": "GSM Aksesuar Sepeti",
        "basket_count_label": "Toplam GSM Aksesuar Sepeti Sayısı",
        "brands": ["Philips", "Ugreen", "JBL", "Anker", "Baseus", "Ttec", "Cellurline", "Shokz", "Fresh''N Rebul", "Sennheiser", "Huawei", "Momax", "Piili", "Diğer"],
        "fields": [
            {"name": "brand", "label": "Marka", "type": "select", "required": true},
            {"name": "artikel", "label": "Artikel No", "type": "text", "required": true},
            {"name": "product_name", "label": "Ürün Adı", "type": "text", "required": true},
            {"name": "price", "label": "Fiyat (TL)", "type": "number", "required": true}
        ]
    }'::jsonb,
    true
);

-- 3. Sepet sorusundan "Bizim Ürün" kutucuğunu kaldır
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
        {"name": "price", "label": "Fiyat (TL)", "type": "number", "required": true}
    ]
}'::jsonb
WHERE question_type = 'basket_dynamic' 
AND survey_id = 7; -- YUKARIDAKİ ANKET ID'SİNİ BURAYA YAZIN

-- 4. Kontrol et
SELECT 
    sq.question_type,
    sq.question_order,
    sq.question_text,
    jsonb_pretty(sq.question_config) as config
FROM survey_questions sq
JOIN surveys s ON sq.survey_id = s.id
WHERE s.id = 7 -- YUKARIDAKİ ANKET ID'SİNİ BURAYA YAZIN
ORDER BY sq.question_order;

-- ============================================
-- BAŞARILI! 
-- GSM Aksesuar sorusu eklendi, "Bizim Ürün" kutucukları kaldırıldı.
-- ============================================
