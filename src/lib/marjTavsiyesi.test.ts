import { describe, expect, it } from "vitest";
import { marjIstemi, oneriyiDuzelt } from "./marjTavsiyesi";

describe("marjIstemi", () => {
  const g = {
    urun: { ad: "Kışlık mont", urun_grubu: "mont_kaban", aciklama: "su itici", adet: 4000 },
    ihale: { musteri: "Belediye", teslim_yeri: "Van", termin: "45 gün", kaynak: "segment", segment: "standart" },
    hamMaliyet: 512.4,
    fireOrani: 5,
    fireDahilMaliyet: 538.02,
    kalemler: [
      { ad: "Fermuar", tutar: 6.2, paraBirimi: "TRY" },
      { ad: "Ana kumaş", tutar: 310, paraBirimi: "USD" },
    ],
    gecmis: [],
  };

  it("maliyeti, kalemleri büyükten küçüğe ve dövizli kalemi yazar", () => {
    const m = marjIstemi(g);
    expect(m).toContain("Adet: 4.000");
    expect(m).toContain("Birim ham maliyet: 512,40 TL");
    expect(m).toContain("Fire dahil birim maliyet: 538,02 TL");
    expect(m.indexOf("Ana kumaş: 310,00 TL (USD ile alınıyor)")).toBeLessThan(m.indexOf("Fermuar: 6,20 TL"));
    expect(m).toContain("brief, standart segment");
    expect(m).toContain("geçmiş marj kaydı yok");
  });

  it("geçmiş marjları aşamasıyla yazar", () => {
    const m = marjIstemi({ ...g, gecmis: [{ ad: "Mont", adet: 1000, marj: 12, asama: "siparis", tarih: "2026-09-01" }] });
    expect(m).toContain("- 2026-09-01 · Mont · 1.000 adet · marj %12 · aşama: Sipariş");
  });
});

describe("oneriyiDuzelt", () => {
  it("sınırlar, aralığı öneriyi kapsayacak şekilde düzeltir", () => {
    expect(oneriyiDuzelt({ onerilen: 12.345, alt: 15, ust: 10, gerekceler: [" a ", "", "b", "c", "d", "e"] })).toEqual({
      onerilen: 12.3,
      alt: 12.3,
      ust: 12.3,
      gerekceler: ["a", "b", "c", "d"],
    });
    expect(oneriyiDuzelt({ onerilen: 150, alt: -5, ust: 200, gerekceler: [] })).toMatchObject({ onerilen: 100, alt: 0, ust: 100 });
  });
});
