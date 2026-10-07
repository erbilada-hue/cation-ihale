import { describe, expect, it } from "vitest";
import { EksikBilgiHatasi, hesaplaUrun, teklifOlustur, yuvarlamaSecenekleri } from "./maliyet";
import { maliyetGirdisi } from "./maliyetGirdisi";
import type { UrunKalemli } from "./tipler";

const tisort = {
  adet: 4000,
  fireOrani: 5,
  karMarji: 20,
  kdvOrani: 20,
  kalemler: [
    { kullanim: 0.5, birimFiyat: 120 }, // kumaş 60
    { kullanim: 1, birimFiyat: 25 }, // dikim 25
    { kullanim: 1, birimFiyat: 15 }, // baskı 15
  ],
};

describe("hesaplaUrun", () => {
  it("zinciri sırasıyla uygular: ham → fire → kâr → KDV", () => {
    const s = hesaplaUrun(tisort);
    expect(s.birim.ham).toBeCloseTo(100);
    expect(s.birim.fireDahil).toBeCloseTo(105);
    expect(s.birim.teklif).toBeCloseTo(126);
    expect(s.birim.kdvDahil).toBeCloseTo(151.2);
    expect(s.birim.fireTutari).toBeCloseTo(5);
    expect(s.birim.karTutari).toBeCloseTo(21);
    expect(s.birim.kdvTutari).toBeCloseTo(25.2);
  });

  it("toplamları adetle çarpar", () => {
    const s = hesaplaUrun(tisort);
    expect(s.toplam.ham).toBeCloseTo(400_000);
    expect(s.toplam.teklif).toBeCloseTo(504_000);
    expect(s.toplam.karTutari).toBeCloseTo(84_000);
  });

  it("kâr marjı girilmeden teklif fiyatı hesaplamaz", () => {
    const s = hesaplaUrun({ ...tisort, karMarji: null });
    expect(s.karEksik).toBe(true);
    expect(s.birim.fireDahil).toBeCloseTo(105);
    expect(s.birim.teklif).toBeNull();
    expect(s.birim.kdvDahil).toBeNull();
  });

  it("fire girilmeden fire dahil maliyeti hesaplamaz", () => {
    const s = hesaplaUrun({ ...tisort, fireOrani: null });
    expect(s.fireEksik).toBe(true);
    expect(s.birim.fireDahil).toBeNull();
    expect(s.birim.teklif).toBeNull();
  });

  it("eksik kalemleri sayar ve 0 kabul eder", () => {
    const s = hesaplaUrun({
      ...tisort,
      kalemler: [...tisort.kalemler, { kullanim: 1, birimFiyat: null }],
    });
    expect(s.eksikKalemSayisi).toBe(1);
    expect(s.birim.ham).toBeCloseTo(100);
  });

  it("teklif birim fiyatını kuruşa yuvarlar, kârı yuvarlanmış fiyattan hesaplar", () => {
    const s = hesaplaUrun({
      adet: 4000,
      fireOrani: 5,
      karMarji: 20,
      kdvOrani: 20,
      kalemler: [{ kullanim: 1, birimFiyat: 81.25 }],
    });
    expect(s.birim.fireDahil).toBeCloseTo(85.3125);
    expect(s.birim.teklif).toBe(102.38);
    expect(s.toplam.teklif).toBeCloseTo(409_520);
    expect(s.toplam.karTutari).toBeCloseTo(68_270);
  });

  it("%0 kâr ve %0 fire geçerlidir", () => {
    const s = hesaplaUrun({ ...tisort, fireOrani: 0, karMarji: 0 });
    expect(s.birim.teklif).toBeCloseTo(100);
  });
});

