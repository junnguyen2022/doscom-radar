// Composite scoring — combines all 7 scores into Radar Score + recommendation.
// Reference: ARCHITECTURE_V2_DECISIONS.md §5.7.

import { RADAR_WEIGHTS, RECOMMENDATION_RULES, ADOPT_BLOCKERS } from "../config/scoring-weights";
import { computeHeat } from "../heat";
import { computeGrowth, type GrowthInput } from "./growth";
import { computeActivity, type ActivityInput } from "./activity";
import { computeCommunity, type CommunityInput } from "./community";
import { computeMaintenance, type MaintenanceInput } from "./maintenance";
import { computeRelevance, type RelevanceInput } from "./relevance";
import { computeRiskPenalty, type RiskInput } from "./risk";

export type ScoringInput = {
  // For heat (legacy, from snapshot)
  rank?: number;
  stars_gained_today?: number | null;

  // Common
  total_stars: number | null;

  // Repository metadata
  archived: boolean;
  disabled: boolean;
  fork: boolean;
  language: string | null;
  description: string | null;
  topics: string[];
  license_key: string | null;
  pushed_at: string | null;
  collectionSlugs: string[];

  // Metrics (from repo_metrics_daily)
  contributors_count: number | null;
  commits_30d: number | null;
  prs_open_30d: number | null;
  prs_merged_30d: number | null;
  issues_opened_30d: number | null;
  issues_closed_30d: number | null;
  stars_delta_1d: number | null;
  stars_delta_7d: number | null;
  stars_delta_30d: number | null;
  forks_delta_7d: number | null;
  pushed_within_days: number | null;
  latest_release_at: string | null;
};

export type ScoringResult = {
  heat_score: number;
  growth_score: number;
  activity_score: number;
  community_score: number;
  maintenance_score: number;
  relevance_score: number;
  relevance_tier: "high" | "medium" | "low" | "none";
  risk_penalty: number;
  risk_flags: string[];
  radar_score: number;
  recommendation: "adopt" | "test" | "follow" | "caution" | "ignore";
  confidence: "high" | "medium" | "low";
  score_reason: string;
};

export function computeAllScores(input: ScoringInput): ScoringResult {
  const heat = computeHeat({
    starsGained: input.stars_gained_today ?? null,
    totalStars: input.total_stars,
    rank: input.rank,
  });

  const growth = computeGrowth({
    stars_delta_1d: input.stars_delta_1d,
    stars_delta_7d: input.stars_delta_7d,
    stars_delta_30d: input.stars_delta_30d,
    forks_delta_7d: input.forks_delta_7d,
    total_stars: input.total_stars,
  });

  const activity = computeActivity({
    commits_30d: input.commits_30d,
    prs_merged_30d: input.prs_merged_30d,
    prs_open_30d: input.prs_open_30d,
    issues_closed_30d: input.issues_closed_30d,
    pushed_within_days: input.pushed_within_days,
    latest_release_at: input.latest_release_at,
  });

  const community = computeCommunity({
    contributors_count: input.contributors_count,
    total_stars: input.total_stars,
    prs_open_30d: input.prs_open_30d,
    issues_opened_30d: input.issues_opened_30d,
    issues_closed_30d: input.issues_closed_30d,
  });

  const maintenance = computeMaintenance({
    pushed_at: input.pushed_at,
    latest_release_at: input.latest_release_at,
    issues_closed_30d: input.issues_closed_30d,
    issues_opened_30d: input.issues_opened_30d,
    archived: input.archived,
    disabled: input.disabled,
  });

  const relevance = computeRelevance({
    topics: input.topics,
    language: input.language,
    description: input.description,
    collectionSlugs: input.collectionSlugs,
  });

  const risk = computeRiskPenalty({
    archived: input.archived,
    disabled: input.disabled,
    fork: input.fork,
    license_key: input.license_key,
    pushed_at: input.pushed_at,
    latest_release_at: input.latest_release_at,
    contributors_count: input.contributors_count,
    stars_delta_1d: input.stars_delta_1d,
    total_stars: input.total_stars,
    commits_30d: input.commits_30d,
    issues_opened_30d: input.issues_opened_30d,
    issues_closed_30d: input.issues_closed_30d,
  });

  // Composite
  const weighted =
    growth * RADAR_WEIGHTS.growth +
    activity * RADAR_WEIGHTS.activity +
    community * RADAR_WEIGHTS.community +
    maintenance * RADAR_WEIGHTS.maintenance +
    relevance.score * RADAR_WEIGHTS.relevance;
  const radar = Math.round(Math.max(0, Math.min(100, weighted - risk.penalty)));

  // Recommendation
  const { recommendation, confidence, reason } = decideRecommendation({
    radar,
    risk: risk.penalty,
    maintenance,
    relevance: relevance.score,
    growth,
    flags: risk.flags,
  });

  return {
    heat_score: heat,
    growth_score: growth,
    activity_score: activity,
    community_score: community,
    maintenance_score: maintenance,
    relevance_score: relevance.score,
    relevance_tier: relevance.tier,
    risk_penalty: risk.penalty,
    risk_flags: risk.flags,
    radar_score: radar,
    recommendation,
    confidence,
    score_reason: reason,
  };
}

