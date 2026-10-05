/**
 * Supabase adresini toparlar: başta https:// yoksa ekler, sondaki / ve /rest/v1 kısmını atar.
 * Vercel'e elle yapıştırılan değerlerde sık görülen hataları tolere eder.
 */
export function supabaseAdresiniDuzelt(ham: string | undefined): string | null {
  if (!ham) return null;
  let s = ham.trim().replace(/^["']|["']$/g, "");
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  s = s.replace(/\/+(rest\/v1\/?)?$/i, "").replace(/\/+$/, "");
  try {
    const u = new URL(s);
    return u.hostname.includes(".") || u.hostname === "localhost" ? u.origin : null;
  } catch {
    return null;
  }
}

export type SupabaseAyari = { url: string; anahtar: string } | { hata: string };

export function supabaseAyariOku(): SupabaseAyari {
  const hamUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anahtar = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!hamUrl || !anahtar) {
    return { hata: "NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlanmamış." };
  }
  const url = supabaseAdresiniDuzelt(hamUrl);
  if (!url) {
    return {
      hata: "NEXT_PUBLIC_SUPABASE_URL geçerli bir adres değil. https://xxxx.supabase.co biçiminde olmalı.",
    };
  }
  return { url, anahtar };
}

export function supabaseAyarlari() {
  const a = supabaseAyariOku();
  if ("hata" in a) throw new Error("Supabase bağlantı bilgileri hatalı: " + a.hata);
  return a;
}
