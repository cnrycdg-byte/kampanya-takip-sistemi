-- ============================================
-- UYUMLU KURULUM - ANKET SİSTEMİ
-- Mevcut users tablosuyla uyumlu (INTEGER ID)
-- ============================================

-- 1. BRANDS TABLOSU
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_our_brand BOOLEAN DEFAULT false,
    logo_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brands_status ON brands(status);
CREATE INDEX IF NOT EXISTS idx_brands_category ON brands(category);

-- 2. SURVEYS TABLOSU
CREATE TABLE IF NOT EXISTS surveys (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year >= 2024),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
CREATE INDEX IF NOT EXISTS idx_surveys_month_year ON surveys(month, year);

-- 3. SURVEY_QUESTIONS TABLOSU
CREATE TABLE IF NOT EXISTS survey_questions (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN (
        'promoter_count',
        'investment_area',
        'basket_dynamic',
        'multiple_choice',
        'text',
        'number',
        'photo',
        'yes_no'
    )),
    question_order INTEGER NOT NULL,
    question_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_required BOOLEAN DEFAULT true,
    help_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_questions_survey ON survey_questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_order ON survey_questions(survey_id, question_order);

-- 4. SURVEY_RESPONSES TABLOSU
CREATE TABLE IF NOT EXISTS survey_responses (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_store_survey UNIQUE(survey_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_store ON survey_responses(store_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_user ON survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_status ON survey_responses(status);

-- 5. SURVEY_ANSWERS TABLOSU
CREATE TABLE IF NOT EXISTS survey_answers (
    id SERIAL PRIMARY KEY,
    response_id INTEGER NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
    answer_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    photos TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_response_question UNIQUE(response_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_survey_answers_response ON survey_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_survey_answers_question ON survey_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_survey_answers_data ON survey_answers USING GIN (answer_data);

-- 6. COMPETITOR_PRICE_TRACKING TABLOSU
CREATE TABLE IF NOT EXISTS competitor_price_tracking (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    competitor_brand TEXT NOT NULL,
    competitor_product TEXT NOT NULL,
    competitor_artikel TEXT,
    competitor_price DECIMAL(10,2) NOT NULL,
    
    our_brand TEXT NOT NULL,
    our_product TEXT NOT NULL,
    our_artikel TEXT,
    our_price DECIMAL(10,2) NOT NULL,
    
    price_difference DECIMAL(10,2) GENERATED ALWAYS AS (our_price - competitor_price) STORED,
    price_difference_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN competitor_price > 0 THEN ROUND(((our_price - competitor_price) / competitor_price * 100)::numeric, 2)
            ELSE 0
        END
    ) STORED,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_price_date ON competitor_price_tracking(date);
CREATE INDEX IF NOT EXISTS idx_competitor_price_store ON competitor_price_tracking(store_id);
CREATE INDEX IF NOT EXISTS idx_competitor_price_brand ON competitor_price_tracking(competitor_brand);

-- ============================================
-- ÖRNEK MARKA VERİLERİ
-- ============================================
INSERT INTO brands (name, is_our_brand, status, category) VALUES
    ('JBL', false, 'active', 'audio'),
    ('Baseus', false, 'active', 'audio'),
    ('Anker', false, 'active', 'audio'),
    ('Ttec', false, 'active', 'audio'),
    ('Sony', false, 'active', 'audio'),
    ('Samsung', false, 'active', 'audio'),
    ('Apple', false, 'active', 'audio'),
    ('Xiaomi', false, 'active', 'audio')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- RLS POLİCİES (GÜVENLİK)
-- ============================================

-- Brands
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes markaları görebilir" ON brands;
CREATE POLICY "Herkes markaları görebilir" ON brands
    FOR SELECT TO authenticated
    USING (status = 'active');

DROP POLICY IF EXISTS "Admin marka ekleyebilir" ON brands;
CREATE POLICY "Admin marka ekleyebilir" ON brands
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::integer
            AND users.role = 'admin'
        )
    );

-- Surveys
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin ve Manager anketleri görebilir" ON surveys;
CREATE POLICY "Admin ve Manager anketleri görebilir" ON surveys
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::integer
            AND users.role IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Admin anket oluşturabilir" ON surveys;
CREATE POLICY "Admin anket oluşturabilir" ON surveys
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::integer
            AND users.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admin anket güncelleyebilir" ON surveys;
CREATE POLICY "Admin anket güncelleyebilir" ON surveys
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::integer
            AND users.role = 'admin'
        )
    );

-- Survey Questions
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes soruları görebilir" ON survey_questions;
CREATE POLICY "Herkes soruları görebilir" ON survey_questions
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin soru ekleyebilir" ON survey_questions;
CREATE POLICY "Admin soru ekleyebilir" ON survey_questions
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::integer
            AND users.role = 'admin'
        )
    );

-- Survey Responses
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kullanıcılar kendi cevaplarını görebilir" ON survey_responses;
CREATE POLICY "Kullanıcılar kendi cevaplarını görebilir" ON survey_responses
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()::integer
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::integer
            AND users.role IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Employee cevap oluşturabilir" ON survey_responses;
CREATE POLICY "Employee cevap oluşturabilir" ON survey_responses
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid()::integer);

