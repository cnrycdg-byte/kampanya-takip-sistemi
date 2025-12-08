-- ============================================
-- SURVEYS TABLOSUNA EKSİK ALANLARI EKLE
-- ============================================
-- Bu script surveys tablosuna assignment_type ve personnel_status alanlarını ekler
-- ============================================

-- 1. assignment_type alanını ekle
-- Değerler: 'all' (tüm mağazalar), 'personnel' (sadece personeli olan/olmayan mağazalar)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'surveys' 
        AND column_name = 'assignment_type'
    ) THEN
        ALTER TABLE surveys 
        ADD COLUMN assignment_type TEXT DEFAULT 'all' 
        CHECK (assignment_type IN ('all', 'personnel'));
        
        RAISE NOTICE 'assignment_type alanı eklendi';
    ELSE
        RAISE NOTICE 'assignment_type alanı zaten mevcut';
    END IF;
END $$;

-- 2. personnel_status alanını ekle
-- Değerler: 'has_personnel' (personeli olan), 'no_personnel' (personeli olmayan), NULL (tümü)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'surveys' 
        AND column_name = 'personnel_status'
    ) THEN
        ALTER TABLE surveys 
        ADD COLUMN personnel_status TEXT 
        CHECK (personnel_status IS NULL OR personnel_status IN ('has_personnel', 'no_personnel'));
        
        RAISE NOTICE 'personnel_status alanı eklendi';
    ELSE
        -- Eğer alan zaten varsa, constraint'i güncelle
        ALTER TABLE surveys DROP CONSTRAINT IF EXISTS surveys_personnel_status_check;
        ALTER TABLE surveys 
        ADD CONSTRAINT surveys_personnel_status_check 
        CHECK (personnel_status IS NULL OR personnel_status IN ('has_personnel', 'no_personnel'));
        
        RAISE NOTICE 'personnel_status constraint güncellendi';
    END IF;
END $$;

-- 3. Mevcut kayıtlar için varsayılan değerleri güncelle
UPDATE surveys 
SET assignment_type = 'all' 
WHERE assignment_type IS NULL;

-- 4. Index ekle (opsiyonel, performans için)
CREATE INDEX IF NOT EXISTS idx_surveys_assignment_type ON surveys(assignment_type);
CREATE INDEX IF NOT EXISTS idx_surveys_personnel_status ON surveys(personnel_status);

-- 5. Kontrol sorgusu
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'surveys' 
AND column_name IN ('assignment_type', 'personnel_status')
ORDER BY column_name;

-- ============================================
-- BAŞARILI! ✅
-- ============================================
-- Surveys tablosuna assignment_type ve personnel_status alanları eklendi.
-- Artık anket oluştururken bu alanlar kullanılabilir.
-- ============================================

