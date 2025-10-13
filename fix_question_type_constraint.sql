-- ============================================
-- SORU TİPİ CONSTRAINT'İNİ GÜNCELLE
-- ============================================

-- 1. Mevcut constraint'i kontrol et
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'survey_questions'::regclass 
AND conname = 'survey_questions_question_type_check';

-- 2. Mevcut constraint'i sil
ALTER TABLE survey_questions 
DROP CONSTRAINT IF EXISTS survey_questions_question_type_check;

-- 3. Yeni constraint oluştur (gsm_accessory_basket dahil)
ALTER TABLE survey_questions 
ADD CONSTRAINT survey_questions_question_type_check 
CHECK (question_type IN (
    'promoter_count',
    'investment_area', 
    'basket_dynamic',
    'gsm_accessory_basket'
));

-- 4. GSM Aksesuar sorusunu ekle
INSERT INTO survey_questions (survey_id, question_text, question_type, question_order, question_config, is_required) 
VALUES (
    7, -- ANKET ID'SİNİ BURAYA YAZIN
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

-- 5. Sepet sorusundan "Bizim Ürün" kutucuğunu kaldır
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
AND survey_id = 7; -- ANKET ID'SİNİ BURAYA YAZIN

-- 6. Kontrol et
SELECT 
    sq.question_type,
    sq.question_order,
    sq.question_text,
    jsonb_pretty(sq.question_config) as config
FROM survey_questions sq
JOIN surveys s ON sq.survey_id = s.id
WHERE s.id = 7 -- ANKET ID'SİNİ BURAYA YAZIN
ORDER BY sq.question_order;

-- ============================================
-- BAŞARILI! 
-- Constraint güncellendi, GSM Aksesuar sorusu eklendi.
-- ============================================
