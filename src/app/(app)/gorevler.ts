"use server";

import { revalidatePath } from "next/cache";
import { sunucuIstemcisi } from "@/lib/supabase/server";

type Sonuc = { hata: string } | { hata?: undefined };
const TARIH = /^\d{4}-\d{2}-\d{2}$/;

export async function gorevEkle(g: { baslik: string; ihaleId: string | null; sonTarih: string | null }): Promise<Sonuc> {
  const baslik = g.baslik.trim();
  if (!baslik) return { hata: "Görevi yazın." };
  if (baslik.length > 300) return { hata: "Görev çok uzun." };
  if (g.sonTarih && !TARIH.test(g.sonTarih)) return { hata: "Tarih geçersiz." };
  const supabase = sunucuIstemcisi();
  const { error } = await supabase
    .from("gorevler")
    .insert({ baslik, ihale_id: g.ihaleId || null, son_tarih: g.sonTarih || null });
  if (error) return { hata: "Görev eklenemedi: " + error.message };
  revalidatePath("/");
  return {};
}

export async function gorevTamamla(id: string, tamamlandi: boolean): Promise<Sonuc> {
  const supabase = sunucuIstemcisi();
  const { error } = await supabase
    .from("gorevler")
    .update({ tamamlandi, tamamlanma_zamani: tamamlandi ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { hata: "Görev güncellenemedi: " + error.message };
  revalidatePath("/");
  return {};
}

export async function gorevSil(id: string): Promise<Sonuc> {
  const supabase = sunucuIstemcisi();
  const { error } = await supabase.from("gorevler").delete().eq("id", id);
  if (error) return { hata: "Görev silinemedi: " + error.message };
  revalidatePath("/");
  return {};
}
