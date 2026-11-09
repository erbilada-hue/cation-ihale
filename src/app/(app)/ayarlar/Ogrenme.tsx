"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sayiYaz } from "@/lib/format";
import { urunGrubuAdi } from "@/lib/sabitler";
import { sablonKullanimiGuncelle } from "../kalem-kutuphanesi/actions";

export type OgrenmeOzeti = {
  ihaleSayisi: number;
  kazanilanSayisi: number;
  /** Ürün grubu kodu → kaç ürün örnek alınıyor */
  grupUrunSayilari: [string, number][];
  oneriler: { id: string; urunGrubu: string; ad: string; birim: string; varsayilan: number | null; ortanca: number; ornekSayisi: number }[];
};

/** Yapay zekânın neyi örnek aldığı ve kütüphane varsayılanları için geçmiş tekliflerden çıkan öneriler */
export function OgrenmeBolumu({ ozet }: { ozet: OgrenmeOzeti }) {
  const router = useRouter();
  const [islenen, setIslenen] = useState<Set<string>>(new Set());
  const [calisan, setCalisan] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  async function isle(id: string, kullanim: number) {
    setCalisan(id);
    setHata(null);
    const s = await sablonKullanimiGuncelle(id, kullanim);
    setCalisan(null);
    if (s.hata !== undefined) return setHata(s.hata);
    setIslenen((l) => new Set(l).add(id));
    router.refresh();
  }

  const bekleyen = ozet.oneriler.filter((o) => !islenen.has(o.id));

  return (
    <div className="kart space-y-4 p-6 text-sm">
      {ozet.ihaleSayisi === 0 ? (
        <p className="text-slate-600">
          Henüz örnek alınacak ihale yok. Bir ihalede müşteri teklifi oluşturduğunuzda ya da ihaleyi &quot;Olumlu&quot; işaretlediğinizde
          yapay zekâ o ihaledeki kalem miktarlarını ve kâr marjını örnek almaya başlar.
        </p>
      ) : (
        <p className="text-slate-700">
          Yapay zekâ şu an <strong className="rakam">{ozet.ihaleSayisi}</strong> ihaleden öğreniyor
          {ozet.kazanilanSayisi > 0 && (
            <>
              {" "}
              (<strong className="rakam">{ozet.kazanilanSayisi}</strong> kazanılan)
            </>
          )}
          :{" "}
          {ozet.grupUrunSayilari.map(([g, n], i) => (
            <span key={g}>
              {i > 0 && ", "}
              {urunGrubuAdi(g)} <span className="rakam">{n}</span> ürün
            </span>
          ))}
          .
        </p>
      )}
      <ul className="list-disc space-y-1 pl-5 text-slate-500">
        <li>Şartname analizi, benzer ürünlerde sizin onayladığınız kalem miktarlarını örnek alır; kazanılan ihalelere öncelik verir.</li>
        <li>Kâr marjı önerisi, geçmiş marjlarla birlikte ihalenin kazanılıp kaybedildiğine de bakar.</li>
        <li>
          Hatalı ya da istisnai bir ihaleyi öğrenmeden çıkarmak için ihale sayfasındaki &quot;Yapay zekâ bu ihaleden öğrensin&quot;
          işaretini kaldırın.
        </li>
      </ul>

      {bekleyen.length > 0 && (
        <div>
          <h3 className="mb-1 font-medium text-brand-dark">Kütüphane için öneriler</h3>
          <p className="mb-2 text-slate-500">
            Bu kalemlerde tekliflerinizde girdiğiniz miktarlar kütüphanedeki varsayılandan farklı. &quot;Kütüphaneye işle&quot; derseniz
            yeni ürünlerde varsayılan olarak bu miktar gelir.
          </p>
          <table className="w-full">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="pb-2 font-medium">Kalem</th>
                <th className="pb-2 text-right font-medium">Kütüphanede</th>
                <th className="pb-2 text-right font-medium">Tekliflerinizde</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {bekleyen.map((o) => (
                <tr key={o.id} className="border-t border-cizgi">
                  <td className="py-2 pr-2">
                    {o.ad}
                    <span className="text-xs text-slate-500"> · {urunGrubuAdi(o.urunGrubu)}</span>
                  </td>
                  <td className="rakam py-2 pr-2 text-right text-slate-500">
                    {o.varsayilan != null ? `${sayiYaz(o.varsayilan)} ${o.birim}` : "boş"}
                  </td>
                  <td className="rakam py-2 pr-2 text-right">
                    {sayiYaz(o.ortanca)} {o.birim}
                    <div className="text-xs text-slate-500">{o.ornekSayisi} üründe</div>
                  </td>
                  <td className="py-2 text-right">
                    <button type="button" className="btn-ikincil btn-kucuk" disabled={calisan === o.id} onClick={() => isle(o.id, o.ortanca)}>
                      Kütüphaneye işle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hata && <p className="mt-2 text-red-600">{hata}</p>}
        </div>
      )}
    </div>
  );
}
