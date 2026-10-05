"use server";

import { revalidatePath } from "next/cache";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { URUN_GRUPLARI } from "@/lib/sabitler";
import { sadelestir, type SablonSatiri } from "@/lib/kalemExcel";
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
): Promise<Sonuc<{ eklenen: number; atlanan: number }>> {
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

  // Aynı ürün grubunda aynı adlı kalem ikinci kez eklenmez
  const anahtar = (grup: string, ad: string) => `${grup}|${sadelestir(ad)}`;
  const mevcut = new Set<string>();
  if (mod === "ekle") {
    const { data } = await supabase.from("kalem_sablonlari").select("urun_grubu, ad");
    (data ?? []).forEach((k) => mevcut.add(anahtar(k.urun_grubu, k.ad)));
  }
  const kayitlar = [];
  for (const [i, s] of satirlar.entries()) {
    const k = anahtar(s.urun_grubu, s.ad);
    if (mevcut.has(k)) continue;
    mevcut.add(k);
    kayitlar.push({ ...temizle(s), sira: i });
  }

  const excelden = kayitlar.length;

  // Nakliye payı her ürün grubunda opsiyonel kalem olarak bulunmalı
  for (const g of URUN_GRUPLARI) {
    const nakliyeVar = Array.from(mevcut).some((k) => k.startsWith(`${g.kod}|`) && k.includes("nakliye"));
    if (!nakliyeVar) {
      kayitlar.push({
        urun_grubu: g.kod,
        ad: "Nakliye payı",
        zorunlu: false,
        birim: "adet",
        varsayilan_kullanim: 1,
        varsayilan_birim_fiyat: null,
        anahtar_kelimeler: ["nakliye", "teslim", "sevkiyat", "kargo"],
        sira: 999,
      });
    }
  }

  if (kayitlar.length > 0) {
    const { error } = await supabase.from("kalem_sablonlari").insert(kayitlar);
    if (error) return { hata: "Kalemler aktarılamadı: " + error.message };
  }

  revalidatePath("/kalem-kutuphanesi");
  return { veri: { eklenen: kayitlar.length, atlanan: satirlar.length - excelden } };
}
