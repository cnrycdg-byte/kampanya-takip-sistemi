-- ============================================
-- SURVEY PHOTOS BUCKET OLUŞTUR
-- ============================================

-- Storage bucket oluştur
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'survey-photos',
    'survey-photos',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Bucket için RLS policy oluştur
CREATE POLICY "Survey photos are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'survey-photos');

CREATE POLICY "Authenticated users can upload survey photos" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'survey-photos' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own survey photos" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'survey-photos' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own survey photos" ON storage.objects
FOR DELETE USING (
    bucket_id = 'survey-photos' 
    AND auth.role() = 'authenticated'
);

-- Kontrol et
SELECT * FROM storage.buckets WHERE id = 'survey-photos';

-- ============================================
-- BAŞARILI! 
-- Survey photos bucket oluşturuldu.
-- ============================================
