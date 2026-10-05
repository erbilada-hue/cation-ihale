import { sunucuIstemcisi } from "@/lib/supabase/server";
import { kalemSablonlariniGetir } from "@/lib/veri";
import { KalemKutuphanesi } from "./KalemKutuphanesi";

export const dynamic = "force-dynamic";

export default async function KalemKutuphanesiSayfasi() {
  const sablonlar = await kalemSablonlariniGetir(sunucuIstemcisi());
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-brand-dark">Kalem Kütüphanesi</h1>
        <p className="text-sm text-slate-500">
          Her ürün grubunun zorunlu ve opsiyonel maliyet kalemleri. Ürün eklenince zorunlu kalemler otomatik açılır.
        </p>
      </div>
      <KalemKutuphanesi sablonlar={sablonlar} />
    </div>
  );
}
