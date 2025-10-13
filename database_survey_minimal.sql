-- ============================================
-- MİNİMAL KURULUM - ANKET SİSTEMİ
-- Sadece gerekli tablolar
-- ============================================

-- 1. BRANDS TABLOSU
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year >= 2024),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
CREATE INDEX IF NOT EXISTS idx_surveys_month_year ON surveys(month, year);

-- 3. SURVEY_QUESTIONS TABLOSU
CREATE TABLE IF NOT EXISTS survey_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
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
-- RLS POLİCİES (GÜVENLİK)
-- ============================================

-- Brands
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes markaları görebilir" ON brands
    FOR SELECT TO authenticated
    USING (status = 'active');

CREATE POLICY "Admin marka ekleyebilir" ON brands
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Surveys
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin ve Manager anketleri görebilir" ON surveys
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admin anket oluşturabilir" ON surveys
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Survey Questions
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes soruları görebilir" ON survey_questions
    FOR SELECT TO authenticated
    USING (true);

-- Survey Responses
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kullanıcılar kendi cevaplarını görebilir" ON survey_responses
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Employee cevap oluşturabilir" ON survey_responses
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Kullanıcılar kendi cevaplarını güncelleyebilir" ON survey_responses
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- Survey Answers
ALTER TABLE survey_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kullanıcılar kendi cevap detaylarını görebilir" ON survey_answers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM survey_responses 
            WHERE survey_responses.id = survey_answers.response_id 
            AND (survey_responses.user_id = auth.uid() 
                 OR EXISTS (
                     SELECT 1 FROM users 
                     WHERE users.id = auth.uid() 
                     AND users.role IN ('admin', 'manager')
                 ))
        )
    );

CREATE POLICY "Kullanıcılar cevap detayı oluşturabilir" ON survey_answers
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM survey_responses 
            WHERE survey_responses.id = response_id 
            AND survey_responses.user_id = auth.uid()
        )
    );

-- Competitor Price Tracking
ALTER TABLE competitor_price_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kullanıcılar fiyat verilerini görebilir" ON competitor_price_tracking
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Employee fiyat girişi yapabilir" ON competitor_price_tracking
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- BAŞARILI! 🎉
-- ============================================
-- Tüm tablolar ve güvenlik ayarları oluşturuldu.
-- Şimdi test sayfasına dönüp "3. Marka Listesi" adımına geçebilirsiniz.
-- ============================================

