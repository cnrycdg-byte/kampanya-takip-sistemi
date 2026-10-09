# Yol Haritası: Saha Yönetim Sistemi & Demand Planning / GTM Sistemi

Bu doküman iki ayrı yazılımın mimarisini, modüllerini ve fazlarını tanımlar.
Her iki sistem **ayrı repo, ayrı veritabanı, ayrı yetki yapısı** ile kurulur;
ortak olan yalnızca mühendislik standartlarıdır.

---

## 0. Ortak Mühendislik Standartları

Mevcut `kampanya-takip-sistemi` repo'su (düz HTML + Supabase, kök dizinde 80+ dağınık
`fix_*.sql` / `test-*.html`) prototip olarak işini gördü; ancak iki yeni sistem için
şu standartlara geçilmeli:

| Konu | Mevcut | Hedef |
|---|---|---|
| Frontend | Düz HTML + global JS | Next.js (React + TypeScript), bileşen kütüphanesi (shadcn/ui) |
| Mobil (saha) | Responsive HTML | PWA (offline destekli) — gerekirse sonra Expo/React Native |
| Veritabanı | Elle çalıştırılan SQL dosyaları | Supabase (Postgres) + **versiyonlu migration** (`supabase/migrations`) |
| Yetki | Dağınık RLS düzeltmeleri | Rol tabanlı yetki matrisi + test edilmiş RLS politikaları |
| Arka plan işler | Yok | Supabase Edge Functions / cron + (Demand Planning için) Python servisi |
| Ortamlar | Tek ortam | `dev` → `staging` → `prod`, ayrı Supabase projeleri |
| Kalite | Manuel test | ESLint, typecheck, birim testleri, GitHub Actions CI |
| Raporlama | Sayfa içi tablolar | SQL view / materialized view + dashboard; gerekirse Power BI/Metabase bağlantısı |

---

## 1. SİSTEM 1 — Saha Yönetim Sistemi

### 1.1 Kullanıcı Rolleri

| Rol | Ana işi |
|---|---|
| **Promotör / Tanıtım Uzmanı** | Mağazada: check-in, görev/checklist doldurma, satış girişi, fotoğraf |
| **Saha Yöneticisi** | Rut planı girer, mağaza ziyaret eder, promotör yönetir, görev atar |
| **Bölge Müdürü** | Ekip performansı, onaylar (işe giriş/çıkış/transfer), raporlar |
| **İK / Admin** | Personel kayıtları, mağaza & hiyerarşi tanımları, sistem ayarları |
| **Yönetim (salt okuma)** | Verimlilik ve hedef dashboard'ları |

### 1.2 Modüller

**M1 — Ana Veri (Master Data)**
Bölge → Saha Yöneticisi → Mağaza → Promotör hiyerarşisi; mağaza koordinatları ve
geofence yarıçapı; kanal, zincir, marka, ürün. (Mevcut `regions`, `stores`, `users`,
`brands`, `channels` tablolarından taşınır.)

**M2 — Rut Planı & Araç Takip Entegrasyonu**
- Saha yöneticisi haftalık/aylık rut planı girer (gün, mağaza sırası, planlanan süre).
- Plan uygunluk kontrolü: mağaza frekans kuralları (A sınıfı haftada 2, B haftada 1 vb.),
  günlük toplam süre + tahmini sürüş mesafesi, çakışma/eksik mağaza uyarısı.
- Araç takip sisteminden (Arvento, Mobiliz vb.) API ile periyodik olarak **durak (stop)
  olayları** çekilir; durak koordinatı mağaza geofence'i ile eşleştirilir.
- Sonuç: Planlanan ↔ Gerçekleşen ziyaret, mağazada kalış süresi, plan dışı duraklar,
  rut sapma oranı.
- Araçsız ziyaretler için mobil GPS check-in/check-out yedek kaynak olarak kullanılır.

**M3 — Personel Yaşam Döngüsü (İşe Giriş / Çıkış / Transfer)**
- Talep formu → onay akışı (Saha Yön. → Bölge Müd. → İK) → kayıt.
- Transfer: mağaza/bölge değişikliği tarihçeli tutulur (`personnel_assignments`
  başlangıç–bitiş tarihli). Böylece geçmiş satışlar doğru kişiye/mağazaya raporlanır.
