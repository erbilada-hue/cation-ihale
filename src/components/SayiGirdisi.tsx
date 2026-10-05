"use client";

import { useEffect, useRef, useState } from "react";
import { sayiOku, sayiYaz } from "@/lib/format";

type Props = {
  deger: number | null;
  onDeger: (n: number | null) => void;
  tamSayi?: boolean;
  bosOlamaz?: boolean;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  sonEk?: string;
};

/** Türkçe yazımla (1.234,56) sayı girişi. Geçerli her değişikliği anında bildirir. */
export function SayiGirdisi({ deger, onDeger, tamSayi, bosOlamaz, className, placeholder, ariaLabel, sonEk }: Props) {
  const [metin, setMetin] = useState(sayiYaz(deger));
  const [hatali, setHatali] = useState(false);
  const odakta = useRef(false);

  useEffect(() => {
    if (!odakta.current) setMetin(sayiYaz(deger));
  }, [deger]);

  function degisti(yeni: string) {
    setMetin(yeni);
    const n = sayiOku(yeni);
    const gecersiz = Boolean(
      (n == null && bosOlamaz) || (n != null && (Number.isNaN(n) || n < 0 || (tamSayi && !Number.isInteger(n)))),
    );
    setHatali(gecersiz);
    if (!gecersiz) onDeger(n);
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        aria-invalid={hatali}
        value={metin}
        placeholder={placeholder}
        onFocus={() => (odakta.current = true)}
        onBlur={() => {
          odakta.current = false;
          if (!hatali) setMetin(sayiYaz(deger));
        }}
        onChange={(e) => degisti(e.target.value)}
        className={`${className ?? "girdi-sayi"} ${sonEk ? "pr-7" : ""} ${hatali ? "!border-red-400 !ring-red-100" : ""}`}
      />
      {sonEk && (
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-slate-400">
          {sonEk}
        </span>
      )}
    </div>
  );
}
