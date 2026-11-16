import Link from "next/link";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { asamaAdi } from "@/lib/sabitler";
import { tarihYaz } from "@/lib/format";
import type { Ihale } from "@/lib/tipler";

export const dynamic = "force-dynamic";

const DURUMLAR = [
  { kod: "", ad: "Tümü" },
  { kod: "aktif", ad: "Aktif" },
  { kod: "bekleyen", ad: "Teklif verildi, sonuç bekleniyor" },
  { kod: "olumlu", ad: "Olumlu" },
  { kod: "olumsuz", ad: "Olumsuz" },
] as const;

type Satir = Ihale & { ihale_urunleri: { count: number }[]; teklifler: { count: number }[] };

const aktifMi = (i: Satir) => i.sonuc == null && ["ihale", "maliyet", "teklif"].includes(i.asama);
const SUZGECLER: Record<string, (i: Satir) => boolean> = {
  aktif: aktifMi,
  bekleyen: (i) => aktifMi(i) && (i.teklifler?.[0]?.count ?? 0) > 0,
  olumlu: (i) => i.sonuc === "olumlu",
  olumsuz: (i) => i.sonuc === "olumsuz",
};

export default async function IhalelerSayfasi({ searchParams }: { searchParams: { durum?: string } }) {
  const supabase = sunucuIstemcisi();
  const { data } = await supabase
    .from("ihaleler")
    .select("*, ihale_urunleri(count), teklifler(count)")
    .order("created_at", { ascending: false });
  const tumu = (data ?? []) as Satir[];
  const durum = searchParams.durum && SUZGECLER[searchParams.durum] ? searchParams.durum : "";
  const ihaleler = durum ? tumu.filter(SUZGECLER[durum]) : tumu;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark">İhaleler</h1>
          <p className="text-sm text-slate-500">Tüm ihaleler ve bulundukları aşama</p>
        </div>
        <div className="flex gap-2">
          <Link href="/raporlar" className="btn-ikincil">
            Kazanılan işler raporu
          </Link>
          <Link href="/ihaleler/yeni" className="btn-birincil">
            + Yeni İhale
          </Link>
        </div>
      </div>

      {tumu.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {DURUMLAR.map((d) => (
            <Link
              key={d.kod}
              href={d.kod ? `/ihaleler?durum=${d.kod}` : "/ihaleler"}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                durum === d.kod ? "border-brand bg-brand text-white" : "border-cizgi bg-white text-slate-600 hover:border-brand hover:text-brand"
              }`}
            >
              {d.ad} <span className="opacity-70">{d.kod ? tumu.filter(SUZGECLER[d.kod]).length : tumu.length}</span>
            </Link>
          ))}
        </div>
      )}

      {tumu.length === 0 ? (
        <div className="kart p-6 sm:p-10 text-center">
          <p className="text-slate-600">Henüz ihale yok.</p>
          <Link href="/ihaleler/yeni" className="btn-birincil mt-4">
            İlk ihaleyi oluştur
          </Link>
        </div>
      ) : ihaleler.length === 0 ? (
        <div className="kart p-6 sm:p-10 text-center text-slate-500">Bu durumda ihale yok.</div>
      ) : (
        <div className="kart overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-cizgi bg-zemin text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">İhale</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Müşteri</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Son teklif tarihi</th>
                <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">Ürün</th>
                <th className="px-4 py-3 font-medium">Aşama</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Sonuç</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cizgi">
              {ihaleler.map((i) => (
                <tr key={i.id} className="hover:bg-zemin/60">
                  <td className="px-4 py-3">
                    <Link href={`/ihaleler/${i.id}`} className="font-medium text-brand-dark hover:text-brand">
                      {i.ad}
                    </Link>
                    <div className="mt-0.5 text-xs text-slate-500 sm:hidden">
                      {[i.musteri, i.son_teklif_tarihi && `Son teklif ${tarihYaz(i.son_teklif_tarihi)}`].filter(Boolean).join(" · ")}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                    {i.musteri_id ? (
                      <Link href={`/musteriler/${i.musteri_id}`} className="hover:text-brand">
                        {i.musteri}
                      </Link>
                    ) : (
                      i.musteri || "—"
                    )}
                    {i.marka && <span className="text-slate-400"> · {i.marka}</span>}
                  </td>
                  <td className="rakam hidden px-4 py-3 text-slate-600 sm:table-cell">{tarihYaz(i.son_teklif_tarihi)}</td>
                  <td className="rakam hidden px-4 py-3 text-right sm:table-cell">{i.ihale_urunleri?.[0]?.count ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className="rozet bg-brand-soft text-brand">{asamaAdi(i.asama)}</span>
                    {i.sonuc && (
                      <div className="mt-1 sm:hidden">
                        {i.sonuc === "olumlu" ? (
                          <span className="rozet bg-green-100 text-green-800">✓ Olumlu</span>
                        ) : (
                          <span className="rozet bg-red-100 text-red-800">✗ Olumsuz</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {i.sonuc === "olumlu" ? (
                      <span className="rozet bg-green-100 text-green-800">✓ Olumlu</span>
                    ) : i.sonuc === "olumsuz" ? (
                      <span className="rozet bg-red-100 text-red-800">✗ Olumsuz</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
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
