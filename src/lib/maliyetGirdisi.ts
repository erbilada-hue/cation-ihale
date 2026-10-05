import type { UrunGirdi } from "./maliyet";
import type { UrunKalemli } from "./tipler";

export function maliyetGirdisi(u: UrunKalemli): UrunGirdi {
  return {
    adet: u.adet,
    fireOrani: u.fire_orani,
    karMarji: u.kar_marji,
    kdvOrani: u.kdv_orani,
    kalemler: u.urun_kalemleri.map((k) => ({ kullanim: k.kullanim, birimFiyat: k.birim_fiyat })),
  };
}
