"use server";

import { revalidatePath } from "next/cache";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { sayiOku } from "@/lib/format";
import { SEGMENTLER } from "@/lib/sabitler";

export type FormDurumu = { hata: string | null; basari: string | null };

const LOGO_UST_SINIR = 400_000; // karakter (~300 KB görsel)

export async function firmaKaydet(_onceki: FormDurumu, form: FormData): Promise<FormDurumu> {
  const metin = (ad: string) => String(form.get(ad) ?? "").trim();

  const gun = sayiOku(metin("teklif_gecerlilik_gun"));
  if (gun == null || !Number.isInteger(gun) || gun <= 0) {
    return { hata: "Teklif geçerlilik süresi pozitif bir gün sayısı olmalı.", basari: null };
  }
  const kdv = sayiOku(metin("varsayilan_kdv_orani"));
  if (kdv == null || Number.isNaN(kdv) || kdv < 0) {
    return { hata: "Varsayılan KDV oranı geçerli bir sayı olmalı.", basari: null };
  }

  const logo = metin("logo_data_url");
  if (logo && (!/^data:image\/(png|jpeg);base64,/.test(logo) || logo.length > LOGO_UST_SINIR)) {
    return { hata: "Logo PNG veya JPG olmalı ve 300 KB'tan küçük olmalı.", basari: null };
  }

  const supabase = sunucuIstemcisi();
  const { error } = await supabase
    .from("firma_ayarlari")
    .update({
      firma_adi: metin("firma_adi"),
      adres: metin("adres"),
      telefon: metin("telefon"),
      eposta: metin("eposta"),
      web: metin("web"),
      vergi_dairesi: metin("vergi_dairesi"),
      vergi_no: metin("vergi_no"),
      banka_adi: metin("banka_adi"),
      iban: metin("iban").replace(/\s+/g, " ").toUpperCase(),
      logo_data_url: logo || null,
      teklif_gecerlilik_gun: gun,
      varsayilan_kdv_orani: kdv,
    })
    .eq("id", 1);
  if (error) return { hata: "Kaydedilemedi: " + error.message, basari: null };

  revalidatePath("/ayarlar");
  return { hata: null, basari: "Firma bilgileri kaydedildi." };
}

export async function segmentleriKaydet(_onceki: FormDurumu, form: FormData): Promise<FormDurumu> {
  const supabase = sunucuIstemcisi();
  for (const segment of SEGMENTLER) {
    const al = (alan: string) => String(form.get(`${segment}.${alan}`) ?? "").trim();
    const fire = sayiOku(al("fire_orani"));
    if (fire == null || Number.isNaN(fire) || fire < 0) {
      return { hata: `${segment} için fire oranı geçerli bir sayı olmalı.`, basari: null };
    }
    const { error } = await supabase
      .from("segment_sablonlari")
      .update({ kumas: al("kumas"), gramaj: al("gramaj"), boya: al("boya"), baski: al("baski"), fire_orani: fire })
      .eq("segment", segment);
    if (error) return { hata: "Kaydedilemedi: " + error.message, basari: null };
  }
  revalidatePath("/ayarlar");
  return { hata: null, basari: "Segment şablonları kaydedildi." };
}
