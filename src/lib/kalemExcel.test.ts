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

  it("tanınmayan satırları hata olarak bildirir", () => {
    const { satirlar, hatalar } = sayfalariCoz([
      { ad: "Liste", satirlar: [["Ürün Grubu", "Kalem Adı", "Tip"], ["Ayakkabı", "Taban", "Zorunlu"], ["Gömlek", "Düğme", "belki"]] },
    ]);
    expect(satirlar).toEqual([]);
    expect(hatalar).toHaveLength(2);
  });
});
