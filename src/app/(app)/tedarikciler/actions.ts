"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { firmaAyarlariGetir } from "@/lib/veri";
import { PARA_BIRIMLERI } from "@/lib/sabitler";
import { KDV_DURUMLARI, kalemAnahtari, tedarikciFiyatiOku, type KdvDurumu } from "@/lib/tedarikci";
import type { FiyatSatiri, TedarikciSatiri } from "@/lib/fiyatExcel";
import type { TedarikciFiyati } from "@/lib/tipler";

export type Sonuc<T = null> = { hata: string; veri?: undefined } | { hata?: undefined; veri: T };
export type FormDurumu = { hata: string | null; basari: string | null };

function yenile() {
  revalidatePath("/tedarikciler", "layout");
  revalidatePath("/fiyat-listesi");
}

// Türkiye saatine göre YYYY-MM-DD
function bugun(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
}

// ---------------------------------------------------------------------------
// Tedarikçi
// ---------------------------------------------------------------------------

export async function tedarikciKaydet(_onceki: FormDurumu, form: FormData): Promise<FormDurumu> {
  const metin = (ad: string) => String(form.get(ad) ?? "").trim();
  const id = metin("id") || null;
  const kayit = {
    ad: metin("ad"),
    yetkili: metin("yetkili"),
    telefon: metin("telefon"),
    eposta: metin("eposta"),
    kategori: metin("kategori"),
    notlar: metin("notlar"),
  };
  if (!kayit.ad) return { hata: "Tedarikçi adı zorunludur.", basari: null };

  const supabase = sunucuIstemcisi();
  if (id) {
    const { error } = await supabase.from("tedarikciler").update(kayit).eq("id", id);
    if (error) return { hata: "Kaydedilemedi: " + error.message, basari: null };
    yenile();
    return { hata: null, basari: "Tedarikçi bilgileri kaydedildi." };
  }
  const { data, error } = await supabase.from("tedarikciler").insert(kayit).select("id").single();
  if (error) return { hata: "Kaydedilemedi: " + error.message, basari: null };
  yenile();
  redirect(`/tedarikciler/${data.id}`);
}

export async function tedarikciSil(id: string): Promise<Sonuc> {
  const supabase = sunucuIstemcisi();
  const { error } = await supabase.from("tedarikciler").delete().eq("id", id);
  if (error) return { hata: "Tedarikçi silinemedi: " + error.message };
  yenile();
  redirect("/tedarikciler");
}

// ---------------------------------------------------------------------------
// Fiyat listesi
// ---------------------------------------------------------------------------

export type FiyatGirdisi = {
  id?: string;
  tedarikci_id: string;
  kalem_adi: string;
  aciklama: string;
  birim: string;
  /** Tedarikçinin yazdığı haliyle: "165", "160-165", "165,50" */
  fiyatMetni: string;
  para_birimi: string;
  kdv_durumu: string;
  termin: string;
  min_siparis: string;
  odeme_vadesi: string;
  notlar: string;
};

/** Fiyatı ekler veya günceller; tarih bugüne çekilir. */
export async function fiyatKaydet(g: FiyatGirdisi): Promise<Sonuc<TedarikciFiyati>> {
  if (!g.tedarikci_id) return { hata: "Tedarikçiyi seçin." };
  if (!g.kalem_adi.trim()) return { hata: "Kalem adını yazın." };
  if (!PARA_BIRIMLERI.some((p) => p.kod === g.para_birimi)) return { hata: "Para birimi geçersiz." };
  if (!KDV_DURUMLARI.some((k) => k.kod === g.kdv_durumu)) return { hata: "KDV durumunu seçin." };

  const supabase = sunucuIstemcisi();
  const firma = await firmaAyarlariGetir(supabase);
  const okuma = tedarikciFiyatiOku(g.fiyatMetni, g.kdv_durumu as KdvDurumu, firma?.varsayilan_kdv_orani ?? 20);
  if (okuma.hata !== undefined) return { hata: okuma.hata };

  const kayit = {
    tedarikci_id: g.tedarikci_id,
    kalem_adi: g.kalem_adi.trim(),
    aciklama: g.aciklama.trim(),
    birim: g.birim.trim() || "adet",
    fiyat: okuma.fiyat,
    para_birimi: g.para_birimi,
    kdv_durumu: g.kdv_durumu,
    termin: g.termin.trim(),
    min_siparis: g.min_siparis.trim(),
    odeme_vadesi: g.odeme_vadesi.trim(),
    notlar: g.notlar.trim(),
    fiyat_tarihi: bugun(),
  };

  const sorgu = g.id
    ? supabase.from("tedarikci_fiyatlari").update(kayit).eq("id", g.id)
    : supabase.from("tedarikci_fiyatlari").insert(kayit);
  const { data, error } = await sorgu.select("*").single();
  if (error) return { hata: "Fiyat kaydedilemedi: " + error.message };

  if (g.id) await cevaplananTalepleriKapat(g.id);
  yenile();
  return { veri: { ...(data as TedarikciFiyati), fiyat: Number(data.fiyat) } };
}

