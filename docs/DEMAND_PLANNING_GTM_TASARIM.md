# Demand Planning & Go-To-Market Sistemi — Tasarım Dokümanı

> Amaç: Yurt dışı siparişten müşteriye çıkışa kadar tüm ürün akışını **tek bir planlama
> döngüsünde** yönetmek: ne zaman, ne kadar sipariş verilmeli; stok ne zaman gelir;
> hangi ekip hangi kanala ne kadar, ne sürede satmalı; plan tutuyor mu?

---

## 1. Sistemin Mantığı: Tek Cümlede

**Stok Projeksiyonu = Bugünkü Stok + Yoldaki/Gelecek Siparişler − Talep Tahmini**

Bu formül her SKU için önümüzdeki 26 hafta boyunca hesaplanır. Sistemdeki diğer her
modül ya bu formülün bir girdisini besler (stok, PO, tahmin) ya da çıktısını kullanır
(sipariş önerisi, GTM planı, alarmlar).

```
 TEDARİK (giriş)              PLANLAMA (beyin)                 PAZARA ÇIKIŞ (çıkış)
 ───────────────              ─────────────────                ────────────────────
 PO → Üretim → Sevk     ┌──► Talep Tahmini (3–6 ay) ──┐       Ekip × Kanal × Ay planı
 → Gümrük → Mal Kabul ──┤                              ├──►   Hedef dağıtımı
                        └──► Stok & Yaşlandırma ───────┘       Fatura / sevk (gerçekleşen)
                                   │                                  │
                                   └──── Sipariş Önerisi ◄────────────┘ (sapma geri besler)
```

---

## 2. Aylık S&OP Döngüsü (sistemin ritmi)

| Zaman | Adım | Sorumlu | Sistemde ne olur |
|---|---|---|---|
| Ay sonu +1–2 gün | **Veri kapanışı** | Sistem / Admin | Satış, stok, PO verisi yüklenir, kalite kontrolleri geçer |
| 1. hafta | **İstatistiksel tahmin** | Sistem | Model her SKU için tahmin üretir (P10/P50/P90) |
| 1–2. hafta | **Satış girdisi** | Satış müdürleri | Kampanya, yeni müşteri, liste kaybı gibi bilgilerle düzeltme (gerekçe zorunlu) |
| 2. hafta | **Konsensüs toplantısı** | Demand Planner + Satış + Finans | Tek bir onaylı tahmin; bütçeyle fark gösterilir |
| 3. hafta | **Tedarik planı** | Supply / İthalat | Sistem sipariş önerisi üretir, planner onaylar → PO |
| 3. hafta | **GTM planı** | Satış Direktörü | Ekip × kanal × ay hedefleri dağıtılır, yaşlı stok önceliklendirilir |
| 4. hafta | **Yönetim onayı** | Yönetim | Plan versiyonu kilitlenir |
| Sürekli | **İzleme** | Herkes | Haftalık gerçekleşen vs plan, alarmlar |

---

## 3. Kullanıcılar, Giriş ve Yetki

**Giriş:** Şirket Microsoft 365 kullanıyorsa **Microsoft Entra ID (Azure AD) ile SSO** —
ayrı şifre yok, işten ayrılan kişinin erişimi otomatik kapanır. MFA zorunlu.
Her işlem **audit log**'a yazılır (kim, ne zaman, neyi, eski değer → yeni değer).

| Rol | Görür | Düzenler | Onaylar |
|---|---|---|---|
| **Admin** | Her şey | Ana veri, kullanıcılar, entegrasyon | — |
| **Demand Planner** | Her şey | Tahmin, override, parametreler | Konsensüs tahmini |
| **Supply / İthalat Planlama** | Tedarik, stok, tahmin | PO, sevkiyat aşamaları, lead time | Sipariş önerisi → PO |
| **Satış Direktörü** | Tüm satış, stok, tahmin | GTM planı, hedef dağıtımı | GTM planı |
| **Satış Müdürü / Ekip Lideri** | Kendi ekibi + kanalı | Kendi kanalı için tahmin girdisi | — |
| **Satış Temsilcisi** | Kendi müşterileri, hedefi, stok durumu (salt okuma) | Müşteri bazlı fırsat/bilgi notu | — |
| **Lojistik / Depo** | Gelen sevkiyatlar | Mal kabul, aşama tarihleri | — |
| **Finans** | Değer bazlı raporlar, bütçe | Bütçe, maliyet, kur varsayımı | Plan (değer bazında) |
| **Yönetim** | Dashboard'lar | — | Plan versiyonu kilitleme |

