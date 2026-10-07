// Maliyet motoru. Hesap sırası sabittir ve değiştirilemez:
//   1. Ham birim maliyet  = Σ (kullanım × birim fiyat × kur)
//   2. Fire dahil maliyet = ham × (1 + fire%)
//   3. Teklif fiyatı      = fire dahil × (1 + kâr marjı%)
//   4. KDV dahil fiyat    = teklif × (1 + KDV%)
// KDV fiyatın içinde değildir, üzerine eklenir.
// Teklif birim fiyatı kuruşa yuvarlanır; müşteriye verilen fiyat ile iç hesap aynı kalır.
// Dolar/euro ile alınan kalemler ihalede girilen kurla TL'ye çevrilir.

export type KalemGirdi = {
  kullanim: number | null;
  birimFiyat: number | null;
  /** TL karşılığı için çarpan: TL kalemde 1 (veya boş), dövizli kalemde kur; kur girilmediyse null */
  kur?: number | null;
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
  /** Dövizli olup kuru girilmemiş kalem sayısı; teklif fiyatı hesaplanmaz */
  kurEksikKalemSayisi: number;
  /** Fire ve kâr marjı girildi mi; girilmediyse teklif fiyatı hesaplanmaz */
  fireEksik: boolean;
  karEksik: boolean;
};

/** Kalemin 1 adet ürün için TL tutarı */
export function kalemTutari(k: KalemGirdi): number {
  if (k.kullanim == null || k.birimFiyat == null || k.kur === null) return 0;
  return k.kullanim * k.birimFiyat * (k.kur ?? 1);
}

export function hesaplaUrun(u: UrunGirdi): UrunSonuc {
  const ham = u.kalemler.reduce((t, k) => t + kalemTutari(k), 0);
  const eksikKalemSayisi = u.kalemler.filter(
    (k) => k.kullanim == null || k.birimFiyat == null,
  ).length;
  const kurEksikKalemSayisi = u.kalemler.filter((k) => k.kur === null).length;

  const fireDahil = u.fireOrani == null ? null : ham * (1 + u.fireOrani / 100);
  const teklif =
    fireDahil == null || u.karMarji == null || kurEksikKalemSayisi > 0
      ? null
      : kurusaYuvarla(fireDahil * (1 + u.karMarji / 100));
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
    kurEksikKalemSayisi,
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
  /** Tutarların para birimi; eski tekliflerde yoktur (TL) */
  paraBirimi?: TeklifParaBirimi;
  /** Dövizli teklifte kullanılan kur (1 birim döviz = kur TL) */
  kur?: number | null;
  /** İhracat: KDV uygulanmadı */
  ihracat?: boolean;
  teslimSekli?: string | null;
  dil?: "tr" | "en";
};

export type TeklifParaBirimi = "TRY" | "USD" | "EUR";

export type TeklifSecenekleri = {
  paraBirimi: TeklifParaBirimi;
  /** paraBirimi TRY değilse ihalede girilen kur */
  kur: number | null;
  ihracat: boolean;
  teslimSekli?: string | null;
  dil?: "tr" | "en";
};

export class EksikBilgiHatasi extends Error {}

export function teklifOlustur(
  urunler: TeklifSatirGirdi[],
  secenek: TeklifSecenekleri = { paraBirimi: "TRY", kur: null, ihracat: false },
): TeklifOzeti {
  if (urunler.length === 0) throw new EksikBilgiHatasi("Teklifte ürün yok.");
  const dovizli = secenek.paraBirimi !== "TRY";
  if (dovizli && (secenek.kur == null || !(secenek.kur > 0))) {
    const ad = secenek.paraBirimi === "USD" ? "dolar" : "euro";
    throw new EksikBilgiHatasi(`Teklif ${ad} olarak verilecek; yukarıdan ${ad} kurunu girin.`);
  }

  const satirlar = urunler.map((u) => {
    const s = hesaplaUrun(u);
    if (s.birim.teklif == null) {
      const eksik = s.fireEksik ? "fire oranı" : s.karEksik ? "kâr marjı" : "döviz kuru";
      throw new EksikBilgiHatasi(`"${u.ad}" için ${eksik} girilmemiş.`);
    }
    // Dövizli teklifte TL teklif fiyatı ihalenin kuruyla çevrilir ve sente yuvarlanır
    const birimFiyat = kurusaYuvarla(dovizli ? s.birim.teklif / secenek.kur! : s.birim.teklif);
    return {
      ad: u.ad,
      aciklama: u.aciklama ?? "",
      adet: u.adet,
      birimFiyat,
      toplam: kurusaYuvarla(birimFiyat * u.adet),
      kdvOrani: secenek.ihracat ? 0 : u.kdvOrani,
    };
  });

  const araToplam = kurusaYuvarla(satirlar.reduce((t, s) => t + s.toplam, 0));

  // İhracatta KDV satırı hiç gösterilmez
  const oranlar = secenek.ihracat ? [] : Array.from(new Set(satirlar.map((s) => s.kdvOrani))).sort((a, b) => a - b);
  const kdvler = oranlar.map((oran) => {
    const matrah = kurusaYuvarla(
      satirlar.filter((s) => s.kdvOrani === oran).reduce((t, s) => t + s.toplam, 0),
    );
    return { oran, matrah, tutar: kurusaYuvarla((matrah * oran) / 100) };
  });

  const genelToplam = kurusaYuvarla(araToplam + kdvler.reduce((t, k) => t + k.tutar, 0));

  return {
    satirlar,
    araToplam,
    kdvler,
    genelToplam,
    paraBirimi: secenek.paraBirimi,
    kur: dovizli ? secenek.kur : null,
    ihracat: secenek.ihracat,
    teslimSekli: secenek.teslimSekli ?? null,
    dil: secenek.dil ?? "tr",
  };
}
