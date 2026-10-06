import { notFound } from "next/navigation";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { ihaleGetir, markalariGetir, musterileriGetir, segmentleriGetir } from "@/lib/veri";
import { IhaleFormu } from "../../IhaleFormu";

export const dynamic = "force-dynamic";

export default async function IhaleDuzenleSayfasi({ params }: { params: { id: string } }) {
  const supabase = sunucuIstemcisi();
  const [ihale, segmentler, musteriler, markalar] = await Promise.all([
    ihaleGetir(supabase, params.id),
    segmentleriGetir(supabase),
    musterileriGetir(supabase),
    markalariGetir(supabase),
  ]);
  if (!ihale) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold text-brand-dark">İhaleyi düzenle</h1>
      <IhaleFormu ihale={ihale} segmentler={segmentler} musteriler={musteriler} markalar={markalar} />
    </div>
  );
}