Satır bazlı güvenlik: Bir satış müdürü yalnızca kendi ekibinin/kanalının verisini görür.

---

## 4. İHTİYAÇ DUYULAN VERİLER (en kritik bölüm)

Öncelik: **Z** = Zorunlu (sistem bunsuz çalışmaz) · **G** = Güçlü (doğruluğu ciddi artırır) · **İ** = İleri seviye

### 4.1 Ana Veriler

**Ürün (SKU) — Z**
| Alan | Not |
|---|---|
| SKU kodu, EAN/barkod, ürün adı | Tekil anahtar |
| Marka, kategori, alt kategori, ürün grubu | Tahmin hiyerarşisi için |
| Lansman tarihi, EOL (satıştan çıkış) tarihi | Yaşam döngüsü |
| Durum: Aktif / Yeni / Tasfiye / Pasif | |
| **Öncül/ikame SKU** (bu ürün hangisinin yerine geldi) | Yeni ürün tahmini için kritik — **G** |
| Birim maliyet (döviz + TL), liste fiyatı | Değer bazlı raporlar |
| Koli içi adet, koli/palet, hacim (m³), ağırlık | Konteyner doldurma |
| Tedarikçi, menşei, GTİP kodu | Gümrük ve lead time |

**Tedarikçi — Z**
| Alan | Not |
|---|---|
| Üretim süresi, transit süresi (deniz/hava ayrı), gümrük süresi (gün) | Lead time = toplamı |
| MOQ (min. sipariş), sipariş katı (koli/palet/konteyner) | Sipariş önerisi bunlara yuvarlanır |
| Incoterm, para birimi, ödeme vadesi | Finans |
| Tatil/kapalı dönemler (ör. Çin Yeni Yılı) | Lead time uzaması |

**Müşteri & Kanal — Z**
| Alan | Not |
|---|---|
| Müşteri kodu, adı, kanal (Zincir Perakende, Distribütör, E-ticaret, Kurumsal/B2B, İhracat…) | |
| Bağlı olduğu satış ekibi ve temsilci (**tarihçeli**) | Ekip değişse de geçmiş doğru raporlanır |
| Segment / A-B-C önem sınıfı | |

**Satış Ekibi — Z:** Ekip, müdür, temsilciler, sorumlu kanallar/müşteriler.

### 4.2 Hareket (İşlem) Verileri

**Satış Faturaları (sell-in) — Z** — *En az 24 ay, ideal 36 ay, satır bazında*
`tarih, fatura no, müşteri, SKU, adet, brüt tutar, iskonto, net tutar, para birimi, iade mi?`

**Müşteri Siparişleri — G** — *Gerçek talebi görmek için*
`sipariş tarihi, müşteri, SKU, istenen adet, istenen teslim tarihi, sevk edilen adet, karşılanamayan adet + neden`
> Neden önemli: Stok yokken satış sıfır görünür ama talep sıfır değildir. Sadece faturaya
> bakan tahmin, stoksuzluğu "talep yok" sanır ve bir sonraki siparişi **daha da az** önerir.
> Bu kısır döngüyü sipariş verisi kırar.

**Stok — Z** — *Günlük snapshot, en az 12 ay geçmiş (yaşlandırma için lot giriş tarihi şart)*
`tarih, depo, SKU, lot/parti, adet, depoya giriş tarihi, birim maliyet, statü (satılabilir / rezerve / hasarlı / karantina)`

**Stok Hareketleri — G:** Giriş, çıkış, transfer, sayım farkı, fire/imha, iade.

**Satın Alma Siparişleri (PO) & Sevkiyat — Z**
| Alan | Not |
|---|---|
| PO no, tarih, tedarikçi, SKU, adet, birim fiyat, döviz | |
| İstenen teslim, tedarikçinin onayladığı hazır olma tarihi | |
| ETD planlanan / gerçekleşen, ETA planlanan / gerçekleşen | Gecikme analizi |
| Konteyner no, taşıma modu, liman | |
| Gümrük giriş / çıkış tarihi | |
| Depo kabul tarihi, kabul edilen adet, hasarlı/eksik adet | Gerçek lead time ölçümü |

