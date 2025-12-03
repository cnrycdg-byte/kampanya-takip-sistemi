-- Constraint'i kaldır ve yeniden oluştur
-- Bu scripti Supabase SQL Editor'da ADIM ADIM çalıştırın

-- ADIM 1: Mevcut constraint'i kontrol et
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_role_check';

-- ADIM 2: 'marketing' rolüne sahip kullanıcıları kontrol et
SELECT id, name, email, role 
FROM users 
WHERE role = 'marketing';

-- ADIM 3: Constraint'i kaldır (CASCADE ile)
-- ÖNEMLİ: Eğer bu sorgu "constraint violated" hatası verirse, 
-- önce 'marketing' rolüne sahip kullanıcıları geçici olarak 'employee' yapın
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check CASCADE;

-- ADIM 4: Constraint'in kaldırıldığını kontrol et
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_role_check';
-- Bu sorgu sonuç döndürmemeli (constraint kaldırıldı)

-- ADIM 5: Yeni constraint ekle (marketing rolü dahil)
-- NOT: Bu sorguyu sadece ADIM 4 başarılı olduysa (yani constraint kaldırıldıysa) çalıştırın
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'employee', 'marketing'));

-- ADIM 6: Yeni constraint'in eklendiğini kontrol et
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_role_check';

-- ADIM 7: Başarı mesajı
SELECT 'Constraint başarıyla güncellendi! Artık marketing rolü kullanılabilir.' AS result;

