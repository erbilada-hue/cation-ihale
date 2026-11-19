"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** İhale listesini tek bir müşteriye göre süzer; seçim adres çubuğunda (?musteri=) tutulur */
export function MusteriSuzgeci({ musteriler }: { musteriler: { ad: string; sayi: number }[] }) {
  const router = useRouter();
  const yol = usePathname();
  const params = useSearchParams();
  const secili = params.get("musteri") ?? "";

  function sec(ad: string) {
    const p = new URLSearchParams(params.toString());
    if (ad) p.set("musteri", ad);
    else p.delete("musteri");
    router.replace(p.toString() ? `${yol}?${p}` : yol, { scroll: false });
  }

  return (
    <select aria-label="Müşteriye göre süz" value={secili} onChange={(e) => sec(e.target.value)} className="girdi w-full sm:w-64">
      <option value="">Tüm müşteriler</option>
      {secili && !musteriler.some((m) => m.ad === secili) && <option value={secili}>{secili}</option>}
      {musteriler.map((m) => (
        <option key={m.ad} value={m.ad}>
          {m.ad} ({m.sayi})
        </option>
      ))}
    </select>
  );
}
