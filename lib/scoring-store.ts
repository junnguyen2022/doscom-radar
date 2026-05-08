// Scoring DB layer — load inputs, compute scores, store results.
// Reads from repositories + repo_metrics_daily + trending_snapshots,
// writes to repo_scores.

import { createAdminClient } from "./supabase/admin";
import { unstable_cache } from "next/cache";

const SCORE_CACHE_TTL = 60 * 15; // 15 min — scoring runs daily via cron
const SCORE_CACHE_TAG = "scores";
import { collectionsForRepo } from "./collections";
import { computeAllScores, type ScoringResult } from "./scoring";

export type RepoScoreRow = {
  repo_id: number;
  score_date: string;
  heat_score: number;
  growth_score: number;
  activity_score: number;
  community_score: number;
  maintenance_score: number;
  relevance_score: number;
  risk_penalty: number;
  radar_score: number;
  recommendation: string;
  confidence: string;
  risk_flags: string[];
  relevance_tier: string;
  score_reason: string;
};

// Compute score for ONE repo. Returns null if metrics missing.
export async function scoreOneRepo(
  repoId: number,
): Promise<ScoringResult | null> {
  const supabase = createAdminClient();

  const { data: repo } = await supabase
    .from("repositories")
    .select(
      "id, owner, repo, language, description, topics, license_key, archived, disabled, fork, pushed_at",
    )
    .eq("id", repoId)
    .maybeSingle();
  if (!repo) return null;

  const { data: metrics } = await supabase
    .from("repo_metrics_daily")
    .select("*")
    .eq("repo_id", repoId)
    .order("metric_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Latest snapshot for rank + stars_gained_today
  const { data: snapshot } = await supabase
    .from("trending_snapshots")
    .select("rank, stars_gained, captured_at, timeframe")
    .eq("owner", repo.owner)
    .eq("repo", repo.repo)
    .eq("timeframe", "daily")
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const collections = collectionsForRepo(repo.owner, repo.repo);

  return computeAllScores({
    rank: snapshot?.rank,
    stars_gained_today: snapshot?.stars_gained ?? null,
    total_stars: metrics?.total_stars ?? null,
    archived: repo.archived,
    disabled: repo.disabled,
    fork: repo.fork,
    language: repo.language,
    description: repo.description,
    topics: repo.topics ?? [],
    license_key: repo.license_key,
    pushed_at: repo.pushed_at,
    collectionSlugs: collections.map((c) => c.slug),
    contributors_count: metrics?.contributors_count ?? null,
    commits_30d: metrics?.commits_30d ?? null,
    prs_open_30d: metrics?.prs_open_30d ?? null,
    prs_merged_30d: metrics?.prs_merged_30d ?? null,
    issues_opened_30d: metrics?.issues_opened_30d ?? null,
    issues_closed_30d: metrics?.issues_closed_30d ?? null,
    stars_delta_1d: metrics?.stars_delta_1d ?? null,
    stars_delta_7d: metrics?.stars_delta_7d ?? null,
    stars_delta_30d: metrics?.stars_delta_30d ?? null,
    forks_delta_7d: metrics?.forks_delta_7d ?? null,
    pushed_within_days: metrics?.pushed_within_days ?? null,
    latest_release_at: metrics?.latest_release_at ?? null,
  });
}

// Batch: bulk-load + compute in memory + single upsert.
// Optimized for Vercel 60s limit: 3 SELECT + 1 UPSERT instead of 3*N + N.
export async function runScoringBatch(): Promise<{
  scored: number;
  failed: number;
  recommendation_counts: Record<string, number>;
}> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: metricsToday }, { data: snapshotsToday }] = await Promise.all([
    supabase.from("repo_metrics_daily").select("*").eq("metric_date", today),
    supabase
      .from("trending_snapshots")
      .select("owner, repo, rank, stars_gained")
      .eq("captured_at", today)
      .eq("timeframe", "daily"),
  ]);

  if (!metricsToday || metricsToday.length === 0) {
    return { scored: 0, failed: 0, recommendation_counts: {} };
  }

  const repoIds = Array.from(new Set(metricsToday.map((m) => m.repo_id)));
  const { data: repos } = await supabase
    .from("repositories")
    .select(
      "id, owner, repo, language, description, topics, license_key, archived, disabled, fork, pushed_at",
    )
    .in("id", repoIds);

  const repoMap = new Map((repos ?? []).map((r) => [r.id, r]));
  const metricMap = new Map(metricsToday.map((m) => [m.repo_id, m]));
  const snapMap = new Map(
    (snapshotsToday ?? []).map((s) => [`${s.owner}/${s.repo}`.toLowerCase(), s]),
  );

  let failed = 0;
  const counts: Record<string, number> = {};
  const rowsToUpsert: Array<RepoScoreRow> = [];

  for (const id of repoIds) {
    try {
      const repo = repoMap.get(id);
      const metrics = metricMap.get(id);
      if (!repo || !metrics) {
        failed++;
        continue;
      }
      const snap = snapMap.get(`${repo.owner}/${repo.repo}`.toLowerCase());
      const collections = collectionsForRepo(repo.owner, repo.repo);

      const result = computeAllScores({
        rank: snap?.rank,
        stars_gained_today: snap?.stars_gained ?? null,
        total_stars: metrics.total_stars,
        archived: repo.archived,
        disabled: repo.disabled,
        fork: repo.fork,
        language: repo.language,
        description: repo.description,
        topics: repo.topics ?? [],
        license_key: repo.license_key,
        pushed_at: repo.pushed_at,
        collectionSlugs: collections.map((c) => c.slug),
        contributors_count: metrics.contributors_count,
        commits_30d: metrics.commits_30d,
        prs_open_30d: metrics.prs_open_30d,
        prs_merged_30d: metrics.prs_merged_30d,
        issues_opened_30d: metrics.issues_opened_30d,
        issues_closed_30d: metrics.issues_closed_30d,
        stars_delta_1d: metrics.stars_delta_1d,
        stars_delta_7d: metrics.stars_delta_7d,
        stars_delta_30d: metrics.stars_delta_30d,
        forks_delta_7d: metrics.forks_delta_7d,
        pushed_within_days: metrics.pushed_within_days,
        latest_release_at: metrics.latest_release_at,
      });

      rowsToUpsert.push({
        repo_id: id,
        score_date: today,
        heat_score: result.heat_score,
        growth_score: result.growth_score,
        activity_score: result.activity_score,
        community_score: result.community_score,
        maintenance_score: result.maintenance_score,
        relevance_score: result.relevance_score,
        risk_penalty: result.risk_penalty,
        radar_score: result.radar_score,
        recommendation: result.recommendation,
        confidence: result.confidence,
        risk_flags: result.risk_flags,
        relevance_tier: result.relevance_tier,
        score_reason: result.score_reason,
      });
      counts[result.recommendation] = (counts[result.recommendation] ?? 0) + 1;
    } catch (err) {
      failed++;
      console.error(`score repo_id=${id} failed:`, err);
    }
  }

  if (rowsToUpsert.length > 0) {
    const { error } = await supabase
      .from("repo_scores")
      .upsert(rowsToUpsert, { onConflict: "repo_id,score_date" });
    if (error) {
      return {
        scored: 0,
        failed: rowsToUpsert.length,
        recommendation_counts: {},
      };
    }
  }

  return {
    scored: rowsToUpsert.length,
    failed,
    recommendation_counts: counts,
  };
}

