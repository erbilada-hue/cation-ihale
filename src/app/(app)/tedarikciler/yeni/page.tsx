import Link from "next/link";
import { TedarikciFormu } from "../TedarikciFormu";

export default function YeniTedarikciSayfasi() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1 text-sm">
        <Link href="/tedarikciler" className="text-slate-500 hover:text-brand">
          ← Tedarikçiler
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-semibold text-brand-dark">Yeni tedarikçi</h1>
      <TedarikciFormu />
    </div>
  );
}
