import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAyariOku } from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const ayar = supabaseAyariOku();
  if ("hata" in ayar) return ayarHatasiSayfasi(ayar.hata);

  const supabase = createServerClient(ayar.url, ayar.anahtar, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(liste) {
        liste.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        liste.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  let user = null;
  try {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch {
    return ayarHatasiSayfasi(
      "Supabase'e bağlanılamadı. Adresin ve anahtarın doğru olduğundan, Supabase projesinin açık olduğundan emin olun.",
    );
  }

  const girisSayfasi = request.nextUrl.pathname.startsWith("/giris");
  if (!user && !girisSayfasi) {
    const hedef = request.nextUrl.clone();
    hedef.pathname = "/giris";
    hedef.search = "";
    return NextResponse.redirect(hedef);
  }
  if (user && girisSayfasi) {
    const hedef = request.nextUrl.clone();
    hedef.pathname = "/";
    hedef.search = "";
    return NextResponse.redirect(hedef);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

// Supabase ayarları eksik ya da hatalıysa anlaşılmaz bir hata yerine
// ne yapılacağını söyleyen bir sayfa gösterilir.
function ayarHatasiSayfasi(neden: string) {
  const kacir = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kurulum eksik</title></head>
<body style="font-family:system-ui,sans-serif;background:#f6f7f9;color:#1b2333;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:16px">
<div style="background:#fff;border:1px solid #e9ebef;border-radius:12px;padding:32px;max-width:560px">
<h1 style="font-size:20px;color:#0f1f44;margin:0 0 12px">Supabase bağlantı ayarlarında sorun var</h1>
<p style="line-height:1.6;margin:0 0 12px;color:#b91c1c">${kacir(neden)}</p>
<p style="line-height:1.6;margin:0 0 12px">Vercel'de <b>Settings → Environment Variables</b> bölümündeki <code>NEXT_PUBLIC_SUPABASE_URL</code> (Supabase'deki Project URL) ve <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (anon public anahtarı) değerlerini kontrol edin.</p>
<p style="line-height:1.6;margin:0">Düzelttikten sonra <b>Deployments</b> sekmesinden en üstteki yayını <b>Redeploy</b> ile yeniden yayınlayın.</p>
</div></body></html>`;
  return new NextResponse(html, { status: 503, headers: { "content-type": "text/html; charset=utf-8" } });
}