- Belgeler (sözleşme, kimlik vb.) Supabase Storage'da, erişim yalnızca İK.

**M4 — Checklist & Görev Yönetimi**
- Checklist şablonları (soru tipleri: evet/hayır, sayı, fotoğraf, çoktan seçmeli).
  Mevcut anket altyapısı (`surveys`, `survey_questions`, `survey_answers`) buraya evrilir.
- Görev: atayan, atanan (kişi/mağaza/bölge), son tarih, öncelik, kanıt (foto), durum.
- Tekrarlayan görevler (her pazartesi raf kontrolü gibi).
- Raporlar: tamamlanma oranı, gecikme, kişi/bölge bazında skor.

**M5 — Satış & Hedef Takibi**
- Satış verisi kaynakları: promotör manuel girişi + (varsa) ERP/sell-out dosya entegrasyonu.
- Hedefler yukarıdan aşağı dağıtılır: Şirket → Bölge → Mağaza → Promotör (ay/ürün grubu).
- Her kullanıcı yalnızca kendi seviyesini görür (RLS); günlük gerçekleşme, kalan hedef,
  günlük gereken satış hızı.

**M6 — Verimlilik Analizleri**
KPI örnekleri:
- Rut uyum oranı (gerçekleşen / planlanan ziyaret)
- Mağazada geçen süre / yolda geçen süre
- Ziyaret başına görev tamamlanma
- Promotör başına satış, saat başına satış, hedef gerçekleşme %
- Personel devir hızı (turnover), mağaza boşluk günü (promotörsüz gün)

### 1.3 Çekirdek Veri Modeli (özet)

```
regions ─┬─ users (role, manager_id)
         └─ stores (lat, lng, geofence_m, class)
personnel_assignments (user_id, store_id, start_date, end_date)
personnel_requests (type: hire|exit|transfer, status, approvals)
route_plans (manager_id, period) ── route_plan_items (date, store_id, order, planned_min)
vehicle_events (vehicle_id, ts, lat, lng, type, duration)   ← araç takip API
visits (store_id, user_id, source: vehicle|gps, check_in, check_out, plan_item_id)
checklist_templates ── checklist_questions
tasks (template_id?, assignee, store_id, due, status) ── task_responses
sales_entries (store_id, user_id, product_id, date, qty, amount)
sales_targets (level, ref_id, period, product_group, target)
```

---

## 2. SİSTEM 2 — Demand Planning & Go-To-Market

### 2.1 Kapsam

1. **Tedarik (Inbound) Takibi:** Yurt dışı sipariş (PO) → üretim → sevk → gümrük →
   depo girişi. Her aşama planlanan/gerçekleşen tarih, gecikme uyarısı.
2. **Stok & Yaşlandırma:** SKU × depo bazında stok, giriş tarihine göre yaş kovaları
   (0–30, 31–60, 61–90, 90+ gün), yaşlı stok için aksiyon önerisi.
3. **Talep Tahmini:** Geçmiş satıştan önümüzdeki 3 ay için SKU/kanal bazlı tahmin,
   sezonsallık, kampanya/promosyon etkisi, manuel düzeltme (planner override).
4. **S&OP / GTM Planı:** Tahmin + gelen stok → hangi satış ekibi, hangi kanala,
   hangi sürede ne kadar satmalı (sell-in planı ve hedef dağıtımı).
5. **Performans:** Tahmin doğruluğu (MAPE, bias), stok devir hızı, stok gün sayısı (DOH),
   kayıp satış / stoksuzluk.

### 2.2 Modüller

**D1 — Ana Veri:** SKU, ürün hiyerarşisi, tedarikçi, lead time, MOQ, kanal, satış ekibi, depo.

**D2 — Sipariş & Sevkiyat Takibi:** PO kalemleri, aşama tarihleri (ETD, ETA, gümrük, depo),
konteyner/kargo bilgisi, gecikme alarmı. Çıktı: "önümüzdeki 12 hafta gelecek stok" takvimi.

**D3 — Stok Yaşlandırma:** ERP'den günlük stok snapshot'ı, FIFO lot yaşı, yaş kovaları,
yaşlanma riski (mevcut stok / tahmini satış hızı → kaç günde erir?).

