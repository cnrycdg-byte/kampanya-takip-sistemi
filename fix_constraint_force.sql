-- Zorla constraint güncelleme scripti
-- Bu scripti Supabase SQL Editor'da çalıştırın

-- ADIM 1: Önce mevcut constraint'in tanımını kontrol et
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_role_check';

-- ADIM 2: 'marketing' rolüne sahip kullanıcıları listeleyin
SELECT id, name, email, role 
FROM users 
WHERE role = 'marketing';

-- ADIM 3: Constraint'i kaldırmak için önce 'marketing' rolüne sahip kullanıcıları 
-- geçici olarak başka bir role taşıyın (örneğin 'employee')
-- NOT: Bu işlem constraint hatası verebilir, bu durumda ADIM 4'ü atlayın

-- ADIM 4: Constraint'i kaldır (eğer ADIM 3 başarılı olduysa)
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check CASCADE;

-- ADIM 5: Eğer ADIM 4 başarısız olduysa, constraint'i doğrudan kaldırmak için
-- Supabase Dashboard'dan manuel olarak kaldırın:
-- 1. Supabase Dashboard → Table Editor → users tablosu
-- 2. Constraints sekmesine gidin
-- 3. users_role_check constraint'ini bulun ve silin

-- ADIM 6: Yeni constraint ekle (marketing rolü dahil)
-- Bu sorguyu constraint kaldırıldıktan SONRA çalıştırın
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'employee', 'marketing'));

-- ADIM 7: Kontrol et
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_role_check';

