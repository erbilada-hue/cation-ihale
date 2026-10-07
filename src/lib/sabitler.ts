export const URUN_GRUPLARI = [
  { kod: "mont_kaban", ad: "Mont-Kaban" },
  { kod: "pantolon_sort", ad: "Pantolon-Şort" },
  { kod: "tisort_polo", ad: "Tişört-Polo" },
  { kod: "gomlek", ad: "Gömlek" },
  { kod: "tulum_onluk", ad: "Tulum-Önlük" },
  { kod: "polar_yelek_yagmurluk", ad: "Polar-Yelek-Yağmurluk" },
  { kod: "sapka_bere_corap", ad: "Şapka-Bere-Çorap" },
  { kod: "hazir_urun", ad: "Hazır Ürün (al-sat)" },
] as const;

/** Tedarikçiden hazır alınıp üzerine kâr konarak satılan ürünler (kemer, havlu, eldiven, kravat…) */
export const HAZIR_URUN = "hazir_urun";

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

/** Incoterms 2020: satıcının (bizim) üstlendiği masraflar maliyete eklenmeli */
export const TESLIM_SEKILLERI = [
  { kod: "EXW", ad: "EXW – Fabrikada teslim", aciklama: "Müşteri malı fabrikadan alır; nakliye ve gümrük müşteriye ait." },
  { kod: "FCA", ad: "FCA – Taşıyıcıya teslim", aciklama: "Taşıyıcıya kadar nakliye ve ihracat gümrüğü size ait." },
  { kod: "FOB", ad: "FOB – Gemide teslim", aciklama: "Yükleme limanına kadar nakliye, ihracat gümrüğü ve liman masrafı size ait." },
  { kod: "CFR", ad: "CFR – Navlun ödenmiş", aciklama: "FOB masraflarına ek olarak varış limanına navlun size ait." },
  { kod: "CIF", ad: "CIF – Navlun ve sigorta ödenmiş", aciklama: "FOB masraflarına ek olarak navlun ve sigorta size ait." },
  { kod: "CPT", ad: "CPT – Taşıma ödenmiş", aciklama: "Varış yerine kadar taşıma size ait." },
  { kod: "CIP", ad: "CIP – Taşıma ve sigorta ödenmiş", aciklama: "Varış yerine kadar taşıma ve sigorta size ait." },
  { kod: "DAP", ad: "DAP – Belirtilen yerde teslim", aciklama: "Varış yerine kadar tüm nakliye size ait; varış gümrüğü müşteriye ait." },
  { kod: "DPU", ad: "DPU – Boşaltılmış teslim", aciklama: "DAP'a ek olarak varış yerinde boşaltma size ait." },
  { kod: "DDP", ad: "DDP – Gümrük vergisi ödenmiş", aciklama: "Varış ülkesi gümrük vergisi dahil tüm masraflar size ait." },
] as const;

/** Teslim şekline göre maliyette olması gereken ihracat kalemleri (kalem adında aranan kelime → gösterilecek ad) */
export function teslimKalemleri(kod: string | null): { kelime: string; ad: string }[] {
  if (!kod || kod === "EXW") return [];
  const gumruk = { kelime: "gumruk", ad: "İhracat gümrük ve liman masrafı" };
  const navlun = { kelime: "navlun", ad: "Navlun payı" };
  const sigorta = { kelime: "sigorta", ad: "Sigorta payı" };
  if (kod === "FCA" || kod === "FOB") return [gumruk];
  if (kod === "CFR" || kod === "CPT") return [gumruk, navlun];
  if (kod === "CIF" || kod === "CIP") return [gumruk, navlun, sigorta];
  return [gumruk, navlun];
}

export function paraSembolu(kod: string): string {
  return PARA_BIRIMLERI.find((p) => p.kod === kod)?.sembol ?? "₺";
}
