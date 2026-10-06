"use client";

import { useState } from "react";
import { fiyatTalebiMesaji } from "@/lib/tedarikci";
import type { Tedarikci, TedarikciFiyati } from "@/lib/tipler";
import { talepKaydet } from "@/app/(app)/tedarikciler/actions";

type Grup = { tedarikci: Tedarikci; fiyatlar: TedarikciFiyati[] };

/**
 * "Toplu İste": her tedarikçi için WhatsApp mesajı hazırlar. Sistem mesaj göndermez;
 * kullanıcı kopyalar, WhatsApp'tan kendisi gönderir, sonra "Gönderdim" der.
 */
export function TalepHazirla({ gruplar, firmaAdi, onKapat }: { gruplar: Grup[]; firmaAdi: string; onKapat: () => void }) {
  return (
    <section className="kart border-brand/40 p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-brand-dark">Fiyat isteme mesajları</h2>
          <p className="text-sm text-slate-500">
            Her mesajı kopyalayıp WhatsApp&apos;tan tedarikçiye kendiniz gönderin, sonra &quot;Gönderdim&quot;e basın. Cevap
            gelince &quot;Bekleyen cevaplar&quot; bölümünden fiyatı girersiniz.
          </p>
        </div>
        <button type="button" className="btn-ikincil btn-kucuk" onClick={onKapat}>
          Kapat
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {gruplar.map((g) => (
          <MesajKarti key={g.tedarikci.id} grup={g} firmaAdi={firmaAdi} />
        ))}
      </div>
    </section>
  );
}

function MesajKarti({ grup, firmaAdi }: { grup: Grup; firmaAdi: string }) {
  const [mesaj, setMesaj] = useState(() =>
    fiyatTalebiMesaji({ firmaAdi, yetkili: grup.tedarikci.yetkili, kalemler: grup.fiyatlar }),
  );
  const [kopyalandi, setKopyalandi] = useState(false);
  const [durum, setDurum] = useState<"hazir" | "kaydediliyor" | "gonderildi">("hazir");
  const [hata, setHata] = useState<string | null>(null);

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(mesaj);
    } catch {
      // Pano izni yoksa metni seçili bırak, kullanıcı Ctrl+C yapsın
      const alan = document.getElementById(`mesaj-${grup.tedarikci.id}`) as HTMLTextAreaElement | null;
      alan?.select();
      document.execCommand?.("copy");
    }
    setKopyalandi(true);
    setTimeout(() => setKopyalandi(false), 2000);
  }

  async function gonderdim() {
    setHata(null);
    setDurum("kaydediliyor");
    const s = await talepKaydet({
      tedarikci_id: grup.tedarikci.id,
      fiyat_idleri: grup.fiyatlar.map((f) => f.id),
      mesaj,
    });
    if (s.hata !== undefined) {
      setHata(s.hata);
      setDurum("hazir");
      return;
    }
    setDurum("gonderildi");
  }

  return (
    <div className="rounded-lg border border-cizgi p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div className="font-medium text-brand-dark">{grup.tedarikci.ad}</div>
        <div className="rakam text-xs text-slate-500">{grup.tedarikci.telefon || "telefon yok"}</div>
      </div>
      <textarea
        id={`mesaj-${grup.tedarikci.id}`}
        aria-label={`${grup.tedarikci.ad} mesajı`}
        value={mesaj}
        onChange={(e) => setMesaj(e.target.value)}
        rows={Math.min(14, mesaj.split("\n").length + 1)}
        className="girdi font-sans text-sm"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-ikincil btn-kucuk" onClick={kopyala}>
          {kopyalandi ? "Kopyalandı ✓" : "Kopyala"}
        </button>
        {durum === "gonderildi" ? (
          <span className="text-sm text-green-700">Cevap bekleniyor olarak işaretlendi.</span>
        ) : (
          <button type="button" className="btn-birincil btn-kucuk" disabled={durum === "kaydediliyor"} onClick={gonderdim}>
            Gönderdim
          </button>
        )}
        {hata && <span className="text-sm text-red-600">{hata}</span>}
      </div>
    </div>
  );
}
