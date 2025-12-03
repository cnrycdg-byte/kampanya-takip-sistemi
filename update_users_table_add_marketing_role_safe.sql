-- Pazarlama rolünü users tablosuna eklemek için GÜVENLİ SQL scripti
-- Bu scripti Supabase SQL Editor'da çalıştırın

-- ADIM 1: Mevcut durumu kontrol et
-- Önce hangi rollerin kullanıldığını görelim
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role 
ORDER BY role;

-- ADIM 2: Eğer 'marketing' rolüne sahip kullanıcılar varsa, onları göster
SELECT id, name, email, role 
FROM users 
WHERE role NOT IN ('admin', 'manager', 'employee');

-- ADIM 3: Mevcut constraint'i kontrol et
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname LIKE '%role%';

-- ADIM 4: Eğer 'marketing' rolüne sahip kullanıcılar varsa, önce onları geçici olarak 'employee' yap
-- (Bu adımı sadece gerekirse çalıştırın - yorum satırlarını kaldırın)
/*
UPDATE users 
SET role = 'employee' 
WHERE role = 'marketing';
*/

-- ADIM 5: Mevcut CHECK constraint'i kaldır
-- Önce constraint adını bulalım (farklı isimlerde olabilir)
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Constraint adını bul
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'users'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%role%';
    
    -- Constraint'i kaldır
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE users DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Constraint % kaldırıldı', constraint_name;
    ELSE
        RAISE NOTICE 'Role constraint bulunamadı';
    END IF;
END $$;

-- ADIM 6: Yeni CHECK constraint ekle (marketing rolü dahil)
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'employee', 'marketing'));

-- ADIM 7: Kontrol et - constraint başarıyla eklendi mi?
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

-- ADIM 9: Eğer ADIM 4'te kullanıcıları 'employee' yaptıysanız, şimdi 'marketing' yapabilirsiniz
-- (Bu adımı sadece gerekirse çalıştırın - yorum satırlarını kaldırın ve kullanıcı ID'lerini güncelleyin)
/*
UPDATE users 
SET role = 'marketing' 
WHERE id IN (1, 2, 3); -- Kullanıcı ID'lerini buraya yazın
*/

