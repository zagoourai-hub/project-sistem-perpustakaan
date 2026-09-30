// FE-10.2.3: paired bars (checkouts = ink, returns = moss), no gradients, no chart library.
// ponytail: hand-rolled SVG bars for the two series we have; add a chart lib if a third chart type appears.
export function CirculationChart({ points }: { points: { label: string; checkouts: number; returns: number; muted?: boolean }[] }) {
  const max = Math.max(1, ...points.flatMap((p) => [p.checkouts, p.returns]));
  const h = 120;
  const w = 100 / points.length;
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 100 ${h + 14}`} preserveAspectRatio="none" role="img" aria-label="Grafik peminjaman dan pengembalian" className="h-40 w-full">
        {points.map((p, i) => {
          const hc = (p.checkouts / max) * h;
          const hr = (p.returns / max) * h;
          return (
            <g key={p.label + i} opacity={p.muted ? 0.35 : 1}>
              <rect x={i * w + w * 0.12} y={h - hc} width={w * 0.34} height={hc} className="fill-on-surface" />
              <rect x={i * w + w * 0.5} y={h - hr} width={w * 0.34} height={hr} className="fill-secondary" />
            </g>
          );
        })}
        <line x1="0" x2="100" y1={h} y2={h} className="stroke-outline-variant" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="data flex justify-between text-[10px] text-on-surface-variant">
        <span>{points[0]?.label}</span>
        <span>{points.at(-1)?.label}</span>
      </div>
      <figcaption className="data flex gap-4 text-[11px] text-on-surface-variant">
        <span className="flex items-center gap-1.5"><i className="size-2 bg-on-surface" aria-hidden />Dipinjam</span>
        <span className="flex items-center gap-1.5"><i className="size-2 bg-secondary" aria-hidden />Kembali</span>
      </figcaption>
    </figure>
  );
}
