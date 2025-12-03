-- Pazarlama rolünü users tablosuna eklemek için SQL scripti
-- Bu scripti Supabase SQL Editor'da çalıştırın

-- 1. Önce mevcut kullanıcıların rollerini kontrol et
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role 
ORDER BY role;

-- 2. Eğer 'marketing' rolüne sahip kullanıcılar varsa, onları göster
SELECT id, name, email, role 
FROM users 
WHERE role NOT IN ('admin', 'manager', 'employee');

-- 3. Mevcut CHECK constraint'i kaldır (CASCADE ile bağımlılıkları da kaldırır)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check CASCADE;

-- 4. Yeni CHECK constraint ekle (marketing rolü dahil)
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'employee', 'marketing'));

-- 5. Kontrol et - constraint başarıyla eklendi mi?
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_role_check';

-- 6. Tüm kullanıcı rollerini tekrar kontrol et
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role 
ORDER BY role;

