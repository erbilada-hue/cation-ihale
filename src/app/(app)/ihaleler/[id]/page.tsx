import Link from "next/link";
import { notFound } from "next/navigation";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import {
  dosyalariGetir,
  fiyatListesiniGetir,
  ihaleGetir,
  ihaleKurlari,
  kalemSablonlariniGetir,
  segmentleriGetir,
  teklifleriGetir,
  urunleriGetir,
} from "@/lib/veri";
import { asamaAdi } from "@/lib/sabitler";
import { tarihYaz } from "@/lib/format";
import { MaliyetEditoru } from "./MaliyetEditoru";
import { IhaleSilButonu } from "./IhaleSilButonu";

export const dynamic = "force-dynamic";
// Şartname analizi (yapay zekâ) uzun şartnamelerde bir-iki dakika sürebilir
export const maxDuration = 300;

export default async function IhaleDetaySayfasi({ params }: { params: { id: string } }) {
  const supabase = sunucuIstemcisi();
  const ihale = await ihaleGetir(supabase, params.id);
  if (!ihale) notFound();

  const [urunler, sablonlar, segmentler, teklifler, dosyalar, fiyatListesi] = await Promise.all([
    urunleriGetir(supabase, ihale.id),
    kalemSablonlariniGetir(supabase),
    segmentleriGetir(supabase),
    teklifleriGetir(supabase, ihale.id),
    dosyalariGetir(supabase, ihale.id),
    fiyatListesiniGetir(supabase),
  ]);
  const segment = segmentler.find((s) => s.segment === ihale.segment);

  const kaynakMetni =
    ihale.kaynak === "sartname"
      ? "Şartnameye göre oluşturuldu"
      : `${segment?.ad ?? ""} segment şablonuna göre oluşturuldu`;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-1 text-sm">
        <Link href="/ihaleler" className="text-slate-500 hover:text-brand">
          ← İhaleler
        </Link>
      </div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark">{ihale.ad}</h1>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
            <span>
              {ihale.musteri_id ? (
                <Link href={`/musteriler/${ihale.musteri_id}`} className="hover:text-brand">
                  {ihale.musteri}
                </Link>
              ) : (
                ihale.musteri || "Müşteri girilmedi"
              )}
              {ihale.marka && <> · {ihale.marka}</>}
            </span>
            <span>
              Son teklif: <span className="rakam">{tarihYaz(ihale.son_teklif_tarihi)}</span>
            </span>
            {ihale.teslim_yeri && <span>Teslim: {ihale.teslim_yeri}</span>}
            {ihale.termin && <span>Termin: {ihale.termin}</span>}
            <span className="rozet bg-brand-soft text-brand">{asamaAdi(ihale.asama)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/ihaleler/${ihale.id}/duzenle`} className="btn-ikincil">
            Bilgileri düzenle
          </Link>
          <IhaleSilButonu id={ihale.id} ad={ihale.ad} />
        </div>
      </div>

      <div
        className={`mb-2 rounded-lg border px-4 py-2.5 text-sm ${
          ihale.kaynak === "sartname"
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-blue-200 bg-blue-50 text-blue-800"
        }`}
      >
        {kaynakMetni}
        {ihale.kaynak_dosya && <> · {ihale.kaynak_dosya}</>}
        {segment && (
          <span className="ml-2 text-xs opacity-80">
            ({segment.kumas} · {segment.gramaj} · {segment.boya} · {segment.baski})
          </span>
        )}
      </div>

      <MaliyetEditoru
        ihaleId={ihale.id}
        ilkKurlar={ihaleKurlari(ihale)}
        ilkUrunler={urunler}
        sablonlar={sablonlar}
        teklifler={teklifler}
        dosyalar={dosyalar}
        fiyatListesi={fiyatListesi}
        segmentler={segmentler}
        ihaleSegmenti={ihale.kaynak === "segment" ? ihale.segment : null}
      />
    </div>
  );
}
