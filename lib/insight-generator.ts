// AI insight generator — calls Claude with tool-use to enforce JSON schema.
// Per repo, cached by date. Cap to top 20 per cron run.

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "./supabase/admin";
import { collectionsForRepo } from "./collections";
import {
  INSIGHT_TOOL,
  PROMPT_VERSION,
  INSIGHT_MODEL,
  SYSTEM_PROMPT,
  buildUserPrompt,
  validateInsight,
  type RepoInsight,
} from "./insight-contract";

export type InsightRow = RepoInsight & {
  repo_id: number;
  insight_date: string;
  prompt_version: string;
  model: string;
  generated_at: string;
};

const client = new Anthropic();

// Generate insight for ONE repo using Claude tool-use.
// Returns null if generation fails or insufficient data.
async function generateOne(repoId: number): Promise<RepoInsight | null> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  // Skip if already have insight for today
  const { data: existing } = await supabase
    .from("repo_insights")
    .select("repo_id")
    .eq("repo_id", repoId)
    .eq("insight_date", today)
    .maybeSingle();
  if (existing) return null;

  // Fetch repo + latest metrics + latest score + snapshot
  const [{ data: repo }, { data: metrics }, { data: score }] = await Promise.all([
    supabase
      .from("repositories")
      .select(
        "id, owner, repo, description, language, topics, license_key, archived, fork, pushed_at",
      )
      .eq("id", repoId)
      .maybeSingle(),
    supabase
      .from("repo_metrics_daily")
      .select("*")
      .eq("repo_id", repoId)
      .order("metric_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("repo_scores")
      .select("*")
      .eq("repo_id", repoId)
      .order("score_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!repo || !metrics || !score) return null;

  const { data: snapshot } = await supabase
    .from("trending_snapshots")
    .select("rank, stars_gained")
    .eq("owner", repo.owner)
    .eq("repo", repo.repo)
    .eq("timeframe", "daily")
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const collections = collectionsForRepo(repo.owner, repo.repo);

  const prompt = buildUserPrompt({
    full_name: `${repo.owner}/${repo.repo}`,
    description: repo.description,
    language: repo.language,
    topics: repo.topics ?? [],
    license_key: repo.license_key,
    archived: repo.archived,
    fork: repo.fork,
    pushed_at: repo.pushed_at,
    total_stars: metrics.total_stars,
    forks_count: metrics.forks_count,
    open_issues: metrics.open_issues_count,
    contributors: metrics.contributors_count,
    commits_30d: metrics.commits_30d,
    prs_merged_30d: metrics.prs_merged_30d,
    issues_closed_30d: metrics.issues_closed_30d,
    latest_release_at: metrics.latest_release_at,
    latest_release_tag: metrics.latest_release_tag,
    radar_score: Number(score.radar_score),
    growth_score: Number(score.growth_score),
    activity_score: Number(score.activity_score),
    community_score: Number(score.community_score),
    maintenance_score: Number(score.maintenance_score),
    relevance_score: Number(score.relevance_score),
    risk_penalty: Number(score.risk_penalty),
    risk_flags: score.risk_flags ?? [],
    rank: snapshot?.rank ?? null,
    stars_today: snapshot?.stars_gained ?? null,
    collections: collections.map((c) => c.name),
  });

  const response = await client.messages.create({
    model: INSIGHT_MODEL,
    max_tokens: 800, // Cap response size for faster generation (~3-5s vs 8-12s)
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [INSIGHT_TOOL],
    tool_choice: { type: "tool", name: INSIGHT_TOOL.name },
    messages: [{ role: "user", content: prompt }],
  });

  // Extract tool_use block from response
  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    console.error(
      `Insight ${repo.owner}/${repo.repo}: Claude did not use submit_repo_insight tool`,
    );
    return null;
  }

  const validated = validateInsight(toolUse.input);
  if ("error" in validated) {
    console.error(
      `Insight ${repo.owner}/${repo.repo}: validation failed — ${validated.error}`,
    );
    return null;
  }

  // Store
  const { error } = await supabase.from("repo_insights").upsert(
    {
      repo_id: repoId,
      insight_date: today,
      summary: validated.summary,
      why_trending: validated.why_trending,
      technical_value: validated.technical_value,
      doscom_use_case: validated.doscom_use_case,
      risk_note: validated.risk_note,
      recommendation: validated.recommendation,
      confidence: validated.confidence,
      evidence: validated.evidence,
      prompt_version: PROMPT_VERSION,
      model: INSIGHT_MODEL,
    },
    { onConflict: "repo_id,insight_date" },
  );
  if (error) {
    console.error(`Insight upsert failed: ${error.message}`);
    return null;
  }

  return validated;
}

// Batch: generate insights for top N repos by radar_score.
// Cap to control Anthropic cost (~$0.05-0.10 per insight with Sonnet 4.6).
export async function runInsightBatch(
  cap = 20,
): Promise<{
  generated: number;
  skipped: number;
  failed: number;
  cap: number;
}> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { generated: 0, skipped: 0, failed: 0, cap };
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  // Pick top by radar_score
  const { data: topScores } = await supabase
    .from("repo_scores")
    .select("repo_id, radar_score, recommendation")
    .eq("score_date", today)
    .order("radar_score", { ascending: false })
    .limit(cap);

  if (!topScores || topScores.length === 0) {
    return { generated: 0, skipped: 0, failed: 0, cap };
  }

  // Run in parallel — cuts total time from N×call to ~max(call).
  // Anthropic tier 1 allows 50 RPM, so cap ≤ 10 is safe.
  const settled = await Promise.allSettled(
    topScores.map((s) => generateOne(s.repo_id)),
  );

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  // Check which ones were skipped (already exist) vs failed
  for (let i = 0; i < settled.length; i++) {
    const r = settled[i];
    if (r.status === "rejected") {
      failed++;
      continue;
    }
    if (r.value === null) {
      const { count } = await supabase
        .from("repo_insights")
        .select("id", { count: "exact", head: true })
        .eq("repo_id", topScores[i].repo_id)
        .eq("insight_date", today);
      if ((count ?? 0) > 0) skipped++;
      else failed++;
    } else {
      generated++;
    }
  }

  return { generated, skipped, failed, cap };
}

// Read latest insight for a single repo
export async function getLatestInsight(
  repoId: number,
): Promise<InsightRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("repo_insights")
    .select("*")
    .eq("repo_id", repoId)
    .order("insight_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as InsightRow | null) ?? null;
}