export async function fiyatSil(id: string): Promise<Sonuc> {
  const supabase = sunucuIstemcisi();
  const { error } = await supabase.from("tedarikci_fiyatlari").delete().eq("id", id);
  if (error) return { hata: "Fiyat silinemedi: " + error.message };
  yenile();
  return { veri: null };
}

// ---------------------------------------------------------------------------
// Excel'den toplu fiyat
// ---------------------------------------------------------------------------

export type IceAktarimSonucu = { eklenen: number; guncellenen: number; atlanan: number; yeniTedarikci: number };

/**
 * Excel'den okunan fiyatları kaydeder. Tedarikçi adı listede yoksa tedarikçi oluşturulur.
 * Aynı tedarikçi + kalem + açıklama zaten varsa: dosyadaki tarih daha yeni (veya aynı) ise güncellenir, eskiyse dokunulmaz.
 * Tarayıcı satırları parça parça gönderir.
 */
export async function fiyatlariIceAktar(
  satirlar: FiyatSatiri[],
  tedarikciBilgileri: TedarikciSatiri[],
): Promise<Sonuc<IceAktarimSonucu>> {
  if (satirlar.length === 0) return { hata: "Aktarılacak fiyat yok." };
  if (satirlar.length > 1000) return { hata: "Bir seferde en fazla 1000 satır gönderilebilir." };

  const supabase = sunucuIstemcisi();
  const firma = await firmaAyarlariGetir(supabase);
  const kdvOrani = firma?.varsayilan_kdv_orani ?? 20;
  const sonuc: IceAktarimSonucu = { eklenen: 0, guncellenen: 0, atlanan: 0, yeniTedarikci: 0 };

  // Tedarikçiler: adı (büyük/küçük harf ve Türkçe harf farkı gözetmeden) eşleşen kullanılır, yoksa eklenir
  const { data: mevcutTedarikciler, error: tHata } = await supabase.from("tedarikciler").select("id, ad");
  if (tHata) return { hata: "Tedarikçiler okunamadı: " + tHata.message };
  const tedarikciIdleri = new Map((mevcutTedarikciler ?? []).map((t) => [kalemAnahtari(t.ad as string), t.id as string]));
  const bilgi = new Map(tedarikciBilgileri.map((t) => [kalemAnahtari(t.ad), t]));
  const yeniAdlar = new Map<string, string>();
  for (const s of satirlar) {
    const k = kalemAnahtari(s.tedarikci);
    if (k && !tedarikciIdleri.has(k) && !yeniAdlar.has(k)) yeniAdlar.set(k, s.tedarikci.trim());
  }
  if (yeniAdlar.size > 0) {
    const { data, error } = await supabase
      .from("tedarikciler")
      .insert(
        Array.from(yeniAdlar.entries()).map(([k, ad]) => ({
          ad,
          yetkili: bilgi.get(k)?.yetkili ?? "",
          telefon: bilgi.get(k)?.telefon ?? "",
          kategori: bilgi.get(k)?.kategori ?? "",
        })),
      )
      .select("id, ad");
    if (error) return { hata: "Tedarikçiler eklenemedi: " + error.message };
    for (const t of data ?? []) tedarikciIdleri.set(kalemAnahtari(t.ad as string), t.id as string);
    sonuc.yeniTedarikci = data?.length ?? 0;
  }

  // Bu tedarikçilerin mevcut fiyatları
  const ilgiliIdler = Array.from(new Set(satirlar.map((s) => tedarikciIdleri.get(kalemAnahtari(s.tedarikci))!)));
  const mevcut = new Map<string, { id: string; fiyat_tarihi: string }>();
  const anahtar = (tedarikciId: string, kalem: string, aciklama: string) =>
    `${tedarikciId}|${kalemAnahtari(kalem)}|${kalemAnahtari(aciklama)}`;
  for (let bas = 0; ; bas += 1000) {
    const { data, error } = await supabase
      .from("tedarikci_fiyatlari")
      .select("id, tedarikci_id, kalem_adi, aciklama, fiyat_tarihi")
      .in("tedarikci_id", ilgiliIdler)
      .order("id")
      .range(bas, bas + 999);
    if (error) return { hata: "Fiyat listesi okunamadı: " + error.message };
    for (const f of data ?? []) {
      mevcut.set(anahtar(f.tedarikci_id as string, f.kalem_adi as string, f.aciklama as string), {
        id: f.id as string,
        fiyat_tarihi: f.fiyat_tarihi as string,
      });
    }
    if (!data || data.length < 1000) break;
  }

  const eklenecek: Record<string, unknown>[] = [];
  const guncellenecek: { id: string; kayit: Record<string, unknown> }[] = [];
  const gorulen = new Set<string>();
  // Dosyada aynı fiyat birden fazla kez varsa en yeni tarihli olan geçerli
  const yeniTarihliOnce = [...satirlar].sort((a, b) => (b.fiyat_tarihi ?? "9").localeCompare(a.fiyat_tarihi ?? "9"));
  for (const s of yeniTarihliOnce) {
    if (!PARA_BIRIMLERI.some((p) => p.kod === s.para_birimi) || !KDV_DURUMLARI.some((k) => k.kod === s.kdv_durumu)) {
      sonuc.atlanan++;
      continue;
    }
    const okuma = tedarikciFiyatiOku(s.fiyatMetni, s.kdv_durumu, kdvOrani);
    if (okuma.hata !== undefined || !s.kalem_adi.trim()) {
      sonuc.atlanan++;
      continue;
    }
    const tedarikciId = tedarikciIdleri.get(kalemAnahtari(s.tedarikci))!;
    const tarih = s.fiyat_tarihi ?? bugun();
    const notlar = [s.notlar.trim(), ...okuma.notlar].filter(Boolean).join(" ");
    const kayit = {
      tedarikci_id: tedarikciId,
      kalem_adi: s.kalem_adi.trim(),
      aciklama: s.aciklama.trim(),
      birim: s.birim.trim() || "adet",
      fiyat: okuma.fiyat,
      para_birimi: s.para_birimi,
      kdv_durumu: s.kdv_durumu,
      termin: s.termin.trim(),
      min_siparis: s.min_siparis.trim(),
      odeme_vadesi: s.odeme_vadesi.trim(),
      notlar,
      fiyat_tarihi: tarih,
    };
    const k = anahtar(tedarikciId, s.kalem_adi, s.aciklama);
    if (gorulen.has(k)) {
      sonuc.atlanan++;
      continue;
    }
    gorulen.add(k);
    const eski = mevcut.get(k);
    if (!eski) eklenecek.push(kayit);
    else if (tarih >= eski.fiyat_tarihi) guncellenecek.push({ id: eski.id, kayit });
    else sonuc.atlanan++;
  }

  for (let bas = 0; bas < eklenecek.length; bas += 500) {
    const { error } = await supabase.from("tedarikci_fiyatlari").insert(eklenecek.slice(bas, bas + 500));
    if (error) return { hata: `Fiyatlar kaydedilemedi (${sonuc.eklenen} satır kaydedildi): ${error.message}` };
    sonuc.eklenen += Math.min(500, eklenecek.length - bas);
  }
  for (let bas = 0; bas < guncellenecek.length; bas += 500) {
    const parca = guncellenecek.slice(bas, bas + 500).map((g) => ({ id: g.id, ...g.kayit }));
    const { error } = await supabase.from("tedarikci_fiyatlari").upsert(parca);
    if (error) return { hata: "Fiyatlar güncellenemedi: " + error.message };
    sonuc.guncellenen += parca.length;
  }
  yenile();
  return { veri: sonuc };
}

