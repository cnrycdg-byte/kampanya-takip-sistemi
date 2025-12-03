# 🚀 CANLIYA ALMA KONTROL LİSTESİ

## ✅ 1. VERİTABANI SQL SCRİPTLERİ

### Zorunlu SQL Scriptleri (Sırayla Çalıştırılmalı):

1. **`create_investment_areas_system.sql`** ⚠️ ÖNEMLİ
   - Yatırım alanları sisteminin temel tablolarını oluşturur
   - `investment_areas`, `investment_tickets`, `investment_ticket_comments`, `investment_photos`, `investment_ticket_status_history` tabloları

2. **`update_investment_areas_brand_and_type.sql`**
   - `brand` kolonu ekler
   - `type` enum değerlerini günceller (ada_stand, duvar_standi, alinlik, reyon_giydirme, diger)

3. **`update_investment_areas_add_gondol_basi.sql`** ⚠️ ÖNEMLİ
   - `gondol_basi` tipini ekler

4. **`update_investment_areas_installation_date_and_rental_fee.sql`**
   - `installation_date` ve `rental_fee` kolonlarını ekler

5. **`update_investment_areas_rental_dates.sql`** ⚠️ ÖNEMLİ
   - `rental_start_date`, `rental_end_date`, `rental_indefinite` kolonlarını ekler

6. **`update_investment_areas_products_and_weekly_tracking.sql`** ⚠️ ÖNEMLİ
   - `investment_area_products` tablosu
   - `investment_weekly_photos` tablosu
   - `investment_weekly_product_checks` tablosu

7. **`update_investment_ticket_comments_assigned_to.sql`**
   - `assigned_to` kolonu ekler

8. **`update_investment_photos_comment_id.sql`**
   - `comment_id` kolonu ekler

9. **`update_stores_add_has_personnel.sql`** ⚠️ ÖNEMLİ
   - `has_personnel` kolonu ekler (mağaza personel durumu için)

10. **`update_users_table_add_marketing_role.sql`** veya **`remove_and_recreate_constraint.sql`**
    - `marketing` rolünü `users` tablosuna ekler
    - ⚠️ DİKKAT: Eğer constraint hatası alırsanız, önce `account_manager` rolündeki kullanıcıları `manager` yapın

### Opsiyonel SQL Scriptleri:

- `create_survey_store_assignments.sql` (Anket atama sistemi için)
- Diğer survey ve task ile ilgili scriptler

---

## ✅ 2. SUPABASE STORAGE BUCKET'LARI

Aşağıdaki bucket'ların oluşturulduğundan emin olun:

1. **`task-photos`** - Görev fotoğrafları için
2. **`survey-photos`** - Anket fotoğrafları için
3. **`investment-areas`** - Yatırım alanı fotoğrafları için (opsiyonel, kod içinde `task-photos` kullanılıyor)

### Bucket Oluşturma:
```sql
-- Supabase Dashboard > Storage > Create Bucket
-- Bucket Name: task-photos
-- Public: Yes
-- File size limit: 10MB (veya ihtiyaca göre)
```

---

## ✅ 3. SUPABASE RLS (ROW LEVEL SECURITY) POLİTİKALARI

RLS politikalarının doğru yapılandırıldığından emin olun:

- Tüm tablolarda RLS devre dışı bırakılmış olabilir (geliştirme aşamasında)
- Canlıya alırken güvenlik politikalarını gözden geçirin

---

## ✅ 4. JAVASCRIPT DOSYALARI KONTROLÜ

### Kritik Dosyalar:

1. **`js/supabase-config.js`**
   - ✅ Supabase URL ve Key doğru mu?
   - ✅ Supabase bağlantısı çalışıyor mu?

2. **`js/admin.js`**
   - ✅ `has_personnel` kolonu için hata yönetimi var mı?
   - ✅ Mağaza listesi yükleme fonksiyonu çalışıyor mu?

3. **`js/investment-areas.js`**
   - ✅ Filtreleme çalışıyor mu?
   - ✅ Personel durumu filtresi çalışıyor mu?

4. **`js/investment-area-detail.js`**
   - ✅ Ticket oluşturma çalışıyor mu?
   - ✅ Yorum ekleme çalışıyor mu?
   - ✅ Fotoğraf yükleme çalışıyor mu?

5. **`js/admin-survey.js`**
   - ✅ Anket oluşturma çalışıyor mu?
   - ✅ Personel durumu seçimi çalışıyor mu?

6. **`js/admin-survey-helpers.js`**
   - ✅ `getAssignedStoreIds` fonksiyonu `personnel` case'ini içeriyor mu?

7. **`js/employee-investment.js`**
   - ✅ Haftalık fotoğraf yükleme çalışıyor mu?
   - ✅ Ürün kontrolü çalışıyor mu?

---

## ✅ 5. HTML DOSYALARI KONTROLÜ

### Kritik Sayfalar:

1. **`index.html`**
   - ✅ Pazarlama Ekibi rolü seçeneği var mı?

2. **`admin-dashboard.html`**
   - ✅ Personel durumu kolonu var mı?
   - ✅ Personel durumu filtresi var mı?
   - ✅ Anket oluşturma formunda personel durumu seçimi var mı?

