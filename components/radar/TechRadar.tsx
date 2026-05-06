"use client";

import { useState } from "react";
import {
  QUADRANT_LABEL,
  RING_COLOR,
  RING_LABEL,
  radarCoord,
  type RadarPoint,
  type Ring,
} from "@/lib/radar";
import { useApp } from "@/components/providers/AppProvider";

const SIZE = 700;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 24;

const RING_R: Record<Ring, number> = {
  adopt: 0.3 * RADIUS,
  trial: 0.55 * RADIUS,
  assess: 0.78 * RADIUS,
  hold: 0.97 * RADIUS,
};

const RINGS_ORDER: Ring[] = ["hold", "assess", "trial", "adopt"];

export function TechRadar({ points }: { points: RadarPoint[] }) {
  const { lang } = useApp();
  const [hover, setHover] = useState<RadarPoint | null>(null);

  return (
    <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start">
      <div className="relative">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="max-w-full"
        >
          {/* Rings */}
          {RINGS_ORDER.map((ring) => (
            <circle
              key={ring}
              cx={CENTER}
              cy={CENTER}
              r={RING_R[ring]}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth={1}
              className="text-gray-500"
            />
          ))}

          {/* Quadrant dividers */}
          <line
            x1={CENTER - RADIUS}
            y1={CENTER}
            x2={CENTER + RADIUS}
            y2={CENTER}
            stroke="currentColor"
            strokeOpacity={0.2}
            className="text-gray-500"
          />
          <line
            x1={CENTER}
            y1={CENTER - RADIUS}
            x2={CENTER}
            y2={CENTER + RADIUS}
            stroke="currentColor"
            strokeOpacity={0.2}
            className="text-gray-500"
          />

          {/* Quadrant labels */}
          <text
            x={CENTER + RADIUS - 8}
            y={CENTER - RADIUS + 4}
            textAnchor="end"
            className="fill-current text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
          >
            {QUADRANT_LABEL.languages[lang]}
          </text>
          <text
            x={CENTER - RADIUS + 8}
            y={CENTER - RADIUS + 4}
            textAnchor="start"
            className="fill-current text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
          >
            {QUADRANT_LABEL.tools[lang]}
          </text>
          <text
            x={CENTER - RADIUS + 8}
            y={CENTER + RADIUS - 4}
            textAnchor="start"
            className="fill-current text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
          >
            {QUADRANT_LABEL.platforms[lang]}
          </text>
          <text
            x={CENTER + RADIUS - 8}
            y={CENTER + RADIUS - 4}
            textAnchor="end"
            className="fill-current text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
          >
            {QUADRANT_LABEL.techniques[lang]}
          </text>

          {/* Ring labels (on horizontal axis) */}
          {(["adopt", "trial", "assess", "hold"] as Ring[]).map((ring) => (
            <text
              key={ring}
              x={CENTER + RING_R[ring] - 4}
              y={CENTER - 4}
              textAnchor="end"
              className="fill-current text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500"
            >
              {RING_LABEL[ring][lang]}
            </text>
          ))}

          {/* Points */}
          {points.map((p, i) => {
            const c = radarCoord(p);
            const cx = CENTER + c.x * RADIUS;
            const cy = CENTER + c.y * RADIUS;
            const isHovered =
              hover?.owner === p.owner && hover?.repo === p.repo;
            return (
              <g
                key={`${p.owner}/${p.repo}-${i}`}
                onMouseEnter={() => setHover(p)}
                onMouseLeave={() => setHover(null)}
                onClick={() => {
                  window.open(p.url, "_blank", "noopener");
                }}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 7 : 4.5}
                  fill={RING_COLOR[p.ring]}
                  stroke="white"
                  strokeWidth={1.5}
                  opacity={isHovered ? 1 : 0.85}
                />
                {isHovered && (
                  <text
                    x={cx + 8}
                    y={cy - 8}
                    className="fill-current text-[11px] font-medium text-gray-900 dark:text-gray-100"
                    style={{ paintOrder: "stroke", stroke: "white", strokeWidth: 3 }}
                  >
                    {p.owner}/{p.repo}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover panel + legend */}
      <aside className="w-full max-w-sm shrink-0 space-y-3">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Legend — Rings
          </h3>
          <ul className="space-y-1 text-sm">
            {(["adopt", "trial", "assess", "hold"] as Ring[]).map((ring) => (
              <li key={ring} className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: RING_COLOR[ring] }}
                />
                <span className="font-medium">{RING_LABEL[ring][lang]}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {ring === "adopt"
                    ? "(heat≥75 + ≥10k★)"
                    : ring === "trial"
                      ? "(heat≥55)"
                      : ring === "assess"
                        ? "(heat≥30)"
                        : "(heat<30)"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {hover ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {QUADRANT_LABEL[hover.quadrant][lang]} ·{" "}
              {RING_LABEL[hover.ring][lang]}
            </div>
            <a
              href={hover.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block font-semibold text-blue-700 hover:underline dark:text-blue-400"
            >
              {hover.owner}/{hover.repo}
            </a>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
              <span>🔥 {hover.heat}</span>
              {hover.language && <span>{hover.language}</span>}
              {hover.totalStars != null && (
                <span>{hover.totalStars.toLocaleString()} ★</span>
              )}
              {hover.starsGained != null && (
                <span>+{hover.starsGained.toLocaleString()} today</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Hover/tap a dot to see repo details. Click to open on GitHub.
          </p>
        )}
      </aside>
    </div>
  );
}
