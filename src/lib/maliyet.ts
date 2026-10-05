// Maliyet motoru. Hesap sırası sabittir ve değiştirilemez:
//   1. Ham birim maliyet  = Σ (kullanım × birim fiyat)
//   2. Fire dahil maliyet = ham × (1 + fire%)
//   3. Teklif fiyatı      = fire dahil × (1 + kâr marjı%)
//   4. KDV dahil fiyat    = teklif × (1 + KDV%)
// KDV fiyatın içinde değildir, üzerine eklenir.
// Teklif birim fiyatı kuruşa yuvarlanır; müşteriye verilen fiyat ile iç hesap aynı kalır.

export type KalemGirdi = {
  kullanim: number | null;
  birimFiyat: number | null;
};

export type UrunGirdi = {
  adet: number;
  fireOrani: number | null;
  karMarji: number | null;
  kdvOrani: number;
  kalemler: KalemGirdi[];
};

export type BirimTutarlar = {
  ham: number;
  fireTutari: number | null;
  fireDahil: number | null;
  karTutari: number | null;
  teklif: number | null;
  kdvTutari: number | null;
  kdvDahil: number | null;
};

export type UrunSonuc = {
  birim: BirimTutarlar;
  toplam: BirimTutarlar;
  /** Kullanım veya birim fiyatı girilmemiş kalem sayısı */
  eksikKalemSayisi: number;
  /** Fire ve kâr marjı girildi mi; girilmediyse teklif fiyatı hesaplanmaz */
  fireEksik: boolean;
  karEksik: boolean;
};

export function kalemTutari(k: KalemGirdi): number {
  if (k.kullanim == null || k.birimFiyat == null) return 0;
  return k.kullanim * k.birimFiyat;
}

export function hesaplaUrun(u: UrunGirdi): UrunSonuc {
  const ham = u.kalemler.reduce((t, k) => t + kalemTutari(k), 0);
  const eksikKalemSayisi = u.kalemler.filter(
    (k) => k.kullanim == null || k.birimFiyat == null,
  ).length;

  const fireDahil = u.fireOrani == null ? null : ham * (1 + u.fireOrani / 100);
  const teklif =
    fireDahil == null || u.karMarji == null ? null : kurusaYuvarla(fireDahil * (1 + u.karMarji / 100));
  const kdvDahil = teklif == null ? null : teklif * (1 + u.kdvOrani / 100);

  const birim: BirimTutarlar = {
    ham,
    fireTutari: fireDahil == null ? null : fireDahil - ham,
    fireDahil,
    karTutari: teklif == null || fireDahil == null ? null : teklif - fireDahil,
    teklif,
    kdvTutari: kdvDahil == null || teklif == null ? null : kdvDahil - teklif,
    kdvDahil,
  };

  return {
    birim,
    toplam: carp(birim, u.adet),
    eksikKalemSayisi,
    fireEksik: u.fireOrani == null,
    karEksik: u.karMarji == null,
  };
}

function carp(b: BirimTutarlar, adet: number): BirimTutarlar {
  const c = (n: number | null) => (n == null ? null : n * adet);
  return {
    ham: b.ham * adet,
    fireTutari: c(b.fireTutari),
    fireDahil: c(b.fireDahil),
    karTutari: c(b.karTutari),
    teklif: c(b.teklif),
    kdvTutari: c(b.kdvTutari),
    kdvDahil: c(b.kdvDahil),
  };
}

export function kurusaYuvarla(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Müşteri teklifi: birim fiyat kuruşa yuvarlanır, toplamlar yuvarlanmış birim
// fiyattan hesaplanır ki müşteri kendi hesabıyla aynı sonucu bulsun.
// ---------------------------------------------------------------------------

export type TeklifSatirGirdi = UrunGirdi & { ad: string; aciklama?: string };

export type TeklifSatiri = {
  ad: string;
  aciklama: string;
  adet: number;
  birimFiyat: number;
  toplam: number;
  kdvOrani: number;
};

export type TeklifOzeti = {
  satirlar: TeklifSatiri[];
  araToplam: number;
  kdvler: { oran: number; matrah: number; tutar: number }[];
  genelToplam: number;
};

export class EksikBilgiHatasi extends Error {}

export function teklifOlustur(urunler: TeklifSatirGirdi[]): TeklifOzeti {
  if (urunler.length === 0) throw new EksikBilgiHatasi("Teklifte ürün yok.");

  const satirlar = urunler.map((u) => {
    const s = hesaplaUrun(u);
    if (s.birim.teklif == null) {
      throw new EksikBilgiHatasi(
        `"${u.ad}" için ${s.fireEksik ? "fire oranı" : "kâr marjı"} girilmemiş.`,
      );
    }
    const birimFiyat = kurusaYuvarla(s.birim.teklif);
    return {
      ad: u.ad,
      aciklama: u.aciklama ?? "",
      adet: u.adet,
      birimFiyat,
      toplam: kurusaYuvarla(birimFiyat * u.adet),
      kdvOrani: u.kdvOrani,
    };
  });

  const araToplam = kurusaYuvarla(satirlar.reduce((t, s) => t + s.toplam, 0));

  const oranlar = Array.from(new Set(satirlar.map((s) => s.kdvOrani))).sort((a, b) => a - b);
  const kdvler = oranlar.map((oran) => {
    const matrah = kurusaYuvarla(
      satirlar.filter((s) => s.kdvOrani === oran).reduce((t, s) => t + s.toplam, 0),
    );
    return { oran, matrah, tutar: kurusaYuvarla((matrah * oran) / 100) };
  });

  const genelToplam = kurusaYuvarla(araToplam + kdvler.reduce((t, k) => t + k.tutar, 0));

  return { satirlar, araToplam, kdvler, genelToplam };
}
