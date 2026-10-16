# Demand Planning — Ugreen Excel'inden sisteme geçiş

Bu klasör, mevcut **Ugreen Demand Planning** Excel'ini (tek sayfa, ~291 sütun, her ay sağa yeni blok)
sistemin kullanacağı düzenli tablolara çeviren aktarım betiğini içerir.

> Şirket verisi (Excel, JSON çıktısı, ekran dosyası) **repoya eklenmez**; `data/` klasörü `.gitignore` içindedir.

## Kullanım

```bash
pip install openpyxl
python etl/import_dp_excel.py <Ugreen_Demand_Planning.xlsx> data/dp.json
```

## Excel blokları → sistem tabloları

| Excel bloğu | Sütunlar | Sistem tablosu |
|---|---|---|
| Ürün bilgileri (kod, model, EAN, grup, EOL, HERO, kanal durumu) | A–M | `urun` |
| Stok sayımları (6 tarih) | N–U | `stok_foto` (tarih × ürün) |
| Stok değeri, stok yaşı | V–Y | `stok_foto`, `maliyet` |
| Gümrük stoğu, ITH siparişi | Z–AA | `gumruk_dosya`, `satinalma_siparis` |
| FOB sipariş planı (ay sonu geliş) | AB–AN | `gelen_plan` (ay × ürün) |
| Stok dağılım planı | AV–BH | `cikis_plan_toplam` (versiyonlu) |
| Aylık kanal çıkış planları | BP–BZ, CR–DE, DY–ER, FD–GB, HM–HR, JD–JI | `cikis_plan` (ürün × kanal × ay, versiyonlu) |
| Satış ekibinin kendi planı | CC–CI, IR–IW | `satis_girdisi` |
| Gerçekleşen çıkışlar | BI–BO, CJ–CP, DQ–DW, EV–FB, HD–HL, IX–JC | `gerceklesen` (ERP faturasından) |
| Müşteri satış ve stoğu | CS–CY, DZ–EG, FF–FZ | `kanal_foto` (haftalık) |
| Kanal marjı, alış fiyatı | GH–HA, HU–IN, JK–KD | `kanal_fiyat` (tarihli) |
| Yorumlar | J, CA–CB, DG–DH, ET–EU, GC–GE, KE | `urun_yorum` (kim, ne zaman, karar) |
| Kalan adet hesapları | CQ, DF, DX, ES, FC, GB, HB–HC, HS–HT, IO–IQ, JJ | Hesaplanır, saklanmaz |

## Aktarımda yapılan temizlik

- `#N/A`, `#VALUE!`, `#REF!`, `#DIV/0!` hücreleri boş kabul edilir ve sütun bazında sayılır.
- `-` ve boşluk değerleri 0 kabul edilir.
- Ana grup yazımları birleştirilir (`Mobil ACC` → `Mobil Acc`, `Kablo&Priz` → `Kablo & Priz`).
- Birim maliyet = stok değeri ÷ aynı tarihteki stok adedi (`birim_maliyet`).

Planlama ekranı bu değeri ayrıca kontrol eder: birim maliyet ürünün en düşük kanal alış fiyatından
yüksekse (stok değeri ile adet uyuşmuyorsa) ya da hiç yoksa, maliyet tavsiye satış fiyatına uygulanan
medyan maliyet oranıyla tahmin edilir ve "tahmini maliyet" olarak işaretlenir.

## Açık sorular (veri sahibinden teyit)

1. "Gerçekleşen" blokları tüm satışları mı kapsıyor? (TSS, geleneksel/bayi, Genpa, operatör, online B2B)
2. Gümrük stoğu, FOB sipariş planındaki gelen adetlerin içinde mi?
3. Nisan çıkış planı neden kısmi girilmiş?
4. Kanal fiyatlarındaki "Alış FT" kanalın bize ödediği fiyat mı (KDV hariç)?
