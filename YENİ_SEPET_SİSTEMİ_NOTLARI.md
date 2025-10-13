# 🎯 YENİ SEPET SİSTEMİ - YATIRIM ALANI MANTIĞI

## 📋 YAPILAN DEĞİŞİKLİKLER

### 1. SORU 3 VE 4 BİRLEŞTİRİLDİ
- ❌ **ESKİ:** Soru 3: Kulaklık Sepeti, Soru 4: GSM Aksesuar Sepeti
- ✅ **YENİ:** Tek Soru: Sepet Analizi (Kulaklık & GSM)

### 2. YENİ ÇALIŞMA MANTIĞI
**Yatırım Alanı gibi çalışır:**
- "Sepet Ekle" butonu
- Her tıklamada yeni bir sepet formu açılır
- Kullanıcı istediği kadar sepet ekleyebilir
- Her sepet için:
  1. **Sepet Türü** → Büyük boy Sepet / Baket Sepet
  2. **Üst Grup** → Kulaklık / GSM Aksesuar
  3. **Alt Grup** → (Üst gruba göre dinamik değişir)
     - Kulaklık → Kulakiçi / Kafa Bantlı / TWS
     - GSM Aksesuar → Duvar Adaptörü / Powerbank / Diğer
  4. **Marka** → Listeden seçim (Diğer seçeneği ile özel marka)
  5. **Artikel No**
  6. **Fiyat**

### 3. GÜNCELLENEN DOSYALAR

#### 📄 `js/survey.js` (v2.0)
- `renderDynamicBasketQuestion()` → Yatırım alanı mantığıyla yeniden yazıldı
- `addBasketItem()` → Yeni sepet ekleme fonksiyonu (yatırım alanı gibi)
- `removeBasketItem()` → Sepet silme
- `updateBasketLowerGroup()` → Alt grup dinamik güncelleme
- `checkOtherBasketBrand()` → Diğer marka kontrolü
- `collectDynamicBasketAnswer()` → Veri toplama güncellendi

#### 📄 `js/admin-survey.js` (v2.0)
- `QUESTION_TEMPLATES` → GSM kaldırıldı, basket güncellendi
- `getDefaultQuestionConfig()` → Yeni hiyerarşik yapı
- `getFallbackQuestionConfig()` → Yeni hiyerarşik yapı

#### 📄 `admin-dashboard.html`
- "Kulaklık Sepeti" ve "GSM Aksesuar Sepeti" butonları → Tek buton
- **YENİ:** "Sepet Analizi (Kulaklık & GSM)" butonu

#### 📄 `test-survey-system.html`
- Checkbox'lar birleştirildi
- Soru konfigürasyonu güncellendi

### 4. VERİ YAPISI

```json
{
  "baskets": [
    {
      "basket_type": "large_basket",
      "upper_group": "headphone",
      "lower_group": "tws",
      "brand": "JBL",
      "artikel": "ART123",
      "price": 299.99
    },
    {
      "basket_type": "basket",
      "upper_group": "gsm_accessory",
      "lower_group": "powerbank",
      "brand": "Anker",
      "artikel": "ART456",
      "price": 499.99
    }
  ]
}
```

### 5. RAPORLAMA İÇİN

Artık raporlarda şunları görebileceğiz:
- ✅ Toplam kaç **Büyük boy Sepet** var
- ✅ Toplam kaç **Baket Sepet** var
- ✅ **Kulaklık** kategorisinde kaç sepet var
- ✅ **GSM Aksesuar** kategorisinde kaç sepet var
- ✅ Her alt grup için ayrı istatistikler
- ✅ Marka bazlı sepet dağılımı

## 🧪 TEST ADIMLAR

### Admin Dashboard'dan Test:
1. Admin Dashboard → "Create Survey"
2. "Sepet Analizi (Kulaklık & GSM)" butonuna tıkla
3. Anket oluştur
4. Employee Dashboard'dan anketi doldur
5. "Sepet Ekle" butonuna tıkla
6. Formu doldur:
   - Sepet Türü seç
   - Üst Grup seç
   - Alt Grup (otomatik değişir) seç
   - Marka seç
   - Artikel ve Fiyat gir
7. İstediğin kadar "Sepet Ekle" ile devam et
8. Anketi tamamla
9. Admin Dashboard → "Survey Reports" → Sepet raporunu kontrol et

### Test Sayfasından Test:
1. `test-survey-system.html` aç
2. "Bağlantıyı Test Et"
3. "Test Anketi Oluştur" (Sepet Analizi checkbox'ı işaretli)
4. Employee Dashboard'dan test et

## 📊 SONRAKI ADIM: RAPORLAMA

`js/survey-reports-simple.js` dosyasını güncelleyeceğiz:
- Yeni veri yapısını okuyacak
- Sepet türü, üst grup, alt grup bazlı raporlar
- Excel export'ta yeni alanlar

## ⚠️ ÖNEMLİ NOTLAR

1. **Cache Temizleme:** Tarayıcıda Ctrl+Shift+R ile hard refresh yapın
2. **Versiyon:** survey.js v2.0, admin-survey.js v2.0
3. **Eski Anketler:** Eski veri yapısıyla oluşturulmuş anketler etkilenmez
4. **Yeni Anketler:** Sadece yeni oluşturulan anketler yeni yapıyı kullanır

## 🎉 AVANTAJLAR

- ✅ Daha esnek sepet ekleme
- ✅ Kulaklık ve GSM tek soru altında
- ✅ Yatırım alanı ile tutarlı UX
- ✅ Daha detaylı raporlama imkanı
- ✅ Sepet türü bazlı analiz
- ✅ Üst grup / Alt grup bazlı filtreleme

