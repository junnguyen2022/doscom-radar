// Community Score — measures community health.
// Formula: ARCHITECTURE_V2_DECISIONS.md §5.4.

export type CommunityInput = {
  contributors_count: number | null;
  total_stars: number | null;
  prs_open_30d: number | null;
  issues_opened_30d: number | null;
  issues_closed_30d: number | null;
};

export function computeCommunity(m: CommunityInput): number {
  const contributors = m.contributors_count ?? 0;
  const stars = Math.max(m.total_stars ?? 0, 1);
  const prsOpen = m.prs_open_30d ?? 0;
  const opened = m.issues_opened_30d ?? 0;
  const closed = m.issues_closed_30d ?? 0;

  // Contributor diversity (log-scale, 1..1000+)
  const contribScore = Math.min((Math.log10(contributors + 1) / 3) * 40, 40);

  // Star-to-contributor ratio — lower = healthier community
  const ratio = stars / Math.max(contributors, 1);
  const healthScore = ratio < 100 ? 25 : ratio < 1000 ? 15 : 5;

  // Issue close ratio (responsiveness)
  const closeRatio = closed / Math.max(opened, 1);
  const responseScore = Math.min(closeRatio * 25, 25);

  // External engagement proxy
  const engagementScore = Math.min(prsOpen, 10);

  return Math.round(
    Math.max(
      0,
      Math.min(100, contribScore + healthScore + responseScore + engagementScore),
    ),
  );
}
