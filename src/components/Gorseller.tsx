"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { tarayiciIstemcisi } from "@/lib/supabase/client";
import { EN_BUYUK_DOSYA, GORSEL_ON_EKI, SARTNAME_KLASORU, boyutYaz, depoAdi, kucukBoyut } from "@/lib/dosya";
import { gorselAciklamaKaydet, gorselKaydet, gorselSil } from "@/app/(app)/ihaleler/actions";
import type { IhaleGorseli } from "@/lib/tipler";

type Props = {
  ihaleId: string;
  /** Boşsa ihalenin genel görselleri, doluysa o ürünün görselleri */
  urunId: string | null;
  ilkGorseller: IhaleGorseli[];
  /** Ürün kartı içinde daha sade görünüm */
  kompakt?: boolean;
};

/** Ürün fotoğrafı, numune, model çizimi gibi resimler: ekle, büyüt, açıklama yaz, sil. */
export function Gorseller({ ihaleId, urunId, ilkGorseller, kompakt }: Props) {
  const [gorseller, setGorseller] = useState(ilkGorseller);
  const [yukleniyor, setYukleniyor] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [acik, setAcik] = useState<number | null>(null);
  const [surukleniyor, setSurukleniyor] = useState(false);
  const secici = useRef<HTMLInputElement>(null);
  const kamera = useRef<HTMLInputElement>(null);

  async function yukle(liste: FileList | File[] | null) {
    const dosyalar = Array.from(liste ?? []).filter((d) => d.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(d.name));
    if (dosyalar.length === 0) {
      if (liste && Array.from(liste).length > 0) setHata("Sadece resim dosyası eklenebilir (JPG, PNG…).");
      return;
    }
    setHata(null);
    const supabase = tarayiciIstemcisi();
    try {
      for (const asil of dosyalar) {
        setYukleniyor(asil.name);
        const dosya = await kucult(asil);
        if (dosya.size > EN_BUYUK_DOSYA) {
          setHata(`"${asil.name}" 50 MB'tan büyük, yüklenemedi.`);
          continue;
        }
        const tur = dosya.type || "image/jpeg";
        const yol = `${GORSEL_ON_EKI}/${ihaleId}/${crypto.randomUUID()}-${depoAdi(dosya.name)}`;
        const { error } = await supabase.storage.from(SARTNAME_KLASORU).upload(yol, dosya, { contentType: tur, upsert: false });
        if (error) {
          setHata(`"${asil.name}" yüklenemedi: ${error.message}`);
          continue;
        }
        const s = await gorselKaydet({ ihaleId, urunId, ad: asil.name, yol, boyut: dosya.size, tur });
        if (s.hata !== undefined) {
          setHata(s.hata);
          continue;
        }
        setGorseller((l) => [...l, s.veri]);
      }
    } finally {
      setYukleniyor(null);
      if (secici.current) secici.current.value = "";
      if (kamera.current) kamera.current.value = "";
    }
  }

  async function sil(g: IhaleGorseli) {
    if (!confirm("Bu görsel silinsin mi?")) return;
    setHata(null);
    const s = await gorselSil(g.id);
    if (s.hata !== undefined) return setHata(s.hata);
    setGorseller((l) => l.filter((x) => x.id !== g.id));
    setAcik(null);
  }

  async function aciklamaKaydet(g: IhaleGorseli, aciklama: string) {
    if (aciklama.trim() === g.aciklama) return;
    const s = await gorselAciklamaKaydet(g.id, aciklama);
    if (s.hata !== undefined) return setHata(s.hata);
    setGorseller((l) => l.map((x) => (x.id === g.id ? { ...x, aciklama: aciklama.trim() } : x)));
  }

  return (
    <div
      className={`rounded-lg transition ${surukleniyor ? "bg-brand-soft ring-2 ring-brand/30" : ""}`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setSurukleniyor(true);
      }}
      onDragLeave={() => setSurukleniyor(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSurukleniyor(false);
        yukle(e.dataTransfer.files);
      }}
    >
      {gorseller.length > 0 && (
        <ul className={`grid gap-2 ${kompakt ? "mb-2 grid-cols-4 sm:grid-cols-6" : "mb-3 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6"}`}>
          {gorseller.map((g, i) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => setAcik(i)}
                className="group relative block aspect-square w-full overflow-hidden rounded-lg border border-cizgi bg-zemin"
                title={g.aciklama || g.ad}
              >
                {g.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.url} alt={g.aciklama || g.ad} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <span className="flex h-full items-center justify-center p-1 text-center text-[11px] text-slate-500">Sayfayı yenileyin</span>
                )}
                {g.aciklama && !kompakt && (
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-0.5 text-left text-[11px] text-white">
                    {g.aciklama}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className={`btn-ikincil cursor-pointer ${kompakt ? "btn-kucuk py-1.5" : ""} ${yukleniyor ? "pointer-events-none opacity-60" : ""}`}>
          {yukleniyor ? "Yükleniyor…" : "+ Görsel ekle"}
          <input
            ref={secici}
            type="file"
            multiple
            accept="image/*"
            className="sr-only"
            aria-label={urunId ? "Ürün görseli ekle" : "İhale görseli ekle"}
            disabled={Boolean(yukleniyor)}
            onChange={(e) => yukle(e.target.files)}
          />
        </label>
        {/* Telefonda doğrudan kamerayı açar */}
        <label className={`btn-ikincil cursor-pointer md:hidden ${kompakt ? "btn-kucuk py-1.5" : ""} ${yukleniyor ? "pointer-events-none opacity-60" : ""}`}>
          Fotoğraf çek
          <input
            ref={kamera}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            aria-label="Fotoğraf çek"
            disabled={Boolean(yukleniyor)}
            onChange={(e) => yukle(e.target.files)}
          />
        </label>
        {yukleniyor && <span className="min-w-0 truncate text-xs text-slate-500">{yukleniyor}</span>}
        {!yukleniyor && !kompakt && gorseller.length === 0 && (
          <span className="hidden text-sm text-slate-500 md:inline">Resimleri buraya sürükleyip bırakabilirsiniz.</span>
        )}
      </div>
      {hata && <p className="mt-2 text-sm text-red-600">{hata}</p>}

      {acik != null && gorseller[acik] && (
        <Buyutec
          gorseller={gorseller}
          sira={acik}
          onSira={setAcik}
          onKapat={() => setAcik(null)}
          onSil={sil}
          onAciklama={aciklamaKaydet}
        />
      )}
    </div>
  );
}

/** Tam ekran görünüm: önceki / sonraki, açıklama, sil */
function Buyutec({
  gorseller,
  sira,
  onSira,
  onKapat,
  onSil,
  onAciklama,
}: {
  gorseller: IhaleGorseli[];
  sira: number;
  onSira: (i: number) => void;
  onKapat: () => void;
  onSil: (g: IhaleGorseli) => void;
  onAciklama: (g: IhaleGorseli, aciklama: string) => void;
}) {
  const g = gorseller[sira];
  const [aciklama, setAciklama] = useState(g.aciklama);
  const dokunmaBasi = useRef<number | null>(null);
  const adet = gorseller.length;

  useEffect(() => setAciklama(g.aciklama), [g.id, g.aciklama]);

  const git = useCallback((yon: number) => onSira((sira + yon + adet) % adet), [sira, adet, onSira]);

  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "Escape") onKapat();
      if (e.key === "ArrowRight") git(1);
      if (e.key === "ArrowLeft") git(-1);
    };
    window.addEventListener("keydown", tus);
    const eski = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", tus);
      document.body.style.overflow = eski;
    };
  }, [git, onKapat]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Görsel">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <span className="rakam text-white/70">
          {sira + 1} / {adet}
        </span>
        <div className="flex items-center gap-2">
          {g.url && (
            <a href={g.url} target="_blank" rel="noopener" className="rounded-lg px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white">
              Aç
            </a>
          )}
          <button type="button" onClick={() => onSil(g)} className="rounded-lg px-3 py-1.5 text-red-300 hover:bg-white/10 hover:text-red-200">
            Sil
          </button>
          <button type="button" onClick={onKapat} aria-label="Kapat" className="rounded-lg p-1.5 hover:bg-white/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2"
        onClick={(e) => e.target === e.currentTarget && onKapat()}
        onTouchStart={(e) => (dokunmaBasi.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (dokunmaBasi.current == null) return;
          const fark = e.changedTouches[0].clientX - dokunmaBasi.current;
          dokunmaBasi.current = null;
          if (Math.abs(fark) > 50 && adet > 1) git(fark < 0 ? 1 : -1);
        }}
      >
        {g.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={g.url} alt={g.aciklama || g.ad} className="max-h-full max-w-full select-none object-contain" />
        ) : (
          <p className="text-white/70">Görsel açılamadı, sayfayı yenileyin.</p>
        )}
        {adet > 1 && (
          <>
            <button
              type="button"
              onClick={() => git(-1)}
              aria-label="Önceki görsel"
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/40 p-2 hover:bg-black/60 sm:block"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => git(1)}
              aria-label="Sonraki görsel"
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/40 p-2 hover:bg-black/60 sm:block"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </>
        )}
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 pb-5 pt-3">
        <input
          value={aciklama}
          onChange={(e) => setAciklama(e.target.value)}
          onBlur={() => onAciklama(g, aciklama)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          placeholder="Açıklama yazın (ör. ön görünüm, numune, logo yeri)"
          aria-label="Görsel açıklaması"
          maxLength={300}
          className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-base text-white outline-none placeholder:text-white/50 focus:border-white/50 sm:text-sm"
        />
        <div className="mt-1 truncate text-xs text-white/50">
          {g.ad} · {boyutYaz(g.boyut)}
        </div>
      </div>
    </div>
  );
}

