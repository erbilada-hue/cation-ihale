"use server";

import { redirect } from "next/navigation";
import { sunucuIstemcisi } from "@/lib/supabase/server";

export async function girisYap(_onceki: { hata: string | null }, form: FormData): Promise<{ hata: string | null }> {
  const eposta = String(form.get("eposta") ?? "").trim();
  const sifre = String(form.get("sifre") ?? "");
  if (!eposta || !sifre) return { hata: "E-posta ve şifre girin." };

  const supabase = sunucuIstemcisi();
  const { error } = await supabase.auth.signInWithPassword({ email: eposta, password: sifre });
  if (error) return { hata: "E-posta veya şifre hatalı." };

  redirect("/");
}

export async function cikisYap() {
  const supabase = sunucuIstemcisi();
  await supabase.auth.signOut();
  redirect("/giris");
}
