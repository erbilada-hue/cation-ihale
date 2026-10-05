-- CATION İhale Maliyet Sistemi — Faz 1 (Temel MVP) şeması
-- Yüzde alanları yüzde olarak tutulur: 5 = %5

-- ---------------------------------------------------------------------------
-- Yardımcılar
-- ---------------------------------------------------------------------------
create or replace function public.guncellenme_zamani()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Ürün grupları kod listesi (uygulamadaki sabit liste ile aynı)
create or replace function public.gecerli_urun_grubu(kod text)
returns boolean language sql immutable as $$
  select kod in (
    'mont_kaban', 'pantolon_sort', 'tisort_polo', 'gomlek',
    'tulum_onluk', 'polar_yelek_yagmurluk', 'sapka_bere_corap'
  );
$$;

-- ---------------------------------------------------------------------------
-- Firma ayarları (tek satır)
-- ---------------------------------------------------------------------------
create table public.firma_ayarlari (
  id smallint primary key default 1 check (id = 1),
  firma_adi text not null default '',
  adres text not null default '',
  telefon text not null default '',
  eposta text not null default '',
  web text not null default '',
  vergi_dairesi text not null default '',
  vergi_no text not null default '',
  banka_adi text not null default '',
  iban text not null default '',
  logo_data_url text,
  teklif_gecerlilik_gun integer not null default 15 check (teklif_gecerlilik_gun > 0),
  varsayilan_kdv_orani numeric(5,2) not null default 20 check (varsayilan_kdv_orani >= 0),
  updated_at timestamptz not null default now()
);
insert into public.firma_ayarlari (id) values (1);
create trigger firma_ayarlari_guncellendi before update on public.firma_ayarlari
  for each row execute function public.guncellenme_zamani();

-- ---------------------------------------------------------------------------
-- Segment şablonları (Ayarlar → Segment Şablonları)
-- ---------------------------------------------------------------------------
create table public.segment_sablonlari (
  segment text primary key check (segment in ('premium', 'standart', 'ekonomik')),
  ad text not null,
  kumas text not null default '',
  gramaj text not null default '',
  boya text not null default '',
  baski text not null default '',
  fire_orani numeric(5,2) not null check (fire_orani >= 0),
  sira smallint not null,
  updated_at timestamptz not null default now()
);
insert into public.segment_sablonlari (segment, ad, kumas, gramaj, boya, baski, fire_orani, sira) values
  ('premium',  'Premium',  'Combed 40/1-30/1', '180gr+',     'Reaktif',  'DTF/Nakış', 4, 1),
  ('standart', 'Standart', 'Ring 30/1-20/1',   '160-180gr',  'Pigment',  'Serigrafi', 5, 2),
  ('ekonomik', 'Ekonomik', 'OE iplik',         '140-160gr',  'Standart', 'Tek renk',  6, 3);
create trigger segment_sablonlari_guncellendi before update on public.segment_sablonlari
  for each row execute function public.guncellenme_zamani();

