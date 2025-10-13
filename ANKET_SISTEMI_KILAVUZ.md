# 📋 ANKET VE FİYAT TAKİP SİSTEMİ - KURULUM VE KULLANIM KILAVUZU

## 🎯 GENEL BAKIŞ

Sisteminize **aylık anket** ve **rakip fiyat takibi** modülleri eklenmiştir. Bu sistem:

### ✅ **Ne Yapar?**
- ✅ Aylık anketler oluşturur ve mağazalara otomatik atar
- ✅ 3 farklı soru tipi: Promotör sayısı, Yatırım alanı, Sepet analizi
- ✅ Wizard formatında adım adım anket doldurma
- ✅ Fotoğraflı cevaplar (Supabase Storage kullanır)
- ✅ Rakip fiyat takibi (günlük kayıt)
- ✅ 5 farklı rapor ekranı
- ✅ Aylık karşılaştırma grafikleri
- ✅ Excel export (temel iskelet hazır)

---

## 🚀 KURULUM ADIMLARI

### **Adım 1: Veritabanı Şemasını Deploy Edin**

1. **Supabase Dashboard**'a gidin: https://supabase.com/dashboard
2. **SQL Editor**'ü açın
3. `database_survey_system.sql` dosyasının içeriğini kopyalayıp yapıştırın
4. **RUN** butonuna tıklayın

**Oluşturulacak Tablolar:**
- `surveys` - Anket şablonları
- `survey_questions` - Anket soruları
- `survey_responses` - Anket cevapları (response başlıkları)
- `survey_answers` - Anket cevap detayları
- `competitor_price_tracking` - Fiyat takibi
- `brands` - Marka tanımları

**Oluşturulacak View'ler:**
- `v_promoter_report` - Promotör raporu
- `v_basket_report` - Sepet raporu
- `v_investment_area_report` - Yatırım alanı raporu

### **Adım 2: Storage Bucket Oluşturun**

1. Supabase Dashboard → **Storage**
2. **Create Bucket** butonuna tıklayın
3. Bucket adı: `survey-photos`
4. **Public**: ❌ Hayır (Private)
5. **Create Bucket**

**Storage Policies Ekleyin:**
```sql
-- INSERT Policy (Authenticated kullanıcılar yükleyebilir)
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'survey-photos');

-- SELECT Policy (Authenticated kullanıcılar görüntüleyebilir)
CREATE POLICY "Authenticated users can view"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'survey-photos');

-- DELETE Policy (Sadece admin silebilir)
CREATE POLICY "Only admins can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'survey-photos' 
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);
```

### **Adım 3: Dosyaları Deploy Edin**

Tüm dosyalar zaten oluşturuldu ve sisteme entegre edildi:

**Employee Dashboard:**
- ✅ `employee-dashboard.html` - Güncellendi (Anket ve Fiyat menüleri eklendi)
- ✅ `js/survey.js` - Yeni oluşturuldu

**Admin Dashboard:**
- ✅ `admin-dashboard.html` - Güncellendi (Anket yönetimi menüleri eklendi)
- ✅ `js/admin-survey.js` - Yeni oluşturuldu

**Veritabanı:**
- ✅ `database_survey_system.sql` - Yeni oluşturuldu

---

## 👥 EMPLOYEE (ÇALIŞAN) KULLANIMI

### **1. Anketler Sayfası**

**Erişim:** Employee Dashboard → Sol Menü → **📋 Anketlerim**

**Ne Görür?**
- ⏳ **Bekleyen Anketler**: Doldurulmamış veya yarım kalmış anketler
- ✅ **Tamamlanan Anketler**: Daha önce gönderilen anketler

**Anket Doldurma:**
1. "Başla" butonuna tıklayın
2. Wizard açılır (Progress bar ile 1/10, 2/10...)
3. Her soruyu sırayla cevaplayın
4. "İleri" butonu ile ilerleyin (otomatik kayıt)
5. "Geri" butonu ile önceki soruya dönebilirsiniz
6. Son soruda "Anketi Tamamla" butonu çıkar

### **2. Fiyat Takibi Sayfası**

**Erişim:** Employee Dashboard → Sol Menü → **🏷️ Fiyat Takibi**

**Nasıl Kullanılır?**
1. "Yeni Fiyat Kaydı Ekle" butonuna tıklayın
2. **Rakip Bilgileri:**
   - Marka seçin (dropdown)
   - Ürün adını yazın
   - Artikel no (opsiyonel)
   - Fiyat girin

3. **Bizim Ürün Bilgileri:**
   - Marka seçin
   - Ürün adını yazın
   - Artikel no (opsiyonel)
   - Fiyat girin

4. "Kaydet" butonuna tıklayın