### 4.3 Ticari ve Dış Veriler

**Fiyat & Promosyon Takvimi — G** — *Geçmiş + planlanan*
`kampanya adı, müşteri/kanal, SKU, başlangıç–bitiş, kampanya tipi (indirim %, insert, katalog, sepette indirim), fiyat`
> Kampanya etkisi temizlenmezse model geçen yılki kampanya ayını "normal" sanır.

**Takvim & Dış Etkenler — G**
- Türkiye resmi tatilleri, **Ramazan ve Kurban Bayramı** (her yıl ~11 gün kayar — sabit
  ay bazlı sezonsallık bunu yakalayamaz, ayrıca modellenmeli)
- Okul açılışı, Black Friday / 11.11, yılbaşı, Anneler/Babalar Günü
- Kur (USD/TRY, EUR/TRY) ve enflasyon — fiyat artışı öncesi stoklama (pre-buy) etkisi

**Sell-out & Kanal Stoku — İ:** Büyük zincirlerin mağaza satış ve stok verisi. Kanalda ne kadar
stok olduğunu bilmek, sell-in'in ne zaman yavaşlayacağını öngörür.

**Bütçe & Hedefler — Z:** Yıllık bütçe (ay × kanal × kategori, adet ve ciro).

### 4.4 Veri Kalitesi Kuralları (sistem otomatik kontrol eder)

- Faturadaki her SKU/müşteri ana veride var mı?
- Negatif stok, gelecek tarihli fatura, sıfır maliyetli ürün var mı?
- Ay kapanışında satış toplamı ERP raporuyla eşleşiyor mu? (± %0,5 tolerans)
- Lead time'ı tanımsız SKU var mı?
- Hatalı satırlar **sessizce atılmaz**, "Veri Hata Kuyruğu"na düşer ve sorumluya atanır.

---

## 5. Modüller (Girişten Çıkışa)

### M1 — Veri Merkezi
ERP'den otomatik (API/veritabanı görünümü) veya Excel/CSV şablonu ile yükleme.
Her yükleme: önizleme → doğrulama → hata kuyruğu → onay → yükleme kaydı (geri alınabilir).

### M2 — Ana Veri Yönetimi
SKU, tedarikçi, müşteri, ekip ekranları. Değişiklikler tarihçeli; kritik alanlar
(lead time, MOQ) değişince onay ister.

### M3 — İthalat & Tedarik Takibi
- PO'nun aşamaları: **Sipariş → Tedarikçi Onayı → Üretimde → Yüklendi (ETD) → Yolda →
  Limanda → Gümrükte → Depoya Kabul**
- Kanban görünümü + Gantt; her aşamada planlanan/gerçekleşen tarih.
- Gerçekleşen lead time otomatik ölçülür → tedarikçi performans karnesi
  (zamanında teslim %, ortalama gecikme, eksik/hasarlı teslim %).
- Çıktı: **"Gelecek 26 hafta gelen stok" takvimi** (SKU × hafta).

### M4 — Depo Girişi (Mal Kabul)
PO'ya karşı kabul: gelen adet, hasarlı/eksik, lot numarası, giriş tarihi (yaşlandırmanın
başlangıç noktası). Fark varsa tedarikçiye talep kaydı açılır.

### M5 — Stok & Yaşlandırma
- SKU × depo × lot stok, değer (maliyet bazlı).
- Yaş kovaları: **0–30 / 31–60 / 61–90 / 91–180 / 180+ gün**
- **Erime süresi** = mevcut stok ÷ tahmini günlük satış → "Bu stok 140 günde erir"
- Erime süresi ürünün kabul edilebilir eşiğini aşıyorsa **"Yaşlanma Riski"**
- Aksiyon önerisi: kampanya, kanal değişikliği (ör. e-ticaret/outlet), iade, tasfiye.
- Stok devir hızı, stok gün sayısı (DOH), atıl stok (90 gün hareketsiz) listesi.

### M6 — Talep Tahmini
Bkz. Bölüm 6. Ekranda: geçmiş 24 ay + gelecek 6 ay; istatistiksel tahmin, satış girdisi,
konsensüs, bütçe ve geçen yıl aynı grafikte. Override için **gerekçe kodu zorunlu**
(kampanya, yeni liste, kayıp liste, fiyat artışı, rakip, diğer).

