import { ESKI_FIYAT_GUN, gunFarki } from "@/lib/tedarikci";
import { tarihYaz } from "@/lib/format";
import type { TedarikciFiyati } from "@/lib/tipler";

/** Fiyat tarihi; 14 günden eskiyse turuncu */
export function FiyatTarihi({ tarih }: { tarih: string }) {
  const gun = gunFarki(tarih);
  const eski = gun > ESKI_FIYAT_GUN;
  return (
    <span className={`rakam whitespace-nowrap ${eski ? "text-orange-600" : "text-slate-600"}`}>
      {tarihYaz(tarih)}
      {eski && <span className="rozet ml-1 bg-orange-50 text-orange-700">{gun} gün</span>}
    </span>
  );
}

/** KDV dahil gelip ayrıldıysa veya belirsizse küçük işaret */
export function KdvRozeti({ durum }: { durum: TedarikciFiyati["kdv_durumu"] }) {
  if (durum === "dahil") return <span className="rozet bg-slate-100 text-slate-600" title="Tedarikçi KDV dahil verdi; KDV ayrıldı">KDV ayrıldı</span>;
  if (durum === "belirsiz") return <span className="rozet bg-amber-50 text-amber-800" title="Tedarikçi KDV durumunu belirtmedi">KDV belirsiz</span>;
  return null;
}
