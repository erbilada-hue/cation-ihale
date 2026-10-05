import { sunucuIstemcisi } from "@/lib/supabase/server";
import { segmentleriGetir } from "@/lib/veri";
import { IhaleFormu } from "../IhaleFormu";

export const dynamic = "force-dynamic";

export default async function YeniIhaleSayfasi() {
  const segmentler = await segmentleriGetir(sunucuIstemcisi());
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold text-brand-dark">Yeni İhale</h1>
      <IhaleFormu segmentler={segmentler} />
    </div>
  );
}