// ---------------------------------------------------------------------------
// Fiyat talepleri (mesajı kullanıcı WhatsApp'tan kendisi gönderir)
// ---------------------------------------------------------------------------

/** Kullanıcı mesajı gönderdiğini işaretledi: cevap bekleniyor */
export async function talepKaydet(girdi: {
  tedarikci_id: string;
  fiyat_idleri: string[];
  mesaj: string;
}): Promise<Sonuc<{ id: string }>> {
  if (girdi.fiyat_idleri.length === 0) return { hata: "Talep için en az bir kalem seçin." };
  const supabase = sunucuIstemcisi();
  const { data, error } = await supabase
    .from("fiyat_talepleri")
    .insert({ tedarikci_id: girdi.tedarikci_id, fiyat_idleri: girdi.fiyat_idleri, mesaj: girdi.mesaj })
    .select("id")
    .single();
  if (error) return { hata: "Kaydedilemedi: " + error.message };
  yenile();
  return { veri: { id: data.id } };
}

/** Cevabın tamamı girilmese de talebi elle kapatmak için */
export async function talepKapat(id: string): Promise<Sonuc> {
  const supabase = sunucuIstemcisi();
  const { error } = await supabase
    .from("fiyat_talepleri")
    .update({ cevap_zamani: new Date().toISOString() })
    .eq("id", id);
  if (error) return { hata: "Kaydedilemedi: " + error.message };
  yenile();
  return { veri: null };
}

/** Talepteki tüm kalemlerin fiyatı gönderimden sonra güncellendiyse talep cevaplanmış sayılır */
async function cevaplananTalepleriKapat(fiyatId: string) {
  const supabase = sunucuIstemcisi();
  const { data: talepler } = await supabase
    .from("fiyat_talepleri")
    .select("id, fiyat_idleri, gonderim_zamani")
    .is("cevap_zamani", null)
    .contains("fiyat_idleri", [fiyatId]);
  for (const t of talepler ?? []) {
    const { data: fiyatlar } = await supabase
      .from("tedarikci_fiyatlari")
      .select("id, updated_at")
      .in("id", t.fiyat_idleri as string[]);
    const gonderim = new Date(t.gonderim_zamani as string).getTime();
    const hepsi = (fiyatlar ?? []).every((f) => new Date(f.updated_at as string).getTime() >= gonderim);
    if (hepsi) {
      await supabase.from("fiyat_talepleri").update({ cevap_zamani: new Date().toISOString() }).eq("id", t.id);
    }
  }
}
