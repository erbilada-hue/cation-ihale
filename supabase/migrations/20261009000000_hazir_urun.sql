-- Hazır ürün (al-sat): tedarikçiden hazır alınıp üzerine kâr konarak satılan ürünler
-- (kemer, havlu, eldiven, fular, kravat, kazak…). Bu ürünlerde dikim kalemleri yoktur;
-- ana kalem ürünün alış fiyatıdır ve ürün eklenirken otomatik açılır.

create or replace function public.gecerli_urun_grubu(kod text)
returns boolean language sql immutable as $$
  select kod in (
    'mont_kaban', 'pantolon_sort', 'tisort_polo', 'gomlek',
    'tulum_onluk', 'polar_yelek_yagmurluk', 'sapka_bere_corap',
    'hazir_urun'
  );
$$;

-- Opsiyonel kalemler (Kalem Kütüphanesi'nden değiştirilebilir)
insert into public.kalem_sablonlari (urun_grubu, ad, zorunlu, birim, varsayilan_kullanim, anahtar_kelimeler, sira)
select 'hazir_urun', k.ad, false, 'adet', 1, k.kelimeler, k.sira
from (values
  ('Logo baskı / nakış', array['logo', 'baskı', 'nakış', 'işleme', 'amblem'], 1),
  ('Firma etiketi', array['etiket', 'marka etiketi'], 2),
  ('Ambalaj / paket', array['ambalaj', 'paket', 'kutu', 'poşet'], 3),
  ('Nakliye payı', array['nakliye', 'teslim', 'sevkiyat', 'kargo'], 999)
) as k(ad, kelimeler, sira)
where not exists (
  select 1 from public.kalem_sablonlari s where s.urun_grubu = 'hazir_urun' and s.ad = k.ad
);
