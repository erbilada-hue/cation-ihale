"use client";

import { useId, useState } from "react";
import { fiyatYaz } from "@/lib/format";
import { BIRIMLER, PARA_BIRIMLERI } from "@/lib/sabitler";
import { KDV_DURUMLARI, tedarikciFiyatiOku, type KdvDurumu } from "@/lib/tedarikci";
import type { Tedarikci, TedarikciFiyati } from "@/lib/tipler";
import { fiyatKaydet, type FiyatGirdisi } from "@/app/(app)/tedarikciler/actions";

type Props = {
  /** Düzenlenecek fiyat; boşsa yeni fiyat */
  ilk?: TedarikciFiyati;
  /** Tedarikçi sabitse verilir; yoksa listeden seçilir */
  tedarikciId?: string;
  tedarikciler?: Pick<Tedarikci, "id" | "ad">[];
  /** Kalem kütüphanesindeki adlar (öneri listesi) */
  kalemOnerileri: string[];
  kdvOrani: number;
  /** Cevap girerken kalem adı ve birimi değiştirilmez */
  kalemSabit?: boolean;
  baslik?: string;
  /** Yapay zekânın okuduğu cevap: alanlar bununla dolu açılır */
  taslak?: Partial<Pick<FiyatGirdisi, "fiyatMetni" | "para_birimi" | "kdv_durumu" | "termin" | "min_siparis" | "odeme_vadesi" | "notlar">>;
  onKaydedildi: (f: TedarikciFiyati) => void;
  onVazgec: () => void;
};

/**
 * Tedarikçi fiyatı girişi. Kaydetmeden önce kaydedilecek KDV hariç fiyat gösterilir:
 * KDV dahil gelen fiyat ayrılır, aralık gelirse ortalama alınır, KDV belirsizse sarı uyarı çıkar.
 */
