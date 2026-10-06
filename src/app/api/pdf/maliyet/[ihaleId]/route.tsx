import { renderToBuffer } from "@react-pdf/renderer";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { ihaleGetir, segmentleriGetir, urunleriGetir } from "@/lib/veri";
import { fontlariKaydet } from "@/pdf/ortak";
import { IcMaliyetRaporuPdf } from "@/pdf/IcMaliyetRaporu";
import { pdfHatasi, pdfYaniti } from "@/pdf/yanit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_istek: Request, { params }: { params: { ihaleId: string } }) {
  const supabase = sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Giriş yapmanız gerekiyor.", { status: 401 });

  const ihale = await ihaleGetir(supabase, params.ihaleId);
  if (!ihale) return new Response("İhale bulunamadı.", { status: 404 });
  const [urunler, segmentler] = await Promise.all([urunleriGetir(supabase, ihale.id), segmentleriGetir(supabase)]);

  try {
    fontlariKaydet();
    const pdf = await renderToBuffer(
      <IcMaliyetRaporuPdf ihale={ihale} urunler={urunler} segment={segmentler.find((s) => s.segment === ihale.segment)} />,
    );
    return pdfYaniti(pdf, `Ic-Maliyet-Raporu-${ihale.ad}.pdf`);
  } catch (e) {
    return pdfHatasi(e);
  }
}
