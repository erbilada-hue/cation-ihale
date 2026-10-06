"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BAGLANTILAR = [
  { href: "/ihaleler", ad: "İhaleler" },
  { href: "/tedarikciler", ad: "Tedarikçiler" },
  { href: "/fiyat-listesi", ad: "Fiyat Listesi" },
  { href: "/kalem-kutuphanesi", ad: "Kalem Kütüphanesi" },
  { href: "/ayarlar", ad: "Ayarlar" },
];

export function YanMenu() {
  const yol = usePathname();
  return (
    <nav className="space-y-1">
      {BAGLANTILAR.map((b) => {
        const aktif = yol === b.href || yol.startsWith(b.href + "/");
        return (
          <Link
            key={b.href}
            href={b.href}
            className={`block rounded-lg px-3 py-2 text-sm transition ${
              aktif ? "bg-white/10 font-medium text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            {b.ad}
          </Link>
        );
      })}
    </nav>
  );
}