/**
 * Telefon fotoğrafları çoğu zaman 3-10 MB olur; yüklemeden önce uzun kenarı 2000 piksele indirilip JPEG yapılır.
 * Tarayıcı resmi açamazsa (ör. bazı HEIC dosyaları) dosya olduğu gibi yüklenir.
 */
async function kucult(dosya: File): Promise<File> {
  if (dosya.type === "image/gif" || dosya.type === "image/svg+xml") return dosya;
  try {
    const resim = await createImageBitmap(dosya, { imageOrientation: "from-image" });
    const { genislik, yukseklik } = kucukBoyut(resim.width, resim.height);
    const kucukMu = genislik < resim.width;
    // Zaten küçük ve sıkıştırılmış bir JPEG ise dokunma
    if (!kucukMu && dosya.type === "image/jpeg" && dosya.size < 1.5 * 1024 * 1024) {
      resim.close();
      return dosya;
    }
    const tuval = document.createElement("canvas");
    tuval.width = genislik;
    tuval.height = yukseklik;
    const ciz = tuval.getContext("2d");
    if (!ciz) return dosya;
    ciz.fillStyle = "#ffffff"; // saydam PNG'ler siyah çıkmasın
    ciz.fillRect(0, 0, genislik, yukseklik);
    ciz.drawImage(resim, 0, 0, genislik, yukseklik);
    resim.close();
    const blob = await new Promise<Blob | null>((coz) => tuval.toBlob(coz, "image/jpeg", 0.85));
    if (!blob || blob.size >= dosya.size) return dosya;
    const ad = dosya.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], ad, { type: "image/jpeg" });
  } catch {
    return dosya;
  }
}
