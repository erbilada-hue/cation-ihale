import { sunucuIstemcisi } from "@/lib/supabase/server";
import { firmaAyarlariGetir, segmentleriGetir } from "@/lib/veri";
import { yoneticiIstemcisi } from "@/lib/supabase/yonetici";
import { FirmaFormu, SegmentFormu } from "./Formlar";
import { KullanicilarBolumu, type KullaniciSatiri } from "./Kullanicilar";

/** Yönetici anahtarı yoksa null döner; sayfa anahtarın nasıl ekleneceğini gösterir */
async function kullanicilariGetir(): Promise<KullaniciSatiri[] | null> {
  const yonetici = yoneticiIstemcisi();
  if (!yonetici) return null;
  const { data, error } = await yonetici.auth.admin.listUsers({ perPage: 200 });
  if (error) return null;
  return data.users
    .map((u) => ({
      id: u.id,
      ad: String(u.user_metadata?.ad ?? ""),
      eposta: u.email ?? "",
      sonGiris: u.last_sign_in_at ?? null,
      eklenme: u.created_at,
    }))
    .sort((a, b) => a.eklenme.localeCompare(b.eklenme));
}

export const dynamic = "force-dynamic";

export default async function AyarlarSayfasi() {
  const supabase = sunucuIstemcisi();
  const [firma, segmentler, kullanicilar, { data: oturum }] = await Promise.all([
    firmaAyarlariGetir(supabase),
    segmentleriGetir(supabase),
    kullanicilariGetir(),
    supabase.auth.getUser(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-2xl font-semibold text-brand-dark">Ayarlar</h1>
      <section>
        <h2 className="mb-1 text-lg font-semibold text-brand-dark">Firma bilgileri</h2>
        <p className="mb-3 text-sm text-slate-500">Müşteri teklifi PDF&apos;inde görünür.</p>
        {firma ? <FirmaFormu firma={firma} /> : <p className="text-sm text-red-600">Firma ayarları bulunamadı. Veritabanı kurulumunu kontrol edin.</p>}
      </section>
      <section>
        <h2 className="mb-1 text-lg font-semibold text-brand-dark">Kullanıcılar</h2>
        <p className="mb-3 text-sm text-slate-500">Sisteme girebilen kişiler. Siteye kimse kendi kendine üye olamaz; kişileri buradan siz eklersiniz.</p>
        <KullanicilarBolumu kullanicilar={kullanicilar} benimId={oturum.user?.id ?? ""} />
      </section>
      {/* Seyrek değişir; kapalı durur, gerektiğinde açılır */}
      <details className="group border-t border-cizgi pt-6">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand">
          <span className="transition group-open:rotate-90">▸</span>
          Segment şablonları (Premium / Standart / Ekonomik)
        </summary>
        <p className="mb-3 mt-3 text-sm text-slate-500">
          Teknik şartnamesi olmayan işlerde kullanıcının seçtiği segmentin değerleri kullanılır.
        </p>
        <SegmentFormu segmentler={segmentler} />
      </details>
    </div>
  );
}
