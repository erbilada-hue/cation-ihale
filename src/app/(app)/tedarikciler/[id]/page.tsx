import Link from "next/link";
import { notFound } from "next/navigation";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { firmaAyarlariGetir, fiyatListesiniGetir, kalemSablonlariniGetir } from "@/lib/veri";
import type { Tedarikci } from "@/lib/tipler";
import { TedarikciFormu } from "../TedarikciFormu";
import { TedarikciFiyatlari } from "./TedarikciFiyatlari";
import { TedarikciSilButonu } from "./TedarikciSilButonu";

export const dynamic = "force-dynamic";

export default async function TedarikciSayfasi({ params }: { params: { id: string } }) {
  const supabase = sunucuIstemcisi();
  const { data } = await supabase.from("tedarikciler").select("*").eq("id", params.id).maybeSingle();
  const tedarikci = data as Tedarikci | null;
  if (!tedarikci) notFound();

  const [fiyatlar, sablonlar, firma] = await Promise.all([
    fiyatListesiniGetir(supabase, tedarikci.id),
    kalemSablonlariniGetir(supabase),
    firmaAyarlariGetir(supabase),
  ]);
  const oneriler = Array.from(new Set(sablonlar.map((s) => s.ad))).sort((a, b) => a.localeCompare(b, "tr"));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <div className="mb-1 text-sm">
          <Link href="/tedarikciler" className="text-slate-500 hover:text-brand">
            ← Tedarikçiler
          </Link>
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold text-brand-dark">{tedarikci.ad}</h1>
          <TedarikciSilButonu id={tedarikci.id} ad={tedarikci.ad} fiyatSayisi={fiyatlar.length} />
        </div>
      </div>

      <TedarikciFiyatlari
        tedarikciId={tedarikci.id}
        ilkFiyatlar={fiyatlar}
        kalemOnerileri={oneriler}
        kdvOrani={firma?.varsayilan_kdv_orani ?? 20}
      />

      <section>
        <h2 className="mb-3 font-semibold text-brand-dark">Firma bilgileri</h2>
        <TedarikciFormu tedarikci={tedarikci} />
      </section>
    </div>
  );
}
