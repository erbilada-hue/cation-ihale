import type { KalemGirdi, TeklifParaBirimi, UrunGirdi } from "./maliyet";
import type { Ihale, UrunKalemi, UrunKalemli } from "./tipler";

export type Kurlar = { USD: number | null; EUR: number | null };

export function ihaleKurlari(ihale: Pick<Ihale, "usd_kuru" | "eur_kuru">): Kurlar {
  return { USD: ihale.usd_kuru, EUR: ihale.eur_kuru };
}

/** TL kalemde 1, dövizli kalemde ihalede girilen kur; kur girilmediyse null */
export function kalemKuru(k: Pick<UrunKalemi, "para_birimi">, kurlar: Kurlar): number | null {
  if (k.para_birimi === "USD" || k.para_birimi === "EUR") return kurlar[k.para_birimi];
  return 1;
}

export function kalemGirdisi(k: UrunKalemi, kurlar: Kurlar): KalemGirdi {
  return { kullanim: k.kullanim, birimFiyat: k.birim_fiyat, kur: kalemKuru(k, kurlar) };
}

/**
 * Yuvarlanmış fiyat, girildiği para birimi ihalenin teklif para birimiyle aynıysa geçerlidir
 * (teklif para birimi sonradan değişirse eski yuvarlama kullanılmaz).
 */
export function yuvarlanmisFiyat(
  u: Pick<UrunKalemli, "yuvarlanmis_fiyat" | "yuvarlanmis_para_birimi">,
  teklifParaBirimi: TeklifParaBirimi,
): number | null {
  if (u.yuvarlanmis_fiyat == null || (u.yuvarlanmis_para_birimi ?? "TRY") !== teklifParaBirimi) return null;
  return u.yuvarlanmis_fiyat;
}

export function maliyetGirdisi(u: UrunKalemli, kurlar: Kurlar, teklifParaBirimi: TeklifParaBirimi = "TRY"): UrunGirdi {
  const yuvarlanmis = yuvarlanmisFiyat(u, teklifParaBirimi);
  const kur = teklifParaBirimi === "TRY" ? 1 : kurlar[teklifParaBirimi];
  return {
    adet: u.adet,
    fireOrani: u.fire_orani,
    karMarji: u.kar_marji,
    kdvOrani: u.kdv_orani,
    kalemler: u.urun_kalemleri.map((k) => kalemGirdisi(k, kurlar)),
    // Dövizli yuvarlamanın TL karşılığı kurla bulunur; kur yoksa yuvarlama uygulanamaz
    yuvarlanmisTeklif: yuvarlanmis != null && kur ? yuvarlanmis * kur : null,
  };
}
