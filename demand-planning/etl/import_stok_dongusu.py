"""Sell-out & Stok Döngüsü HTML raporundaki gömülü veriyi (const D=...) planlama ekranına çevirir.

Kullanım:
    python import_stok_dongusu.py <rapor_veri.json> <dp2026.json> <cikti.json>

<rapor_veri.json>: rapor HTML dosyasındaki `const D=` nesnesinin JSON hali.
Rapor ürünleri DP ürün kodlarına; ad içindeki kod, zincir ürün kodu ve model koduyla eşlenir.
Çıktı: mağaza listesi, mağaza × ürün (Tem–Eyl satış, Eylül satış, stok, yolda), merkez depo stoku,
zincir × marka × ay raftan satış.
"""
import json,sys,re,collections
so=json.load(open(sys.argv[1]));dp=json.load(open(sys.argv[2]))
codes={p['k'] for p in dp['urunler']};base=collections.defaultdict(set)
for c in codes: base[c.split('/')[0].upper().replace(' ','')].add(c)
CH=['MM','Teknosa','Vatan']
def match(i):
    name=so['products'][i][0];pcs=so['pcode'][i].split('|',1);pc=pcs[-1]
    cands=[]
    if ' · ' in name: cands.append(name.split(' · ')[0].strip())
    cands.append(pc);cands+=re.findall(r'[A-Z0-9][A-Z0-9\-/\.]{3,}',name.upper())
    for c in cands:
        for cu in (c.upper().replace(' ',''),re.sub(r'-C$','',c.upper().replace(' ',''))):
            if cu in codes: return cu
            b=cu.split('/')[0]
            if b in base and len(base[b])==1: return next(iter(base[b]))
    return None
PR=so['products'];ST=so['stores'];M=so['months'];F=so['facts'];SK=so['stock']
pm=[match(i) for i in range(len(PR))]
nM=len(M);t3=[M.index(x) for x in ('Temmuz','Ağustos','Eylül')];eyl=M.index('Eylül')
mso=collections.defaultdict(lambda:[0]*nM);pair=collections.defaultdict(lambda:[0,0,0,0]);cbm=collections.defaultdict(lambda:[0]*nM)
for i in range(0,len(F),4):
    m,s,p,v=F[i:i+4];mso[s][m]+=v
    ch=ST[s][1] if ST[s][1] in CH else PR[p][1];cbm[ch+'|'+PR[p][3]][m]+=v
    if m in t3: pair[(s,p)][0]+=v
    if m==eyl: pair[(s,p)][1]+=v
sst=collections.Counter();syol=collections.Counter();sval=collections.Counter()
for i in range(0,len(SK),5):
    s,p,q,y,_=SK[i:i+5];pair[(s,p)][2]+=q;pair[(s,p)][3]+=y;sst[s]+=q;syol[s]+=y;sval[s]+=q*(PR[p][4] or 0)
stores=[[s[0],s[1],s[2],s[3],', '.join(s[4]),s[5],s[9],len(s[10]),len(s[11]),len(s[13]),mso[i],sst[i],syol[i],round(sval[i])] for i,s in enumerate(ST)]
pairs=[]
for (s,p),v in pair.items():
    if v[0] or v[2] or v[3]: pairs+= [s,p]+[round(x) for x in v]
out={'months':M,'note':so['monthNote'],'stockMeta':so['stockMeta'],'cov':so['cov'],'rakip':so['rakipMeta'],
     'stores':stores,'prods':[[p[0],p[1],p[2],p[3],p[4],pm[i]] for i,p in enumerate(PR)],'pairs':pairs,'depot':so['depot'],'cbm':cbm,
     'launch':so.get('launchDays')}
json.dump(out,open(sys.argv[3],'w'),ensure_ascii=False,separators=(',',':'))
print('pairs',len(pairs)//6,'matched',sum(1 for x in pm if x),'/',len(pm))
