import Link from "next/link";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { bekleyenTalepleriGetir, ihaleKurlari, urunuDuzelt } from "@/lib/veri";
import { gunFarki } from "@/lib/tedarikci";
import { kalanGun, paraYaz, tarihMetni, tarihYaz } from "@/lib/format";
import { asamaAdi } from "@/lib/sabitler";
import { donemAraligi, ihaleToplami } from "@/lib/rapor";
import { GunRozeti } from "@/components/GunRozeti";
import type { Gorev, Ihale, UrunKalemli } from "@/lib/tipler";
import { Gorevler, type Hatirlatma } from "./Gorevler";

export const dynamic = "force-dynamic";

type IhaleSatiri = Pick<Ihale, "id" | "ad" | "musteri" | "marka" | "son_teklif_tarihi" | "asama" | "sonuc" | "sonuc_tarihi">;

/** Teklif aşamasını geçmemiş ve sonucu işaretlenmemiş ihaleler */
const aktifMi = (i: IhaleSatiri) => i.sonuc == null && ["ihale", "maliyet", "teklif"].includes(i.asama);

export default async function GenelBakis() {
  const supabase = sunucuIstemcisi();
  const bugun = tarihMetni(new Date());
  const buAy = donemAraligi("bu-ay");

  const [ihaleSorgu, teklifSorgu, talepler, tedarikciSorgu, gorevSorgu, kazanilanSorgu] = await Promise.all([
    supabase
      .from("ihaleler")
      .select("id, ad, musteri, marka, son_teklif_tarihi, asama, sonuc, sonuc_tarihi")
      .order("created_at", { ascending: false }),
    supabase.from("teklifler").select("ihale_id"),
    bekleyenTalepleriGetir(supabase),
    supabase.from("tedarikciler").select("id, ad"),
    supabase.from("gorevler").select("*").order("created_at", { ascending: false }).limit(200),
    supabase
      .from("ihaleler")
      .select("usd_kuru, eur_kuru, teklif_para_birimi, ihale_urunleri(*, urun_kalemleri(*))")
      .eq("sonuc", "olumlu")
      .gte("sonuc_tarihi", buAy.bas)
      .lte("sonuc_tarihi", buAy.bit),
  ]);

  const ihaleler = (ihaleSorgu.data ?? []) as IhaleSatiri[];
  const teklifVerilen = new Set((teklifSorgu.data ?? []).map((t) => t.ihale_id as string));
  const tedarikciAdi = new Map((tedarikciSorgu.data ?? []).map((t) => [t.id as string, t.ad as string]));
  const ihaleAdi = new Map(ihaleler.map((i) => [i.id, i.ad]));
  const gorevler = ((gorevSorgu.data ?? []) as Gorev[]).map((g) => ({ ...g, ihale_adi: g.ihale_id ? ihaleAdi.get(g.ihale_id) ?? null : null }));

  const aktif = ihaleler.filter(aktifMi);
  const buHafta = aktif.filter((i) => i.son_teklif_tarihi && kalanGun(i.son_teklif_tarihi, bugun) >= 0 && kalanGun(i.son_teklif_tarihi, bugun) <= 7);
  const onayBekleyen = aktif.filter((i) => teklifVerilen.has(i.id));
  const enUzunBekleme = talepler.reduce((m, t) => Math.max(m, gunFarki(t.gonderim_zamani)), 0);
  const kazanilan = (kazanilanSorgu.data ?? []) as { usd_kuru: number | null; eur_kuru: number | null; teklif_para_birimi: "TRY" | "USD" | "EUR" | null; ihale_urunleri: UrunKalemli[] }[];
  const kazanilanTutar = kazanilan.reduce(
    (t, i) =>
      t +
      ihaleToplami(
        i.ihale_urunleri.map(urunuDuzelt),
        ihaleKurlari({ usd_kuru: i.usd_kuru == null ? null : Number(i.usd_kuru), eur_kuru: i.eur_kuru == null ? null : Number(i.eur_kuru) }),
        i.teklif_para_birimi ?? "TRY",
      ).teklif,
    0,
  );

  // Sistemin kendiliğinden hatırlattıkları: yaklaşan teklif, işaretlenmemiş sonuç, cevapsız fiyat talebi
  const hatirlatmalar: Hatirlatma[] = [];
  for (const i of aktif) {
    if (!i.son_teklif_tarihi) continue;
    const gun = kalanGun(i.son_teklif_tarihi, bugun);
    if (!teklifVerilen.has(i.id) && gun <= 3) {
      hatirlatmalar.push({ anahtar: `teklif-${i.id}`, metin: `${i.ad}: müşteri teklifi henüz hazırlanmadı`, href: `/ihaleler/${i.id}`, gun });
    } else if (teklifVerilen.has(i.id) && gun < 0) {
      hatirlatmalar.push({ anahtar: `sonuc-${i.id}`, metin: `${i.ad}: ihale sonucunu işaretleyin`, href: `/ihaleler/${i.id}`, gun: null });
    }
  }
  for (const t of talepler) {
    const gun = gunFarki(t.gonderim_zamani);
    if (gun >= 3) {
      hatirlatmalar.push({
        anahtar: `talep-${t.id}`,
        metin: `${tedarikciAdi.get(t.tedarikci_id) ?? "Tedarikçi"}: fiyat cevabı ${gun} gündür bekleniyor`,
        href: "/fiyat-listesi#cevaplar",
        gun: null,
      });
    }
  }
  hatirlatmalar.sort((a, b) => (a.gun ?? 99) - (b.gun ?? 99));

  const yaklasan = aktif
    .filter((i) => i.son_teklif_tarihi)
    .sort((a, b) => a.son_teklif_tarihi!.localeCompare(b.son_teklif_tarihi!))
    .slice(0, 10);

  const beklemeRengi = enUzunBekleme >= 7 ? "text-red-700" : enUzunBekleme >= 3 ? "text-orange-600" : "text-slate-500";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-brand-dark">Genel Bakış</h1>
        <p className="text-sm text-slate-500">{tarihYaz(bugun)} · ihaleler ve yapılacak işler</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kart href="/ihaleler?durum=aktif" baslik="Aktif İhaleler" deger={aktif.length}>
          {buHafta.length > 0 ? `${buHafta.length} tanesinin son teklif tarihi bu hafta` : "Bu hafta son teklif tarihi yok"}
        </Kart>
        <Kart href="/fiyat-listesi#cevaplar" baslik="Tedarikçiden Bekleyen Fiyat" deger={talepler.length}>
          {talepler.length > 0 ? <span className={beklemeRengi}>En uzun bekleyen {enUzunBekleme} gün</span> : "Bekleyen cevap yok"}
        </Kart>
        <Kart href="/ihaleler?durum=bekleyen" baslik="Bekleyen Müşteri Onayı" deger={onayBekleyen.length}>
          Teklif verildi, sonuç bekleniyor
        </Kart>
        <Kart href="/raporlar" baslik="Bu Ay Kazanılan" deger={kazanilan.length}>
          {kazanilan.length > 0 ? `${paraYaz(kazanilanTutar)} (KDV hariç)` : "Rapor için tıklayın"}
        </Kart>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Gorevler gorevler={gorevler} ihaleler={aktif.map((i) => ({ id: i.id, ad: i.ad }))} hatirlatmalar={hatirlatmalar} bugun={bugun} />

        <section className="kart self-start">
          <h2 className="border-b border-cizgi px-5 py-3 font-semibold text-brand-dark">Yaklaşan teklif tarihleri</h2>
          {yaklasan.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-slate-500">Son teklif tarihi girilmiş aktif ihale yok.</p>
          ) : (
            <ul className="divide-y divide-cizgi text-sm">
              {yaklasan.map((i) => (
                <li key={i.id}>
                  <Link href={`/ihaleler/${i.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-zemin/60">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-brand-dark">{i.ad}</div>
                      <div className="truncate text-xs text-slate-500">
                        {i.musteri || "Müşteri girilmedi"}
                        {i.marka && ` · ${i.marka}`} · {asamaAdi(i.asama)}
                        {teklifVerilen.has(i.id) && " · teklif verildi"}
                      </div>
                    </div>
                    <span className="rakam text-xs text-slate-500">{tarihYaz(i.son_teklif_tarihi)}</span>
                    <GunRozeti gun={kalanGun(i.son_teklif_tarihi!, bugun)} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Kart({ href, baslik, deger, children }: { href: string; baslik: string; deger: number; children: React.ReactNode }) {
  return (
    <Link href={href} className="kart block p-5 transition hover:border-brand hover:shadow-sm">
      <div className="text-sm text-slate-500">{baslik}</div>
      <div className="rakam mt-1 text-3xl font-semibold text-brand-dark">{deger}</div>
      <div className="mt-2 text-xs text-slate-500">{children}</div>
    </Link>
  );
}
