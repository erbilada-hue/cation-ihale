import { sunucuIstemcisi } from "@/lib/supabase/server";
import {
  bekleyenTalepleriGetir,
  firmaAyarlariGetir,
  fiyatListesiniGetir,
  kalemSablonlariniGetir,
  tedarikcileriGetir,
} from "@/lib/veri";
import { FiyatListesi } from "./FiyatListesi";

export const dynamic = "force-dynamic";

export default async function FiyatListesiSayfasi() {
  const supabase = sunucuIstemcisi();
  const [fiyatlar, tedarikciler, talepler, sablonlar, firma] = await Promise.all([
    fiyatListesiniGetir(supabase),
    tedarikcileriGetir(supabase),
    bekleyenTalepleriGetir(supabase),
    kalemSablonlariniGetir(supabase),
    firmaAyarlariGetir(supabase),
  ]);
  const oneriler = Array.from(new Set(sablonlar.map((s) => s.ad))).sort((a, b) => a.localeCompare(b, "tr"));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-brand-dark">Fiyat Listesi</h1>
        <p className="text-sm text-slate-500">
          Tedarikçilerden gelen son fiyatlar (KDV hariç). 14 günden eski fiyatlar turuncu görünür.
        </p>
      </div>
      <FiyatListesi
        ilkFiyatlar={fiyatlar}
        tedarikciler={tedarikciler}
        ilkTalepler={talepler}
        kalemOnerileri={oneriler}
        kdvOrani={firma?.varsayilan_kdv_orani ?? 20}
        firmaAdi={firma?.firma_adi ?? ""}
      />
    </div>
  );
}
