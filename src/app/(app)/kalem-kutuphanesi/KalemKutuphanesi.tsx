"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { URUN_GRUPLARI, BIRIMLER, urunGrubuAdi } from "@/lib/sabitler";
import { paraYaz, sayiYaz } from "@/lib/format";
import { EXCEL_BASLIKLARI, sayfalariCoz, type CozumSonucu } from "@/lib/kalemExcel";
import { SayiGirdisi } from "@/components/SayiGirdisi";
import type { KalemSablonu } from "@/lib/tipler";
import { sablonKaydet, sablonSil, sablonlariIceAktar } from "./actions";

export function KalemKutuphanesi({ sablonlar }: { sablonlar: KalemSablonu[] }) {
  const router = useRouter();
  const [grup, setGrup] = useState<string>(URUN_GRUPLARI[0].kod);
  const [duzenlenen, setDuzenlenen] = useState<string | "yeni" | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const gruptakiler = sablonlar.filter((s) => s.urun_grubu === grup);
  const zorunlular = gruptakiler.filter((s) => s.zorunlu);
  const opsiyoneller = gruptakiler.filter((s) => !s.zorunlu);

  async function sil(s: KalemSablonu) {
    if (!confirm(`"${s.ad}" kütüphaneden silinsin mi? Mevcut ihalelerdeki kalemler etkilenmez.`)) return;
    const sonuc = await sablonSil(s.id);
    if (sonuc.hata !== undefined) setHata(sonuc.hata);
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      <ExcelAktarimi toplam={sablonlar.length} />

      <div className="kart">
        <div className="flex flex-wrap gap-1 border-b border-cizgi px-4 pt-3">
          {URUN_GRUPLARI.map((g) => {
            const sayi = sablonlar.filter((s) => s.urun_grubu === g.kod).length;
            return (
              <button
                key={g.kod}
                type="button"
                onClick={() => {
                  setGrup(g.kod);
                  setDuzenlenen(null);
                }}
                className={`-mb-px rounded-t-lg border-b-2 px-3 py-2 text-sm ${
                  grup === g.kod ? "border-brand font-medium text-brand" : "border-transparent text-slate-600 hover:text-brand-dark"
                }`}
              >
                {g.ad} <span className="rakam text-xs text-slate-400">{sayi}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-6 p-6">
          {hata && <p className="text-sm text-red-600">{hata}</p>}
          {[
            { baslik: "Zorunlu kalemler", liste: zorunlular },
            { baslik: "Opsiyonel kalemler", liste: opsiyoneller },
          ].map(({ baslik, liste }) => (
            <div key={baslik}>
              <h3 className="mb-2 text-sm font-semibold text-brand-dark">
                {baslik} <span className="rakam font-normal text-slate-400">({liste.length})</span>
              </h3>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500">
                  <tr>
                    <th className="pb-2 font-medium">Kalem</th>
                    <th className="w-24 pb-2 font-medium">Birim</th>
                    <th className="w-28 pb-2 text-right font-medium">Kullanım</th>
                    <th className="w-32 pb-2 text-right font-medium">Birim fiyat</th>
                    <th className="pb-2 pl-4 font-medium">Anahtar kelimeler</th>
                    <th className="w-36 pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {liste.map((s) =>
                    duzenlenen === s.id ? (
                      <SablonFormu
                        key={s.id}
                        sablon={s}
                        grup={grup}
                        onBitti={() => {
                          setDuzenlenen(null);
                          router.refresh();
                        }}
                      />
                    ) : (
                      <tr key={s.id} className="border-t border-cizgi">
                        <td className="py-2">{s.ad}</td>
                        <td className="py-2 text-slate-600">{s.birim}</td>
                        <td className="rakam py-2 text-right">{sayiYaz(s.varsayilan_kullanim) || "—"}</td>
                        <td className="rakam py-2 text-right">
                          {s.varsayilan_birim_fiyat == null ? "—" : paraYaz(s.varsayilan_birim_fiyat)}
                        </td>
                        <td className="py-2 pl-4 text-xs text-slate-500">{s.anahtar_kelimeler.join(", ")}</td>
                        <td className="py-2 text-right">
                          <button type="button" className="mr-3 text-brand hover:underline" onClick={() => setDuzenlenen(s.id)}>
                            Düzenle
                          </button>
                          <button type="button" className="text-red-600 hover:underline" onClick={() => sil(s)}>
                            Sil
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                  {liste.length === 0 && (
                    <tr>
                      <td colSpan={6} className="border-t border-cizgi py-3 text-slate-500">
                        Kalem yok.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}

          {duzenlenen === "yeni" ? (
            <table className="w-full text-sm">
              <tbody>
                <SablonFormu
                  grup={grup}
                  onBitti={() => {
                    setDuzenlenen(null);
                    router.refresh();
                  }}
                />
              </tbody>
            </table>
          ) : (
            <button type="button" className="btn-ikincil" onClick={() => setDuzenlenen("yeni")}>
              + {urunGrubuAdi(grup)} için kalem ekle
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SablonFormu({ sablon, grup, onBitti }: { sablon?: KalemSablonu; grup: string; onBitti: () => void }) {
  const [ad, setAd] = useState(sablon?.ad ?? "");
  const [zorunlu, setZorunlu] = useState(sablon?.zorunlu ?? false);
  const [birim, setBirim] = useState(sablon?.birim ?? "adet");
  const [kullanim, setKullanim] = useState<number | null>(sablon?.varsayilan_kullanim ?? null);
  const [fiyat, setFiyat] = useState<number | null>(sablon?.varsayilan_birim_fiyat ?? null);
  const [kelimeler, setKelimeler] = useState(sablon?.anahtar_kelimeler.join(", ") ?? "");
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  async function kaydet() {
    setKaydediliyor(true);
    const s = await sablonKaydet(sablon?.id ?? null, {
      urun_grubu: grup,
      ad,
      zorunlu,
      birim,
      varsayilan_kullanim: kullanim,
      varsayilan_birim_fiyat: fiyat,
      anahtar_kelimeler: kelimeler.split(",").map((k) => k.trim()).filter(Boolean),
    });
    setKaydediliyor(false);
    if (s.hata !== undefined) setHata(s.hata);
    else onBitti();
  }

  return (
    <tr className="border-t border-cizgi bg-zemin/60 align-top">
      <td className="py-2 pr-2">
        <input aria-label="Kalem adı" value={ad} onChange={(e) => setAd(e.target.value)} className="girdi py-1.5" placeholder="Kalem adı" />
        <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={zorunlu} onChange={(e) => setZorunlu(e.target.checked)} className="accent-brand" />
          Zorunlu kalem
        </label>
        {hata && <p className="mt-1 text-xs text-red-600">{hata}</p>}
      </td>
      <td className="py-2 pr-2">
        <select aria-label="Birim" value={birim} onChange={(e) => setBirim(e.target.value)} className="girdi py-1.5">
          {Array.from(new Set([...BIRIMLER, birim])).map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-2">
        <SayiGirdisi deger={kullanim} onDeger={setKullanim} className="girdi-sayi py-1.5" ariaLabel="Varsayılan kullanım" />
      </td>
      <td className="py-2 pr-2">
        <SayiGirdisi deger={fiyat} onDeger={setFiyat} className="girdi-sayi py-1.5" ariaLabel="Varsayılan birim fiyat" />
      </td>
      <td className="py-2 pl-4 pr-2">
        <input aria-label="Anahtar kelimeler" value={kelimeler} onChange={(e) => setKelimeler(e.target.value)} className="girdi py-1.5" placeholder="virgülle ayırın" />
      </td>
      <td className="py-2 text-right">
        <button type="button" className="btn-birincil btn-kucuk mr-2" disabled={kaydediliyor || !ad.trim()} onClick={kaydet}>
          Kaydet
        </button>
        <button type="button" className="btn-ikincil btn-kucuk" onClick={onBitti}>
          Vazgeç
        </button>
      </td>
    </tr>
  );
}

function ExcelAktarimi({ toplam }: { toplam: number }) {
  const router = useRouter();
  const dosyaGirdisi = useRef<HTMLInputElement>(null);
  const [dosyaAdi, setDosyaAdi] = useState("");
  const [cozum, setCozum] = useState<CozumSonucu | null>(null);
  const [mesaj, setMesaj] = useState<{ tur: "hata" | "basari"; metin: string } | null>(null);
  const [aktariliyor, setAktariliyor] = useState(false);

  async function dosyaSecildi(dosya: File | undefined) {
    setMesaj(null);
    setCozum(null);
    if (!dosya) return;
    setDosyaAdi(dosya.name);
    try {
      const kitap = XLSX.read(await dosya.arrayBuffer(), { type: "array" });
      const sayfalar = kitap.SheetNames.map((ad) => ({
        ad,
        satirlar: XLSX.utils.sheet_to_json<unknown[]>(kitap.Sheets[ad], { header: 1, defval: "" }),
      }));
      setCozum(sayfalariCoz(sayfalar));
    } catch {
      setMesaj({ tur: "hata", metin: "Dosya okunamadı. Excel (.xlsx) dosyası seçtiğinizden emin olun." });
    }
  }

  async function aktar(mod: "ekle" | "degistir") {
    if (!cozum) return;
    if (
      mod === "degistir" &&
      !confirm(`Kütüphanedeki ${toplam} kalem silinip yerine Excel'deki ${cozum.satirlar.length} kalem yazılacak. Bu işlem geri alınamaz. Devam edilsin mi?`)
    ) {
      return;
    }
    setAktariliyor(true);
    const s = await sablonlariIceAktar(cozum.satirlar, mod);
    setAktariliyor(false);
    if (s.hata !== undefined) return setMesaj({ tur: "hata", metin: s.hata });
    setMesaj({
      tur: "basari",
      metin:
        `${s.veri.eklenen} kalem kütüphaneye aktarıldı.` +
        (s.veri.atlanan > 0 ? ` Kütüphanede zaten olan ${s.veri.atlanan} kalem tekrar eklenmedi.` : ""),
    });
    setCozum(null);
    setDosyaAdi("");
    if (dosyaGirdisi.current) dosyaGirdisi.current.value = "";
    router.refresh();
  }

  function ornekIndir() {
    const ornek: (string | number)[][] = [
      [...EXCEL_BASLIKLARI],
      ["Mont-Kaban", "Ana kumaş", "Zorunlu", "m", 1.8, "", ""],
      ["Mont-Kaban", "Reflektör şerit", "Opsiyonel", "m", 1.2, "", "reflektör, EN ISO 20471"],
      ["Tişört-Polo", "Nakış", "Opsiyonel", "adet", 1, "", "nakış, logo"],
    ];
    const kitap = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(kitap, XLSX.utils.aoa_to_sheet(ornek), "Kalemler");
    XLSX.writeFile(kitap, "CATION_Kalem_Sablon_Ornek.xlsx");
  }

  const ozet = cozum
    ? URUN_GRUPLARI.map((g) => ({
        ad: g.ad,
        zorunlu: cozum.satirlar.filter((s) => s.urun_grubu === g.kod && s.zorunlu).length,
        opsiyonel: cozum.satirlar.filter((s) => s.urun_grubu === g.kod && !s.zorunlu).length,
      })).filter((g) => g.zorunlu + g.opsiyonel > 0)
    : [];

  return (
    <section className="kart p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-brand-dark">Excel&apos;den yükle</h2>
          <p className="text-sm text-slate-500">
            Her ürün grubu ayrı sayfada olabilir (sayfa adı ürün grubu olur) ya da tek sayfada &quot;Ürün Grubu&quot; sütunuyla. Gerekli sütunlar: Kalem Adı ve Zorunlu/Opsiyonel.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ikincil" onClick={ornekIndir}>
            Örnek dosyayı indir
          </button>
          <label className="btn-birincil cursor-pointer">
            Excel dosyası seç
            <input
              ref={dosyaGirdisi}
              type="file"
              accept=".xlsx,.xls"
              className="sr-only"
              onChange={(e) => dosyaSecildi(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      {mesaj && (
        <p className={`mt-4 text-sm ${mesaj.tur === "hata" ? "text-red-600" : "text-green-700"}`}>{mesaj.metin}</p>
      )}

      {cozum && (
        <div className="mt-4 space-y-3 border-t border-cizgi pt-4 text-sm">
          <p>
            <span className="font-medium">{dosyaAdi}</span>: {cozum.satirlar.length} kalem okundu.
          </p>
          {ozet.length > 0 && (
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-slate-600 md:grid-cols-3">
              {ozet.map((g) => (
                <li key={g.ad}>
                  {g.ad}: <span className="rakam">{g.zorunlu}</span> zorunlu, <span className="rakam">{g.opsiyonel}</span> opsiyonel
                </li>
              ))}
            </ul>
          )}
          {cozum.hatalar.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
              <p className="mb-1 font-medium">Okunamayan satırlar ({cozum.hatalar.length}) aktarılmayacak:</p>
              <ul className="list-disc space-y-0.5 pl-5">
                {cozum.hatalar.slice(0, 20).map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
                {cozum.hatalar.length > 20 && <li>… ve {cozum.hatalar.length - 20} satır daha</li>}
              </ul>
            </div>
          )}
          {cozum.satirlar.length > 0 && (
            <div className="flex gap-2">
              <button type="button" className="btn-birincil" disabled={aktariliyor} onClick={() => aktar("ekle")}>
                Mevcut kütüphaneye ekle
              </button>
              <button type="button" className="btn-tehlike" disabled={aktariliyor} onClick={() => aktar("degistir")}>
                Kütüphaneyi bununla değiştir
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
