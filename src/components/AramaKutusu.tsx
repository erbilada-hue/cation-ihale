"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Yazdıkça listeyi süzer; aranan metin adres çubuğunda (?ara=) tutulur, sekme seçimi korunur */
export default function AramaKutusu({ etiket, ipucu }: { etiket: string; ipucu: string }) {
  const router = useRouter();
  const yol = usePathname();
  const params = useSearchParams();
  const [arama, setArama] = useState(params.get("ara") ?? "");
  const adrestekiArama = params.get("ara") ?? "";

  const gonderilen = useRef(adrestekiArama);

  // "Temizle" gibi dışarıdan değişince kutu da güncellensin (kendi gönderdiğimiz değer hariç)
  useEffect(() => {
    if (adrestekiArama === gonderilen.current) return;
    gonderilen.current = adrestekiArama;
    setArama(adrestekiArama);
  }, [adrestekiArama]);

  useEffect(() => {
    const z = setTimeout(() => {
      const p = new URLSearchParams(params.toString());
      gonderilen.current = arama.trim();
      if (arama.trim()) p.set("ara", arama.trim());
      else p.delete("ara");
      if (p.toString() !== params.toString()) router.replace(p.toString() ? `${yol}?${p}` : yol, { scroll: false });
    }, 250);
    return () => clearTimeout(z);
  }, [arama, params, router, yol]);

  return (
    <input
      type="search"
      aria-label={etiket}
      value={arama}
      onChange={(e) => setArama(e.target.value)}
      placeholder={ipucu}
      className="girdi w-full sm:w-72"
    />
  );
}
