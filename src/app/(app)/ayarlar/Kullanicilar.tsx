"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { tarihYaz } from "@/lib/format";
import { kullaniciEkle, kullaniciSifresiBelirle, kullaniciSil, sifremiDegistir, type Sonuc } from "./kullanicilar";

export type KullaniciSatiri = { id: string; ad: string; eposta: string; sonGiris: string | null; eklenme: string };

/** Karışmayan harf ve rakamlardan (0/O, 1/l yok) 10 karakterlik geçici şifre */
function sifreUret(): string {
  const harfler = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const r = new Uint32Array(10);
  crypto.getRandomValues(r);
  return Array.from(r, (n) => harfler[n % harfler.length]).join("");
}

function Mesaj({ s }: { s: Sonuc | null }) {
  if (!s) return null;
  return <p className={`text-sm ${s.hata ? "text-red-600" : "text-green-700"}`}>{s.hata ?? s.mesaj}</p>;
}

function SifreGirdisi({ deger, degistir, id }: { deger: string; degistir: (s: string) => void; id: string }) {
  return (
    <div className="flex gap-2">
      <input id={id} value={deger} onChange={(e) => degistir(e.target.value)} className="girdi rakam" autoComplete="new-password" />
      <button type="button" className="btn-ikincil btn-kucuk whitespace-nowrap" onClick={() => degistir(sifreUret())}>
        Şifre üret
      </button>
    </div>
  );
}

