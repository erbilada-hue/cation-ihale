/** Şartname dosyalarının durduğu Supabase Storage klasörü (migration'da oluşturulur) */
export const SARTNAME_KLASORU = "sartnameler";

/** Supabase'in sınırı 50 MB */
export const EN_BUYUK_DOSYA = 50 * 1024 * 1024;

export const KABUL_EDILEN_DOSYALAR =
  ".pdf,.doc,.docx,.xls,.xlsx,.odt,.ods,.rtf,.txt,.csv,.jpg,.jpeg,.png,.zip";

/** Depo yolunda Türkçe harf ve boşluk olamaz; asıl ad veritabanında saklanır */
export function depoAdi(dosyaAdi: string): string {
  const harfler: Record<string, string> = { ı: "i", İ: "I", ğ: "g", Ğ: "G", ü: "u", Ü: "U", ş: "s", Ş: "S", ö: "o", Ö: "O", ç: "c", Ç: "C" };
  const sade = dosyaAdi
    .replace(/[ıİğĞüÜşŞöÖçÇ]/g, (h) => harfler[h])
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return sade.slice(-120) || "dosya";
}

/** 1,2 MB */
export function boyutYaz(bayt: number): string {
  if (bayt < 1024) return `${bayt} B`;
  if (bayt < 1024 * 1024) return `${Math.round(bayt / 1024)} KB`;
  return `${(bayt / 1024 / 1024).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`;
}
