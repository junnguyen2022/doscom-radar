// Local smoke test for enrichment pipeline.
// Uses .env.local. Requires GITHUB_TOKEN + Supabase keys + repositories table.
//
// Usage: node scripts/smoke-enrichment.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, "..", ".env.local");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim();
    }
  }
}
loadEnv(ENV_PATH);

// Dynamic import of TS via Next.js' ts-loader is complex outside Next.
// Easier: re-implement minimal enrichment inline using fetch + supabase-js.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error("Missing GITHUB_TOKEN in .env.local");
  process.exit(1);
}

const QUERY = `
  query R($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      databaseId nameWithOwner description homepageUrl url
      isArchived isDisabled isFork visibility
      pushedAt createdAt updatedAt
      stargazerCount forkCount
      watchers { totalCount }
      issues(states: OPEN) { totalCount }
      defaultBranchRef { name }
      licenseInfo { key name }
      primaryLanguage { name }
      repositoryTopics(first: 20) { nodes { topic { name } } }
      releases(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes { publishedAt tagName }
      }
      pullRequests(states: MERGED, first: 1) { totalCount }
      mentionableUsers(first: 5) { nodes { login avatarUrl(size: 64) } }
    }
    rateLimit { remaining limit cost }
  }
`;

async function fetchRepo(owner, name) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "agent-radar-smoke/0.1",
    },
    body: JSON.stringify({ query: QUERY, variables: { owner, name } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const j = await res.json();
  if (j.errors) throw new Error(j.errors.map((e) => e.message).join("; "));
  return j.data;
}

console.log("Selecting top 10 unenrichied repos...");

const { data: targets } = await supabase
  .from("repositories")
  .select("id, owner, repo")
  .order("last_enriched_at", { ascending: true, nullsFirst: true })
  .limit(parseInt(process.argv[2] ?? "10", 10));

if (!targets || targets.length === 0) {
  console.error("No repos in repositories table. Run backfill-repositories.mjs first.");
  process.exit(1);
}

console.log(`Got ${targets.length} repos. Enriching via GraphQL...\n`);

const today = new Date().toISOString().slice(0, 10);
const now = new Date().toISOString();

let okCount = 0;
let failCount = 0;
let lastRate = null;

for (const t of targets) {
  try {
    const data = await fetchRepo(t.owner, t.repo);
    if (!data.repository) {
      console.log(`  ❌ ${t.owner}/${t.repo}: not found`);
      failCount++;
      continue;
    }
    const r = data.repository;
    lastRate = data.rateLimit;

    // Update repositories
    const { error: e1 } = await supabase
      .from("repositories")
      .update({
        github_id: r.databaseId,
        url: r.url,
        html_url: r.url,
        description: r.description,
        homepage: r.homepageUrl,
        language: r.primaryLanguage?.name ?? null,
        topics: r.repositoryTopics.nodes.map((n) => n.topic.name),
        license_key: r.licenseInfo?.key ?? null,
        license_name: r.licenseInfo?.name ?? null,
        default_branch: r.defaultBranchRef?.name ?? null,
        visibility: r.visibility?.toLowerCase() ?? "public",
        archived: r.isArchived,
        disabled: r.isDisabled,
        fork: r.isFork,
        github_created_at: r.createdAt,
        github_updated_at: r.updatedAt,
        pushed_at: r.pushedAt,
        last_enriched_at: now,
        raw: r,
        modified_at: now,
      })
      .eq("id", t.id);
    if (e1) throw new Error(`update repositories: ${e1.message}`);

    // Insert metrics
    const pushedDays = r.pushedAt
      ? Math.floor((Date.now() - new Date(r.pushedAt).getTime()) / 86400000)
      : null;

    const { error: e2 } = await supabase
      .from("repo_metrics_daily")
      .upsert(
        {
          repo_id: t.id,
          metric_date: today,
          total_stars: r.stargazerCount,
          forks_count: r.forkCount,
          watchers_count: r.watchers.totalCount,
          open_issues_count: r.issues.totalCount,
          pushed_within_days: pushedDays,
          latest_release_at: r.releases.nodes[0]?.publishedAt ?? null,
          latest_release_tag: r.releases.nodes[0]?.tagName ?? null,
          fetched_at: now,
        },
        { onConflict: "repo_id,metric_date" },
      );
    if (e2) throw new Error(`insert metrics: ${e2.message}`);

    okCount++;
    console.log(
      `  ✓ ${t.owner}/${t.repo} — ${r.stargazerCount}★ ${r.forkCount} forks (${r.licenseInfo?.key ?? "no-license"})`,
    );

    await new Promise((r) => setTimeout(r, 100));
  } catch (err) {
    failCount++;
    console.log(`  ❌ ${t.owner}/${t.repo}: ${err.message}`);
  }
}

console.log(
  `\n✅ Done. ${okCount} enriched, ${failCount} failed. Rate remaining: ${lastRate?.remaining}/${lastRate?.limit}`,
);
