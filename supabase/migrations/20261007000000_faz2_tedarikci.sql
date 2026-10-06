-- CATION İhale Maliyet Sistemi — Faz 2 (Tedarikçi Yönetimi)
--   Tedarikçiler, tedarikçi fiyat listesi, fiyat talepleri (WhatsApp ile kullanıcının kendisi gönderir)
-- Supabase SQL Editor'da bir kez çalıştırılır. Tekrar çalıştırılırsa zarar vermez.

-- ---------------------------------------------------------------------------
-- Tedarikçiler
-- ---------------------------------------------------------------------------
create table if not exists public.tedarikciler (
  id uuid primary key default gen_random_uuid(),
  ad text not null check (length(trim(ad)) > 0),
  yetkili text not null default '',
  telefon text not null default '',
  eposta text not null default '',
  kategori text not null default '',
  notlar text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists tedarikciler_guncellendi on public.tedarikciler;
create trigger tedarikciler_guncellendi before update on public.tedarikciler
  for each row execute function public.guncellenme_zamani();

-- ---------------------------------------------------------------------------
-- Fiyat listesi: bir satır = bir tedarikçinin bir kalem için son fiyatı
-- Fiyat her zaman KDV hariç saklanır. KDV dahil gelen fiyat kaydederken ayrılır.
-- ---------------------------------------------------------------------------
create table if not exists public.tedarikci_fiyatlari (
  id uuid primary key default gen_random_uuid(),
  tedarikci_id uuid not null references public.tedarikciler (id) on delete cascade,
  kalem_adi text not null check (length(trim(kalem_adi)) > 0),
  aciklama text not null default '',
  birim text not null default 'adet',
  fiyat numeric(14, 4) not null check (fiyat >= 0),
  para_birimi text not null default 'TRY' check (para_birimi in ('TRY', 'USD', 'EUR')),
  -- haric: KDV hariç geldi · dahil: KDV dahil geldi, ayrıldı · belirsiz: tedarikçi belirtmedi
  kdv_durumu text not null default 'haric' check (kdv_durumu in ('haric', 'dahil', 'belirsiz')),
  termin text not null default '',
  min_siparis text not null default '',
  odeme_vadesi text not null default '',
  fiyat_tarihi date not null default current_date,
  notlar text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tedarikci_fiyatlari_tedarikci on public.tedarikci_fiyatlari (tedarikci_id);
drop trigger if exists tedarikci_fiyatlari_guncellendi on public.tedarikci_fiyatlari;
create trigger tedarikci_fiyatlari_guncellendi before update on public.tedarikci_fiyatlari
  for each row execute function public.guncellenme_zamani();

-- ---------------------------------------------------------------------------
-- Fiyat talepleri: "Toplu İste" ile hazırlanan ve kullanıcının gönderdiği mesajlar
-- ---------------------------------------------------------------------------
create table if not exists public.fiyat_talepleri (
  id uuid primary key default gen_random_uuid(),
  tedarikci_id uuid not null references public.tedarikciler (id) on delete cascade,
  fiyat_idleri uuid[] not null default '{}',
  mesaj text not null default '',
  gonderim_zamani timestamptz not null default now(),
  cevap_zamani timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists fiyat_talepleri_bekleyen on public.fiyat_talepleri (gonderim_zamani)
  where cevap_zamani is null;

-- ---------------------------------------------------------------------------
-- Maliyet kalemi hangi tedarikçi fiyatından geldi (elle değişince boşalır)
-- ---------------------------------------------------------------------------
alter table public.urun_kalemleri
  add column if not exists tedarikci_fiyat_id uuid references public.tedarikci_fiyatlari (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Erişim: sadece giriş yapmış firma kullanıcıları
-- ---------------------------------------------------------------------------
alter table public.tedarikciler enable row level security;
alter table public.tedarikci_fiyatlari enable row level security;
alter table public.fiyat_talepleri enable row level security;

drop policy if exists "firma kullanicilari" on public.tedarikciler;
create policy "firma kullanicilari" on public.tedarikciler
  for all to authenticated using (true) with check (true);
drop policy if exists "firma kullanicilari" on public.tedarikci_fiyatlari;
create policy "firma kullanicilari" on public.tedarikci_fiyatlari
  for all to authenticated using (true) with check (true);
drop policy if exists "firma kullanicilari" on public.fiyat_talepleri;
create policy "firma kullanicilari" on public.fiyat_talepleri
  for all to authenticated using (true) with check (true);
