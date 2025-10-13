-- ============================================
-- BUCKET VE STORAGE DURUMUNU KONTROL ET
-- ============================================

-- 1. Survey-photos bucket var mı?
SELECT 
    'BUCKET STATUS' as check_type,
    id, 
    name, 
    public,
    file_size_limit,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets 
WHERE id = 'survey-photos';

-- 2. Tüm buckets'ları listele (survey-photos yoksa görmek için)
SELECT 
    'ALL BUCKETS' as check_type,
    id, 
    name, 
    public
FROM storage.buckets
ORDER BY created_at DESC;

-- 3. Survey-photos bucket'ındaki dosyaları listele
SELECT 
    'FILES IN BUCKET' as check_type,
    name,
    bucket_id,
    owner,
    created_at,
    updated_at,
    last_accessed_at,
    metadata->>'size' as file_size,
    metadata->>'mimetype' as mime_type
FROM storage.objects
WHERE bucket_id = 'survey-photos'
ORDER BY created_at DESC
LIMIT 20;

-- 4. Storage policies kontrolü
SELECT 
    'STORAGE POLICIES' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

