-- Faz 4 (ihracat) ilk adım: dövizli teklif, ihracatta KDV'siz satış, teslim şekli (Incoterms), İngilizce teklif

alter table public.ihaleler
  -- Müşteriye verilecek teklifin para birimi; maliyet her zaman TL hesaplanır, ihalenin kuruyla çevrilir
  add column teklif_para_birimi text not null default 'TRY' check (teklif_para_birimi in ('TRY', 'USD', 'EUR')),
  -- İhracat işinde KDV uygulanmaz (ürünlerin KDV oranı 0 yapılır)
  add column ihracat boolean not null default false,
  -- Incoterms 2020 teslim şekli; yer bilgisi teslim_yeri alanındadır (ör. FOB Mersin)
  add column teslim_sekli text check (teslim_sekli in ('EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP')),
  add column teklif_dili text not null default 'tr' check (teklif_dili in ('tr', 'en'));

-- Dövizli teklifte müşteriye verilecek banka hesapları
alter table public.firma_ayarlari
  add column iban_usd text not null default '',
  add column iban_eur text not null default '',
  add column swift text not null default '';

-- İhracat masrafları: her ürün grubunda opsiyonel kalem
insert into public.kalem_sablonlari (urun_grubu, ad, zorunlu, birim, varsayilan_kullanim, anahtar_kelimeler, sira)
select g, k.ad, false, 'adet', 1, k.kelimeler, k.sira
from unnest(array[
  'mont_kaban', 'pantolon_sort', 'tisort_polo', 'gomlek',
  'tulum_onluk', 'polar_yelek_yagmurluk', 'sapka_bere_corap', 'hazir_urun'
]) as g
cross join (values
  ('Navlun payı', array['navlun', 'freight', 'cfr', 'cif', 'cpt', 'cip', 'konteyner'], 1000),
  ('Sigorta payı', array['sigorta', 'insurance', 'cif', 'cip'], 1001),
  ('İhracat gümrük ve liman masrafı', array['gümrük', 'liman', 'customs', 'fob', 'fca', 'ihracat'], 1002)
) as k(ad, kelimeler, sira)
where not exists (
  select 1 from public.kalem_sablonlari s where s.urun_grubu = g and s.ad = k.ad
);