function decideRecommendation(s: {
  radar: number;
  risk: number;
  maintenance: number;
  relevance: number;
  growth: number;
  flags: string[];
}): {
  recommendation: ScoringResult["recommendation"];
  confidence: ScoringResult["confidence"];
  reason: string;
} {
  // Hard blockers — never recommend adopt if these flags present
  const hasBlocker = s.flags.some((f) =>
    (ADOPT_BLOCKERS as readonly string[]).includes(f),
  );

  if (s.flags.includes("archived") || s.flags.includes("disabled")) {
    return {
      recommendation: "ignore",
      confidence: "high",
      reason: "Repo archived/disabled — không còn maintain.",
    };
  }

  // Adopt
  if (
    !hasBlocker &&
    s.radar >= RECOMMENDATION_RULES.adopt.minRadarScore &&
    s.risk <= RECOMMENDATION_RULES.adopt.maxRiskScore &&
    s.maintenance >= RECOMMENDATION_RULES.adopt.minMaintenanceScore &&
    s.relevance >= RECOMMENDATION_RULES.adopt.minRelevanceScore
  ) {
    return {
      recommendation: "adopt",
      confidence: "high",
      reason: `Radar ${s.radar}, low risk, well-maintained, high relevance.`,
    };
  }

  // Test
  if (
    s.radar >= RECOMMENDATION_RULES.test.minRadarScore &&
    s.risk <= RECOMMENDATION_RULES.test.maxRiskScore &&
    s.relevance >= RECOMMENDATION_RULES.test.minRelevanceScore
  ) {
    return {
      recommendation: "test",
      confidence: s.flags.length === 0 ? "high" : "medium",
      reason: `Radar ${s.radar}, relevance ${s.relevance}, đáng đưa vào test plan.`,
    };
  }

  // Caution — viral but risky
  if (
    s.growth >= RECOMMENDATION_RULES.caution.minGrowthScore &&
    s.risk >= RECOMMENDATION_RULES.caution.minRiskScore
  ) {
    return {
      recommendation: "caution",
      confidence: "medium",
      reason: `Tăng nhanh (growth ${s.growth}) nhưng risk cao (${s.risk}).`,
    };
  }

  // Follow
  if (s.radar >= RECOMMENDATION_RULES.follow.minRadarScore) {
    return {
      recommendation: "follow",
      confidence: "medium",
      reason: `Radar ${s.radar} — chưa đủ test/adopt nhưng đáng theo dõi.`,
    };
  }

  // Else ignore
  return {
    recommendation: "ignore",
    confidence: "high",
    reason: `Radar ${s.radar} thấp, risk ${s.risk}.`,
  };
}
