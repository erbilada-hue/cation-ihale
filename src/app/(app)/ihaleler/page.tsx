import Link from "next/link";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { asamaAdi } from "@/lib/sabitler";
import { tarihYaz } from "@/lib/format";
import type { Ihale } from "@/lib/tipler";

export const dynamic = "force-dynamic";

export default async function IhalelerSayfasi() {
  const supabase = sunucuIstemcisi();
  const { data } = await supabase
    .from("ihaleler")
    .select("*, ihale_urunleri(count)")
    .order("created_at", { ascending: false });
  const ihaleler = (data ?? []) as (Ihale & { ihale_urunleri: { count: number }[] })[];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark">İhaleler</h1>
          <p className="text-sm text-slate-500">Tüm ihaleler ve bulundukları aşama</p>
        </div>
        <Link href="/ihaleler/yeni" className="btn-birincil">
          + Yeni İhale
        </Link>
      </div>

      {ihaleler.length === 0 ? (
        <div className="kart p-10 text-center">
          <p className="text-slate-600">Henüz ihale yok.</p>
          <Link href="/ihaleler/yeni" className="btn-birincil mt-4">
            İlk ihaleyi oluştur
          </Link>
        </div>
      ) : (
        <div className="kart overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-cizgi bg-zemin text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">İhale</th>
                <th className="px-4 py-3 font-medium">Müşteri</th>
                <th className="px-4 py-3 font-medium">Son teklif tarihi</th>
                <th className="px-4 py-3 text-right font-medium">Ürün</th>
                <th className="px-4 py-3 font-medium">Aşama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cizgi">
              {ihaleler.map((i) => (
                <tr key={i.id} className="hover:bg-zemin/60">
                  <td className="px-4 py-3">
                    <Link href={`/ihaleler/${i.id}`} className="font-medium text-brand-dark hover:text-brand">
                      {i.ad}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {i.musteri_id ? (
                      <Link href={`/musteriler/${i.musteri_id}`} className="hover:text-brand">
                        {i.musteri}
                      </Link>
                    ) : (
                      i.musteri || "—"
                    )}
                    {i.marka && <span className="text-slate-400"> · {i.marka}</span>}
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
      )}
    </div>
  );
}
