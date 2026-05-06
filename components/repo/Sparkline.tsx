// Pure-SVG sparkline for rank-over-time. No external chart lib.
// Lower rank = higher position (rank 1 = top). We invert so visually higher = better rank.

export function Sparkline({
  ranks,
  width = 80,
  height = 22,
}: {
  ranks: number[];
  width?: number;
  height?: number;
}) {
  if (ranks.length === 0) return null;

  // Domain: ranks come in chronological order. Max rank = bottom.
  const maxRank = Math.max(...ranks, 25);
  const minRank = 1;
  const stepX = ranks.length > 1 ? width / (ranks.length - 1) : 0;

  const yFor = (rank: number) => {
    // Invert: rank=1 should be at TOP (y=2), rank=maxRank at bottom (y=height-2).
    const t = (rank - minRank) / Math.max(1, maxRank - minRank);
    return 2 + t * (height - 4);
  };

  const points = ranks
    .map((r, i) => `${(i * stepX).toFixed(1)},${yFor(r).toFixed(1)}`)
    .join(" ");

  const last = ranks[ranks.length - 1];
  const first = ranks[0];
  const trendUp = last < first; // lower rank = better
  const stroke = trendUp
    ? "rgb(16 185 129)" // emerald
    : last > first
      ? "rgb(239 68 68)" // red
      : "rgb(100 116 139)"; // slate

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block"
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {ranks.length > 0 && (
        <circle
          cx={(ranks.length - 1) * stepX}
          cy={yFor(last)}
          r="1.8"
          fill={stroke}
        />
      )}
    </svg>
  );
}
