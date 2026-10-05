export function pdfYaniti(pdf: Buffer, dosyaAdi: string) {
  const ascii = dosyaAdi.normalize("NFKD").replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(dosyaAdi)}`,
      "Cache-Control": "no-store",
    },
  });
}
