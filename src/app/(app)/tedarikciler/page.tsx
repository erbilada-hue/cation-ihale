import Link from "next/link";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { bekleyenTalepleriGetir, fiyatListesiniGetir, tedarikcileriGetir } from "@/lib/veri";
import { eskiMi } from "@/lib/tedarikci";

export const dynamic = "force-dynamic";

export default async function TedarikcilerSayfasi() {
  const supabase = sunucuIstemcisi();
  const [tedarikciler, fiyatlar, talepler] = await Promise.all([
    tedarikcileriGetir(supabase),
    fiyatListesiniGetir(supabase),
    bekleyenTalepleriGetir(supabase),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark">Tedarikçiler</h1>
          <p className="text-sm text-slate-500">Kumaş, aksesuar, fason ve diğer tedarikçileriniz</p>
        </div>
        <Link href="/tedarikciler/yeni" className="btn-birincil">
          + Yeni Tedarikçi
        </Link>
      </div>

      {tedarikciler.length === 0 ? (
        <div className="kart p-10 text-center">
          <p className="text-slate-600">Henüz tedarikçi yok.</p>
          <Link href="/tedarikciler/yeni" className="btn-birincil mt-4">
            İlk tedarikçiyi ekle
          </Link>
        </div>
      ) : (
        <div className="kart overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-cizgi bg-zemin text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tedarikçi</th>
                <th className="px-4 py-3 font-medium">Ne veriyor</th>
                <th className="px-4 py-3 font-medium">Yetkili</th>
                <th className="px-4 py-3 font-medium">Telefon</th>
                <th className="px-4 py-3 text-right font-medium">Fiyat</th>
                <th className="px-4 py-3 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cizgi">
              {tedarikciler.map((t) => {
                const kendi = fiyatlar.filter((f) => f.tedarikci_id === t.id);
                const eski = kendi.filter((f) => eskiMi(f.fiyat_tarihi)).length;
                const bekleyen = talepler.filter((x) => x.tedarikci_id === t.id).length;
                return (
                  <tr key={t.id} className="hover:bg-zemin/60">
                    <td className="px-4 py-3">
                      <Link href={`/tedarikciler/${t.id}`} className="font-medium text-brand-dark hover:text-brand">
                        {t.ad}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t.kategori || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{t.yetkili || "—"}</td>
                    <td className="rakam px-4 py-3 text-slate-600">{t.telefon || "—"}</td>
                    <td className="rakam px-4 py-3 text-right">{kendi.length}</td>
                    <td className="space-x-1 px-4 py-3">
                      {bekleyen > 0 && <span className="rozet bg-blue-50 text-blue-700">cevap bekleniyor</span>}
                      {eski > 0 && <span className="rozet bg-amber-50 text-amber-700">{eski} eski fiyat</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
