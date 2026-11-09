"use client";

import { useState } from "react";
import { ogrenmeIsaretiKaydet } from "../actions";

/** Teklif verilen ve kazanılan ihaleler yapay zekâya örnek olur; istisnai bir ihale buradan çıkarılır */
export function OgrenmeIsareti({ ihaleId, dahil }: { ihaleId: string; dahil: boolean }) {
  const [deger, setDeger] = useState(dahil);
  const [hata, setHata] = useState<string | null>(null);

  async function degistir(yeni: boolean) {
    setDeger(yeni);
    setHata(null);
    const s = await ogrenmeIsaretiKaydet(ihaleId, yeni);
    if (s.hata !== undefined) {
      setDeger(!yeni);
      setHata(s.hata);
    }
  }

  return (
    <label className="mb-2 flex items-center gap-2 text-xs text-slate-500">
      <input type="checkbox" checked={deger} onChange={(e) => degistir(e.target.checked)} />
      Yapay zekâ bu ihaleden öğrensin (kalem miktarları ve kâr marjı örnek alınır)
      {hata && <span className="text-red-600">{hata}</span>}
    </label>
  );
}
