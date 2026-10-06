// Tedarikçi fiyat listesini Excel'den okuma. Dosya tarayıcıda okunur, satırlar sunucuya gönderilir.

import { sadelestir } from "./kalemExcel";
import { sayiOku } from "./format";
import type { KdvDurumu } from "./tedarikci";

export const FIYAT_EXCEL_BASLIKLARI = [
  "Tedarikçi",
  "Kalem",
  "Açıklama",
  "Birim",
  "Birim fiyat",
  "Para birimi",
  "KDV",
  "Fiyat tarihi",
  "Termin",
  "Min. sipariş",
  "Ödeme vadesi",
  "Not",
] as const;

export const TEDARIKCI_EXCEL_BASLIKLARI = ["Tedarikçi", "Yetkili", "Telefon", "Kategori"] as const;

export type FiyatSatiri = {
  tedarikci: string;
  kalem_adi: string;
  aciklama: string;
  birim: string;
  /** Dosyada yazdığı haliyle: "165", "160-165" */
  fiyatMetni: string;
  para_birimi: "TRY" | "USD" | "EUR";
  kdv_durumu: KdvDurumu;
  /** YYYY-MM-DD; boşsa bugün */
  fiyat_tarihi: string | null;
  termin: string;
  min_siparis: string;
  odeme_vadesi: string;
  notlar: string;
};

export type TedarikciSatiri = { ad: string; yetkili: string; telefon: string; kategori: string };

export type FiyatExcelSonucu = {
  fiyatlar: FiyatSatiri[];
  tedarikciler: TedarikciSatiri[];
  hatalar: string[];
};

type Alan = keyof Omit<FiyatSatiri, "fiyatMetni"> | "fiyat";

const FIYAT_BASLIKLARI: Record<Alan, string[]> = {
  tedarikci: ["tedarikci", "tedarikciadi", "firma", "cari", "cariadi"],
  kalem_adi: ["kalem", "kalemadi", "urun", "malzeme"],
  aciklama: ["aciklama", "urunaciklama", "detay", "ozellik"],
  birim: ["birim", "olcubirimi"],
  fiyat: ["birimfiyat", "fiyat", "birimfiyati", "fiyati"],
  para_birimi: ["parabirimi", "doviz", "kur", "para"],
  kdv_durumu: ["kdv", "kdvdurumu"],
  fiyat_tarihi: ["fiyattarihi", "tarih"],
  termin: ["termin", "teslimsuresi"],
  min_siparis: ["minsiparis", "minimumsiparis", "moq"],
  odeme_vadesi: ["odemevadesi", "vade"],
  notlar: ["not", "notlar"],
};

const TEDARIKCI_BASLIKLARI: Record<keyof TedarikciSatiri, string[]> = {
  ad: ["tedarikci", "tedarikciadi", "firma", "ad", "cari"],
  yetkili: ["yetkili", "yetkilikisi", "ilgili"],
  telefon: ["telefon", "tel", "gsm", "cep"],
  kategori: ["kategori", "tur"],
};

function sutunlariBul<K extends string>(baslik: unknown[], eslesmeler: Record<K, string[]>): Partial<Record<K, number>> {
  const sade = baslik.map((h) => sadelestir(String(h ?? "")));
  const sonuc: Partial<Record<K, number>> = {};
  for (const alan of Object.keys(eslesmeler) as K[]) {
    const i = sade.findIndex((h, idx) => eslesmeler[alan].includes(h) && !Object.values(sonuc).includes(idx));
    if (i >= 0) sonuc[alan] = i;
  }
  return sonuc;
}

const metin = (v: unknown) => (v == null ? "" : String(v).trim());

function paraBirimiOku(v: unknown): FiyatSatiri["para_birimi"] | null {
  const s = sadelestir(metin(v));
  if (!s || ["try", "tl", "tr"].includes(s) || metin(v) === "₺") return "TRY";
  if (["usd", "dolar"].includes(s) || metin(v) === "$") return "USD";
  if (["eur", "euro", "avro"].includes(s) || metin(v) === "€") return "EUR";
  return null;
}

function kdvOku(v: unknown): KdvDurumu | null {
  const s = sadelestir(metin(v));
  if (!s || s.includes("haric") || s === "h") return "haric";
  if (s.includes("dahil") || s === "d") return "dahil";
  if (s.startsWith("belirsiz") || s.startsWith("belirtil") || s === "bilinmiyor") return "belirsiz";
  return null;
}

