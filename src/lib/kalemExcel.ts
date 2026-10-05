import { URUN_GRUPLARI } from "./sabitler";
import { sayiOku } from "./format";

export type SablonSatiri = {
  urun_grubu: string;
  ad: string;
  zorunlu: boolean;
  birim: string;
  varsayilan_kullanim: number | null;
  varsayilan_birim_fiyat: number | null;
  anahtar_kelimeler: string[];
};

export const EXCEL_BASLIKLARI = [
  "Ürün Grubu",
  "Kalem Adı",
  "Tip",
  "Birim",
  "Varsayılan Kullanım",
  "Birim Fiyat",
  "Anahtar Kelimeler",
] as const;

/** Karşılaştırma için: küçük harf, Türkçe harfler sadeleştirilmiş, boşluk/tire yok */
export function sadelestir(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, "");
}

const BASLIK_ESLESMELERI: Record<keyof SablonSatiri | "tip", string[]> = {
  urun_grubu: ["urungrubu", "grup", "urun", "uruntipi"],
  ad: ["kalemadi", "kalem", "ad", "adi"],
  tip: ["tip", "tur", "zorunlu", "zorunluopsiyonel", "durum"],
  zorunlu: [],
  birim: ["birim", "olcubirimi"],
  varsayilan_kullanim: ["varsayilankullanim", "kullanim", "miktar", "sarfiyat"],
  varsayilan_birim_fiyat: ["birimfiyat", "fiyat", "varsayilanbirimfiyat"],
  anahtar_kelimeler: ["anahtarkelimeler", "anahtarkelime", "kelimeler", "etiketler"],
};

export function urunGrubuBul(metin: string): string | null {
  const s = sadelestir(metin);
  if (!s) return null;
  const g = URUN_GRUPLARI.find((g) => sadelestir(g.ad) === s || sadelestir(g.kod) === s);
  if (g) return g.kod;
  // "Mont" veya "Tişört" gibi kısa yazımlar
  const kismi = URUN_GRUPLARI.filter((g) => sadelestir(g.ad).includes(s) || s.includes(sadelestir(g.ad)));
  return kismi.length === 1 ? kismi[0].kod : null;
}

function tipOku(metin: string): boolean | null {
  const s = sadelestir(metin);
  if (["zorunlu", "z", "evet", "e", "1", "true"].includes(s)) return true;
  if (["opsiyonel", "o", "istegebagli", "hayir", "h", "0", "false", "secmeli"].includes(s)) return false;
  return null;
}

export type CozumSonucu = { satirlar: SablonSatiri[]; hatalar: string[] };

/**
 * Excel sayfalarındaki satırları kalem şablonlarına çevirir.
 * Ürün grubu sütunu yoksa sayfa adı ürün grubu olarak kullanılır.
 */
export function sayfalariCoz(sayfalar: { ad: string; satirlar: unknown[][] }[]): CozumSonucu {
  const sonuc: SablonSatiri[] = [];
  const hatalar: string[] = [];

  for (const sayfa of sayfalar) {
    const baslikIndeksi = sayfa.satirlar.findIndex((r) =>
      r.some((h) => BASLIK_ESLESMELERI.ad.includes(sadelestir(String(h ?? "")))),
    );
    if (baslikIndeksi < 0) {
      hatalar.push(`"${sayfa.ad}" sayfasında "Kalem Adı" başlığı bulunamadı, sayfa atlandı.`);
      continue;
    }
    const basliklar = sayfa.satirlar[baslikIndeksi].map((h) => sadelestir(String(h ?? "")));
    const sutun = (alan: keyof typeof BASLIK_ESLESMELERI) =>
      basliklar.findIndex((h) => BASLIK_ESLESMELERI[alan].includes(h));

    const s = {
      grup: sutun("urun_grubu"),
      ad: sutun("ad"),
      tip: sutun("tip"),
      birim: sutun("birim"),
      kullanim: sutun("varsayilan_kullanim"),
      fiyat: sutun("varsayilan_birim_fiyat"),
      kelimeler: sutun("anahtar_kelimeler"),
    };
    const sayfaGrubu = urunGrubuBul(sayfa.ad);
    if (s.grup < 0 && !sayfaGrubu) {
      hatalar.push(`"${sayfa.ad}" sayfasında "Ürün Grubu" sütunu yok ve sayfa adı bir ürün grubuna uymuyor, sayfa atlandı.`);
      continue;
    }
    if (s.tip < 0) {
      hatalar.push(`"${sayfa.ad}" sayfasında "Tip" (Zorunlu/Opsiyonel) sütunu bulunamadı, sayfa atlandı.`);
      continue;
    }

    const hucre = (r: unknown[], i: number) => (i < 0 ? "" : String(r[i] ?? "").trim());
    const sayi = (r: unknown[], i: number) => {
      if (i < 0) return null;
      const v = r[i];
      if (typeof v === "number") return v;
      const n = sayiOku(String(v ?? ""));
      return n == null || Number.isNaN(n) ? null : n;
    };

    sayfa.satirlar.slice(baslikIndeksi + 1).forEach((r, i) => {
      const satirNo = baslikIndeksi + i + 2;
      const ad = hucre(r, s.ad);
      if (!ad) return;
      const grupMetni = hucre(r, s.grup);
      const grup = grupMetni ? urunGrubuBul(grupMetni) : sayfaGrubu;
      if (!grup) {
        hatalar.push(`${sayfa.ad} satır ${satirNo}: "${grupMetni}" ürün grubu tanınmadı.`);
        return;
      }
      const zorunlu = tipOku(hucre(r, s.tip));
      if (zorunlu == null) {
        hatalar.push(`${sayfa.ad} satır ${satirNo}: Tip "Zorunlu" veya "Opsiyonel" olmalı.`);
        return;
      }
      sonuc.push({
        urun_grubu: grup,
        ad,
        zorunlu,
        birim: hucre(r, s.birim) || "adet",
        varsayilan_kullanim: sayi(r, s.kullanim),
        varsayilan_birim_fiyat: sayi(r, s.fiyat),
        anahtar_kelimeler: hucre(r, s.kelimeler)
          .split(/[,;]/)
          .map((k) => k.trim())
          .filter(Boolean),
      });
    });
  }

  return { satirlar: sonuc, hatalar };
}
