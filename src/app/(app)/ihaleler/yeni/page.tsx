import { sunucuIstemcisi } from "@/lib/supabase/server";
import { markalariGetir, musterileriGetir, segmentleriGetir } from "@/lib/veri";
import { IhaleFormu } from "../IhaleFormu";

export const dynamic = "force-dynamic";

export default async function YeniIhaleSayfasi({ searchParams }: { searchParams: { musteri?: string } }) {
  const supabase = sunucuIstemcisi();
  const [segmentler, musteriler, markalar] = await Promise.all([segmentleriGetir(supabase), musterileriGetir(supabase), markalariGetir(supabase)]);
  const varsayilan = musteriler.some((m) => m.id === searchParams.musteri) ? searchParams.musteri : undefined;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold text-brand-dark">Yeni İhale</h1>
      <IhaleFormu segmentler={segmentler} musteriler={musteriler} markalar={markalar} varsayilanMusteri={varsayilan} />
    </div>
  );
}
