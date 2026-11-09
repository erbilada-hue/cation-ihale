// Yapay zekânın firmanın kendi verisinden öğrenmesi: kütüphane varsayılanları için geçmiş miktarlardan öneri.

import type { KalemSablonu } from "./tipler";

export type GecmisKalem = { sablon_id: string | null; birim: string; kullanim: number | null };

export type KutuphaneOnerisi = {
  sablon: KalemSablonu;
  /** Kaç geçmiş üründe bu kalem kullanıldı */
  ornekSayisi: number;
  /** Geçmiş miktarların ortancası (aşırı uçlardan etkilenmez) */
  ortanca: number;
};

export function ortanca(sayilar: number[]): number {
  const s = [...sayilar].sort((a, b) => a - b);
  const o = Math.floor(s.length / 2);
  return s.length % 2 ? s[o] : (s[o - 1] + s[o]) / 2;
}

/**
 * Kütüphanedeki varsayılan kullanımı, teklif verilmiş ürünlerdeki gerçek miktarlardan belirgin farklı olan kalemler.
 * Sadece aynı birimle girilmiş miktarlar sayılır (kg kalemine metre girilmişse karışmaz).
 */
export function kutuphaneOnerileri(
  sablonlar: KalemSablonu[],
  kalemler: GecmisKalem[],
  enAzOrnek = 2,
  esik = 0.1,
): KutuphaneOnerisi[] {
  const oneriler: KutuphaneOnerisi[] = [];
  for (const sablon of sablonlar) {
    const miktarlar = kalemler
      .filter((k) => k.sablon_id === sablon.id && k.birim === sablon.birim && k.kullanim != null && k.kullanim > 0)
      .map((k) => k.kullanim as number);
    if (miktarlar.length < enAzOrnek) continue;
    const o = Math.round(ortanca(miktarlar) * 10000) / 10000;
    const v = sablon.varsayilan_kullanim;
    if (v != null && v > 0 && Math.abs(o - v) / v < esik) continue;
    oneriler.push({ sablon, ornekSayisi: miktarlar.length, ortanca: o });
  }
  return oneriler;
}