export function FiyatFormu({
  ilk,
  tedarikciId,
  tedarikciler,
  kalemOnerileri,
  kdvOrani,
  kalemSabit,
  baslik,
  taslak,
  onKaydedildi,
  onVazgec,
}: Props) {
  const kimlik = useId();
  const [tedarikci, setTedarikci] = useState(ilk?.tedarikci_id ?? tedarikciId ?? "");
  const [kalem, setKalem] = useState(ilk?.kalem_adi ?? "");
  const [aciklama, setAciklama] = useState(ilk?.aciklama ?? "");
  const [birim, setBirim] = useState(ilk?.birim ?? "m");
  // Cevap girerken eski fiyat yazılı gelmez; yeni fiyat yazılır
  const [fiyatMetni, setFiyatMetni] = useState(taslak?.fiyatMetni ?? "");
  const [paraBirimi, setParaBirimi] = useState<string>(taslak?.para_birimi ?? ilk?.para_birimi ?? "TRY");
  const [kdvDurumu, setKdvDurumu] = useState<KdvDurumu>((taslak?.kdv_durumu as KdvDurumu) ?? "haric");
  const [termin, setTermin] = useState(taslak?.termin || ilk?.termin || "");
  const [minSiparis, setMinSiparis] = useState(taslak?.min_siparis || ilk?.min_siparis || "");
  const [vade, setVade] = useState(taslak?.odeme_vadesi || ilk?.odeme_vadesi || "");
  const [notlar, setNotlar] = useState(taslak?.notlar ?? ilk?.notlar ?? "");
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const okuma = fiyatMetni.trim() ? tedarikciFiyatiOku(fiyatMetni, kdvDurumu, kdvOrani) : null;

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setKaydediliyor(true);
    try {
      const s = await fiyatKaydet({
        id: ilk?.id,
        tedarikci_id: tedarikci,
        kalem_adi: kalem,
        aciklama,
        birim,
        fiyatMetni,
        para_birimi: paraBirimi,
        kdv_durumu: kdvDurumu,
        termin,
        min_siparis: minSiparis,
        odeme_vadesi: vade,
        notlar,
      });
      if (s.hata !== undefined) return setHata(s.hata);
      onKaydedildi(s.veri);
    } finally {
      setKaydediliyor(false);
    }
  }

  const alan = (ad: string) => `${kimlik}-${ad}`;

  return (
    <form onSubmit={kaydet} className="rounded-lg border border-brand/30 bg-brand-soft/40 p-4">
      {baslik && <div className="mb-3 text-sm font-semibold text-brand-dark">{baslik}</div>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tedarikciler && !tedarikciId && (
          <div className="col-span-2">
            <label className="etiket" htmlFor={alan("tedarikci")}>Tedarikçi</label>
            <select id={alan("tedarikci")} value={tedarikci} onChange={(e) => setTedarikci(e.target.value)} className="girdi">
              <option value="">Seçin…</option>
              {tedarikciler.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.ad}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="col-span-2">
          <label className="etiket" htmlFor={alan("kalem")}>Kalem</label>
          <input
            id={alan("kalem")}
            list={alan("oneriler")}
            value={kalem}
            disabled={kalemSabit}
            onChange={(e) => setKalem(e.target.value)}
            className="girdi"
            placeholder="Örn. Ana kumaş"
          />
          <datalist id={alan("oneriler")}>
            {kalemOnerileri.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </div>
        <div className="col-span-2">
          <label className="etiket" htmlFor={alan("aciklama")}>Açıklama</label>
          <input
            id={alan("aciklama")}
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            className="girdi"
            placeholder="Örn. 180 gr ring 30/1 süprem, lacivert"
          />
        </div>
        <div>
          <label className="etiket" htmlFor={alan("birim")}>Birim</label>
          <select id={alan("birim")} value={birim} disabled={kalemSabit} onChange={(e) => setBirim(e.target.value)} className="girdi">
            {Array.from(new Set([...BIRIMLER, birim])).map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="etiket" htmlFor={alan("fiyat")}>
            Birim fiyat {ilk && <span className="font-normal text-slate-400">(eski: {fiyatYaz(ilk.fiyat, ilk.para_birimi)})</span>}
          </label>
          <div className="flex gap-1">
            <input
              id={alan("fiyat")}
              value={fiyatMetni}
              onChange={(e) => setFiyatMetni(e.target.value)}
              className="girdi-sayi min-w-0 flex-1"
              placeholder="165 veya 160-165"
              autoFocus={kalemSabit}
            />
            <select
              aria-label="Para birimi"
              value={paraBirimi}
              onChange={(e) => setParaBirimi(e.target.value)}
              className="girdi w-14 shrink-0 px-1.5"
            >
              {PARA_BIRIMLERI.map((p) => (
                <option key={p.kod} value={p.kod}>
                  {p.sembol}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="etiket" htmlFor={alan("kdv")}>Gelen fiyat</label>
          <select id={alan("kdv")} value={kdvDurumu} onChange={(e) => setKdvDurumu(e.target.value as KdvDurumu)} className="girdi">
            {KDV_DURUMLARI.map((k) => (
              <option key={k.kod} value={k.kod}>
                {k.ad}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="etiket" htmlFor={alan("termin")}>Termin</label>
          <input id={alan("termin")} value={termin} onChange={(e) => setTermin(e.target.value)} className="girdi" placeholder="Örn. 15 gün" />
        </div>
        <div>
          <label className="etiket" htmlFor={alan("min")}>Minimum sipariş</label>
          <input id={alan("min")} value={minSiparis} onChange={(e) => setMinSiparis(e.target.value)} className="girdi" placeholder="Örn. 500 m" />
        </div>
        <div>
          <label className="etiket" htmlFor={alan("vade")}>Ödeme vadesi</label>
          <input id={alan("vade")} value={vade} onChange={(e) => setVade(e.target.value)} className="girdi" placeholder="Örn. 60 gün" />
        </div>
        <div>
          <label className="etiket" htmlFor={alan("not")}>Not</label>
          <input id={alan("not")} value={notlar} onChange={(e) => setNotlar(e.target.value)} className="girdi" />
        </div>
      </div>

      {okuma && (
        <div className="mt-3 space-y-1 text-sm">
          {okuma.hata !== undefined ? (
            <p className="text-red-600">{okuma.hata}</p>
          ) : (
            <>
              <p className="text-brand-dark">
                Kaydedilecek fiyat: <span className="rakam font-semibold">{fiyatYaz(okuma.fiyat, paraBirimi)}</span>{" "}
                <span className="text-slate-500">/ {birim}, KDV hariç</span>
              </p>
              {okuma.notlar.map((n) => (
                <p key={n} className="text-slate-600">
                  {n}
                </p>
              ))}
              {okuma.kdvBelirsiz && (
                <p className="rounded bg-amber-50 px-2 py-1 text-amber-800">
                  Tedarikçi KDV durumunu belirtmemiş. Fiyat KDV hariç kabul edildi; teyit etmeniz iyi olur.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {hata && <p className="mt-2 text-sm text-red-600">{hata}</p>}
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="btn-birincil"
          disabled={kaydediliyor || !tedarikci || !kalem.trim() || !okuma || okuma.hata !== undefined}
        >
          {kaydediliyor ? "Kaydediliyor…" : "Onayla & Kaydet"}
        </button>
        <button type="button" className="btn-ikincil" onClick={onVazgec}>
          Vazgeç
        </button>
      </div>
    </form>
  );
}