// Read helpers for UI

export type ScoredRepoSummary = {
  repo_id: number;
  owner: string;
  repo: string;
  language: string | null;
  description: string | null;
  total_stars: number | null;
  forks_count: number | null;
  radar_score: number;
  heat_score: number;
  growth_score: number;
  activity_score: number;
  maintenance_score: number;
  relevance_score: number;
  risk_penalty: number;
  recommendation: string;
  confidence: string;
  risk_flags: string[];
  relevance_tier: string;
};

async function _getLatestScoreForRepoInner(
  repoId: number,
): Promise<RepoScoreRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("repo_scores")
    .select("*")
    .eq("repo_id", repoId)
    .order("score_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as RepoScoreRow | null) ?? null;
}

async function _getTopByRecommendationInner(
  recommendation: string,
  limit = 10,
): Promise<ScoredRepoSummary[]> {
  const supabase = createAdminClient();

  // Latest score date
  const { data: latestDate } = await supabase
    .from("repo_scores")
    .select("score_date")
    .order("score_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latestDate) return [];

  const { data } = await supabase
    .from("repo_scores")
    .select(
      "repo_id, heat_score, growth_score, activity_score, maintenance_score, relevance_score, risk_penalty, radar_score, recommendation, confidence, risk_flags, relevance_tier, repositories(owner, repo, language, description), repo_metrics_daily(total_stars, forks_count)",
    )
    .eq("score_date", latestDate.score_date)
    .eq("recommendation", recommendation)
    .order("radar_score", { ascending: false })
    .limit(limit);

  // Note: nested join isn't always reliable. Do simpler 2-query approach:
  return await joinScoreRows(latestDate.score_date, recommendation, limit);
}

async function joinScoreRows(
  date: string,
  recommendation: string,
  limit: number,
): Promise<ScoredRepoSummary[]> {
  const supabase = createAdminClient();

  const { data: scores } = await supabase
    .from("repo_scores")
    .select(
      "repo_id, heat_score, growth_score, activity_score, maintenance_score, relevance_score, risk_penalty, radar_score, recommendation, confidence, risk_flags, relevance_tier",
    )
    .eq("score_date", date)
    .eq("recommendation", recommendation)
    .order("radar_score", { ascending: false })
    .limit(limit);

  if (!scores || scores.length === 0) return [];

  const repoIds = scores.map((s) => s.repo_id);

  const [{ data: repos }, { data: metrics }] = await Promise.all([
    supabase
      .from("repositories")
      .select("id, owner, repo, language, description")
      .in("id", repoIds),
    supabase
      .from("repo_metrics_daily")
      .select("repo_id, total_stars, forks_count")
      .eq("metric_date", date)
      .in("repo_id", repoIds),
  ]);

  const repoMap = new Map((repos ?? []).map((r) => [r.id, r]));
  const metricMap = new Map((metrics ?? []).map((m) => [m.repo_id, m]));

  return scores
    .map((s) => {
      const repo = repoMap.get(s.repo_id);
      const metric = metricMap.get(s.repo_id);
      if (!repo) return null;
      return {
        repo_id: s.repo_id,
        owner: repo.owner,
        repo: repo.repo,
        language: repo.language,
        description: repo.description,
        total_stars: metric?.total_stars ?? null,
        forks_count: metric?.forks_count ?? null,
        radar_score: Number(s.radar_score),
        heat_score: Number(s.heat_score),
        growth_score: Number(s.growth_score),
        activity_score: Number(s.activity_score),
        maintenance_score: Number(s.maintenance_score),
        relevance_score: Number(s.relevance_score),
        risk_penalty: Number(s.risk_penalty),
        recommendation: s.recommendation,
        confidence: s.confidence,
        risk_flags: s.risk_flags ?? [],
        relevance_tier: s.relevance_tier,
      } satisfies ScoredRepoSummary;
    })
    .filter((r): r is ScoredRepoSummary => r !== null);
}

// Top high-risk popular: high growth + high risk
// ----------------------------------------------------------------------------
// Cached wrappers (perf pass).
// Scoring runs nightly via cron; 15-min stale is invisible.
// ----------------------------------------------------------------------------

export const getLatestScoreForRepo: typeof _getLatestScoreForRepoInner = (
  ...args
) =>
  unstable_cache(_getLatestScoreForRepoInner, ["getLatestScoreForRepo"], {
    revalidate: SCORE_CACHE_TTL,
    tags: [SCORE_CACHE_TAG],
  })(...args);

export const getTopByRecommendation: typeof _getTopByRecommendationInner = (
  ...args
) =>
  unstable_cache(_getTopByRecommendationInner, ["getTopByRecommendation"], {
    revalidate: SCORE_CACHE_TTL,
    tags: [SCORE_CACHE_TAG],
  })(...args);

export const getHighRiskPopular: typeof _getHighRiskPopularInner = (...args) =>
  unstable_cache(_getHighRiskPopularInner, ["getHighRiskPopular"], {
    revalidate: SCORE_CACHE_TTL,
    tags: [SCORE_CACHE_TAG],
  })(...args);

async function _getHighRiskPopularInner(
  limit = 10,
): Promise<ScoredRepoSummary[]> {
  const supabase = createAdminClient();
  const { data: latestDate } = await supabase
    .from("repo_scores")
    .select("score_date")
    .order("score_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latestDate) return [];

  const { data: scores } = await supabase
    .from("repo_scores")
    .select(
      "repo_id, heat_score, growth_score, activity_score, maintenance_score, relevance_score, risk_penalty, radar_score, recommendation, confidence, risk_flags, relevance_tier",
    )
    .eq("score_date", latestDate.score_date)
    .gte("growth_score", 60)
    .gte("risk_penalty", 30)
    .order("growth_score", { ascending: false })
    .limit(limit);

  if (!scores || scores.length === 0) return [];

  const repoIds = scores.map((s) => s.repo_id);
  const [{ data: repos }, { data: metrics }] = await Promise.all([
    supabase
      .from("repositories")
      .select("id, owner, repo, language, description")
      .in("id", repoIds),
    supabase
      .from("repo_metrics_daily")
      .select("repo_id, total_stars, forks_count")
      .eq("metric_date", latestDate.score_date)
      .in("repo_id", repoIds),
  ]);

  const repoMap = new Map((repos ?? []).map((r) => [r.id, r]));
  const metricMap = new Map((metrics ?? []).map((m) => [m.repo_id, m]));

  return scores
    .map((s) => {
      const repo = repoMap.get(s.repo_id);
      const metric = metricMap.get(s.repo_id);
      if (!repo) return null;
      return {
        repo_id: s.repo_id,
        owner: repo.owner,
        repo: repo.repo,
        language: repo.language,
        description: repo.description,
        total_stars: metric?.total_stars ?? null,
        forks_count: metric?.forks_count ?? null,
        radar_score: Number(s.radar_score),
        heat_score: Number(s.heat_score),
        growth_score: Number(s.growth_score),
        activity_score: Number(s.activity_score),
        maintenance_score: Number(s.maintenance_score),
        relevance_score: Number(s.relevance_score),
        risk_penalty: Number(s.risk_penalty),
        recommendation: s.recommendation,
        confidence: s.confidence,
        risk_flags: s.risk_flags ?? [],
        relevance_tier: s.relevance_tier,
      } satisfies ScoredRepoSummary;
    })
    .filter((r): r is ScoredRepoSummary => r !== null);
}
