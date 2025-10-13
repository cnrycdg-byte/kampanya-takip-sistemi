-- Sepet sistemi güncellemesi
-- Mevcut sepet sorularını yeni yapıya göre güncelle

-- Önce mevcut sepet sorularını kontrol et
SELECT id, question_type, question_config 
FROM survey_questions 
WHERE question_type IN ('basket_dynamic', 'gsm_accessory_basket');

-- Yeni sepet konfigürasyonu
-- Bu konfigürasyonu test edelim
SELECT jsonb_build_object(
    'type', 'dynamic_basket',
    'basket_types', ARRAY[
        jsonb_build_object('label', 'Büyük boy Sepet', 'value', 'large_basket'),
        jsonb_build_object('label', 'Baket Sepet', 'value', 'basket')
    ],
    'upper_groups', ARRAY[
        jsonb_build_object(
            'label', 'Kulaklık', 
            'value', 'headphone',
            'lower_groups', ARRAY[
                jsonb_build_object('label', 'Kulakiçi Kulaklık', 'value', 'in_ear'),
                jsonb_build_object('label', 'Kafa Bantlı Kulaklık', 'value', 'over_ear'),
                jsonb_build_object('label', 'TWS Kulaklık', 'value', 'tws')
            ]
        ),
        jsonb_build_object(
            'label', 'GSM Aksesuar', 
            'value', 'gsm_accessory',
            'lower_groups', ARRAY[
                jsonb_build_object('label', 'Duvar Adaptörü', 'value', 'wall_adapter'),
                jsonb_build_object('label', 'Powerbank', 'value', 'powerbank'),
                jsonb_build_object('label', 'Diğer', 'value', 'other')
            ]
        )
    ],
    'brands', ARRAY[
        'Philips', 'Ugreen', 'JBL', 'Anker', 'Baseus', 'Ttec', 
        'Cellurline', 'Shokz', 'Fresh''N Rebul', 'Sennheiser', 
        'Huawei', 'Momax', 'Piili', 'Diğer'
    ],
    'fields', ARRAY[
        jsonb_build_object('name', 'artikel', 'label', 'Artikel No', 'type', 'text', 'required', true),
        jsonb_build_object('name', 'price', 'label', 'Fiyat', 'type', 'number', 'required', true)
    ]
) as new_config;

-- Test verisi oluştur
CREATE TABLE IF NOT EXISTS test_basket_config AS
SELECT jsonb_build_object(
    'type', 'dynamic_basket',
    'basket_types', ARRAY[
        jsonb_build_object('label', 'Büyük boy Sepet', 'value', 'large_basket'),
        jsonb_build_object('label', 'Baket Sepet', 'value', 'basket')
    ],
    'upper_groups', ARRAY[
        jsonb_build_object(
            'label', 'Kulaklık', 
            'value', 'headphone',
            'lower_groups', ARRAY[
                jsonb_build_object('label', 'Kulakiçi Kulaklık', 'value', 'in_ear'),
                jsonb_build_object('label', 'Kafa Bantlı Kulaklık', 'value', 'over_ear'),
                jsonb_build_object('label', 'TWS Kulaklık', 'value', 'tws')
            ]
        ),
        jsonb_build_object(
            'label', 'GSM Aksesuar', 
            'value', 'gsm_accessory',
            'lower_groups', ARRAY[
                jsonb_build_object('label', 'Duvar Adaptörü', 'value', 'wall_adapter'),
                jsonb_build_object('label', 'Powerbank', 'value', 'powerbank'),
                jsonb_build_object('label', 'Diğer', 'value', 'other')
            ]
        )
    ],
    'brands', ARRAY[
        'Philips', 'Ugreen', 'JBL', 'Anker', 'Baseus', 'Ttec', 
        'Cellurline', 'Shokz', 'Fresh''N Rebul', 'Sennheiser', 
        'Huawei', 'Momax', 'Piili', 'Diğer'
    ],
    'fields', ARRAY[
        jsonb_build_object('name', 'artikel', 'label', 'Artikel No', 'type', 'text', 'required', true),
        jsonb_build_object('name', 'price', 'label', 'Fiyat', 'type', 'number', 'required', true)
    ]
) as config;
