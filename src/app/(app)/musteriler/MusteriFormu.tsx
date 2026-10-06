"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { Musteri } from "@/lib/tipler";
import { musteriKaydet, type FormDurumu } from "./actions";

const BOS: FormDurumu = { hata: null, basari: null };

function KaydetButonu({ yeni }: { yeni: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-birincil" disabled={pending}>
      {pending ? "Kaydediliyor…" : yeni ? "Müşteriyi ekle" : "Kaydet"}
    </button>
  );
}

export function MusteriFormu({ musteri }: { musteri?: Musteri }) {
  const [durum, eylem] = useFormState(musteriKaydet, BOS);
  const m = musteri;
  return (
    <form action={eylem} className="kart grid grid-cols-2 gap-4 p-6">
      {m && <input type="hidden" name="id" value={m.id} />}
      <div className="col-span-2">
        <label className="etiket" htmlFor="ad">Müşteri adı</label>
        <input id="ad" name="ad" defaultValue={m?.ad} required className="girdi" placeholder="Örn. Anadolu Efes" />
      </div>
      <div>
        <label className="etiket" htmlFor="yetkili">Yetkili</label>
        <input id="yetkili" name="yetkili" defaultValue={m?.yetkili} className="girdi" />
      </div>
      <div>
        <label className="etiket" htmlFor="telefon">Telefon</label>
        <input id="telefon" name="telefon" defaultValue={m?.telefon} className="girdi" placeholder="0532 000 00 00" />
      </div>
      <div>
        <label className="etiket" htmlFor="eposta">E-posta</label>
        <input id="eposta" name="eposta" type="email" defaultValue={m?.eposta} className="girdi" />
      </div>
      <div>
        <label className="etiket" htmlFor="adres">Adres</label>
        <input id="adres" name="adres" defaultValue={m?.adres} className="girdi" />
      </div>
      <div className="col-span-2">
        <label className="etiket" htmlFor="notlar">Notlar</label>
        <textarea id="notlar" name="notlar" defaultValue={m?.notlar} rows={2} className="girdi" />
      </div>
      <div className="col-span-2 flex items-center gap-4">
        <KaydetButonu yeni={!m} />
        {durum.hata && <span className="text-sm text-red-600">{durum.hata}</span>}
        {durum.basari && <span className="text-sm text-green-700">{durum.basari}</span>}
      </div>
    </form>
  );
}
