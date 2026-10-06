"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fiyatYaz } from "@/lib/format";
import { enUygunFiyat, eskiMi, gunFarki, kalemAnahtari } from "@/lib/tedarikci";
import type { FiyatTalebi, Tedarikci, TedarikciFiyati, TedarikciFiyatiAdli } from "@/lib/tipler";
import { FiyatFormu } from "@/components/FiyatFormu";
import { FiyatTarihi, KdvRozeti } from "@/components/FiyatRozetleri";
import { TalepHazirla } from "@/components/TalepHazirla";
import { talepKapat } from "../tedarikciler/actions";
import { FiyatExceliYukle } from "./FiyatExceliYukle";

type Props = {
  ilkFiyatlar: TedarikciFiyatiAdli[];
  tedarikciler: Tedarikci[];
  ilkTalepler: FiyatTalebi[];
  kalemOnerileri: string[];
  kdvOrani: number;
  firmaAdi: string;
};

const KURSUZ = { USD: null, EUR: null };
/** Arama yokken her kalem grubunda ilk bu kadar satır gösterilir */
const GRUP_ONIZLEME = 10;

export function FiyatListesi({ ilkFiyatlar, tedarikciler, ilkTalepler, kalemOnerileri, kdvOrani, firmaAdi }: Props) {
  const router = useRouter();
  const [fiyatlar, setFiyatlar] = useState(ilkFiyatlar);
  const [talepler, setTalepler] = useState(ilkTalepler);
  const [arama, setArama] = useState("");
  const [sadeceEski, setSadeceEski] = useState(false);
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [talepAcik, setTalepAcik] = useState(false);
  const [yeniFiyat, setYeniFiyat] = useState(false);
  const [cevaplanan, setCevaplanan] = useState<string | null>(null);
  const [excelAcik, setExcelAcik] = useState(false);
  const [acikGruplar, setAcikGruplar] = useState<Set<string>>(new Set());

  // Sunucudan yenilenen liste (ör. "Gönderdim" sonrası) ekrana yansısın
  useEffect(() => setFiyatlar(ilkFiyatlar), [ilkFiyatlar]);
  useEffect(() => setTalepler(ilkTalepler), [ilkTalepler]);

  const tedarikciAdi = (id: string) => tedarikciler.find((t) => t.id === id)?.ad ?? "";

  function fiyatGeldi(f: TedarikciFiyati) {
    const adli = { ...f, tedarikci_adi: tedarikciAdi(f.tedarikci_id) };
    setFiyatlar((l) => (l.some((x) => x.id === f.id) ? l.map((x) => (x.id === f.id ? adli : x)) : [...l, adli]));
  }

  // Kalem adına göre gruplar; her grupta en uygun fiyat işaretlenir
  const gruplar = useMemo(() => {
    const aranan = kalemAnahtari(arama);
    const harita = new Map<string, TedarikciFiyatiAdli[]>();
    for (const f of fiyatlar) {
      if (sadeceEski && !eskiMi(f.fiyat_tarihi)) continue;
      if (aranan && !kalemAnahtari(`${f.kalem_adi} ${f.aciklama} ${f.tedarikci_adi}`).includes(aranan)) continue;
      const anahtar = kalemAnahtari(f.kalem_adi);
      harita.set(anahtar, [...(harita.get(anahtar) ?? []), f]);
    }
    return Array.from(harita.values())
      .map((satirlar) => {
        // Aynı açıklamalı satırlar sıralı dursun; "en uygun" sadece aynı ürünü anlatan farklı tedarikçiler arasında
        const sirali = [...satirlar].sort(
          (a, b) => a.aciklama.localeCompare(b.aciklama, "tr") || a.fiyat - b.fiyat,
        );
        const altGruplar = new Map<string, TedarikciFiyatiAdli[]>();
        for (const f of satirlar) {
          const k = kalemAnahtari(f.aciklama);
          altGruplar.set(k, [...(altGruplar.get(k) ?? []), f]);
        }
        const enUygunIdler = new Set<string>();
        for (const l of altGruplar.values()) {
          if (new Set(l.map((f) => f.tedarikci_id)).size < 2) continue;
          const e = enUygunFiyat(l, KURSUZ);
          if (e) enUygunIdler.add(e.id);
        }
        return { ad: satirlar[0].kalem_adi, satirlar: sirali, enUygunIdler };
      })
      .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  }, [fiyatlar, arama, sadeceEski]);

  const eskiSayisi = fiyatlar.filter((f) => eskiMi(f.fiyat_tarihi)).length;

  function sec(id: string, acik: boolean) {
    setSecili((s) => {
      const y = new Set(s);
      if (acik) y.add(id);
      else y.delete(id);
      return y;
    });
  }

  const talepGruplari = useMemo(() => {
    const harita = new Map<string, TedarikciFiyati[]>();
    for (const f of fiyatlar) if (secili.has(f.id)) harita.set(f.tedarikci_id, [...(harita.get(f.tedarikci_id) ?? []), f]);
    return Array.from(harita.entries())
      .map(([id, l]) => ({ tedarikci: tedarikciler.find((t) => t.id === id)!, fiyatlar: l }))
      .filter((g) => g.tedarikci);
  }, [secili, fiyatlar, tedarikciler]);

  async function kapat(t: FiyatTalebi) {
    const s = await talepKapat(t.id);
    if (s.hata === undefined) setTalepler((l) => l.filter((x) => x.id !== t.id));
  }

  // Yükleme bölümü iki görünümde de ilk sırada durur; ilk yüklemeden sonra liste açılınca sonuç mesajı kaybolmaz
  const excelBolumu = excelAcik ? <FiyatExceliYukle tedarikciler={tedarikciler} onKapat={() => setExcelAcik(false)} /> : null;

  if (tedarikciler.length === 0) {
    return (
      <div className="space-y-6">
        {excelBolumu}
        <div className="kart p-10 text-center">
          <p className="text-slate-600">
            Fiyat girmek için önce tedarikçi ekleyin ya da elinizdeki fiyat listesini Excel&apos;den yükleyin.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/tedarikciler/yeni" className="btn-birincil">
              Tedarikçi ekle
            </Link>
            <button type="button" className="btn-ikincil" onClick={() => setExcelAcik(true)}>
              Excel&apos;den yükle
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {excelBolumu}
      {talepler.length > 0 && (
        <section id="cevaplar" className="kart p-6">
          <h2 className="mb-1 font-semibold text-brand-dark">Bekleyen cevaplar</h2>
          <p className="mb-4 text-sm text-slate-500">
            Tedarikçiden cevap gelince ilgili kalemde &quot;Cevabı gir&quot;e basın. Tüm kalemler girilince talep kendiliğinden
            kapanır.
          </p>
          <div className="space-y-4">
            {talepler.map((t) => {
              const gun = gunFarki(t.gonderim_zamani);
              const renk = gun >= 7 ? "bg-red-50 text-red-700" : gun >= 3 ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-600";
              const kalemler = fiyatlar.filter((f) => t.fiyat_idleri.includes(f.id));
              return (
                <div key={t.id} className="rounded-lg border border-cizgi p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <span className="font-medium text-brand-dark">{tedarikciAdi(t.tedarikci_id)}</span>
                    <span className={`rozet ${renk}`}>{gun === 0 ? "bugün istendi" : `${gun} gündür bekleniyor`}</span>
                    <button type="button" className="ml-auto text-sm text-slate-500 hover:text-brand" onClick={() => kapat(t)}>
                      Talebi kapat
                    </button>
                  </div>
                  <ul className="divide-y divide-cizgi">
                    {kalemler.map((f) => {
                      const cevaplandi = new Date(f.updated_at) >= new Date(t.gonderim_zamani);
                      const anahtar = `${t.id}:${f.id}`;
                      return (
                        <li key={f.id} className="py-2">
                          {cevaplanan === anahtar ? (
                            <FiyatFormu
                              ilk={f}
                              tedarikciId={f.tedarikci_id}
                              kalemOnerileri={kalemOnerileri}
                              kdvOrani={kdvOrani}
                              kalemSabit
                              baslik={`${f.kalem_adi}${f.aciklama ? ` (${f.aciklama})` : ""}: gelen cevap`}
                              onKaydedildi={(y) => {
                                fiyatGeldi(y);
                                setCevaplanan(null);
                                router.refresh();
                              }}
                              onVazgec={() => setCevaplanan(null)}
                            />
                          ) : (
                            <div className="flex items-center gap-3 text-sm">
                              <span className="flex-1">
                                {f.kalem_adi}
                                {f.aciklama && <span className="text-slate-500"> · {f.aciklama}</span>}
                              </span>
                              <span className="rakam text-slate-500">
                                {fiyatYaz(f.fiyat, f.para_birimi)} / {f.birim}
                              </span>
                              {cevaplandi ? (
                                <span className="rozet bg-green-50 text-green-700">girildi</span>
                              ) : (
                                <button type="button" className="btn-ikincil btn-kucuk" onClick={() => setCevaplanan(anahtar)}>
                                  Cevabı gir
                                </button>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {talepAcik && talepGruplari.length > 0 && (
        <TalepHazirla
          gruplar={talepGruplari}
          firmaAdi={firmaAdi}
          onKapat={() => {
            setTalepAcik(false);
            setSecili(new Set());
            router.refresh();
          }}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          aria-label="Ara"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Kalem veya tedarikçi ara…"
          className="girdi w-64"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={sadeceEski} onChange={(e) => setSadeceEski(e.target.checked)} />
          Sadece 14 günden eskiler ({eskiSayisi})
        </label>
        <div className="ml-auto flex gap-2">
          {eskiSayisi > 0 && (
            <button
              type="button"
              className="btn-ikincil"
              onClick={() => setSecili(new Set(fiyatlar.filter((f) => eskiMi(f.fiyat_tarihi)).map((f) => f.id)))}
            >
              Eskileri seç
            </button>
          )}
          <button type="button" className="btn-birincil" disabled={secili.size === 0} onClick={() => setTalepAcik(true)}>
            Toplu İste{secili.size > 0 ? ` (${secili.size})` : ""}
          </button>
          <button type="button" className="btn-ikincil" onClick={() => setYeniFiyat(true)}>
            + Fiyat ekle
          </button>
          <button type="button" className="btn-ikincil" onClick={() => setExcelAcik(true)}>
            Excel&apos;den yükle
          </button>
        </div>
      </div>

      {yeniFiyat && (
        <FiyatFormu
          tedarikciler={tedarikciler}
          kalemOnerileri={kalemOnerileri}
          kdvOrani={kdvOrani}
          baslik="Yeni fiyat"
          onKaydedildi={(f) => {
            fiyatGeldi(f);
            setYeniFiyat(false);
          }}
          onVazgec={() => setYeniFiyat(false)}
        />
      )}

      {gruplar.length === 0 ? (
        <div className="kart p-8 text-center text-slate-500">
          {fiyatlar.length === 0 ? "Henüz fiyat girilmedi. \"+ Fiyat ekle\" ile başlayın." : "Aramaya uyan fiyat yok."}
        </div>
      ) : (
        <div className="kart overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-cizgi bg-zemin text-left text-xs text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3" />
                <th className="px-2 py-3 font-medium">Tedarikçi</th>
                <th className="px-2 py-3 font-medium">Açıklama</th>
                <th className="px-2 py-3 text-right font-medium">Birim fiyat (KDV hariç)</th>
                <th className="px-2 py-3 font-medium">Termin</th>
                <th className="px-2 py-3 font-medium">Vade</th>
                <th className="px-4 py-3 font-medium">Fiyat tarihi</th>
              </tr>
            </thead>
            {gruplar.map((g) => (
              <tbody key={g.ad} className="border-b border-cizgi last:border-b-0">
                <tr className="bg-zemin/50">
                  <td className="px-4 pt-3" />
                  <td colSpan={6} className="px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {g.ad}
                    {g.satirlar.length > 1 && <span className="ml-2 font-normal normal-case">{g.satirlar.length} fiyat</span>}
                  </td>
                </tr>
                {(arama || acikGruplar.has(g.ad) ? g.satirlar : g.satirlar.slice(0, GRUP_ONIZLEME)).map((f) => (
                  <tr key={f.id} className={secili.has(f.id) ? "bg-brand-soft/40" : ""}>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        aria-label={`${f.tedarikci_adi} ${f.kalem_adi} seç`}
                        checked={secili.has(f.id)}
                        onChange={(e) => sec(f.id, e.target.checked)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Link href={`/tedarikciler/${f.tedarikci_id}`} className="text-brand-dark hover:text-brand">
                        {f.tedarikci_adi}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-slate-600">{f.aciklama || "—"}</td>
                    <td className="rakam whitespace-nowrap px-2 py-2 text-right">
                      <span className={g.enUygunIdler.has(f.id) ? "font-semibold text-green-700" : ""}>
                        {fiyatYaz(f.fiyat, f.para_birimi)}
                      </span>{" "}
                      <span className="text-slate-400">/ {f.birim}</span>
                      <div className="space-x-1">
                        {g.enUygunIdler.has(f.id) && <span className="rozet bg-green-50 text-green-700">en uygun</span>}
                        <KdvRozeti durum={f.kdv_durumu} />
                      </div>
                    </td>
                    <td className="px-2 py-2 text-slate-600">{f.termin || "—"}</td>
                    <td className="px-2 py-2 text-slate-600">{f.odeme_vadesi || "—"}</td>
                    <td className="px-4 py-2">
                      <FiyatTarihi tarih={f.fiyat_tarihi} />
                    </td>
                  </tr>
                ))}
                {!arama && !acikGruplar.has(g.ad) && g.satirlar.length > GRUP_ONIZLEME && (
                  <tr>
                    <td />
                    <td colSpan={6} className="px-2 pb-3">
                      <button
                        type="button"
                        className="text-sm text-brand hover:underline"
                        onClick={() => setAcikGruplar((s) => new Set(s).add(g.ad))}
                      >
                        Tümünü göster ({g.satirlar.length})
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </div>
  );
}