function KullaniciEkleFormu() {
  const router = useRouter();
  const [ad, setAd] = useState("");
  const [eposta, setEposta] = useState("");
  const [sifre, setSifre] = useState(sifreUret);
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [bekliyor, basla] = useTransition();

  function ekle(e: React.FormEvent) {
    e.preventDefault();
    basla(async () => {
      const s = await kullaniciEkle({ ad, eposta, sifre });
      setSonuc(s);
      if (!s.hata) {
        setBilgi(`CATION İhale sistemine giriş bilgileriniz:\nAdres: ${window.location.origin}\nE-posta: ${eposta.trim().toLowerCase()}\nŞifre: ${sifre}\nİlk girişten sonra Ayarlar → Şifremi değiştir bölümünden kendi şifrenizi belirleyin.`);
        setKopyalandi(false);
        setAd("");
        setEposta("");
        setSifre(sifreUret());
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={ekle} className="space-y-3 border-t border-cizgi pt-4">
      <div className="text-sm font-medium text-brand-dark">Kullanıcı ekle</div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="etiket" htmlFor="k-ad">Ad soyad</label>
          <input id="k-ad" value={ad} onChange={(e) => setAd(e.target.value)} className="girdi" placeholder="Örn. Ayşe Yılmaz" />
        </div>
        <div>
          <label className="etiket" htmlFor="k-eposta">E-posta</label>
          <input id="k-eposta" type="email" required value={eposta} onChange={(e) => setEposta(e.target.value)} className="girdi" />
        </div>
        <div>
          <label className="etiket" htmlFor="k-sifre">Geçici şifre</label>
          <SifreGirdisi id="k-sifre" deger={sifre} degistir={setSifre} />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" className="btn-birincil" disabled={bekliyor}>
          {bekliyor ? "Ekleniyor…" : "Kullanıcı ekle"}
        </button>
        <Mesaj s={sonuc} />
      </div>
      {bilgi && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p className="mb-2">Bu bilgileri kişiye WhatsApp veya e-postayla siz iletin:</p>
          <pre className="whitespace-pre-wrap rounded bg-white p-3 font-mono text-xs text-slate-700">{bilgi}</pre>
          <button
            type="button"
            className="btn-ikincil btn-kucuk mt-2"
            onClick={async () => {
              await navigator.clipboard.writeText(bilgi);
              setKopyalandi(true);
            }}
          >
            {kopyalandi ? "Kopyalandı" : "Kopyala"}
          </button>
        </div>
      )}
    </form>
  );
}

function KullaniciSatirlari({ kullanicilar, benimId }: { kullanicilar: KullaniciSatiri[]; benimId: string }) {
  const router = useRouter();
  const [sifreAcik, setSifreAcik] = useState<string | null>(null);
  const [yeniSifre, setYeniSifre] = useState("");
  const [sonuc, setSonuc] = useState<{ id: string; s: Sonuc } | null>(null);
  const [bekliyor, basla] = useTransition();

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-cizgi text-left text-xs text-slate-500">
        <tr>
          <th className="py-2 pr-4 font-medium">Ad soyad</th>
          <th className="py-2 pr-4 font-medium">E-posta</th>
          <th className="py-2 pr-4 font-medium">Son giriş</th>
          <th className="py-2 text-right font-medium" />
        </tr>
      </thead>
      <tbody className="divide-y divide-cizgi">
        {kullanicilar.map((k) => (
          <tr key={k.id} className="align-top">
            <td className="py-3 pr-4">
              {k.ad || <span className="text-slate-400">—</span>}
              {k.id === benimId && <span className="rozet ml-2 bg-brand-soft text-brand">siz</span>}
            </td>
            <td className="py-3 pr-4 text-slate-600">{k.eposta}</td>
            <td className="rakam py-3 pr-4 text-slate-600">{k.sonGiris ? tarihYaz(k.sonGiris) : "Hiç girmedi"}</td>
            <td className="py-3 text-right">
              {k.id !== benimId && (
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn-ikincil btn-kucuk"
                    onClick={() => {
                      setSifreAcik(sifreAcik === k.id ? null : k.id);
                      setYeniSifre(sifreUret());
                      setSonuc(null);
                    }}
                  >
                    Şifre belirle
                  </button>
                  <button
                    type="button"
                    className="btn-tehlike btn-kucuk"
                    disabled={bekliyor}
                    onClick={() => {
                      if (!confirm(`${k.ad || k.eposta} kaldırılsın mı? Bu kişi artık sisteme giremez. Girdiği ihaleler ve fiyatlar silinmez.`)) return;
                      basla(async () => {
                        const s = await kullaniciSil(k.id);
                        setSonuc({ id: k.id, s });
                        if (!s.hata) router.refresh();
                      });
                    }}
                  >
                    Kaldır
                  </button>
                </div>
              )}
              {sifreAcik === k.id && (
                <div className="mt-2 flex items-center justify-end gap-2">
                  <div className="w-72">
                    <SifreGirdisi id={`s-${k.id}`} deger={yeniSifre} degistir={setYeniSifre} />
                  </div>
                  <button
                    type="button"
                    className="btn-birincil btn-kucuk"
                    disabled={bekliyor}
                    onClick={() =>
                      basla(async () => {
                        const s = await kullaniciSifresiBelirle(k.id, yeniSifre);
                        setSonuc({ id: k.id, s: s.hata ? s : { mesaj: `Yeni şifre kaydedildi: ${yeniSifre} — kişiye siz iletin.` } });
                        if (!s.hata) setSifreAcik(null);
                      })
                    }
                  >
                    Kaydet
                  </button>
                </div>
              )}
              {sonuc?.id === k.id && (
                <div className="mt-1">
                  <Mesaj s={sonuc.s} />
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SifremiDegistir() {
  const [sifre, setSifre] = useState("");
  const [tekrar, setTekrar] = useState("");
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const [bekliyor, basla] = useTransition();
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (sifre !== tekrar) return setSonuc({ hata: "İki şifre aynı değil." });
        basla(async () => {
          const s = await sifremiDegistir(sifre);
          setSonuc(s);
          if (!s.hata) {
            setSifre("");
            setTekrar("");
          }
        });
      }}
    >
      <div>
        <label className="etiket" htmlFor="y-sifre">Yeni şifre</label>
        <input id="y-sifre" type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} className="girdi w-56" autoComplete="new-password" />
      </div>
      <div>
        <label className="etiket" htmlFor="y-sifre2">Yeni şifre (tekrar)</label>
        <input id="y-sifre2" type="password" value={tekrar} onChange={(e) => setTekrar(e.target.value)} className="girdi w-56" autoComplete="new-password" />
      </div>
      <button type="submit" className="btn-ikincil" disabled={bekliyor || !sifre}>
        {bekliyor ? "Kaydediliyor…" : "Şifremi değiştir"}
      </button>
      <Mesaj s={sonuc} />
    </form>
  );
}

export function KullanicilarBolumu({ kullanicilar, benimId }: { kullanicilar: KullaniciSatiri[] | null; benimId: string }) {
  return (
    <div className="kart space-y-5 p-6">
      {kullanicilar ? (
        <>
          <KullaniciSatirlari kullanicilar={kullanicilar} benimId={benimId} />
          <KullaniciEkleFormu />
        </>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="mb-2 font-medium">Kullanıcı eklemek için bir anahtar gerekiyor (bir kez yapılır):</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Supabase → Project Settings → API Keys sayfasında <b>service_role</b> (veya &quot;secret&quot;) anahtarını kopyalayın.</li>
            <li>Vercel → projeniz → Settings → Environment Variables → Add: Key <b>SUPABASE_SERVICE_ROLE_KEY</b>, Value yapıştırdığınız anahtar, Type <b>Secret</b>.</li>
            <li>Kaydedin ve Deployments sayfasından son yayını <b>Redeploy</b> edin.</li>
          </ol>
          <p className="mt-2">Bu anahtar tam yetkilidir; kimseyle paylaşmayın, sohbete yapıştırmayın.</p>
        </div>
      )}
      <div className="border-t border-cizgi pt-4">
        <div className="mb-2 text-sm font-medium text-brand-dark">Şifremi değiştir</div>
        <SifremiDegistir />
      </div>
    </div>
  );
}
