-- ============================================
-- KAMPANYA TAKİP SİSTEMİ - ANKET MODÜLLERİ
-- ============================================
-- Oluşturulma Tarihi: 2025-10-09
-- Modüller: Anket Sistemi, Fiyat Takibi, Raporlama
-- ============================================

-- ============================================
-- 1. ANKET ŞABLONLARİ (SURVEYS)
-- ============================================
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

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
CREATE INDEX IF NOT EXISTS idx_surveys_month_year ON surveys(month, year);

-- Yorum
COMMENT ON TABLE surveys IS 'Aylık anket şablonları - Her ay için bir anket oluşturulur';
COMMENT ON COLUMN surveys.status IS 'draft: Taslak, active: Aktif, completed: Tamamlandı, archived: Arşivlendi';

-- ============================================
-- 2. ANKET SORULARI (SURVEY_QUESTIONS)
-- ============================================
CREATE TABLE IF NOT EXISTS survey_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN (
        'promoter_count',        -- Promotör sayısı (marka + sayı)
        'investment_area',       -- Yatırım alanı (stand + fotoğraf)
        'basket_dynamic',        -- Dinamik sepet sistemi
        'multiple_choice',       -- Çoktan seçmeli
        'text',                  -- Metin cevap
        'number',                -- Sayısal cevap
        'photo',                 -- Sadece fotoğraf
        'yes_no'                 -- Evet/Hayır
    )),
    question_order INTEGER NOT NULL,
    question_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_required BOOLEAN DEFAULT true,
    help_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_survey_questions_survey ON survey_questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_order ON survey_questions(survey_id, question_order);

-- Yorum
COMMENT ON TABLE survey_questions IS 'Anket soruları - Her anketin soruları burada tanımlanır';
COMMENT ON COLUMN survey_questions.question_config IS 'Soru konfigürasyonu (JSON): options, brands, models, photo_config vb.';

-- ============================================
-- 3. ANKET CEVAPLARI (SURVEY_RESPONSES)
-- ============================================
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
    
    -- Unique constraint: Her mağaza her ankete sadece bir kez cevap verebilir
    CONSTRAINT unique_store_survey UNIQUE(survey_id, store_id)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_store ON survey_responses(store_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_user ON survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_status ON survey_responses(status);

-- Yorum
COMMENT ON TABLE survey_responses IS 'Anket yanıtları - Her mağazanın anket yanıt başlığı';

-- ============================================
-- 4. ANKET CEVAP DETAYLARI (SURVEY_ANSWERS)
-- ============================================
CREATE TABLE IF NOT EXISTS survey_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
    answer_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    photos TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: Her soruda sadece bir cevap
    CONSTRAINT unique_response_question UNIQUE(response_id, question_id)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_survey_answers_response ON survey_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_survey_answers_question ON survey_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_survey_answers_data ON survey_answers USING GIN (answer_data);

-- Yorum
COMMENT ON TABLE survey_answers IS 'Anket cevap detayları - Her sorunun cevabı burada saklanır';
COMMENT ON COLUMN survey_answers.answer_data IS 'Cevap verisi (JSON): Promotör sayıları, sepet detayları, yatırım alanları vb.';
COMMENT ON COLUMN survey_answers.photos IS 'Fotoğraf URL dizisi - Supabase storage linkleri';

-- ============================================
-- 5. RAKIP FIYAT TAKİBİ (COMPETITOR_PRICE_TRACKING)
-- ============================================
CREATE TABLE IF NOT EXISTS competitor_price_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Rakip Bilgileri
    competitor_brand TEXT NOT NULL,
    competitor_product TEXT NOT NULL,
    competitor_artikel TEXT,
    competitor_price DECIMAL(10,2) NOT NULL,
    
    -- Bizim Ürün Bilgileri
    our_brand TEXT NOT NULL,
    our_product TEXT NOT NULL,
    our_artikel TEXT,
    our_price DECIMAL(10,2) NOT NULL,
    
    -- Hesaplanan Değerler
    price_difference DECIMAL(10,2) GENERATED ALWAYS AS (our_price - competitor_price) STORED,
    price_difference_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN competitor_price > 0 THEN ROUND(((our_price - competitor_price) / competitor_price * 100)::numeric, 2)
            ELSE 0
        END
    ) STORED,
    
    -- Notlar
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_competitor_price_date ON competitor_price_tracking(date);
CREATE INDEX IF NOT EXISTS idx_competitor_price_store ON competitor_price_tracking(store_id);
CREATE INDEX IF NOT EXISTS idx_competitor_price_brand ON competitor_price_tracking(competitor_brand);
CREATE INDEX IF NOT EXISTS idx_competitor_price_date_store ON competitor_price_tracking(date, store_id);