describe("teklifOlustur", () => {
  it("birim fiyatı kuruşa yuvarlar, toplamı yuvarlanmış fiyattan hesaplar", () => {
    const t = teklifOlustur([
      {
        ad: "Polo",
        adet: 3,
        fireOrani: 0,
        karMarji: 0,
        kdvOrani: 20,
        kalemler: [{ kullanim: 1, birimFiyat: 10.005 }],
      },
    ]);
    expect(t.satirlar[0].birimFiyat).toBe(10.01);
    expect(t.satirlar[0].toplam).toBe(30.03);
    expect(t.araToplam).toBe(30.03);
    expect(t.kdvler).toEqual([{ oran: 20, matrah: 30.03, tutar: 6.01 }]);
    expect(t.genelToplam).toBe(36.04);
  });

  it("farklı KDV oranlarını ayrı satırda gösterir", () => {
    const urun = (kdvOrani: number) => ({
      ad: "x",
      adet: 1,
      fireOrani: 0,
      karMarji: 0,
      kdvOrani,
      kalemler: [{ kullanim: 1, birimFiyat: 100 }],
    });
    const t = teklifOlustur([urun(20), urun(10), urun(20)]);
    expect(t.kdvler).toEqual([
      { oran: 10, matrah: 100, tutar: 10 },
      { oran: 20, matrah: 200, tutar: 40 },
    ]);
    expect(t.genelToplam).toBe(350);
  });

  it("kâr marjı girilmemiş ürün varsa hata verir", () => {
    expect(() => teklifOlustur([{ ...tisort, ad: "Tişört", karMarji: null }])).toThrow(
      EksikBilgiHatasi,
    );
  });
});

describe("döviz", () => {
  it("dolar/euro kalemleri kurla TL'ye çevirir", () => {
    const s = hesaplaUrun({
      ...tisort,
      kalemler: [
        { kullanim: 0.5, birimFiyat: 3, kur: 40 }, // 3 $ × 40 = 120 ₺ → 60
        { kullanim: 1, birimFiyat: 25, kur: 1 },
        { kullanim: 1, birimFiyat: 15 },
      ],
    });
    expect(s.birim.ham).toBeCloseTo(100);
    expect(s.birim.teklif).toBeCloseTo(126);
    expect(s.kurEksikKalemSayisi).toBe(0);
  });

  it("kur girilmemişse teklif fiyatı hesaplanmaz ve teklif oluşturulmaz", () => {
    const urun = { ...tisort, kalemler: [{ kullanim: 1, birimFiyat: 3, kur: null }, ...tisort.kalemler] };
    const s = hesaplaUrun(urun);
    expect(s.kurEksikKalemSayisi).toBe(1);
    expect(s.birim.ham).toBeCloseTo(100);
    expect(s.birim.teklif).toBeNull();
    expect(() => teklifOlustur([{ ...urun, ad: "Tişört" }])).toThrow(/döviz kuru/);
  });
});

describe("dövizli ve ihracat teklifi", () => {
  const polo = { ad: "Polo", adet: 1000, fireOrani: 0, karMarji: 0, kdvOrani: 20, kalemler: [{ kullanim: 1, birimFiyat: 192.5 }] };

  it("TL teklif fiyatını kurla euroya çevirip sente yuvarlar", () => {
    const t = teklifOlustur([polo], { paraBirimi: "EUR", kur: 38.5, ihracat: false });
    expect(t.satirlar[0].birimFiyat).toBe(5);
    expect(t.araToplam).toBe(5000);
    expect(t.kdvler).toEqual([{ oran: 20, matrah: 5000, tutar: 1000 }]);
    expect(t).toMatchObject({ paraBirimi: "EUR", kur: 38.5, ihracat: false });
  });

  it("ihracatta KDV uygulanmaz", () => {
    const t = teklifOlustur([polo], { paraBirimi: "USD", kur: 35, ihracat: true, teslimSekli: "FOB", dil: "en" });
    expect(t.satirlar[0].birimFiyat).toBe(5.5);
    expect(t.satirlar[0].kdvOrani).toBe(0);
    expect(t.kdvler).toEqual([]);
    expect(t.genelToplam).toBe(5500);
    expect(t).toMatchObject({ ihracat: true, teslimSekli: "FOB", dil: "en" });
  });

  it("dövizli teklifte kur girilmemişse hata verir", () => {
    expect(() => teklifOlustur([polo], { paraBirimi: "EUR", kur: null, ihracat: true })).toThrow(/euro kurunu/);
  });
});

