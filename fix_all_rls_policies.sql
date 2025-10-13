-- ============================================
-- TÜM RLS POLİCY'LERİ DÜZELT
-- Test ortamı için basitleştirilmiş
-- ============================================

-- 1. BRANDS - Tüm işlemler serbest
DROP POLICY IF EXISTS "Anyone can view brands" ON brands;
DROP POLICY IF EXISTS "Anyone can insert brands" ON brands;
DROP POLICY IF EXISTS "Authenticated users can insert brands" ON brands;
DROP POLICY IF EXISTS "Anyone can view active brands" ON brands;

CREATE POLICY "Enable all for brands" ON brands
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- 2. SURVEYS - Tüm işlemler serbest
DROP POLICY IF EXISTS "Authenticated users can view surveys" ON surveys;
DROP POLICY IF EXISTS "Authenticated users can insert surveys" ON surveys;
DROP POLICY IF EXISTS "Authenticated users can update surveys" ON surveys;

CREATE POLICY "Enable all for surveys" ON surveys
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- 3. SURVEY_QUESTIONS - Tüm işlemler serbest
DROP POLICY IF EXISTS "Authenticated users can view questions" ON survey_questions;
DROP POLICY IF EXISTS "Authenticated users can insert questions" ON survey_questions;

CREATE POLICY "Enable all for survey_questions" ON survey_questions
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- 4. SURVEY_RESPONSES - Tüm işlemler serbest
DROP POLICY IF EXISTS "Authenticated users can view responses" ON survey_responses;
DROP POLICY IF EXISTS "Authenticated users can insert responses" ON survey_responses;
DROP POLICY IF EXISTS "Authenticated users can update responses" ON survey_responses;

CREATE POLICY "Enable all for survey_responses" ON survey_responses
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- 5. SURVEY_ANSWERS - Tüm işlemler serbest
DROP POLICY IF EXISTS "Authenticated users can view answers" ON survey_answers;
DROP POLICY IF EXISTS "Authenticated users can insert answers" ON survey_answers;
DROP POLICY IF EXISTS "Authenticated users can update answers" ON survey_answers;

CREATE POLICY "Enable all for survey_answers" ON survey_answers
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- 6. COMPETITOR_PRICE_TRACKING - Tüm işlemler serbest
DROP POLICY IF EXISTS "Authenticated users can view prices" ON competitor_price_tracking;
DROP POLICY IF EXISTS "Authenticated users can insert prices" ON competitor_price_tracking;

CREATE POLICY "Enable all for competitor_price_tracking" ON competitor_price_tracking
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- ============================================
-- MEVCUT MARKALARI TEMİZLE (Opsiyonel)
-- ============================================
TRUNCATE TABLE brands RESTART IDENTITY CASCADE;

-- ============================================
-- BAŞARILI! 🎉
-- Artık tüm tablolara herkes erişebilir.
-- Test sayfasından marka ve anket oluşturabilirsiniz.
-- ============================================