**Fiyat Farkı Otomatik Hesaplanır:**
- 🔴 Kırmızı: Bizim ürün daha pahalı
- 🟢 Yeşil: Bizim ürün daha ucuz

---

## 👔 ADMIN/MANAGER KULLANIMI

### **1. Anket Oluşturma**

**Erişim:** Admin Dashboard → Sol Menü → **📋 ANKET YÖNETİMİ** → **Anket Oluştur**

**Adımlar:**
1. Anket başlığı girin: Örn. "Mart 2025 Aylık Anket"
2. Ay ve yıl seçin
3. Açıklama yazın (opsiyonel)

**Soru Ekleme:**
- **"Promotör Sayısı Sorusu Ekle"**: Marka bazında promotör sayısını sorar
- **"Yatırım Alanı Sorusu Ekle"**: Duvar/Stand fotoğrafları ister
- **"Sepet Sorusu Ekle"**: Dinamik sepet analizi yapar

Her soru için:
- Soru metnini yazın
- Yardım metni ekleyin (opsiyonel)
- Soru tipine özel ayarları yapın

**Anketi Yayınlama:**
- "Anketi Oluştur ve Aktifleştir" butonuna tıklayın
- Anket otomatik olarak TÜM mağazalara atanır
- Employee'ler "Anketlerim" bölümünde görür

### **2. Promotör Raporu (Mağaza x Marka Matrisi)**

**Erişim:** Admin Dashboard → **Promotör Raporu**

**Ne Görür?**
```
+------------------+-----+--------+-------+------+--------+
| Mağaza           | JBL | Baseus | Anker | Ttec | TOPLAM |
+------------------+-----+--------+-------+------+--------+
| Mağaza A         |  5  |   3    |   2   |  1   |   11   |
| Mağaza B         |  3  |   4    |   1   |  2   |   10   |
| Mağaza C         |  2  |   2    |   3   |  0   |    7   |
+------------------+-----+--------+-------+------+--------+
| TOPLAM           | 10  |   9    |   6   |  3   |   28   |
+------------------+-----+--------+-------+------+--------+
```

**Filtreler:**
- Anket seçimi (dropdown)
- Kanal filtresi
- Bölge filtresi

**Excel İndir:** Butonu ile tüm raporu Excel'e export edebilirsiniz

### **3. Yatırım Alanı Raporu**

**Erişim:** Admin Dashboard → **Yatırım Alanı Raporu**

**Ne Görür?**
- Her mağazanın yatırım alanları (Duvar Standı, Orta Alan vb.)
- Her alanın markaları
- **Fotoğraf Linkleri**: Her standın fotoğrafları thumbnail olarak görünür
- Tıklanabilir linkler

**Filtreler:**
- Anket seçimi
- Kanal filtresi
- Alan tipi (Duvar/Orta Alan/Diğer)

### **4. Sepet Raporu**

**Erişim:** Admin Dashboard → **Sepet Raporu**

**Özet Tablo:**
```
+------------------+--------------+--------------+-------------+
| Mağaza           | Toplam Sepet | Bizim Sepet  | Sepet Oranı |
+------------------+--------------+--------------+-------------+
| Mağaza A         |      10      |      4       |     40%     |
| Mağaza B         |      15      |      6       |     40%     |
| Mağaza C         |       8      |      3       |     37.5%   |
+------------------+--------------+--------------+-------------+
```

**Mağaza Detayı:**
- Mağaza seçtiğinizde:
  - Her sepetin içindeki ürünler
  - Marka, Artikel No, Ürün Adı
  - "Bizim ürün" işaretlemesi

**Kanal/Mağaza Bazlı Raporlama:**
- Kanal seçimi ile o kanaldaki tüm mağazaların sepet oranlarını görürsünüz
- Ay ay karşılaştırma yapabilirsiniz

### **5. Fiyat Takip Raporu**

**Erişim:** Admin Dashboard → **Fiyat Takip Raporu**

**Filtreler:**
- Başlangıç - Bitiş Tarihi
- Mağaza filtresi
- Marka filtresi

**Tablo:**
```
+------------+----------+-------------+------------------+--------------+
| Tarih      | Mağaza   | Rakip Marka | Rakip Fiyat (TL) | Fark         |
+------------+----------+-------------+------------------+--------------+
| 10.10.2025 | Mağaza A | JBL         | 1,200.00         | 🔴 +150.00   |
| 09.10.2025 | Mağaza B | Anker       |   800.00         | 🟢 -50.00    |
+------------+----------+-------------+------------------+--------------+
```

**Excel İndir:** Tüm kayıtları Excel'e export edebilirsiniz

### **6. Anket Raporları (Aylık Karşılaştırma)**

**Erişim:** Admin Dashboard → **Anket Raporları**

