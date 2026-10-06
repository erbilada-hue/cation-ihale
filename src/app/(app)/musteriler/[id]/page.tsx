import Link from "next/link";
import { notFound } from "next/navigation";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { asamaAdi } from "@/lib/sabitler";
import { tarihYaz } from "@/lib/format";
import type { Ihale, Musteri } from "@/lib/tipler";
import { MusteriFormu } from "../MusteriFormu";
import { MusteriSilButonu } from "./MusteriSilButonu";

export const dynamic = "force-dynamic";

type IhaleSatiri = Ihale & { ihale_urunleri: { count: number }[] };

export default async function MusteriSayfasi({ params }: { params: { id: string } }) {
  const supabase = sunucuIstemcisi();
  const [{ data: m }, { data }] = await Promise.all([
    supabase.from("musteriler").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("ihaleler").select("*, ihale_urunleri(count)").eq("musteri_id", params.id).order("created_at", { ascending: false }),
  ]);
  const musteri = m as Musteri | null;
  if (!musteri) notFound();
  const ihaleler = (data ?? []) as IhaleSatiri[];

  // Markası olan ihaleler marka marka, olmayanlar "Genel" başlığında toplanır
  const gruplar = new Map<string, IhaleSatiri[]>();
  for (const i of ihaleler) {
    const k = i.marka.trim();
    gruplar.set(k, [...(gruplar.get(k) ?? []), i]);
  }
  const markali = Array.from(gruplar.keys()).some(Boolean);
  const sirali = Array.from(gruplar.entries()).sort(([a], [b]) => (!a ? 1 : !b ? -1 : a.localeCompare(b, "tr")));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <div className="mb-1 text-sm">
          <Link href="/musteriler" className="text-slate-500 hover:text-brand">
            ← Müşteriler
          </Link>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-brand-dark">{musteri.ad}</h1>
            <p className="text-sm text-slate-500">
              {[musteri.yetkili, musteri.telefon, musteri.eposta].filter(Boolean).join(" · ") || "İletişim bilgisi girilmedi"}
            </p>
          </div>
          <MusteriSilButonu id={musteri.id} ad={musteri.ad} ihaleSayisi={ihaleler.length} />
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-brand-dark">İhaleler ({ihaleler.length})</h2>
          <Link href={`/ihaleler/yeni?musteri=${musteri.id}`} className="btn-birincil">
            + Bu müşteri için yeni ihale
          </Link>
        </div>
        {ihaleler.length === 0 ? (
          <div className="kart p-8 text-center text-slate-600">Bu müşteriye bağlı ihale yok.</div>
        ) : (
          <div className="space-y-4">
            {sirali.map(([marka, liste]) => (
              <div key={marka} className="kart overflow-hidden">
                {markali && (
                  <div className="border-b border-cizgi bg-zemin px-4 py-2 text-sm font-semibold text-brand-dark">
                    {marka || "Markasız"} <span className="font-normal text-slate-500">· {liste.length} ihale</span>
                  </div>
                )}
                <table className="w-full table-fixed text-sm">
                  <thead className="border-b border-cizgi text-left text-xs text-slate-500">
                    <tr>
                      <th className="w-1/2 px-4 py-2 font-medium">İhale</th>
                      <th className="px-4 py-2 font-medium">Son teklif tarihi</th>
                      <th className="w-24 px-4 py-2 text-right font-medium">Ürün</th>
                      <th className="w-36 px-4 py-2 font-medium">Aşama</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cizgi">
                    {liste.map((i) => (
                      <tr key={i.id} className="hover:bg-zemin/60">
                        <td className="px-4 py-3">
                          <Link href={`/ihaleler/${i.id}`} className="font-medium text-brand-dark hover:text-brand">
                            {i.ad}
                          </Link>
                        </td>
                        <td className="rakam px-4 py-3 text-slate-600">{tarihYaz(i.son_teklif_tarihi)}</td>
                        <td className="rakam px-4 py-3 text-right">{i.ihale_urunleri?.[0]?.count ?? 0}</td>
                        <td className="px-4 py-3">
                          <span className="rozet bg-brand-soft text-brand">{asamaAdi(i.asama)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-brand-dark">Müşteri bilgileri</h2>
        <MusteriFormu musteri={musteri} />
      </section>
    </div>
  );
}
