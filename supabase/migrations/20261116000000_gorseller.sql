-- İhale ve ürün görselleri (ürün fotoğrafı, numune, model çizimi…)
-- Resimlerin kendisi mevcut gizli "sartnameler" deposunda, "gorseller/" klasöründe durur.
create table if not exists public.ihale_gorselleri (
  id uuid primary key default gen_random_uuid(),
  ihale_id uuid not null references public.ihaleler (id) on delete cascade,
  urun_id uuid references public.ihale_urunleri (id) on delete set null,
  ad text not null default '',
  aciklama text not null default '',
  yol text not null unique,
  boyut bigint not null default 0,
  tur text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists ihale_gorselleri_ihale on public.ihale_gorselleri (ihale_id, created_at);

alter table public.ihale_gorselleri enable row level security;
drop policy if exists "firma kullanicilari" on public.ihale_gorselleri;
create policy "firma kullanicilari" on public.ihale_gorselleri
  for all to authenticated using (true) with check (true);