describe("teklif fiyatını yuvarlama", () => {
  // Ham 457,83 · fire %4 → 476,1432 · kâr %40 → 666,60
  const gomlek = {
    adet: 60,
    fireOrani: 4,
    karMarji: 40,
    kdvOrani: 10,
    kalemler: [{ kullanim: 1, birimFiyat: 457.83 }],
  };

  it("hesaplanan fiyata göre alt ve üst yuvarlak fiyat önerir", () => {
    expect(hesaplaUrun(gomlek).birim.teklif).toBe(666.6);
    expect(yuvarlamaSecenekleri(666.6)).toEqual([665, 670]);
    expect(yuvarlamaSecenekleri(48.37)).toEqual([48, 49]);
    expect(yuvarlamaSecenekleri(2.34)).toEqual([2.3, 2.35]);
    expect(yuvarlamaSecenekleri(670)).toEqual([]);
  });

  it("yuvarlanmış fiyatla kâr ve KDV yeniden hesaplanır", () => {
    const s = hesaplaUrun({ ...gomlek, yuvarlanmisTeklif: 670 });
    expect(s.yuvarlandi).toBe(true);
    expect(s.hesaplananTeklif).toBe(666.6);
    expect(s.birim.teklif).toBe(670);
    expect(s.birim.karTutari).toBeCloseTo(670 - 476.1432, 4);
    expect(s.birim.kdvDahil).toBeCloseTo(737, 6);
    expect(s.toplam.teklif).toBe(40200);
    expect(s.gercekMarj).toBeCloseTo(40.714, 2);
  });

  it("müşteri teklifinde yuvarlanmış fiyat yazılır", () => {
    const t = teklifOlustur([{ ...gomlek, ad: "Gömlek", yuvarlanmisTeklif: 665, musteriFiyati: 665 }]);
    expect(t.satirlar[0].birimFiyat).toBe(665);
    expect(t.araToplam).toBe(39900);
    expect(t.genelToplam).toBe(43890);
  });

  it("euro teklifte yuvarlanmış euro fiyat kurla çevrilmeden yazılır", () => {
    const urun = {
      id: "u", ihale_id: "i", urun_grubu: "gomlek", ad: "Gömlek", aciklama: "", sira: 0,
      adet: 60, fire_orani: 4, kar_marji: 40, kdv_orani: 0,
      yuvarlanmis_fiyat: 13.5, yuvarlanmis_para_birimi: "EUR",
      urun_kalemleri: [{ id: "k", urun_id: "u", ad: "Kumaş", kullanim: 1, birim_fiyat: 457.83, para_birimi: "TRY", sira: 0 }],
    } as unknown as UrunKalemli;
    const kurlar = { USD: null, EUR: 48.8669 };
    const girdi = maliyetGirdisi(urun, kurlar, "EUR");
    expect(girdi.yuvarlanmisTeklif).toBeCloseTo(13.5 * 48.8669, 6);
    const t = teklifOlustur([{ ...girdi, ad: "Gömlek", musteriFiyati: 13.5 }], { paraBirimi: "EUR", kur: 48.8669, ihracat: true });
    expect(t.satirlar[0].birimFiyat).toBe(13.5);
    expect(t.araToplam).toBe(810);
    // Teklif para birimi TL'ye dönerse eski euro yuvarlaması kullanılmaz
    expect(maliyetGirdisi(urun, kurlar, "TRY").yuvarlanmisTeklif).toBeNull();
  });
});
