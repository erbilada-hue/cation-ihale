-- Teklif fiyatını yuvarlama: kullanıcı hesaplanan fiyatı (ör. 666,60 ₺) 665 ya da 670 ₺ yapabilir.
-- Fiyat, girildiği para biriminde saklanır (TL, dolar ya da euro teklif).
alter table public.ihale_urunleri
  add column if not exists yuvarlanmis_fiyat numeric(14, 2),
  add column if not exists yuvarlanmis_para_birimi text;

alter table public.ihale_urunleri drop constraint if exists yuvarlanmis_fiyat_pozitif;
alter table public.ihale_urunleri
  add constraint yuvarlanmis_fiyat_pozitif check (yuvarlanmis_fiyat is null or yuvarlanmis_fiyat > 0);

alter table public.ihale_urunleri drop constraint if exists yuvarlanmis_para_birimi_gecerli;
alter table public.ihale_urunleri
  add constraint yuvarlanmis_para_birimi_gecerli
  check (yuvarlanmis_para_birimi is null or yuvarlanmis_para_birimi in ('TRY', 'USD', 'EUR'));
