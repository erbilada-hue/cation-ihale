import { describe, expect, it } from "vitest";
import { analiziEslestir, kutuphaneMetni, type AnalizCiktisi } from "./sartnameAnalizi";
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
  sablon("1", "mont_kaban", "Ana kumaş", true),
  sablon("2", "mont_kaban", "Reflektör bant", false, ["reflektör", "EN ISO 20471"]),
  sablon("3", "mont_kaban", "Nakliye payı"),
  sablon("4", "tisort_polo", "Nakış"),
];

const cikti = (ek: Partial<AnalizCiktisi> = {}): AnalizCiktisi => ({
  tur: "sartname",
  tur_gerekcesi: " Gramaj var. ",
  ihale: { musteri: "Belediye", teslim_yeri: "Van", termin: "", son_teklif_tarihi: "15.10.2026" },
  urunler: [
    { ad: " Kışlık mont ", urun_grubu: "mont_kaban", adet: 500, aciklama: "su itici", opsiyonel_kalemler: ["reflektör bant", "Nakış", "Ana kumaş", "Uydurma"] },
    { ad: "Polo", urun_grubu: "tisort_polo", adet: 0, aciklama: "", opsiyonel_kalemler: ["NAKIŞ"] },
  ],
  uyarilar: ["", " Adet yok "],
  ...ek,
});

describe("analiziEslestir", () => {
  it("opsiyonel kalemleri sadece kendi grubunun opsiyonelleriyle eşleştirir", () => {
    const s = analiziEslestir(cikti(), SABLONLAR);
    expect(s.urunler[0]).toMatchObject({ ad: "Kışlık mont", adet: 500, opsiyonelIdler: ["2"] });
    expect(s.urunler[1]).toMatchObject({ adet: null, opsiyonelIdler: ["4"] });
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
  it("her grubun opsiyonel kalemlerini anahtar kelimeleriyle listeler, zorunluları yazmaz", () => {
    const m = kutuphaneMetni(SABLONLAR);
    expect(m).toContain("mont_kaban (Mont-Kaban):\n  - Reflektör bant (anahtar kelimeler: reflektör, EN ISO 20471)\n  - Nakliye payı");
    expect(m).not.toContain("Ana kumaş");
    expect(m).toContain("gomlek (Gömlek):\n  (opsiyonel kalem yok)");
  });
});
