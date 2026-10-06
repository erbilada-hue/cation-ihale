import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { hesaplaUrun, kalemTutari } from "@/lib/maliyet";
import { ihaleKurlari, kalemGirdisi, maliyetGirdisi } from "@/lib/maliyetGirdisi";
import { adetYaz, fiyatYaz, paraYaz, sayiYaz, tarihYaz, yuzdeYaz } from "@/lib/format";
import { urunGrubuAdi } from "@/lib/sabitler";
import type { Ihale, SegmentSablonu, UrunKalemli } from "@/lib/tipler";
import { RENK, ortakStil as o } from "./ortak";

const s = StyleSheet.create({
  gizli: {
    alignSelf: "flex-start",
    color: RENK.kirmizi,
    borderWidth: 1.5,
    borderColor: RENK.kirmizi,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontWeight: 700,
    fontSize: 9,
    marginBottom: 10,
  },
  baslik: { fontSize: 16, fontWeight: 700, color: RENK.lacivert },
  alt: { color: RENK.gri, marginTop: 2, marginBottom: 14 },
  urun: { borderWidth: 1, borderColor: RENK.cizgi, borderRadius: 6, marginBottom: 14 },
  urunBaslik: { backgroundColor: RENK.zemin, padding: 8, flexDirection: "row", justifyContent: "space-between" },
  tabloBaslik: { flexDirection: "row", paddingHorizontal: 8, paddingVertical: 4, color: RENK.gri, fontSize: 7.5, borderBottomWidth: 1, borderBottomColor: RENK.cizgi },
  satir: { flexDirection: "row", paddingHorizontal: 8, paddingVertical: 3.5, borderBottomWidth: 1, borderBottomColor: RENK.cizgi },
  kalem: { flex: 1 },
  birim: { width: 44 },
  sayi: { width: 62, textAlign: "right" },
  para: { width: 78, textAlign: "right" },
  ozet: { flexDirection: "row", padding: 8, gap: 16 },
  ozetSutun: { flex: 1 },
  ozetSatir: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 },
  vurgu: { color: RENK.mavi, fontWeight: 700 },
  genel: { borderWidth: 1, borderColor: RENK.lacivert, borderRadius: 6, padding: 10, marginTop: 4 },
});

function OzetSatiri({ ad, birim, toplam, vurgu }: { ad: string; birim: number | null; toplam: number | null; vurgu?: boolean }) {
  return (
    <View style={s.ozetSatir}>
      <Text style={vurgu ? s.vurgu : undefined}>{ad}</Text>
      <Text style={[o.rakam, vurgu ? s.vurgu : {}]}>
        {paraYaz(birim)} <Text style={o.gri}>/ {paraYaz(toplam)}</Text>
      </Text>
    </View>
  );
}

