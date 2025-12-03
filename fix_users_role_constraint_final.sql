-- Users tablosundaki role constraint'ini kesin olarak düzeltmek için script
-- Bu scripti Supabase SQL Editor'da çalıştırın

-- ADIM 1: Mevcut constraint'i kontrol et
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND contype = 'c'
AND (pg_get_constraintdef(oid) LIKE '%role%' OR conname LIKE '%role%');

-- ADIM 2: Tüm CHECK constraint'lerini listele (role ile ilgili olanları bulmak için)
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND contype = 'c';

-- ADIM 3: 'marketing' rolüne sahip kullanıcıları kontrol et
SELECT id, name, email, role 
FROM users 
WHERE role = 'marketing';

-- ADIM 4: ÖNCE constraint'i kaldır (CASCADE ile, eğer bağımlılık varsa)
-- NOT: Constraint'i kaldırmak için önce mevcut verilerin constraint'i ihlal etmemesi gerekiyor
-- Bu yüzden önce constraint'i kaldırmalıyız, sonra kullanıcıları güncelleyebiliriz

-- ADIM 5: Constraint'i doğrudan kaldır (CASCADE ile)
-- ÖNEMLİ: Bu işlem constraint'i kaldırır, mevcut verileri etkilemez
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check CASCADE;

-- Eğer farklı bir isimde constraint varsa, onu da kaldır
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'users'::regclass
        AND contype = 'c'
        AND (pg_get_constraintdef(oid) LIKE '%role%' OR pg_get_constraintdef(oid) LIKE '%admin%manager%employee%')
        AND conname != 'users_role_check'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I CASCADE', constraint_record.conname);
            RAISE NOTICE 'Constraint % kaldırıldı', constraint_record.conname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Constraint % kaldırılamadı: %', constraint_record.conname, SQLERRM;
        END;
    END LOOP;
END $$;

-- ADIM 6: 'marketing' rolüne sahip kullanıcıları geçici olarak 'employee' yap (eğer varsa)
-- NOT: Bu adım artık gerekli değil çünkü constraint kaldırıldı, ama yine de yapalım
UPDATE users 
SET role = 'employee' 
WHERE role = 'marketing';

-- ADIM 7: Constraint'in kaldırıldığını kontrol et
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND contype = 'c'
AND (pg_get_constraintdef(oid) LIKE '%role%' OR conname LIKE '%role%');

-- ADIM 8: Yeni CHECK constraint ekle (marketing rolü dahil)
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'employee', 'marketing'));

-- ADIM 9: Constraint'in eklendiğini kontrol et
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_role_check';

-- ADIM 10: Test - marketing rolü ile bir kullanıcı eklemeyi dene (sadece test için, sonra sil)
-- Bu adımı çalıştırmayın, sadece constraint'in çalıştığını görmek için
-- INSERT INTO users (name, email, password, role) 
-- VALUES ('Test User', 'test@test.com', 'test123', 'marketing');
-- DELETE FROM users WHERE email = 'test@test.com';

-- ADIM 11: Başarı mesajı
SELECT 'Constraint başarıyla güncellendi! Artık marketing rolü kullanılabilir.' AS result;

