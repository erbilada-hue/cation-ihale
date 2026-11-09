import { describe, expect, it } from "vitest";
import { kutuphaneOnerileri, ortanca } from "./ogrenme";
import type { KalemSablonu } from "./tipler";

const sablon = (id: string, birim: string, varsayilan: number | null) =>
  ({ id, urun_grubu: "tisort_polo", ad: "K" + id, zorunlu: true, birim, varsayilan_kullanim: varsayilan, anahtar_kelimeler: [] }) as unknown as KalemSablonu;

describe("ortanca", () => {
  it("tek ve çift sayıda değerde ortadakini verir", () => {
    expect(ortanca([3, 1, 2])).toBe(2);
    expect(ortanca([4, 1, 2, 3])).toBe(2.5);
  });
});

describe("kutuphaneOnerileri", () => {
  const sablonlar = [sablon("a", "kg", 0.25), sablon("b", "kg", 0.02), sablon("c", "m", 1.4), sablon("d", "adet", null)];
  it("varsayılandan %10'dan fazla sapan ve en az 2 örneği olan kalemleri önerir", () => {
    const r = kutuphaneOnerileri(sablonlar, [
      { sablon_id: "a", birim: "kg", kullanim: 0.27 },
      { sablon_id: "a", birim: "kg", kullanim: 0.29 },
      { sablon_id: "a", birim: "kg", kullanim: 0.3 },
      { sablon_id: "b", birim: "kg", kullanim: 0.021 },
      { sablon_id: "b", birim: "kg", kullanim: 0.02 },
      { sablon_id: "c", birim: "m", kullanim: 1.6 },
      { sablon_id: "d", birim: "adet", kullanim: 3 },
      { sablon_id: "d", birim: "adet", kullanim: 3 },
    ]);
    expect(r.map((x) => [x.sablon.id, x.ornekSayisi, x.ortanca])).toEqual([
      ["a", 3, 0.29],
      ["d", 2, 3],
    ]);
  });

  it("farklı birimle girilmiş ve boş miktarları saymaz", () => {
    const r = kutuphaneOnerileri(sablonlar, [
      { sablon_id: "a", birim: "m", kullanim: 1.2 },
      { sablon_id: "a", birim: "m", kullanim: 1.3 },
      { sablon_id: "a", birim: "kg", kullanim: null },
    ]);
    expect(r).toEqual([]);
  });
});
