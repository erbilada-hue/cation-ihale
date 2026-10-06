import { describe, expect, it } from "vitest";
import { sayfalariCoz, urunGrubuBul } from "./kalemExcel";

describe("urunGrubuBul", () => {
  it("ürün grubu adlarını tanır", () => {
    expect(urunGrubuBul("Mont-Kaban")).toBe("mont_kaban");
    expect(urunGrubuBul("TİŞÖRT-POLO")).toBe("tisort_polo");
    expect(urunGrubuBul("Gömlek")).toBe("gomlek");
    expect(urunGrubuBul("Tişört")).toBe("tisort_polo");
    expect(urunGrubuBul("Ayakkabı")).toBeNull();
  });
});

describe("sayfalariCoz", () => {
  it("tek sayfalık listeyi okur", () => {
    const { satirlar, hatalar } = sayfalariCoz([
      {
        ad: "Kalemler",
        satirlar: [
          ["Ürün Grubu", "Kalem Adı", "Tip", "Birim", "Varsayılan Kullanım", "Birim Fiyat", "Anahtar Kelimeler"],
          ["Mont-Kaban", "Ana kumaş", "Zorunlu", "metre", 1.8, "145,50", ""],
          ["Mont-Kaban", "Reflektör şerit", "Opsiyonel", "metre", "1,2", "", "reflektör, EN ISO 20471"],
          ["", "", "", "", "", "", ""],
        ],
      },
    ]);
    expect(hatalar).toEqual([]);
    expect(satirlar).toEqual([
      {
        urun_grubu: "mont_kaban",
        ad: "Ana kumaş",
        zorunlu: true,
        birim: "metre",
        varsayilan_kullanim: 1.8,
        varsayilan_birim_fiyat: 145.5,
        anahtar_kelimeler: [],
      },
      {
        urun_grubu: "mont_kaban",
        ad: "Reflektör şerit",
        zorunlu: false,
        birim: "metre",
        varsayilan_kullanim: 1.2,
        varsayilan_birim_fiyat: null,
        anahtar_kelimeler: ["reflektör", "EN ISO 20471"],
      },
    ]);
  });

  it("ürün grubu sütunu yoksa sayfa adını kullanır", () => {
    const { satirlar } = sayfalariCoz([
      { ad: "Pantolon-Şort", satirlar: [["Kalem", "Tip"], ["Ana kumaş", "Z"]] },
    ]);
    expect(satirlar[0].urun_grubu).toBe("pantolon_sort");
    expect(satirlar[0].zorunlu).toBe(true);
  });

  it("CATION dosya düzenini okur: her ürün grubu ayrı sayfa, kılavuz sayfası atlanır", () => {
    const { satirlar, hatalar } = sayfalariCoz([
      { ad: "Kullanim Kilavuzu", satirlar: [["CATION TEKSTİL — KALEM ŞABLON KÜTÜPHANESİ"], ["Kalem", ""]] },
      {
        ad: "MONT-KABAN",
        satirlar: [
          ["Kalem Adı", "Kategori", "Zorunlu/Opsiyonel", "Varsayılan Birim", "Tipik Kullanım", "Şartname Anahtar Kelimeleri", "Notlar"],
          ["Dış kumaş", "Kumaş", "ZORUNLU", "m", 2.2, "softshell, oxford", "Gramaj şartnameden"],
          ["Kapitone astar", "Kumaş", "OPSİYONEL", "m", 2, "kapitone", ""],
        ],
      },
      { ad: "Segment Sablonlari", satirlar: [["Segment", "Kumaş Tipi"], ["PREMIUM", "Combed"]] },
    ]);
    expect(hatalar).toEqual([]);
    expect(satirlar).toEqual([
      {
        urun_grubu: "mont_kaban",
        ad: "Dış kumaş",
        zorunlu: true,
        birim: "m",
        varsayilan_kullanim: 2.2,
        varsayilan_birim_fiyat: null,
        anahtar_kelimeler: ["softshell", "oxford"],
      },
      {
        urun_grubu: "mont_kaban",
        ad: "Kapitone astar",
        zorunlu: false,
        birim: "m",
        varsayilan_kullanim: 2,
        varsayilan_birim_fiyat: null,
        anahtar_kelimeler: ["kapitone"],
      },
    ]);
  });

  it("tanınmayan satırları hata olarak bildirir", () => {
    const { satirlar, hatalar } = sayfalariCoz([
      { ad: "Liste", satirlar: [["Ürün Grubu", "Kalem Adı", "Tip"], ["Ayakkabı", "Taban", "Zorunlu"], ["Gömlek", "Düğme", "belki"]] },
    ]);
    expect(satirlar).toEqual([]);
    expect(hatalar).toHaveLength(2);
  });

  it("fason kalemini kesim, dikim, ütü-paket olarak ayırır", () => {
    const { satirlar } = sayfalariCoz([
      {
        ad: "MONT-KABAN",
        satirlar: [
          ["Kalem Adı", "Kategori", "Zorunlu/Opsiyonel", "Varsayılan Birim", "Tipik Kullanım"],
          ["Fason (kesim+dikim+ütü)", "İşçilik", "ZORUNLU", "adet", 1],
          ["Nakış", "Süsleme", "OPSİYONEL", "adet", 1],
        ],
      },
      { ad: "SAPKA-BERE-CORAP", satirlar: [["Kalem Adı", "Zorunlu/Opsiyonel"], ["Fason / Üretim", "ZORUNLU"]] },
    ]);
    expect(satirlar.map((s) => [s.ad, s.zorunlu])).toEqual([
      ["Fason – Kesim", true],
      ["Fason – Dikim", true],
      ["Fason – Ütü ve paket", true],
      ["Nakış", false],
      ["Fason / Üretim", true],
    ]);
  });
});
