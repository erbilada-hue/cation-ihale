"use client";

import { useState } from "react";
import { ihaleSil } from "../actions";

export function IhaleSilButonu({ id, ad }: { id: string; ad: string }) {
  const [siliniyor, setSiliniyor] = useState(false);
  return (
    <button
      type="button"
      className="btn-tehlike"
      disabled={siliniyor}
      onClick={async () => {
        if (!confirm(`"${ad}" ihalesi, tüm ürünleri, kalemleri ve teklifleriyle birlikte silinsin mi? Bu işlem geri alınamaz.`)) return;
        setSiliniyor(true);
        const s = await ihaleSil(id);
        if (s?.hata) {
          alert(s.hata);
          setSiliniyor(false);
        }
      }}
    >
      {siliniyor ? "Siliniyor…" : "İhaleyi sil"}
    </button>
  );
}
