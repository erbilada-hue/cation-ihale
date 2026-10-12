"use client";

import { useEffect, useRef, useState } from "react";
import { BIRIMLER, URUN_GRUPLARI } from "@/lib/sabitler";
import { sayiOku, sayiYaz, yuzdeYaz } from "@/lib/format";
import { urunKalemleri, type AnalizKalemi, type AnalizSonucu } from "@/lib/sartnameAnalizi";
import type { IhaleDosyasi, KalemSablonu, SegmentSablonu, UrunKalemli } from "@/lib/tipler";
import { analizUygula, sartnameAnalizEt } from "@/app/(app)/ihaleler/actions";

type Props = {
  ihaleId: string;
  dosya: IhaleDosyasi;
  sablonlar: KalemSablonu[];
  segmentler: SegmentSablonu[];
  /** Kullanıcının ihaleyi açarken seçtiği segment (varsa) */
  oncekiSegment: string | null;
  mevcutUrunSayisi: number;
  onUygulandi: (urunler: UrunKalemli[]) => void;
  onKapat: () => void;
};

type Satir = {
  secili: boolean;
  ad: string;
  urun_grubu: string;
  adet: string;
  aciklama: string;
  kalemler: KalemSatiri[];
};

/** Zorunlu kalem her zaman eklenir; opsiyonel ve yeni kalemlerin işaretini kullanıcı kaldırabilir */
type KalemSatiri = AnalizKalemi & { secili: boolean; kullanimMetni: string };

const kalemSatirlari = (k: AnalizKalemi[]): KalemSatiri[] =>
  k.map((x) => ({ ...x, secili: true, kullanimMetni: sayiYaz(x.kullanim) }));

const kullanimGecersiz = (k: KalemSatiri) => {
  const n = sayiOku(k.kullanimMetni);
  return n != null && (Number.isNaN(n) || n < 0);
};

/**
 * Şartname / brief dosyasını yapay zekâyla okur, özeti gösterir; kullanıcı onaylayınca ürünler ve kalemler oluşur.
 * Brief ise segment kullanıcıya seçtirilir; sistem segment atamaz.
 */
