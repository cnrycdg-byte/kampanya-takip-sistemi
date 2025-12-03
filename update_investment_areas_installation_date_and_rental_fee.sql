-- investment_areas tablosuna 'installation_date' ve 'rental_fee' kolonları ekle
DO $$
BEGIN
    -- Kurulum tarihi kolonu
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'investment_areas' AND column_name = 'installation_date') THEN
        ALTER TABLE investment_areas ADD COLUMN installation_date DATE;
        COMMENT ON COLUMN investment_areas.installation_date IS 'Yatırım alanının kurulum tarihi';
        RAISE NOTICE 'investment_areas tablosuna "installation_date" kolonu eklendi.';
    ELSE
        RAISE NOTICE 'investment_areas tablosunda "installation_date" kolonu zaten mevcut.';
    END IF;

    -- Kiralama bedeli kolonu
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'investment_areas' AND column_name = 'rental_fee') THEN
        ALTER TABLE investment_areas ADD COLUMN rental_fee DECIMAL(10, 2);
        COMMENT ON COLUMN investment_areas.rental_fee IS 'Yatırım alanının aylık kiralama bedeli';
        RAISE NOTICE 'investment_areas tablosuna "rental_fee" kolonu eklendi.';
    ELSE
        RAISE NOTICE 'investment_areas tablosunda "rental_fee" kolonu zaten mevcut.';
    END IF;
END $$;

