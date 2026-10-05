"use server";

import { revalidatePath } from "next/cache";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { URUN_GRUPLARI } from "@/lib/sabitler";
import type { SablonSatiri } from "@/lib/kalemExcel";
import type { Sonuc } from "../ihaleler/actions";

function dogrula(s: SablonSatiri): string | null {
  if (!URUN_GRUPLARI.some((g) => g.kod === s.urun_grubu)) return "Ürün grubu geçersiz.";
  if (!s.ad?.trim()) return "Kalem adı boş olamaz.";
  if (s.varsayilan_kullanim != null && (Number.isNaN(s.varsayilan_kullanim) || s.varsayilan_kullanim < 0)) {
    return "Kullanım negatif olamaz.";
  }
  if (s.varsayilan_birim_fiyat != null && (Number.isNaN(s.varsayilan_birim_fiyat) || s.varsayilan_birim_fiyat < 0)) {
    return "Birim fiyat negatif olamaz.";
  }
  return null;
}

function temizle(s: SablonSatiri) {
  return {
    urun_grubu: s.urun_grubu,
    ad: s.ad.trim(),
    zorunlu: Boolean(s.zorunlu),
    birim: s.birim?.trim() || "adet",
    varsayilan_kullanim: s.varsayilan_kullanim,
    varsayilan_birim_fiyat: s.varsayilan_birim_fiyat,
    anahtar_kelimeler: (s.anahtar_kelimeler ?? []).map((k) => k.trim()).filter(Boolean),
  };
}

export async function sablonKaydet(id: string | null, satir: SablonSatiri): Promise<Sonuc> {
  const hata = dogrula(satir);
  if (hata) return { hata };
  const supabase = sunucuIstemcisi();
  const { error } = id
    ? await supabase.from("kalem_sablonlari").update(temizle(satir)).eq("id", id)
    : await supabase.from("kalem_sablonlari").insert(temizle(satir));
  if (error) return { hata: "Kaydedilemedi: " + error.message };
  revalidatePath("/kalem-kutuphanesi");
  return { veri: null };
}

export async function sablonSil(id: string): Promise<Sonuc> {
  const supabase = sunucuIstemcisi();
  const { error } = await supabase.from("kalem_sablonlari").delete().eq("id", id);
  if (error) return { hata: "Silinemedi: " + error.message };
  revalidatePath("/kalem-kutuphanesi");
  return { veri: null };
}

/**
 * Excel'den okunan kalemleri kütüphaneye yazar.
 * "degistir" modunda mevcut kütüphane önce tamamen silinir.
 */
export async function sablonlariIceAktar(
  satirlar: SablonSatiri[],
  mod: "ekle" | "degistir",
): Promise<Sonuc<{ eklenen: number }>> {
  if (satirlar.length === 0) return { hata: "Aktarılacak kalem yok." };
  for (const [i, s] of satirlar.entries()) {
    const hata = dogrula(s);
    if (hata) return { hata: `${i + 1}. kalem: ${hata}` };
  }

  const supabase = sunucuIstemcisi();
  if (mod === "degistir") {
    const { error } = await supabase.from("kalem_sablonlari").delete().not("id", "is", null);
    if (error) return { hata: "Eski kütüphane silinemedi: " + error.message };
  }

  const kayitlar = satirlar.map((s, i) => ({ ...temizle(s), sira: i }));
  const { error } = await supabase.from("kalem_sablonlari").insert(kayitlar);
  if (error) return { hata: "Kalemler aktarılamadı: " + error.message };

  revalidatePath("/kalem-kutuphanesi");
  return { veri: { eklenen: kayitlar.length } };
}
