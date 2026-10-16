# Demand Planning — DP_2026 çalışma kitabından sisteme geçiş

Bu klasör, **DP_2026 Demand Planning** Excel çalışma kitabını planlama ekranının kullandığı
veri dosyasına çeviren aktarım betiğini içerir.

> Şirket verisi (Excel, JSON çıktısı, ekran dosyası) **repoya eklenmez**; `data/` klasörü ve `*.xlsx` `.gitignore` içindedir.

## Kullanım

```bash
pip install openpyxl
python etl/import_dp2026.py <Demand_Planning.xlsx> data/dp2026.json
```

Betik dosyayı salt okunur modda okur (dosya ~170 MB XML içerir); değerler Excel'in son kaydedilmiş
(hesaplanmış) halinden alınır. Tüm ciro değerleri dosyadaki gibi KDV hariçtir.

## Excel sayfaları → sistem tabloları

| Excel sayfası | İçerik | Sistem tablosu |
|---|---|---|
| URUN_DB | Ürün kodu, marka, ana/alt grup, HERO | `urun` |
| LISTE_FIYATLARI | Aylık liste (TESKF) ve promosyon fiyatı | `fiyat_listesi` (tarihli) |
| MUSTERI_KOSULLARI | Müşteri × ürün marjı | `musteri_kosul` (tarihçeli) |
| 1_HEDEFLER | Müşteri × marka × ana grup × ay ciro hedefi | `hedef` |
| 2_PAZ_PLAN | Pazarlama adet planı, stok, stok yaşı, yoldaki adet | `pazarlama_plan` (versiyonlu), `stok_foto` |
| 3_SAT_PLAN | Müşteri × ürün × ay satış planı ve alış fiyatı | `satis_plan` (yalnızca dolu satırlar) |
| 4_SELL_IN | Müşteri × ürün × ay sell-in adet ve ciro | `sell_in` (ERP'den otomatik) |
| 5_SELL_OUT | Media Markt / Vatan / Teknosa sell-out | `sell_out` (müşteri raporlarından) |
| ÖZET | Ürün × ay karşılaştırma, stok değeri, kanal, yorumlar | Ürün kartı; yorumlar `urun_yorum` |
| 6_KARSILASTIRMA, 0_DASHBOARD | Hedef ve yıl sonu raporu | Ekran (hesaplanır, saklanmaz) |
| METODOLOJI | Formül ve elle yenileme notları | Sistem kuralları |

## Aktarımda yapılan dönüşümler

- Sell-in / sell-out'taki ticari unvanlar plan dosyasındaki kısa müşteri adlarına eşlenir
  (ör. `YENİ MAĞAZACILIK ANONİM ŞİRKETİ` → `A-101`, `NİT-SET …` → `Dist. TV`).
- Sayısal ürün kodları metne çevrilir (`50903` ve `"50903"` aynı ürün).
- Hedeflerdeki ara toplam satırları (`UGREEN TOPLAM`, `PHILIPS TOPLAM`, `MÜŞTERİ TOPLAM`) atlanır.
- Satış planında yalnızca planı ya da satış ortalaması olan müşteri × ürün satırları tutulur.
- Negatif adetler (iade) olduğu gibi aktarılır ve sayılır.

## Açık sorular (veri sahibinden teyit)

1. Sell-out yalnızca Media Markt, Vatan ve Teknosa'nın tüm mağazalarını mı kapsıyor?
2. Mayıs ve Haziran satış planı neden boş?
3. Hedefi 0 olan müşteriler (QUAD, A-101, Amazon, Dist. TV…) için hedef var mı?
4. Stok değeri hangi fiyatla hesaplanıyor (maliyet mi, alış fiyatı mı)?
