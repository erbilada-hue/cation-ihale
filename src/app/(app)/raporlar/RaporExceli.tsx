"use client";

import * as XLSX from "xlsx";

export type RaporSatiri = {
  tarih: string;
  ihale: string;
  musteri: string;
  marka: string;
  urun: number;
  adet: number;
  teklif: number;
  kdvDahil: number;
  netKar: number;
};

/** Ekrandaki kazanılan işler listesini Excel olarak indirir */
export function RaporExceli({ satirlar, dosyaAdi }: { satirlar: RaporSatiri[]; dosyaAdi: string }) {
  function indir() {
    const sayfa = XLSX.utils.json_to_sheet(
      satirlar.map((s) => ({
        "Sonuç tarihi": s.tarih.split("-").reverse().join("."),
        İhale: s.ihale,
        Müşteri: s.musteri,
        "Marka / proje": s.marka,
        "Ürün sayısı": s.urun,
        Adet: s.adet,
        "Teklif tutarı (KDV hariç, ₺)": s.teklif,
        "KDV dahil (₺)": s.kdvDahil,
        "Net kâr (₺)": s.netKar,
      })),
    );
    sayfa["!cols"] = [12, 36, 28, 18, 12, 10, 24, 18, 16].map((wch) => ({ wch }));
    const kitap = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(kitap, sayfa, "Kazanılan işler");
    XLSX.writeFile(kitap, dosyaAdi);
  }

  return (
    <button type="button" className="btn-ikincil" onClick={indir} disabled={satirlar.length === 0}>
      Excel olarak indir
    </button>
  );
}
