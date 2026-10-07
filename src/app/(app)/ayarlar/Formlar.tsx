"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { sayiYaz } from "@/lib/format";
import type { FirmaAyarlari, SegmentSablonu } from "@/lib/tipler";
import { firmaKaydet, segmentleriKaydet, type FormDurumu } from "./actions";

const BOS: FormDurumu = { hata: null, basari: null };

function KaydetButonu() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-birincil" disabled={pending}>
      {pending ? "Kaydediliyor…" : "Kaydet"}
    </button>
  );
}

function Durum({ durum }: { durum: FormDurumu }) {
  if (durum.hata) return <span className="text-sm text-red-600">{durum.hata}</span>;
  if (durum.basari) return <span className="text-sm text-green-700">{durum.basari}</span>;
  return null;
}

function Alan({ ad, etiket, deger, genis }: { ad: string; etiket: string; deger: string; genis?: boolean }) {
  return (
    <div className={genis ? "col-span-2" : ""}>
      <label className="etiket" htmlFor={ad}>{etiket}</label>
      <input id={ad} name={ad} defaultValue={deger} className="girdi" />
    </div>
  );
}

export function FirmaFormu({ firma }: { firma: FirmaAyarlari }) {
  const [durum, eylem] = useFormState(firmaKaydet, BOS);
  const [logo, setLogo] = useState(firma.logo_data_url ?? "");
  const [logoHatasi, setLogoHatasi] = useState<string | null>(null);

  function logoSecildi(dosya: File | undefined) {
    setLogoHatasi(null);
    if (!dosya) return;
    if (!["image/png", "image/jpeg"].includes(dosya.type)) return setLogoHatasi("Logo PNG veya JPG olmalı.");
    if (dosya.size > 300_000) return setLogoHatasi("Logo 300 KB'tan küçük olmalı.");
    const okuyucu = new FileReader();
    okuyucu.onload = () => setLogo(String(okuyucu.result));
    okuyucu.readAsDataURL(dosya);
  }

  return (
    <form action={eylem} className="kart grid grid-cols-2 gap-4 p-6">
      <Alan ad="firma_adi" etiket="Firma adı" deger={firma.firma_adi} genis />
      <Alan ad="adres" etiket="Adres" deger={firma.adres} genis />
      <Alan ad="telefon" etiket="Telefon" deger={firma.telefon} />
      <Alan ad="eposta" etiket="E-posta" deger={firma.eposta} />
      <Alan ad="web" etiket="Web sitesi" deger={firma.web} />
      <div />
      <Alan ad="vergi_dairesi" etiket="Vergi dairesi" deger={firma.vergi_dairesi} />
      <Alan ad="vergi_no" etiket="Vergi no" deger={firma.vergi_no} />
      <Alan ad="banka_adi" etiket="Banka" deger={firma.banka_adi} />
      <Alan ad="iban" etiket="IBAN (TL)" deger={firma.iban} />
      <Alan ad="iban_usd" etiket="IBAN (USD, dolar teklifleri için)" deger={firma.iban_usd ?? ""} />
      <Alan ad="iban_eur" etiket="IBAN (EUR, euro teklifleri için)" deger={firma.iban_eur ?? ""} />
      <Alan ad="swift" etiket="SWIFT / BIC kodu" deger={firma.swift ?? ""} />
      <div />
      <div>
        <label className="etiket" htmlFor="teklif_gecerlilik_gun">Teklif geçerlilik süresi (gün)</label>
        <input id="teklif_gecerlilik_gun" name="teklif_gecerlilik_gun" inputMode="numeric" defaultValue={firma.teklif_gecerlilik_gun} className="girdi-sayi" />
      </div>
      <div>
        <label className="etiket" htmlFor="varsayilan_kdv_orani">Yeni ürünlerde KDV oranı (%)</label>
        <input id="varsayilan_kdv_orani" name="varsayilan_kdv_orani" inputMode="decimal" defaultValue={sayiYaz(firma.varsayilan_kdv_orani)} className="girdi-sayi" />
      </div>
      <div className="col-span-2">
        <div className="etiket">Logo</div>
        <input type="hidden" name="logo_data_url" value={logo} />
        <div className="flex items-center gap-4">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="Firma logosu" className="h-14 max-w-48 rounded border border-cizgi bg-white object-contain p-1" />
          ) : (
            <span className="text-sm text-slate-500">Logo yüklenmedi</span>
          )}
          <label className="btn-ikincil btn-kucuk cursor-pointer">
            Logo seç
            <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => logoSecildi(e.target.files?.[0])} />
          </label>
          {logo && (
            <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => setLogo("")}>
              Logoyu kaldır
            </button>
          )}
        </div>
        {logoHatasi && <p className="mt-1 text-sm text-red-600">{logoHatasi}</p>}
      </div>
      <div className="col-span-2 flex items-center gap-4">
        <KaydetButonu />
        <Durum durum={durum} />
      </div>
    </form>
  );
}

export function SegmentFormu({ segmentler }: { segmentler: SegmentSablonu[] }) {
  const [durum, eylem] = useFormState(segmentleriKaydet, BOS);
  const alanlar = [
    { ad: "kumas", etiket: "Kumaş" },
    { ad: "gramaj", etiket: "Gramaj" },
    { ad: "boya", etiket: "Boya" },
    { ad: "baski", etiket: "Baskı" },
  ] as const;

  return (
    <form action={eylem} className="kart p-6">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-slate-500">
          <tr>
            <th className="pb-2 font-medium">Segment</th>
            {alanlar.map((a) => (
              <th key={a.ad} className="pb-2 pr-2 font-medium">{a.etiket}</th>
            ))}
            <th className="w-24 pb-2 font-medium">Fire (%)</th>
          </tr>
        </thead>
        <tbody>
          {segmentler.map((s) => (
            <tr key={s.segment} className="border-t border-cizgi">
              <td className="py-2 pr-2 font-medium text-brand-dark">{s.ad}</td>
              {alanlar.map((a) => (
                <td key={a.ad} className="py-2 pr-2">
                  <input aria-label={`${s.ad} ${a.etiket}`} name={`${s.segment}.${a.ad}`} defaultValue={s[a.ad]} className="girdi py-1.5" />
                </td>
              ))}
              <td className="py-2">
                <input aria-label={`${s.ad} fire`} name={`${s.segment}.fire_orani`} inputMode="decimal" defaultValue={sayiYaz(s.fire_orani)} className="girdi-sayi py-1.5" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex items-center gap-4">
        <KaydetButonu />
        <Durum durum={durum} />
      </div>
    </form>
  );
}
