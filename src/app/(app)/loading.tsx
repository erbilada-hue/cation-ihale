// Sayfa verisi gelirken anında gösterilir; tıklamanın algılandığını belli eder
export default function Yukleniyor() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse" aria-busy="true" aria-label="Yükleniyor">
      <div className="mb-2 h-7 w-56 rounded bg-slate-200" />
      <div className="mb-6 h-4 w-80 rounded bg-slate-200/70" />
      <div className="kart space-y-3 p-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-5 rounded bg-slate-100" style={{ width: `${90 - i * 7}%` }} />
        ))}
      </div>
    </div>
  );
}
