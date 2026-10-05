import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { adetYaz, paraYaz, tarihYaz, yuzdeYaz } from "@/lib/format";
import type { FirmaAyarlari, Ihale, Teklif } from "@/lib/tipler";
import { RENK, ortakStil as o } from "./ortak";

const s = StyleSheet.create({
  ust: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  logo: { maxHeight: 48, maxWidth: 160, objectFit: "contain" },
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

export function MusteriTeklifiPdf({ teklif, ihale, firma }: { teklif: Teklif; ihale: Ihale; firma: FirmaAyarlari | null }) {
  const icerik = teklif.icerik;
  const tekKdv = icerik.kdvler.length === 1;

  return (
    <Document title={`Teklif ${teklif.teklif_no}`} author={firma?.firma_adi || "CATION"}>
      <Page size="A4" style={o.sayfa}>
        <View style={s.ust}>
          <View>
            {firma?.logo_data_url ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={firma.logo_data_url} style={s.logo} />
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

        <Text style={s.baslik}>FİYAT TEKLİFİ</Text>

        <View style={s.bilgiSatiri}>
          <View style={s.bilgiKutusu}>
            <Text style={s.etiket}>Sayın</Text>
            <Text style={o.kalin}>{ihale.musteri || "—"}</Text>
            {ihale.yetkili ? <Text>{ihale.yetkili}</Text> : null}
            <Text style={[o.gri, { marginTop: 4 }]}>Konu: {ihale.ad}</Text>
          </View>
          <View style={[s.bilgiKutusu, { flexGrow: 0, flexShrink: 0, flexBasis: 170 }]}>
            <Text style={s.etiket}>Teklif no</Text>
            <Text style={[o.rakam, { marginBottom: 4 }]}>{teklif.teklif_no}</Text>
            <Text style={s.etiket}>Teklif tarihi</Text>
            <Text style={[o.rakam, { marginBottom: 4 }]}>{tarihYaz(teklif.teklif_tarihi)}</Text>
            <Text style={s.etiket}>Geçerlilik tarihi</Text>
            <Text style={o.rakam}>{tarihYaz(teklif.gecerlilik_tarihi)}</Text>
          </View>
        </View>

        <View style={s.tabloBaslik}>
          <Text style={s.sira}>#</Text>
          <Text style={s.urun}>Ürün</Text>
          <Text style={s.adet}>Adet</Text>
          <Text style={s.fiyat}>Birim fiyat</Text>
          <Text style={s.toplam}>Toplam</Text>
        </View>
        {icerik.satirlar.map((satir, i) => (
          <View key={i} style={s.satir} wrap={false}>
            <Text style={s.sira}>{i + 1}</Text>
            <View style={s.urun}>
              <Text style={o.kalin}>{satir.ad}</Text>
              {satir.aciklama ? <Text style={o.gri}>{satir.aciklama}</Text> : null}
              {!tekKdv ? <Text style={o.gri}>KDV {yuzdeYaz(satir.kdvOrani)}</Text> : null}
            </View>
            <Text style={[s.adet, o.rakam]}>{adetYaz(satir.adet)}</Text>
            <Text style={[s.fiyat, o.rakam]}>{paraYaz(satir.birimFiyat)}</Text>
            <Text style={[s.toplam, o.rakam]}>{paraYaz(satir.toplam)}</Text>
          </View>
        ))}

        <View style={s.toplamlar} wrap={false}>
          <View style={s.toplamSatiri}>
            <Text>Ara toplam (KDV hariç)</Text>
            <Text style={o.rakam}>{paraYaz(icerik.araToplam)}</Text>
          </View>
          {icerik.kdvler.map((k) => (
            <View key={k.oran} style={s.toplamSatiri}>
              <Text>
                KDV {yuzdeYaz(k.oran)}
                {!tekKdv ? ` (matrah ${paraYaz(k.matrah)})` : ""}
              </Text>
              <Text style={o.rakam}>{paraYaz(k.tutar)}</Text>
            </View>
          ))}
          <View style={s.genelToplam}>
            <Text>Genel toplam (KDV dahil)</Text>
            <Text style={o.rakam}>{paraYaz(icerik.genelToplam)}</Text>
          </View>
        </View>

        <View style={s.kosullar} wrap={false}>
          <Text>• Birim fiyatlara KDV dahil değildir; KDV ayrıca gösterilmiştir.</Text>
          {ihale.termin ? <Text>• Termin: {ihale.termin}</Text> : null}
          {ihale.teslim_yeri ? <Text>• Teslimat: {ihale.teslim_yeri}</Text> : null}
          <Text>• Bu teklif {tarihYaz(teklif.gecerlilik_tarihi)} tarihine kadar geçerlidir.</Text>
        </View>

        {firma?.iban ? (
          <View style={s.banka} wrap={false}>
            <Text style={s.etiket}>Banka bilgileri</Text>
            {firma.banka_adi ? <Text>{firma.banka_adi}</Text> : null}
            {firma.firma_adi ? <Text>Hesap sahibi: {firma.firma_adi}</Text> : null}
            <Text style={o.rakam}>IBAN: {firma.iban}</Text>
          </View>
        ) : null}

        <View style={o.altBilgi} fixed>
          <Text>
            {[firma?.firma_adi, firma?.vergi_dairesi && `V.D.: ${firma.vergi_dairesi}`, firma?.vergi_no && `V.No: ${firma.vergi_no}`]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
