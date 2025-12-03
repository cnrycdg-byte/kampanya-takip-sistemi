-- stores tablosuna has_personnel kolonu eklemek için SQL scripti
-- Bu scripti Supabase SQL Editor'da çalıştırın

-- 1. has_personnel kolonunu ekle (varsayılan olarak true - mevcut mağazalar personelli kabul edilir)
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS has_personnel BOOLEAN DEFAULT TRUE;

-- 2. Kolona yorum ekle
COMMENT ON COLUMN stores.has_personnel IS 'Mağazada personel bulunup bulunmadığı (true: personelli, false: personelsiz)';

-- 3. Başarı mesajı
SELECT 'stores tablosuna has_personnel kolonu başarıyla eklendi. Varsayılan değer: true (personelli)' AS result;

