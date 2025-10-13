-- Survey Store Assignments tablosu oluştur
CREATE TABLE IF NOT EXISTS survey_store_assignments (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: bir anket bir mağazaya sadece bir kez atanabilir
    UNIQUE(survey_id, store_id)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_survey_store_assignments_survey_id ON survey_store_assignments(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_store_assignments_store_id ON survey_store_assignments(store_id);

-- RLS politikaları
ALTER TABLE survey_store_assignments ENABLE ROW LEVEL SECURITY;

-- Tüm authenticated kullanıcılar için izin ver
CREATE POLICY "Enable all operations for authenticated users" ON survey_store_assignments
    FOR ALL USING (true) WITH CHECK (true);

-- Mevcut anketlere tüm mağazaları ata
INSERT INTO survey_store_assignments (survey_id, store_id)
SELECT DISTINCT 
    s.id as survey_id,
    st.id as store_id
FROM surveys s
CROSS JOIN stores st
WHERE s.id IN (
    SELECT DISTINCT survey_id 
    FROM survey_responses 
    WHERE survey_id IS NOT NULL
)
ON CONFLICT (survey_id, store_id) DO NOTHING;

-- Sonuçları kontrol et
SELECT 
    s.title as anket_adi,
    COUNT(ssa.store_id) as atanan_mağaza_sayisi,
    COUNT(sr.store_id) as anket_başlatan_sayisi,
    COUNT(CASE WHEN sr.status = 'completed' THEN 1 END) as tamamlayan_sayisi
FROM surveys s
LEFT JOIN survey_store_assignments ssa ON s.id = ssa.survey_id
LEFT JOIN survey_responses sr ON s.id = sr.survey_id
GROUP BY s.id, s.title
ORDER BY s.id;
