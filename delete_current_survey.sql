-- ============================================
-- MEVCUT ANKETİ SİL VE YENİDEN OLUŞTUR
-- ============================================

-- 1. Mevcut anketi ve tüm verilerini sil
DELETE FROM survey_answers WHERE response_id IN (SELECT id FROM survey_responses WHERE survey_id = 2);
DELETE FROM survey_responses WHERE survey_id = 2;
DELETE FROM survey_questions WHERE survey_id = 2;
DELETE FROM surveys WHERE id = 2;

-- 2. Brands tablosundaki markaları kontrol et
SELECT COUNT(*) as toplam_marka FROM brands;
SELECT name FROM brands ORDER BY name;

-- 3. Yeni anket oluştur (brands tablosundan otomatik çekecek)
INSERT INTO surveys (title, description, month, year, status) 
VALUES ('Test Anketi - Ekim 2025 v3', 'Test anketi - Brands tablosundan otomatik', 10, 2025, 'active')
RETURNING id;

-- Bu ID'yi not alın (örneğin 3 çıktı diyelim)

-- 4. Brands tablosundan marka listesini al
SELECT string_agg('"' || name || '"', ',') as marka_listesi FROM brands ORDER BY name;

-- ============================================
-- ŞİMDİ TEST SAYFASINDAN YENİDEN OLUŞTURUN
-- ============================================
