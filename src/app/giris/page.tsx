"use client";

import { useFormState, useFormStatus } from "react-dom";
import { girisYap } from "./actions";

function GirisButonu() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-birincil w-full" disabled={pending}>
      {pending ? "Giriş yapılıyor…" : "Giriş yap"}
    </button>
  );
}

export default function GirisSayfasi() {
  const [durum, eylem] = useFormState(girisYap, { hata: null });

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="kart w-full max-w-sm p-8">
        <div className="mb-6">
          <div className="text-xl font-bold tracking-wide text-brand-dark">CATION</div>
          <div className="text-sm text-slate-500">İhale Maliyet Sistemi</div>
        </div>
        <form action={eylem} className="space-y-4">
          <div>
            <label className="etiket" htmlFor="eposta">E-posta</label>
            <input id="eposta" name="eposta" type="email" autoComplete="email" required className="girdi" />
          </div>
          <div>
            <label className="etiket" htmlFor="sifre">Şifre</label>
            <input id="sifre" name="sifre" type="password" autoComplete="current-password" required className="girdi" />
          </div>
          {durum.hata && <p className="text-sm text-red-600">{durum.hata}</p>}
          <GirisButonu />
        </form>
        <p className="mt-6 text-xs text-slate-500">
          Hesabınız yoksa yöneticinizden davet isteyin.
        </p>
      </div>
    </main>
  );
}
