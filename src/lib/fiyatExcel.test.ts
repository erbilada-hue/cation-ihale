import { describe, expect, it } from "vitest";
import { FIYAT_EXCEL_BASLIKLARI, fiyatExceliniCoz, tarihOku } from "./fiyatExcel";

const baslik = [...FIYAT_EXCEL_BASLIKLARI];

describe("fiyatExceliniCoz", () => {
  it("fiyat ve tedarikçi sayfalarını okur", () => {
    const s = fiyatExceliniCoz([
      {
        ad: "Fiyatlar",
        satirlar: [
          baslik,
          ["Bereket Fermuar", "Fermuar", "75 CM T-10 SEPARE", "adet", 5.8, "TRY", "hariç", "08.01.2026", "", "", "", "Son alım"],
          ["Deri İş", "Reflektör bant", "5 cm", "m", "160-165", "₺", "KDV dahil", 46030, "", "", "", ""],
          ["", "", "", "", "", "", "", "", "", "", "", ""],
        ],
      },
      { ad: "Tedarikçiler", satirlar: [["Tedarikçi", "Yetkili", "Telefon", "Kategori"], ["Polat Triko", "Mustafa", "", "Aksesuar"]] },
    ]);
    expect(s.hatalar).toEqual([]);
    expect(s.fiyatlar).toHaveLength(2);
    expect(s.fiyatlar[0]).toMatchObject({ tedarikci: "Bereket Fermuar", fiyatMetni: "5,8", fiyat_tarihi: "2026-01-08", kdv_durumu: "haric" });
    expect(s.fiyatlar[1]).toMatchObject({ fiyatMetni: "160-165", kdv_durumu: "dahil", para_birimi: "TRY", fiyat_tarihi: "2026-01-08" });
    expect(s.tedarikciler).toEqual([{ ad: "Polat Triko", yetkili: "Mustafa", telefon: "", kategori: "Aksesuar" }]);
  });

  it("hatalı satırları atlar ve sebebini yazar", () => {
    const s = fiyatExceliniCoz([
      {
        ad: "Sayfa1",
        satirlar: [
          baslik,
          ["", "Fermuar", "", "adet", 5, "", "", "", "", "", "", ""],
          ["A", "Düğme", "", "adet", "abc", "", "", "", "", "", "", ""],
          ["A", "Düğme", "", "adet", 1, "GBP", "", "", "", "", "", ""],
          ["A", "Düğme", "", "adet", 1, "", "", "32.13.2026", "", "", "", ""],
          ["A", "Düğme", "", "", 1, "", "", "", "", "", "", ""],
        ],
      },
    ]);
    expect(s.hatalar).toEqual([
      "Satır 2: tedarikçi boş (Fermuar)",
      "Satır 3: fiyat okunamadı (Düğme)",
      "Satır 4: para birimi TRY, USD veya EUR olmalı (Düğme)",
      "Satır 5: tarih okunamadı (gg.aa.yyyy yazın) (Düğme)",
    ]);
    expect(s.fiyatlar).toHaveLength(1);
    expect(s.fiyatlar[0]).toMatchObject({ birim: "adet", fiyat_tarihi: null, para_birimi: "TRY" });
  });

  it("başlık yoksa açıklar", () => {
    expect(fiyatExceliniCoz([{ ad: "X", satirlar: [["a", "b"]] }]).hatalar[0]).toMatch(/Başlık satırı/);
  });
});

describe("tarihOku", () => {
  it("farklı yazımları okur", () => {
    expect(tarihOku("2026-10-02")).toBe("2026-10-02");
    expect(tarihOku("2.10.2026")).toBe("2026-10-02");
    expect(tarihOku("02,10,2026")).toBe("2026-10-02");
    expect(tarihOku(46297)).toBe("2026-10-02");
    expect(tarihOku("")).toBeNull();
    expect(tarihOku("30.02.2026")).toBe("hata");
  });
});
