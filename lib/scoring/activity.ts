// Activity Score — measures recent technical activity.
// Formula: ARCHITECTURE_V2_DECISIONS.md §5.3.

export type ActivityInput = {
  commits_30d: number | null;
  prs_merged_30d: number | null;
  prs_open_30d: number | null;
  issues_closed_30d: number | null;
  pushed_within_days: number | null;
  latest_release_at: string | null;
};

export function computeActivity(m: ActivityInput): number {
  const c30 = m.commits_30d ?? 0;
  const merged30 = m.prs_merged_30d ?? 0;
  const closed30 = m.issues_closed_30d ?? 0;
  const pushDays = m.pushed_within_days ?? 999;
  const releaseAge = m.latest_release_at
    ? (Date.now() - new Date(m.latest_release_at).getTime()) / 86400000
    : 999;

  const commitScore = Math.min(c30 * 0.5, 30);
  const prScore = Math.min(merged30 * 4, 25);
  const issueScore = Math.min(closed30 * 2, 15);
  const recencyScore =
    pushDays <= 7 ? 20 : pushDays <= 30 ? 10 : 0;
  const releaseScore =
    releaseAge <= 90 ? 10 : releaseAge <= 180 ? 5 : 0;

  return Math.round(
    Math.max(
      0,
      Math.min(100, commitScore + prScore + issueScore + recencyScore + releaseScore),
    ),
  );
}
