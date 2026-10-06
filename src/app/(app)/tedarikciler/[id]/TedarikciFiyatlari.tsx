"use client";

import { useState } from "react";
import { fiyatYaz } from "@/lib/format";
import type { TedarikciFiyati } from "@/lib/tipler";
import { FiyatFormu } from "@/components/FiyatFormu";
import { FiyatTarihi, KdvRozeti } from "@/components/FiyatRozetleri";
import { fiyatSil } from "../actions";

type Props = {
  tedarikciId: string;
  ilkFiyatlar: TedarikciFiyati[];
  kalemOnerileri: string[];
  kdvOrani: number;
};

export function TedarikciFiyatlari({ tedarikciId, ilkFiyatlar, kalemOnerileri, kdvOrani }: Props) {
  const [fiyatlar, setFiyatlar] = useState(ilkFiyatlar);
  const [duzenlenen, setDuzenlenen] = useState<string | "yeni" | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  function kaydedildi(f: TedarikciFiyati) {
    setFiyatlar((l) => (l.some((x) => x.id === f.id) ? l.map((x) => (x.id === f.id ? f : x)) : [...l, f]));
    setDuzenlenen(null);
  }

  async function sil(f: TedarikciFiyati) {
    if (!confirm(`"${f.kalem_adi}" fiyatı silinsin mi?`)) return;
    setHata(null);
    const s = await fiyatSil(f.id);
    if (s.hata !== undefined) return setHata(s.hata);
    setFiyatlar((l) => l.filter((x) => x.id !== f.id));
  }

  return (
    <section className="kart p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-brand-dark">Fiyatları</h2>
        {duzenlenen !== "yeni" && (
          <button type="button" className="btn-ikincil btn-kucuk" onClick={() => setDuzenlenen("yeni")}>
            + Fiyat ekle
          </button>
        )}
      </div>

      {duzenlenen === "yeni" && (
        <div className="mb-4">
          <FiyatFormu
            tedarikciId={tedarikciId}
            kalemOnerileri={kalemOnerileri}
            kdvOrani={kdvOrani}
            baslik="Yeni fiyat"
            onKaydedildi={kaydedildi}
            onVazgec={() => setDuzenlenen(null)}
          />
        </div>
      )}

      {fiyatlar.length === 0 && duzenlenen !== "yeni" ? (
        <p className="text-sm text-slate-500">Bu tedarikçi için henüz fiyat girilmedi.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr>
              <th className="pb-2 font-medium">Kalem</th>
              <th className="pb-2 text-right font-medium">Birim fiyat (KDV hariç)</th>
              <th className="pb-2 pl-4 font-medium">Termin</th>
              <th className="pb-2 font-medium">Min. sipariş</th>
              <th className="pb-2 font-medium">Vade</th>
              <th className="pb-2 font-medium">Fiyat tarihi</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {fiyatlar.map((f) =>
              duzenlenen === f.id ? (
                <tr key={f.id}>
                  <td colSpan={7} className="py-2">
                    <FiyatFormu
                      ilk={f}
                      tedarikciId={tedarikciId}
                      kalemOnerileri={kalemOnerileri}
                      kdvOrani={kdvOrani}
                      baslik={`${f.kalem_adi}: yeni fiyat`}
                      onKaydedildi={kaydedildi}
                      onVazgec={() => setDuzenlenen(null)}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={f.id} className="border-t border-cizgi">
                  <td className="py-2 pr-2">
                    <div className="font-medium text-brand-dark">{f.kalem_adi}</div>
                    {f.aciklama && <div className="text-xs text-slate-500">{f.aciklama}</div>}
                  </td>
                  <td className="rakam py-2 text-right">
                    {fiyatYaz(f.fiyat, f.para_birimi)} <span className="text-slate-400">/ {f.birim}</span>
                    <div>
                      <KdvRozeti durum={f.kdv_durumu} />
                    </div>
                  </td>
                  <td className="py-2 pl-4 text-slate-600">{f.termin || "—"}</td>
                  <td className="py-2 text-slate-600">{f.min_siparis || "—"}</td>
                  <td className="py-2 text-slate-600">{f.odeme_vadesi || "—"}</td>
                  <td className="py-2">
                    <FiyatTarihi tarih={f.fiyat_tarihi} />
                  </td>
                  <td className="whitespace-nowrap py-2 text-right">
                    <button type="button" className="px-2 text-brand hover:underline" onClick={() => setDuzenlenen(f.id)}>
                      Güncelle
                    </button>
                    <button
                      type="button"
                      className="px-1 text-slate-400 hover:text-red-600"
                      aria-label={`${f.kalem_adi} fiyatını sil`}
                      title="Fiyatı sil"
                      onClick={() => sil(f)}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}
      {hata && <p className="mt-2 text-sm text-red-600">{hata}</p>}
    </section>
  );
}
