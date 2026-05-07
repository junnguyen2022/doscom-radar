// Enrichment pipeline — bring trending repos into `repositories` + `repo_metrics_daily`.
// Reference: ARCHITECTURE_V2_DECISIONS.md §5 + §6.

import { fetchEnrichmentBatch, type EnrichedRepo } from "./github-graphql";
import { createAdminClient } from "./supabase/admin";

export type EnrichmentTarget = { owner: string; repo: string };

// Pick top N candidates: union of (top daily) + (top weekly) + (top monthly) + watchlist.
// Cap at ~200 to stay within free tier + cron timeout.
export async function selectEnrichmentTargets(cap = 200): Promise<EnrichmentTarget[]> {
  const supabase = createAdminClient();

  // Latest snapshot per timeframe
  const { data: dailyDates } = await supabase
    .from("trending_snapshots")
    .select("captured_at")
    .eq("timeframe", "daily")
    .order("captured_at", { ascending: false })
    .limit(1);

  const { data: weeklyDates } = await supabase
    .from("trending_snapshots")
    .select("captured_at")
    .eq("timeframe", "weekly")
    .order("captured_at", { ascending: false })
    .limit(1);

  const { data: monthlyDates } = await supabase
    .from("trending_snapshots")
    .select("captured_at")
    .eq("timeframe", "monthly")
    .order("captured_at", { ascending: false })
    .limit(1);

  const dailyDate = dailyDates?.[0]?.captured_at ?? null;
  const weeklyDate = weeklyDates?.[0]?.captured_at ?? null;
  const monthlyDate = monthlyDates?.[0]?.captured_at ?? null;

  const seen = new Set<string>();
  const targets: EnrichmentTarget[] = [];

  for (const [date, tf] of [
    [dailyDate, "daily"],
    [weeklyDate, "weekly"],
    [monthlyDate, "monthly"],
  ] as const) {
    if (!date) continue;
    const { data } = await supabase
      .from("trending_snapshots")
      .select("owner, repo")
      .eq("timeframe", tf)
      .eq("captured_at", date)
      .order("rank", { ascending: true });
    for (const r of data ?? []) {
      const key = `${r.owner}/${r.repo}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      targets.push({ owner: r.owner, repo: r.repo });
      if (targets.length >= cap) return targets;
    }
  }

  return targets;
}

export async function upsertEnrichedRepos(
  enriched: EnrichedRepo[],
): Promise<{ inserted_repos: number; inserted_metrics: number }> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const repoRows = enriched.map((e) => ({
    github_id: e.github_id,
    owner: e.owner,
    repo: e.repo,
    url: e.url,
    html_url: e.html_url,
    description: e.description,
    homepage: e.homepage,
    language: e.language,
    topics: e.topics,
    license_key: e.license_key,
    license_name: e.license_name,
    default_branch: e.default_branch,
    visibility: e.visibility,
    archived: e.archived,
    disabled: e.disabled,
    fork: e.fork,
    github_created_at: e.github_created_at,
    github_updated_at: e.github_updated_at,
    pushed_at: e.pushed_at,
    last_enriched_at: now,
    raw: e.raw,
    modified_at: now,
  }));

  const { error: repoErr, data: insertedRepos } = await supabase
    .from("repositories")
    .upsert(repoRows, { onConflict: "owner,repo" })
    .select("id, owner, repo");

  if (repoErr) {
    throw new Error(`upsert repositories failed: ${repoErr.message}`);
  }

  const repoIdMap = new Map(
    (insertedRepos ?? []).map((r) => [`${r.owner}/${r.repo}`.toLowerCase(), r.id as number]),
  );

  // Build metrics rows
  const metricsRows = enriched
    .map((e) => {
      const repoId = repoIdMap.get(`${e.owner}/${e.repo}`.toLowerCase());
      if (!repoId) return null;
      const pushedDays =
        e.pushed_at != null
          ? Math.floor(
              (Date.now() - new Date(e.pushed_at).getTime()) / 86400000,
            )
          : null;
      return {
        repo_id: repoId,
        metric_date: today,
        total_stars: e.total_stars,
        forks_count: e.forks_count,
        watchers_count: e.watchers_count,
        open_issues_count: e.open_issues_count,
        pushed_within_days: pushedDays,
        latest_release_at: e.latest_release_at,
        latest_release_tag: e.latest_release_tag,
        // Phase 1: contributors_count, commits_30d, prs/issues_30d are deferred to Phase 2 (need separate queries)
        contributors_count: null,
        commits_30d: null,
        prs_open_30d: null,
        prs_merged_30d: null,
        issues_opened_30d: null,
        issues_closed_30d: null,
        // Stars deltas — computed by separate job after we have ≥7 days history
        stars_delta_1d: null,
        stars_delta_7d: null,
        stars_delta_30d: null,
        forks_delta_7d: null,
        fetched_at: now,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const { error: metricsErr } = await supabase
    .from("repo_metrics_daily")
    .upsert(metricsRows, { onConflict: "repo_id,metric_date" });

  if (metricsErr) {
    throw new Error(`upsert repo_metrics_daily failed: ${metricsErr.message}`);
  }

  return {
    inserted_repos: repoRows.length,
    inserted_metrics: metricsRows.length,
  };
}

// Compute stars deltas for repos that have history.
// Run after upsertEnrichedRepos so today's row exists.
export async function computeStarsDeltas(): Promise<number> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const days1 = new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10);
  const days7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const days30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  // Fetch today's metrics
  const { data: todayRows } = await supabase
    .from("repo_metrics_daily")
    .select("id, repo_id, total_stars, forks_count")
    .eq("metric_date", today);

  if (!todayRows || todayRows.length === 0) return 0;

  let updated = 0;

  for (const row of todayRows) {
    if (row.total_stars == null) continue;

    const [{ data: r1 }, { data: r7 }, { data: r30 }] = await Promise.all([
      supabase
        .from("repo_metrics_daily")
        .select("total_stars")
        .eq("repo_id", row.repo_id)
        .eq("metric_date", days1)
        .maybeSingle(),
      supabase
        .from("repo_metrics_daily")
        .select("total_stars, forks_count")
        .eq("repo_id", row.repo_id)
        .eq("metric_date", days7)
        .maybeSingle(),
      supabase
        .from("repo_metrics_daily")
        .select("total_stars")
        .eq("repo_id", row.repo_id)
        .eq("metric_date", days30)
        .maybeSingle(),
    ]);

    const delta1 = r1?.total_stars != null ? row.total_stars - r1.total_stars : null;
    const delta7 = r7?.total_stars != null ? row.total_stars - r7.total_stars : null;
    const delta30 = r30?.total_stars != null ? row.total_stars - r30.total_stars : null;
    const forks7 =
      r7?.forks_count != null && row.forks_count != null
        ? row.forks_count - r7.forks_count
        : null;

    if (delta1 == null && delta7 == null && delta30 == null) continue;

    await supabase
      .from("repo_metrics_daily")
      .update({
        stars_delta_1d: delta1,
        stars_delta_7d: delta7,
        stars_delta_30d: delta30,
        forks_delta_7d: forks7,
      })
      .eq("id", row.id);

    updated++;
  }

  return updated;
}

export async function runEnrichment(opts: { cap?: number; delayMs?: number } = {}): Promise<{
  targets: number;
  enriched: number;
  failed: number;
  metrics: number;
  deltas_updated: number;
  rate_remaining: number | null;
  has_token: boolean;
  first_error?: string;
  sample_failures?: string[];
}> {
  const hasToken = !!process.env.GITHUB_TOKEN;

  const targets = await selectEnrichmentTargets(opts.cap ?? 200);
  if (targets.length === 0) {
    return {
      targets: 0,
      enriched: 0,
      failed: 0,
      metrics: 0,
      deltas_updated: 0,
      rate_remaining: null,
      has_token: hasToken,
    };
  }

  const { ok, failed } = await fetchEnrichmentBatch(targets, {
    delayMs: opts.delayMs ?? 100,
  });

  const upsertResult = ok.length > 0 ? await upsertEnrichedRepos(ok) : { inserted_repos: 0, inserted_metrics: 0 };
  const deltasUpdated = ok.length > 0 ? await computeStarsDeltas() : 0;

  const { getLastRateLimit } = await import("./github-graphql");
  return {
    targets: targets.length,
    enriched: ok.length,
    failed: failed.length,
    metrics: upsertResult.inserted_metrics,
    deltas_updated: deltasUpdated,
    rate_remaining: getLastRateLimit()?.remaining ?? null,
    has_token: hasToken,
    first_error: failed[0]?.error,
    sample_failures: failed.slice(0, 3).map((f) => `${f.key}: ${f.error}`),
  };
}

// ============================================================================
// Read helpers
// ============================================================================

export type RepositoryRow = {
  id: number;
  owner: string;
  repo: string;
  description: string | null;
  language: string | null;
  topics: string[];
  license_key: string | null;
  license_name: string | null;
  archived: boolean;
  fork: boolean;
  pushed_at: string | null;
  last_enriched_at: string | null;
};

export async function getRepository(
  owner: string,
  repo: string,
): Promise<RepositoryRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("repositories")
    .select(
      "id, owner, repo, description, language, topics, license_key, license_name, archived, fork, pushed_at, last_enriched_at",
    )
    .eq("owner", owner)
    .eq("repo", repo)
    .maybeSingle();
  return (data as RepositoryRow | null) ?? null;
}

export type MetricRow = {
  metric_date: string;
  total_stars: number | null;
  forks_count: number | null;
  open_issues_count: number | null;
  watchers_count: number | null;
  stars_delta_1d: number | null;
  stars_delta_7d: number | null;
  stars_delta_30d: number | null;
  pushed_within_days: number | null;
  latest_release_at: string | null;
  latest_release_tag: string | null;
};

export async function getLatestMetrics(
  repoId: number,
): Promise<MetricRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("repo_metrics_daily")
    .select(
      "metric_date, total_stars, forks_count, open_issues_count, watchers_count, stars_delta_1d, stars_delta_7d, stars_delta_30d, pushed_within_days, latest_release_at, latest_release_tag",
    )
    .eq("repo_id", repoId)
    .order("metric_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as MetricRow | null) ?? null;
}
