-- Örme kumaş kalemleri kg ile hesaplanır (Erbil, 2026-10-12).
-- Kütüphanede hâlâ metre olan örme kalemlerin birimi ve 1 adet için varsayılan kullanımı düzeltilir.
-- Sadece birimi hâlâ 'm' olan satırlar değişir; kullanıcının elle düzelttiği kalemlere dokunulmaz.
update public.kalem_sablonlari k
set birim = 'kg', varsayilan_kullanim = d.kullanim
from (values
  ('tisort_polo', 'Ana kumaş', 0.25),
  ('tisort_polo', 'Ribana (yaka/kol)', 0.03),
  ('tisort_polo', 'Pat kumaşı (polo)', 0.01),
  ('tisort_polo', 'Mesh / File panel', 0.03),
  ('mont_kaban', 'Polar (yaka/astar)', 0.5),
  ('mont_kaban', 'Ribana (kol/bel)', 0.06)
) as d (urun_grubu, ad, kullanim)
where k.urun_grubu = d.urun_grubu and k.ad = d.ad and k.birim = 'm';
