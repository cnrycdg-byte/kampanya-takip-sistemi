-- ============================================
-- SURVEYS TABLOSU RLS POLİTİKALARINI DÜZELT
-- ============================================
-- Bu script surveys tablosu için RLS politikalarını kontrol eder ve eksikse ekler
-- ============================================

-- 1. RLS'nin aktif olup olmadığını kontrol et ve aktif et
DO $$ 
BEGIN
    -- RLS'yi aktif et (eğer kapalıysa)
    ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS aktif edildi';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'RLS zaten aktif veya hata: %', SQLERRM;
END $$;

-- 2. Mevcut politikaları temizle
DROP POLICY IF EXISTS "Authenticated users can view surveys" ON surveys;
DROP POLICY IF EXISTS "Authenticated users can insert surveys" ON surveys;
DROP POLICY IF EXISTS "Authenticated users can update surveys" ON surveys;
DROP POLICY IF EXISTS "Authenticated users can delete surveys" ON surveys;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON surveys;
DROP POLICY IF EXISTS "Admin ve Manager tüm anketleri görebilir" ON surveys;
DROP POLICY IF EXISTS "Admin anket oluşturabilir" ON surveys;

-- 3. Yeni politikaları oluştur
-- SELECT politikası - Tüm authenticated kullanıcılar görebilir
CREATE POLICY "Authenticated users can view surveys" ON surveys
    FOR SELECT 
    TO authenticated
    USING (true);

-- INSERT politikası - Tüm authenticated kullanıcılar ekleyebilir
CREATE POLICY "Authenticated users can insert surveys" ON surveys
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- UPDATE politikası - Tüm authenticated kullanıcılar güncelleyebilir
CREATE POLICY "Authenticated users can update surveys" ON surveys
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- DELETE politikası - Tüm authenticated kullanıcılar silebilir
CREATE POLICY "Authenticated users can delete surveys" ON surveys
    FOR DELETE 
    TO authenticated
    USING (true);

-- 4. Kontrol sorgusu - Mevcut politikaları listele
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'surveys'
ORDER BY policyname;

-- 5. RLS durumunu kontrol et
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'surveys';

-- ============================================
-- BAŞARILI! ✅
-- ============================================
-- Surveys tablosu için RLS politikaları oluşturuldu/güncellendi.
-- Artık authenticated kullanıcılar anket oluşturabilir.
-- ============================================

