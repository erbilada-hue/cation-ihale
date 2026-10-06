// Tedarikçi fiyat listesi yardımcıları. Sistem tedarikçiye kendi başına mesaj atmaz;
// burada sadece kullanıcının kopyalayıp göndereceği metin hazırlanır.

import { sadelestir } from "./kalemExcel";
import { fiyatYaz, kurusaYuvarlaGoster, sayiOku } from "./format";
import type { Kurlar } from "./maliyetGirdisi";

/** Bu kadar günden eski fiyatlar "güncel değil" sayılır */
export const ESKI_FIYAT_GUN = 14;

export const TEDARIKCI_KATEGORILERI = [
  "Kumaş",
  "Aksesuar",
  "Fason",
  "Baskı-Nakış",
  "Ambalaj",
  "Nakliye",
  "Diğer",
] as const;

export type KdvDurumu = "haric" | "dahil" | "belirsiz";

export const KDV_DURUMLARI: { kod: KdvDurumu; ad: string }[] = [
  { kod: "haric", ad: "KDV hariç" },
  { kod: "dahil", ad: "KDV dahil" },
  { kod: "belirsiz", ad: "Belirtilmedi" },
];

/** Kalem adlarını eşleştirmek için: büyük/küçük harf, Türkçe harf ve boşluk farkı önemsiz */
export function kalemAnahtari(ad: string): string {
  return sadelestir(ad);
}

/** Bugünden geriye kaç gün önce (Türkiye saatiyle) */
export function gunFarki(tarih: string | Date, bugun: Date = new Date()): number {
  const g = (d: Date) => {
    const [y, a, gun] = d.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" }).split("-").map(Number);
    return Date.UTC(y, a - 1, gun);
  };
  const t = typeof tarih === "string" ? new Date(tarih.length === 10 ? tarih + "T12:00:00+03:00" : tarih) : tarih;
  return Math.round((g(bugun) - g(t)) / 86_400_000);
}

export function eskiMi(fiyatTarihi: string, bugun: Date = new Date()): boolean {
  return gunFarki(fiyatTarihi, bugun) > ESKI_FIYAT_GUN;
}

// ---------------------------------------------------------------------------
// Tedarikçi cevabındaki fiyatı okuma
// ---------------------------------------------------------------------------

export type FiyatOkuma =
  | { hata: string }
  | {
      hata?: undefined;
      /** Kaydedilecek KDV hariç fiyat */
      fiyat: number;
      /** Kullanıcıya gösterilecek açıklamalar (aralık, KDV ayrımı) */
      notlar: string[];
      /** Sarı uyarı: KDV durumu belirsiz */
      kdvBelirsiz: boolean;
    };

/**
 * "165", "165,50", "160-165" gibi yazımları okur.
 * Aralık gelirse ortalama alınır; KDV dahil gelirse KDV ayrılır.
 */
export function tedarikciFiyatiOku(metin: string, kdvDurumu: KdvDurumu, kdvOrani: number): FiyatOkuma {
  const temiz = metin.trim();
  if (!temiz) return { hata: "Fiyatı yazın." };

  const notlar: string[] = [];
  let ham: number;
  const aralik = temiz.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (aralik) {
    const a = sayiOku(aralik[1]);
    const b = sayiOku(aralik[2]);
    if (a == null || b == null || Number.isNaN(a) || Number.isNaN(b)) return { hata: "Fiyat okunamadı." };
    ham = (a + b) / 2;
    notlar.push(`Fiyat aralık olarak geldi (${aralik[1].trim()} – ${aralik[2].trim()}); ortalaması alındı.`);
  } else {
    const n = sayiOku(temiz);
    if (n == null || Number.isNaN(n)) return { hata: "Fiyat okunamadı." };
    ham = n;
  }
  if (ham < 0) return { hata: "Fiyat negatif olamaz." };

  let fiyat = ham;
  if (kdvDurumu === "dahil") {
    fiyat = ham / (1 + kdvOrani / 100);
    notlar.push(
      `KDV dahil geldi; %${kdvOrani} KDV ayrıldı (${kurusaYuvarlaGoster(ham)} ÷ ${kurusaYuvarlaGoster(1 + kdvOrani / 100)}).`,
    );
  }
  return { fiyat: Math.round(fiyat * 10_000) / 10_000, notlar, kdvBelirsiz: kdvDurumu === "belirsiz" };
}

// ---------------------------------------------------------------------------
// WhatsApp mesaj şablonu
// ---------------------------------------------------------------------------

export type MesajKalemi = { kalem_adi: string; aciklama: string; birim: string };

export function fiyatTalebiMesaji(girdi: {
  firmaAdi: string;
  yetkili: string;
  kalemler: MesajKalemi[];
}): string {
  const selam = girdi.yetkili.trim() ? `Merhaba ${girdi.yetkili.trim()},` : "Merhaba,";
  const firma = girdi.firmaAdi.trim() || "firmamız";
  const satirlar = girdi.kalemler.map((k) => {
    const aciklama = k.aciklama.trim() ? ` (${k.aciklama.trim()})` : "";
    return `• ${k.kalem_adi}${aciklama} – birim: ${k.birim}`;
  });
  return [
    selam,
    `${firma} olarak aşağıdaki ürünler için güncel birim fiyatınızı rica ederiz:`,
    "",
    ...satirlar,
    "",
    "Fiyatın KDV hariç mi dahil mi olduğunu, termin süresini, minimum sipariş miktarını ve ödeme vadesini de yazabilir misiniz?",
    "Teşekkürler.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Karşılaştırma ve maliyet tablosuna fiyat seçimi
// ---------------------------------------------------------------------------

export type KarsilastirilanFiyat = {
  id: string;
  fiyat: number;
  para_birimi: string;
  fiyat_tarihi: string;
};

/** Fiyatın TL karşılığı; kur girilmemişse null */
export function tlKarsiligi(f: { fiyat: number; para_birimi: string }, kurlar: Kurlar): number | null {
  if (f.para_birimi === "USD" || f.para_birimi === "EUR") {
    const kur = kurlar[f.para_birimi];
    return kur == null ? null : f.fiyat * kur;
  }
  return f.fiyat;
}

/**
 * Bir kalem için en uygun fiyat: önce güncel (14 günden yeni) fiyatlar, aralarında TL karşılığı en düşük olan.
 * Kuru girilmemiş dövizli fiyatlar karşılaştırılamadığı için sona kalır.
 */
export function enUygunFiyat<T extends KarsilastirilanFiyat>(
  fiyatlar: T[],
  kurlar: Kurlar,
  bugun: Date = new Date(),
): T | null {
  if (fiyatlar.length === 0) return null;
  const sirali = [...fiyatlar].sort((a, b) => {
    const eskiA = eskiMi(a.fiyat_tarihi, bugun) ? 1 : 0;
    const eskiB = eskiMi(b.fiyat_tarihi, bugun) ? 1 : 0;
    if (eskiA !== eskiB) return eskiA - eskiB;
    const tlA = tlKarsiligi(a, kurlar);
    const tlB = tlKarsiligi(b, kurlar);
    if (tlA == null && tlB == null) return 0;
    if (tlA == null) return 1;
    if (tlB == null) return -1;
    return tlA - tlB;
  });
  return sirali[0];
}

/** Liste satırında gösterim: "₺137,50 / m" */
export function birimFiyatMetni(f: { fiyat: number; para_birimi: string; birim: string }): string {
  return `${fiyatYaz(f.fiyat, f.para_birimi)} / ${f.birim}`;
}
