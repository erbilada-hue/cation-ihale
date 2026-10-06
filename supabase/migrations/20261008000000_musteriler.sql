-- CATION İhale Maliyet Sistemi — Müşteriler
--   Bir müşterinin birden çok ihalesi olur (ör. Anadolu Efes Fabrika 2026 Kış, 2026 Yaz).
--   Aracı firmalarda her ihale bir markaya ait olabilir (ör. Erhas → Castrol, Mercedes).
-- Supabase SQL Editor'da bir kez çalıştırılır. Tekrar çalıştırılırsa zarar vermez.

create table if not exists public.musteriler (
  id uuid primary key default gen_random_uuid(),
  ad text not null check (length(trim(ad)) > 0),
  yetkili text not null default '',
  telefon text not null default '',
  eposta text not null default '',
  adres text not null default '',
  notlar text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists musteriler_guncellendi on public.musteriler;
create trigger musteriler_guncellendi before update on public.musteriler
  for each row execute function public.guncellenme_zamani();

alter table public.musteriler enable row level security;
drop policy if exists "firma kullanicilari" on public.musteriler;
create policy "firma kullanicilari" on public.musteriler
  for all to authenticated using (true) with check (true);

-- İhale → müşteri bağlantısı ve marka / proje. Müşteri silinirse ihale kalır, bağlantı boşalır.
alter table public.ihaleler add column if not exists musteri_id uuid references public.musteriler (id) on delete set null;
alter table public.ihaleler add column if not exists marka text not null default '';
create index if not exists ihaleler_musteri on public.ihaleler (musteri_id);

-- Mevcut ihalelerde yazılı müşteri adlarından müşteri kartları oluşturulur ve bağlanır
insert into public.musteriler (ad)
select distinct on (lower(trim(i.musteri))) trim(i.musteri)
from public.ihaleler i
where trim(i.musteri) <> ''
  and not exists (select 1 from public.musteriler m where lower(m.ad) = lower(trim(i.musteri)))
order by lower(trim(i.musteri)), i.created_at;

update public.ihaleler i
set musteri_id = m.id
from public.musteriler m
where i.musteri_id is null and trim(i.musteri) <> '' and lower(m.ad) = lower(trim(i.musteri));
