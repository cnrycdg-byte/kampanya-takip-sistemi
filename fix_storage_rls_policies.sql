-- ============================================
-- STORAGE RLS POLICIES'LERİNİ DÜZELT
-- ============================================

-- 1. Önce mevcut policies'leri kontrol et
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%survey%'
ORDER BY policyname;

-- 2. Eski policies'leri sil
DROP POLICY IF EXISTS "Survey photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload survey photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own survey photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own survey photos" ON storage.objects;

-- 3. Yeni, basit ve permissive policies oluştur

-- Herkes okuyabilir (public bucket)
CREATE POLICY "Anyone can view survey photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'survey-photos');

-- Authenticated kullanıcılar yükleyebilir (BASITLEŞTIRILMIŞ)
CREATE POLICY "Authenticated users can upload survey photos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'survey-photos'
    AND auth.role() = 'authenticated'
);

-- Authenticated kullanıcılar güncelleyebilir
CREATE POLICY "Authenticated users can update survey photos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'survey-photos'
    AND auth.role() = 'authenticated'
);

-- Authenticated kullanıcılar silebilir
CREATE POLICY "Authenticated users can delete survey photos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'survey-photos'
    AND auth.role() = 'authenticated'
);

-- 4. Policies'leri kontrol et
SELECT 
    'UPDATED POLICIES' as check_type,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%survey%'
ORDER BY policyname;

-- 5. Test için bucket bilgisi
SELECT 
    'BUCKET INFO' as check_type,
    id, 
    name, 
    public,
    file_size_limit
FROM storage.buckets 
WHERE id = 'survey-photos';

-- ============================================
-- BAŞARILI!
-- Storage RLS policies düzeltildi.
-- Artık authenticated kullanıcılar fotoğraf yükleyebilir.
-- ============================================

