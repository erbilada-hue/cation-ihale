"use client";

import { useState } from "react";
import { fiyatYaz } from "@/lib/format";
import { tedarikciFiyatiOku } from "@/lib/tedarikci";
import type { TedarikciFiyati } from "@/lib/tipler";
import { cevabiOku, fiyatKaydet, type CevapOkumaSonucu } from "@/app/(app)/tedarikciler/actions";
import { FiyatFormu } from "./FiyatFormu";

type Props = {
  talepId: string;
  /** Talepteki kalemler, ekrandaki sırayla */
  kalemler: TedarikciFiyati[];
  kdvOrani: number;
  kalemOnerileri: string[];
  onKaydedildi: (f: TedarikciFiyati) => void;
  onKapat: () => void;
};

type Satir = CevapOkumaSonucu["satirlar"][number];

/**
 * Tedarikçinin WhatsApp cevabı yapıştırılır, yapay zekâ okur, kullanıcı kontrol edip kaydeder.
 * Hiçbir şey kullanıcı "Onayla & Kaydet" demeden kaydedilmez.
 */
export function CevapOku({ talepId, kalemler, kdvOrani, kalemOnerileri, onKaydedildi, onKapat }: Props) {
  const [metin, setMetin] = useState("");
  const [okunuyor, setOkunuyor] = useState(false);
  const [sonuc, setSonuc] = useState<CevapOkumaSonucu | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [duzeltilen, setDuzeltilen] = useState<string | null>(null);
  const [kaydedilen, setKaydedilen] = useState<Set<string>>(new Set());
  const [kaydediliyor, setKaydediliyor] = useState(false);

  async function oku() {
    setHata(null);
    setSonuc(null);
    setKaydedilen(new Set());
    setOkunuyor(true);
    try {
      const s = await cevabiOku(talepId, metin);
      if (s.hata !== undefined) setHata(s.hata);
      else setSonuc(s.veri);
    } catch {
      setHata("Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setOkunuyor(false);
    }
  }

  const kalemi = (s: Satir) => kalemler.find((k) => k.id === s.fiyatId);
  const okumasi = (s: Satir) => (s.fiyatVar ? tedarikciFiyatiOku(s.fiyatMetni, s.kdv_durumu, kdvOrani) : null);
  const kaydedilecekler = (sonuc?.satirlar ?? []).filter((s) => {
    const o = okumasi(s);
    return o != null && o.hata === undefined && !kaydedilen.has(s.fiyatId) && duzeltilen !== s.fiyatId && kalemi(s);
  });

  function kaydedildi(f: TedarikciFiyati) {
    setKaydedilen((k) => new Set(k).add(f.id));
    onKaydedildi(f);
  }

  async function hepsiniKaydet() {
    setHata(null);
    setKaydediliyor(true);
    try {
      for (const s of kaydedilecekler) {
        const k = kalemi(s)!;
        const r = await fiyatKaydet({
          id: k.id,
          tedarikci_id: k.tedarikci_id,
          kalem_adi: k.kalem_adi,
          aciklama: k.aciklama,
          birim: k.birim,
          fiyatMetni: s.fiyatMetni,
          para_birimi: s.para_birimi,
          kdv_durumu: s.kdv_durumu,
          termin: s.termin || k.termin,
          min_siparis: s.min_siparis || k.min_siparis,
          odeme_vadesi: s.odeme_vadesi || k.odeme_vadesi,
          notlar: s.notlar || k.notlar,
        });
        if (r.hata !== undefined) {
          setHata(`${k.kalem_adi}: ${r.hata}`);
          return;
        }
        kaydedildi(r.veri);
      }
    } finally {
      setKaydediliyor(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-brand/30 bg-brand-soft/40 p-4">
      <label className="etiket" htmlFor={`cevap-${talepId}`}>
        Tedarikçinin cevabı
      </label>
      <textarea
        id={`cevap-${talepId}`}
        value={metin}
        onChange={(e) => setMetin(e.target.value)}
        rows={5}
        className="girdi font-sans text-sm"
        placeholder="WhatsApp mesajını buraya yapıştırın"
        autoFocus
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-birincil btn-kucuk" disabled={okunuyor || !metin.trim()} onClick={oku}>
          {okunuyor ? "Okunuyor…" : sonuc ? "Tekrar oku" : "Cevabı oku"}
        </button>
        <button type="button" className="btn-ikincil btn-kucuk" onClick={onKapat} disabled={kaydediliyor}>
          Kapat
        </button>
        {okunuyor && <span className="text-sm text-slate-500">Yapay zekâ mesajı okuyor, birkaç saniye sürebilir.</span>}
      </div>
      {hata && <p className="mt-2 text-sm text-red-600">{hata}</p>}

      {sonuc && (
        <div className="mt-4 space-y-3">
          <ul className="divide-y divide-cizgi rounded-lg border border-cizgi bg-white">
            {sonuc.satirlar.map((s) => {
              const k = kalemi(s);
              if (!k) return null;
              const o = okumasi(s);
              const ad = `${k.kalem_adi}${k.aciklama ? ` (${k.aciklama})` : ""}`;
              if (duzeltilen === s.fiyatId) {
                return (
                  <li key={s.fiyatId} className="p-3">
                    <FiyatFormu
                      ilk={k}
                      tedarikciId={k.tedarikci_id}
                      kalemOnerileri={kalemOnerileri}
                      kdvOrani={kdvOrani}
                      kalemSabit
                      baslik={`${ad}: düzelt`}
                      taslak={s}
                      onKaydedildi={(f) => {
                        kaydedildi(f);
                        setDuzeltilen(null);
                      }}
                      onVazgec={() => setDuzeltilen(null)}
                    />
                  </li>
                );
              }
              return (
                <li key={s.fiyatId} className="space-y-1 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex-1 font-medium text-brand-dark">{ad}</span>
                    {kaydedilen.has(s.fiyatId) ? (
                      <span className="rozet bg-green-50 text-green-700">kaydedildi</span>
                    ) : (
                      <button type="button" className="btn-ikincil btn-kucuk" onClick={() => setDuzeltilen(s.fiyatId)}>
                        {s.fiyatVar ? "Düzelt" : "Elle gir"}
                      </button>
                    )}
                  </div>
                  {!o ? (
                    <p className="text-slate-500">Cevapta bu kalemin fiyatı yok.</p>
                  ) : o.hata !== undefined ? (
                    <p className="text-red-600">
                      Fiyat okunamadı (&quot;{s.fiyatMetni}&quot;). &quot;Düzelt&quot; ile elle girin.
                    </p>
                  ) : (
                    <>
                      <p>
                        <span className="text-slate-500">Eski: </span>
                        <span className="rakam text-slate-500">
                          {fiyatYaz(k.fiyat, k.para_birimi)}
                        </span>
                        <span className="text-slate-500"> → Yeni: </span>
                        <span className="rakam font-semibold text-brand-dark">{fiyatYaz(o.fiyat, s.para_birimi)}</span>
                        <span className="text-slate-500"> / {k.birim}, KDV hariç</span>
                      </p>
                      {o.notlar.map((n) => (
                        <p key={n} className="text-slate-600">
                          {n}
                        </p>
                      ))}
                      {o.kdvBelirsiz && (
                        <p className="rounded bg-amber-50 px-2 py-1 text-amber-800">
                          Tedarikçi KDV durumunu belirtmemiş. Fiyat KDV hariç kabul edildi; teyit etmeniz iyi olur.
                        </p>
                      )}
                      {(s.termin || s.min_siparis || s.odeme_vadesi) && (
                        <p className="text-slate-600">
                          {[
                            s.termin && `Termin: ${s.termin}`,
                            s.min_siparis && `Min. sipariş: ${s.min_siparis}`,
                            s.odeme_vadesi && `Vade: ${s.odeme_vadesi}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      {s.notlar && <p className="text-slate-600">Not: {s.notlar}</p>}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          {sonuc.digerBilgi && (
            <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-600">
              <span className="font-medium">Mesajdaki diğer bilgi:</span> {sonuc.digerBilgi}
            </p>
          )}
          {kaydedilecekler.length > 0 && (
            <button type="button" className="btn-birincil" disabled={kaydediliyor} onClick={hepsiniKaydet}>
              {kaydediliyor ? "Kaydediliyor…" : `Onayla & Kaydet (${kaydedilecekler.length} kalem)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
