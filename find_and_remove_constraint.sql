-- Constraint'i bul ve kaldır
-- Bu scripti Supabase SQL Editor'da çalıştırın

-- ADIM 1: Tüm CHECK constraint'lerini listele
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition,
    conrelid::regclass AS table_name
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND contype = 'c'
ORDER BY conname;

-- ADIM 2: Role ile ilgili constraint'leri bul
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND contype = 'c'
AND (pg_get_constraintdef(oid) LIKE '%role%' 
     OR pg_get_constraintdef(oid) LIKE '%admin%' 
     OR pg_get_constraintdef(oid) LIKE '%manager%'
     OR pg_get_constraintdef(oid) LIKE '%employee%'
     OR conname LIKE '%role%');

-- ADIM 3: 'marketing' rolüne sahip kullanıcıları kontrol et
SELECT id, name, email, role 
FROM users 
WHERE role = 'marketing';

-- ADIM 4: Constraint'i kaldırmak için önce 'marketing' rolüne sahip kullanıcıları 
-- geçici olarak NULL yap (bu constraint'i atlatmak için)
-- NOT: Bu işlem başarısız olabilir, bu durumda ADIM 5'i deneyin

-- ADIM 5: Constraint'i doğrudan kaldır (tüm olası isimlerle)
-- Önce ADIM 1'deki sonuçlara bakarak constraint adını belirleyin
-- Sonra aşağıdaki sorguyu constraint adı ile güncelleyin ve çalıştırın

-- ÖRNEK (constraint adını ADIM 1'deki sonuçlardan alın):
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check CASCADE;
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check_1 CASCADE;
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check_2 CASCADE;

-- ADIM 6: Eğer yukarıdaki işlemler başarısız olduysa, constraint'i 
-- geçici olarak devre dışı bırakmak için şu yöntemi deneyin:
-- (PostgreSQL'de CHECK constraint'leri devre dışı bırakılamaz, bu yüzden kaldırmak gerekir)

-- ADIM 7: Yeni constraint ekle (marketing rolü dahil)
-- Bu sorguyu constraint kaldırıldıktan SONRA çalıştırın
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'employee', 'marketing'));

-- ADIM 8: Kontrol et
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_role_check';