/** "24.01.2026", "2026-01-24", Excel tarih sayısı veya Date → YYYY-MM-DD */
export function tarihOku(v: unknown): string | null | "hata" {
  if (v == null || v === "") return null;
  const iki = (n: number) => String(n).padStart(2, "0");
  const gecerli = (y: number, a: number, g: number) => {
    const d = new Date(Date.UTC(y, a - 1, g));
    return d.getUTCFullYear() === y && d.getUTCMonth() === a - 1 && d.getUTCDate() === g && y > 2000 && y < 2100
      ? `${y}-${iki(a)}-${iki(g)}`
      : "hata";
  };
  if (v instanceof Date) return gecerli(v.getFullYear(), v.getMonth() + 1, v.getDate());
  if (typeof v === "number") {
    // Excel gün sayısı (1900 sistemi)
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000);
    return gecerli(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return gecerli(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[./,-](\d{1,2})[./,-](\d{4})$/);
  if (m) return gecerli(+m[3], +m[2], +m[1]);
  return "hata";
}

function fiyatMetniOku(v: unknown): string | null {
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 ? String(v).replace(".", ",") : null;
  const s = metin(v).replace(/[₺$€]|tl/gi, "").trim();
  if (!s) return null;
  const parcalar = s.split(/\s*[-–—]\s*/);
  if (parcalar.length > 2 || parcalar.some((p) => sayiOku(p) == null || Number.isNaN(sayiOku(p)))) return null;
  return s;
}

/**
 * "Fiyatlar" sayfası (veya ilk sayfa) zorunlu; "Tedarikçiler" sayfası varsa yetkili/telefon/kategori oradan alınır.
 * Okunamayan satırlar atlanır ve hatalar listesinde gösterilir.
 */
export function fiyatExceliniCoz(sayfalar: { ad: string; satirlar: unknown[][] }[]): FiyatExcelSonucu {
  const hatalar: string[] = [];
  const tedarikciSayfasi = sayfalar.find((s) => sadelestir(s.ad).startsWith("tedarikci"));
  const fiyatSayfasi =
    sayfalar.find((s) => sadelestir(s.ad).startsWith("fiyat")) ?? sayfalar.find((s) => s !== tedarikciSayfasi);
  if (!fiyatSayfasi) return { fiyatlar: [], tedarikciler: [], hatalar: ["Dosyada sayfa bulunamadı."] };

  // Başlık satırı: ilk 10 satırda Tedarikçi + Kalem + Fiyat sütunları olan satır
  const bi = fiyatSayfasi.satirlar.slice(0, 10).findIndex((r) => {
    const s = sutunlariBul(r, FIYAT_BASLIKLARI);
    return s.tedarikci != null && s.kalem_adi != null && s.fiyat != null;
  });
  if (bi < 0) {
    return {
      fiyatlar: [],
      tedarikciler: [],
      hatalar: ["Başlık satırı bulunamadı. En az Tedarikçi, Kalem ve Birim fiyat sütunları olmalı."],
    };
  }
  const s = sutunlariBul(fiyatSayfasi.satirlar[bi], FIYAT_BASLIKLARI);
  const al = (r: unknown[], alan: Alan) => (s[alan] == null ? "" : r[s[alan]!]);

  const fiyatlar: FiyatSatiri[] = [];
  fiyatSayfasi.satirlar.slice(bi + 1).forEach((r, i) => {
    const satirNo = bi + i + 2;
    if (!r || r.every((c) => metin(c) === "")) return;
    const tedarikci = metin(al(r, "tedarikci"));
    const kalem = metin(al(r, "kalem_adi"));
    const fiyatMetni = fiyatMetniOku(al(r, "fiyat"));
    const para = paraBirimiOku(al(r, "para_birimi"));
    const kdv = kdvOku(al(r, "kdv_durumu"));
    const tarih = tarihOku(al(r, "fiyat_tarihi"));
    const sorun = !tedarikci
      ? "tedarikçi boş"
      : !kalem
        ? "kalem boş"
        : fiyatMetni == null
          ? "fiyat okunamadı"
          : para == null
            ? "para birimi TRY, USD veya EUR olmalı"
            : kdv == null
              ? "KDV hariç, dahil veya belirsiz olmalı"
              : tarih === "hata"
                ? "tarih okunamadı (gg.aa.yyyy yazın)"
                : null;
    if (sorun) {
      hatalar.push(`Satır ${satirNo}: ${sorun}${kalem ? ` (${kalem})` : ""}`);
      return;
    }
    fiyatlar.push({
      tedarikci,
      kalem_adi: kalem,
      aciklama: metin(al(r, "aciklama")),
      birim: metin(al(r, "birim")) || "adet",
      fiyatMetni: fiyatMetni!,
      para_birimi: para!,
      kdv_durumu: kdv!,
      fiyat_tarihi: tarih as string | null,
      termin: metin(al(r, "termin")),
      min_siparis: metin(al(r, "min_siparis")),
      odeme_vadesi: metin(al(r, "odeme_vadesi")),
      notlar: metin(al(r, "notlar")),
    });
  });

  const tedarikciler: TedarikciSatiri[] = [];
  if (tedarikciSayfasi && tedarikciSayfasi.satirlar.length > 1) {
    const t = sutunlariBul(tedarikciSayfasi.satirlar[0], TEDARIKCI_BASLIKLARI);
    if (t.ad != null) {
      for (const r of tedarikciSayfasi.satirlar.slice(1)) {
        const ad = metin(r[t.ad]);
        if (!ad) continue;
        const v = (k: keyof TedarikciSatiri) => (t[k] == null ? "" : metin(r[t[k]!]));
        tedarikciler.push({ ad, yetkili: v("yetkili"), telefon: v("telefon"), kategori: v("kategori") });
      }
    }
  }
  return { fiyatlar, tedarikciler, hatalar };
}
