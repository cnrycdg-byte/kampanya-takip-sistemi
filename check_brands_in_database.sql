-- Veritabanındaki markaları kontrol et
SELECT id, name, created_at 
FROM brands 
ORDER BY name;

-- Toplam marka sayısı
SELECT COUNT(*) as total_brands FROM brands;
