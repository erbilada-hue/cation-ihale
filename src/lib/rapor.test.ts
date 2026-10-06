import { describe, expect, it } from "vitest";
import { donemAraligi, ihaleToplami } from "./rapor";
import type { UrunKalemli } from "./tipler";

const bugun = new Date("2026-10-07T00:30:00+03:00");

describe("donemAraligi", () => {
  it("bu ay, Türkiye saatine göre", () => {
    expect(donemAraligi(undefined, bugun)).toMatchObject({ kod: "bu-ay", bas: "2026-10-01", bit: "2026-10-31", baslik: "Ekim 2026" });
  });
  it("geçen ay, yıl dönümünde", () => {
    expect(donemAraligi("gecen-ay", new Date("2027-01-15T12:00:00+03:00"))).toMatchObject({
      bas: "2026-12-01",
      bit: "2026-12-31",
      baslik: "Aralık 2026",
    });
  });
  it("şubat sonu", () => {
    expect(donemAraligi("gecen-ay", new Date("2028-03-10T12:00:00+03:00")).bit).toBe("2028-02-29");
  });
  it("bu yıl ve geçen yıl", () => {
    expect(donemAraligi("bu-yil", bugun)).toMatchObject({ bas: "2026-01-01", bit: "2026-12-31" });
    expect(donemAraligi("gecen-yil", bugun)).toMatchObject({ bas: "2025-01-01", bit: "2025-12-31", baslik: "2025 yılı" });
  });
  it("özel aralık ters girilirse düzeltilir, hatalı tarih yok sayılır", () => {
    expect(donemAraligi("ozel", bugun, { bas: "2026-09-30", bit: "2026-09-01" })).toMatchObject({
      bas: "2026-09-01",
      bit: "2026-09-30",
      baslik: "01.09.2026 – 30.09.2026",
    });
    expect(donemAraligi("ozel", bugun, { bas: "abc" })).toMatchObject({ bas: "2026-10-01", bit: "2026-10-07" });
  });
});

const urun = (o: Partial<UrunKalemli>): UrunKalemli => ({
  id: "u",
  ihale_id: "i",
  urun_grubu: "hazir_urun",
  ad: "Kemer",
  aciklama: "",
  adet: 100,
  fire_orani: 0,
  kar_marji: 20,
  kdv_orani: 20,
  sira: 0,
  urun_kalemleri: [
    { id: "k", urun_id: "u", sablon_id: null, ad: "Kemer", zorunlu: true, birim: "adet", kullanim: 1, birim_fiyat: 180, para_birimi: "TRY", tedarikci_fiyat_id: null, sira: 0 },
  ],
  ...o,
});

describe("ihaleToplami", () => {
  it("teklif, KDV dahil ve net kâr", () => {
    const t = ihaleToplami([urun({}), urun({ adet: 50, kar_marji: null })], { USD: null, EUR: null });
    expect(t.adet).toBe(150);
    expect(t.teklif).toBeCloseTo(21600);
    expect(t.kdvDahil).toBeCloseTo(25920);
    expect(t.netKar).toBeCloseTo(3600);
    expect(t.eksik).toBe(true);
  });
});
