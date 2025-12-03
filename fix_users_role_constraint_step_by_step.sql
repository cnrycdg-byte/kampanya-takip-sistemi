-- Users tablosundaki role constraint'ini ADIM ADIM düzeltmek için script
-- Her adımı ayrı ayrı çalıştırın ve sonucu kontrol edin

-- ============================================
-- ADIM 1: Mevcut durumu kontrol et
-- ============================================
SELECT id, name, email, role 
FROM users 
ORDER BY role, name;

-- ============================================
-- ADIM 2: 'marketing' rolüne sahip kullanıcıları kontrol et
-- ============================================
SELECT id, name, email, role 
FROM users 
WHERE role = 'marketing';

-- ============================================
-- ADIM 3: Mevcut constraint'i kontrol et
-- ============================================
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND contype = 'c'
AND (pg_get_constraintdef(oid) LIKE '%role%' OR pg_get_constraintdef(oid) LIKE '%admin%manager%employee%');

-- ============================================
-- ADIM 4: 'marketing' rolüne sahip kullanıcıları geçici olarak 'employee' yap
-- ÖNEMLİ: Bu adımı mutlaka çalıştırın!
-- ============================================
-- Önce hangi kullanıcıların etkileneceğini görelim
SELECT id, name, email, role, 'employee' as new_role
FROM users 
WHERE role = 'marketing';

-- Şimdi güncellemeyi yapalım
UPDATE users 
SET role = 'employee' 
WHERE role = 'marketing';

-- Güncellemenin başarılı olduğunu kontrol edelim
SELECT id, name, email, role 
FROM users 
WHERE role = 'employee'
ORDER BY id;

-- ============================================
-- ADIM 5: Constraint'i kaldır
-- ============================================
-- Önce constraint adını bulalım
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Constraint adını bul
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'users'::regclass
    AND contype = 'c'
    AND (pg_get_constraintdef(oid) LIKE '%role%' OR pg_get_constraintdef(oid) LIKE '%admin%manager%employee%');
    
    -- Constraint'i kaldır
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Constraint % kaldırıldı', constraint_name;
    ELSE
        RAISE NOTICE 'Role constraint bulunamadı';
    END IF;
END $$;

-- Constraint'in kaldırıldığını kontrol edelim
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND contype = 'c'
AND (pg_get_constraintdef(oid) LIKE '%role%' OR pg_get_constraintdef(oid) LIKE '%admin%manager%employee%');

-- ============================================
-- ADIM 6: Yeni CHECK constraint ekle (marketing rolü dahil)
-- ============================================
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'employee', 'marketing'));

-- Constraint'in eklendiğini kontrol edelim
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_role_check';

-- ============================================
-- ADIM 7: Tüm kullanıcı rollerini kontrol et
-- ============================================
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role 
ORDER BY role;

-- ============================================
-- ADIM 8: İsteğe bağlı - Kullanıcıları tekrar 'marketing' yap
-- Bu adımı sadece ADIM 4'te 'employee' yaptığınız kullanıcıları geri almak için kullanın
-- ============================================
-- Önce hangi kullanıcıları 'marketing' yapmak istediğinizi belirleyin
-- Sonra aşağıdaki sorguyu kullanıcı ID'leri ile güncelleyin ve çalıştırın

-- ÖRNEK (kullanıcı ID'lerini kendi ID'lerinizle değiştirin):
-- UPDATE users 
-- SET role = 'marketing' 
-- WHERE id IN (1, 2, 3);

-- Güncellemenin başarılı olduğunu kontrol edelim
-- SELECT id, name, email, role 
-- FROM users 
-- WHERE role = 'marketing';

