-- ============================================
-- TÜM SURVEY PHOTO POLİCY'LERİNİ SİL
-- ============================================

-- Survey-photos bucket için tüm restrictive policies'leri sil
DROP POLICY IF EXISTS "Authenticated users can upload survey photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update survey photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete survey photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view survey photos" ON storage.objects;

-- Yeni, basit ve permissive policies oluştur (auth.role() KULLANMADAN)
CREATE POLICY "Public can view survey photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'survey-photos');

CREATE POLICY "Public can upload to survey photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'survey-photos');

CREATE POLICY "Public can update survey photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'survey-photos');

CREATE POLICY "Public can delete survey photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'survey-photos');

-- Kontrol et
SELECT 
    policyname,
    cmd,
    with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%survey%'
ORDER BY policyname;

-- ============================================
-- BAŞARILI!
-- Survey-photos bucket artık herkese açık.
-- Auth kontrolü YOK.
-- ============================================