### M7 — Tedarik Planı & Sipariş Önerisi
Her SKU için haftalık **stok projeksiyonu** (26 hafta):
```
Hafta:              W1    W2    W3   ...  W26
Başlangıç stoku   1200  1050   880
+ Gelecek PO         0     0  2000
− Tahmin           150   170   180
= Bitiş stoku     1050   880  2700
Emniyet stoku      400   400   400
Durum               ✓     ✓     ✓
```
- **Emniyet stoku** = z × √(LT × σ²_talep + talep² × σ²_LT) — hem talep hem lead time
  belirsizliği dahil; z hedef hizmet seviyesinden gelir (A ürün %98, C ürün %90 gibi).
- Stok, lead time ufkunda emniyet stokunun altına düşüyorsa sistem **sipariş önerisi**
  üretir: adet MOQ ve sipariş katına yuvarlanır, konteyner doluluk oranı gösterilir.
- Planner öneriyi kabul / değiştir / reddet → kabul edilen öneri PO taslağı olur.

### M8 — Go-To-Market Planı
- Onaylı tahmin **ekip × kanal × müşteri × ay** kırılımına dağıtılır
  (geçmiş pay + satışçı girdisi + kanal stratejisi).
- **Kanal bazlı satış süresi hedefi:** "Bu konteyner geldikten sonra X ürünü 60 gün içinde
  Zincir kanalına %50, E-ticarete %30, Distribütöre %20 satılmalı."
- Yaşlı/riskli stok, ekiplerin hedeflerine **öncelikli ürün** olarak eklenir.
- **Yeni ürün lansman planı:** Benzer (analog) ürünün ilk 6 ay eğrisi üzerinden tahmin,
  kanal bazlı ilk dağıtım (listeleme) adetleri.
- **Kısıtlı stok tahsisi (allocation):** Talep > stok ise kural bazlı paylaştırma
  (müşteri önceliği, hizmet seviyesi sözleşmesi, kârlılık).

### M9 — Satış Çıkışı & Gerçekleşme Takibi
- Faturalar (ürün çıkışları), iadeler, transferler günlük işlenir.
- Plan vs gerçekleşen: ekip, kanal, müşteri, SKU bazında; **ay sonu tahmini (run-rate)**.
- Hizmet seviyesi: sipariş karşılama oranı (fill rate), zamanında ve tam teslim (OTIF).

### M10 — Alarm Merkezi
| Alarm | Tetikleyici |
|---|---|
| Stoksuzluk riski | Projeksiyon X hafta içinde 0'ın altına iniyor |
| Fazla stok | Stok gün sayısı > eşik |
| Yaşlanan stok | Lot yaşı kova eşiğini geçti |
| Sevkiyat gecikmesi | ETA kayması > N gün |
| Tahmin sapması | Ay içi gerçekleşen tahminden ±%25 sapıyor |
| Veri hatası | Hata kuyruğunda bekleyen kayıt |

Bildirim: sistem içi + e-posta (+ Teams entegrasyonu).

### M11 — Raporlar & Dashboard
| KPI | Açıklama |
|---|---|
| Tahmin doğruluğu (WMAPE) | Ciro ağırlıklı; ürün/kanal/ay bazında |
| Tahmin yanlılığı (Bias) | Sürekli fazla mı, az mı tahmin ediyoruz? |
| **FVA (Forecast Value Add)** | Satışçı override'ı tahmini iyileştiriyor mu, bozuyor mu? |
| Stok gün sayısı (DOH), devir hızı | |
| Yaşlı stok değeri (90+ / 180+) | |
| Fill rate, OTIF, kayıp satış | |
| Tedarikçi zamanında teslim % | |
| Plan vs gerçekleşen (adet/ciro) | |

### M12 — GTM Panosu (GTM Müdürü için)

Amaç: Kanal kararlarını ciro yerine **kanal sağlığı, net-net kârlılık ve fırsat** üzerinden vermek.
Her bileşen üç parçayla sunulur: rakam → **"Ne söylüyor?"** (tek cümle) → **"Nasıl hesaplanır?"** (açılır not).

