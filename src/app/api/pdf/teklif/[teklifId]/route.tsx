import { renderToBuffer } from "@react-pdf/renderer";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { firmaAyarlariGetir, ihaleGetir } from "@/lib/veri";
import { fontlariKaydet } from "@/pdf/ortak";
import { MusteriTeklifiPdf } from "@/pdf/MusteriTeklifi";
import { pdfHatasi, pdfYaniti } from "@/pdf/yanit";
import type { Teklif } from "@/lib/tipler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_istek: Request, { params }: { params: { teklifId: string } }) {
  const supabase = sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Giriş yapmanız gerekiyor.", { status: 401 });

  const { data } = await supabase.from("teklifler").select("*").eq("id", params.teklifId).maybeSingle();
  const teklif = data as Teklif | null;
  if (!teklif) return new Response("Teklif bulunamadı.", { status: 404 });

  const [ihale, firma] = await Promise.all([ihaleGetir(supabase, teklif.ihale_id), firmaAyarlariGetir(supabase)]);
  if (!ihale) return new Response("İhale bulunamadı.", { status: 404 });

  try {
    fontlariKaydet();
    const pdf = await renderToBuffer(<MusteriTeklifiPdf teklif={teklif} ihale={ihale} firma={firma} />);
    return pdfYaniti(pdf, `Teklif-${teklif.teklif_no}.pdf`);
  } catch (e) {
    return pdfHatasi(e);
  }
}