**Özellikler:**
- İki ay seçin (Örn: Şubat vs Mart)
- Karşılaştırmalı görünüm:
  ```
  🔹 Promotör Sayısı
     JBL: 45 → 52 (+7) ↗️
     Anker: 23 → 20 (-3) ↘️
  
  🔹 Sepet Oranımız
     Şubat: 35% → Mart: 42% (+7 puan) 🎯
  
  📊 Grafik: Aylık trend çizgi grafiği
  📸 Galeri: Yatırım alanı fotoğrafları
  ```

**Kanal Filtresi:**
- Belirli bir kanalın ay-ay performansını görebilirsiniz

---

## 📊 RAPOR ÖRNEKLERİ

### **Örnek 1: Promotör Raporu Excel Çıktısı**

**İstediğiniz Format:**
```
| Satırlar: Mağaza İsimleri | Sütunlar: Markalar (JBL, Anker, vb.) |
| Değerler: Personel Sayıları |
```

**Nasıl Alınır:**
1. Admin Dashboard → Promotör Raporu
2. Anket seçin
3. "Excel İndir" butonuna tıklayın

**Excel'de:**
- 1. Sayfa: Promotör Sayıları
- Her hücre: O mağazada o markanın promotör sayısı
- Son satır: Toplam

### **Örnek 2: Yatırım Alanı Raporu (Fotoğraflı)**

**Format:**
```
| Mağaza | Alan Tipi | Marka | Fotoğraf Linkleri |
|--------|-----------|-------|-------------------|
| Mağaza A | Duvar Standı | JBL | 🔗 foto1.jpg, 🔗 foto2.jpg |
| Mağaza A | Orta Alan | Anker | 🔗 foto3.jpg |
```

**Excel'de:**
- Fotoğraf kolonunda linkler hyperlink olarak
- Tıklayınca fotoğrafı açar

### **Örnek 3: Sepet Raporu (Detaylı)**

**Mağaza Seçtiğinizde:**
```
📊 SEPET 1:
   Marka: JBL
   Artikel: JBL-TUNE510
   Ürün: JBL Tune 510 Bluetooth Kulaklık
   ☑️ Bizim Ürün

📊 SEPET 2:
   Marka: Anker
   Artikel: ANK-Q30
   Ürün: Anker Soundcore Q30
   ☐ Rakip Ürün
```

---

## 🔧 TEKNİK DETAYLAR

### **Veritabanı İlişkileri**

```
surveys (Anketler)
    ↓
survey_questions (Sorular)
    ↓
survey_answers (Cevaplar) → survey_responses (Response Header)
    ↓
photos (Supabase Storage)
```

### **Soru Tipleri ve JSON Konfigürasyonları**

**1. Promotör Sayısı (promoter_count)**
```json
{
  "type": "multiple_choice_with_count",
  "options": [
    {"label": "JBL", "value": "jbl"},
    {"label": "Baseus", "value": "baseus"},
    {"label": "Diğer", "value": "other", "allow_custom": true}
  ],
  "count_field": true
}
```

**Cevap Formatı:**
```json
{
  "brands": [
    {"brand": "jbl", "brand_label": "JBL", "count": 5},
    {"brand": "baseus", "brand_label": "Baseus", "count": 3},
    {"brand": "other", "custom_name": "Sony", "count": 2}
  ]
}
```

**2. Yatırım Alanı (investment_area)**
```json
{
  "type": "investment_area",
  "categories": [
    {"label": "Duvar Standı", "value": "wall"},
    {"label": "Orta Alan Standı", "value": "middle"},
    {"label": "Diğer", "value": "other", "allow_custom": true}
  ],
  "brands": ["JBL", "Baseus", "Anker"],
  "photo_required": true,
  "max_photos": 5
}
```

**Cevap Formatı:**
```json
{
  "areas": [
    {
      "type": "wall",
      "brand": "JBL",
      "photos": ["url1.jpg", "url2.jpg"]
    },
    {
      "type": "other",
      "custom_type": "Tavan Asma",
      "brand": "Anker",
      "photos": ["url3.jpg"]
    }
  ]
}
```

**3. Sepet Analizi (basket_dynamic)**
```json
{
  "type": "basket_dynamic",
  "basket_label": "Kulaklık Sepeti",
  "brands": ["JBL", "Baseus", "Anker", "Diğer"],
  "fields": [
    {"name": "brand", "label": "Marka", "type": "select"},
    {"name": "artikel", "label": "Artikel No", "type": "text"},
    {"name": "product_name", "label": "Ürün Adı", "type": "text"},
    {"name": "is_our_product", "label": "Bizim Ürün", "type": "checkbox"}
  ]
}
```

**Cevap Formatı:**
```json
{
  "basket_count": 10,
  "baskets": [
    {
      "brand": "JBL",
      "artikel": "JBL-TUNE510",
      "product_name": "JBL Tune 510",
      "is_our_product": true
    },
    {
      "brand": "Anker",
      "artikel": "ANK-Q30",
      "product_name": "Anker Soundcore Q30",
      "is_our_product": false
    }
  ],
  "our_product_count": 4,
  "our_product_percentage": "40.00"
}
```

