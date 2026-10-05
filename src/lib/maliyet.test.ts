import { describe, expect, it } from "vitest";
import { EksikBilgiHatasi, hesaplaUrun, teklifOlustur } from "./maliyet";

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
