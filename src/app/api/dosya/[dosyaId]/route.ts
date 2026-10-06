import { sunucuIstemcisi } from "@/lib/supabase/server";
import { SARTNAME_KLASORU } from "@/lib/dosya";
import type { IhaleDosyasi } from "@/lib/tipler";

export const dynamic = "force-dynamic";

// Şartname dosyasını açar: kısa süreli gizli bağlantı üretip oraya yönlendirir
export async function GET(_istek: Request, { params }: { params: { dosyaId: string } }) {
  const supabase = sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Giriş yapmanız gerekiyor.", { status: 401 });

  const { data } = await supabase.from("ihale_dosyalari").select("*").eq("id", params.dosyaId).maybeSingle();
  const dosya = data as IhaleDosyasi | null;
  if (!dosya) return new Response("Dosya bulunamadı.", { status: 404 });

  // PDF ve resimler tarayıcıda açılır, Word / Excel indirilir
  const tarayicidaAcilir = /^(application\/pdf|image\/)/.test(dosya.tur);
  const { data: imzali, error } = await supabase.storage
    .from(SARTNAME_KLASORU)
    .createSignedUrl(dosya.yol, 300, tarayicidaAcilir ? undefined : { download: dosya.dosya_adi });
  if (error || !imzali) {
    return new Response("Dosya açılamadı: " + (error?.message ?? "bilinmeyen hata"), { status: 500 });
  }
  return Response.redirect(imzali.signedUrl, 302);
}