| Bileşen | Ne gösterir | Karar |
|---|---|---|
| **Haftalık brif** | Kurallarla üretilen 3–5 öneri, önem sırasıyla | Öneriyi uygula / katılıyorum / katılmıyorum |
| **Kanal karnesi** | Hedef, gidişat, son 6 ay trendi, sell-out hızı, kanal stoku (hafta), brüt marj, iskonto, listeleme | Hangi kanala yükleme, hangisinde eritme |
| **Hedef açığı köprüsü** | Hedef − gidişat ve açığı kapatacak aksiyonların tahmini etkisi | Açık nasıl kapanır, kalan açık kime revize edilir |
| **Fiyat şelalesi** | Liste fiyatı → fatura altı iskonto → kampanya → prim → hizmet bedeli → net-net → maliyet | "Çok satan ama kazandırmayan" kanal, iskonto sızıntısı |
| **Ürün × kanal fırsat haritası** | Satış hızı endeksi (100 = portföy ortalaması), listelenmemiş hücreler | Yeni listeleme, kanal kaydırma |
| **Kampanya etkinliği** | Satış artışı, ek adet, kampanya sonrası düşüş, getiri (ek brüt kâr ÷ maliyet) | Tekrarla / tekrarlama |
| **Lansman takibi** | Yeni ürünün haftalık sell-out'u ile benzer ürünün ilk 12 haftası | İkinci siparişi öne çek / kampanya |

**Kanal stoku kuralı:** müşteri stoğu ÷ son 4 hafta ortalama sell-out. 4–6 hafta sağlıklı; 6+ yeni sell-in gecikir,
3− rafta boşluk riski. Sell-in'i kanal stoku yüksekken artıran primler (hacim primi) ayrıca işaretlenir.

**Benimsenme (kabul) ilkeleri**
- Her ekran sade dille "ne söylüyor" cümlesiyle açılır; terimler açılır notta açıklanır.
- Her öneri bir aksiyon butonuna bağlıdır (ör. "Dağılımı uygula" ilgili ekranı önerilen değerlerle açar); son kararı kullanıcı verir.
- Kullanıcı her öneriye katıldığını/katılmadığını işaretler; sistem hangi öneri türlerinin işe yaradığını ölçer (öneri isabeti raporu).
- Her rakamın kaynağı ve tarihi görünür; satışçının kendi raporuyla çelişen bir rakam varsa fark açıklanır.

**Ek veri ihtiyacı (GTM)**
| Veri | Kaynak | Sıklık | Öncelik |
|---|---|---|---|
| Sell-out ve mağaza/depo stoku | Zincir portalları / EDI | Haftalık | **G** |
| Listeleme (mağaza × ürün) | Müşteri planogramı, saha ekibi | Aylık | **G** |
| Ticari koşullar (iskonto, prim, vade, listeleme bedeli) | Anlaşma kartları, finans | Değiştikçe | **Z** |
| Kampanya maliyeti ve mekaniği | Pazarlama, kampanya faturaları | Kampanya bazında | **G** |
| Pazaryeri trafik, dönüşüm, stoksuz sayfa | Pazaryeri panelleri | Günlük | **İ** |

---

## 6. Tahmin Metodolojisi (çıtayı yüksek tutan kısım)

1. **Talep temizleme:** Stoksuz günlerdeki satış kaybı tahmin edilip eklenir; tek seferlik
   ihale/toplu satışlar ve kampanya artışı ayrıştırılır → "temel talep" (baseline).
2. **Segmentasyon (ABC-XYZ):** A/B/C ciro katkısı × X/Y/Z talep oynaklığı.
   - AX: Otomatik istatistiksel tahmin, dar override
   - AZ / BZ: Planner ve satışçının yoğun incelemesi
   - Seyrek satışlı ürünler: Croston / TSB modeli
3. **Model yarışması:** Her SKU için Seasonal Naive, ETS, ARIMA, Theta, Croston/TSB
   (`statsforecast`) + kampanya/tatil/fiyat değişkenli LightGBM. Son 6 ay üzerinde
   **geriye dönük test (backtest)**; en düşük hatalı model ya da ağırlıklı kombinasyon seçilir.
4. **Hiyerarşik uzlaştırma:** SKU tahminlerinin toplamı = kategori = kanal = toplam
   (MinT yöntemi). Üst seviyedeki daha isabetli bilgi alt seviyeye taşınır.
5. **Olasılıksal tahmin:** Tek sayı değil P10 / P50 / P90 aralığı → emniyet stoku ve
   senaryo planlaması bundan beslenir.
