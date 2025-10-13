-- ============================================
-- VARSAYILAN MARKALARI EKLE
-- ============================================

INSERT INTO brands (name, is_our_brand, status, category) VALUES
    ('JBL', false, 'active', 'audio'),
    ('Baseus', false, 'active', 'audio'),
    ('Anker', false, 'active', 'audio'),
    ('Ttec', false, 'active', 'audio'),
    ('Sony', false, 'active', 'audio'),
    ('Samsung', false, 'active', 'audio'),
    ('Apple', false, 'active', 'audio'),
    ('Xiaomi', false, 'active', 'audio'),
    ('Huawei', false, 'active', 'audio'),
    ('OnePlus', false, 'active', 'audio'),
    ('Oppo', false, 'active', 'audio'),
    ('Realme', false, 'active', 'audio')
ON CONFLICT (name) DO NOTHING;

-- Kontrol et
SELECT COUNT(*) as total_brands FROM brands;
SELECT name FROM brands ORDER BY name;