-- ---------------------------------------------------------------------------
-- Kalem şablon kütüphanesi (Excel'den yüklenir)
-- ---------------------------------------------------------------------------
create table public.kalem_sablonlari (
  id uuid primary key default gen_random_uuid(),
  urun_grubu text not null check (public.gecerli_urun_grubu(urun_grubu)),
  ad text not null check (length(trim(ad)) > 0),
  zorunlu boolean not null default false,
  birim text not null default 'adet',
  varsayilan_kullanim numeric(12,4),
  varsayilan_birim_fiyat numeric(14,4),
  anahtar_kelimeler text[] not null default '{}',
  sira integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index kalem_sablonlari_grup on public.kalem_sablonlari (urun_grubu, zorunlu desc, sira);
create trigger kalem_sablonlari_guncellendi before update on public.kalem_sablonlari
  for each row execute function public.guncellenme_zamani();

-- Nakliye payı her ürün grubunda opsiyonel kalem olarak bulunur
insert into public.kalem_sablonlari (urun_grubu, ad, zorunlu, birim, varsayilan_kullanim, anahtar_kelimeler, sira)
select g, 'Nakliye payı', false, 'adet', 1, array['nakliye', 'teslim', 'sevkiyat', 'kargo'], 999
from unnest(array[
  'mont_kaban', 'pantolon_sort', 'tisort_polo', 'gomlek',
  'tulum_onluk', 'polar_yelek_yagmurluk', 'sapka_bere_corap'
]) as g;

-- ---------------------------------------------------------------------------
-- İhaleler
-- ---------------------------------------------------------------------------
create table public.ihaleler (
  id uuid primary key default gen_random_uuid(),
  ad text not null check (length(trim(ad)) > 0),
  musteri text not null default '',
  yetkili text not null default '',
  son_teklif_tarihi date,
  teslim_yeri text not null default '',
  termin text not null default '',
  -- Maliyetin neye göre oluşturulduğu: teknik şartname veya segment şablonu
  kaynak text not null check (kaynak in ('sartname', 'segment')),
  kaynak_dosya text not null default '',
  -- Segment yalnızca kullanıcı seçer; varsayılanı yoktur
  segment text references public.segment_sablonlari (segment),
  asama text not null default 'ihale'
    check (asama in ('ihale', 'maliyet', 'teklif', 'siparis', 'uretim', 'termin')),
  notlar text not null default '',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint segment_kaynakla_uyumlu check (
    (kaynak = 'segment' and segment is not null) or (kaynak = 'sartname' and segment is null)
  )
);
create index ihaleler_tarih on public.ihaleler (created_at desc);
create trigger ihaleler_guncellendi before update on public.ihaleler
  for each row execute function public.guncellenme_zamani();

-- ---------------------------------------------------------------------------
-- İhaledeki ürünler
-- ---------------------------------------------------------------------------
create table public.ihale_urunleri (
  id uuid primary key default gen_random_uuid(),
  ihale_id uuid not null references public.ihaleler (id) on delete cascade,
  urun_grubu text not null check (public.gecerli_urun_grubu(urun_grubu)),
  ad text not null check (length(trim(ad)) > 0),
  aciklama text not null default '',
  adet integer not null check (adet > 0),
  fire_orani numeric(5,2) check (fire_orani >= 0),
  -- Kâr marjının varsayılanı yoktur, her ihalede kullanıcı girer
  kar_marji numeric(6,2),
  kdv_orani numeric(5,2) not null default 20 check (kdv_orani >= 0),
  sira integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ihale_urunleri_ihale on public.ihale_urunleri (ihale_id, sira);
create trigger ihale_urunleri_guncellendi before update on public.ihale_urunleri
  for each row execute function public.guncellenme_zamani();

-- ---------------------------------------------------------------------------
-- Ürün maliyet kalemleri
-- ---------------------------------------------------------------------------
create table public.urun_kalemleri (
  id uuid primary key default gen_random_uuid(),
  urun_id uuid not null references public.ihale_urunleri (id) on delete cascade,
  sablon_id uuid references public.kalem_sablonlari (id) on delete set null,
  ad text not null check (length(trim(ad)) > 0),
  zorunlu boolean not null default false,
  birim text not null default 'adet',
  kullanim numeric(12,4) check (kullanim >= 0),
  birim_fiyat numeric(14,4) check (birim_fiyat >= 0),
  sira integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index urun_kalemleri_urun on public.urun_kalemleri (urun_id, sira);
create trigger urun_kalemleri_guncellendi before update on public.urun_kalemleri
  for each row execute function public.guncellenme_zamani();

-- ---------------------------------------------------------------------------
-- Müşteriye verilen teklifler
-- ---------------------------------------------------------------------------
create sequence public.teklif_no_seq;

create table public.teklifler (
  id uuid primary key default gen_random_uuid(),
  ihale_id uuid not null references public.ihaleler (id) on delete cascade,
  teklif_no text not null unique
    default ('TKL-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.teklif_no_seq')::text, 4, '0')),
  teklif_tarihi date not null default current_date,
  gecerlilik_tarihi date not null,
  -- Teklif anındaki satırlar ve tutarlar (sonradan maliyet değişse de teklif aynı kalır)
  icerik jsonb not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index teklifler_ihale on public.teklifler (ihale_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Erişim: sadece giriş yapmış firma kullanıcıları
-- ---------------------------------------------------------------------------
alter table public.firma_ayarlari enable row level security;
alter table public.segment_sablonlari enable row level security;
alter table public.kalem_sablonlari enable row level security;
alter table public.ihaleler enable row level security;
alter table public.ihale_urunleri enable row level security;
alter table public.urun_kalemleri enable row level security;
alter table public.teklifler enable row level security;

create policy "firma kullanicilari" on public.firma_ayarlari
  for all to authenticated using (true) with check (true);
create policy "firma kullanicilari" on public.segment_sablonlari
  for all to authenticated using (true) with check (true);
create policy "firma kullanicilari" on public.kalem_sablonlari
  for all to authenticated using (true) with check (true);
create policy "firma kullanicilari" on public.ihaleler
  for all to authenticated using (true) with check (true);
create policy "firma kullanicilari" on public.ihale_urunleri
  for all to authenticated using (true) with check (true);
create policy "firma kullanicilari" on public.urun_kalemleri
  for all to authenticated using (true) with check (true);
create policy "firma kullanicilari" on public.teklifler
  for all to authenticated using (true) with check (true);
