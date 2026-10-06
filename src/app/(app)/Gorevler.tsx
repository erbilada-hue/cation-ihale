"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { kalanGun, tarihYaz } from "@/lib/format";
import { GunRozeti } from "@/components/GunRozeti";
import type { Gorev } from "@/lib/tipler";
import { gorevEkle, gorevSil, gorevTamamla } from "./gorevler";

export type Hatirlatma = { anahtar: string; metin: string; href: string; gun: number | null };

export function Gorevler({
  gorevler,
  ihaleler,
  hatirlatmalar,
  bugun,
}: {
  gorevler: (Gorev & { ihale_adi: string | null })[];
  ihaleler: { id: string; ad: string }[];
  hatirlatmalar: Hatirlatma[];
  bugun: string;
}) {
  const router = useRouter();
  const [baslik, setBaslik] = useState("");
  const [ihaleId, setIhaleId] = useState("");
  const [sonTarih, setSonTarih] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [calisiyor, setCalisiyor] = useState(false);
  const [tamamlananlarAcik, setTamamlananlarAcik] = useState(false);

  const acik = gorevler
    .filter((g) => !g.tamamlandi)
    .sort((a, b) => (a.son_tarih ?? "9999").localeCompare(b.son_tarih ?? "9999") || a.created_at.localeCompare(b.created_at));
  const biten = gorevler.filter((g) => g.tamamlandi);

  async function islem(is: () => Promise<{ hata?: string }>) {
    setCalisiyor(true);
    setHata(null);
    const s = await is();
    setCalisiyor(false);
    if (s.hata) {
      setHata(s.hata);
      return false;
    }
    router.refresh();
    return true;
  }

  async function ekle(e: React.FormEvent) {
    e.preventDefault();
    if (!baslik.trim()) return;
    if (await islem(() => gorevEkle({ baslik, ihaleId: ihaleId || null, sonTarih: sonTarih || null }))) {
      setBaslik("");
      setIhaleId("");
      setSonTarih("");
    }
  }

  return (
    <section className="kart">
      <h2 className="border-b border-cizgi px-5 py-3 font-semibold text-brand-dark">Yapılacaklar</h2>

      <form onSubmit={ekle} className="space-y-2 border-b border-cizgi px-5 py-4">
        <input
          value={baslik}
          onChange={(e) => setBaslik(e.target.value)}
          className="girdi"
          placeholder="Yeni görev yazın… (ör. Efes için numune hazırla)"
          aria-label="Yeni görev"
          maxLength={300}
        />
        <div className="flex flex-wrap gap-2">
          <select value={ihaleId} onChange={(e) => setIhaleId(e.target.value)} className="girdi min-w-0 flex-1" aria-label="İlgili ihale">
            <option value="">İhale seçin (isteğe bağlı)</option>
            {ihaleler.map((i) => (
              <option key={i.id} value={i.id}>
                {i.ad}
              </option>
            ))}
          </select>
          <input type="date" value={sonTarih} onChange={(e) => setSonTarih(e.target.value)} className="girdi w-40" aria-label="Son tarih" />
          <button type="submit" className="btn-birincil" disabled={!baslik.trim() || calisiyor}>
            + Ekle
          </button>
        </div>
        {hata && <p className="text-sm text-red-700">{hata}</p>}
      </form>

      <ul className="divide-y divide-cizgi text-sm">
        {hatirlatmalar.map((h) => (
          <li key={h.anahtar}>
            <Link href={h.href} className="flex items-center gap-3 px-5 py-2.5 hover:bg-zemin/60">
              <span className="text-amber-500" aria-hidden>
                ●
              </span>
              <span className="flex-1 text-slate-700">{h.metin}</span>
              {h.gun != null && <GunRozeti gun={h.gun} />}
            </Link>
          </li>
        ))}
        {acik.map((g) => (
          <li key={g.id} className="group flex items-start gap-3 px-5 py-2.5">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-brand"
              aria-label={`${g.baslik} tamamlandı`}
              disabled={calisiyor}
              onChange={() => islem(() => gorevTamamla(g.id, true))}
            />
            <div className="min-w-0 flex-1">
              <div className="text-slate-800">{g.baslik}</div>
              {g.ihale_id && g.ihale_adi && (
                <Link href={`/ihaleler/${g.ihale_id}`} className="text-xs text-brand hover:underline">
                  {g.ihale_adi}
                </Link>
              )}
            </div>
            {g.son_tarih && (
              <span className="flex items-center gap-2">
                <span className="rakam text-xs text-slate-500">{tarihYaz(g.son_tarih)}</span>
                <GunRozeti gun={kalanGun(g.son_tarih, bugun)} />
              </span>
            )}
            <button
              type="button"
              className="text-slate-300 hover:text-red-600 group-hover:text-slate-400"
              aria-label={`${g.baslik} sil`}
              disabled={calisiyor}
              onClick={() => confirm(`"${g.baslik}" görevi silinsin mi?`) && islem(() => gorevSil(g.id))}
            >
              ×
            </button>
          </li>
        ))}
        {acik.length === 0 && hatirlatmalar.length === 0 && (
          <li className="px-5 py-6 text-center text-slate-500">Yapılacak iş yok.</li>
        )}
      </ul>

      {biten.length > 0 && (
        <div className="border-t border-cizgi px-5 py-3 text-sm">
          <button type="button" className="text-slate-500 hover:text-brand" onClick={() => setTamamlananlarAcik((a) => !a)}>
            {tamamlananlarAcik ? "▾" : "▸"} Tamamlananlar ({biten.length})
          </button>
          {tamamlananlarAcik && (
            <ul className="mt-2 space-y-1.5">
              {biten.map((g) => (
                <li key={g.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked
                    className="h-4 w-4 accent-brand"
                    aria-label={`${g.baslik} geri al`}
                    disabled={calisiyor}
                    onChange={() => islem(() => gorevTamamla(g.id, false))}
                  />
                  <span className="flex-1 text-slate-400 line-through">{g.baslik}</span>
                  <button
                    type="button"
                    className="text-slate-300 hover:text-red-600"
                    aria-label={`${g.baslik} sil`}
                    disabled={calisiyor}
                    onClick={() => islem(() => gorevSil(g.id))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
