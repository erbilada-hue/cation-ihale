"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sunucuIstemcisi } from "@/lib/supabase/server";

export type FormDurumu = { hata: string | null; basari: string | null };

function yenile() {
  revalidatePath("/musteriler", "layout");
  revalidatePath("/ihaleler", "layout");
}

export async function musteriKaydet(_onceki: FormDurumu, form: FormData): Promise<FormDurumu> {
  const metin = (ad: string) => String(form.get(ad) ?? "").trim();
  const id = metin("id") || null;
  const kayit = {
    ad: metin("ad"),
    yetkili: metin("yetkili"),
    telefon: metin("telefon"),
    eposta: metin("eposta"),
    adres: metin("adres"),
    notlar: metin("notlar"),
  };
  if (!kayit.ad) return { hata: "Müşteri adı zorunludur.", basari: null };

  const supabase = sunucuIstemcisi();
  if (id) {
    const { error } = await supabase.from("musteriler").update(kayit).eq("id", id);
    if (error) return { hata: "Kaydedilemedi: " + error.message, basari: null };
    // İhalelerdeki müşteri adı (PDF'te görünen) da güncellenir
    await supabase.from("ihaleler").update({ musteri: kayit.ad }).eq("musteri_id", id);
    yenile();
    return { hata: null, basari: "Müşteri bilgileri kaydedildi." };
  }
  const { data, error } = await supabase.from("musteriler").insert(kayit).select("id").single();
  if (error) return { hata: "Kaydedilemedi: " + error.message, basari: null };
  yenile();
  redirect(`/musteriler/${data.id}`);
}

/** Müşteri kartını siler; ihaleleri silinmez, sadece müşteri bağlantısı kalkar (müşteri adı ihalede yazılı kalır). */
export async function musteriSil(id: string): Promise<{ hata: string } | undefined> {
  const supabase = sunucuIstemcisi();
  const { error } = await supabase.from("musteriler").delete().eq("id", id);
  if (error) return { hata: "Müşteri silinemedi: " + error.message };
  yenile();
  redirect("/musteriler");
}
