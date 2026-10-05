import { createBrowserClient } from "@supabase/ssr";
import { supabaseAyarlari } from "./env";

export function tarayiciIstemcisi() {
  const { url, anahtar } = supabaseAyarlari();
  return createBrowserClient(url, anahtar);
}
