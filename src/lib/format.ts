const tl = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dovizler = {
  USD: new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 }),
  EUR: new Intl.NumberFormat("tr-TR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 4 }),
};

const sayi = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 4 });
const tamSayi = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });

/** ₺1.234,56 */
export function paraYaz(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return tl.format(n);
}

const tutarBicimleri = new Map<string, Intl.NumberFormat>();

/**
 * Teklif tutarı, teklifin para biriminde ve dilinde, 2 ondalıkla: ₺1.234,56 · €1.234,56 · €1,234.56 (İngilizce)
 */
export function tutarYaz(n: number | null | undefined, paraBirimi: string = "TRY", dil: "tr" | "en" = "tr"): string {
  if (n == null || Number.isNaN(n)) return "—";
  const pb = paraBirimi === "USD" || paraBirimi === "EUR" ? paraBirimi : "TRY";
  const anahtar = `${pb}|${dil}`;
  let bicim = tutarBicimleri.get(anahtar);
  if (!bicim) {
    bicim = new Intl.NumberFormat(dil === "en" ? "en-GB" : "tr-TR", {
      style: "currency",
      currency: pb,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    tutarBicimleri.set(anahtar, bicim);
  }
  return bicim.format(n);
}

/** Kalemin kendi para biriminde fiyatı: ₺1.234,56 / $12,50 / €8,75 */
export function fiyatYaz(n: number | null | undefined, paraBirimi: string): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (paraBirimi === "USD" || paraBirimi === "EUR") return dovizler[paraBirimi].format(n);
  return tl.format(n);
}

/** Sayıyı Türkçe yazımla kuruş hassasiyetinde gösterir: 1,2 → "1,20" değil "1,2"; 137,5 → "137,5" */
export function kurusaYuvarlaGoster(n: number): string {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(n);
}

/** 1.234,5 */
export function sayiYaz(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "";
  return sayi.format(n);
}

/** 4.000 */
export function adetYaz(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return tamSayi.format(n);
}

/** %5 */
export function yuzdeYaz(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return "%" + sayi.format(n);
}

/** Türkiye saatine göre YYYY-MM-DD */
export function tarihMetni(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
}

/** İki YYYY-MM-DD günü arasındaki fark: tarih bugünden sonraysa artı, geçtiyse eksi */
export function kalanGun(tarih: string, bugun: string): number {
  return Math.round((Date.parse(tarih + "T12:00:00Z") - Date.parse(bugun + "T12:00:00Z")) / 86_400_000);
}

/** 05.10.2026 */
export function tarihYaz(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const t = typeof d === "string" ? new Date(d.length === 10 ? d + "T00:00:00" : d) : d;
  return t.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Kullanıcının yazdığı sayıyı okur. "1.234,56", "12,5", "12.5", "1234" kabul edilir.
 * Boş ise null döner, okunamazsa NaN döner.
 */
export function sayiOku(metin: string): number | null {
  let s = metin.trim().replace(/\s|₺|\$|€|%/g, "");
  if (s === "") return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  return /^-?\d*\.?\d+$/.test(s) ? Number(s) : NaN;
}
