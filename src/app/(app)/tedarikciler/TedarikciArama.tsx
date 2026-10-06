"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** Yazdıkça listeyi süzer; aranan metin adres çubuğunda (?ara=) tutulur, sekme seçimi korunur */
export default function TedarikciArama() {
  const router = useRouter();
  const yol = usePathname();
  const params = useSearchParams();
  const [arama, setArama] = useState(params.get("ara") ?? "");

  useEffect(() => {
    const z = setTimeout(() => {
      const p = new URLSearchParams(params.toString());
      if (arama.trim()) p.set("ara", arama.trim());
      else p.delete("ara");
      if (p.toString() !== params.toString()) router.replace(p.toString() ? `${yol}?${p}` : yol, { scroll: false });
    }, 250);
    return () => clearTimeout(z);
  }, [arama, params, router, yol]);

  return (
    <input
      type="search"
      aria-label="Tedarikçi ara"
      value={arama}
      onChange={(e) => setArama(e.target.value)}
      placeholder="Tedarikçi, yetkili veya telefon ara…"
      className="girdi w-72"
    />
  );
}
