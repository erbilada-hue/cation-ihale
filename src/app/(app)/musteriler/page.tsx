import Link from "next/link";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { musterileriGetir } from "@/lib/veri";
import { tarihYaz } from "@/lib/format";
import AramaKutusu from "@/components/AramaKutusu";

export const dynamic = "force-dynamic";

const sade = (s: string) => s.toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFKD").replace(/[^a-z0-9]/g, "");

type IhaleOzeti = { musteri_id: string | null; marka: string; created_at: string };

export default async function MusterilerSayfasi({ searchParams }: { searchParams: { ara?: string } }) {
  const supabase = sunucuIstemcisi();
  const [tumu, { data }] = await Promise.all([
    musterileriGetir(supabase),
    supabase.from("ihaleler").select("musteri_id, marka, created_at").not("musteri_id", "is", null),
  ]);
  const ihaleler = (data ?? []) as IhaleOzeti[];

  const ozet = (id: string) => {
    const kendi = ihaleler.filter((i) => i.musteri_id === id);
    const markalar = Array.from(new Set(kendi.map((i) => i.marka.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr"));
    const son = kendi.reduce<string | null>((s, i) => (!s || i.created_at > s ? i.created_at : s), null);
    return { sayi: kendi.length, markalar, son };
  };

  const aranan = sade(searchParams.ara ?? "");
  const rakamlar = (searchParams.ara ?? "").replace(/\D/g, "");
  const musteriler = tumu.filter(
    (m) =>
      !aranan ||
      [m.ad, m.yetkili, ...ozet(m.id).markalar].some((x) => sade(x).includes(aranan)) ||
      (rakamlar.length > 2 && m.telefon.replace(/\D/g, "").includes(rakamlar)),
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark">Müşteriler</h1>
          <p className="text-sm text-slate-500">Müşterileriniz, markaları ve ihaleleri</p>
        </div>
        <Link href="/musteriler/yeni" className="btn-birincil">
          + Yeni Müşteri
        </Link>
      </div>

      {tumu.length === 0 ? (
        <div className="kart p-10 text-center">
          <p className="text-slate-600">Henüz müşteri yok.</p>
          <Link href="/musteriler/yeni" className="btn-birincil mt-4">
            İlk müşteriyi ekle
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <AramaKutusu etiket="Müşteri ara" ipucu="Müşteri, marka, yetkili veya telefon ara…" />
          </div>
          {musteriler.length === 0 ? (
            <div className="kart p-10 text-center text-slate-600">Aramaya uyan müşteri yok.</div>
          ) : (
            <div className="kart overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-cizgi bg-zemin text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Müşteri</th>
                    <th className="px-4 py-3 font-medium">Markalar / projeler</th>
                    <th className="px-4 py-3 font-medium">Yetkili</th>
                    <th className="px-4 py-3 font-medium">Telefon</th>
                    <th className="px-4 py-3 text-right font-medium">İhale</th>
                    <th className="px-4 py-3 font-medium">Son ihale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cizgi">
                  {musteriler.map((m) => {
                    const o = ozet(m.id);
                    return (
                      <tr key={m.id} className="hover:bg-zemin/60">
                        <td className="px-4 py-3">
                          <Link href={`/musteriler/${m.id}`} className="font-medium text-brand-dark hover:text-brand">
                            {m.ad}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {o.markalar.length ? (
                            <div className="flex flex-wrap gap-1">
                              {o.markalar.map((k) => (
                                <span key={k} className="rozet bg-zemin text-slate-600">{k}</span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{m.yetkili || "—"}</td>
                        <td className="rakam px-4 py-3 text-slate-600">{m.telefon || "—"}</td>
                        <td className="rakam px-4 py-3 text-right">{o.sayi}</td>
                        <td className="rakam px-4 py-3 text-slate-600">{tarihYaz(o.son)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
