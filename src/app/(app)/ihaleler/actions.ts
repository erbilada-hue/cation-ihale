"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import {
  firmaAyarlariGetir,
  ihaleGetir,
  ihaleKurlari,
  kalemSablonlariniGetir,
  kalemiDuzelt,
  maliyetGirdisi,
  urunleriGetir,
  urunuDuzelt,
} from "@/lib/veri";
import { EksikBilgiHatasi, teklifOlustur } from "@/lib/maliyet";
import { PARA_BIRIMLERI, SEGMENTLER, URUN_GRUPLARI } from "@/lib/sabitler";
import type { IhaleDosyasi, KalemSablonu, UrunKalemi, UrunKalemli } from "@/lib/tipler";
import { SARTNAME_KLASORU } from "@/lib/dosya";
import { belgeyiHazirla } from "@/lib/belgeMetni";
import { yapilandirilmisOku } from "@/lib/ai";
import { ANALIZ_SISTEM_ISTEMI, AnalizSemasi, analiziEslestir, kutuphaneMetni, type AnalizSonucu } from "@/lib/sartnameAnalizi";
import type { BetaContentBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";

export type Sonuc<T = null> = { hata: string; veri?: undefined } | { hata?: undefined; veri: T };

// ---------------------------------------------------------------------------
// İhale
// ---------------------------------------------------------------------------

export type IhaleFormDurumu = { hata: string | null };

export async function ihaleKaydet(_onceki: IhaleFormDurumu, form: FormData): Promise<IhaleFormDurumu> {
  const id = String(form.get("id") ?? "") || null;
  const ad = String(form.get("ad") ?? "").trim();
  const kaynak = String(form.get("kaynak") ?? "");
  const segment = String(form.get("segment") ?? "");

  if (!ad) return { hata: "İhale adı zorunludur." };
  if (kaynak !== "sartname" && kaynak !== "segment") {
    return { hata: "Teknik şartname olup olmadığını seçin." };
  }
  if (kaynak === "segment" && !SEGMENTLER.includes(segment as (typeof SEGMENTLER)[number])) {
    return { hata: "Teknik şartname yoksa kalite segmentini seçmeniz zorunludur." };
  }

  const kayit = {
    ad,
    musteri: String(form.get("musteri") ?? "").trim(),
    yetkili: String(form.get("yetkili") ?? "").trim(),
    son_teklif_tarihi: String(form.get("son_teklif_tarihi") ?? "") || null,
    teslim_yeri: String(form.get("teslim_yeri") ?? "").trim(),
    termin: String(form.get("termin") ?? "").trim(),
    kaynak,
    kaynak_dosya: String(form.get("kaynak_dosya") ?? "").trim(),
    segment: kaynak === "segment" ? segment : null,
    notlar: String(form.get("notlar") ?? "").trim(),
  };

  const supabase = sunucuIstemcisi();
  let hedefId = id;
  if (id) {
    const { error } = await supabase.from("ihaleler").update(kayit).eq("id", id);
    if (error) return { hata: "İhale kaydedilemedi: " + error.message };
  } else {
    const { data, error } = await supabase.from("ihaleler").insert(kayit).select("id").single();
    if (error) return { hata: "İhale kaydedilemedi: " + error.message };
    hedefId = data.id;
  }

  revalidatePath("/ihaleler");
  redirect(`/ihaleler/${hedefId}`);
}

export async function ihaleSil(id: string): Promise<Sonuc> {
  const supabase = sunucuIstemcisi();
  // Şartname dosyaları da depodan silinir
  const { data: dosyalar } = await supabase.from("ihale_dosyalari").select("yol").eq("ihale_id", id);
  if (dosyalar && dosyalar.length > 0) {
    await supabase.storage.from(SARTNAME_KLASORU).remove(dosyalar.map((d) => d.yol as string));
  }
  const { error } = await supabase.from("ihaleler").delete().eq("id", id);
  if (error) return { hata: "İhale silinemedi: " + error.message };
  revalidatePath("/ihaleler");
  redirect("/ihaleler");
}

/** İhalede dolar / euro kuru. Boş bırakılabilir; dövizli kalem varsa teklif için gerekir. */
export async function ihaleKurGuncelle(
  ihaleId: string,
  degisiklik: { usd_kuru?: number | null; eur_kuru?: number | null },
): Promise<Sonuc> {
  const temiz: Record<string, number | null> = {};
  for (const alan of ["usd_kuru", "eur_kuru"] as const) {
    if (!(alan in degisiklik)) continue;
    const kur = degisiklik[alan] ?? null;
    if (kur != null && (!(kur > 0) || kur >= 1000)) {
      return { hata: "Kur 0 ile 1.000 arasında olmalı. Ondalık için virgül kullanın (örn. 41,25)." };
    }
    temiz[alan] = kur;
  }
  const supabase = sunucuIstemcisi();
  const { error } = await supabase.from("ihaleler").update(temiz).eq("id", ihaleId);
  if (error) return { hata: "Kur kaydedilemedi: " + error.message };
  return { veri: null };
}

// ---------------------------------------------------------------------------
// Ürünler
// ---------------------------------------------------------------------------

export async function urunEkle(
  ihaleId: string,
  girdi: { urun_grubu: string; ad: string; adet: number; aciklama: string },
): Promise<Sonuc<UrunKalemli>> {
  if (!URUN_GRUPLARI.some((g) => g.kod === girdi.urun_grubu)) return { hata: "Ürün grubunu seçin." };
  if (!girdi.ad.trim()) return { hata: "Ürün adını yazın." };
  if (!Number.isInteger(girdi.adet) || girdi.adet <= 0) return { hata: "Adet 0'dan büyük tam sayı olmalı." };

  const supabase = sunucuIstemcisi();
  const ihale = await ihaleGetir(supabase, ihaleId);
  if (!ihale) return { hata: "İhale bulunamadı." };

  // Fire: segment seçildiyse segment şablonundan gelir, şartnamede kullanıcı girer
  let fire: number | null = null;
  if (ihale.segment) {
    const { data } = await supabase
      .from("segment_sablonlari")
      .select("fire_orani")
      .eq("segment", ihale.segment)
      .single();
    fire = data ? Number(data.fire_orani) : null;
  }
  const firma = await firmaAyarlariGetir(supabase);

  const { count } = await supabase
    .from("ihale_urunleri")
    .select("id", { count: "exact", head: true })
    .eq("ihale_id", ihaleId);

  const { data: urun, error } = await supabase
    .from("ihale_urunleri")
    .insert({
      ihale_id: ihaleId,
      urun_grubu: girdi.urun_grubu,
      ad: girdi.ad.trim(),
      aciklama: girdi.aciklama.trim(),
      adet: girdi.adet,
      fire_orani: fire,
      kar_marji: null,
      kdv_orani: firma?.varsayilan_kdv_orani ?? 20,
      sira: count ?? 0,
    })
    .select("*")
    .single();
  if (error) return { hata: "Ürün eklenemedi: " + error.message };

  // Ürün grubunun zorunlu kalemleri otomatik açılır
  const { data: sablonlar } = await supabase
    .from("kalem_sablonlari")
    .select("*")
    .eq("urun_grubu", girdi.urun_grubu)
    .eq("zorunlu", true)
    .order("sira")
    .order("ad");

  let kalemler: UrunKalemi[] = [];
  if (sablonlar && sablonlar.length > 0) {
    const { data, error: kalemHatasi } = await supabase
      .from("urun_kalemleri")
      .insert(
        (sablonlar as KalemSablonu[]).map((s, i) => ({
          urun_id: urun.id,
          sablon_id: s.id,
          ad: s.ad,
          zorunlu: true,
          birim: s.birim,
          kullanim: s.varsayilan_kullanim,
          birim_fiyat: s.varsayilan_birim_fiyat,
          sira: i,
        })),
      )
      .select("*");
    if (kalemHatasi) return { hata: "Zorunlu kalemler eklenemedi: " + kalemHatasi.message };
    kalemler = data as UrunKalemi[];
  }

  if (ihale.asama === "ihale") {
    await supabase.from("ihaleler").update({ asama: "maliyet" }).eq("id", ihaleId);
  }

  revalidatePath(`/ihaleler/${ihaleId}`);
  return { veri: urunuDuzelt({ ...(urun as UrunKalemli), urun_kalemleri: kalemler }) };
}

const URUN_ALANLARI = ["ad", "aciklama", "adet", "fire_orani", "kar_marji", "kdv_orani"] as const;
type UrunAlani = (typeof URUN_ALANLARI)[number];

export async function urunGuncelle(
  urunId: string,
  degisiklik: Partial<Record<UrunAlani, string | number | null>>,
): Promise<Sonuc> {
  const temiz = Object.fromEntries(
    Object.entries(degisiklik).filter(([k]) => (URUN_ALANLARI as readonly string[]).includes(k)),
  );
  if ("adet" in temiz && (!Number.isInteger(temiz.adet) || Number(temiz.adet) <= 0)) {
    return { hata: "Adet 0'dan büyük tam sayı olmalı." };
  }
  for (const alan of ["fire_orani", "kdv_orani"] as const) {
    if (alan in temiz && temiz[alan] != null && Number(temiz[alan]) < 0) {
      return { hata: "Oran negatif olamaz." };
    }
  }
  if ("ad" in temiz && !String(temiz.ad ?? "").trim()) return { hata: "Ürün adı boş olamaz." };
  if ("kdv_orani" in temiz && temiz.kdv_orani == null) return { hata: "KDV oranı boş bırakılamaz." };

  const supabase = sunucuIstemcisi();
  const { error } = await supabase.from("ihale_urunleri").update(temiz).eq("id", urunId);
  if (error) return { hata: "Kaydedilemedi: " + error.message };
  return { veri: null };
}

export async function urunSil(urunId: string): Promise<Sonuc> {
  const supabase = sunucuIstemcisi();
  const { error } = await supabase.from("ihale_urunleri").delete().eq("id", urunId);
  if (error) return { hata: "Ürün silinemedi: " + error.message };
  return { veri: null };
}

// ---------------------------------------------------------------------------
// Kalemler
// ---------------------------------------------------------------------------

export async function kalemEkle(
  urunId: string,
  girdi: { sablonId: string } | { ad: string; birim: string },
): Promise<Sonuc<UrunKalemi>> {
  const supabase = sunucuIstemcisi();

  const { count } = await supabase
    .from("urun_kalemleri")
    .select("id", { count: "exact", head: true })
    .eq("urun_id", urunId);

  let kayit;
  if ("sablonId" in girdi) {
    const { data: s } = await supabase.from("kalem_sablonlari").select("*").eq("id", girdi.sablonId).single();
    if (!s) return { hata: "Kalem şablonu bulunamadı." };
    const sablon = s as KalemSablonu;
    kayit = {
      urun_id: urunId,
      sablon_id: sablon.id,
      ad: sablon.ad,
      zorunlu: sablon.zorunlu,
      birim: sablon.birim,
      kullanim: sablon.varsayilan_kullanim,
      birim_fiyat: sablon.varsayilan_birim_fiyat,
      sira: count ?? 0,
    };
  } else {
    if (!girdi.ad.trim()) return { hata: "Kalem adını yazın." };
    kayit = { urun_id: urunId, ad: girdi.ad.trim(), birim: girdi.birim || "adet", zorunlu: false, sira: count ?? 0 };
  }

  const { data, error } = await supabase.from("urun_kalemleri").insert(kayit).select("*").single();
  if (error) return { hata: "Kalem eklenemedi: " + error.message };
  return { veri: kalemiDuzelt(data as UrunKalemi) };
}

const KALEM_ALANLARI = ["ad", "birim", "kullanim", "birim_fiyat", "para_birimi", "tedarikci_fiyat_id"] as const;
type KalemAlani = (typeof KALEM_ALANLARI)[number];

export async function kalemGuncelle(
  kalemId: string,
  degisiklik: Partial<Record<KalemAlani, string | number | null>>,
): Promise<Sonuc> {
  const temiz = Object.fromEntries(
    Object.entries(degisiklik).filter(([k]) => (KALEM_ALANLARI as readonly string[]).includes(k)),
  );
  if ("ad" in temiz && !String(temiz.ad ?? "").trim()) return { hata: "Kalem adı boş olamaz." };
  if (
    "tedarikci_fiyat_id" in temiz &&
    temiz.tedarikci_fiyat_id != null &&
    !/^[0-9a-f-]{36}$/i.test(String(temiz.tedarikci_fiyat_id))
  ) {
    return { hata: "Tedarikçi fiyatı geçersiz." };
  }
  if ("para_birimi" in temiz && !PARA_BIRIMLERI.some((p) => p.kod === temiz.para_birimi)) {
    return { hata: "Para birimi TL, dolar veya euro olmalı." };
  }
  for (const alan of ["kullanim", "birim_fiyat"] as const) {
    if (alan in temiz && temiz[alan] != null && Number(temiz[alan]) < 0) {
      return { hata: "Kullanım ve birim fiyat negatif olamaz." };
    }
  }
  const supabase = sunucuIstemcisi();
  const { error } = await supabase.from("urun_kalemleri").update(temiz).eq("id", kalemId);
  if (error) return { hata: "Kaydedilemedi: " + error.message };
  return { veri: null };
}

export async function kalemSil(kalemId: string): Promise<Sonuc> {
  const supabase = sunucuIstemcisi();
  const { error } = await supabase.from("urun_kalemleri").delete().eq("id", kalemId);
  if (error) return { hata: "Kalem silinemedi: " + error.message };
  return { veri: null };
}

// ---------------------------------------------------------------------------
// Müşteri teklifi
// ---------------------------------------------------------------------------

export async function musteriTeklifiOlustur(ihaleId: string): Promise<Sonuc<{ teklifId: string }>> {
  const supabase = sunucuIstemcisi();
  const ihale = await ihaleGetir(supabase, ihaleId);
  if (!ihale) return { hata: "İhale bulunamadı." };

  const urunler = await urunleriGetir(supabase, ihaleId);
  let ozet;
  try {
    ozet = teklifOlustur(
      urunler.map((u) => ({ ...maliyetGirdisi(u, ihaleKurlari(ihale)), ad: u.ad, aciklama: u.aciklama })),
    );
  } catch (e) {
    if (e instanceof EksikBilgiHatasi) return { hata: e.message };
    throw e;
  }

  const firma = await firmaAyarlariGetir(supabase);
  const gun = firma?.teklif_gecerlilik_gun ?? 15;
  const bugun = new Date();
  const gecerlilik = new Date(bugun);
  gecerlilik.setDate(gecerlilik.getDate() + gun);

  const { data, error } = await supabase
    .from("teklifler")
    .insert({
      ihale_id: ihaleId,
      teklif_tarihi: tarihMetni(bugun),
      gecerlilik_tarihi: tarihMetni(gecerlilik),
      icerik: ozet,
    })
    .select("id")
    .single();
  if (error) return { hata: "Teklif oluşturulamadı: " + error.message };

  if (ihale.asama === "ihale" || ihale.asama === "maliyet") {
    await supabase.from("ihaleler").update({ asama: "teklif" }).eq("id", ihaleId);
  }

  revalidatePath(`/ihaleler/${ihaleId}`);
  revalidatePath("/ihaleler");
  return { veri: { teklifId: data.id } };
}

// ---------------------------------------------------------------------------
// Şartname dosyaları (dosyanın kendisini tarayıcı doğrudan depoya yükler)
// ---------------------------------------------------------------------------

export async function dosyaKaydet(girdi: {
  ihaleId: string;
  urunId: string | null;
  dosyaAdi: string;
  yol: string;
  boyut: number;
  tur: string;
}): Promise<Sonuc<IhaleDosyasi>> {
  if (!girdi.yol.startsWith(`${girdi.ihaleId}/`)) return { hata: "Dosya yolu geçersiz." };
  const supabase = sunucuIstemcisi();
  const { data, error } = await supabase
    .from("ihale_dosyalari")
    .insert({
      ihale_id: girdi.ihaleId,
      urun_id: girdi.urunId,
      dosya_adi: girdi.dosyaAdi,
      yol: girdi.yol,
      boyut: girdi.boyut,
      tur: girdi.tur,
    })
    .select("*")
    .single();
  if (error) {
    await supabase.storage.from(SARTNAME_KLASORU).remove([girdi.yol]);
    return { hata: "Dosya kaydedilemedi: " + error.message };
  }

  // İhalenin ilk şartname dosyası, maliyet tablosundaki kaynak göstergesinde görünür
  if (!girdi.urunId) {
    const ihale = await ihaleGetir(supabase, girdi.ihaleId);
    if (ihale && ihale.kaynak === "sartname" && !ihale.kaynak_dosya) {
      await supabase.from("ihaleler").update({ kaynak_dosya: girdi.dosyaAdi }).eq("id", girdi.ihaleId);
    }
  }
  revalidatePath(`/ihaleler/${girdi.ihaleId}`);
  return { veri: { ...(data as IhaleDosyasi), boyut: Number(data.boyut) } };
}

export async function dosyaSil(dosyaId: string): Promise<Sonuc> {
  const supabase = sunucuIstemcisi();
  const { data } = await supabase.from("ihale_dosyalari").select("*").eq("id", dosyaId).maybeSingle();
  const dosya = data as IhaleDosyasi | null;
  if (!dosya) return { hata: "Dosya bulunamadı." };
  const { error: depoHatasi } = await supabase.storage.from(SARTNAME_KLASORU).remove([dosya.yol]);
  if (depoHatasi) return { hata: "Dosya silinemedi: " + depoHatasi.message };
  const { error } = await supabase.from("ihale_dosyalari").delete().eq("id", dosyaId);
  if (error) return { hata: "Dosya silinemedi: " + error.message };
  revalidatePath(`/ihaleler/${dosya.ihale_id}`);
  return { veri: null };
}

// Türkiye saatine göre YYYY-MM-DD
function tarihMetni(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
}

// ---------------------------------------------------------------------------
// Şartname analizi (yapay zekâ). Analiz hiçbir şey kaydetmez; kullanıcı özeti onaylayınca analizUygula çalışır.
// ---------------------------------------------------------------------------

export async function sartnameAnalizEt(dosyaId: string): Promise<Sonuc<AnalizSonucu & { dosyaAdi: string }>> {
  const supabase = sunucuIstemcisi();
  const { data } = await supabase.from("ihale_dosyalari").select("*").eq("id", dosyaId).maybeSingle();
  const dosya = data as IhaleDosyasi | null;
  if (!dosya) return { hata: "Dosya bulunamadı." };
  const { data: blob, error } = await supabase.storage.from(SARTNAME_KLASORU).download(dosya.yol);
  if (error || !blob) return { hata: "Dosya indirilemedi: " + (error?.message ?? "") };
  const hazir = belgeyiHazirla(Buffer.from(await blob.arrayBuffer()), dosya.dosya_adi);
  if (hazir.hata !== undefined) return { hata: hazir.hata };

  const [sablonlar, firma] = await Promise.all([kalemSablonlariniGetir(supabase), firmaAyarlariGetir(supabase)]);
  const b = hazir.icerik;
  const belge: BetaContentBlockParam =
    b.tur === "pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b.base64 }, title: dosya.dosya_adi }
      : b.tur === "gorsel"
        ? { type: "image", source: { type: "base64", media_type: b.mediaType, data: b.base64 } }
        : { type: "document", source: { type: "text", media_type: "text/plain", data: b.metin }, title: dosya.dosya_adi };
  const s = await yapilandirilmisOku({
    sistem: ANALIZ_SISTEM_ISTEMI,
    icerik: [
      belge,
      {
        type: "text",
        text: `Dosya adı: ${dosya.dosya_adi}\nFirmanın adresi: ${firma?.adres || "belirtilmemiş"}\n\nÜrün grupları ve opsiyonel kalemleri:\n${kutuphaneMetni(sablonlar)}\n\nYukarıdaki dosyayı analiz et.`,
      },
    ],
    sema: AnalizSemasi,
    efor: "low",
  });
  if (s.hata !== undefined) return { hata: s.hata };
  const sonuc = analiziEslestir(s.veri, sablonlar);
  if (sonuc.urunler.length === 0) {
    return { hata: "Dosyada ürün bulunamadı. Ürünleri elle ekleyebilirsiniz." };
  }
  return { veri: { ...sonuc, dosyaAdi: dosya.dosya_adi } };
}

export type AnalizOnayi = {
  kaynak: "sartname" | "segment";
  segment: string | null;
  kaynakDosya: string;
  ihale: { musteri: string; teslim_yeri: string; termin: string; son_teklif_tarihi: string };
  urunler: { urun_grubu: string; ad: string; adet: number; aciklama: string; opsiyonelIdler: string[] }[];
};

/** Kullanıcının onayladığı analiz özetiyle ürünleri ve kalemleri oluşturur. */
export async function analizUygula(ihaleId: string, g: AnalizOnayi): Promise<Sonuc<UrunKalemli[]>> {
  if (g.kaynak === "segment" && !SEGMENTLER.includes(g.segment as (typeof SEGMENTLER)[number])) {
    return { hata: "Teknik şartname yoksa kalite segmentini seçmeniz zorunludur." };
  }
  if (g.urunler.length === 0) return { hata: "En az bir ürün seçin." };
  for (const u of g.urunler) {
    if (!Number.isInteger(u.adet) || u.adet <= 0) return { hata: `"${u.ad}" için adet girin.` };
  }

  const supabase = sunucuIstemcisi();
  const ihale = await ihaleGetir(supabase, ihaleId);
  if (!ihale) return { hata: "İhale bulunamadı." };
  // Kullanıcının daha önce girdiği bilgilerin üzerine yazılmaz; sadece boş alanlar doldurulur
  const guncelleme: Record<string, string | null> = {
    kaynak: g.kaynak,
    segment: g.kaynak === "segment" ? g.segment : null,
    kaynak_dosya: g.kaynakDosya,
  };
  if (!ihale.musteri && g.ihale.musteri) guncelleme.musteri = g.ihale.musteri;
  if (!ihale.teslim_yeri && g.ihale.teslim_yeri) guncelleme.teslim_yeri = g.ihale.teslim_yeri;
  if (!ihale.termin && g.ihale.termin) guncelleme.termin = g.ihale.termin;
  if (!ihale.son_teklif_tarihi && /^\d{4}-\d{2}-\d{2}$/.test(g.ihale.son_teklif_tarihi)) {
    guncelleme.son_teklif_tarihi = g.ihale.son_teklif_tarihi;
  }
  const { error } = await supabase.from("ihaleler").update(guncelleme).eq("id", ihaleId);
  if (error) return { hata: "İhale güncellenemedi: " + error.message };

  const sablonlar = await kalemSablonlariniGetir(supabase);
  const eklenen: UrunKalemli[] = [];
  for (const u of g.urunler) {
    const s = await urunEkle(ihaleId, { urun_grubu: u.urun_grubu, ad: u.ad, adet: u.adet, aciklama: u.aciklama });
    if (s.hata !== undefined) {
      return { hata: `${eklenen.length} ürün eklendi, "${u.ad}" eklenemedi: ${s.hata}` };
    }
    const ops = sablonlar.filter((t) => u.opsiyonelIdler.includes(t.id) && t.urun_grubu === u.urun_grubu && !t.zorunlu);
    let kalemler = s.veri.urun_kalemleri;
    if (ops.length > 0) {
      const { data, error: kHata } = await supabase
        .from("urun_kalemleri")
        .insert(
          ops.map((t, i) => ({
            urun_id: s.veri.id,
            sablon_id: t.id,
            ad: t.ad,
            zorunlu: false,
            birim: t.birim,
            kullanim: t.varsayilan_kullanim,
            birim_fiyat: t.varsayilan_birim_fiyat,
            sira: kalemler.length + i,
          })),
        )
        .select("*");
      if (kHata) return { hata: `"${u.ad}" için opsiyonel kalemler eklenemedi: ${kHata.message}` };
      kalemler = [...kalemler, ...(data as UrunKalemi[]).map(kalemiDuzelt)];
    }
    eklenen.push({ ...s.veri, urun_kalemleri: kalemler });
  }
  revalidatePath(`/ihaleler/${ihaleId}`);
  revalidatePath("/ihaleler");
  return { veri: eklenen };
}
