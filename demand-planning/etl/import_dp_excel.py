"""Ugreen Demand Planning Excel'ini (Demand sayfası) düzenli tablolara çevirir.

Kullanım:
    python import_dp_excel.py <dosya.xlsx> <cikti.json>

Excel her ay sağa yeni bir blok eklenerek büyüyor; bu betik o blokları sütun harflerine göre
okur. Sütun haritası 29.06.2026 tarihli dosyaya göredir. Yeni ay eklendiğinde COLUMN_MAP'e
yeni blok eklenmelidir (sistem canlıya geçince bu Excel'e ihtiyaç kalmaz).
"""
import json
import sys
from collections import Counter, defaultdict

import openpyxl
from openpyxl.utils import column_index_from_string as ci

FIRST_ROW, LAST_ROW = 5, 860
CH = ['MM', 'Vatan', 'Teknosa', 'Amazon', 'Quad', 'Evkur', 'Geleneksel']

# Ürün ana verisi
MASTER = {'kanal': 'A', 'kanal_kural': 'F', 'eol': 'C', 'kod': 'E', 'model': 'G', 'ean': 'H',
          'hero': 'I', 'not': 'J', 'grup': 'K', 'alt_grup': 'L', 'aciklama': 'M',
          'tskf': 'T', 'stok_degeri_27nis': 'V', 'stok_yasi_gun': 'Y', 'gumruk_stok': 'Z'}
# Haftalık/aylık stok fotoğrafları
STOCK = [('2026-04-06', 'N'), ('2026-04-13', 'O'), ('2026-04-27', 'P'),
         ('2026-05-18', 'R'), ('2026-06-01', 'S'), ('2026-06-29', 'U')]
# FOB sipariş planı: ay sonunda depoya girecek adet
INBOUND = [('2026-05', 'AF'), ('2026-06', 'AG'), ('2026-07', 'AH'), ('2026-08', 'AI'), ('2026-09', 'AJ'),
           ('2026-10', 'AK'), ('2026-11', 'AL'), ('2026-12', 'AM'), ('2027-01', 'AN')]
# Stok dağılım planı (aylık toplam çıkış planı)
DIST = [('2026-05', 'AZ'), ('2026-06', 'BA'), ('2026-07', 'BB'), ('2026-08', 'BC'), ('2026-09', 'BD'),
        ('2026-10', 'BE'), ('2026-11', 'BF'), ('2026-12', 'BG')]
# Kanal bazında aylık plan ve gerçekleşen (sell-in = bizim kanala çıkışımız)
PLAN = {
    '2026-02': {'MM': 'BP', 'Vatan': 'BS', 'Teknosa': 'BV', 'Evkur': 'BW', 'Amazon': 'BX', 'Quad': 'BY'},
    '2026-03': {'MM': 'CR', 'Vatan': 'CV', 'Teknosa': 'CZ', 'Evkur': 'DA', 'Amazon': 'DB', 'Quad': 'DD'},
    '2026-04': {'MM': 'DY', 'Vatan': 'ED', 'Teknosa': 'EH', 'Evkur': 'EJ', 'Amazon': 'EL', 'Quad': 'EN'},
    '2026-05': {'MM': 'GJ', 'Vatan': 'GN', 'Teknosa': 'GR', 'Quad': 'GV', 'Amazon': 'GZ'},
    '2026-06': {'Amazon': 'HM', 'Quad': 'HN', 'MM': 'HO', 'Vatan': 'HP', 'Teknosa': 'HQ'},
    '2026-07': {'Amazon': 'JD', 'Quad': 'JE', 'MM': 'JF', 'Vatan': 'JG', 'Teknosa': 'JH'},
}
SALES_TEAM_PLAN = {  # satış ekibinin kendi planı
    '2026-02': {'MM': 'CC', 'Vatan': 'CD', 'Teknosa': 'CE', 'Evkur': 'CF', 'Amazon': 'CG', 'Quad': 'CH'},
    '2026-06': {'MM': 'IR', 'Vatan': 'IS', 'Teknosa': 'IT', 'Amazon': 'IU', 'Quad': 'IV', 'Evkur': 'IW'},
}
ACTUAL = {
    '2026-01': {'MM': 'BJ', 'Vatan': 'BK', 'Teknosa': 'BL', 'Amazon': 'BM', 'Geleneksel': 'BN'},
    '2026-02': {'MM': 'CJ', 'Vatan': 'CK', 'Teknosa': 'CL', 'Evkur': 'CM', 'Amazon': 'CN', 'Quad': 'CO'},
    '2026-03': {'MM': 'DQ', 'Vatan': 'DR', 'Teknosa': 'DS', 'Evkur': 'DT', 'Amazon': 'DU', 'Quad': 'DV'},
    '2026-04': {'MM': 'EV', 'Vatan': 'EW', 'Teknosa': 'EX', 'Evkur': 'EY', 'Amazon': 'EZ', 'Quad': 'FA'},
    '2026-05': {'MM': 'HD', 'Vatan': 'HG', 'Teknosa': 'HI', 'Amazon': 'HJ', 'Quad': 'HK', 'Evkur': 'HL'},
    '2026-06': {'MM': 'IX', 'Vatan': 'IY', 'Teknosa': 'IZ', 'Amazon': 'JA', 'Quad': 'JB', 'Evkur': 'JC'},
}
# Mayıs başı kanal fotoğrafı: müşterinin raftan satışı (sell-out) ve elindeki stok
CHANNEL_SNAPSHOT = {'MM': ('FF', 'FG'), 'Vatan': ('FK', 'FL'), 'Teknosa': ('FP', 'FQ'),
                    'Quad': ('FR', 'FS'), 'Amazon': ('FY', 'FX')}
