"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { tarihYaz } from "@/lib/format";
import { FIYAT_EXCEL_BASLIKLARI, TEDARIKCI_EXCEL_BASLIKLARI, fiyatExceliniCoz, type FiyatExcelSonucu } from "@/lib/fiyatExcel";
import { kalemAnahtari } from "@/lib/tedarikci";
import type { Tedarikci } from "@/lib/tipler";
import { fiyatlariIceAktar, type IceAktarimSonucu } from "../tedarikciler/actions";

const PARCA = 300;

/** Fiyat listesini Excel'den toplu yükleme: önce özet gösterilir, onaydan sonra kaydedilir. */
export function FiyatExceliYukle({ tedarikciler, onKapat }: { tedarikciler: Tedarikci[]; onKapat: () => void }) {
  const router = useRouter();
  const girdi = useRef<HTMLInputElement>(null);
  const [dosyaAdi, setDosyaAdi] = useState("");
  const [cozum, setCozum] = useState<FiyatExcelSonucu | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [ilerleme, setIlerleme] = useState<number | null>(null);
  const [sonuc, setSonuc] = useState<IceAktarimSonucu | null>(null);

  async function dosyaSecildi(dosya: File | undefined) {
    setHata(null);
    setCozum(null);
    setSonuc(null);
    if (!dosya) return;
    setDosyaAdi(dosya.name);
    try {
      const kitap = XLSX.read(await dosya.arrayBuffer(), { type: "array" });
      const sayfalar = kitap.SheetNames.map((ad) => ({
        ad,
        satirlar: XLSX.utils.sheet_to_json<unknown[]>(kitap.Sheets[ad], { header: 1, defval: "", raw: true }),
      }));
      const c = fiyatExceliniCoz(sayfalar);
      if (c.fiyatlar.length === 0 && c.hatalar.length > 0 && c.hatalar[0].startsWith("Başlık")) setHata(c.hatalar[0]);
      else setCozum(c);
    } catch {
      setHata("Dosya okunamadı. Excel (.xlsx) dosyası seçtiğinizden emin olun.");
    }
  }

  async function kaydet() {
    if (!cozum) return;
    setHata(null);
    const toplam: IceAktarimSonucu = { eklenen: 0, guncellenen: 0, atlanan: 0, yeniTedarikci: 0 };
    try {
      for (let bas = 0; bas < cozum.fiyatlar.length; bas += PARCA) {
        setIlerleme(bas);
        const s = await fiyatlariIceAktar(cozum.fiyatlar.slice(bas, bas + PARCA), cozum.tedarikciler);
        if (s.hata !== undefined) {
          setHata(bas > 0 ? `${s.hata} İlk ${bas} satır kaydedildi; dosyayı tekrar yüklerseniz kalanlar eklenir.` : s.hata);
          return;
        }
        toplam.eklenen += s.veri.eklenen;
        toplam.guncellenen += s.veri.guncellenen;
        toplam.atlanan += s.veri.atlanan;
        toplam.yeniTedarikci += s.veri.yeniTedarikci;
      }
      setSonuc(toplam);
      setCozum(null);
      if (girdi.current) girdi.current.value = "";
      router.refresh();
    } finally {
      setIlerleme(null);
    }
  }

  function ornekIndir() {
    const kitap = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      kitap,
      XLSX.utils.aoa_to_sheet([
        [...FIYAT_EXCEL_BASLIKLARI],
        ["Örnek Fermuar", "Fermuar", "T-10 separe 75 cm", "adet", 5.8, "TRY", "hariç", "08.01.2026", "10 gün", "500 adet", "60 gün", ""],
        ["Örnek Etiket", "Dokuma etiket", "4x7 cm marka etiketi", "adet", "1,20-1,30", "TRY", "dahil", "", "", "", "", ""],
      ]),
      "Fiyatlar",
    );
    XLSX.utils.book_append_sheet(
      kitap,
      XLSX.utils.aoa_to_sheet([[...TEDARIKCI_EXCEL_BASLIKLARI], ["Örnek Fermuar", "Ahmet Bey", "0532 000 00 00", "Aksesuar"]]),
      "Tedarikçiler",
    );
    XLSX.writeFile(kitap, "CATION_Fiyat_Listesi_Ornek.xlsx");
  }

  const mevcutAdlar = new Set(tedarikciler.map((t) => kalemAnahtari(t.ad)));
  const tedarikciAdlari = cozum ? Array.from(new Map(cozum.fiyatlar.map((f) => [kalemAnahtari(f.tedarikci), f.tedarikci])).entries()) : [];
  const yeniTedarikciler = tedarikciAdlari.filter(([k]) => !mevcutAdlar.has(k));
  const kalemSayilari = cozum
    ? Array.from(
        cozum.fiyatlar.reduce((m, f) => m.set(f.kalem_adi, (m.get(f.kalem_adi) ?? 0) + 1), new Map<string, number>()).entries(),
      ).sort((a, b) => a[0].localeCompare(b[0], "tr"))
    : [];
  const tarihler = cozum ? cozum.fiyatlar.map((f) => f.fiyat_tarihi).filter((t): t is string => !!t).sort() : [];

  return (
    <section className="kart p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-semibold text-brand-dark">Excel&apos;den fiyat yükle</h2>
          <p className="text-sm text-slate-500">
            Gerekli sütunlar: Tedarikçi, Kalem, Birim fiyat. İsteğe bağlı: Açıklama, Birim, Para birimi, KDV (hariç / dahil /
            belirsiz), Fiyat tarihi, Termin, Min. sipariş, Ödeme vadesi, Not. Listede olmayan tedarikçiler otomatik eklenir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ikincil" onClick={ornekIndir}>
            Örnek dosyayı indir
          </button>
          <label className={`btn-birincil cursor-pointer ${ilerleme != null ? "pointer-events-none opacity-60" : ""}`}>
            Excel dosyası seç
            <input
              ref={girdi}
              type="file"
              accept=".xlsx,.xls"
              className="sr-only"
              aria-label="Fiyat Excel dosyası"
              onChange={(e) => dosyaSecildi(e.target.files?.[0])}
            />
          </label>
          <button type="button" className="btn-ikincil" onClick={onKapat} disabled={ilerleme != null}>
            Kapat
          </button>
        </div>
      </div>

      {hata && <p className="mt-4 text-sm text-red-600">{hata}</p>}

      {sonuc && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {sonuc.eklenen} fiyat eklendi
          {sonuc.guncellenen > 0 && `, ${sonuc.guncellenen} fiyat güncellendi`}
          {sonuc.yeniTedarikci > 0 && `, ${sonuc.yeniTedarikci} yeni tedarikçi oluşturuldu`}.
          {sonuc.atlanan > 0 && ` Listede daha yeni tarihli fiyatı olan veya dosyada tekrar eden ${sonuc.atlanan} satır değiştirilmedi.`}
        </p>
      )}

      {cozum && (
        <div className="mt-4 space-y-3 border-t border-cizgi pt-4 text-sm">
          <p>
            <span className="font-medium">{dosyaAdi}</span>: <span className="rakam">{cozum.fiyatlar.length}</span> fiyat,{" "}
            <span className="rakam">{tedarikciAdlari.length}</span> tedarikçi
            {yeniTedarikciler.length > 0 && (
              <>
                {" "}
                (<span className="rakam">{yeniTedarikciler.length}</span> tanesi yeni eklenecek)
              </>
            )}
            {tarihler.length > 0 && (
              <>
                . Fiyat tarihleri {tarihYaz(tarihler[0])} – {tarihYaz(tarihler[tarihler.length - 1])}
              </>
            )}
            .
          </p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-slate-600 md:grid-cols-3">
            {kalemSayilari.map(([ad, n]) => (
              <li key={ad}>
                {ad}: <span className="rakam">{n}</span>
              </li>
            ))}
          </ul>
          {cozum.hatalar.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
              <p className="mb-1 font-medium">Okunamayan satırlar ({cozum.hatalar.length}) aktarılmayacak:</p>
              <ul className="list-disc space-y-0.5 pl-5">
                {cozum.hatalar.slice(0, 15).map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
                {cozum.hatalar.length > 15 && <li>… ve {cozum.hatalar.length - 15} satır daha</li>}
              </ul>
            </div>
          )}
          <p className="text-slate-500">
            Aynı tedarikçinin aynı kalem ve açıklamayla zaten bir fiyatı varsa, dosyadaki tarih daha yeniyse güncellenir.
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn-birincil" disabled={cozum.fiyatlar.length === 0 || ilerleme != null} onClick={kaydet}>
              {ilerleme != null ? `Kaydediliyor… ${ilerleme} / ${cozum.fiyatlar.length}` : "Onayla & Kaydet"}
            </button>
            <button
              type="button"
              className="btn-ikincil"
              disabled={ilerleme != null}
              onClick={() => {
                setCozum(null);
                if (girdi.current) girdi.current.value = "";
              }}
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
