"use client";

import { useState } from "react";
import { musteriSil } from "../actions";

export function MusteriSilButonu({ id, ad, ihaleSayisi }: { id: string; ad: string; ihaleSayisi: number }) {
  const [hata, setHata] = useState<string | null>(null);
  async function sil() {
    const ek = ihaleSayisi > 0 ? ` ${ihaleSayisi} ihalesi silinmez, sadece müşteri bağlantısı kalkar.` : "";
    if (!confirm(`"${ad}" müşterisi silinsin mi?${ek}`)) return;
    const s = await musteriSil(id);
    if (s?.hata) setHata(s.hata);
  }
  return (
    <div className="text-right">
      <button type="button" className="btn-tehlike" onClick={sil}>
        Müşteriyi sil
      </button>
      {hata && <p className="mt-1 text-sm text-red-600">{hata}</p>}
    </div>
  );
}
