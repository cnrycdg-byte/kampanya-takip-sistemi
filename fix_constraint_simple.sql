-- Basit ve kesin çözüm: Constraint'i kaldır ve yeniden ekle
-- Bu scripti Supabase SQL Editor'da ADIM ADIM çalıştırın

-- ADIM 1: Constraint'i doğrudan kaldır (CASCADE ile)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check CASCADE;

-- ADIM 2: Yeni constraint ekle (marketing rolü dahil)
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'employee', 'marketing'));

-- ADIM 3: Kontrol et
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_role_check';

-- ADIM 4: Test - marketing rolü ile kullanıcı eklemeyi dene
-- Bu sorguyu çalıştırmayın, sadece kontrol için
-- INSERT INTO users (name, email, password, role) 
-- VALUES ('Test', 'test@test.com', 'test123', 'marketing');