-- Yorum
COMMENT ON TABLE competitor_price_tracking IS 'Rakip fiyat takibi - Günlük fiyat aksiyonları';
COMMENT ON COLUMN competitor_price_tracking.price_difference IS 'Fiyat farkı (Bizim fiyat - Rakip fiyat) - Otomatik hesaplanır';
COMMENT ON COLUMN competitor_price_tracking.price_difference_percentage IS 'Yüzdesel fark - Otomatik hesaplanır';

-- ============================================
-- 6. MARKA TANIMLARI (BRANDS)
-- ============================================
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    is_our_brand BOOLEAN DEFAULT false,
    logo_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    category TEXT, -- 'headphone', 'speaker', 'charger', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_brands_status ON brands(status);
CREATE INDEX IF NOT EXISTS idx_brands_category ON brands(category);

-- Yorum
COMMENT ON TABLE brands IS 'Marka tanımları - Anketlerde kullanılacak marka listesi';
COMMENT ON COLUMN brands.is_our_brand IS 'Bizim markamız mı? (Sepet oranı hesabında kullanılır)';

-- ============================================
-- 7. MARKA LİSTESİNİ DOLDUR (ÖRNEK VERİ)
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
-- 8. RLS (ROW LEVEL SECURITY) POLİCİES
-- ============================================

-- Surveys
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin ve Manager tüm anketleri görebilir"
ON surveys FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'manager')
    )
);

CREATE POLICY "Admin anket oluşturabilir"
ON surveys FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);

-- Survey Questions
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes soruları görebilir"
ON survey_questions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin soru oluşturabilir"
ON survey_questions FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);

-- Survey Responses
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kullanıcılar kendi mağazalarının cevaplarını görebilir"
ON survey_responses FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'manager')
    )
);

CREATE POLICY "Employee kendi mağazası için cevap oluşturabilir"
ON survey_responses FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

CREATE POLICY "Kullanıcılar kendi cevaplarını güncelleyebilir"
ON survey_responses FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Survey Answers
ALTER TABLE survey_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kullanıcılar kendi cevap detaylarını görebilir"
ON survey_answers FOR SELECT
TO authenticated
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

CREATE POLICY "Kullanıcılar cevap detayı oluşturabilir"
ON survey_answers FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM survey_responses 
        WHERE survey_responses.id = response_id 
        AND survey_responses.user_id = auth.uid()
    )
);

CREATE POLICY "Kullanıcılar kendi cevap detaylarını güncelleyebilir"
ON survey_answers FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM survey_responses 
        WHERE survey_responses.id = survey_answers.response_id 
        AND survey_responses.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM survey_responses 
        WHERE survey_responses.id = survey_answers.response_id 
        AND survey_responses.user_id = auth.uid()
    )
);

-- Competitor Price Tracking
ALTER TABLE competitor_price_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kullanıcılar fiyat verilerini görebilir"
ON competitor_price_tracking FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'manager')
    )
);

CREATE POLICY "Employee fiyat girişi yapabilir"
ON competitor_price_tracking FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Brands
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes markaları görebilir"
ON brands FOR SELECT
TO authenticated
USING (status = 'active');

CREATE POLICY "Admin marka ekleyebilir"
ON brands FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);

-- ============================================
-- 9. FUNCTIONS & TRIGGERS
-- ============================================

-- Updated_at otomatik güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'lar
DROP TRIGGER IF EXISTS update_surveys_updated_at ON surveys;
CREATE TRIGGER update_surveys_updated_at
    BEFORE UPDATE ON surveys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_survey_responses_updated_at ON survey_responses;
CREATE TRIGGER update_survey_responses_updated_at
    BEFORE UPDATE ON survey_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_survey_answers_updated_at ON survey_answers;
CREATE TRIGGER update_survey_answers_updated_at
    BEFORE UPDATE ON survey_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_competitor_price_updated_at ON competitor_price_tracking;
CREATE TRIGGER update_competitor_price_updated_at
    BEFORE UPDATE ON competitor_price_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. VIEW'LER - RAPORLAMA İÇİN
-- ============================================

-- View 1: Promotör Raporu (Mağaza x Marka)
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

COMMENT ON VIEW v_promoter_report IS 'Promotör raporu - Mağaza bazında marka promotör sayıları';

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

COMMENT ON VIEW v_basket_report IS 'Sepet raporu - Mağaza bazında sepet dağılımı';

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

COMMENT ON VIEW v_investment_area_report IS 'Yatırım alanı raporu - Duvar/stand fotoğrafları ile';

-- ============================================
-- 11. ÖRNEK VERİ - TEST İÇİN
-- ============================================

-- Örnek Anket Oluştur
DO $$
DECLARE
    v_survey_id UUID;
    v_question1_id UUID;
    v_question2_id UUID;
    v_question3_id UUID;
    v_admin_id UUID;
