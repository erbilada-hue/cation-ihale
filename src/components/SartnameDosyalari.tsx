"use client";

import { useRef, useState } from "react";
import { tarayiciIstemcisi } from "@/lib/supabase/client";
import { EN_BUYUK_DOSYA, KABUL_EDILEN_DOSYALAR, SARTNAME_KLASORU, boyutYaz, depoAdi } from "@/lib/dosya";
import { dosyaKaydet, dosyaSil } from "@/app/(app)/ihaleler/actions";
import type { IhaleDosyasi } from "@/lib/tipler";

type Props = {
  ihaleId: string;
  /** Boşsa ihalenin genel şartnamesi, doluysa o ürünün şartnamesi */
  urunId: string | null;
  ilkDosyalar: IhaleDosyasi[];
  /** Ürün kartı içinde daha sade görünüm */
  kompakt?: boolean;
};

/** Teknik şartname dosyaları (PDF, Word, Excel): yükle, aç, sil. */
export function SartnameDosyalari({ ihaleId, urunId, ilkDosyalar, kompakt }: Props) {
  const [dosyalar, setDosyalar] = useState(ilkDosyalar);
  const [yukleniyor, setYukleniyor] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const secici = useRef<HTMLInputElement>(null);

  async function yukle(liste: FileList | null) {
    if (!liste || liste.length === 0) return;
    setHata(null);
    const supabase = tarayiciIstemcisi();
    try {
      for (const dosya of Array.from(liste)) {
        if (dosya.size > EN_BUYUK_DOSYA) {
          setHata(`"${dosya.name}" 50 MB'tan büyük, yüklenemedi.`);
          continue;
        }
        setYukleniyor(dosya.name);
        const yol = `${ihaleId}/${crypto.randomUUID()}-${depoAdi(dosya.name)}`;
        const { error } = await supabase.storage
          .from(SARTNAME_KLASORU)
          .upload(yol, dosya, { contentType: dosya.type || "application/octet-stream", upsert: false });
        if (error) {
          setHata(`"${dosya.name}" yüklenemedi: ${error.message}`);
          continue;
        }
        const s = await dosyaKaydet({
          ihaleId,
          urunId,
          dosyaAdi: dosya.name,
          yol,
          boyut: dosya.size,
          tur: dosya.type,
        });
        if (s.hata !== undefined) {
          setHata(s.hata);
          continue;
        }
        setDosyalar((l) => [...l, s.veri]);
      }
    } finally {
      setYukleniyor(null);
      if (secici.current) secici.current.value = "";
    }
  }

  async function sil(d: IhaleDosyasi) {
    if (!confirm(`"${d.dosya_adi}" dosyası silinsin mi?`)) return;
    setHata(null);
    const s = await dosyaSil(d.id);
    if (s.hata !== undefined) return setHata(s.hata);
    setDosyalar((l) => l.filter((x) => x.id !== d.id));
  }

  return (
    <div className={kompakt ? "text-sm" : ""}>
      {dosyalar.length > 0 && (
        <ul className={`divide-y divide-cizgi ${kompakt ? "mb-2" : "mb-3 rounded-lg border border-cizgi"}`}>
          {dosyalar.map((d) => (
            <li key={d.id} className={`flex items-center gap-3 ${kompakt ? "py-1.5" : "px-3 py-2"}`}>
              <span className="rozet bg-slate-100 uppercase text-slate-600">{uzanti(d.dosya_adi)}</span>
              <a
                href={`/api/dosya/${d.id}`}
                target="_blank"
                rel="noopener"
                className="min-w-0 flex-1 truncate text-brand hover:underline"
                title={d.dosya_adi}
              >
                {d.dosya_adi}
              </a>
              <span className="rakam text-xs text-slate-500">{boyutYaz(d.boyut)}</span>
              <button
                type="button"
                onClick={() => sil(d)}
                className="px-1 text-slate-400 hover:text-red-600"
                aria-label={`${d.dosya_adi} dosyasını sil`}
                title="Dosyayı sil"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className={`btn-ikincil cursor-pointer ${kompakt ? "btn-kucuk py-1.5" : ""} ${yukleniyor ? "pointer-events-none opacity-60" : ""}`}>
          {yukleniyor ? "Yükleniyor…" : kompakt ? "+ Şartname ekle" : "+ Dosya ekle"}
          <input
            ref={secici}
            type="file"
            multiple
            accept={KABUL_EDILEN_DOSYALAR}
            className="sr-only"
            aria-label={urunId ? "Ürün şartnamesi ekle" : "İhale şartnamesi ekle"}
            disabled={Boolean(yukleniyor)}
            onChange={(e) => yukle(e.target.files)}
          />
        </label>
        {yukleniyor && <span className="truncate text-xs text-slate-500">{yukleniyor}</span>}
        {!yukleniyor && !kompakt && dosyalar.length === 0 && (
          <span className="text-sm text-slate-500">PDF, Word veya Excel; en fazla 50 MB.</span>
        )}
      </div>
      {hata && <p className="mt-2 text-sm text-red-600">{hata}</p>}
    </div>
  );
}

function uzanti(ad: string): string {
  const i = ad.lastIndexOf(".");
  return i < 0 ? "dosya" : ad.slice(i + 1, i + 5);
}
