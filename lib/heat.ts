// Heat score: composite of velocity (stars/day) × scale (log of total).
// Result is a 0..100 score for ranking trending repos by "actual heat".

export function computeHeat(input: {
  starsGained: number | null;
  totalStars: number | null;
  rank?: number;
}): number {
  const gained = Math.max(input.starsGained ?? 0, 0);
  const total = Math.max(input.totalStars ?? 0, 1);

  // Velocity ratio (capped to avoid divide-by-tiny giving runaway scores)
  const velocity = Math.min(gained / total, 1);

  // Scale factor — log10 of total stars, normalized to ~0..1 across 0..1M stars
  const scale = Math.min(Math.log10(total + 1) / 6, 1);

  // Rank bonus — top of list gets a small lift
  const rankBonus = input.rank ? Math.max(0, (26 - input.rank) / 25) * 0.15 : 0;

  // Weighted composite, mostly velocity but with scale guard against tiny repos.
  const raw = velocity * 0.65 + scale * 0.35 + rankBonus;
  return Math.round(Math.min(raw, 1) * 100);
}
