// TCMB günlük kurları (ücretsiz, anahtarsız): https://www.tcmb.gov.tr/kurlar/today.xml
// Döviz satış kuru alınır; kullanıcı ekranda değiştirebilir.

export const TCMB_ADRESI = "https://www.tcmb.gov.tr/kurlar/today.xml";

export type TcmbKurlari = { USD: number; EUR: number; tarih: string };

/** today.xml içinden USD ve EUR döviz satış kurunu ve bülten tarihini okur */
export function tcmbXmlOku(xml: string): TcmbKurlari | null {
  const kur = (kod: string) => {
    const blok = xml.match(new RegExp(`<Currency[^>]*CurrencyCode="${kod}"[^>]*>([\\s\\S]*?)</Currency>`));
    const satis = blok?.[1].match(/<ForexSelling>\s*([\d.,]+)\s*<\/ForexSelling>/);
    const n = satis ? Number(satis[1].replace(",", ".")) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const usd = kur("USD");
  const eur = kur("EUR");
  if (usd == null || eur == null) return null;
  const tarih = xml.match(/<Tarih_Date[^>]*Tarih="([\d.]+)"/)?.[1] ?? "";
  return { USD: usd, EUR: eur, tarih };
}