6. **Hareketli bayramlar:** Ramazan/Kurban Bayramı tarihleri modele değişken olarak girer.
7. **Yeni ürün:** Analog SKU eşleştirme + kategori lansman eğrisi.
8. **Demand sensing (ileri):** Ay içinde haftalık sipariş akışıyla kısa vadeli tahmin güncellemesi.
9. **Öğrenen döngü:** Her ay WMAPE, Bias ve FVA ölçülür; tahmini sürekli bozan
   override türleri raporlanır.

---

## 7. Senaryo Planlama (ileri)
"Kur %15 artarsa", "konteyner 3 hafta gecikirse", "X zinciri ürünü listeden çıkarırsa" gibi
senaryolar planın bir kopyası üzerinde çalıştırılır; stok, ciro ve hizmet seviyesi farkı gösterilir.

---

## 8. Teknik Mimari

```
ERP (SAP/Logo/Netsis…) ─┐
Excel/CSV şablonları ───┼──► Veri Merkezi (doğrulama, hata kuyruğu)
Kur / tatil servisleri ─┘              │
                                       ▼
                         PostgreSQL (ham → temiz → raporlama katmanları)
                          ▲                     ▲
       Python Tahmin Servisi (FastAPI,          │
       statsforecast, LightGBM, zamanlanmış)    │
                                                │
          Next.js + TypeScript Web Arayüzü (SSO, roller, ekranlar)
                                                │
          Power BI / Excel bağlantısı (isteğe bağlı, salt okuma)
```
- Barındırma: Şirket IT politikasına göre **Azure** (M365 kullanan şirketlerde genelde en
  kolay onay alan seçenek), Supabase veya şirket içi kurulum.
- Ortamlar: geliştirme → test → canlı. Günlük yedek, versiyonlu veritabanı değişiklikleri,
  CI ile otomatik test.
- Tüm planlar **versiyonlu**: "Mart konsensüs v2" ile "Nisan konsensüs v1" karşılaştırılabilir.

---

## 9. Fazlar

| Faz | Kapsam | Somut çıktı | Süre |
|---|---|---|---|
| **F0 Veri Keşfi** | Veri talep listesi, örnek dökümler, kalite analizi | Veri kalite raporu: hangi sorulara cevap verebiliriz | 1–2 hafta |
| **F1 Temel** | Giriş/SSO, roller, ana veri, veri merkezi | Veriler sisteme düzenli giriyor | 2–3 hafta |
| **F2 Stok & İthalat** | Stok yaşlandırma, PO/sevkiyat takibi, mal kabul | Yaşlandırma raporu, gelen stok takvimi | 3 hafta |
| **F3 Tahmin v1** | Temizleme, ABC-XYZ, model yarışması, override, konsensüs | İlk resmi 3 aylık tahmin | 3–4 hafta |
| **F4 Tedarik Planı** | Stok projeksiyonu, emniyet stoku, sipariş önerisi | Otomatik sipariş önerileri | 2–3 hafta |
| **F5 GTM** | Ekip × kanal dağıtımı, hedefler, gerçekleşme takibi, alarmlar | Kanal/ekip planı ve takibi | 3 hafta |
| **F6 İleri** | ML modelleri, senaryo, sell-out, demand sensing | Sürekli iyileştirme | Sürekli |

**İlk somut değer F2 sonunda gelir** (yaşlandırma ve gelen stok takvimi tahmin olmadan da kullanılabilir).

---

## 10. Hemen Başlamak İçin Gerekenler (F0 Ödev Listesi)

1. ERP adı ve verilerin alınma şekli (API, veritabanı okuma, Excel dışa aktarım).
2. Örnek dökümler (yapıyı görmek için birkaç ay da yeter):
   - Son 24–36 ay satış faturası satırları
   - Güncel stok (lot ve giriş tarihiyle)
   - Açık ve son 12 ayda kapanmış PO'lar (aşama tarihleriyle — bunlar nerede tutuluyor? Excel mi?)
   - Ürün, müşteri, tedarikçi listeleri
   - Geçmiş kampanya listesi (varsa)
3. Aktif SKU sayısı, müşteri sayısı, kanal ve satış ekibi yapısı.
4. Bugün planlama nasıl yapılıyor? (Excel dosyaları, toplantılar — mevcut süreç)
5. Şirket IT kısıtları: bulut onayı, SSO, veri gizliliği (KVKK) politikası.
