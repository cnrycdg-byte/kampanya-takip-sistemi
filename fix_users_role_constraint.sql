-- Users tablosundaki role constraint'ini düzeltmek için script
-- Bu scripti Supabase SQL Editor'da çalıştırın

-- ADIM 1: Önce mevcut kullanıcıları ve rollerini kontrol et
SELECT id, name, email, role 
FROM users 
ORDER BY role, name;

-- ADIM 2: 'marketing' rolüne sahip kullanıcıları kontrol et
SELECT id, name, email, role 
FROM users 
WHERE role = 'marketing';

-- ADIM 3: 'marketing' rolüne sahip kullanıcıları geçici olarak 'employee' yap
-- (Bu adım constraint'i kaldırmadan önce gerekli)
UPDATE users 
SET role = 'employee' 
WHERE role = 'marketing';

-- ADIM 4: Mevcut constraint adını bul ve kaldır
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Constraint adını bul (farklı isimlerde olabilir)
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
        RAISE NOTICE 'Role constraint bulunamadı, devam ediliyor...';
    END IF;
END $$;

-- ADIM 5: Yeni CHECK constraint ekle (marketing rolü dahil)
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'employee', 'marketing'));

-- ADIM 6: Geçici olarak 'employee' yaptığımız kullanıcıları tekrar 'marketing' yap
-- ÖNEMLİ: Eğer ADIM 3'te kullanıcıları güncellediyseniz, bu adımı çalıştırın
-- Eğer hiç 'marketing' rolüne sahip kullanıcı yoksa, bu adımı atlayabilirsiniz
-- UPDATE users 
-- SET role = 'marketing' 
-- WHERE id IN (
--     SELECT id FROM users WHERE role = 'employee' 
--     AND email LIKE '%marketing%' -- veya başka bir kriter
-- );

-- ADIM 7: Kontrol et
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_role_check';

-- ADIM 8: Tüm kullanıcı rollerini tekrar kontrol et
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role 
ORDER BY role;

-- ADIM 9: Başarı mesajı
SELECT 'Constraint başarıyla güncellendi! Artık marketing rolü kullanılabilir.' AS result;

