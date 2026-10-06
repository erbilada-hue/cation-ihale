/** "3 gün kaldı", "bugün", "2 gün geçti": geçenler kırmızı, yakın olanlar turuncu */
export function GunRozeti({ gun }: { gun: number }) {
  const [renk, metin] =
    gun < 0
      ? ["bg-red-100 text-red-800", `${-gun} gün geçti`]
      : gun === 0
        ? ["bg-orange-100 text-orange-800", "bugün"]
        : gun <= 3
          ? ["bg-orange-50 text-orange-700", `${gun} gün kaldı`]
          : ["bg-zemin text-slate-600", `${gun} gün kaldı`];
  return <span className={`rozet whitespace-nowrap ${renk}`}>{metin}</span>;
}