export function SartnameAnalizi({ ihaleId, dosya, sablonlar, segmentler, oncekiSegment, mevcutUrunSayisi, onUygulandi, onKapat }: Props) {
  const [okunuyor, setOkunuyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [analiz, setAnaliz] = useState<AnalizSonucu | null>(null);
  const [tur, setTur] = useState<"sartname" | "brief">("sartname");
  const [segment, setSegment] = useState<string>(oncekiSegment ?? "");
  const [satirlar, setSatirlar] = useState<Satir[]>([]);
  const [uygulaniyor, setUygulaniyor] = useState(false);
  const basladi = useRef(false);

  useEffect(() => {
    if (basladi.current) return;
    basladi.current = true;
    (async () => {
      try {
        const s = await sartnameAnalizEt(dosya.id);
        if (s.hata !== undefined) return setHata(s.hata);
        setAnaliz(s.veri);
        setTur(s.veri.tur);
        setSatirlar(
          s.veri.urunler.map((u) => ({
            secili: true,
            ad: u.ad,
            urun_grubu: u.urun_grubu,
            adet: u.adet != null ? String(u.adet) : "",
            aciklama: u.aciklama,
            kalemler: kalemSatirlari(u.kalemler),
          })),
        );
      } catch {
        setHata("Analiz yarıda kesildi: çok uzun sürdü ya da bağlantı koptu. Tekrar deneyin; yine olursa bana haber verin.");
      } finally {
        setOkunuyor(false);
      }
    })();
  }, [dosya.id]);

  const degistir = (i: number, d: Partial<Satir>) => setSatirlar((l) => l.map((s, j) => (j === i ? { ...s, ...d } : s)));
  const seciliSatirlar = satirlar.filter((s) => s.secili);
  const adetGecersiz = (s: Satir) => !/^\d+$/.test(s.adet.trim()) || Number(s.adet) <= 0;
  const eksik =
    seciliSatirlar.length === 0
      ? "En az bir ürün seçin."
      : seciliSatirlar.some((s) => !s.ad.trim())
        ? "Ürün adı boş olamaz."
        : seciliSatirlar.some(adetGecersiz)
          ? "Seçili her ürün için adet girin."
          : seciliSatirlar.some((s) => s.kalemler.some((k) => k.secili && kullanimGecersiz(k)))
            ? "Kullanım miktarlarından biri sayı değil."
          : tur === "brief" && !segment
            ? "Kalite segmentini seçin."
            : null;

  async function uygula() {
    if (!analiz || eksik) return;
    setHata(null);
    setUygulaniyor(true);
    try {
      const s = await analizUygula(ihaleId, {
        kaynak: tur === "sartname" ? "sartname" : "segment",
        segment: tur === "brief" ? segment : null,
        kaynakDosya: dosya.dosya_adi,
        ihale: analiz.ihale,
        urunler: seciliSatirlar.map((r) => ({
          urun_grubu: r.urun_grubu,
          ad: r.ad.trim(),
          adet: Number(r.adet),
          aciklama: r.aciklama.trim(),
          kalemler: r.kalemler
            .filter((k) => k.secili)
            .map((k) => ({ sablonId: k.sablonId, ad: k.ad, birim: k.birim, kullanim: sayiOku(k.kullanimMetni) })),
        })),
      });
      if (s.hata !== undefined) return setHata(s.hata);
      onUygulandi(s.veri);
    } catch {
      setHata("Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setUygulaniyor(false);
    }
  }

  const ihaleBilgileri = analiz
    ? [
        ["Müşteri", analiz.ihale.musteri],
        ["Teslim yeri", analiz.ihale.teslim_yeri],
        ["Termin", analiz.ihale.termin],
        ["Son teklif tarihi", analiz.ihale.son_teklif_tarihi.split("-").reverse().join(".")],
      ].filter(([, d]) => d)
    : [];

  return (
    <div className="mt-4 rounded-lg border border-brand/30 bg-brand-soft/30 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-brand-dark">Yapay zekâ analizi · {dosya.dosya_adi}</div>
        <button type="button" className="btn-ikincil btn-kucuk" onClick={onKapat} disabled={uygulaniyor}>
          Kapat
        </button>
      </div>

      {okunuyor && <p className="text-sm text-slate-600">Dosya okunuyor. Uzun şartnamelerde bir-iki dakika sürebilir; sayfayı kapatmayın…</p>}
      {hata && <p className="text-sm text-red-600">{hata}</p>}

      {analiz && (
        <div className="space-y-4 text-sm">
          {tur === "sartname" ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-green-800">
              <span className="font-medium">Teknik şartname tespit edildi.</span> {analiz.tur === "sartname" && analiz.gerekce}
            </div>
          ) : (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-blue-800">
              <span className="font-medium">Teknik şartname bulunamadı — kalite segmenti seçin.</span>{" "}
              {analiz.tur === "brief" && analiz.gerekce}
            </div>
          )}
          <button
            type="button"
            className="text-xs text-slate-500 underline hover:text-brand"
            onClick={() => setTur(tur === "sartname" ? "brief" : "sartname")}
          >
            {tur === "sartname" ? "Bu bir teknik şartname değil, segment seçeceğim" : "Bu bir teknik şartname, segment sorma"}
          </button>

          {tur === "brief" && (
            <div className="grid gap-3 md:grid-cols-3">
              {segmentler.map((s) => (
                <label
                  key={s.segment}
                  className={`cursor-pointer rounded-kart border bg-white p-4 transition ${
                    segment === s.segment ? "border-brand ring-2 ring-brand/20" : "border-cizgi hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name={`analiz-segment-${dosya.id}`}
                    value={s.segment}
                    checked={segment === s.segment}
                    onChange={() => setSegment(s.segment)}
                    className="sr-only"
                  />
                  <div className="mb-2 font-semibold text-brand-dark">{s.ad}</div>
                  <dl className="space-y-1 text-slate-600">
                    <div>Kumaş: {s.kumas}</div>
                    <div>Gramaj: {s.gramaj}</div>
                    <div>Boya: {s.boya}</div>
                    <div>Baskı: {s.baski}</div>
                    <div>
                      Fire: <span className="rakam">{yuzdeYaz(s.fire_orani)}</span>
                    </div>
                  </dl>
                </label>
              ))}
            </div>
          )}

          <div>
            <div className="mb-2 font-medium text-brand-dark">Tespit edilen ürünler</div>
            <ul className="space-y-2">
              {satirlar.map((r, i) => {
                const kalemDegistir = (j: number, d: Partial<KalemSatiri>) =>
                  degistir(i, { kalemler: r.kalemler.map((k, x) => (x === j ? { ...k, ...d } : k)) });
                return (
                  <li key={i} className={`rounded-lg border bg-white p-3 ${r.secili ? "border-cizgi" : "border-dashed border-cizgi opacity-60"}`}>
                    <div className="grid grid-cols-12 items-end gap-2">
                      <label className="col-span-12 flex items-center gap-2 md:col-span-1 md:pb-2">
                        <input
                          type="checkbox"
                          checked={r.secili}
                          onChange={(e) => degistir(i, { secili: e.target.checked })}
                          className="accent-brand"
                          aria-label={`${r.ad} eklensin`}
                        />
                        <span className="md:hidden">Ekle</span>
                      </label>
                      <div className="col-span-12 md:col-span-4">
                        <label className="etiket" htmlFor={`a-ad-${i}`}>Ürün</label>
                        <input id={`a-ad-${i}`} value={r.ad} onChange={(e) => degistir(i, { ad: e.target.value })} className="girdi" />
                      </div>
                      <div className="col-span-8 md:col-span-4">
                        <label className="etiket" htmlFor={`a-grup-${i}`}>Ürün grubu</label>
                        <select
                          id={`a-grup-${i}`}
                          value={r.urun_grubu}
                          onChange={(e) =>
                            degistir(i, { urun_grubu: e.target.value, kalemler: kalemSatirlari(urunKalemleri(e.target.value, [], sablonlar)) })
                          }
                          className="girdi"
                        >
                          {URUN_GRUPLARI.map((g) => (
                            <option key={g.kod} value={g.kod}>
                              {g.ad}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-4 md:col-span-3">
                        <label className="etiket" htmlFor={`a-adet-${i}`}>Adet</label>
                        <input
                          id={`a-adet-${i}`}
                          value={r.adet}
                          inputMode="numeric"
                          onChange={(e) => degistir(i, { adet: e.target.value.replace(/\D/g, "") })}
                          className={`girdi-sayi ${r.secili && adetGecersiz(r) ? "border-amber-400 bg-amber-50" : ""}`}
                          placeholder="Belgede yok"
                        />
                      </div>
                      <div className="col-span-12">
                        <label className="etiket" htmlFor={`a-acik-${i}`}>Teknik özet</label>
                        <input id={`a-acik-${i}`} value={r.aciklama} onChange={(e) => degistir(i, { aciklama: e.target.value })} className="girdi" />
                      </div>
                    </div>
                    {r.secili && (
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="text-left text-slate-500">
                            <tr>
                              <th className="w-6 py-1" />
                              <th className="py-1 font-medium">Kalem</th>
                              <th className="w-28 whitespace-nowrap py-1 text-right font-medium">Kullanım (1 adet)</th>
                              <th className="w-20 py-1 pl-2 font-medium">Birim</th>
                              <th className="py-1 pl-2 font-medium">Nasıl hesaplandı</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-cizgi">
                            {r.kalemler.map((k, j) => (
                              <tr key={j} className={k.secili ? "" : "opacity-50"}>
                                <td className="py-1">
                                  <input
                                    type="checkbox"
                                    className="accent-brand"
                                    checked={k.secili}
                                    disabled={k.zorunlu}
                                    onChange={(e) => kalemDegistir(j, { secili: e.target.checked })}
                                    aria-label={`${k.ad} eklensin`}
                                  />
                                </td>
                                <td className="py-1 text-brand-dark">
                                  {k.ad}
                                  {k.zorunlu ? (
                                    <span className="ml-1 text-slate-400">zorunlu</span>
                                  ) : k.sablonId == null ? (
                                    <span className="ml-1 rounded bg-amber-50 px-1 text-amber-700">yeni kalem</span>
                                  ) : null}
                                </td>
                                <td className="py-1">
                                  <input
                                    value={k.kullanimMetni}
                                    inputMode="decimal"
                                    aria-label={`${k.ad} kullanım`}
                                    onChange={(e) => kalemDegistir(j, { kullanimMetni: e.target.value })}
                                    className={`girdi-sayi py-0.5 text-xs ${kullanimGecersiz(k) ? "border-red-400" : ""}`}
                                    placeholder="—"
                                  />
                                </td>
                                <td className="py-1 pl-2">
                                  <select
                                    value={k.birim}
                                    aria-label={`${k.ad} birim`}
                                    onChange={(e) => kalemDegistir(j, { birim: e.target.value })}
                                    className="girdi py-0.5 text-xs"
                                  >
                                    {BIRIMLER.map((b) => (
                                      <option key={b} value={b}>
                                        {b}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-1 pl-2 text-slate-500">{k.hesap || "Kütüphanedeki varsayılan"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="mt-1 text-xs text-slate-500">
                          Miktarlar yapay zekânın tahminidir, fire hariçtir. Kontrol edip gerekirse düzeltin; onaydan sonra da maliyet tablosunda değiştirebilirsiniz.
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {ihaleBilgileri.length > 0 && (
            <div className="rounded-lg bg-white px-3 py-2 text-slate-600">
              <span className="font-medium text-brand-dark">Belgeden okunan ihale bilgileri</span> (sadece boş alanlara yazılır):{" "}
              {ihaleBilgileri.map(([b, d]) => `${b}: ${d}`).join(" · ")}
            </div>
          )}

          {analiz.uyarilar.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
              <p className="mb-1 font-medium">Dikkat edilecekler</p>
              <ul className="list-disc space-y-0.5 pl-5">
                {analiz.uyarilar.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          )}

          {mevcutUrunSayisi > 0 && (
            <p className="text-slate-600">İhalede zaten {mevcutUrunSayisi} ürün var; seçilen ürünler bunlara ek olarak eklenecek.</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-birincil" disabled={!!eksik || uygulaniyor} onClick={uygula}>
              {uygulaniyor ? "Oluşturuluyor…" : "Onayla ve Maliyet Oluştur"}
            </button>
            {eksik && <span className="text-sm text-amber-700">{eksik}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
