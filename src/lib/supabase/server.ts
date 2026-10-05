import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAyarlari } from "./env";

export function sunucuIstemcisi() {
  const { url, anahtar } = supabaseAyarlari();
  const cookieStore = cookies();
  return createServerClient(url, anahtar, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(liste) {
        try {
          liste.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component içinden çağrıldıysa çerez yazılamaz; middleware oturumu yeniler.
        }
      },
    },
  });
}
