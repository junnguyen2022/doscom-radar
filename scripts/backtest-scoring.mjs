// Sanity-check scoring on existing data.
// Reads repositories + repo_metrics_daily + trending_snapshots from Supabase,
// computes scores using same formulas as production, prints a sorted table.
//
// Usage: node scripts/backtest-scoring.mjs [N=20]
//
// Use this to:
// - Eyeball if recommendations match expectation
// - Tune weights in lib/config/scoring-weights.ts
// - Detect bugs (e.g., NaN scores, missing data)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, "..", ".env.local");

function loadEnv(p) {
  if (!fs.existsSync(p)) return;
  const txt = fs.readFileSync(p, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnv(ENV_PATH);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// Inline-replicate scoring formulas (no TS imports for plain Node).

const RADAR_WEIGHTS = { growth: 0.25, activity: 0.2, community: 0.2, maintenance: 0.15, relevance: 0.2 };

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function heatScore(starsGained, totalStars, rank) {
  const gained = Math.max(starsGained ?? 0, 0);
  const total = Math.max(totalStars ?? 0, 1);
  const velocity = Math.min(gained / total, 1);
  const scale = Math.min(Math.log10(total + 1) / 6, 1);
  const rankBonus = rank ? Math.max(0, (26 - rank) / 25) * 0.15 : 0;
  return Math.round(clamp(velocity * 0.65 + scale * 0.35 + rankBonus, 0, 1) * 100);
}

function growthScore(d1, d7, d30, f7, total) {
  const t = Math.max(total ?? 0, 1);
  const dailyVel = ((d1 ?? 0) / t) * 100;
  const weekVel = ((d7 ?? 0) / t) * 100;
  const monthVel = ((d30 ?? 0) / t) * 100;
  const forkRatio = (f7 ?? 0) / Math.max(d7 ?? 0, 1);
  const s =
    Math.min(dailyVel * 5, 30) + Math.min(weekVel * 2, 40) +
    Math.min(monthVel * 1, 20) + Math.min(forkRatio * 50, 10);
  return Math.round(clamp(s, 0, 100));
}

function activityScore(commits30, prsM30, issuesC30, pushDays, releaseAt) {
  const c = commits30 ?? 0;
  const m = prsM30 ?? 0;
  const i = issuesC30 ?? 0;
  const pd = pushDays ?? 999;
  const ra = releaseAt ? (Date.now() - new Date(releaseAt).getTime()) / 86400000 : 999;
  const cs = Math.min(c * 0.5, 30);
  const ps = Math.min(m * 4, 25);
  const is = Math.min(i * 2, 15);
  const rs = pd <= 7 ? 20 : pd <= 30 ? 10 : 0;
  const rls = ra <= 90 ? 10 : ra <= 180 ? 5 : 0;
  return Math.round(clamp(cs + ps + is + rs + rls, 0, 100));
}

function communityScore(contrib, total, prsOpen, opened, closed) {
  const c = contrib ?? 0;
  const stars = Math.max(total ?? 0, 1);
  const cs = Math.min((Math.log10(c + 1) / 3) * 40, 40);
  const ratio = stars / Math.max(c, 1);
  const hs = ratio < 100 ? 25 : ratio < 1000 ? 15 : 5;
  const closeRatio = (closed ?? 0) / Math.max(opened ?? 0, 1);
  const rs = Math.min(closeRatio * 25, 25);
  const es = Math.min(prsOpen ?? 0, 10);
  return Math.round(clamp(cs + hs + rs + es, 0, 100));
}

function maintScore(pushedAt, releaseAt, closed30, opened30, archived, disabled) {
  if (archived || disabled) return 0;
  const now = Date.now();
  const pd = pushedAt ? (now - new Date(pushedAt).getTime()) / 86400000 : 999;
  const rd = releaseAt ? (now - new Date(releaseAt).getTime()) / 86400000 : 999;
  const ps = pd <= 7 ? 50 : pd <= 30 ? 35 : pd <= 90 ? 20 : pd <= 180 ? 10 : 0;
  const rs = rd <= 30 ? 30 : rd <= 90 ? 20 : rd <= 180 ? 10 : 0;
  const close = (closed30 ?? 0) / Math.max(opened30 ?? 0, 1);
  const respScore = Math.min(close * 20, 20);
  return Math.round(clamp(ps + rs + respScore, 0, 100));
}

function riskPenalty(repo, metrics) {
  const flags = [];
  let p = 0;
  if (repo.archived) { flags.push("archived"); p += 80; }
  if (repo.disabled) { flags.push("disabled"); p += 80; }
  if (!repo.license_key) { flags.push("no_license"); p += 30; }
  if (repo.fork) { flags.push("forked_repo"); p += 20; }
  const now = Date.now();
  if (repo.pushed_at) {
    const days = (now - new Date(repo.pushed_at).getTime()) / 86400000;
    if (days > 180) { flags.push("stale_repo"); p += 25; }
  }
  if (metrics?.latest_release_at) {
    const days = (now - new Date(metrics.latest_release_at).getTime()) / 86400000;
    if (days > 365) { flags.push("no_recent_release"); p += 10; }
  }
  if ((metrics?.contributors_count ?? 0) <= 1) {
    flags.push("single_maintainer_risk"); p += 15;
  }
  return { penalty: Math.min(100, p), flags };
}

const N = parseInt(process.argv[2] ?? "20", 10);

console.log("Loading scoring inputs...");
const today = new Date().toISOString().slice(0, 10);

const { data: metricsToday } = await supabase
  .from("repo_metrics_daily")
  .select("*")
  .eq("metric_date", today)
  .limit(500);

if (!metricsToday || metricsToday.length === 0) {
  console.error("No metrics for today. Run cron daily first.");
  process.exit(1);
}

const repoIds = metricsToday.map((m) => m.repo_id);
const { data: repos } = await supabase
  .from("repositories")
  .select("id, owner, repo, language, description, topics, license_key, archived, disabled, fork, pushed_at")
  .in("id", repoIds);

const { data: snapshots } = await supabase
  .from("trending_snapshots")
  .select("owner, repo, rank, stars_gained, captured_at")
  .eq("captured_at", today)
  .eq("timeframe", "daily");

const repoMap = new Map(repos.map((r) => [r.id, r]));
const snapMap = new Map((snapshots ?? []).map((s) => [`${s.owner}/${s.repo}`, s]));

const results = [];

for (const m of metricsToday) {
  const repo = repoMap.get(m.repo_id);
  if (!repo) continue;
  const snap = snapMap.get(`${repo.owner}/${repo.repo}`);

  const heat = heatScore(snap?.stars_gained, m.total_stars, snap?.rank);
  const growth = growthScore(m.stars_delta_1d, m.stars_delta_7d, m.stars_delta_30d, m.forks_delta_7d, m.total_stars);
  const activity = activityScore(m.commits_30d, m.prs_merged_30d, m.issues_closed_30d, m.pushed_within_days, m.latest_release_at);
  const community = communityScore(m.contributors_count, m.total_stars, m.prs_open_30d, m.issues_opened_30d, m.issues_closed_30d);
  const maintenance = maintScore(repo.pushed_at, m.latest_release_at, m.issues_closed_30d, m.issues_opened_30d, repo.archived, repo.disabled);
  const { penalty, flags } = riskPenalty(repo, m);

  // Skip relevance for backtest brevity (set to neutral 50 to avoid skew)
  const relevance = 50;

  const radar = Math.round(clamp(
    growth * RADAR_WEIGHTS.growth + activity * RADAR_WEIGHTS.activity +
    community * RADAR_WEIGHTS.community + maintenance * RADAR_WEIGHTS.maintenance +
    relevance * RADAR_WEIGHTS.relevance - penalty,
    0, 100,
  ));

  let recommendation = "ignore";
  if (flags.includes("archived")) recommendation = "ignore";
  else if (radar >= 80 && penalty <= 25 && maintenance >= 60 && relevance >= 70) recommendation = "adopt";
  else if (radar >= 65 && penalty <= 40 && relevance >= 60) recommendation = "test";
  else if (growth > 70 && penalty > 50) recommendation = "caution";
  else if (radar >= 50) recommendation = "follow";

  results.push({
    name: `${repo.owner}/${repo.repo}`,
    radar, heat, growth, activity, community, maintenance,
    penalty, flags: flags.join(","),
    recommendation,
    stars: m.total_stars,
  });
}

results.sort((a, b) => b.radar - a.radar);

console.log(`\nTop ${Math.min(N, results.length)} repos by Radar score:\n`);
console.table(
  results.slice(0, N).map((r) => ({
    name: r.name.slice(0, 40),
    radar: r.radar,
    heat: r.heat,
    growth: r.growth,
    act: r.activity,
    comm: r.community,
    maint: r.maintenance,
    pen: r.penalty,
    rec: r.recommendation,
    stars: r.stars,
    flags: r.flags.slice(0, 30),
  }))
);

const counts = {};
for (const r of results) counts[r.recommendation] = (counts[r.recommendation] ?? 0) + 1;
console.log("\nRecommendation distribution:", counts);
console.log(`Total scored: ${results.length}`);
