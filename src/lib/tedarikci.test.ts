import { describe, expect, it } from "vitest";
import {
  enUygunFiyat,
  eskiMi,
  fiyatTalebiMesaji,
  gunFarki,
  kalemAilesi,
  kalemAnahtari,
  kalemleEslesir,
  otomatikFiyat,
  tedarikciFiyatiOku,
} from "./tedarikci";

describe("tedarikciFiyatiOku", () => {
  it("KDV hariç fiyatı olduğu gibi alır", () => {
    expect(tedarikciFiyatiOku("137,50", "haric", 20)).toEqual({ fiyat: 137.5, notlar: [], kdvBelirsiz: false });
  });

  it("KDV dahil fiyattan KDV'yi ayırır (÷ 1,20) ve bunu belirtir", () => {
    const s = tedarikciFiyatiOku("165", "dahil", 20);
    if (s.hata !== undefined) throw new Error(s.hata);
    expect(s.fiyat).toBe(137.5);
    expect(s.notlar[0]).toMatch(/KDV dahil geldi/);
  });

  it("aralık gelirse ortalama alır ve uyarır", () => {
    const s = tedarikciFiyatiOku("160-165", "haric", 20);
    if (s.hata !== undefined) throw new Error(s.hata);
    expect(s.fiyat).toBe(162.5);
    expect(s.notlar[0]).toMatch(/aralık/);
  });

  it("aralık + KDV dahil birlikte", () => {
    const s = tedarikciFiyatiOku("1.200 – 1.320", "dahil", 20);
    if (s.hata !== undefined) throw new Error(s.hata);
    expect(s.fiyat).toBe(1050);
    expect(s.notlar).toHaveLength(2);
  });

  it("KDV belirsizse sarı uyarı bayrağı verir", () => {
    const s = tedarikciFiyatiOku("12,5", "belirsiz", 20);
    if (s.hata !== undefined) throw new Error(s.hata);
    expect(s.kdvBelirsiz).toBe(true);
    expect(s.fiyat).toBe(12.5);
  });

  it("okunamayan fiyatı reddeder", () => {
    expect(tedarikciFiyatiOku("", "haric", 20).hata).toBeDefined();
    expect(tedarikciFiyatiOku("pahalı", "haric", 20).hata).toBeDefined();
  });
});

describe("tarih", () => {
  const bugun = new Date("2026-10-20T09:00:00+03:00");
  it("gün farkını Türkiye saatine göre hesaplar", () => {
    expect(gunFarki("2026-10-20", bugun)).toBe(0);
    expect(gunFarki("2026-10-06", bugun)).toBe(14);
  });
  it("14 günden eski fiyatı işaretler", () => {
    expect(eskiMi("2026-10-06", bugun)).toBe(false);
    expect(eskiMi("2026-10-05", bugun)).toBe(true);
  });
});

describe("enUygunFiyat", () => {
  const bugun = new Date("2026-10-20T09:00:00+03:00");
  const kurlar = { USD: 40, EUR: null };
  it("güncel fiyatlar arasında TL karşılığı en düşük olanı seçer", () => {
    const secim = enUygunFiyat(
      [
        { id: "a", fiyat: 130, para_birimi: "TRY", fiyat_tarihi: "2026-10-18" },
        { id: "b", fiyat: 3, para_birimi: "USD", fiyat_tarihi: "2026-10-18" }, // 120 ₺
        { id: "c", fiyat: 100, para_birimi: "TRY", fiyat_tarihi: "2026-09-01" }, // ucuz ama eski
        { id: "d", fiyat: 1, para_birimi: "EUR", fiyat_tarihi: "2026-10-18" }, // kur yok
      ],
      kurlar,
      bugun,
    );
    expect(secim?.id).toBe("b");
  });
  it("liste boşsa null döner", () => {
    expect(enUygunFiyat([], kurlar, bugun)).toBeNull();
  });
});

