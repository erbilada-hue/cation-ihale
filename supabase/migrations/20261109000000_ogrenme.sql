-- Yapay zekânın öğrenmesi (Erbil, 2026-11-09).
-- Analiz ve kâr marjı önerisi, teklif verilmiş veya kazanılmış ihalelerden örnek alır.
-- Hatalı ya da istisnai bir ihale bu işaretle öğrenmenin dışında bırakılır.
alter table public.ihaleler
  add column if not exists ogrenmeye_dahil boolean not null default true;
