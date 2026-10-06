"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { hesaplaUrun, kalemTutari } from "@/lib/maliyet";
import { kalemGirdisi, maliyetGirdisi, type Kurlar } from "@/lib/maliyetGirdisi";
import { adetYaz, paraYaz, tarihYaz } from "@/lib/format";
import { BIRIMLER, HAZIR_URUN, PARA_BIRIMLERI, URUN_GRUPLARI, urunGrubuAdi } from "@/lib/sabitler";
import { useKayit } from "@/lib/useKayit";
import { SayiGirdisi } from "@/components/SayiGirdisi";
import { SartnameDosyalari } from "@/components/SartnameDosyalari";
import { SartnameAnalizi } from "@/components/SartnameAnalizi";
import type { MarjOnerisi } from "@/lib/marjTavsiyesi";
import { eskiMi, gunFarki, kalemAnahtari, kalemleEslesir, otomatikFiyat } from "@/lib/tedarikci";
import { fiyatYaz } from "@/lib/format";
import type { IhaleDosyasi, KalemSablonu, SegmentSablonu, TedarikciFiyatiAdli, Teklif, UrunKalemi, UrunKalemli } from "@/lib/tipler";
import {
  ihaleKurGuncelle,
  kalemEkle,
  kalemGuncelle,
  kalemSil,
  marjTavsiyesiAl,
  musteriTeklifiOlustur,
  urunEkle,
  urunGuncelle,
  urunSil,
} from "../actions";

type Props = {
  ihaleId: string;
  ilkKurlar: Kurlar;
  ilkUrunler: UrunKalemli[];
  sablonlar: KalemSablonu[];
  teklifler: Teklif[];
  dosyalar: IhaleDosyasi[];
  /** Tedarikçi fiyat listesi; kalemlere fiyat seçmek için */
  fiyatListesi: TedarikciFiyatiAdli[];
  segmentler: SegmentSablonu[];
  /** İhaleyi açarken kullanıcının seçtiği segment */
  ihaleSegmenti: string | null;
};

