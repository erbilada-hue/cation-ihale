import { describe, expect, it } from "vitest";
import { deflateRawSync } from "node:zlib";
import * as XLSX from "xlsx";
import { belgeyiHazirla, docxMetni, zipOku } from "./belgeMetni";

/** Test için küçük bir ZIP (biri sıkıştırılmış, biri sıkıştırmasız) */
function zipYap(dosyalar: [string, string, boolean][]): Buffer {
  const yerel: Buffer[] = [];
  const merkez: Buffer[] = [];
  let ofset = 0;
  for (const [ad, icerik, sikistir] of dosyalar) {
    const ham = Buffer.from(icerik, "utf8");
    const veri = sikistir ? deflateRawSync(ham) : ham;
    const adB = Buffer.from(ad, "utf8");
    const l = Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50, 0);
    l.writeUInt16LE(sikistir ? 8 : 0, 8);
    l.writeUInt32LE(veri.length, 18);
    l.writeUInt32LE(ham.length, 22);
    l.writeUInt16LE(adB.length, 26);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(sikistir ? 8 : 0, 10);
    c.writeUInt32LE(veri.length, 20);
    c.writeUInt32LE(ham.length, 24);
    c.writeUInt16LE(adB.length, 28);
    c.writeUInt32LE(ofset, 42);
    yerel.push(l, adB, veri);
    merkez.push(c, adB);
    ofset += 30 + adB.length + veri.length;
  }
  const m = Buffer.concat(merkez);
  const e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0);
  e.writeUInt16LE(dosyalar.length, 8);
  e.writeUInt16LE(dosyalar.length, 10);
  e.writeUInt32LE(m.length, 12);
  e.writeUInt32LE(ofset, 16);
  return Buffer.concat([...yerel, m, e]);
}

const DOCX_XML =
  '<w:document><w:body><w:p><w:r><w:t>TEKNİK ŞARTNAME</w:t></w:r></w:p>' +
  "<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Kumaş</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>%100 pamuk 180 g/m²</w:t></w:r></w:p></w:tc></w:tr></w:tbl>" +
  "<w:p><w:r><w:t>Adet: 4.000 &amp; EN ISO 20471</w:t></w:r></w:p></w:body></w:document>";

describe("zipOku / docx", () => {
  it("sıkıştırılmış ve sıkıştırmasız dosyaları açar, istenmeyeni atlar", () => {
    const z = zipYap([
      ["[Content_Types].xml", "<x/>", false],
      ["word/document.xml", DOCX_XML, true],
    ]);
    const m = zipOku(z, (ad) => ad === "word/document.xml");
    expect([...m.keys()]).toEqual(["word/document.xml"]);
    expect(m.get("word/document.xml")!.toString("utf8")).toBe(DOCX_XML);
  });

  it("docx metni: paragraf satır, hücre sekme, &amp; çözülür", () => {
    const t = docxMetni(DOCX_XML);
    expect(t).toContain("TEKNİK ŞARTNAME");
    expect(t).toContain("Kumaş\t%100 pamuk 180 g/m²");
    expect(t).toContain("Adet: 4.000 & EN ISO 20471");
  });

  it("belgeyiHazirla docx'i metne çevirir", () => {
    const s = belgeyiHazirla(zipYap([["word/document.xml", DOCX_XML, true]]), "Şartname.DOCX");
    expect(s.icerik).toMatchObject({ tur: "metin" });
    expect(s.icerik?.tur === "metin" && s.icerik.metin).toContain("EN ISO 20471");
  });
});

describe("belgeyiHazirla", () => {
  it("PDF ve görseli olduğu gibi gönderir", () => {
    expect(belgeyiHazirla(Buffer.from("%PDF-1.4"), "a.pdf").icerik?.tur).toBe("pdf");
    expect(belgeyiHazirla(Buffer.from("x"), "a.PNG").icerik).toMatchObject({ tur: "gorsel", mediaType: "image/png" });
  });

  it("Excel sayfalarını metne çevirir", () => {
    const k = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(k, XLSX.utils.aoa_to_sheet([["Ürün", "Adet"], ["Polo tişört", 4000]]), "Liste");
    const s = belgeyiHazirla(XLSX.write(k, { type: "buffer", bookType: "xlsx" }), "liste.xlsx");
    expect(s.icerik?.tur === "metin" && s.icerik.metin).toBe("### Sayfa: Liste\nÜrün\tAdet\nPolo tişört\t4000");
  });

  it("eski .doc ve bozuk dosyada anlaşılır hata verir", () => {
    expect(belgeyiHazirla(Buffer.from("x"), "a.doc").hata).toContain(".docx");
    expect(belgeyiHazirla(Buffer.from("bozuk"), "a.docx").hata).toContain("okunamadı");
    expect(belgeyiHazirla(Buffer.from("x"), "a.zip").hata).toContain("türü");
  });
});
