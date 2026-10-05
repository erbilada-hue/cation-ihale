const tl = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const sayi = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 4 });
const tamSayi = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });

/** ₺1.234,56 */
export function paraYaz(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return tl.format(n);
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
  let s = metin.trim().replace(/\s|₺|%/g, "");
  if (s === "") return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  return /^-?\d*\.?\d+$/.test(s) ? Number(s) : NaN;
}
