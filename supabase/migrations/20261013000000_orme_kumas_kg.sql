-- Örme kumaş kalemleri kg ile hesaplanır, polo yaka ayrılır, dikiş ipliği çıkarılır (Erbil, 2026-10-12).
-- Kütüphanede hâlâ metre olan örme kalemlerin birimi ve 1 adet için varsayılan kullanımı düzeltilir.
-- Sadece birimi hâlâ 'm' olan satırlar değişir; kullanıcının elle düzelttiği kalemlere dokunulmaz.
update public.kalem_sablonlari k
set birim = 'kg', varsayilan_kullanim = d.kullanim
from (values
  ('tisort_polo', 'Ana kumaş', 0.25),
  ('tisort_polo', 'Pat kumaşı (polo)', 0.01),
  ('tisort_polo', 'Mesh / File panel', 0.03),
  ('mont_kaban', 'Polar (yaka/astar)', 0.5),
  ('mont_kaban', 'Ribana (kol/bel)', 0.06)
) as d (urun_grubu, ad, kullanim)
where k.urun_grubu = d.urun_grubu and k.ad = d.ad and k.birim = 'm';

-- Polo yaka ile 0 (bisiklet) yaka ribanası farklı malzemedir (Erbil, 2026-10-12).
-- Tişört-Polo'daki ortak "Ribana (yaka/kol)" kalemi "Yaka ribanası (0 yaka)" olur; "Polo yaka" ve
-- "Kol bandı (ribana)" ayrı kalem olarak eklenir. Ürünün yaka tipine göre biri seçildiği için yaka
-- kalemleri opsiyoneldir. Tekrar çalıştırılırsa bir şey değişmez.
update public.kalem_sablonlari
set ad = 'Yaka ribanası (0 yaka)', zorunlu = false, birim = 'kg', varsayilan_kullanim = 0.01,
    anahtar_kelimeler = array['bisiklet yaka', '0 yaka', 'sıfır yaka', 'yuvarlak yaka', 'ribana yaka', 'yaka ribanası']
where urun_grubu = 'tisort_polo' and ad = 'Ribana (yaka/kol)';

insert into public.kalem_sablonlari (urun_grubu, ad, zorunlu, birim, varsayilan_kullanim, anahtar_kelimeler, sira)
select 'tisort_polo', k.ad, false, 'kg', k.kullanim, k.kelimeler,
  coalesce((select sira from public.kalem_sablonlari where urun_grubu = 'tisort_polo' and ad = 'Yaka ribanası (0 yaka)'), 0)
from (values
  ('Polo yaka', 0.02, array['polo yaka', 'lakost yaka', 'triko yaka', 'örme yaka', 'polo']),
  ('Kol bandı (ribana)', 0.03, array['kol bandı', 'kol ribanası', 'kol ağzı', 'kol manşeti'])
) as k (ad, kullanim, kelimeler)
where not exists (
  select 1 from public.kalem_sablonlari s where s.urun_grubu = 'tisort_polo' and s.ad = k.ad
);

-- 0 yaka ribanası polo yakadan az gider (Erbil, 2026-10-12): önceki halini çalıştıranlar için 0,02 → 0,01.
update public.kalem_sablonlari set varsayilan_kullanim = 0.01
where urun_grubu = 'tisort_polo' and ad = 'Yaka ribanası (0 yaka)' and varsayilan_kullanim = 0.02;

-- Dikiş ipliği fason atölyesine aittir, maliyete ayrı kalem olarak girmez (Erbil, 2026-10-12).
-- Sadece kütüphaneden çıkar; eski ihalelerdeki kalemler yerinde kalır.
delete from public.kalem_sablonlari where lower(ad) like 'dikiş ipliği%';
