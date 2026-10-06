// Kâr marjı tavsiyesi: yapay zekâ bir öneri ve gerekçesini verir; marjı her zaman kullanıcı belirler.

import { z } from "zod";
import { asamaAdi, urunGrubuAdi } from "./sabitler";

export const MarjSemasi = z.object({
  /** Yüzde olarak önerilen marj (ör. 15) */
  onerilen: z.number(),
  alt: z.number(),
  ust: z.number(),
  /** 2-4 kısa Türkçe gerekçe */
  gerekceler: z.array(z.string()),
});

export type MarjOnerisi = z.infer<typeof MarjSemasi>;

export const MARJ_SISTEM_ISTEMI = `Türkiye'de iş kıyafeti üreten bir tekstil firmasının ihale ekibine kâr marjı konusunda danışmanlık yapıyorsun. Firma kamu ve özel ihalelere teklif veriyor; marj fire dahil maliyetin üzerine yüzde olarak eklenir, KDV ayrıca eklenir.

Verilen ürün, maliyet ve firmanın geçmiş marjlarına bakarak bir kâr marjı öner:
- onerilen: tek bir yüzde (ondalık olabilir, ör. 12.5), alt ve ust: makul aralık.
- gerekceler: 2-4 kısa, somut Türkçe madde. Verilen rakamlara dayan (adet büyüklüğü, maliyetteki en büyük kalemler, dövizli kalem riski, termin süresi, teslim yeri, geçmiş marjlar). Genel laf yazma.
- Geçmiş veri yoksa bunu bir gerekçede açıkça söyle; uydurma piyasa verisi verme.
- Büyük adetli kamu ihalelerinde rekabet yüksektir, marj genelde düşüktür; küçük adetli, özel üretim veya kısa terminli işlerde daha yüksek olabilir.
- Kararı kullanıcı verir; sen sadece öneri sunarsın.`;

export type MarjGirdisi = {
  urun: { ad: string; urun_grubu: string; aciklama: string; adet: number };
  ihale: { musteri: string; teslim_yeri: string; termin: string; kaynak: string; segment: string | null };
  /** Birim (1 adet) TL */
  hamMaliyet: number;
  fireOrani: number | null;
  fireDahilMaliyet: number | null;
  /** En büyük kalemler: ad, birim tutar TL, para birimi */
  kalemler: { ad: string; tutar: number; paraBirimi: string }[];
  /** Firmanın aynı ürün grubunda daha önce kullandığı marjlar */
  gecmis: { ad: string; adet: number; marj: number; asama: string; tarih: string }[];
};

const tl = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

export function marjIstemi(g: MarjGirdisi): string {
  const kalemler = [...g.kalemler]
    .sort((a, b) => b.tutar - a.tutar)
    .slice(0, 10)
    .map((k) => `- ${k.ad}: ${tl(k.tutar)}${k.paraBirimi !== "TRY" ? ` (${k.paraBirimi} ile alınıyor)` : ""}`)
    .join("\n");
  const gecmis = g.gecmis.length
    ? g.gecmis
        .map((x) => `- ${x.tarih} · ${x.ad} · ${x.adet.toLocaleString("tr-TR")} adet · marj %${x.marj} · aşama: ${asamaAdi(x.asama)}`)
        .join("\n")
    : "(bu ürün grubunda geçmiş marj kaydı yok)";
  return `Ürün: ${g.urun.ad} (${urunGrubuAdi(g.urun.urun_grubu)})
Teknik özet: ${g.urun.aciklama || "-"}
Adet: ${g.urun.adet.toLocaleString("tr-TR")}
Müşteri: ${g.ihale.musteri || "-"} · Teslim yeri: ${g.ihale.teslim_yeri || "-"} · Termin: ${g.ihale.termin || "-"}
Kaynak: ${g.ihale.kaynak === "sartname" ? "teknik şartname" : `brief, ${g.ihale.segment ?? "-"} segment`}

Birim ham maliyet: ${tl(g.hamMaliyet)}
Fire: ${g.fireOrani != null ? `%${g.fireOrani}` : "girilmedi"} · Fire dahil birim maliyet: ${g.fireDahilMaliyet != null ? tl(g.fireDahilMaliyet) : "-"}
En büyük kalemler (birim):
${kalemler || "-"}

Firmanın aynı ürün grubundaki geçmiş marjları ("Sipariş" ve sonrası aşamadaki ihaleler siparişe dönmüştür):
${gecmis}`;
}

/** Modelin verdiği sayıları makul sınırlara çeker ve sıralar */
export function oneriyiDuzelt(o: MarjOnerisi): MarjOnerisi {
  const sinirla = (n: number) => Math.min(100, Math.max(0, Math.round(n * 10) / 10));
  const onerilen = sinirla(o.onerilen);
  const alt = Math.min(sinirla(o.alt), onerilen);
  const ust = Math.max(sinirla(o.ust), onerilen);
  return { onerilen, alt, ust, gerekceler: o.gerekceler.map((g) => g.trim()).filter(Boolean).slice(0, 4) };
}
