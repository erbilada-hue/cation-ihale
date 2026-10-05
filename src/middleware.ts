import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anahtar = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anahtar) return response;

  const supabase = createServerClient(url, anahtar, {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
