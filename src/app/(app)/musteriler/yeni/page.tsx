import Link from "next/link";
import { MusteriFormu } from "../MusteriFormu";

export default function YeniMusteriSayfasi() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1 text-sm">
        <Link href="/musteriler" className="text-slate-500 hover:text-brand">
          ← Müşteriler
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-semibold text-brand-dark">Yeni müşteri</h1>
      <MusteriFormu />
    </div>
  );
}
