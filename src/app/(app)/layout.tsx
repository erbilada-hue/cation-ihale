import { redirect } from "next/navigation";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { cikisYap } from "../giris/actions";
import { YanMenu } from "@/components/YanMenu";

export const dynamic = "force-dynamic";

export default async function UygulamaDuzeni({ children }: { children: React.ReactNode }) {
  const supabase = sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen self-start w-56 shrink-0 flex-col bg-brand-dark px-3 py-5 text-white print:hidden">
        <div className="mb-8 px-3">
          <div className="text-lg font-bold tracking-wider">CATION</div>
          <div className="text-xs text-white/60">İhale Maliyet Sistemi</div>
        </div>
        <YanMenu />
        <div className="mt-auto border-t border-white/10 px-3 pt-4">
          <div className="truncate text-xs text-white/60" title={user.email ?? ""}>
            {user.email}
          </div>
          <form action={cikisYap}>
            <button type="submit" className="mt-2 text-sm text-white/80 hover:text-white">
              Çıkış yap
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-6">{children}</main>
    </div>
  );
}
