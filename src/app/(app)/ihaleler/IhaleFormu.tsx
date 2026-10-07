"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { ihaleKaydet } from "./actions";
import { yuzdeYaz } from "@/lib/format";
import { PARA_BIRIMLERI, TESLIM_SEKILLERI } from "@/lib/sabitler";
import type { Ihale, Musteri, SegmentSablonu } from "@/lib/tipler";

function KaydetButonu({ yeni }: { yeni: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-birincil" disabled={pending}>
      {pending ? "Kaydediliyor…" : yeni ? "İhaleyi oluştur" : "Kaydet"}
    </button>
  );
}

const YENI_MUSTERI = "__yeni__";

export function IhaleFormu({
  ihale,
  segmentler,
  musteriler,
  markalar,
  varsayilanMusteri,
}: {
  ihale?: Ihale;
  segmentler: SegmentSablonu[];
  musteriler: Musteri[];
  /** Müşteri id → daha önceki ihalelerinde yazılmış markalar */
  markalar: Record<string, string[]>;
  varsayilanMusteri?: string;
}) {
  const [durum, eylem] = useFormState(ihaleKaydet, { hata: null });
  // Müşteri adı yazılı ama kartı olmayan eski / yapay zekâyla doldurulmuş ihalelerde "yeni müşteri" önerilir
  const [musteriId, setMusteriId] = useState<string>(
    ihale ? (ihale.musteri_id ?? (ihale.musteri ? YENI_MUSTERI : "")) : (varsayilanMusteri ?? ""),
  );
  const oneriler = musteriId && musteriId !== YENI_MUSTERI ? (markalar[musteriId] ?? []) : [];
  const [kaynak, setKaynak] = useState<string>(ihale?.kaynak ?? "");
  const [segment, setSegment] = useState<string>(ihale?.segment ?? "");
  const [ihracat, setIhracat] = useState<boolean>(ihale?.ihracat ?? false);
  const [teslimSekli, setTeslimSekli] = useState<string>(ihale?.teslim_sekli ?? "");
  const teslimAciklamasi = TESLIM_SEKILLERI.find((t) => t.kod === teslimSekli)?.aciklama;

  return (
    <form action={eylem} className="space-y-6">
      {ihale && <input type="hidden" name="id" value={ihale.id} />}

      <section className="kart grid grid-cols-2 gap-4 p-6">
        <div className="col-span-2">
          <label className="etiket" htmlFor="ad">İhale adı *</label>
          <input id="ad" name="ad" required defaultValue={ihale?.ad} className="girdi" placeholder="Örn. Belediye 2026 iş kıyafeti alımı" />
        </div>
        <div>
          <label className="etiket" htmlFor="musteri_id">Müşteri / Kurum</label>
          <select id="musteri_id" name="musteri_id" value={musteriId} onChange={(e) => setMusteriId(e.target.value)} className="girdi">
            <option value="">Seçilmedi</option>
            {musteriler.map((m) => (
              <option key={m.id} value={m.id}>
                {m.ad}
              </option>
            ))}
            <option value={YENI_MUSTERI}>+ Yeni müşteri ekle</option>
          </select>
          {musteriId === YENI_MUSTERI && (
            <input
              name="yeni_musteri"
              aria-label="Yeni müşterinin adı"
              defaultValue={ihale?.musteri_id ? "" : ihale?.musteri}
              required
              autoFocus={!ihale}
              className="girdi mt-2"
              placeholder="Yeni müşterinin adı"
            />
          )}
        </div>
        <div>
          <label className="etiket" htmlFor="marka">Marka / proje</label>
          <input
            id="marka"
            name="marka"
            list="marka-onerileri"
            defaultValue={ihale?.marka}
            className="girdi"
            placeholder="Varsa, örn. Castrol veya Fabrika"
          />
          <datalist id="marka-onerileri">
            {oneriler.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="etiket" htmlFor="yetkili">Yetkili kişi</label>
          <input id="yetkili" name="yetkili" defaultValue={ihale?.yetkili} className="girdi" />
        </div>
        <div>
          <label className="etiket" htmlFor="son_teklif_tarihi">Son teklif tarihi</label>
          <input id="son_teklif_tarihi" name="son_teklif_tarihi" type="date" defaultValue={ihale?.son_teklif_tarihi ?? ""} className="girdi" />
        </div>
        <div>
          <label className="etiket" htmlFor="termin">Termin</label>
          <input id="termin" name="termin" defaultValue={ihale?.termin} className="girdi" placeholder="Örn. Siparişten itibaren 45 gün" />
        </div>
        <div className="col-span-2">
          <label className="etiket" htmlFor="teslim_yeri">Teslim yeri</label>
          <input id="teslim_yeri" name="teslim_yeri" defaultValue={ihale?.teslim_yeri} className="girdi" placeholder="Uzak bir teslim yeriyse ürünlere nakliye payı eklemeyi unutmayın" />
        </div>
      </section>

      <section className="kart space-y-4 p-6">
        <div>
          <div className="etiket">Teknik şartname var mı? *</div>
          <div className="flex gap-3">
            {[
              { deger: "sartname", ad: "Evet, teknik şartname var" },
              { deger: "segment", ad: "Hayır, brief / lookbook" },
            ].map((s) => (
              <label
                key={s.deger}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                  kaynak === s.deger ? "border-brand bg-brand-soft text-brand-dark" : "border-cizgi"
                }`}
              >
                <input
                  type="radio"
                  name="kaynak"
                  value={s.deger}
                  checked={kaynak === s.deger}
                  onChange={() => setKaynak(s.deger)}
                  className="accent-brand"
                />
                {s.ad}
              </label>
            ))}
          </div>
        </div>

        {kaynak === "sartname" && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Teknik şartnameye göre çalışılacak. Kumaş ve detaylar şartnameden alınır, segment sorulmaz.
          </div>
        )}

        {kaynak === "segment" && (
          <>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Teknik şartname bulunamadı — kalite segmenti seçin.
            </div>
            <div className="grid grid-cols-3 gap-3">
              {segmentler.map((s) => (
                <label
                  key={s.segment}
                  className={`cursor-pointer rounded-kart border p-4 text-sm transition ${
                    segment === s.segment ? "border-brand ring-2 ring-brand/20" : "border-cizgi hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="segment"
                    value={s.segment}
                    checked={segment === s.segment}
                    onChange={() => setSegment(s.segment)}
                    className="sr-only"
                  />
                  <div className="mb-2 font-semibold text-brand-dark">{s.ad}</div>
                  <dl className="space-y-1 text-slate-600">
                    <div>Kumaş: {s.kumas}</div>
                    <div>Gramaj: {s.gramaj}</div>
                    <div>Boya: {s.boya}</div>
                    <div>Baskı: {s.baski}</div>
                    <div>Fire: <span className="rakam">{yuzdeYaz(s.fire_orani)}</span></div>
                  </dl>
                </label>
              ))}
            </div>
          </>
        )}

        {kaynak && (
          <div>
            <label className="etiket" htmlFor="kaynak_dosya">
              {kaynak === "sartname" ? "Şartname dosya adı" : "Brief / lookbook dosya adı"} (isteğe bağlı)
            </label>
            <input id="kaynak_dosya" name="kaynak_dosya" defaultValue={ihale?.kaynak_dosya} className="girdi" placeholder={kaynak === "sartname" ? "Örn. sartname.pdf" : "Örn. brief.pdf"} />
          </div>
        )}
      </section>

      <section className="kart space-y-4 p-6">
        <h2 className="font-semibold text-brand-dark">Teklif ve teslim</h2>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-cizgi px-4 py-3 text-sm">
          <input
            type="checkbox"
            name="ihracat"
            checked={ihracat}
            onChange={(e) => setIhracat(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand"
          />
          <span>
            <span className="font-medium text-brand-dark">İhracat işi (KDV yok)</span>
            <span className="block text-slate-500">
              İşaretlenince bu ihaledeki ürünlerin KDV oranı 0 olur ve teklifte KDV satırı çıkmaz.
            </span>
          </span>
        </label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="etiket" htmlFor="teklif_para_birimi">Teklif para birimi</label>
            <select id="teklif_para_birimi" name="teklif_para_birimi" defaultValue={ihale?.teklif_para_birimi ?? "TRY"} className="girdi">
              {PARA_BIRIMLERI.map((p) => (
                <option key={p.kod} value={p.kod}>
                  {p.sembol} {p.ad}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiket" htmlFor="teslim_sekli">Teslim şekli (Incoterms)</label>
            <select id="teslim_sekli" name="teslim_sekli" value={teslimSekli} onChange={(e) => setTeslimSekli(e.target.value)} className="girdi">
              <option value="">Belirtilmedi</option>
              {TESLIM_SEKILLERI.map((t) => (
                <option key={t.kod} value={t.kod}>
                  {t.ad}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiket" htmlFor="teklif_dili">Teklif dili</label>
            <select id="teklif_dili" name="teklif_dili" defaultValue={ihale?.teklif_dili ?? "tr"} className="girdi">
              <option value="tr">Türkçe</option>
              <option value="en">İngilizce</option>
            </select>
          </div>
        </div>
        {teslimAciklamasi && (
          <p className="rounded-lg bg-zemin px-3 py-2 text-sm text-slate-600">
            <strong>{teslimSekli}:</strong> {teslimAciklamasi} Teslim yerini (ör. Mersin limanı) yukarıdaki &ldquo;Teslim yeri&rdquo; alanına yazın.
          </p>
        )}
        <p className="text-xs text-slate-500">
          Maliyet her zaman TL hesaplanır. Teklif dolar veya euro ise ihale sayfasındaki kurla çevrilir.
        </p>
      </section>

      <section className="kart p-6">
        <label className="etiket" htmlFor="notlar">Notlar</label>
        <textarea id="notlar" name="notlar" rows={3} defaultValue={ihale?.notlar} className="girdi" />
      </section>

      {durum.hata && <p className="text-sm text-red-600">{durum.hata}</p>}

      <div className="flex gap-3">
        <KaydetButonu yeni={!ihale} />
        <Link href={ihale ? `/ihaleler/${ihale.id}` : "/ihaleler"} className="btn-ikincil">
          Vazgeç
        </Link>
      </div>
    </form>
  );
}
