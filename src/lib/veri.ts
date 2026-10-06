import type {
  FirmaAyarlari,
  Ihale,
  KalemSablonu,
  SegmentSablonu,
  Teklif,
  FiyatTalebi,
  IhaleDosyasi,
  Musteri,
  Tedarikci,
  TedarikciFiyati,
  TedarikciFiyatiAdli,
  UrunKalemli,
  UrunKalemi,
} from "./tipler";
export { ihaleKurlari, maliyetGirdisi } from "./maliyetGirdisi";
import { sunucuIstemcisi } from "./supabase/server";

type Supabase = ReturnType<typeof sunucuIstemcisi>;

// Veritabanındaki numeric alanlar her durumda sayıya çevrilir
const sayi = (v: unknown): number | null => (v == null ? null : Number(v));

export function kalemiDuzelt(k: UrunKalemi): UrunKalemi {
  return {
    ...k,
    kullanim: sayi(k.kullanim),
    birim_fiyat: sayi(k.birim_fiyat),
    para_birimi: k.para_birimi ?? "TRY",
    tedarikci_fiyat_id: k.tedarikci_fiyat_id ?? null,
  };
}

export function urunuDuzelt(u: UrunKalemli): UrunKalemli {
  return {
    ...u,
    adet: Number(u.adet),
    fire_orani: sayi(u.fire_orani),
    kar_marji: sayi(u.kar_marji),
    kdv_orani: Number(u.kdv_orani),
    urun_kalemleri: (u.urun_kalemleri ?? [])
      .map(kalemiDuzelt)
      .sort((a, b) => a.sira - b.sira),
  };
}

export function kalemSablonunuDuzelt(k: KalemSablonu): KalemSablonu {
  return {
    ...k,
    varsayilan_kullanim: sayi(k.varsayilan_kullanim),
    varsayilan_birim_fiyat: sayi(k.varsayilan_birim_fiyat),
  };
}

export async function ihaleGetir(supabase: Supabase, id: string) {
  const { data } = await supabase.from("ihaleler").select("*").eq("id", id).maybeSingle();
  const ihale = data as Ihale | null;
  if (!ihale) return null;
  return { ...ihale, usd_kuru: sayi(ihale.usd_kuru), eur_kuru: sayi(ihale.eur_kuru) };
}

export async function urunleriGetir(supabase: Supabase, ihaleId: string) {
  const { data, error } = await supabase
    .from("ihale_urunleri")
    .select("*, urun_kalemleri(*)")
    .eq("ihale_id", ihaleId)
    .order("sira")
    .order("created_at");
  if (error) throw new Error(error.message);
  return ((data ?? []) as UrunKalemli[]).map(urunuDuzelt);
}

export async function firmaAyarlariGetir(supabase: Supabase) {
  const { data } = await supabase.from("firma_ayarlari").select("*").eq("id", 1).maybeSingle();
  const f = data as FirmaAyarlari | null;
  if (!f) return null;
  return {
    ...f,
    varsayilan_kdv_orani: Number(f.varsayilan_kdv_orani),
    teklif_gecerlilik_gun: Number(f.teklif_gecerlilik_gun),
  };
}

export async function segmentleriGetir(supabase: Supabase) {
  const { data } = await supabase.from("segment_sablonlari").select("*").order("sira");
  return ((data ?? []) as SegmentSablonu[]).map((s) => ({ ...s, fire_orani: Number(s.fire_orani) }));
}

export async function kalemSablonlariniGetir(supabase: Supabase) {
  const { data } = await supabase
    .from("kalem_sablonlari")
    .select("*")
    .order("urun_grubu")
    .order("zorunlu", { ascending: false })
    .order("sira")
    .order("ad");
  return ((data ?? []) as KalemSablonu[]).map(kalemSablonunuDuzelt);
}

export async function teklifleriGetir(supabase: Supabase, ihaleId: string) {
  const { data } = await supabase
    .from("teklifler")
    .select("*")
    .eq("ihale_id", ihaleId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Teklif[];
}

export async function dosyalariGetir(supabase: Supabase, ihaleId: string) {
  const { data } = await supabase
    .from("ihale_dosyalari")
    .select("*")
    .eq("ihale_id", ihaleId)
    .order("created_at");
  return ((data ?? []) as IhaleDosyasi[]).map((d) => ({ ...d, boyut: Number(d.boyut) }));
}

export async function musterileriGetir(supabase: Supabase) {
  const { data } = await supabase.from("musteriler").select("*").order("ad");
  return (data ?? []) as Musteri[];
}

/** Müşteri id → o müşterinin ihalelerinde yazılmış markalar (ihale formunda öneri için) */
export async function markalariGetir(supabase: Supabase): Promise<Record<string, string[]>> {
  const { data } = await supabase.from("ihaleler").select("musteri_id, marka").not("musteri_id", "is", null).neq("marka", "");
  const sonuc: Record<string, string[]> = {};
  for (const r of (data ?? []) as { musteri_id: string; marka: string }[]) {
    const liste = (sonuc[r.musteri_id] ??= []);
    if (!liste.includes(r.marka)) liste.push(r.marka);
  }
  for (const k of Object.keys(sonuc)) sonuc[k].sort((a, b) => a.localeCompare(b, "tr"));
  return sonuc;
}

export async function tedarikcileriGetir(supabase: Supabase) {
  const { data } = await supabase.from("tedarikciler").select("*").order("ad");
  return (data ?? []) as Tedarikci[];
}

function fiyatiDuzelt<T extends TedarikciFiyati>(f: T): T {
  return { ...f, fiyat: Number(f.fiyat) };
}

/** Tüm fiyat listesi, tedarikçi adıyla */
export async function fiyatListesiniGetir(supabase: Supabase, tedarikciId?: string) {
  // Supabase bir seferde en fazla 1000 satır döndürür; liste daha uzun olabilir
  // İlk sayfa toplam satır sayısını da getirir; kalan sayfalar aynı anda istenir
  const sorgu = (bas: number, sayac = false) => {
    let q = supabase
      .from("tedarikci_fiyatlari")
      .select("*, tedarikciler(ad)", sayac ? { count: "exact" } : undefined)
      .order("kalem_adi")
      .order("id");
    if (tedarikciId) q = q.eq("tedarikci_id", tedarikciId);
    return q.range(bas, bas + 999);
  };
  const ilk = await sorgu(0, true);
  const toplam = ilk.count ?? ilk.data?.length ?? 0;
  const kalan = await Promise.all(
    Array.from({ length: Math.max(0, Math.ceil(toplam / 1000) - 1) }, (_, i) => sorgu((i + 1) * 1000)),
  );
  const data: unknown[] = [...(ilk.data ?? []), ...kalan.flatMap((s) => s.data ?? [])];
  return (data as (TedarikciFiyati & { tedarikciler: { ad: string } | null })[]).map(
    ({ tedarikciler, ...f }): TedarikciFiyatiAdli => fiyatiDuzelt({ ...f, tedarikci_adi: tedarikciler?.ad ?? "" }),
  );
}

export async function bekleyenTalepleriGetir(supabase: Supabase) {
  const { data } = await supabase
    .from("fiyat_talepleri")
    .select("*")
    .is("cevap_zamani", null)
    .order("gonderim_zamani");
  return (data ?? []) as FiyatTalebi[];
}
