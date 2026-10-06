-- Faz 1 eklemeleri (Erbil'in ilk canlı denemesinden sonra)
--   1. Dolar / euro ile alınan kalemler: kalemde para birimi, ihalede kur
--   2. Teknik şartname dosyaları (PDF, Word, Excel) ihaleye ve ürüne eklenebilir
--   3. Kütüphanedeki tek "Fason (kesim+dikim+ütü)" kalemi kesim, dikim, ütü-paket olarak ayrılır
-- Supabase SQL Editor'da bir kez çalıştırılır. Tekrar çalıştırılırsa zarar vermez.

-- ---------------------------------------------------------------------------
-- 1. Döviz
-- ---------------------------------------------------------------------------
alter table public.urun_kalemleri
  add column if not exists para_birimi text not null default 'TRY'
    check (para_birimi in ('TRY', 'USD', 'EUR'));

alter table public.ihaleler
  add column if not exists usd_kuru numeric(12, 4) check (usd_kuru > 0),
  add column if not exists eur_kuru numeric(12, 4) check (eur_kuru > 0);

-- ---------------------------------------------------------------------------
-- 2. Şartname dosyaları
-- ---------------------------------------------------------------------------
create table if not exists public.ihale_dosyalari (
  id uuid primary key default gen_random_uuid(),
  ihale_id uuid not null references public.ihaleler (id) on delete cascade,
  urun_id uuid references public.ihale_urunleri (id) on delete set null,
  dosya_adi text not null,
  yol text not null unique,
  boyut bigint not null default 0,
  tur text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists ihale_dosyalari_ihale on public.ihale_dosyalari (ihale_id, created_at);

alter table public.ihale_dosyalari enable row level security;
drop policy if exists "firma kullanicilari" on public.ihale_dosyalari;
create policy "firma kullanicilari" on public.ihale_dosyalari
  for all to authenticated using (true) with check (true);

-- Dosyaların kendisi Supabase Storage'da, gizli "sartnameler" klasöründe durur (en fazla 50 MB)
insert into storage.buckets (id, name, public, file_size_limit)
values ('sartnameler', 'sartnameler', false, 52428800)
on conflict (id) do nothing;

drop policy if exists "sartname dosyalari" on storage.objects;
create policy "sartname dosyalari" on storage.objects
  for all to authenticated
  using (bucket_id = 'sartnameler') with check (bucket_id = 'sartnameler');

-- ---------------------------------------------------------------------------
-- 3. Fason kalemini ayır
-- ---------------------------------------------------------------------------
do $$
declare
  f record;
begin
  for f in
    select * from public.kalem_sablonlari
    where ad ilike 'fason%' and ad ilike '%kesim%' and ad ilike '%dikim%'
    order by sira desc
  loop
    update public.kalem_sablonlari set sira = sira + 2 where sira > f.sira;
    insert into public.kalem_sablonlari
      (urun_grubu, ad, zorunlu, birim, varsayilan_kullanim, varsayilan_birim_fiyat, anahtar_kelimeler, sira)
    values
      (f.urun_grubu, 'Fason – Kesim', f.zorunlu, f.birim, f.varsayilan_kullanim, null,
        array['kesim', 'fason'], f.sira),
      (f.urun_grubu, 'Fason – Dikim', f.zorunlu, f.birim, f.varsayilan_kullanim, null,
        array['dikim', 'fason', 'overlok', 'reçme'], f.sira + 1),
      (f.urun_grubu, 'Fason – Ütü ve paket', f.zorunlu, f.birim, f.varsayilan_kullanim, null,
        array['ütü', 'paket', 'paketleme', 'presleme'], f.sira + 2);
    delete from public.kalem_sablonlari where id = f.id;
  end loop;
end $$;
