// Yüklenen şartname dosyasını yapay zekânın okuyabileceği içeriğe çevirir.
// PDF ve görseller olduğu gibi gönderilir; Word ve Excel metne çevrilir.

import { inflateRawSync } from "node:zlib";
import * as XLSX from "xlsx";

export type BelgeIcerigi =
  | { tur: "pdf"; base64: string }
  | { tur: "gorsel"; base64: string; mediaType: "image/jpeg" | "image/png" }
  | { tur: "metin"; metin: string };

/** Yapay zekâya bir istekte gönderilebilecek en büyük PDF (istek sınırı 32 MB, base64 ile büyür) */
export const EN_BUYUK_PDF = 22 * 1024 * 1024;
export const EN_BUYUK_GORSEL = 5 * 1024 * 1024;
/** Çok uzun metinler kısaltılmaz; kullanıcıya söylenir */
export const EN_UZUN_METIN = 400_000;

function uzanti(ad: string): string {
  const i = ad.lastIndexOf(".");
  return i < 0 ? "" : ad.slice(i + 1).toLowerCase();
}

/** ZIP içindeki dosyaları okur (docx, odt bu biçimdedir). Sadece istenen adları açar. */
export function zipOku(veri: Buffer, istenen: (ad: string) => boolean): Map<string, Buffer> {
  const sonuc = new Map<string, Buffer>();
  // Merkezi dizin sonu kaydı: dosyanın son 64 KB'ı içinde
  let eocd = -1;
  for (let i = veri.length - 22; i >= Math.max(0, veri.length - 65_557); i--) {
    if (veri.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("zip değil");
  const adet = veri.readUInt16LE(eocd + 10);
  let p = veri.readUInt32LE(eocd + 16);
  for (let n = 0; n < adet; n++) {
    if (veri.readUInt32LE(p) !== 0x02014b50) throw new Error("bozuk zip");
    const yontem = veri.readUInt16LE(p + 10);
    const sikisik = veri.readUInt32LE(p + 20);
    const adUzunluk = veri.readUInt16LE(p + 28);
    const ekUzunluk = veri.readUInt16LE(p + 30);
    const yorumUzunluk = veri.readUInt16LE(p + 32);
    const yerel = veri.readUInt32LE(p + 42);
    const ad = veri.toString("utf8", p + 46, p + 46 + adUzunluk);
    p += 46 + adUzunluk + ekUzunluk + yorumUzunluk;
    if (!istenen(ad)) continue;
    const bas = yerel + 30 + veri.readUInt16LE(yerel + 26) + veri.readUInt16LE(yerel + 28);
    const ham = veri.subarray(bas, bas + sikisik);
    if (yontem === 0) sonuc.set(ad, Buffer.from(ham));
    else if (yontem === 8) sonuc.set(ad, inflateRawSync(ham));
  }
  return sonuc;
}

const varlik = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");

/** Word (docx) XML'inden düz metin: paragraflar satır, tablo hücreleri sekmeyle ayrılır */
export function docxMetni(xml: string): string {
  return varlik(
    xml
      // Hücre içindeki paragraflar boşlukla birleşir; satır tablo satırıdır
      .replace(/<w:tc\b[\s\S]*?<\/w:tc>/g, (h) => h.replace(/<\/w:p>(?!\s*<\/w:tc>)/g, " ").replace(/<\/w:p>/g, ""))
      .replace(/<w:tab\/>/g, "\t")
      .replace(/<w:br[^>]*\/>/g, "\n")
      .replace(/<\/w:tc>/g, "\t")
      .replace(/<\/w:p>|<\/w:tr>/g, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function odtMetni(xml: string): string {
  return varlik(
    xml
      .replace(/<text:tab\/>/g, "\t")
      .replace(/<text:line-break\/>/g, "\n")
      .replace(/<\/table:table-cell>/g, "\t")
      .replace(/<\/text:p>|<\/text:h>|<\/table:table-row>/g, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type BelgeSonucu = { hata: string; icerik?: undefined } | { hata?: undefined; icerik: BelgeIcerigi };

export function belgeyiHazirla(veri: Buffer, dosyaAdi: string): BelgeSonucu {
  const u = uzanti(dosyaAdi);
  try {
    if (u === "pdf") {
      if (veri.length > EN_BUYUK_PDF) return { hata: "PDF 22 MB'tan büyük; yapay zekâ bu boyutu okuyamıyor. Sadece teknik bölümü ayrı PDF yapıp yükleyin." };
      return { icerik: { tur: "pdf", base64: veri.toString("base64") } };
    }
    if (u === "jpg" || u === "jpeg" || u === "png") {
      if (veri.length > EN_BUYUK_GORSEL) return { hata: "Görsel 5 MB'tan büyük; küçültüp tekrar yükleyin." };
      return { icerik: { tur: "gorsel", base64: veri.toString("base64"), mediaType: u === "png" ? "image/png" : "image/jpeg" } };
    }
    let metin: string;
    if (u === "docx") {
      const x = zipOku(veri, (ad) => ad === "word/document.xml");
      const xml = x.get("word/document.xml");
      if (!xml) return { hata: "Word dosyasının içi okunamadı." };
      metin = docxMetni(xml.toString("utf8"));
    } else if (u === "odt") {
      const xml = zipOku(veri, (ad) => ad === "content.xml").get("content.xml");
      if (!xml) return { hata: "Dosyanın içi okunamadı." };
      metin = odtMetni(xml.toString("utf8"));
    } else if (u === "xlsx" || u === "xls" || u === "ods" || u === "csv") {
      const kitap = XLSX.read(veri, { type: "buffer" });
      metin = kitap.SheetNames.map((ad) => `### Sayfa: ${ad}\n${XLSX.utils.sheet_to_csv(kitap.Sheets[ad], { FS: "\t", blankrows: false })}`).join("\n\n");
    } else if (u === "txt") {
      metin = veri.toString("utf8");
    } else if (u === "doc") {
      return { hata: "Eski Word biçimi (.doc) okunamıyor. Dosyayı Word'de açıp PDF veya .docx olarak kaydedin ve onu yükleyin." };
    } else {
      return { hata: "Bu dosya türü okunamıyor. PDF, Word (.docx), Excel veya görsel yükleyin." };
    }
    if (!metin.trim()) return { hata: "Dosyada okunabilir yazı bulunamadı. Taranmış bir belgeyse PDF olarak yükleyin." };
    if (metin.length > EN_UZUN_METIN) return { hata: "Dosya çok uzun. Sadece teknik şartname bölümünü ayrı dosya yapıp yükleyin." };
    return { icerik: { tur: "metin", metin } };
  } catch {
    return { hata: "Dosya okunamadı; bozuk olabilir. PDF olarak kaydedip tekrar deneyin." };
  }
}
