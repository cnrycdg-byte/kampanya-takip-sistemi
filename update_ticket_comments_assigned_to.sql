-- investment_ticket_comments tablosuna 'assigned_to' kolonu ekle
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'investment_ticket_comments' AND column_name = 'assigned_to') THEN
        ALTER TABLE investment_ticket_comments ADD COLUMN assigned_to INTEGER REFERENCES users(id);
        COMMENT ON COLUMN investment_ticket_comments.assigned_to IS 'Yorum ile birlikte ticket atanan kullanıcı';
        RAISE NOTICE 'investment_ticket_comments tablosuna "assigned_to" kolonu eklendi.';
    ELSE
        RAISE NOTICE 'investment_ticket_comments tablosunda "assigned_to" kolonu zaten mevcut.';
    END IF;
END $$;

