// V2.5 §24.7 — find similar / alternative repos using existing data only.
// Heuristic ranking by:
//   - shared topics (highest weight)
//   - same primary language
//   - shared collection membership
//   - radar_score breaker (prefer healthier repos)

import { createAdminClient } from "./supabase/admin";
import { collectionsForRepo } from "./collections";

export type SimilarRepo = {
  owner: string;
  repo: string;
  description: string | null;
  language: string | null;
  topics: string[];
  totalStars: number | null;
  radarScore: number | null;
  recommendation: string | null;
  reason: string;
};

type RepositoryRow = {
  id: number;
  owner: string;
  repo: string;
  description: string | null;
  language: string | null;
  topics: string[] | null;
};

type ScoreRow = {
  repo_id: number;
  radar_score: number | string;
  recommendation: string | null;
  score_date: string;
};

type MetricRow = {
  repo_id: number;
  total_stars: number | null;
};

export async function getSimilarRepos(
  owner: string,
  repo: string,
  opts: {
    topics?: string[];
    language?: string | null;
    limit?: number;
  } = {},
): Promise<SimilarRepo[]> {
  const limit = opts.limit ?? 6;
  const supabase = createAdminClient();

  const targetTopics = (opts.topics ?? []).map((t) => t.toLowerCase());
  const targetCollections = collectionsForRepo(owner, repo).map((c) => c.slug);

  // Pull a wide set of candidates filtered by topic OR language;
  // we'll re-rank in JS.
  const orParts: string[] = [];
  if (targetTopics.length > 0) {
    orParts.push(`topics.ov.{${targetTopics.join(",")}}`);
  }
  if (opts.language) {
    orParts.push(`language.eq.${opts.language}`);
  }

  if (orParts.length === 0) return [];

  const { data: repos } = await supabase
    .from("repositories")
    .select("id, owner, repo, description, language, topics")
    .or(orParts.join(","))
    .limit(80);
  if (!repos || repos.length === 0) return [];

  // Filter out the source repo
  const candidates = (repos as RepositoryRow[]).filter(
    (r) => !(r.owner === owner && r.repo === repo),
  );
  if (candidates.length === 0) return [];

  const ids = candidates.map((r) => r.id);

  // Fetch latest score (any date) + latest metric in one round.
  const [{ data: scoresRaw }, { data: metricsRaw }] = await Promise.all([
    supabase
      .from("repo_scores")
      .select("repo_id, radar_score, recommendation, score_date")
      .in("repo_id", ids)
      .order("score_date", { ascending: false }),
    supabase
      .from("repo_metrics_daily")
      .select("repo_id, total_stars, metric_date")
      .in("repo_id", ids)
      .order("metric_date", { ascending: false }),
  ]);

  const latestScore = new Map<number, ScoreRow>();
  for (const s of (scoresRaw ?? []) as ScoreRow[]) {
    if (!latestScore.has(s.repo_id)) latestScore.set(s.repo_id, s);
  }
  const latestMetric = new Map<number, MetricRow>();
  for (const m of (metricsRaw ?? []) as MetricRow[]) {
    if (!latestMetric.has(m.repo_id)) latestMetric.set(m.repo_id, m);
  }

  type Ranked = SimilarRepo & { _score: number };

  const ranked: Ranked[] = candidates.map((r) => {
    const topics = r.topics ?? [];
    const sharedTopics = topics
      .map((t) => t.toLowerCase())
      .filter((t) => targetTopics.includes(t));
    const sameLang = !!opts.language && r.language === opts.language;

    const candidateCollections = collectionsForRepo(r.owner, r.repo).map(
      (c) => c.slug,
    );
    const sharedColls = candidateCollections.filter((c) =>
      targetCollections.includes(c),
    );

    const score = latestScore.get(r.id);
    const radar = score ? Number(score.radar_score) : null;

    let s = sharedTopics.length * 10;
    if (sameLang) s += 6;
    s += sharedColls.length * 4;
    if (radar != null) s += radar * 0.05;

    const reasonBits: string[] = [];
    if (sharedTopics.length > 0)
      reasonBits.push(
        `${sharedTopics.length} shared topic${sharedTopics.length > 1 ? "s" : ""}`,
      );
    if (sameLang) reasonBits.push(`same language (${r.language})`);
    if (sharedColls.length > 0)
      reasonBits.push(
        `${sharedColls.length} shared collection${sharedColls.length > 1 ? "s" : ""}`,
      );

    return {
      owner: r.owner,
      repo: r.repo,
      description: r.description,
      language: r.language,
      topics,
      totalStars: latestMetric.get(r.id)?.total_stars ?? null,
      radarScore: radar,
      recommendation: score?.recommendation ?? null,
      reason: reasonBits.join(" · ") || "matched candidate pool",
      _score: s,
    };
  });

  ranked.sort((a, b) => b._score - a._score);

  return ranked.slice(0, limit).map(({ _score: _, ...rest }) => rest);
}
