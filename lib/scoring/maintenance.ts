// Maintenance Score — measures whether maintainers are still active.
// Formula: ARCHITECTURE_V2_DECISIONS.md §5.5.

export type MaintenanceInput = {
  pushed_at: string | null;
  latest_release_at: string | null;
  issues_closed_30d: number | null;
  issues_opened_30d: number | null;
  archived: boolean;
  disabled: boolean;
};

export function computeMaintenance(m: MaintenanceInput): number {
  if (m.archived || m.disabled) return 0;

  const now = Date.now();
  const pushDays = m.pushed_at
    ? (now - new Date(m.pushed_at).getTime()) / 86400000
    : 999;
  const releaseDays = m.latest_release_at
    ? (now - new Date(m.latest_release_at).getTime()) / 86400000
    : 999;

  const pushScore =
    pushDays <= 7
      ? 50
      : pushDays <= 30
        ? 35
        : pushDays <= 90
          ? 20
          : pushDays <= 180
            ? 10
            : 0;
  const releaseScore =
    releaseDays <= 30 ? 30 : releaseDays <= 90 ? 20 : releaseDays <= 180 ? 10 : 0;
  const closed = m.issues_closed_30d ?? 0;
  const opened = m.issues_opened_30d ?? 0;
  const responsiveness = closed / Math.max(opened, 1);
  const responseScore = Math.min(responsiveness * 20, 20);

  return Math.round(
    Math.max(0, Math.min(100, pushScore + releaseScore + responseScore)),
  );
}