export function MaliyetEditoru({
  ihaleId,
  ilkKurlar,
  ilkUrunler,
  sablonlar,
  teklifler,
  dosyalar,
  fiyatListesi,
  segmentler,
  ihaleSegmenti,
}: Props) {
  const router = useRouter();
  const [urunler, setUrunler] = useState(ilkUrunler);
  const [kurlar, setKurlar] = useState(ilkKurlar);
  const [islemHatasi, setIslemHatasi] = useState<string | null>(null);
  const [teklifHazirlaniyor, setTeklifHazirlaniyor] = useState(false);
  const [analizDosyasi, setAnalizDosyasi] = useState<IhaleDosyasi | null>(null);
  const [analizMesaji, setAnalizMesaji] = useState<string | null>(null);
  const kayit = useKayit();

  const sonuclar = useMemo(
    () => urunler.map((u) => ({ urun: u, sonuc: hesaplaUrun(maliyetGirdisi(u, kurlar)) })),
    [urunler, kurlar],
  );
  const dovizliParaBirimleri = new Set(
    urunler.flatMap((u) => u.urun_kalemleri.map((k) => k.para_birimi)).filter((p) => p !== "TRY"),
  );

  const genel = useMemo(() => {
    const t = { maliyet: 0, teklif: 0, kdv: 0, kdvDahil: 0, netKar: 0, eksik: false, kurEksik: false };
    for (const { sonuc } of sonuclar) {
      t.maliyet += sonuc.toplam.fireDahil ?? sonuc.toplam.ham;
      if (sonuc.kurEksikKalemSayisi > 0) t.kurEksik = true;
      if (sonuc.toplam.teklif == null) {
        t.eksik = true;
        continue;
      }
      t.teklif += sonuc.toplam.teklif;
      t.kdv += sonuc.toplam.kdvTutari ?? 0;
      t.kdvDahil += sonuc.toplam.kdvDahil ?? 0;
      t.netKar += sonuc.toplam.karTutari ?? 0;
    }
    return t;
  }, [sonuclar]);

  // --- Durum güncelleyiciler -------------------------------------------------

  function kurDegistir(paraBirimi: "USD" | "EUR", kur: number | null) {
    setKurlar((k) => ({ ...k, [paraBirimi]: kur }));
    const alan = paraBirimi === "USD" ? "usd_kuru" : "eur_kuru";
    kayit.planla(`ihale:${ihaleId}:${alan}`, () => ihaleKurGuncelle(ihaleId, { [alan]: kur }));
  }

  function urunDegistir(urunId: string, degisiklik: Partial<UrunKalemli>) {
    setUrunler((liste) => liste.map((u) => (u.id === urunId ? { ...u, ...degisiklik } : u)));
    for (const [alan, deger] of Object.entries(degisiklik)) {
      kayit.planla(`urun:${urunId}:${alan}`, () =>
        urunGuncelle(urunId, { [alan]: deger as string | number | null }),
      );
    }
  }

  function kalemDegistir(urunId: string, kalemId: string, degisiklik: Partial<UrunKalemi>) {
    setUrunler((liste) =>
      liste.map((u) =>
        u.id === urunId
          ? { ...u, urun_kalemleri: u.urun_kalemleri.map((k) => (k.id === kalemId ? { ...k, ...degisiklik } : k)) }
          : u,
      ),
    );
    for (const [alan, deger] of Object.entries(degisiklik)) {
      kayit.planla(`kalem:${kalemId}:${alan}`, () =>
        kalemGuncelle(kalemId, { [alan]: deger as string | number | null }),
      );
    }
  }

  async function kalemiEkle(urunId: string, girdi: { sablonId: string } | { ad: string; birim: string }) {
    setIslemHatasi(null);
    const s = await kalemEkle(urunId, girdi);
    if (s.hata !== undefined) return setIslemHatasi(s.hata);
    setUrunler((liste) =>
      liste.map((u) => (u.id === urunId ? { ...u, urun_kalemleri: [...u.urun_kalemleri, s.veri] } : u)),
    );
  }

  async function kalemiSil(urunId: string, kalem: UrunKalemi) {
    const soru = kalem.zorunlu
      ? `"${kalem.ad}" zorunlu bir kalem. Yine de silinsin mi?`
      : `"${kalem.ad}" kalemi silinsin mi?`;
    if (!confirm(soru)) return;
    kayit.iptal(`kalem:${kalem.id}:`);
    const s = await kalemSil(kalem.id);
    if (s.hata !== undefined) return setIslemHatasi(s.hata);
    setUrunler((liste) =>
      liste.map((u) =>
        u.id === urunId ? { ...u, urun_kalemleri: u.urun_kalemleri.filter((k) => k.id !== kalem.id) } : u,
      ),
    );
  }

  async function urunuSil(urun: UrunKalemli) {
    if (!confirm(`"${urun.ad}" ürünü ve tüm kalemleri silinsin mi? Bu işlem geri alınamaz.`)) return;
    kayit.iptal(`urun:${urun.id}:`);
    urun.urun_kalemleri.forEach((k) => kayit.iptal(`kalem:${k.id}:`));
    const s = await urunSil(urun.id);
    if (s.hata !== undefined) return setIslemHatasi(s.hata);
    setUrunler((liste) => liste.filter((u) => u.id !== urun.id));
  }

  // Tarayıcılar, tıklamadan sonra beklenip açılan pencereyi engeller. Bu yüzden
  // sekme tıklama anında açılır, PDF hazır olunca o sekmeye yönlendirilir.
  function pdfSekmesiAc() {
    const sekme = window.open("", "_blank");
    if (sekme) {
      sekme.document.title = "PDF hazırlanıyor…";
      sekme.document.body.innerHTML =
        '<p style="font-family:sans-serif;color:#64748b;padding:24px">PDF hazırlanıyor…</p>';
    }
    return {
      git(adres: string) {
        if (sekme && !sekme.closed) sekme.location.href = adres;
        else window.location.href = adres;
      },
      kapat() {
        sekme?.close();
      },
    };
  }

  async function teklifHazirla() {
    setIslemHatasi(null);
    setTeklifHazirlaniyor(true);
    const sekme = pdfSekmesiAc();
    try {
      const tamam = await kayit.bosalt();
      if (!tamam) {
        sekme.kapat();
        setIslemHatasi("Bazı değişiklikler kaydedilemedi. Sayfayı yenileyip tekrar deneyin.");
        return;
      }
      const s = await musteriTeklifiOlustur(ihaleId);
      if (s.hata !== undefined) {
        sekme.kapat();
        return setIslemHatasi(s.hata);
      }
      sekme.git(`/api/pdf/teklif/${s.veri.teklifId}`);
      router.refresh();
    } catch {
      sekme.kapat();
      setIslemHatasi("Teklif oluşturulamadı. Sayfayı yenileyip tekrar deneyin.");
    } finally {
      setTeklifHazirlaniyor(false);
    }
  }

  async function icRaporAc() {
    setIslemHatasi(null);
    const sekme = pdfSekmesiAc();
    const tamam = await kayit.bosalt();
    if (!tamam) {
      sekme.kapat();
      setIslemHatasi("Bazı değişiklikler kaydedilemedi. Sayfayı yenileyip tekrar deneyin.");
      return;
    }
    sekme.git(`/api/pdf/maliyet/${ihaleId}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex h-5 items-center justify-end text-xs">
        {kayit.durum === "kaydediliyor" && <span className="text-slate-500">Kaydediliyor…</span>}
        {kayit.durum === "kaydedildi" && <span className="text-green-700">Tüm değişiklikler kaydedildi</span>}
        {kayit.durum === "hata" && <span className="text-red-600">{kayit.hata}</span>}
      </div>

      <section className="kart flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
        <div className="mr-auto">
          <h2 className="font-semibold text-brand-dark">Döviz kurları</h2>
          <p className="text-xs text-slate-500">Dolar veya euro ile alınan kalemler bu kurla TL&apos;ye çevrilir.</p>
        </div>
        {(["USD", "EUR"] as const).map((p) => (
          <div key={p} className="flex items-center gap-2 text-sm">
            <span className="rakam text-slate-600">1 {p === "USD" ? "$" : "€"} =</span>
            <div className="w-28">
              <SayiGirdisi
                deger={kurlar[p]}
                onDeger={(n) => kurDegistir(p, n)}
                sonEk="₺"
                className="girdi-sayi py-1.5"
                ariaLabel={p === "USD" ? "Dolar kuru" : "Euro kuru"}
                placeholder="gir"
              />
            </div>
            {dovizliParaBirimleri.has(p) && kurlar[p] == null && (
              <span className="text-xs text-amber-700">gerekli</span>
            )}
          </div>
        ))}
      </section>

      <section className="kart px-6 py-4">
        <h2 className="font-semibold text-brand-dark">Teknik şartname ve dosyalar</h2>
        <p className="mb-3 text-sm text-slate-500">
          Müşterinin dosyasını yükleyip &quot;Yapay zekâ ile analiz et&quot;e basın; ürünler, adetler ve kalemler çıkarılır, siz
          onaylayınca maliyet tablosu oluşur.
        </p>
        <SartnameDosyalari
          ihaleId={ihaleId}
          urunId={null}
          ilkDosyalar={dosyalar.filter((d) => !d.urun_id)}
          onAnaliz={(d) => {
            setAnalizMesaji(null);
            setAnalizDosyasi(d);
          }}
        />
        {analizDosyasi && (
          <SartnameAnalizi
            key={analizDosyasi.id}
            ihaleId={ihaleId}
            dosya={analizDosyasi}
            sablonlar={sablonlar}
            segmentler={segmentler}
            oncekiSegment={ihaleSegmenti}
            mevcutUrunSayisi={urunler.length}
            onUygulandi={(yeni) => {
              setUrunler((l) => [...l, ...yeni]);
              setAnalizDosyasi(null);
              setAnalizMesaji(
                `${yeni.length} ürün ve kalemleri oluşturuldu. Fiyat listesinde karşılığı olan kalemler otomatik doldurulabilir; kullanım miktarlarını kontrol edin.`,
              );
              router.refresh();
            }}
            onKapat={() => setAnalizDosyasi(null)}
          />
        )}
        {analizMesaji && <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{analizMesaji}</p>}
      </section>

      {sonuclar.map(({ urun, sonuc }) => (
        <UrunKarti
          key={urun.id}
          urun={urun}
          sonuc={sonuc}
          sablonlar={sablonlar.filter((s) => s.urun_grubu === urun.urun_grubu)}
          kurlar={kurlar}
          dosyalar={dosyalar.filter((d) => d.urun_id === urun.id)}
          fiyatListesi={fiyatListesi}
          onUrun={(d) => urunDegistir(urun.id, d)}
          onKalem={(kalemId, d) => kalemDegistir(urun.id, kalemId, d)}
          onKalemEkle={(g) => kalemiEkle(urun.id, g)}
          onKalemSil={(k) => kalemiSil(urun.id, k)}
          onSil={() => urunuSil(urun)}
        />
      ))}

      <UrunEkleFormu
        onEkle={async (girdi) => {
          setIslemHatasi(null);
          const s = await urunEkle(ihaleId, girdi);
          if (s.hata !== undefined) {
            setIslemHatasi(s.hata);
            return false;
          }
          setUrunler((l) => [...l, s.veri]);
          return true;
        }}
      />

      {islemHatasi && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{islemHatasi}</div>
      )}

      {urunler.length > 0 && (
        <section className="kart p-6">
          <h2 className="mb-4 font-semibold text-brand-dark">İhale toplamı</h2>
          <div className="grid grid-cols-5 gap-4 text-sm">
            <Ozet baslik="Toplam maliyet (fire dahil)" deger={paraYaz(genel.maliyet)} />
            <Ozet baslik="Teklif toplamı (KDV hariç)" deger={genel.eksik ? "—" : paraYaz(genel.teklif)} vurgulu />
            <Ozet baslik="KDV" deger={genel.eksik ? "—" : paraYaz(genel.kdv)} />
            <Ozet baslik="KDV dahil toplam" deger={genel.eksik ? "—" : paraYaz(genel.kdvDahil)} />
            <Ozet baslik="Net kâr" deger={genel.eksik ? "—" : paraYaz(genel.netKar)} />
          </div>
          {genel.eksik && (
            <p className="mt-3 text-sm text-amber-700">
              {genel.kurEksik
                ? "Dövizli kalemler var; teklif toplamı için yukarıdan dolar/euro kurunu girin."
                : "Teklif toplamı için her üründe fire oranı ve kâr marjı girilmeli."}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn-birincil" disabled={genel.eksik || teklifHazirlaniyor} onClick={teklifHazirla}>
              {teklifHazirlaniyor ? "Teklif hazırlanıyor…" : "Müşteri Teklifi Oluştur (PDF)"}
            </button>
            <button type="button" className="btn-ikincil" onClick={icRaporAc}>
              İç Maliyet Raporu (PDF)
            </button>
          </div>
        </section>
      )}

      {teklifler.length > 0 && (
        <section className="kart p-6">
          <h2 className="mb-3 font-semibold text-brand-dark">Verilen teklifler</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="py-2 font-medium">Teklif no</th>
                <th className="py-2 font-medium">Tarih</th>
                <th className="py-2 font-medium">Geçerlilik</th>
                <th className="py-2 text-right font-medium">Toplam (KDV hariç)</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cizgi">
              {teklifler.map((t) => (
                <tr key={t.id}>
                  <td className="rakam py-2">{t.teklif_no}</td>
                  <td className="rakam py-2">{tarihYaz(t.teklif_tarihi)}</td>
                  <td className="rakam py-2">{tarihYaz(t.gecerlilik_tarihi)}</td>
                  <td className="rakam py-2 text-right">{paraYaz(t.icerik.araToplam)}</td>
                  <td className="py-2 text-right">
                    <a href={`/api/pdf/teklif/${t.id}`} target="_blank" rel="noopener" className="text-brand hover:underline">
                      PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function Ozet({ baslik, deger, vurgulu }: { baslik: string; deger: string; vurgulu?: boolean }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{baslik}</div>
      <div className={`rakam mt-1 ${vurgulu ? "text-lg font-semibold text-brand" : "text-base text-brand-dark"}`}>
        {deger}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

type UrunKartiProps = {
  urun: UrunKalemli;
  sonuc: ReturnType<typeof hesaplaUrun>;
  sablonlar: KalemSablonu[];
  kurlar: Kurlar;
  dosyalar: IhaleDosyasi[];
  fiyatListesi: TedarikciFiyatiAdli[];
  onUrun: (d: Partial<UrunKalemli>) => void;
  onKalem: (kalemId: string, d: Partial<UrunKalemi>) => void;
  onKalemEkle: (g: { sablonId: string } | { ad: string; birim: string }) => Promise<void>;
  onKalemSil: (k: UrunKalemi) => void;
  onSil: () => void;
};

function UrunKarti({
  urun,
  sonuc,
  sablonlar,
  kurlar,
  dosyalar,
  fiyatListesi,
  onUrun,
  onKalem,
  onKalemEkle,
  onKalemSil,
  onSil,
}: UrunKartiProps) {
  const b = sonuc.birim;
  const t = sonuc.toplam;
  const [acikListe, setAcikListe] = useState<string | null>(null);
  const [listeArama, setListeArama] = useState("");

  // Kalem adına ya da aynı aileye (ör. "Ana fermuar" ↔ "Fermuar") göre tedarikçi fiyatları
  const eslesenler = (k: UrunKalemi) => fiyatListesi.filter((f) => kalemleEslesir(f.kalem_adi, k.ad));
  const fiyatSec = (k: UrunKalemi, f: TedarikciFiyatiAdli) =>
    onKalem(k.id, { birim_fiyat: f.fiyat, para_birimi: f.para_birimi, tedarikci_fiyat_id: f.id });
  // Otomatik doldurma sadece tek bir ürünü anlatan, adı birebir aynı fiyatlarda yapılır
  const otomatikler = urun.urun_kalemleri
    .filter((k) => k.birim_fiyat == null)
    .map((k) => ({ k, f: otomatikFiyat(k.ad, fiyatListesi, kurlar) }))
    .filter((x): x is { k: UrunKalemi; f: TedarikciFiyatiAdli } => x.f != null);

  function bosFiyatlariDoldur() {
    for (const { k, f } of otomatikler) fiyatSec(k, f);
  }

  return (
    <section className="kart">
      <header className="flex items-start justify-between gap-4 border-b border-cizgi px-6 py-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-xs text-slate-500">{urunGrubuAdi(urun.urun_grubu)}</div>
          <input
            aria-label="Ürün adı"
            value={urun.ad}
            onChange={(e) => onUrun({ ad: e.target.value })}
            className="w-full rounded border border-transparent bg-transparent px-1 -ml-1 text-lg font-semibold text-brand-dark outline-none hover:border-cizgi focus:border-brand"
          />
          <input
            aria-label="Açıklama"
            value={urun.aciklama}
            placeholder="Açıklama (müşteri teklifinde görünür)"
            onChange={(e) => onUrun({ aciklama: e.target.value })}
            className="mt-1 w-full rounded border border-transparent bg-transparent px-1 -ml-1 text-sm text-slate-600 outline-none hover:border-cizgi focus:border-brand"
          />
        </div>
        <div className="flex items-end gap-3">
          <div className="w-32">
            <label className="etiket">Adet</label>
            <SayiGirdisi deger={urun.adet} tamSayi bosOlamaz onDeger={(n) => n != null && n > 0 && onUrun({ adet: n })} ariaLabel="Adet" />
          </div>
          <button type="button" className="btn-tehlike btn-kucuk mb-1" onClick={onSil}>
            Ürünü sil
          </button>
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_320px]">
        <div className="border-r border-cizgi p-6">
          {urun.urun_grubu === HAZIR_URUN && (
            <p className="mb-4 rounded-lg bg-zemin px-3 py-2 text-xs text-slate-600">
              Hazır ürün: ilk satıra tedarikçiden <strong>1 adet alış fiyatını</strong> girin ya da fiyat listesinden seçin.
              Logo baskı, ambalaj veya nakliye varsa kalem olarak ekleyin.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="min-w-44 pb-2 font-medium">Kalem</th>
                  <th className="w-24 pb-2 font-medium">Birim</th>
                  <th className="w-24 pb-2 text-right font-medium">Kullanım</th>
                  <th className="w-40 pb-2 text-right font-medium">Birim fiyat</th>
                  <th className="w-24 pb-2 text-right font-medium">Tutar (₺)</th>
                  <th className="w-8 pb-2" />
                </tr>
              </thead>
              <tbody>
                {urun.urun_kalemleri.map((k) => {
                  const liste = eslesenler(k);
                  const kaynak = k.tedarikci_fiyat_id ? fiyatListesi.find((f) => f.id === k.tedarikci_fiyat_id) : null;
                  return (
                    <Fragment key={k.id}>
                      <tr className="border-t border-cizgi">
                        <td className="py-1.5 pr-2">
                          <div className="flex items-center gap-2">
                            <input
                              aria-label="Kalem adı"
                              value={k.ad}
                              onChange={(e) => onKalem(k.id, { ad: e.target.value })}
                              className="girdi py-1.5"
                            />
                            {k.zorunlu && <span className="rozet bg-slate-100 text-slate-600">zorunlu</span>}
                          </div>
                          {kaynak && (
                            <div className={`mt-0.5 pl-1 text-xs ${eskiMi(kaynak.fiyat_tarihi) ? "text-orange-600" : "text-slate-500"}`}>
                              {kaynak.tedarikci_adi} · {tarihYaz(kaynak.fiyat_tarihi)}
                              {eskiMi(kaynak.fiyat_tarihi) && ` (${gunFarki(kaynak.fiyat_tarihi)} gün önce)`}
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 pr-2">
                          <select
                            aria-label="Birim"
                            value={k.birim}
                            onChange={(e) => onKalem(k.id, { birim: e.target.value })}
                            className="girdi py-1.5"
                          >
                            {Array.from(new Set([...BIRIMLER, k.birim])).map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1.5 pr-2">
                          <SayiGirdisi deger={k.kullanim} onDeger={(n) => onKalem(k.id, { kullanim: n })} className="girdi-sayi py-1.5" ariaLabel="Kullanım" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <div className="flex gap-1">
                            <div className="min-w-0 flex-1">
                              <SayiGirdisi
                                deger={k.birim_fiyat}
                                onDeger={(n) => onKalem(k.id, { birim_fiyat: n, tedarikci_fiyat_id: null })}
                                className="girdi-sayi py-1.5"
                                ariaLabel="Birim fiyat"
                              />
                            </div>
                            <select
                              aria-label="Para birimi"
                              title="Para birimi"
                              value={k.para_birimi}
                              onChange={(e) =>
                                onKalem(k.id, { para_birimi: e.target.value as UrunKalemi["para_birimi"], tedarikci_fiyat_id: null })
                              }
                              className="girdi w-14 shrink-0 px-1.5 py-1.5"
                            >
                              {PARA_BIRIMLERI.map((p) => (
                                <option key={p.kod} value={p.kod}>
                                  {p.sembol}
                                </option>
                              ))}
                            </select>
                          </div>
                          {liste.length > 0 && (
                            <button
                              type="button"
                              className="mt-0.5 text-xs text-brand hover:underline"
                              onClick={() => {
                                setAcikListe(acikListe === k.id ? null : k.id);
                                setListeArama("");
                              }}
                            >
                              Fiyat listesi ({liste.length})
                            </button>
                          )}
                        </td>
                        <td className="rakam py-1.5 text-right">
                          {k.kullanim == null || k.birim_fiyat == null ? (
                            <span className="text-amber-600">eksik</span>
                          ) : kalemGirdisi(k, kurlar).kur == null ? (
                            <span className="text-amber-600">kur yok</span>
                          ) : (
                            paraYaz(kalemTutari(kalemGirdisi(k, kurlar)))
                          )}
                        </td>
                        <td className="py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => onKalemSil(k)}
                            className="px-1 text-slate-400 hover:text-red-600"
                            aria-label={`${k.ad} kalemini sil`}
                            title="Kalemi sil"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                      {acikListe === k.id && (
                        <tr>
                          <td colSpan={6} className="pb-3">
                            <div className="rounded-lg border border-cizgi bg-zemin/60 p-2">
                              <div className="mb-1 px-2 text-xs text-slate-500">
                                {k.ad} için tedarikçi fiyatları (KDV hariç). Seçtiğiniz fiyat kaleme yazılır.
                              </div>
                              {liste.length > 8 && (
                                <input
                                  aria-label="Fiyat listesinde ara"
                                  value={listeArama}
                                  onChange={(e) => setListeArama(e.target.value)}
                                  placeholder="Ara: tedarikçi, ölçü, renk… (ör. 75 cm separe)"
                                  className="girdi mb-1 py-1.5"
                                  autoFocus
                                />
                              )}
                              {listedeAra(liste, listeArama, k.ad).slice(0, LISTE_SINIRI).map((f) => (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => {
                                    fiyatSec(k, f);
                                    setAcikListe(null);
                                  }}
                                  className={`flex w-full items-center gap-3 rounded px-2 py-1.5 text-left text-sm hover:bg-white ${
                                    f.id === k.tedarikci_fiyat_id ? "bg-white ring-1 ring-brand/40" : ""
                                  }`}
                                >
                                  <span className="flex-1">
                                    {f.tedarikci_adi}
                                    {kalemAnahtari(f.kalem_adi) !== kalemAnahtari(k.ad) && (
                                      <span className="text-slate-500"> · {f.kalem_adi}</span>
                                    )}
                                    {f.aciklama && <span className="text-slate-500"> · {f.aciklama}</span>}
                                  </span>
                                  <span className="rakam">
                                    {fiyatYaz(f.fiyat, f.para_birimi)} <span className="text-slate-400">/ {f.birim}</span>
                                  </span>
                                  {f.birim !== k.birim && <span className="rozet bg-amber-50 text-amber-800">birim farklı</span>}
                                  <span className={`rakam w-28 text-right text-xs ${eskiMi(f.fiyat_tarihi) ? "text-orange-600" : "text-slate-500"}`}>
                                    {tarihYaz(f.fiyat_tarihi)}
                                    {eskiMi(f.fiyat_tarihi) && " · eski"}
                                  </span>
                                </button>
                              ))}
                              {listedeAra(liste, listeArama, k.ad).length > LISTE_SINIRI && (
                                <div className="px-2 pt-1 text-xs text-slate-500">
                                  {listedeAra(liste, listeArama, k.ad).length - LISTE_SINIRI} fiyat daha var; aramayı daraltın.
                                </div>
                              )}
                              {listedeAra(liste, listeArama, k.ad).length === 0 && (
                                <div className="px-2 py-1 text-sm text-slate-500">Aramaya uyan fiyat yok.</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {urun.urun_kalemleri.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-500">
                      Bu ürün grubu için kütüphanede zorunlu kalem yok. Aşağıdan kalem ekleyin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <KalemEkle urun={urun} sablonlar={sablonlar} onEkle={onKalemEkle} />
            {otomatikler.length > 0 && (
              <button type="button" className="btn-ikincil btn-kucuk mt-4 py-1.5" onClick={bosFiyatlariDoldur}>
                Boş fiyatları listeden doldur ({otomatikler.length})
              </button>
            )}
          </div>
          {sonuc.eksikKalemSayisi > 0 && (
            <p className="mt-3 text-xs text-amber-700">
              {sonuc.eksikKalemSayisi} kalemde kullanım veya birim fiyat eksik; bu kalemler hesaba katılmadı.
            </p>
          )}
          {sonuc.kurEksikKalemSayisi > 0 && (
            <p className="mt-1 text-xs text-amber-700">
              {sonuc.kurEksikKalemSayisi} kalem dövizli ama kuru girilmedi; sayfanın üstündeki döviz kurlarını girin.
            </p>
          )}
          <div className="mt-5 border-t border-cizgi pt-4">
            <div className="mb-2 text-xs font-medium text-slate-500">Bu ürünün teknik şartnamesi</div>
            <SartnameDosyalari ihaleId={urun.ihale_id} urunId={urun.id} ilkDosyalar={dosyalar} kompakt />
          </div>
        </div>

        <div className="space-y-3 bg-zemin/50 p-6 text-sm">
          <div className="flex items-baseline justify-between text-xs text-slate-500">
            <span>Birim (1 adet)</span>
            <span>Toplam ({adetYaz(urun.adet)} adet)</span>
          </div>
          <Satir ad="Ham maliyet" birim={b.ham} toplam={t.ham} />
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">Fire</span>
            <div className="w-24">
              <SayiGirdisi deger={urun.fire_orani} onDeger={(n) => onUrun({ fire_orani: n })} sonEk="%" className="girdi-sayi py-1" ariaLabel="Fire oranı" placeholder="gir" />
            </div>
          </div>
          <Satir ad="Fire dahil maliyet" birim={b.fireDahil} toplam={t.fireDahil} />
          <div className="border-t border-cizgi pt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-brand-dark">Kâr marjı</span>
              <div className="w-24">
                <SayiGirdisi deger={urun.kar_marji} onDeger={(n) => onUrun({ kar_marji: n })} sonEk="%" className="girdi-sayi py-1" ariaLabel="Kâr marjı" placeholder="gir" />
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              aria-label="Kâr marjı kaydırıcı"
              value={urun.kar_marji ?? 0}
              onChange={(e) => onUrun({ kar_marji: Number(e.target.value) })}
              className={`mt-2 w-full accent-brand ${urun.kar_marji == null ? "opacity-40" : ""}`}
            />
            {urun.kar_marji == null && (
              <p className="text-xs text-amber-700">
                Kâr marjını girin.{urun.urun_grubu === HAZIR_URUN && " Hazır üründe genelde %15–30 arası."}
              </p>
            )}
            <MarjOnerisiKutusu
              urunId={urun.id}
              hamMaliyet={b.ham}
              fireOrani={urun.fire_orani}
              fireDahil={b.fireDahil}
              kalemler={urun.urun_kalemleri.map((k) => ({
                ad: k.ad,
                tutar: kalemTutari(kalemGirdisi(k, kurlar)),
                paraBirimi: k.para_birimi,
              }))}
              onUygula={(n) => onUrun({ kar_marji: n })}
            />
          </div>
          <Satir ad="Kâr" birim={b.karTutari} toplam={t.karTutari} />
          <div className="rounded-lg bg-white p-3 ring-1 ring-cizgi">
            <div className="text-xs text-slate-500">Teklif birim fiyatı (KDV hariç)</div>
            <div className="rakam text-2xl font-semibold text-brand">{paraYaz(b.teklif)}</div>
            <div className="rakam text-xs text-slate-500">Toplam {paraYaz(t.teklif)}</div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">KDV</span>
            <div className="w-24">
              <SayiGirdisi deger={urun.kdv_orani} bosOlamaz onDeger={(n) => n != null && onUrun({ kdv_orani: n })} sonEk="%" className="girdi-sayi py-1" ariaLabel="KDV oranı" />
            </div>
          </div>
          <Satir ad="KDV tutarı" birim={b.kdvTutari} toplam={t.kdvTutari} />
          <Satir ad="KDV dahil fiyat" birim={b.kdvDahil} toplam={t.kdvDahil} />
          <div className="border-t border-cizgi pt-3">
            <Satir ad="Net kâr" birim={b.karTutari} toplam={t.karTutari} kalin />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Yapay zekâdan kâr marjı önerisi; kullanıcı "Uygula" demeden marj değişmez. */
function MarjOnerisiKutusu({
  urunId,
  hamMaliyet,
  fireOrani,
  fireDahil,
  kalemler,
  onUygula,
}: {
  urunId: string;
  hamMaliyet: number;
  fireOrani: number | null;
  fireDahil: number | null;
  kalemler: { ad: string; tutar: number; paraBirimi: string }[];
  onUygula: (n: number) => void;
}) {
  const [durum, setDurum] = useState<"kapali" | "bekliyor" | "acik">("kapali");
  const [oneri, setOneri] = useState<MarjOnerisi | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  async function iste() {
    setHata(null);
    setDurum("bekliyor");
    try {
      const s = await marjTavsiyesiAl(urunId, { hamMaliyet, fireOrani, fireDahilMaliyet: fireDahil, kalemler });
      if (s.hata !== undefined) {
        setHata(s.hata);
        setDurum("kapali");
        return;
      }
      setOneri(s.veri);
      setDurum("acik");
    } catch {
      setHata("Bağlantı hatası. Tekrar deneyin.");
      setDurum("kapali");
    }
  }

  const yuzde = (n: number) => `%${n.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;

  if (durum !== "acik" || !oneri) {
    return (
      <div className="mt-2">
        <button type="button" className="text-xs text-brand hover:underline disabled:text-slate-400" disabled={durum === "bekliyor"} onClick={iste}>
          {durum === "bekliyor" ? "Yapay zekâ düşünüyor…" : "Yapay zekâdan marj önerisi al"}
        </button>
        {hata && <p className="mt-1 text-xs text-red-600">{hata}</p>}
      </div>
    );
  }
  return (
    <div className="mt-3 rounded-lg border border-brand/30 bg-white p-3 text-xs">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-medium text-brand-dark">
          Öneri: <span className="rakam text-sm">{yuzde(oneri.onerilen)}</span>
        </span>
        <span className="rakam text-slate-500">
          aralık {yuzde(oneri.alt)} – {yuzde(oneri.ust)}
        </span>
      </div>
      <ul className="mb-2 list-disc space-y-0.5 pl-4 text-slate-600">
        {oneri.gerekceler.map((g, i) => (
          <li key={i}>{g}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-birincil btn-kucuk"
          onClick={() => {
            onUygula(oneri.onerilen);
            setDurum("kapali");
          }}
        >
          {yuzde(oneri.onerilen)} uygula
        </button>
        <button type="button" className="btn-ikincil btn-kucuk" onClick={() => setDurum("kapali")}>
          Kapat
        </button>
      </div>
    </div>
  );
}

function Satir({ ad, birim, toplam, kalin }: { ad: string; birim: number | null; toplam: number | null; kalin?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-2 ${kalin ? "font-semibold text-brand-dark" : ""}`}>
      <span className={kalin ? "" : "text-slate-600"}>{ad}</span>
      <span className="rakam text-right">
        {paraYaz(birim)}
        <span className="ml-2 text-xs font-normal text-slate-400">{paraYaz(toplam)}</span>
      </span>
    </div>
  );
}

function KalemEkle({
  urun,
  sablonlar,
  onEkle,
}: {
  urun: UrunKalemli;
  sablonlar: KalemSablonu[];
  onEkle: (g: { sablonId: string } | { ad: string; birim: string }) => Promise<void>;
}) {
  const [secim, setSecim] = useState("");
  const [serbestAd, setSerbestAd] = useState("");
  const [ekleniyor, setEkleniyor] = useState(false);

  const kullanilan = new Set(urun.urun_kalemleri.map((k) => k.sablon_id));
  const secenekler = sablonlar.filter((s) => !kullanilan.has(s.id));

  async function ekle() {
    if (!secim) return;
    setEkleniyor(true);
    try {
      if (secim === "__serbest") {
        if (!serbestAd.trim()) return;
        await onEkle({ ad: serbestAd, birim: "adet" });
        setSerbestAd("");
      } else {
        await onEkle({ sablonId: secim });
      }
      setSecim("");
    } finally {
      setEkleniyor(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <select aria-label="Eklenecek kalem" value={secim} onChange={(e) => setSecim(e.target.value)} className="girdi w-64 py-1.5">
        <option value="">Kalem seçin…</option>
        {secenekler.length > 0 && (
          <optgroup label="Kütüphaneden">
            {secenekler.map((s) => (
              <option key={s.id} value={s.id}>
                {s.ad}
                {s.zorunlu ? " (zorunlu)" : ""}
              </option>
            ))}
          </optgroup>
        )}
        <option value="__serbest">Listede olmayan kalem…</option>
      </select>
      {secim === "__serbest" && (
        <input
          aria-label="Yeni kalem adı"
          value={serbestAd}
          onChange={(e) => setSerbestAd(e.target.value)}
          placeholder="Kalem adı"
          className="girdi w-56 py-1.5"
        />
      )}
      <button
        type="button"
        className="btn-ikincil btn-kucuk py-1.5"
        disabled={!secim || ekleniyor || (secim === "__serbest" && !serbestAd.trim())}
        onClick={ekle}
      >
        + Kalem ekle
      </button>
    </div>
  );
}

function UrunEkleFormu({
  onEkle,
}: {
  onEkle: (g: { urun_grubu: string; ad: string; adet: number; aciklama: string }) => Promise<boolean>;
}) {
  const [grup, setGrup] = useState("");
  const [ad, setAd] = useState("");
  const [adet, setAdet] = useState<number | null>(null);
  const [ekleniyor, setEkleniyor] = useState(false);

  async function ekle(e: React.FormEvent) {
    e.preventDefault();
    if (!grup || !ad.trim() || !adet) return;
    setEkleniyor(true);
    try {
      if (await onEkle({ urun_grubu: grup, ad, adet, aciklama: "" })) {
        setGrup("");
        setAd("");
        setAdet(null);
      }
    } finally {
      setEkleniyor(false);
    }
  }

  return (
    <form onSubmit={ekle} className="kart flex flex-wrap items-end gap-3 border-dashed p-5">
      <div className="w-56">
        <label className="etiket" htmlFor="yeni-grup">Ürün grubu</label>
        <select id="yeni-grup" value={grup} onChange={(e) => setGrup(e.target.value)} className="girdi">
          <option value="">Seçin…</option>
          {URUN_GRUPLARI.map((g) => (
            <option key={g.kod} value={g.kod}>
              {g.ad}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-48 flex-1">
        <label className="etiket" htmlFor="yeni-ad">Ürün adı</label>
        <input id="yeni-ad" value={ad} onChange={(e) => setAd(e.target.value)} className="girdi" placeholder={grup === HAZIR_URUN ? "Örn. Deri kemer, siyah" : "Örn. Kışlık mont, lacivert"} />
      </div>
      <div className="w-32">
        <label className="etiket">Adet</label>
        <SayiGirdisi deger={adet} tamSayi onDeger={setAdet} ariaLabel="Yeni ürün adedi" />
      </div>
      <button type="submit" className="btn-birincil" disabled={!grup || !ad.trim() || !adet || ekleniyor}>
        {ekleniyor ? "Ekleniyor…" : "+ Ürün ekle"}
      </button>
    </form>
  );
}

const LISTE_SINIRI = 40;

/** Maliyet tablosundaki fiyat listesi: aramaya göre süzülür; adı birebir aynı olanlar önce, sonra en yeni tarihli */
function listedeAra(liste: TedarikciFiyatiAdli[], arama: string, kalemAdi: string) {
  const kelimeler = arama.split(/\s+/).map(kalemAnahtari).filter(Boolean);
  const anahtar = kalemAnahtari(kalemAdi);
  return liste
    .filter((f) => {
      const metin = kalemAnahtari(`${f.tedarikci_adi} ${f.kalem_adi} ${f.aciklama}`);
      return kelimeler.every((k) => metin.includes(k));
    })
    .sort(
      (a, b) =>
        Number(kalemAnahtari(b.kalem_adi) === anahtar) - Number(kalemAnahtari(a.kalem_adi) === anahtar) ||
        b.fiyat_tarihi.localeCompare(a.fiyat_tarihi),
    );
}
