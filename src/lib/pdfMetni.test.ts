import { describe, expect, it } from "vitest";
import { belgeyiHazirlaAsync, pdfMetni } from "./belgeMetni";

/** Tek sayfalık, verilen yazıyı içeren küçük bir PDF üretir */
function pdfYap(...satirlar: string[]): Buffer {
  const akis = `BT /F1 10 Tf 20 700 Td 14 TL ${satirlar.map((s) => `(${s}) '`).join(" ")} ET`;
  const nesneler = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${akis.length} >>\nstream\n${akis}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let govde = "%PDF-1.4\n";
  const konumlar: number[] = [];
  nesneler.forEach((n, i) => {
    konumlar.push(govde.length);
    govde += `${i + 1} 0 obj\n${n}\nendobj\n`;
  });
  const xref = govde.length;
  govde += `xref\n0 ${nesneler.length + 1}\n0000000000 65535 f \n`;
  for (const k of konumlar) govde += `${String(k).padStart(10, "0")} 00000 n \n`;
  govde += `trailer\n<< /Size ${nesneler.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(govde, "latin1");
}

describe("pdfMetni", () => {
  it("yazı katmanı olan PDF'i sayfa işaretiyle metne çevirir", async () => {
    const yazi = Array<string>(8).fill("Kumas 220 gr/m2 65 PES 35 CO EN ISO 20471 reflektor bant");
    const metin = await pdfMetni(pdfYap(...yazi));
    expect(metin).toContain("--- Sayfa 1 ---");
    expect(metin).toContain("EN ISO 20471");
    const sonuc = await belgeyiHazirlaAsync(pdfYap(...yazi), "sartname.pdf");
    expect(sonuc.icerik?.tur).toBe("metin");
  });

  it("yazısı çok az olan (taranmış) PDF'i görüntü olarak gönderir", async () => {
    expect(await pdfMetni(pdfYap("Sayfa 1"))).toBeNull();
    const sonuc = await belgeyiHazirlaAsync(pdfYap("Sayfa 1"), "tarama.pdf");
    expect(sonuc.icerik?.tur).toBe("pdf");
  });

  it("bozuk dosyada hata vermez, PDF olarak gönderir", async () => {
    expect(await pdfMetni(Buffer.from("bozuk"))).toBeNull();
  });
});
