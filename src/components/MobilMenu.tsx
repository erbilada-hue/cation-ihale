"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { YanMenu } from "./YanMenu";

/** Telefonda üstte görünen çubuk: menü düğmesine basınca yan menü soldan açılır */
export function MobilMenu({ eposta, cikis }: { eposta: string; cikis: () => Promise<void> }) {
  const [acik, setAcik] = useState(false);
  const yol = usePathname();

  useEffect(() => setAcik(false), [yol]);
  useEffect(() => {
    document.body.style.overflow = acik ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [acik]);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between bg-brand-dark px-4 py-3 text-white md:hidden print:hidden">
        <div>
          <div className="text-base font-bold tracking-wider">CATION</div>
          <div className="text-[11px] leading-none text-white/60">İhale Maliyet Sistemi</div>
        </div>
        <button
          type="button"
          onClick={() => setAcik(true)}
          aria-label="Menüyü aç"
          className="-mr-2 rounded-lg p-2 hover:bg-white/10"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </header>

      {acik && (
        <div className="fixed inset-0 z-40 md:hidden print:hidden">
          <button type="button" aria-label="Menüyü kapat" className="absolute inset-0 bg-black/40" onClick={() => setAcik(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[80%] flex-col bg-brand-dark px-3 py-5 text-white shadow-xl">
            <div className="mb-6 flex items-start justify-between px-3">
              <div>
                <div className="text-lg font-bold tracking-wider">CATION</div>
                <div className="text-xs text-white/60">İhale Maliyet Sistemi</div>
              </div>
              <button type="button" onClick={() => setAcik(false)} aria-label="Menüyü kapat" className="-mr-1 rounded-lg p-1 hover:bg-white/10">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <YanMenu />
            <div className="mt-auto border-t border-white/10 px-3 pt-4">
              <div className="truncate text-xs text-white/60">{eposta}</div>
              <form action={cikis}>
                <button type="submit" className="mt-2 text-sm text-white/80 hover:text-white">
                  Çıkış yap
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
