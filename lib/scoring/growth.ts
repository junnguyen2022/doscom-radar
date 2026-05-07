// Growth Score — measures sustained star/fork momentum.
// Formula: ARCHITECTURE_V2_DECISIONS.md §5.2.

export type GrowthInput = {
  stars_delta_1d: number | null;
  stars_delta_7d: number | null;
  stars_delta_30d: number | null;
  forks_delta_7d: number | null;
  total_stars: number | null;
};

export function computeGrowth(m: GrowthInput): number {
  const total = Math.max(m.total_stars ?? 0, 1);
  const d1 = m.stars_delta_1d ?? 0;
  const d7 = m.stars_delta_7d ?? 0;
  const d30 = m.stars_delta_30d ?? 0;
  const f7 = m.forks_delta_7d ?? 0;

  const dailyVel = (d1 / total) * 100;
  const weekVel = (d7 / total) * 100;
  const monthVel = (d30 / total) * 100;
  const forkRatio = f7 / Math.max(d7, 1);

  const score =
    Math.min(dailyVel * 5, 30) +
    Math.min(weekVel * 2, 40) +
    Math.min(monthVel * 1, 20) +
    Math.min(forkRatio * 50, 10);

  return Math.round(Math.max(0, Math.min(100, score)));
}
