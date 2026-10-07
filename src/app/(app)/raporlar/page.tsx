import Link from "next/link";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { ihaleKurlari, urunuDuzelt } from "@/lib/veri";
import { adetYaz, paraYaz, tarihYaz } from "@/lib/format";
import { DONEMLER, donemAraligi, ihaleToplami } from "@/lib/rapor";
import type { Ihale, UrunKalemli } from "@/lib/tipler";
import { RaporExceli, type RaporSatiri } from "./RaporExceli";

export const dynamic = "force-dynamic";

type Sayfa = { searchParams: { donem?: string; bas?: string; bit?: string } };

export default async function RaporlarSayfasi({ searchParams }: Sayfa) {
  const donem = donemAraligi(searchParams.donem, new Date(), { bas: searchParams.bas, bit: searchParams.bit });
  const supabase = sunucuIstemcisi();
  const { data, error } = await supabase
    .from("ihaleler")
    .select("*, ihale_urunleri(*, urun_kalemleri(*))")
    .not("sonuc", "is", null)
    .gte("sonuc_tarihi", donem.bas)
    .lte("sonuc_tarihi", donem.bit)
    .order("sonuc_tarihi", { ascending: false });
  if (error) throw new Error(error.message);

  const ihaleler = ((data ?? []) as (Ihale & { ihale_urunleri: UrunKalemli[] })[]).map((i) => {
    const kurlar = ihaleKurlari({ usd_kuru: i.usd_kuru == null ? null : Number(i.usd_kuru), eur_kuru: i.eur_kuru == null ? null : Number(i.eur_kuru) });
    return { ...i, toplam: ihaleToplami(i.ihale_urunleri.map(urunuDuzelt), kurlar, i.teklif_para_birimi ?? "TRY") };
  });
  const olumlu = ihaleler.filter((i) => i.sonuc === "olumlu");
  const olumsuz = ihaleler.filter((i) => i.sonuc === "olumsuz");
  const genel = olumlu.reduce(
    (t, i) => ({
      adet: t.adet + i.toplam.adet,
      teklif: t.teklif + i.toplam.teklif,
      kdvDahil: t.kdvDahil + i.toplam.kdvDahil,
      netKar: t.netKar + i.toplam.netKar,
    }),
    { adet: 0, teklif: 0, kdvDahil: 0, netKar: 0 },
  );
  const oran = ihaleler.length > 0 ? Math.round((olumlu.length / ihaleler.length) * 100) : null;
  const eksikVar = olumlu.some((i) => i.toplam.eksik);

  const excelSatirlari: RaporSatiri[] = olumlu.map((i) => ({
    tarih: i.sonuc_tarihi ?? "",
    ihale: i.ad,
    musteri: i.musteri,
    marka: i.marka,
    urun: i.toplam.urunSayisi,
    adet: i.toplam.adet,
    teklif: Math.round(i.toplam.teklif * 100) / 100,
    kdvDahil: Math.round(i.toplam.kdvDahil * 100) / 100,
    netKar: Math.round(i.toplam.netKar * 100) / 100,
  }));

  const donemAdresi = (kod: string) => `/raporlar?donem=${kod}`;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark">Kazanılan İşler Raporu</h1>
          <p className="text-sm text-slate-500">Sonucu olumlu işaretlenen ihaleler, sonuç tarihine göre · {donem.baslik}</p>
        </div>
        <RaporExceli satirlar={excelSatirlari} dosyaAdi={`CATION_Kazanilan_Isler_${donem.bas}_${donem.bit}.xlsx`} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {DONEMLER.filter((d) => d.kod !== "ozel").map((d) => (
          <Link
            key={d.kod}
            href={donemAdresi(d.kod)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              donem.kod === d.kod ? "border-brand bg-brand text-white" : "border-cizgi bg-white text-slate-600 hover:border-brand hover:text-brand"
            }`}
          >
            {d.ad}
          </Link>
        ))}
        <form action="/raporlar" className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <input type="hidden" name="donem" value="ozel" />
          <input type="date" name="bas" defaultValue={donem.bas} aria-label="Başlangıç tarihi" className="girdi w-40 py-1.5" />
          <span className="text-slate-400">–</span>
          <input type="date" name="bit" defaultValue={donem.bit} aria-label="Bitiş tarihi" className="girdi w-40 py-1.5" />
          <button type="submit" className={donem.kod === "ozel" ? "btn-birincil btn-kucuk" : "btn-ikincil btn-kucuk"}>
            Göster
          </button>
        </form>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <Kutu baslik="Kazanılan ihale" deger={String(olumlu.length)} />
        <Kutu baslik="Teklif tutarı (KDV hariç)" deger={paraYaz(genel.teklif)} vurgulu />
        <Kutu baslik="KDV dahil" deger={paraYaz(genel.kdvDahil)} />
        <Kutu baslik="Net kâr" deger={paraYaz(genel.netKar)} />
        <Kutu
          baslik="Kazanma oranı"
          deger={oran == null ? "—" : `%${oran}`}
          alt={`${olumlu.length} olumlu · ${olumsuz.length} olumsuz`}
        />
      </div>

      <section className="kart mb-6 overflow-hidden">
        <h2 className="border-b border-cizgi px-4 py-3 font-semibold text-brand-dark">Olumlu sonuçlanan ihaleler</h2>
        {olumlu.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            Bu dönemde olumlu işaretlenmiş ihale yok. İhale sayfasının üstündeki &ldquo;İhale sonucu&rdquo; alanından işaretleyebilirsiniz.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-cizgi bg-zemin text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Sonuç tarihi</th>
                <th className="px-4 py-3 font-medium">İhale</th>
                <th className="px-4 py-3 font-medium">Müşteri</th>
                <th className="px-4 py-3 text-right font-medium">Adet</th>
                <th className="px-4 py-3 text-right font-medium">Teklif (KDV hariç)</th>
                <th className="px-4 py-3 text-right font-medium">KDV dahil</th>
                <th className="px-4 py-3 text-right font-medium">Net kâr</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cizgi">
              {olumlu.map((i) => (
                <tr key={i.id} className="hover:bg-zemin/60">
                  <td className="rakam px-4 py-3 text-slate-600">{tarihYaz(i.sonuc_tarihi)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/ihaleler/${i.id}`} className="font-medium text-brand-dark hover:text-brand">
                      {i.ad}
                    </Link>
                    {i.toplam.eksik && <span className="ml-1 text-amber-600" title="Bazı ürünlerde fire, kâr marjı veya kur eksik">*</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {i.musteri || "—"}
                    {i.marka && <span className="text-slate-400"> · {i.marka}</span>}
                  </td>
                  <td className="rakam px-4 py-3 text-right">{adetYaz(i.toplam.adet)}</td>
                  <td className="rakam px-4 py-3 text-right font-medium">{paraYaz(i.toplam.teklif)}</td>
                  <td className="rakam px-4 py-3 text-right">{paraYaz(i.toplam.kdvDahil)}</td>
                  <td className="rakam px-4 py-3 text-right">{paraYaz(i.toplam.netKar)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-cizgi bg-zemin font-semibold">
              <tr>
                <td className="px-4 py-3" colSpan={3}>
                  Toplam
                </td>
                <td className="rakam px-4 py-3 text-right">{adetYaz(genel.adet)}</td>
                <td className="rakam px-4 py-3 text-right">{paraYaz(genel.teklif)}</td>
                <td className="rakam px-4 py-3 text-right">{paraYaz(genel.kdvDahil)}</td>
                <td className="rakam px-4 py-3 text-right">{paraYaz(genel.netKar)}</td>
              </tr>
            </tfoot>
          </table>
        )}
        {eksikVar && (
          <p className="border-t border-cizgi px-4 py-2 text-xs text-amber-700">
            * Bu ihalede fire, kâr marjı veya döviz kuru girilmemiş ürün var; o ürünler toplama katılmadı.
          </p>
        )}
      </section>

      {olumsuz.length > 0 && (
        <section className="kart overflow-hidden">
          <h2 className="border-b border-cizgi px-4 py-3 font-semibold text-brand-dark">Olumsuz sonuçlanan ihaleler</h2>
          <ul className="divide-y divide-cizgi text-sm">
            {olumsuz.map((i) => (
              <li key={i.id} className="flex items-center gap-4 px-4 py-2.5">
                <span className="rakam w-24 text-slate-500">{tarihYaz(i.sonuc_tarihi)}</span>
                <Link href={`/ihaleler/${i.id}`} className="font-medium text-brand-dark hover:text-brand">
                  {i.ad}
                </Link>
                <span className="text-slate-500">{i.musteri}</span>
                <span className="rakam ml-auto text-slate-500">{paraYaz(i.toplam.teklif)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Tutarlar ihaledeki ürünlerin güncel maliyet ve kâr marjına göre hesaplanır. Bu rapor iç kullanım içindir.
      </p>
    </div>
  );
}

function Kutu({ baslik, deger, alt, vurgulu }: { baslik: string; deger: string; alt?: string; vurgulu?: boolean }) {
  return (
    <div className="kart p-4">
      <div className="text-xs text-slate-500">{baslik}</div>
      <div className={`rakam mt-1 text-xl font-semibold ${vurgulu ? "text-brand" : "text-brand-dark"}`}>{deger}</div>
      {alt && <div className="mt-1 text-xs text-slate-500">{alt}</div>}
    </div>
  );
}
