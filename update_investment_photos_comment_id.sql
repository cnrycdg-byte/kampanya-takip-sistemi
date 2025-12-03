-- investment_photos tablosuna 'comment_id' kolonu ekle
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'investment_photos' AND column_name = 'comment_id') THEN
        ALTER TABLE investment_photos ADD COLUMN comment_id INTEGER REFERENCES investment_ticket_comments(id) ON DELETE SET NULL;
        COMMENT ON COLUMN investment_photos.comment_id IS 'Yorum ile ilişkili fotoğraf';
        CREATE INDEX IF NOT EXISTS idx_investment_photos_comment ON investment_photos(comment_id);
        RAISE NOTICE 'investment_photos tablosuna "comment_id" kolonu eklendi.';
    ELSE
        RAISE NOTICE 'investment_photos tablosunda "comment_id" kolonu zaten mevcut.';
    END IF;
END $$;

