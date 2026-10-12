import { describe, expect, it } from "vitest";
import { analiziEslestir, gecmisOrnekMetni, kutuphaneMetni, type AnalizCiktisi } from "./sartnameAnalizi";
import type { KalemSablonu } from "./tipler";

const sablon = (id: string, urun_grubu: string, ad: string, zorunlu = false, anahtar_kelimeler: string[] = []): KalemSablonu => ({
  id,
  urun_grubu,
  ad,
  zorunlu,
  birim: "adet",
  varsayilan_kullanim: null,
  varsayilan_birim_fiyat: null,
  anahtar_kelimeler,
  sira: 0,
});

const SABLONLAR = [
  { ...sablon("1", "mont_kaban", "Ana kumaş", true), birim: "m", varsayilan_kullanim: 2 },
  sablon("2", "mont_kaban", "Reflektör bant", false, ["reflektör", "EN ISO 20471"]),
  sablon("3", "mont_kaban", "Nakliye payı"),
  { ...sablon("5", "tisort_polo", "Ana kumaş", true), birim: "m", varsayilan_kullanim: 1.2 },
  sablon("6", "tisort_polo", "Fason – Dikim", true),
  sablon("4", "tisort_polo", "Nakış"),
  sablon("7", "tisort_polo", "Düğme"),
];

const k = (ad: string, birim: "kg" | "m" | "adet", kullanim: number | null, hesap = "") => ({ ad, birim, kullanim, hesap });

const cikti = (ek: Partial<AnalizCiktisi> = {}): AnalizCiktisi => ({
  tur: "sartname",
  tur_gerekcesi: " Gramaj var. ",
  ihale: { musteri: "Belediye", teslim_yeri: "Van", termin: "", son_teklif_tarihi: "15.10.2026" },
  urunler: [
    {
      ad: " Kışlık mont ",
      urun_grubu: "mont_kaban",
      adet: 500,
      aciklama: "su itici",
      kalemler: [k("reflektör bant", "m", 1.2), k("Nakış", "adet", 1), k("Uydurma", "adet", -3)],
    },
    {
      ad: "Lakost polo",
      urun_grubu: "tisort_polo",
      adet: 0,
      aciklama: "220 gr/m² lakost",
      kalemler: [
        k("ANA KUMAŞ", "kg", 0.27, " 220 gr/m² × 1,25 m² ≈ 0,27 kg "),
        k("Ribana yaka", "kg", 0.02),
        k("Kol bandı", "kg", 0.03),
        k("Düğme", "adet", 3),
      ],
    },
  ],
  uyarilar: ["", " Adet yok "],
  ...ek,
});

describe("analiziEslestir", () => {
  it("zorunlu kalemlere tahmini kullanımı ve birimi yazar, eksik olanlarda kütüphane varsayılanını kullanır", () => {
    const s = analiziEslestir(cikti(), SABLONLAR);
    const polo = s.urunler[1].kalemler;
    expect(polo[0]).toEqual({ sablonId: "5", ad: "Ana kumaş", zorunlu: true, birim: "kg", kullanim: 0.27, hesap: "220 gr/m² × 1,25 m² ≈ 0,27 kg" });
    expect(polo[1]).toMatchObject({ sablonId: "6", zorunlu: true, birim: "adet", kullanim: null, hesap: "" });
    expect(s.urunler[0].kalemler[0]).toMatchObject({ sablonId: "1", birim: "m", kullanim: 2, hesap: "" });
  });

  it("opsiyonelleri kendi grubunda eşleştirir, listede olmayanları yeni kalem olarak ekler", () => {
    const s = analiziEslestir(cikti(), SABLONLAR);
    expect(s.urunler[1].kalemler.map((x) => [x.ad, x.sablonId, x.kullanim])).toEqual([
      ["Ana kumaş", "5", 0.27],
      ["Fason – Dikim", "6", null],
      ["Düğme", "7", 3],
      ["Ribana yaka", null, 0.02],
      ["Kol bandı", null, 0.03],
    ]);
    // Montta "Nakış" tişört grubuna ait; yeni kalem olarak gelir. Negatif kullanım atılır.
    const mont = s.urunler[0].kalemler;
    expect(mont.find((x) => x.ad === "Reflektör bant")).toMatchObject({ sablonId: "2", kullanim: 1.2 });
    expect(mont.find((x) => x.ad === "Nakış")).toMatchObject({ sablonId: null });
    expect(mont.find((x) => x.ad === "Uydurma")).toMatchObject({ kullanim: null });
    expect(s.urunler[1].adet).toBeNull();
  });

  it("geçersiz tarihi boşaltır, boş uyarıları atar", () => {
    const s = analiziEslestir(cikti(), SABLONLAR);
    expect(s.ihale.son_teklif_tarihi).toBe("");
    expect(s.uyarilar).toEqual(["Adet yok"]);
    expect(s.gerekce).toBe("Gramaj var.");
    expect(analiziEslestir(cikti({ ihale: { musteri: "", teslim_yeri: "", termin: "", son_teklif_tarihi: "2026-10-15" } }), SABLONLAR).ihale.son_teklif_tarihi).toBe("2026-10-15");
  });
});

describe("kutuphaneMetni", () => {
  it("her grubun zorunlu ve opsiyonel kalemlerini birim ve anahtar kelimeleriyle listeler", () => {
    const m = kutuphaneMetni(SABLONLAR);
    expect(m).toContain(
      "mont_kaban (Mont-Kaban):\n  Zorunlu:\n    - Ana kumaş [m]\n  Opsiyonel:\n    - Reflektör bant [adet] (anahtar kelimeler: reflektör, EN ISO 20471)\n    - Nakliye payı [adet]",
    );
    expect(m).toContain("gomlek (Gömlek):\n  Zorunlu:\n    (yok)\n  Opsiyonel:\n    (yok)");
  });
});

describe("gecmisOrnekMetni", () => {
  const polo = (ad: string, aciklama = "") => ({
    urun_grubu: "tisort_polo",
    ad,
    aciklama,
    kalemler: [
      { ad: "Ana kumaş", birim: "kg", kullanim: 0.27 },
      { ad: "Ribana yaka", birim: "kg", kullanim: 0.02 },
      { ad: "Baskı", birim: "adet", kullanim: null },
    ],
  });

  it("kullanımı olan kalemleri Türkçe ondalıkla yazar, boşları atlar", () => {
    expect(gecmisOrnekMetni([polo("Lakost polo", "220 gr pike")])).toBe(
      "- tisort_polo · Lakost polo (220 gr pike): Ana kumaş 0,27 kg; Ribana yaka 0,02 kg",
    );
  });

  it("grup başına sınır koyar, aynı adlı ürünü bir kez yazar, kalemsiz ürünü atlar", () => {
    const metin = gecmisOrnekMetni(
      [
        polo("A"),
        polo("a "),
        polo("B"),
        { urun_grubu: "gomlek", ad: "Boş", aciklama: "", kalemler: [{ ad: "Düğme", birim: "adet", kullanim: 0 }] },
        polo("C"),
      ],
      2,
    );
    expect(metin.split("\n")).toEqual([
      "- tisort_polo · A: Ana kumaş 0,27 kg; Ribana yaka 0,02 kg",
      "- tisort_polo · B: Ana kumaş 0,27 kg; Ribana yaka 0,02 kg",
    ]);
  });
});
