"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tarihYaz } from "@/lib/format";
import { ihaleSonucuKaydet } from "../actions";

type SonucKodu = "olumlu" | "olumsuz";

/** İhalenin sonucu: olumlu (kazanıldı) ya da olumsuz. Rapor bu işarete ve tarihine göre çekilir. */
export function IhaleSonucu({
  ihaleId,
  sonuc,
  sonucTarihi,
}: {
  ihaleId: string;
  sonuc: SonucKodu | null;
  sonucTarihi: string | null;
}) {
  const router = useRouter();
  const [duzenle, setDuzenle] = useState(false);
  const [tarih, setTarih] = useState(sonucTarihi ?? "");
  const [hata, setHata] = useState<string | null>(null);
  const [calisiyor, setCalisiyor] = useState(false);

  async function kaydet(yeni: SonucKodu | null, yeniTarih?: string) {
    setCalisiyor(true);
    setHata(null);
    const s = await ihaleSonucuKaydet(ihaleId, yeni, yeniTarih);
    setCalisiyor(false);
    if (s.hata !== undefined) return setHata(s.hata);
    setDuzenle(false);
    router.refresh();
  }

  const secenekler = (
    <>
      <button
        type="button"
        disabled={calisiyor}
        onClick={() => kaydet("olumlu", duzenle ? tarih : undefined)}
        className={`btn-kucuk rounded-lg border px-3 py-1.5 text-sm font-medium ${
          sonuc === "olumlu" ? "border-green-600 bg-green-600 text-white" : "border-green-300 bg-white text-green-700 hover:bg-green-50"
        }`}
      >
        ✓ Olumlu
      </button>
      <button
        type="button"
        disabled={calisiyor}
        onClick={() => kaydet("olumsuz", duzenle ? tarih : undefined)}
        className={`btn-kucuk rounded-lg border px-3 py-1.5 text-sm font-medium ${
          sonuc === "olumsuz" ? "border-red-600 bg-red-600 text-white" : "border-red-300 bg-white text-red-700 hover:bg-red-50"
        }`}
      >
        ✗ Olumsuz
      </button>
    </>
  );

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-cizgi bg-white px-4 py-2.5 text-sm">
      <span className="font-medium text-brand-dark">İhale sonucu:</span>
      {sonuc && !duzenle ? (
        <>
          <span
            className={`rozet ${sonuc === "olumlu" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
          >
            {sonuc === "olumlu" ? "✓ Olumlu" : "✗ Olumsuz"}
          </span>
          <span className="rakam text-slate-500">{tarihYaz(sonucTarihi)}</span>
          <button type="button" className="text-brand hover:underline" onClick={() => setDuzenle(true)}>
            Değiştir
          </button>
        </>
      ) : (
        <>
          {secenekler}
          {duzenle ? (
            <>
              <label className="flex items-center gap-2 text-slate-600">
                Sonuç tarihi
                <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} className="girdi w-40 py-1" />
              </label>
              <button type="button" className="text-slate-500 hover:text-red-700" disabled={calisiyor} onClick={() => kaydet(null)}>
                İşareti kaldır
              </button>
              <button type="button" className="text-slate-500 hover:text-brand" onClick={() => setDuzenle(false)}>
                Vazgeç
              </button>
            </>
          ) : (
            <span className="text-slate-500">Henüz işaretlenmedi. Seçince bugünün tarihi yazılır.</span>
          )}
        </>
      )}
      {hata && <span className="text-red-700">{hata}</span>}
    </div>
  );
}
