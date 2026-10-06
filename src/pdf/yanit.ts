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

/** PDF oluşturulamazsa boş sayfa yerine ne olduğunu anlatan bir sayfa gösterilir */
export function pdfHatasi(hata: unknown) {
  console.error("PDF oluşturulamadı", hata);
  const ayrinti = (hata instanceof Error ? hata.message : String(hata)).replace(/[<>&]/g, "");
  const sayfa = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PDF oluşturulamadı</title></head>
<body style="font-family:system-ui,sans-serif;background:#f6f7f9;color:#0f1f44;padding:32px">
<div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e9ebef;border-radius:12px;padding:24px">
<h1 style="font-size:20px;margin:0 0 8px">PDF oluşturulamadı</h1>
<p>Sayfayı kapatıp tekrar deneyin. Sorun sürerse bu ekranın görüntüsünü gönderin.</p>
<p style="font-family:monospace;font-size:12px;color:#64748b;word-break:break-word">${ayrinti}</p>
</div></body></html>`;
  return new Response(sayfa, { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