**D4 — Talep Tahmin Motoru (Python servisi)**
- Başlangıç: istatistiksel modeller — ETS, ARIMA, Croston (seyrek satışlı SKU'lar için),
  `statsforecast` kütüphanesi. Her SKU için backtest ile en iyi model otomatik seçilir.
- Sonraki aşama: LightGBM ile kampanya, fiyat, tatil, kanal değişkenleri.
- Hiyerarşik tutarlılık: SKU tahminleri kategori/kanal toplamlarıyla uzlaştırılır.
- Aylık döngü: tahmin üret → planner düzelt → onayla → versiyonla (tahmin versiyonları saklanır).

**D5 — GTM / Kanal Planı:** Onaylı tahmin + D2 gelen stok + D3 mevcut stok →
satış ekibi × kanal × ay bazında satış planı ve hedef. Yaşlı stok önceliklendirilir.

**D6 — Dashboard:** Stok gün sayısı, yaşlı stok değeri, tahmin doğruluğu, sipariş gecikmeleri,
plan vs gerçekleşen.

### 2.3 Çekirdek Veri Modeli (özet)

```
products (sku, category, brand, lifecycle) · suppliers (lead_time_days, moq)
purchase_orders ── po_lines ── shipments (stage, planned_date, actual_date)
inventory_snapshots (date, sku, warehouse, qty, lot_in_date)
sales_history (date, sku, channel, team, qty, amount)
forecast_runs (run_id, model, created_at) ── forecasts (sku, channel, month, qty, version)
forecast_overrides (sku, month, qty, reason, user)
gtm_plans (team, channel, sku/category, month, plan_qty)
```

### 2.4 Mimari

```
ERP / Excel ──► Ingestion (cron, CSV/API) ──► Postgres (Supabase)
                                                  │
                     Python Forecast Servisi ◄────┤ (FastAPI + statsforecast, haftalık/aylık job)
                                                  │
                     Next.js Planlama Arayüzü ◄───┘ (planner, satış ekipleri, yönetim)
```

---

## 3. Fazlar

### Saha Yönetim Sistemi
| Faz | İçerik | Süre (tahmini) |
|---|---|---|
| F0 | Repo kurulumu, Next.js + Supabase migration yapısı, rol/yetki, mevcut veriyi taşıma | 1–2 hafta |
| F1 | Ana veri + personel giriş/çıkış/transfer | 2 hafta |
| F2 | Checklist & görev (mevcut anket altyapısından) | 2 hafta |
| F3 | Rut planı + araç takip entegrasyonu + ziyaret eşleştirme | 3 hafta |
| F4 | Satış & hedef (kullanıcı seviyesinde) | 2 hafta |
| F5 | Verimlilik dashboard'ları | 2 hafta |

### Demand Planning & GTM
| Faz | İçerik | Süre (tahmini) |
|---|---|---|
| F0 | Veri envanteri: ERP'den hangi veriler, hangi formatta, hangi sıklıkla alınabilir | 1 hafta |
| F1 | Ana veri + satış geçmişi + stok yükleme, stok yaşlandırma raporu | 2 hafta |
| F2 | PO / sevkiyat takibi | 2 hafta |
| F3 | Tahmin motoru v1 (istatistiksel) + backtest + planner override | 3 hafta |
| F4 | GTM kanal/ekip planı | 2 hafta |
| F5 | Doğruluk takibi, ML modeli, senaryo analizi | sürekli |

> Öneri: **Demand Planning'de en kritik risk veri kalitesidir.** Kodlamadan önce
> 24+ aylık satış geçmişi ve stok hareketlerinin örnek dökümüyle başlanmalıdır.

---

## 4. Karar Bekleyen Sorular

1. Araç takip sağlayıcısı hangisi, API dokümanı/erişimi var mı?
2. ERP nedir (SAP, Logo, Netsis, Mikro…)? Satış/stok verisi API ile mi, Excel ile mi gelecek?
3. Yaklaşık kullanıcı sayıları (saha yöneticisi, promotör) ve mağaza adedi?
4. Promotörler mobil cihazda internetsiz kalıyor mu (offline ihtiyacı)?
5. Demand Planning şirket verisi barındıracak — şirket IT'si bulut (Supabase) onaylar mı,
   yoksa şirket içi (on-prem) / Azure gibi bir ortam mı şart?
6. Mevcut `kampanya-takip-sistemi` canlı kullanılıyor mu? (Saha sistemine taşınacak mı,
   yoksa paralel mi yaşayacak?)