---

## ⚠️ ÖNEMLİ NOTLAR

### **1. Marka Listesi Güncelleme**

Marka eklemek/çıkarmak için:

**Yöntem 1: SQL ile**
```sql
-- Yeni marka ekle
INSERT INTO brands (name, status, category) 
VALUES ('Apple', 'active', 'audio');

-- Marka pasif yap
UPDATE brands SET status = 'inactive' WHERE name = 'Sony';
```

**Yöntem 2: JavaScript ile**
`js/admin-survey.js` dosyasındaki `getDefaultQuestionConfig()` fonksiyonunda marka listelerini güncelleyin.

### **2. "Bizim Marka" Tanımı**

Sepet oranı hesaplamasında hangi markaların "bizim" olduğunu belirtmek için:

```sql
-- Bizim markayı işaretle
UPDATE brands 
SET is_our_brand = true 
WHERE name IN ('Marka1', 'Marka2');
```

**VEYA**

`basket_dynamic` soru tipinde kullanıcı manuel olarak "Bizim Ürün" checkbox'ını işaretler.

### **3. Anket Sıklığı**

- Anketler **otomatik atanmaz**
- Admin her ay manuel olarak yeni anket oluşturmalı
- Her anket bir `month` ve `year` değerine sahip
- Aynı ay/yıl için birden fazla anket oluşturulabilir

### **4. Fotoğraf Boyutu ve Sıkıştırma**

`survey.js` dosyasında fotoğraf yüklemeden önce sıkıştırma yapılabilir:

```javascript
async function uploadSurveyPhoto(file) {
    // Fotoğrafı sıkıştır (opsiyonel)
    const compressedFile = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.8
    });
    
    // Supabase'e yükle
    const { data, error } = await supabase.storage
        .from('survey-photos')
        .upload(fileName, compressedFile);
}
```

---

## 🐛 SORUN GİDERME

### **Hata: "Tablo bulunamadı"**
**Çözüm:** `database_survey_system.sql` dosyasını Supabase'de çalıştırmayı unutmuşsunuz.

### **Hata: "Storage bucket bulunamadı"**
**Çözüm:** Supabase Dashboard'da `survey-photos` bucket'ını oluşturun.

### **Hata: "Fotoğraf yüklenemiyor"**
**Çözüm:** Storage policies'i kontrol edin. Authenticated kullanıcılar INSERT yetkisine sahip olmalı.

### **Anket görünmüyor**
**Çözüm:**
1. Anketin `status` değeri `'active'` olmalı
2. Employee oturumu açmış olmalı
3. `survey_responses` tablosunda zaten tamamlanmış bir kayıt var mı kontrol edin

### **Rapor boş geliyor**
**Çözüm:**
1. Seçilen ankete ait tamamlanmış (`status = 'completed'`) cevap var mı kontrol edin
2. View'lerin (`v_promoter_report`, vb.) doğru çalıştığını test edin

---

## 📚 EK KAYNAKLAR

### **Kullanılan Teknolojiler**
- **Frontend**: Bootstrap 5, Font Awesome, Vanilla JavaScript
- **Backend**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Export**: XLSX.js (Excel export için)

### **Dosya Yapısı**
```
kampanya-takip-sistemi/
├── employee-dashboard.html       # Çalışan paneli (güncellendi)
├── admin-dashboard.html          # Admin paneli (güncellendi)
├── js/
│   ├── survey.js                 # Çalışan anket fonksiyonları (YENİ)
│   ├── admin-survey.js           # Admin anket fonksiyonları (YENİ)
│   ├── app.js                    # Mevcut
│   ├── employee.js               # Mevcut
│   └── admin.js                  # Mevcut
├── database_survey_system.sql    # Veritabanı şeması (YENİ)
└── ANKET_SISTEMI_KILAVUZ.md      # Bu dosya (YENİ)
```

---

## 🎉 TEBRİKLER!

Anket ve Fiyat Takip sisteminiz hazır! 

**Sonraki Adımlar:**
1. ✅ Veritabanını deploy edin (`database_survey_system.sql`)
2. ✅ Storage bucket oluşturun (`survey-photos`)
3. ✅ İlk anketi oluşturun
4. ✅ Test edin!

**Sorularınız için:**
- 📧 Teknik destek: Sistem notlarınıza bakın
- 📖 Dokümantasyon: Bu dosya
- 🐛 Hata bildirimi: Console log'larını kontrol edin

---

**Son Güncelleme:** 2025-10-09  
**Versiyon:** 1.0  
**Hazırlayan:** AI Assistant