DROP POLICY IF EXISTS "Kullanıcılar kendi cevaplarını güncelleyebilir" ON survey_responses;
CREATE POLICY "Kullanıcılar kendi cevaplarını güncelleyebilir" ON survey_responses
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid()::integer)
    WITH CHECK (user_id = auth.uid()::integer);

-- Survey Answers
ALTER TABLE survey_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kullanıcılar kendi cevap detaylarını görebilir" ON survey_answers;
CREATE POLICY "Kullanıcılar kendi cevap detaylarını görebilir" ON survey_answers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM survey_responses 
            WHERE survey_responses.id = survey_answers.response_id 
            AND (survey_responses.user_id = auth.uid()::integer
                 OR EXISTS (
                     SELECT 1 FROM users 
                     WHERE users.id = auth.uid()::integer
                     AND users.role IN ('admin', 'manager')
                 ))
        )
    );

DROP POLICY IF EXISTS "Kullanıcılar cevap detayı oluşturabilir" ON survey_answers;
CREATE POLICY "Kullanıcılar cevap detayı oluşturabilir" ON survey_answers
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM survey_responses 
            WHERE survey_responses.id = response_id 
            AND survey_responses.user_id = auth.uid()::integer
        )
    );

DROP POLICY IF EXISTS "Kullanıcılar kendi cevap detaylarını güncelleyebilir" ON survey_answers;
CREATE POLICY "Kullanıcılar kendi cevap detaylarını güncelleyebilir" ON survey_answers
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM survey_responses 
            WHERE survey_responses.id = survey_answers.response_id 
            AND survey_responses.user_id = auth.uid()::integer
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM survey_responses 
            WHERE survey_responses.id = survey_answers.response_id 
            AND survey_responses.user_id = auth.uid()::integer
        )
    );

-- Competitor Price Tracking
ALTER TABLE competitor_price_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kullanıcılar fiyat verilerini görebilir" ON competitor_price_tracking;
CREATE POLICY "Kullanıcılar fiyat verilerini görebilir" ON competitor_price_tracking
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()::integer
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::integer
            AND users.role IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Employee fiyat girişi yapabilir" ON competitor_price_tracking;
CREATE POLICY "Employee fiyat girişi yapabilir" ON competitor_price_tracking
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid()::integer);

-- ============================================
-- VIEW'LER - RAPORLAMA İÇİN
-- ============================================

-- View 1: Promotör Raporu
CREATE OR REPLACE VIEW v_promoter_report AS
SELECT 
    sr.survey_id,
    s.title as survey_title,
    s.month,
    s.year,
    st.id as store_id,
    st.name as store_name,
    st.channel_id,
    c.name as channel_name,
    st.region_id,
    r.name as region_name,
    sa.answer_data
FROM survey_responses sr
JOIN surveys s ON sr.survey_id = s.id
JOIN stores st ON sr.store_id = st.id
LEFT JOIN channels c ON st.channel_id = c.id
LEFT JOIN regions r ON st.region_id = r.id
JOIN survey_answers sa ON sr.id = sa.response_id
JOIN survey_questions sq ON sa.question_id = sq.id
WHERE sq.question_type = 'promoter_count'
AND sr.status = 'completed';

-- View 2: Sepet Raporu
CREATE OR REPLACE VIEW v_basket_report AS
SELECT 
    sr.survey_id,
    s.title as survey_title,
    s.month,
    s.year,
    st.id as store_id,
    st.name as store_name,
    st.channel_id,
    c.name as channel_name,
    st.region_id,
    r.name as region_name,
    sa.answer_data
FROM survey_responses sr
JOIN surveys s ON sr.survey_id = s.id
JOIN stores st ON sr.store_id = st.id
LEFT JOIN channels c ON st.channel_id = c.id
LEFT JOIN regions r ON st.region_id = r.id
JOIN survey_answers sa ON sr.id = sa.response_id
JOIN survey_questions sq ON sa.question_id = sq.id
WHERE sq.question_type = 'basket_dynamic'
AND sr.status = 'completed';

-- View 3: Yatırım Alanı Raporu
CREATE OR REPLACE VIEW v_investment_area_report AS
SELECT 
    sr.survey_id,
    s.title as survey_title,
    s.month,
    s.year,
    st.id as store_id,
    st.name as store_name,
    st.channel_id,
    c.name as channel_name,
    sa.answer_data,
    sa.photos
FROM survey_responses sr
JOIN surveys s ON sr.survey_id = s.id
JOIN stores st ON sr.store_id = st.id
LEFT JOIN channels c ON st.channel_id = c.id
JOIN survey_answers sa ON sr.id = sa.response_id
JOIN survey_questions sq ON sa.question_id = sq.id
WHERE sq.question_type = 'investment_area'
AND sr.status = 'completed';

-- ============================================
-- BAŞARILI! 🎉
-- ============================================
-- Tüm tablolar mevcut sisteminizle uyumlu olarak oluşturuldu!
-- 8 örnek marka da eklendi.
-- 
-- SONRAKİ ADIM:
-- Test sayfasına dönün ve "Kayıtlı Markaları Görüntüle" butonuna tıklayın.
-- ============================================

