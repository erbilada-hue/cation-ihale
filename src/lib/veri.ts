import type {
  FirmaAyarlari,
  Ihale,
  KalemSablonu,
  SegmentSablonu,
  Teklif,
  UrunKalemli,
  UrunKalemi,
} from "./tipler";
export { maliyetGirdisi } from "./maliyetGirdisi";
import { sunucuIstemcisi } from "./supabase/server";

type Supabase = ReturnType<typeof sunucuIstemcisi>;

// Veritabanındaki numeric alanlar her durumda sayıya çevrilir
const sayi = (v: unknown): number | null => (v == null ? null : Number(v));

export function kalemiDuzelt(k: UrunKalemi): UrunKalemi {
  return { ...k, kullanim: sayi(k.kullanim), birim_fiyat: sayi(k.birim_fiyat) };
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
  return (data as Ihale | null) ?? null;
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