BEGIN
    -- Admin kullanıcı ID'sini al
    SELECT id INTO v_admin_id FROM users WHERE role = 'admin' LIMIT 1;
    
    IF v_admin_id IS NOT NULL THEN
        -- Anket oluştur
        INSERT INTO surveys (title, description, month, year, status, created_by)
        VALUES (
            'Mart 2025 Aylık Anket',
            'Mağaza analizi ve rakip izleme anketi',
            3, 2025, 'active', v_admin_id
        )
        RETURNING id INTO v_survey_id;
        
        -- Soru 1: Promotör Sayıları
        INSERT INTO survey_questions (survey_id, question_text, question_type, question_order, question_config)
        VALUES (
            v_survey_id,
            'Mağazanızda sizden başka hangi markaların promotörleri bulunmaktadır?',
            'promoter_count',
            1,
            '{
                "type": "multiple_choice_with_count",
                "options": [
                    {"label": "JBL", "value": "jbl"},
                    {"label": "Baseus", "value": "baseus"},
                    {"label": "Anker", "value": "anker"},
                    {"label": "Ttec", "value": "ttec"},
                    {"label": "Sony", "value": "sony"},
                    {"label": "Samsung", "value": "samsung"},
                    {"label": "Diğer", "value": "other", "allow_custom": true}
                ],
                "count_field": true,
                "count_label": "Kişi Sayısı"
            }'::jsonb
        )
        RETURNING id INTO v_question1_id;
        
        -- Soru 2: Yatırım Alanları
        INSERT INTO survey_questions (survey_id, question_text, question_type, question_order, question_config)
        VALUES (
            v_survey_id,
            'Mağazanızda bulunan duvar standı veya orta alan standı olan markaları seçin ve fotoğraflarını yükleyiniz',
            'investment_area',
            2,
            '{
                "type": "investment_area",
                "categories": [
                    {"label": "Duvar Standı", "value": "wall"},
                    {"label": "Orta Alan Standı", "value": "middle"},
                    {"label": "Diğer", "value": "other", "allow_custom": true}
                ],
                "brands": ["JBL", "Baseus", "Anker", "Ttec", "Sony", "Samsung"],
                "photo_required": true,
                "max_photos": 5,
                "photo_label": "Standın fotoğraflarını yükleyin"
            }'::jsonb
        )
        RETURNING id INTO v_question2_id;
        
        -- Soru 3: Sepet Analizi
        INSERT INTO survey_questions (survey_id, question_text, question_type, question_order, question_config)
        VALUES (
            v_survey_id,
            'Mağazanızda kulaklık ürünlerinin bulunduğu sepet sayısını giriniz ve detaylarını doldurunuz',
            'basket_dynamic',
            3,
            '{
                "type": "basket_dynamic",
                "basket_label": "Kulaklık Sepeti",
                "basket_count_label": "Toplam Sepet Sayısı",
                "brands": ["JBL", "Baseus", "Anker", "Ttec", "Sony", "Samsung", "Apple", "Xiaomi", "Diğer"],
                "fields": [
                    {"name": "brand", "label": "Marka", "type": "select", "required": true},
                    {"name": "artikel", "label": "Artikel No", "type": "text", "required": true},
                    {"name": "product_name", "label": "Ürün Adı", "type": "text", "required": true},
                    {"name": "is_our_product", "label": "Bizim Ürün", "type": "checkbox", "required": false}
                ],
                "our_brands": []
            }'::jsonb
        )
        RETURNING id INTO v_question3_id;
        
        RAISE NOTICE 'Örnek anket oluşturuldu: %', v_survey_id;
        RAISE NOTICE 'Soru 1: %', v_question1_id;
        RAISE NOTICE 'Soru 2: %', v_question2_id;
        RAISE NOTICE 'Soru 3: %', v_question3_id;
    ELSE
        RAISE NOTICE 'Admin kullanıcı bulunamadı, örnek veri oluşturulamadı';
    END IF;
END $$;

-- ============================================
-- 12. STORAGE BUCKET OLUŞTURMA
-- ============================================
-- Not: Bu komut Supabase Dashboard'dan çalıştırılmalı
-- Bucket adı: 'survey-photos'
-- Public: false (sadece authenticated kullanıcılar erişebilir)

-- Storage policies (Supabase Dashboard'dan eklenecek)
-- 1. INSERT: authenticated kullanıcılar yükleyebilir
-- 2. SELECT: authenticated kullanıcılar görüntüleyebilir
-- 3. DELETE: sadece admin silebilir

-- ============================================
-- KURULUM TAMAMLANDI! 🎉
-- ============================================
-- Sonraki adımlar:
-- 1. Bu SQL'i Supabase SQL Editor'de çalıştırın
-- 2. Storage bucket'ı oluşturun: 'survey-photos'
-- 3. Frontend kodlarını deploy edin
-- ============================================

