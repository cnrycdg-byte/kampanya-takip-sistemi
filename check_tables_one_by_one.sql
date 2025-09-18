-- TEK TEK TABLO KONTROLÜ - HATA ALMAYACAK
-- Bu scriptleri tek tek çalıştırın

-- 1. Bölgeler tablosu var mı?
SELECT 'BÖLGELER TABLOSU KONTROLÜ' as kontrol;
SELECT count(*) as kayit_sayisi FROM regions;

-- 2. Kanallar tablosu var mı?
SELECT 'KANALLAR TABLOSU KONTROLÜ' as kontrol;
SELECT count(*) as kayit_sayisi FROM channels;

-- 3. Kullanıcılar tablosu var mı?
SELECT 'KULLANICILAR TABLOSU KONTROLÜ' as kontrol;
SELECT count(*) as kayit_sayisi FROM users;

-- 4. Mağazalar tablosu var mı?
SELECT 'MAĞAZALAR TABLOSU KONTROLÜ' as kontrol;
SELECT count(*) as kayit_sayisi FROM stores;

-- 5. Görevler tablosu var mı?
SELECT 'GÖREVLER TABLOSU KONTROLÜ' as kontrol;
SELECT count(*) as kayit_sayisi FROM tasks;
