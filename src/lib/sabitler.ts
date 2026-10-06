export const URUN_GRUPLARI = [
  { kod: "mont_kaban", ad: "Mont-Kaban" },
  { kod: "pantolon_sort", ad: "Pantolon-Şort" },
  { kod: "tisort_polo", ad: "Tişört-Polo" },
  { kod: "gomlek", ad: "Gömlek" },
  { kod: "tulum_onluk", ad: "Tulum-Önlük" },
  { kod: "polar_yelek_yagmurluk", ad: "Polar-Yelek-Yağmurluk" },
  { kod: "sapka_bere_corap", ad: "Şapka-Bere-Çorap" },
] as const;

export type UrunGrubuKod = (typeof URUN_GRUPLARI)[number]["kod"];

export function urunGrubuAdi(kod: string): string {
  return URUN_GRUPLARI.find((g) => g.kod === kod)?.ad ?? kod;
}

export const SEGMENTLER = ["premium", "standart", "ekonomik"] as const;
export type Segment = (typeof SEGMENTLER)[number];

export const ASAMALAR = [
  { kod: "ihale", ad: "İhale" },
  { kod: "maliyet", ad: "Maliyet" },
  { kod: "teklif", ad: "Teklif" },
  { kod: "siparis", ad: "Sipariş" },
  { kod: "uretim", ad: "Üretim" },
  { kod: "termin", ad: "Termin" },
] as const;

export function asamaAdi(kod: string): string {
  return ASAMALAR.find((a) => a.kod === kod)?.ad ?? kod;
}

export const BIRIMLER = ["m", "adet", "set", "kg", "gram", "takım", "dakika"] as const;

export const PARA_BIRIMLERI = [
  { kod: "TRY", sembol: "₺", ad: "TL" },
  { kod: "USD", sembol: "$", ad: "Dolar" },
  { kod: "EUR", sembol: "€", ad: "Euro" },
] as const;

export type ParaBirimi = (typeof PARA_BIRIMLERI)[number]["kod"];

export function paraSembolu(kod: string): string {
  return PARA_BIRIMLERI.find((p) => p.kod === kod)?.sembol ?? "₺";
}