3. **`investment-areas.html`**
   - ✅ Personel durumu filtresi var mı?
   - ✅ Personel durumu kolonu var mı?

4. **`marketing-dashboard.html`**
   - ✅ Pazarlama ekibi için doğru menü öğeleri var mı?

---

## ✅ 6. FONKSİYONEL TESTLER

### Test Senaryoları:

1. **Kullanıcı Girişi**
   - [ ] Admin girişi çalışıyor mu?
   - [ ] Pazarlama ekibi girişi çalışıyor mu?
   - [ ] Employee girişi çalışıyor mu?

2. **Mağaza Yönetimi**
   - [ ] Mağaza listesi görüntüleniyor mu?
   - [ ] Personel durumu gösteriliyor mu?
   - [ ] Personel durumu toggle butonu çalışıyor mu?
   - [ ] Yeni mağaza ekleme çalışıyor mu?
   - [ ] Mağaza düzenleme çalışıyor mu?

3. **Yatırım Alanları**
   - [ ] Yatırım alanı listesi görüntüleniyor mu?
   - [ ] Personel durumu filtresi çalışıyor mu?
   - [ ] Yeni yatırım alanı oluşturma çalışıyor mu?
   - [ ] Yatırım alanı düzenleme çalışıyor mu?
   - [ ] Yatırım alanı silme çalışıyor mu?
   - [ ] Ticket oluşturma çalışıyor mu?
   - [ ] Yorum ekleme çalışıyor mu?
   - [ ] Fotoğraf yükleme çalışıyor mu?

4. **Görev Yönetimi**
   - [ ] Görev oluşturma çalışıyor mu?
   - [ ] Personel durumu filtresi çalışıyor mu?

5. **Anket Yönetimi**
   - [ ] Anket oluşturma çalışıyor mu?
   - [ ] Personel durumuna göre atama çalışıyor mu?

6. **Employee Dashboard**
   - [ ] Haftalık fotoğraf yükleme çalışıyor mu?
   - [ ] Ürün kontrolü çalışıyor mu?

---

## ✅ 7. GÜVENLİK KONTROLLERİ

1. **Supabase Keys**
   - [ ] Anon key güvenli mi? (Public'te olabilir)
   - [ ] Service role key asla frontend'de kullanılmıyor mu?

2. **RLS Politikaları**
   - [ ] Canlıya alırken RLS politikalarını gözden geçirin
   - [ ] Gerekli tablolarda RLS aktif mi?

3. **Input Validation**
   - [ ] Tüm form inputları validate ediliyor mu?
   - [ ] SQL injection koruması var mı? (Supabase otomatik sağlar)

---

## ✅ 8. PERFORMANS KONTROLLERİ

1. **Sayfa Yükleme**
   - [ ] Sayfalar hızlı yükleniyor mu?
   - [ ] Gereksiz console.log'lar temizlendi mi?

2. **Veritabanı Sorguları**
   - [ ] Gereksiz sorgular optimize edildi mi?
   - [ ] Index'ler doğru yerleştirildi mi?

---

## ✅ 9. HATA YÖNETİMİ

1. **Error Handling**
   - [ ] Tüm async fonksiyonlarda try-catch var mı?
   - [ ] Kullanıcıya anlamlı hata mesajları gösteriliyor mu?

2. **Logging**
   - [ ] Console.log'lar production için temizlendi mi?
   - [ ] Hata logları yeterli mi?

---

## ✅ 10. SON KONTROLLER

1. **Dosya Yapısı**
   - [ ] Tüm dosyalar doğru konumda mı?
   - [ ] Gereksiz dosyalar temizlendi mi?

2. **Dokümantasyon**
   - [ ] README.md güncel mi?
   - [ ] SQL scriptleri dokümante edildi mi?

3. **Backup**
   - [ ] Veritabanı yedeği alındı mı?
   - [ ] Kod yedeği alındı mı?

---

## 🚨 KRİTİK HATALAR (Düzeltilmeden Canlıya Alınmamalı)

1. ❌ `has_personnel` kolonu yoksa mağaza listesi çalışmıyor
2. ❌ `marketing` rolü constraint hatası veriyor
3. ❌ Investment areas tabloları yoksa sistem çalışmıyor
4. ❌ Supabase bağlantısı çalışmıyor

---

## 📝 NOTLAR

- Tüm SQL scriptlerini Supabase SQL Editor'da sırayla çalıştırın
- Her script çalıştıktan sonra başarı mesajını kontrol edin
- Hata alırsanız, hata mesajını not edin ve önceki scriptleri kontrol edin
- Test ortamında tüm fonksiyonları test edin
- Canlıya almadan önce backup alın

---

## ✅ HAZIRLIK ONAYI

- [ ] Tüm SQL scriptleri çalıştırıldı
- [ ] Tüm fonksiyonlar test edildi
- [ ] Hata yönetimi kontrol edildi
- [ ] Güvenlik kontrolleri yapıldı
- [ ] Backup alındı
- [ ] Dokümantasyon güncel

**Onay Tarihi:** _______________
**Onaylayan:** _______________

