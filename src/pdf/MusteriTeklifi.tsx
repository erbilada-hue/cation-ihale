import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { adetYaz, tarihYaz, tutarYaz, yuzdeYaz } from "@/lib/format";
import type { FirmaAyarlari, Ihale, Teklif } from "@/lib/tipler";
import { RENK, ortakStil as o } from "./ortak";

// Firma bilgileri 9 punto; bir satır yaklaşık 11,5 pt yer kaplar
const SATIR_YUKSEKLIGI = 11.5;
/** 260 pt genişlikte 9 puntoda bir satıra sığan yaklaşık karakter sayısı */
const SATIR_KARAKTERI = 52;

/** Sağdaki firma bilgileri bloğunun yaklaşık yüksekliği; logo bu yüksekliğe büyütülür */
function firmaBlokYuksekligi(firma: FirmaAyarlari | null): number {
  const metinler = [firma?.firma_adi, firma?.adres, firma?.telefon && "Tel: " + firma.telefon, firma?.eposta, firma?.web];
  const satir = metinler.reduce((t, m) => t + (m ? Math.ceil(m.length / SATIR_KARAKTERI) : 0), 0);
  return Math.max(48, satir * SATIR_YUKSEKLIGI);
}

const s = StyleSheet.create({
  ust: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  logo: { objectFit: "contain", objectPositionX: 0 },
  firmaAdi: { fontSize: 14, fontWeight: 700, color: RENK.lacivert },
  firma: { alignItems: "flex-end", maxWidth: 260 },
  baslik: { fontSize: 18, fontWeight: 700, color: RENK.lacivert, marginBottom: 12 },
  bilgiSatiri: { flexDirection: "row", gap: 24, marginBottom: 18 },
  bilgiKutusu: { flex: 1, backgroundColor: RENK.zemin, borderRadius: 6, padding: 10 },
  etiket: { fontSize: 7.5, color: RENK.gri, marginBottom: 2 },
  tabloBaslik: {
    flexDirection: "row",
    backgroundColor: RENK.lacivert,
    color: "white",
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontWeight: 600,
    fontSize: 8,
  },
  satir: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: RENK.cizgi },
  sira: { width: 24 },
  urun: { flex: 1, paddingRight: 8 },
  adet: { width: 60, textAlign: "right" },
  fiyat: { width: 90, textAlign: "right" },
  toplam: { width: 100, textAlign: "right" },
  toplamlar: { alignSelf: "flex-end", width: 260, marginTop: 12 },
  toplamSatiri: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  genelToplam: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginTop: 4,
    backgroundColor: RENK.mavi,
    color: "white",
    fontWeight: 700,
    borderRadius: 4,
  },
  kosullar: { marginTop: 24, gap: 4 },
  banka: { marginTop: 18, padding: 10, borderWidth: 1, borderColor: RENK.cizgi, borderRadius: 6 },
});

const METIN = {
  tr: {
    baslik: "FİYAT TEKLİFİ",
    sayin: "Sayın",
    konu: "Konu",
    teklifNo: "Teklif no",
    teklifTarihi: "Teklif tarihi",
    gecerlilik: "Geçerlilik tarihi",
    urun: "Ürün",
    adet: "Adet",
    birimFiyat: "Birim fiyat",
    toplam: "Toplam",
    araToplam: "Ara toplam (KDV hariç)",
    araToplamIhracat: "Toplam",
    kdv: "KDV",
    matrah: "matrah",
    genelToplam: "Genel toplam (KDV dahil)",
    genelToplamIhracat: "Genel toplam",
    kdvNotu: "Birim fiyatlara KDV dahil değildir; KDV ayrıca gösterilmiştir.",
    ihracatNotu: "İhracat teslimidir; fiyatlara KDV uygulanmaz.",
    termin: "Termin",
    teslimat: "Teslimat",
    teslimSekli: "Teslim şekli",
    gecerlilikNotu: (t: string) => `Bu teklif ${t} tarihine kadar geçerlidir.`,
    banka: "Banka bilgileri",
    hesapSahibi: "Hesap sahibi",
    vd: "V.D.",
    vno: "V.No",
  },
  en: {
    baslik: "PRICE QUOTATION",
    sayin: "To",
    konu: "Subject",
    teklifNo: "Quotation no",
    teklifTarihi: "Date",
    gecerlilik: "Valid until",
    urun: "Item",
    adet: "Qty",
    birimFiyat: "Unit price",
    toplam: "Amount",
    araToplam: "Subtotal (excl. VAT)",
    araToplamIhracat: "Total",
    kdv: "VAT",
    matrah: "base",
    genelToplam: "Grand total (incl. VAT)",
    genelToplamIhracat: "Grand total",
    kdvNotu: "Unit prices exclude VAT; VAT is shown separately.",
    ihracatNotu: "Export delivery; prices are exempt from VAT.",
    termin: "Delivery time",
    teslimat: "Delivery place",
    teslimSekli: "Delivery terms",
    gecerlilikNotu: (t: string) => `This quotation is valid until ${t}.`,
    banka: "Bank details",
    hesapSahibi: "Account holder",
    vd: "Tax office",
    vno: "Tax no",
  },
} as const;