export function IcMaliyetRaporuPdf({
  ihale,
  urunler,
  segment,
  tedarikciAdlari = {},
}: {
  ihale: Ihale;
  urunler: UrunKalemli[];
  segment: SegmentSablonu | undefined;
  /** Kalem fiyatı fiyat listesinden seçildiyse: tedarikçi fiyat id → tedarikçi adı */
  tedarikciAdlari?: Record<string, string>;
}) {
  const kurlar = ihaleKurlari(ihale);
  const hesaplar = urunler.map((u) => ({ u, h: hesaplaUrun(maliyetGirdisi(u, kurlar)) }));
  const dovizli = new Set(urunler.flatMap((u) => u.urun_kalemleri.map((k) => k.para_birimi)));
  const kurMetni = (["USD", "EUR"] as const)
    .filter((p) => dovizli.has(p))
    .map((p) => `1 ${p === "USD" ? "$" : "€"} = ${kurlar[p] == null ? "girilmedi" : paraYaz(kurlar[p])}`)
    .join(" · ");
  const toplam = hesaplar.reduce(
    (t, { h }) => ({
      ham: t.ham + h.toplam.ham,
      fire: t.fire + (h.toplam.fireTutari ?? 0),
      kar: t.kar + (h.toplam.karTutari ?? 0),
      teklif: t.teklif + (h.toplam.teklif ?? 0),
      kdvDahil: t.kdvDahil + (h.toplam.kdvDahil ?? 0),
    }),
    { ham: 0, fire: 0, kar: 0, teklif: 0, kdvDahil: 0 },
  );
  const eksik = hesaplar.some(({ h }) => h.birim.teklif == null);
  const kaynak =
    ihale.kaynak === "sartname" ? "Şartnameye göre" : `${segment?.ad ?? ""} segment şablonuna göre`;

  return (
    <Document title={`İç Maliyet Raporu - ${ihale.ad}`}>
      <Page size="A4" style={o.sayfa}>
        <Text style={s.gizli}>GİZLİ — SADECE İÇ KULLANIM</Text>
        <Text style={s.baslik}>İç Maliyet Raporu</Text>
        <Text style={s.alt}>
          {ihale.ad} · {ihale.musteri || "Müşteri girilmedi"} · {kaynak}
          {ihale.kaynak_dosya ? ` · ${ihale.kaynak_dosya}` : ""} · Rapor tarihi {tarihYaz(new Date())}
          {kurMetni ? ` · Kur: ${kurMetni}` : ""}
        </Text>

        {hesaplar.map(({ u, h }) => (
          <View key={u.id} style={s.urun} wrap={false}>
            <View style={s.urunBaslik}>
              <Text style={o.kalin}>
                {u.ad} <Text style={o.gri}>· {urunGrubuAdi(u.urun_grubu)}</Text>
              </Text>
              <Text style={o.rakam}>{adetYaz(u.adet)} adet</Text>
            </View>
            <View style={s.tabloBaslik}>
              <Text style={s.kalem}>Kalem</Text>
              <Text style={s.birim}>Birim</Text>
              <Text style={s.sayi}>Kullanım</Text>
              <Text style={s.para}>Birim fiyat</Text>
              <Text style={s.para}>1 adet (₺)</Text>
              <Text style={s.para}>Toplam (₺)</Text>
            </View>
            {u.urun_kalemleri.map((k) => {
              const girdi = kalemGirdisi(k, kurlar);
              const tutar = kalemTutari(girdi);
              const eksikKalem = k.kullanim == null || k.birim_fiyat == null || girdi.kur == null;
              return (
                <View key={k.id} style={s.satir}>
                  <Text style={s.kalem}>
                    {k.ad}
                    {eksikKalem ? <Text style={{ color: RENK.kirmizi }}> (eksik)</Text> : null}
                    {k.tedarikci_fiyat_id && tedarikciAdlari[k.tedarikci_fiyat_id] ? (
                      <Text style={o.gri}> · {tedarikciAdlari[k.tedarikci_fiyat_id]}</Text>
                    ) : null}
                  </Text>
                  <Text style={s.birim}>{k.birim}</Text>
                  <Text style={[s.sayi, o.rakam]}>{sayiYaz(k.kullanim) || "—"}</Text>
                  <Text style={[s.para, o.rakam]}>{fiyatYaz(k.birim_fiyat, k.para_birimi)}</Text>
                  <Text style={[s.para, o.rakam]}>{paraYaz(tutar)}</Text>
                  <Text style={[s.para, o.rakam]}>{paraYaz(tutar * u.adet)}</Text>
                </View>
              );
            })}
            <View style={s.ozet}>
              <View style={s.ozetSutun}>
                <Text style={[o.gri, { fontSize: 7.5, marginBottom: 2 }]}>1 adet / toplam</Text>
                <OzetSatiri ad="Ham maliyet" birim={h.birim.ham} toplam={h.toplam.ham} />
                <OzetSatiri ad={`Fire etkisi (${yuzdeYaz(u.fire_orani)})`} birim={h.birim.fireTutari} toplam={h.toplam.fireTutari} />
                <OzetSatiri ad="Fire dahil maliyet" birim={h.birim.fireDahil} toplam={h.toplam.fireDahil} />
              </View>
              <View style={s.ozetSutun}>
                <Text style={[o.gri, { fontSize: 7.5, marginBottom: 2 }]}> </Text>
                <OzetSatiri ad={`Kâr (${yuzdeYaz(u.kar_marji)})`} birim={h.birim.karTutari} toplam={h.toplam.karTutari} />
                <OzetSatiri ad="Teklif fiyatı (KDV hariç)" birim={h.birim.teklif} toplam={h.toplam.teklif} vurgu />
                <OzetSatiri ad={`KDV dahil (${yuzdeYaz(u.kdv_orani)})`} birim={h.birim.kdvDahil} toplam={h.toplam.kdvDahil} />
              </View>
            </View>
          </View>
        ))}

        <View style={s.genel} wrap={false}>
          <Text style={[o.kalin, { marginBottom: 4, color: RENK.lacivert }]}>İhale geneli</Text>
          {[
            ["Toplam ham maliyet", toplam.ham],
            ["Toplam fire etkisi", toplam.fire],
            ["Toplam teklif (KDV hariç)", eksik ? null : toplam.teklif],
            ["Toplam KDV dahil", eksik ? null : toplam.kdvDahil],
          ].map(([ad, deger]) => (
            <View key={ad as string} style={s.ozetSatir}>
              <Text>{ad}</Text>
              <Text style={o.rakam}>{paraYaz(deger as number | null)}</Text>
            </View>
          ))}
          <View style={[s.ozetSatir, { marginTop: 3 }]}>
            <Text style={s.vurgu}>Net kâr</Text>
            <Text style={[o.rakam, s.vurgu]}>{eksik ? "—" : paraYaz(toplam.kar)}</Text>
          </View>
          {eksik ? (
            <Text style={{ color: RENK.kirmizi, marginTop: 4 }}>
              Bazı ürünlerde fire oranı, kâr marjı veya döviz kuru girilmediği için teklif toplamları hesaplanmadı.
            </Text>
          ) : null}
        </View>

        <View style={o.altBilgi} fixed>
          <Text>Gizli — Sadece iç kullanım. Müşteriyle paylaşılmaz.</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
