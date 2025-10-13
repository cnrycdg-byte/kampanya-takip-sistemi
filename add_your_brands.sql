-- ============================================
-- SİZİN MARKA LİSTENİZ
-- 13 marka ekleniyor
-- ============================================

INSERT INTO brands (name, is_our_brand, status, category) VALUES
    ('Philips', false, 'active', 'audio'),
    ('Ugreen', false, 'active', 'audio'),
    ('JBL', false, 'active', 'audio'),
    ('Anker', false, 'active', 'audio'),
    ('Baseus', false, 'active', 'audio'),
    ('Ttec', false, 'active', 'audio'),
    ('Cellurline', false, 'active', 'audio'),
    ('Shokz', false, 'active', 'audio'),
    ('Fresh''N Rebul', false, 'active', 'audio'),
    ('Sennheiser', false, 'active', 'audio'),
    ('Huawei', false, 'active', 'audio'),
    ('Momax', false, 'active', 'audio'),
    ('Piili', false, 'active', 'audio')
ON CONFLICT (name) DO NOTHING;

-- Kontrol et
SELECT COUNT(*) as total_brands FROM brands;

-- Tüm markaları göster
SELECT id, name, status, category 
FROM brands 
ORDER BY name;

-- ============================================
-- BAŞARILI! 
-- 13 marka eklendi.
-- ============================================

