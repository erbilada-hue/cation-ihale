"use client";

import { useFormState, useFormStatus } from "react-dom";
import { TEDARIKCI_KATEGORILERI } from "@/lib/tedarikci";
import type { Tedarikci } from "@/lib/tipler";
import { tedarikciKaydet, type FormDurumu } from "./actions";

const BOS: FormDurumu = { hata: null, basari: null };

function KaydetButonu({ yeni }: { yeni: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-birincil" disabled={pending}>
      {pending ? "Kaydediliyor…" : yeni ? "Tedarikçiyi ekle" : "Kaydet"}
    </button>
  );
}

export function TedarikciFormu({ tedarikci }: { tedarikci?: Tedarikci }) {
  const [durum, eylem] = useFormState(tedarikciKaydet, BOS);
  const t = tedarikci;
  return (
    <form action={eylem} className="kart grid grid-cols-2 gap-4 p-6">
      {t && <input type="hidden" name="id" value={t.id} />}
      <div className="col-span-2">
        <label className="etiket" htmlFor="ad">Firma adı</label>
        <input id="ad" name="ad" defaultValue={t?.ad} required className="girdi" placeholder="Örn. Akın Örme Kumaş" />
      </div>
      <div>
        <label className="etiket" htmlFor="yetkili">Yetkili</label>
        <input id="yetkili" name="yetkili" defaultValue={t?.yetkili} className="girdi" placeholder="Mesajda hitap için, örn. Ahmet Bey" />
      </div>
      <div>
        <label className="etiket" htmlFor="kategori">Ne veriyor?</label>
        <select id="kategori" name="kategori" defaultValue={t?.kategori ?? ""} className="girdi">
          <option value="">Seçin…</option>
          {Array.from(new Set([...TEDARIKCI_KATEGORILERI, ...(t?.kategori ? [t.kategori] : [])])).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="etiket" htmlFor="telefon">Telefon (WhatsApp)</label>
        <input id="telefon" name="telefon" defaultValue={t?.telefon} className="girdi" placeholder="0532 000 00 00" />
      </div>
      <div>
        <label className="etiket" htmlFor="eposta">E-posta</label>
        <input id="eposta" name="eposta" type="email" defaultValue={t?.eposta} className="girdi" />
      </div>
      <div className="col-span-2">
        <label className="etiket" htmlFor="notlar">Notlar</label>
        <textarea id="notlar" name="notlar" defaultValue={t?.notlar} rows={2} className="girdi" />
      </div>
      <div className="col-span-2 flex items-center gap-4">
        <KaydetButonu yeni={!t} />
        {durum.hata && <span className="text-sm text-red-600">{durum.hata}</span>}
        {durum.basari && <span className="text-sm text-green-700">{durum.basari}</span>}
      </div>
    </form>
  );
}
