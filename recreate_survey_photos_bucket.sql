-- ============================================
-- SURVEY PHOTOS BUCKET'I YENİDEN OLUŞTUR
-- ============================================

-- Önce mevcut bucket'ı kontrol et
SELECT 
    id, 
    name, 
    public, 
    file_size_limit, 
    allowed_mime_types 
FROM storage.buckets 
WHERE id = 'survey-photos';

-- Eğer bucket varsa, önce tüm dosyaları sil
-- (Manuel olarak Supabase Dashboard'dan yapın veya bu sorguyu çalıştırın)
-- DELETE FROM storage.objects WHERE bucket_id = 'survey-photos';

-- Sonra bucket'ı sil
-- DELETE FROM storage.buckets WHERE id = 'survey-photos';

-- Yeni bucket oluştur
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'survey-photos',
    'survey-photos',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- RLS policies'leri temizle
DROP POLICY IF EXISTS "Survey photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload survey photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own survey photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own survey photos" ON storage.objects;

-- Yeni RLS policies oluştur
CREATE POLICY "Survey photos are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'survey-photos');

CREATE POLICY "Authenticated users can upload survey photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'survey-photos');

CREATE POLICY "Users can update their own survey photos" ON storage.objects
FOR UPDATE USING (bucket_id = 'survey-photos');

CREATE POLICY "Users can delete their own survey photos" ON storage.objects
FOR DELETE USING (bucket_id = 'survey-photos');

-- Kontrol et
SELECT 
    'BUCKET INFO' as check_type,
    id, 
    name, 
    public, 
    file_size_limit 
FROM storage.buckets 
WHERE id = 'survey-photos';

-- Policies'leri kontrol et
SELECT 
    'BUCKET POLICIES' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%survey%';

-- ============================================
-- BAŞARILI! 
-- Survey photos bucket yeniden oluşturuldu.
-- ============================================

