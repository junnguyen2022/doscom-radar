// Pure SVG line chart for stars (total or gained) over time. No chart lib.

type Point = { date: string; value: number };

export function StarsHistoryChart({
  data,
  height = 220,
  color = "#7c3aed",
  yLabel = "stars",
}: {
  data: Point[];
  height?: number;
  color?: string;
  yLabel?: string;
}) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-zinc-400 dark:text-zinc-600"
        style={{ height }}
      >
        Chưa có data
      </div>
    );
  }

  const VIEW_W = 600;
  const VIEW_H = height;
  const PAD_L = 50;
  const PAD_R = 8;
  const PAD_T = 8;
  const PAD_B = 28;

  const innerW = VIEW_W - PAD_L - PAD_R;
  const innerH = VIEW_H - PAD_T - PAD_B;

  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;

  const xFor = (i: number) =>
    data.length > 1
      ? PAD_L + (i / (data.length - 1)) * innerW
      : PAD_L + innerW / 2;
  const yFor = (v: number) =>
    PAD_T + innerH - ((v - min) / range) * innerH;

  const path = data
    .map((d, i) => {
      const x = xFor(i);
      const y = yFor(d.value);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const areaPath =
    path +
    ` L${xFor(data.length - 1).toFixed(1)},${(PAD_T + innerH).toFixed(1)}` +
    ` L${xFor(0).toFixed(1)},${(PAD_T + innerH).toFixed(1)} Z`;

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = min + (range * i) / yTicks;
    return { v, y: yFor(v) };
  });

  // X labels — pick first, middle, last for short series; every Nth for longer
  const xLabelIndices =
    data.length <= 4
      ? data.map((_, i) => i)
      : data.length <= 10
        ? [0, Math.floor(data.length / 2), data.length - 1]
        : Array.from({ length: 5 }, (_, i) =>
            Math.round((i * (data.length - 1)) / 4),
          );

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
        : Math.round(n).toString();

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${yLabel} history chart`}
    >
      <defs>
        <linearGradient id={`area-${yLabel}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y grid + labels */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={PAD_L}
            x2={VIEW_W - PAD_R}
            y1={t.y}
            y2={t.y}
            stroke="currentColor"
            strokeOpacity={0.08}
          />
          <text
            x={PAD_L - 6}
            y={t.y}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-current text-[10px] text-zinc-400 dark:text-zinc-500"
          >
            {fmt(t.v)}
          </text>
        </g>
      ))}

      {/* Area */}
      <path d={areaPath} fill={`url(#area-${yLabel})`} />

      {/* Line */}
      <path
        d={path}
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Points */}
      {data.map((d, i) => (
        <circle
          key={i}
          cx={xFor(i)}
          cy={yFor(d.value)}
          r={data.length <= 20 ? 3 : 2}
          fill={color}
          stroke="white"
          strokeWidth="1"
        >
          <title>
            {d.date}: {d.value.toLocaleString()}
          </title>
        </circle>
      ))}

      {/* X labels */}
      {xLabelIndices.map((i) => (
        <text
          key={i}
          x={xFor(i)}
          y={VIEW_H - 8}
          textAnchor={
            i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"
          }
          className="fill-current text-[10px] text-zinc-400 dark:text-zinc-500"
        >
          {data[i].date.slice(5)}
        </text>
      ))}
    </svg>
  );
}

// Inverted line chart for rank (lower = better, draw from top).
export function RankHistoryChart({
  data,
  height = 220,
}: {
  data: Point[];
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-zinc-400 dark:text-zinc-600"
        style={{ height }}
      >
        Chưa có data
      </div>
    );
  }

  // Rank: lower = better (visually higher). Invert by replacing value with (max - value + min)
  const max = Math.max(...data.map((d) => d.value), 25);
  const min = 1;
  const inverted = data.map((d) => ({ date: d.date, value: max + min - d.value }));

  return (
    <StarsHistoryChart
      data={inverted}
      height={height}
      color="#10b981"
      yLabel="rank"
    />
  );
}
