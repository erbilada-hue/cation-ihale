// Kullanıcı ekleme / silme gibi yönetici işlemleri için Supabase istemcisi.
// SUPABASE_SERVICE_ROLE_KEY yalnızca sunucuda okunur; tarayıcıya asla gönderilmez.
// Bu dosya sadece "use server" eylemlerinden ve sunucu sayfalarından içe aktarılmalıdır.

import { createClient } from "@supabase/supabase-js";
import { supabaseAyarlari } from "./env";

export function yoneticiIstemcisi() {
  const anahtar = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!anahtar) return null;
  const { url } = supabaseAyarlari();
  return createClient(url, anahtar, { auth: { persistSession: false, autoRefreshToken: false } });
}