# Temmuz kanal fiyat koşulları: kanal marjı ve kanalın alış fiyatı (bizim satış fiyatımız)
PRICE = {'MM': ('JK', 'JL'), 'Vatan': ('JO', 'JP'), 'Teknosa': ('JS', 'JT'), 'Quad': ('JW', 'JX'), 'Amazon': ('KA', 'KB')}
COMMENTS = [('Özel not', 'J'), ('Şubat satış', 'CA'), ('Şubat pazarlama', 'CB'), ('Mart', 'DG'), ('30 Mart', 'DH'),
            ('Nisan', 'ET'), ('Nisan güncel', 'EU'), ('Mayıs güncel', 'GC'), ('Mayıs', 'GE'), ('Yeni not', 'KE')]
GROUP_FIX = {'Mobil ACC': 'Mobil Acc', 'Kablo&Priz': 'Kablo & Priz'}


def main(src, dst):
    ws = openpyxl.load_workbook(src, data_only=True)['Demand']
    issues = Counter()
    issue_cols = defaultdict(Counter)

    def raw(r, col):
        return ws.cell(r, ci(col)).value

    def num(r, col):
        v = raw(r, col)
        if v is None or v == '' or v == '-' or v == ' ':
            return None
        if isinstance(v, str):
            if v.startswith('#'):
                issues[v] += 1
                issue_cols[col][v] += 1
                return None
            try:
                return float(v.replace(',', '.'))
            except ValueError:
                issues['metin sayı alanında'] += 1
                issue_cols[col]['metin'] += 1
                return None
        return float(v)

    def text(r, col):
        v = raw(r, col)
        if v is None:
            return None
        v = str(v).strip()
        if v.startswith('#'):
            issues[v] += 1
            issue_cols[col][v] += 1
            return None
        return v or None

    products = []
    for r in range(FIRST_ROW, LAST_ROW + 1):
        code = text(r, 'E')
        if not code:
            continue
        p = {k: text(r, c) for k, c in MASTER.items() if k not in ('tskf', 'stok_degeri_27nis', 'stok_yasi_gun', 'gumruk_stok')}
        p['grup'] = GROUP_FIX.get(p['grup'], p['grup'])
        for k in ('tskf', 'stok_degeri_27nis', 'stok_yasi_gun', 'gumruk_stok'):
            p[k] = num(r, MASTER[k])
        p['stok'] = {d: num(r, c) for d, c in STOCK}
        st = p['stok']['2026-04-27']
        p['birim_maliyet'] = round(p['stok_degeri_27nis'] / st, 2) if p['stok_degeri_27nis'] and st else None
        p['gelen'] = {m: num(r, c) for m, c in INBOUND}
        p['dagilim_plan'] = {m: num(r, c) for m, c in DIST}
        p['plan'] = {m: {ch: num(r, c) for ch, c in cols.items()} for m, cols in PLAN.items()}
        p['ekip_plan'] = {m: {ch: num(r, c) for ch, c in cols.items()} for m, cols in SALES_TEAM_PLAN.items()}
        p['gercek'] = {m: {ch: num(r, c) for ch, c in cols.items()} for m, cols in ACTUAL.items()}
        p['kanal_foto'] = {ch: {'satis': num(r, a), 'stok': num(r, b)} for ch, (a, b) in CHANNEL_SNAPSHOT.items()}
        p['fiyat'] = {ch: {'marj': num(r, a), 'alis': num(r, b)} for ch, (a, b) in PRICE.items()}
        p['yorumlar'] = [[lbl, text(r, c)] for lbl, c in COMMENTS if text(r, c)]
        p['temmuz_kalan'] = num(r, 'JJ')
        products.append(p)

    out = {'kaynak': 'Ugreen_Demand_Planning_29.06.2026', 'kanallar': CH, 'urunler': products,
           'veri_kalitesi': {'toplam': dict(issues), 'sutun': {k: dict(v) for k, v in issue_cols.items()}}}
    with open(dst, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(products)} ürün yazıldı; veri hataları: {dict(issues)}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
