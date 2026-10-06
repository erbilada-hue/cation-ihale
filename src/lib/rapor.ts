// Kazanılan işler raporu: dönem aralığı ve ihale toplamları

import { hesaplaUrun } from "./maliyet";
import { maliyetGirdisi, type Kurlar } from "./maliyetGirdisi";
import { tarihMetni } from "./format";
import type { UrunKalemli } from "./tipler";

export const DONEMLER = [
  { kod: "bu-ay", ad: "Bu ay" },
  { kod: "gecen-ay", ad: "Geçen ay" },
  { kod: "bu-yil", ad: "Bu yıl" },
  { kod: "gecen-yil", ad: "Geçen yıl" },
  { kod: "ozel", ad: "Tarih aralığı" },
] as const;

export type DonemKodu = (typeof DONEMLER)[number]["kod"];

const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const TARIH = /^\d{4}-\d{2}-\d{2}$/;

const gun = (y: number, a: number, g: number) => tarihMetni(new Date(Date.UTC(y, a, g, 12)));

/**
 * Seçilen dönemin başlangıç ve bitiş günü (ikisi de dahil, YYYY-MM-DD) ve başlığı.
 * Tarihler Türkiye saatine göre hesaplanır.
 */
export function donemAraligi(
  donem: string | undefined,
  bugun: Date = new Date(),
  ozel?: { bas?: string; bit?: string },
): { kod: DonemKodu; bas: string; bit: string; baslik: string } {
  const [y, a] = tarihMetni(bugun).split("-").map(Number);
  const ay = a - 1;
  switch (donem) {
    case "gecen-ay": {
      const gy = ay === 0 ? y - 1 : y;
      const ga = ay === 0 ? 11 : ay - 1;
      return { kod: "gecen-ay", bas: gun(gy, ga, 1), bit: gun(gy, ga + 1, 0), baslik: `${AYLAR[ga]} ${gy}` };
    }
    case "bu-yil":
      return { kod: "bu-yil", bas: gun(y, 0, 1), bit: gun(y, 11, 31), baslik: `${y} yılı` };
    case "gecen-yil":
      return { kod: "gecen-yil", bas: gun(y - 1, 0, 1), bit: gun(y - 1, 11, 31), baslik: `${y - 1} yılı` };
    case "ozel": {
      const bas = ozel?.bas && TARIH.test(ozel.bas) ? ozel.bas : gun(y, ay, 1);
      const bit = ozel?.bit && TARIH.test(ozel.bit) ? ozel.bit : tarihMetni(bugun);
      const [b1, b2] = bas <= bit ? [bas, bit] : [bit, bas];
      const yaz = (t: string) => t.split("-").reverse().join(".");
      return { kod: "ozel", bas: b1, bit: b2, baslik: `${yaz(b1)} – ${yaz(b2)}` };
    }
    default:
      return { kod: "bu-ay", bas: gun(y, ay, 1), bit: gun(y, ay + 1, 0), baslik: `${AYLAR[ay]} ${y}` };
  }
}

export type IhaleToplami = {
  urunSayisi: number;
  adet: number;
  /** KDV hariç teklif toplamı */
  teklif: number;
  kdvDahil: number;
  netKar: number;
  /** Fire, kâr marjı veya kur eksik olan ürün var; tutarlar eksik hesaplanmıştır */
  eksik: boolean;
};

/** İhaledeki ürünlerin güncel maliyetine göre teklif toplamı ve net kâr */
export function ihaleToplami(urunler: UrunKalemli[], kurlar: Kurlar): IhaleToplami {
  const t: IhaleToplami = { urunSayisi: urunler.length, adet: 0, teklif: 0, kdvDahil: 0, netKar: 0, eksik: false };
  for (const u of urunler) {
    t.adet += u.adet;
    const s = hesaplaUrun(maliyetGirdisi(u, kurlar));
    if (s.toplam.teklif == null) {
      t.eksik = true;
      continue;
    }
    t.teklif += s.toplam.teklif;
    t.kdvDahil += s.toplam.kdvDahil ?? 0;
    t.netKar += s.toplam.karTutari ?? 0;
  }
  return t;
}
