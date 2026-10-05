"use client";

import { useCallback, useRef, useState } from "react";

export type KayitDurumu = "bos" | "kaydediliyor" | "kaydedildi" | "hata";

/**
 * Değişiklikleri kısa bir gecikmeyle sunucuya kaydeder. Aynı anahtar için
 * art arda gelen değişiklikler birleştirilir.
 */
export function useKayit(gecikme = 600) {
  const [durum, setDurum] = useState<KayitDurumu>("bos");
  const [hata, setHata] = useState<string | null>(null);
  const bekleyen = useRef(new Map<string, { zamanlayici: ReturnType<typeof setTimeout>; is: () => Promise<{ hata?: string }> }>());
  const calisan = useRef(new Set<Promise<unknown>>());
  // Bir kayıt başarısız olduysa ekrandaki ile veritabanı farklı olabilir
  const kaydedilemeyenVar = useRef(false);

  const calistir = useCallback(async (is: () => Promise<{ hata?: string }>) => {
    setDurum("kaydediliyor");
    const p = is()
      .then((s) => {
        if (s.hata) {
          kaydedilemeyenVar.current = true;
          setHata(s.hata);
          setDurum("hata");
        } else if (bekleyen.current.size === 0) {
          setHata(null);
          setDurum("kaydedildi");
        }
      })
      .catch(() => {
        kaydedilemeyenVar.current = true;
        setHata("Bağlantı hatası, değişiklik kaydedilemedi.");
        setDurum("hata");
      });
    calisan.current.add(p);
    await p;
    calisan.current.delete(p);
  }, []);

  const planla = useCallback(
    (anahtar: string, is: () => Promise<{ hata?: string }>) => {
      const eski = bekleyen.current.get(anahtar);
      if (eski) clearTimeout(eski.zamanlayici);
      setDurum("kaydediliyor");
      const zamanlayici = setTimeout(() => {
        bekleyen.current.delete(anahtar);
        void calistir(is);
      }, gecikme);
      bekleyen.current.set(anahtar, { zamanlayici, is });
    },
    [calistir, gecikme],
  );

  /** Bekleyen tüm kayıtları hemen gönderir; hepsi kaydedildiyse true döner. */
  const bosalt = useCallback(async (): Promise<boolean> => {
    const isler = Array.from(bekleyen.current.values());
    bekleyen.current.clear();
    isler.forEach((b) => clearTimeout(b.zamanlayici));
    await Promise.all([...isler.map((b) => calistir(b.is)), ...Array.from(calisan.current)]);
    return !kaydedilemeyenVar.current;
  }, [calistir]);

  /** Bir anahtarın bekleyen kaydını iptal eder (ör. satır silinince). */
  const iptal = useCallback((onEk: string) => {
    for (const [k, b] of Array.from(bekleyen.current.entries())) {
      if (k.startsWith(onEk)) {
        clearTimeout(b.zamanlayici);
        bekleyen.current.delete(k);
      }
    }
  }, []);

  return { durum, hata, planla, bosalt, iptal, calistir };
}
