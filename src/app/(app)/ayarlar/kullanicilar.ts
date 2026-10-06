"use server";

import { revalidatePath } from "next/cache";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { yoneticiIstemcisi } from "@/lib/supabase/yonetici";

export type Sonuc = { hata: string } | { hata?: undefined; mesaj: string };

const EN_KISA_SIFRE = 8;
const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Her işlemde önce giriş yapmış bir kullanıcı olduğundan emin olunur */
async function girisYapan() {
  const {
    data: { user },
  } = await sunucuIstemcisi().auth.getUser();
  return user;
}

const ANAHTAR_YOK = "Kullanıcı yönetimi için Vercel'e SUPABASE_SERVICE_ROLE_KEY anahtarı eklenmemiş. Ayarlar sayfasındaki adımları izleyin.";

function hataCevir(mesaj: string): string {
  if (/already been registered|already exists/i.test(mesaj)) return "Bu e-posta ile kayıtlı bir kullanıcı zaten var.";
  if (/password/i.test(mesaj)) return "Şifre kabul edilmedi; en az 8 karakter olmalı.";
  return mesaj;
}

export async function kullaniciEkle(g: { ad: string; eposta: string; sifre: string }): Promise<Sonuc> {
  if (!(await girisYapan())) return { hata: "Oturumunuz kapanmış; tekrar giriş yapın." };
  const yonetici = yoneticiIstemcisi();
  if (!yonetici) return { hata: ANAHTAR_YOK };
  const eposta = g.eposta.trim().toLowerCase();
  const ad = g.ad.trim();
  if (!EPOSTA.test(eposta)) return { hata: "Geçerli bir e-posta adresi yazın." };
  if (g.sifre.length < EN_KISA_SIFRE) return { hata: `Şifre en az ${EN_KISA_SIFRE} karakter olmalı.` };
  const { error } = await yonetici.auth.admin.createUser({
    email: eposta,
    password: g.sifre,
    email_confirm: true,
    user_metadata: { ad },
  });
  if (error) return { hata: "Kullanıcı eklenemedi: " + hataCevir(error.message) };
  revalidatePath("/ayarlar");
  return { mesaj: `${ad || eposta} eklendi.` };
}

export async function kullaniciSifresiBelirle(id: string, sifre: string): Promise<Sonuc> {
  if (!(await girisYapan())) return { hata: "Oturumunuz kapanmış; tekrar giriş yapın." };
  const yonetici = yoneticiIstemcisi();
  if (!yonetici) return { hata: ANAHTAR_YOK };
  if (sifre.length < EN_KISA_SIFRE) return { hata: `Şifre en az ${EN_KISA_SIFRE} karakter olmalı.` };
  const { error } = await yonetici.auth.admin.updateUserById(id, { password: sifre });
  if (error) return { hata: "Şifre değiştirilemedi: " + hataCevir(error.message) };
  return { mesaj: "Yeni şifre kaydedildi." };
}

export async function kullaniciSil(id: string): Promise<Sonuc> {
  const ben = await girisYapan();
  if (!ben) return { hata: "Oturumunuz kapanmış; tekrar giriş yapın." };
  if (ben.id === id) return { hata: "Kendi hesabınızı buradan silemezsiniz." };
  const yonetici = yoneticiIstemcisi();
  if (!yonetici) return { hata: ANAHTAR_YOK };
  const { error } = await yonetici.auth.admin.deleteUser(id);
  if (error) return { hata: "Kullanıcı kaldırılamadı: " + error.message };
  revalidatePath("/ayarlar");
  return { mesaj: "Kullanıcı kaldırıldı." };
}

/** Giriş yapan kişinin kendi şifresi; yönetici anahtarı gerektirmez */
export async function sifremiDegistir(sifre: string): Promise<Sonuc> {
  if (sifre.length < EN_KISA_SIFRE) return { hata: `Şifre en az ${EN_KISA_SIFRE} karakter olmalı.` };
  const supabase = sunucuIstemcisi();
  const { error } = await supabase.auth.updateUser({ password: sifre });
  if (error) {
    if (/different from the old/i.test(error.message)) return { hata: "Yeni şifre eskisiyle aynı olamaz." };
    return { hata: "Şifre değiştirilemedi: " + hataCevir(error.message) };
  }
  return { mesaj: "Şifreniz değiştirildi." };
}
