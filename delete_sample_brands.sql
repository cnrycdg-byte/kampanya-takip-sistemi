-- ============================================
-- ÖRNEK MARKALARI SİL
-- ============================================

-- Brands tablosunu temizle
TRUNCATE TABLE brands RESTART IDENTITY CASCADE;

-- RLS policy'yi düzelt (INSERT için)
DROP POLICY IF EXISTS "Authenticated users can insert brands" ON brands;
DROP POLICY IF EXISTS "Anyone can view active brands" ON brands;

-- Yeni basit policy'ler
CREATE POLICY "Anyone can view brands" ON brands
    FOR SELECT 
    USING (true);

CREATE POLICY "Anyone can insert brands" ON brands
    FOR INSERT 
    WITH CHECK (true);

-- ============================================
-- BAŞARILI! 
-- Artık test sayfasından marka ekleyebilirsiniz.
-- ============================================

