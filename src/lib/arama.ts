/** Aramada büyük/küçük harf, Türkçe harf (ı/i, ş/s…) ve noktalama farkı gözetilmez */
export function sadelestir(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Yazılan her kelime metinlerin birinde (ya da toplamında) geçiyorsa eşleşir.
 * Ör. "castrol polar" → adında Castrol, ürünlerinde polar olan ihale bulunur.
 */
export function aramaEslesir(metinler: (string | null | undefined)[], sorgu: string): boolean {
  const kelimeler = sadelestir(sorgu).split(" ").filter(Boolean);
  if (kelimeler.length === 0) return true;
  const hepsi = sadelestir(metinler.filter(Boolean).join(" "));
  return kelimeler.every((k) => hepsi.includes(k));
}
