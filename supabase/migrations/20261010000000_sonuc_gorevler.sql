-- İhale sonucu (olumlu / olumsuz) ve Genel Bakış'taki görevler

-- Sonuç boşsa ihale henüz sonuçlanmamıştır
alter table public.ihaleler
  add column sonuc text check (sonuc in ('olumlu', 'olumsuz')),
  add column sonuc_tarihi date,
  add constraint sonuc_tarihli check ((sonuc is null) = (sonuc_tarihi is null));
create index ihaleler_sonuc on public.ihaleler (sonuc, sonuc_tarihi);

-- Görevler: ekibin yapılacaklar listesi, isteğe bağlı bir ihaleye bağlanır
create table public.gorevler (
  id uuid primary key default gen_random_uuid(),
  baslik text not null check (length(trim(baslik)) > 0),
  ihale_id uuid references public.ihaleler (id) on delete set null,
  son_tarih date,
  tamamlandi boolean not null default false,
  tamamlanma_zamani timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gorevler_durum on public.gorevler (tamamlandi, son_tarih);
create trigger gorevler_guncellendi before update on public.gorevler
  for each row execute function public.guncellenme_zamani();

alter table public.gorevler enable row level security;
create policy "firma kullanicilari" on public.gorevler
  for all to authenticated using (true) with check (true);