export function MusteriTeklifiPdf({ teklif, ihale, firma }: { teklif: Teklif; ihale: Ihale; firma: FirmaAyarlari | null }) {
  const icerik = teklif.icerik;
  const tekKdv = icerik.kdvler.length === 1;
  // Eski tekliflerde bu bilgiler yoktur: TL, Türkçe, KDV'li
  const pb = icerik.paraBirimi ?? "TRY";
  const dil = icerik.dil ?? "tr";
  const ihracat = icerik.ihracat ?? false;
  const m = METIN[dil];
  const para = (n: number) => tutarYaz(n, pb, dil);
  const adetMetni = (n: number) => (dil === "en" ? n.toLocaleString("en-GB") : adetYaz(n));
  const tarih = (t: string) => (dil === "en" ? new Date(t + "T00:00:00").toLocaleDateString("en-GB") : tarihYaz(t));
  const iban = pb === "USD" ? firma?.iban_usd || "" : pb === "EUR" ? firma?.iban_eur || "" : firma?.iban || "";
  const teslimSekli = icerik.teslimSekli ? `${icerik.teslimSekli}${ihale.teslim_yeri ? " " + ihale.teslim_yeri : ""} (Incoterms 2020)` : null;

  return (
    <Document title={`${dil === "en" ? "Quotation" : "Teklif"} ${teklif.teklif_no}`} author={firma?.firma_adi || "CATION"}>
      <Page size="A4" style={o.sayfa}>
        <View style={s.ust}>
          <View>
            {firma?.logo_data_url ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={firma.logo_data_url} style={[s.logo, { height: firmaBlokYuksekligi(firma), maxWidth: 240 }]} />
            ) : (
              <Text style={s.firmaAdi}>{firma?.firma_adi || "CATION"}</Text>
            )}
          </View>
          <View style={s.firma}>
            {firma?.logo_data_url && firma.firma_adi ? <Text style={o.kalin}>{firma.firma_adi}</Text> : null}
            {firma?.adres ? <Text style={o.gri}>{firma.adres}</Text> : null}
            {firma?.telefon ? <Text style={o.gri}>Tel: {firma.telefon}</Text> : null}
            {firma?.eposta ? <Text style={o.gri}>{firma.eposta}</Text> : null}
            {firma?.web ? <Text style={o.gri}>{firma.web}</Text> : null}
          </View>
        </View>

        <Text style={s.baslik}>{m.baslik}</Text>

        <View style={s.bilgiSatiri}>
          <View style={s.bilgiKutusu}>
            <Text style={s.etiket}>{m.sayin}</Text>
            <Text style={o.kalin}>{ihale.musteri || "—"}</Text>
            {ihale.yetkili ? <Text>{ihale.yetkili}</Text> : null}
            <Text style={[o.gri, { marginTop: 4 }]}>{m.konu}: {ihale.ad}</Text>
          </View>
          <View style={[s.bilgiKutusu, { flexGrow: 0, flexShrink: 0, flexBasis: 170 }]}>
            <Text style={s.etiket}>{m.teklifNo}</Text>
            <Text style={[o.rakam, { marginBottom: 4 }]}>{teklif.teklif_no}</Text>
            <Text style={s.etiket}>{m.teklifTarihi}</Text>
            <Text style={[o.rakam, { marginBottom: 4 }]}>{tarih(teklif.teklif_tarihi)}</Text>
            <Text style={s.etiket}>{m.gecerlilik}</Text>
            <Text style={o.rakam}>{tarih(teklif.gecerlilik_tarihi)}</Text>
          </View>
        </View>

        <View style={s.tabloBaslik}>
          <Text style={s.sira}>#</Text>
          <Text style={s.urun}>{m.urun}</Text>
          <Text style={s.adet}>{m.adet}</Text>
          <Text style={s.fiyat}>{m.birimFiyat}</Text>
          <Text style={s.toplam}>{m.toplam}</Text>
        </View>
        {icerik.satirlar.map((satir, i) => (
          <View key={i} style={s.satir} wrap={false}>
            <Text style={s.sira}>{i + 1}</Text>
            <View style={s.urun}>
              <Text style={o.kalin}>{satir.ad}</Text>
              {satir.aciklama ? <Text style={o.gri}>{satir.aciklama}</Text> : null}
              {!tekKdv && !ihracat ? <Text style={o.gri}>{m.kdv} {yuzdeYaz(satir.kdvOrani)}</Text> : null}
            </View>
            <Text style={[s.adet, o.rakam]}>{adetMetni(satir.adet)}</Text>
            <Text style={[s.fiyat, o.rakam]}>{para(satir.birimFiyat)}</Text>
            <Text style={[s.toplam, o.rakam]}>{para(satir.toplam)}</Text>
          </View>
        ))}

        <View style={s.toplamlar} wrap={false}>
          {!ihracat && (
            <View style={s.toplamSatiri}>
              <Text>{m.araToplam}</Text>
              <Text style={o.rakam}>{para(icerik.araToplam)}</Text>
            </View>
          )}
          {icerik.kdvler.map((k) => (
            <View key={k.oran} style={s.toplamSatiri}>
              <Text>
                {m.kdv} {yuzdeYaz(k.oran)}
                {!tekKdv ? ` (${m.matrah} ${para(k.matrah)})` : ""}
              </Text>
              <Text style={o.rakam}>{para(k.tutar)}</Text>
            </View>
          ))}
          <View style={s.genelToplam}>
            <Text>{ihracat ? m.genelToplamIhracat : m.genelToplam}</Text>
            <Text style={o.rakam}>{para(icerik.genelToplam)}</Text>
          </View>
        </View>

        <View style={s.kosullar} wrap={false}>
          <Text>• {ihracat ? m.ihracatNotu : m.kdvNotu}</Text>
          {teslimSekli ? <Text>• {m.teslimSekli}: {teslimSekli}</Text> : null}
          {ihale.termin ? <Text>• {m.termin}: {ihale.termin}</Text> : null}
          {!teslimSekli && ihale.teslim_yeri ? <Text>• {m.teslimat}: {ihale.teslim_yeri}</Text> : null}
          <Text>• {m.gecerlilikNotu(tarih(teklif.gecerlilik_tarihi))}</Text>
        </View>

        {firma && iban ? (
          <View style={s.banka} wrap={false}>
            <Text style={s.etiket}>{m.banka}</Text>
            {firma.banka_adi ? <Text>{firma.banka_adi}</Text> : null}
            {firma.firma_adi ? <Text>{m.hesapSahibi}: {firma.firma_adi}</Text> : null}
            <Text style={o.rakam}>
              IBAN ({pb}): {iban}
            </Text>
            {pb !== "TRY" && firma.swift ? <Text style={o.rakam}>SWIFT / BIC: {firma.swift}</Text> : null}
          </View>
        ) : null}

        <View style={o.altBilgi} fixed>
          <Text>
            {[firma?.firma_adi, firma?.vergi_dairesi && `${m.vd}: ${firma.vergi_dairesi}`, firma?.vergi_no && `${m.vno}: ${firma.vergi_no}`]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
