// Pure SVG bar chart of snapshot counts over time. No chart lib.

export function SnapshotHistoryChart({
  data,
  height = 100,
}: {
  data: { date: string; count: number }[];
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-zinc-400 dark:text-zinc-600"
        style={{ height }}
      >
        Chưa có snapshot nào
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barWidth = 100 / data.length;
  const padding = 0.18; // gap between bars (% of bar slot)

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const h = (d.count / maxCount) * (height - 4);
        const x = i * barWidth + (barWidth * padding) / 2;
        const w = barWidth * (1 - padding);
        const y = height - h;
        const isLast = i === data.length - 1;
        return (
          <g key={d.date}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={isLast ? "#f97316" : "url(#barGrad)"}
              rx="1"
            />
            <title>
              {d.date}: {d.count}
            </title>
          </g>
        );
      })}
    </svg>
  );
}
