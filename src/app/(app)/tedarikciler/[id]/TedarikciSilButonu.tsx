"use client";

import { useState } from "react";
import { tedarikciSil } from "../actions";

export function TedarikciSilButonu({ id, ad, fiyatSayisi }: { id: string; ad: string; fiyatSayisi: number }) {
  const [hata, setHata] = useState<string | null>(null);
  async function sil() {
    const ek = fiyatSayisi > 0 ? ` ${fiyatSayisi} fiyat kaydı da silinecek.` : "";
    if (!confirm(`"${ad}" tedarikçisi silinsin mi?${ek} Bu işlem geri alınamaz.`)) return;
    const s = await tedarikciSil(id);
    if (s?.hata) setHata(s.hata);
  }
  return (
    <div className="text-right">
      <button type="button" className="btn-tehlike" onClick={sil}>
        Tedarikçiyi sil
      </button>
      {hata && <p className="mt-1 text-sm text-red-600">{hata}</p>}
    </div>
  );
}
