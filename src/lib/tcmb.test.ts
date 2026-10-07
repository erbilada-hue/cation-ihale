import { describe, expect, it } from "vitest";
import { tcmbXmlOku } from "./tcmb";

const ORNEK = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="isokur.xsl"?>
<Tarih_Date Tarih="06.10.2026" Date="10/06/2026"  Bulten_No="2026/190" >
  <Currency CrossOrder="0" Kod="USD" CurrencyCode="USD">
    <Unit>1</Unit>
    <Isim>ABD DOLARI</Isim>
    <CurrencyName>US DOLLAR</CurrencyName>
    <ForexBuying>41.6512</ForexBuying>
    <ForexSelling>41.7262</ForexSelling>
    <BanknoteBuying>41.6220</BanknoteBuying>
    <BanknoteSelling>41.7888</BanknoteSelling>
  </Currency>
  <Currency CrossOrder="9" Kod="EUR" CurrencyCode="EUR">
    <Unit>1</Unit>
    <Isim>EURO</Isim>
    <ForexBuying>48.7790</ForexBuying>
    <ForexSelling>48.8669</ForexSelling>
  </Currency>
</Tarih_Date>`;

describe("tcmbXmlOku", () => {
  it("USD ve EUR döviz satış kurunu ve tarihi okur", () => {
    expect(tcmbXmlOku(ORNEK)).toEqual({ USD: 41.7262, EUR: 48.8669, tarih: "06.10.2026" });
  });
  it("beklenmeyen içerikte null döner", () => {
    expect(tcmbXmlOku("<html>hata</html>")).toBeNull();
  });
});
