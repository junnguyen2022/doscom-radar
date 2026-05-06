// Centralized scoring weights — single source of truth.
// Reference: ARCHITECTURE_V2_DECISIONS.md §5 (formulas) and §13 (V2 §7.1 weights).
//
// Tune these after backtesting (see DECISIONS §15).

export const RADAR_WEIGHTS = {
  growth: 0.25,
  activity: 0.2,
  community: 0.2,
  maintenance: 0.15,
  relevance: 0.2,
  // riskPenalty subtracted directly, not weighted
} as const;

// Validate sum == 1.0
const SUM = Object.values(RADAR_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(SUM - 1.0) > 0.001) {
  throw new Error(
    `RADAR_WEIGHTS must sum to 1.0 (got ${SUM}). Check lib/config/scoring-weights.ts`,
  );
}

// Recommendation rule thresholds — see ARCHITECTURE_V2_DECISIONS.md §5.7
export const RECOMMENDATION_RULES = {
  adopt: {
    minRadarScore: 80,
    maxRiskScore: 25,
    minMaintenanceScore: 60,
    minRelevanceScore: 70,
  },
  test: {
    minRadarScore: 65,
    maxRiskScore: 40,
    minRelevanceScore: 60,
  },
  follow: {
    minRadarScore: 50,
  },
  caution: {
    minGrowthScore: 70,
    minRiskScore: 50,
  },
  // Else: ignore
} as const;

// Risk flag penalty values
export const RISK_PENALTIES = {
  archived: 80,
  disabled: 80,
  no_license: 30,
  forked_repo: 20,
  stale_repo: 25, // pushed_at > 180 days
  no_recent_release: 10, // latest_release > 365 days
  single_maintainer_risk: 15, // contributors <= 1
  star_spike_without_activity: 25, // d1/total > 0.3 + commits_30d < 5
  issue_backlog: 15, // opened > 50 + close ratio < 0.2
} as const;

// Hard blocks — these flags prevent recommendation from going to 'adopt'
export const ADOPT_BLOCKERS = [
  "archived",
  "disabled",
  "no_license",
] as const;

// Confidence thresholds — high = clean signal, medium = some risk, low = thin data
export const CONFIDENCE_RULES = {
  // Need this many distinct evidence points for AI insight 'high' confidence
  minEvidenceForHigh: 3,
  // Skip insight generation if metrics are too sparse
  minMetricsForInsight: 5,
} as const;
