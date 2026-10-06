export type FirmaAyarlari = {
  id: number;
  firma_adi: string;
  adres: string;
  telefon: string;
  eposta: string;
  web: string;
  vergi_dairesi: string;
  vergi_no: string;
  banka_adi: string;
  iban: string;
  logo_data_url: string | null;
  teklif_gecerlilik_gun: number;
  varsayilan_kdv_orani: number;
};

export type SegmentSablonu = {
  segment: "premium" | "standart" | "ekonomik";
  ad: string;
  kumas: string;
  gramaj: string;
  boya: string;
  baski: string;
  fire_orani: number;
  sira: number;
};

export type KalemSablonu = {
  id: string;
  urun_grubu: string;
  ad: string;
  zorunlu: boolean;
  birim: string;
  varsayilan_kullanim: number | null;
  varsayilan_birim_fiyat: number | null;
  anahtar_kelimeler: string[];
  sira: number;
};

export type Ihale = {
  id: string;
  ad: string;
  musteri: string;
  yetkili: string;
  son_teklif_tarihi: string | null;
  teslim_yeri: string;
  termin: string;
  kaynak: "sartname" | "segment";
  kaynak_dosya: string;
  segment: "premium" | "standart" | "ekonomik" | null;
  usd_kuru: number | null;
  eur_kuru: number | null;
  asama: string;
  notlar: string;
  created_at: string;
  updated_at: string;
};

export type IhaleUrunu = {
  id: string;
  ihale_id: string;
  urun_grubu: string;
  ad: string;
  aciklama: string;
  adet: number;
  fire_orani: number | null;
  kar_marji: number | null;
  kdv_orani: number;
  sira: number;
};

export type UrunKalemi = {
  id: string;
  urun_id: string;
  sablon_id: string | null;
  ad: string;
  zorunlu: boolean;
  birim: string;
  kullanim: number | null;
  birim_fiyat: number | null;
  para_birimi: "TRY" | "USD" | "EUR";
  tedarikci_fiyat_id: string | null;
  sira: number;
};

export type UrunKalemli = IhaleUrunu & { urun_kalemleri: UrunKalemi[] };

export type Teklif = {
  id: string;
  ihale_id: string;
  teklif_no: string;
  teklif_tarihi: string;
  gecerlilik_tarihi: string;
  icerik: import("./maliyet").TeklifOzeti;
  created_at: string;
};

export type IhaleDosyasi = {
  id: string;
  ihale_id: string;
  urun_id: string | null;
  dosya_adi: string;
  yol: string;
  boyut: number;
  tur: string;
  created_at: string;
};

export type Tedarikci = {
  id: string;
  ad: string;
  yetkili: string;
  telefon: string;
  eposta: string;
  kategori: string;
  notlar: string;
  created_at: string;
};

export type TedarikciFiyati = {
  id: string;
  tedarikci_id: string;
  kalem_adi: string;
  aciklama: string;
  birim: string;
  /** KDV hariç */
  fiyat: number;
  para_birimi: "TRY" | "USD" | "EUR";
  kdv_durumu: "haric" | "dahil" | "belirsiz";
  termin: string;
  min_siparis: string;
  odeme_vadesi: string;
  fiyat_tarihi: string;
  notlar: string;
  updated_at: string;
};

export type TedarikciFiyatiAdli = TedarikciFiyati & { tedarikci_adi: string };

export type FiyatTalebi = {
  id: string;
  tedarikci_id: string;
  fiyat_idleri: string[];
  mesaj: string;
  gonderim_zamani: string;
  cevap_zamani: string | null;
};