describe("mesaj", () => {
  it("tedarikçiye gönderilecek metni hazırlar", () => {
    const m = fiyatTalebiMesaji({
      firmaAdi: "CATION Tekstil",
      yetkili: "Ahmet Bey",
      kalemler: [
        { kalem_adi: "Ana kumaş", aciklama: "180 gr süprem", birim: "m" },
        { kalem_adi: "Fermuar", aciklama: "", birim: "adet" },
      ],
    });
    expect(m).toContain("Merhaba Ahmet Bey,");
    expect(m).toContain("• Ana kumaş (180 gr süprem) – birim: m");
    expect(m).toContain("• Fermuar – birim: adet");
    expect(m).toContain("KDV hariç mi dahil mi");
  });
});

it("kalem adlarını harf farkı gözetmeden eşleştirir", () => {
  expect(kalemAnahtari("Fason – Dikim")).toBe(kalemAnahtari("FASON DİKİM"));
});

describe("kalem aileleri", () => {
  it("kütüphane adlarını fiyat listesindeki genel adlarla eşleştirir", () => {
    expect(kalemleEslesir("Fermuar", "Ana fermuar")).toBe(true);
    expect(kalemleEslesir("Fermuar", "Cep fermuarları")).toBe(true);
    expect(kalemleEslesir("Çıtçıt / Kuşgözü", "Düğme / Kanca")).toBe(true);
    expect(kalemleEslesir("Dokuma etiket", "Kol etiketi / Woven label")).toBe(true);
    expect(kalemleEslesir("Baskılı etiket / yıkama talimatı", "Etiket seti")).toBe(true);
    expect(kalemleEslesir("Reflektör bant", "Reflektör bant")).toBe(true);
    expect(kalemleEslesir("Cırt bant", "Velkro / Cırt bant")).toBe(true);
    expect(kalemleEslesir("Ribana / Yaka", "Ribana / Lastik")).toBe(true);
    expect(kalemleEslesir("Biye / Şerit", "Kontrast şerit / Biye")).toBe(true);
    expect(kalemleEslesir("Toka", "Metal / Plastik aksesuar")).toBe(true);
  });

  it("kumaşları kumaş, astarları astar kalemleriyle eşleştirir", () => {
    expect(kalemleEslesir("Ana kumaş", "Dış kumaş")).toBe(true);
    expect(kalemleEslesir("Ana kumaş", "Kapüşon kumaşı")).toBe(true);
    expect(kalemleEslesir("Polar kumaş", "Polar (yaka/astar)")).toBe(true);
    expect(kalemleEslesir("File / Mesh", "Mesh / File panel")).toBe(true);
    expect(kalemleEslesir("Astar", "Cep astarı")).toBe(true);
    expect(kalemleEslesir("Kapitone astar", "Kapitone astar")).toBe(true);
    expect(kalemleEslesir("Elyaf / Dolgu", "Elyaf / Dolgu")).toBe(true);
    expect(kalemleEslesir("Astar", "Dış kumaş")).toBe(false);
    expect(kalemleEslesir("Tela", "Ana kumaş")).toBe(false);
    expect(kalemAilesi("Dikiş ipliği")).toBeNull();
  });

  it("farklı aileleri karıştırmaz", () => {
    expect(kalemleEslesir("Baskılı etiket / yıkama talimatı", "Logo baskı")).toBe(false);
    expect(kalemleEslesir("Reflektör bant", "Velkro / Cırt bant")).toBe(false);
    expect(kalemleEslesir("Fermuar", "Ana kumaş")).toBe(false);
  });

  it("otomatik doldurma sadece aynı adlı ve aynı ürünü anlatan fiyatlardan seçer", () => {
    const bugun = new Date("2026-10-06T12:00:00+03:00");
    const f = (id: string, kalem_adi: string, aciklama: string, fiyat: number) => ({
      id,
      kalem_adi,
      aciklama,
      fiyat,
      para_birimi: "TRY",
      fiyat_tarihi: "2026-10-01",
    });
    const kurlar = { USD: null, EUR: null };
    expect(otomatikFiyat("Düğme", [f("a", "Düğme", "18 boy", 0.2), f("b", "Düğme", "28 boy", 0.5)], kurlar, bugun)).toBeNull();
    expect(otomatikFiyat("Düğme", [f("a", "Düğme", "18 boy", 0.2), f("b", "Düğme", "18 BOY", 0.18)], kurlar, bugun)?.id).toBe("b");
    expect(otomatikFiyat("Ana fermuar", [f("a", "Fermuar", "", 5)], kurlar, bugun)).toBeNull();
  });
});
