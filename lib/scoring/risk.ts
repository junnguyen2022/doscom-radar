// Risk Score — penalty for adoption risks (license, stale, archived, viral spike, etc.)
// Formula: ARCHITECTURE_V2_DECISIONS.md §5.6.

import { RISK_PENALTIES } from "../config/scoring-weights";

export type RiskInput = {
  archived: boolean;
  disabled: boolean;
  fork: boolean;
  license_key: string | null;
  pushed_at: string | null;
  latest_release_at: string | null;
  contributors_count: number | null;
  stars_delta_1d: number | null;
  total_stars: number | null;
  commits_30d: number | null;
  issues_opened_30d: number | null;
  issues_closed_30d: number | null;
};

export type RiskResult = {
  penalty: number;
  flags: string[];
};

export function computeRiskPenalty(r: RiskInput): RiskResult {
  const flags: string[] = [];
  let penalty = 0;

  if (r.archived) {
    flags.push("archived");
    penalty += RISK_PENALTIES.archived;
  }
  if (r.disabled) {
    flags.push("disabled");
    penalty += RISK_PENALTIES.disabled;
  }
  if (!r.license_key) {
    flags.push("no_license");
    penalty += RISK_PENALTIES.no_license;
  }
  if (r.fork) {
    flags.push("forked_repo");
    penalty += RISK_PENALTIES.forked_repo;
  }

  const now = Date.now();
  if (r.pushed_at) {
    const pushDays = (now - new Date(r.pushed_at).getTime()) / 86400000;
    if (pushDays > 180) {
      flags.push("stale_repo");
      penalty += RISK_PENALTIES.stale_repo;
    }
  }
  if (r.latest_release_at) {
    const days = (now - new Date(r.latest_release_at).getTime()) / 86400000;
    if (days > 365) {
      flags.push("no_recent_release");
      penalty += RISK_PENALTIES.no_recent_release;
    }
  }
  if ((r.contributors_count ?? 0) <= 1) {
    flags.push("single_maintainer_risk");
    penalty += RISK_PENALTIES.single_maintainer_risk;
  }

  // Star spike without activity
  const d1 = r.stars_delta_1d ?? 0;
  const total = Math.max(r.total_stars ?? 0, 1);
  if (d1 / total > 0.3 && (r.commits_30d ?? 0) < 5) {
    flags.push("star_spike_without_activity");
    penalty += RISK_PENALTIES.star_spike_without_activity;
  }

  // Issue backlog
  const opened = r.issues_opened_30d ?? 0;
  const closed = r.issues_closed_30d ?? 0;
  if (opened > 50 && closed / opened < 0.2) {
    flags.push("issue_backlog");
    penalty += RISK_PENALTIES.issue_backlog;
  }

  return {
    penalty: Math.min(100, penalty),
    flags,
  };
}
