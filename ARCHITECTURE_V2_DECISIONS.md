# Agent Radar V2 — Final Decisions & Implementation Details

> Companion document cho `AGENT_RADAR_ARCHITECTURE_V2.md`.
> Lock 4 quyết định chính + chi tiết implementation còn thiếu trong V2 doc.
>
> **Cập nhật**: 2026-05-06
> **Constraints**: Free tier · Solo dev · ~23 ngày total V2

---

## 0. TL;DR — 4 Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Budget | **Free tier toàn bộ** → cap 200 repos, chain cron jobs, GraphQL bắt buộc |
| 2 | Auth | **Supabase Auth + GitHub OAuth** (50k MAU free) |
| 3 | Doscom Focus | Config 3-tier (high/medium/low) cho topics × languages × collections |
| 4 | Team | **1 dev solo** → simplify watchlist (1/user), bỏ team owner views |

---

## 1. Free tier constraints (Q1)

### 1.1. Limits đáng chú ý

| Resource | Free limit | V2 design implication |
|---|---|---|
| Supabase Postgres | 500MB DB, 2GB egress | Cap **200 repos** đang theo dõi (top 50 daily ∪ top 50 weekly ∪ top 50 monthly ∪ watchlist) |
| Supabase realtime | Disabled trên free | Không dùng realtime — poll thay thế |
| Vercel Hobby | **2 cron jobs**, 60s function timeout | Currently dùng 1 (`/api/cron/snapshot`). Còn 1 slot → **chain** trong `/api/cron/daily` |
| Vercel bandwidth | 100 GB/month | Đủ thoải mái cho dashboard nội bộ |
| Anthropic | Pay-per-use, không free | Cap **20 insights/ngày** ≈ $1-2/tháng (Sonnet) hoặc $0.20 (Haiku) |
| GitHub API | 5000 req/h với PAT | Đủ. Dùng GraphQL để economize. |

### 1.2. Adjustments áp dụng cho V2

- **GraphQL bắt buộc Phase 1** (không "later" như V2 §4).
- **Cap 200 repos active** — pruning logic xóa khỏi `repositories` table khi:
  - Không xuất hiện trong trending 30 ngày AND
  - Không nằm trong watchlist
- **Pruning `repo_metrics_daily`** sau **90 ngày** (giữ 90 days × 200 repos = 18k rows ≈ 5MB).
- **Pruning `repo_activity_events`** sau **30 ngày**.
- **Cron chain** (xem §8): 1 endpoint chạy snapshot → enrich → score → insight tuần tự.
- **AI insight cap 20 repos/ngày** (top theo `radar_score` của ngày trước).

### 1.3. Storage budget projection

```
trending_snapshots: ~50 rows/ngày × 365 ngày × 1KB = 18MB/năm
repositories:       200 rows × 5KB = 1MB
repo_metrics_daily: 200 × 90 ngày × 1KB = 18MB (rolling)
repo_activity_events: 200 × 30 events × 1KB = 6MB (rolling)
repo_scores:        200 × 365 × 0.5KB = 36MB/năm
repo_insights:      20 × 365 × 2KB = 14MB/năm
watchlist + decisions: <5MB
─────────────────────────────────────
Total ~100MB sau 1 năm. Xa free tier 500MB.
```

---

## 2. Auth setup (Q2)

### 2.1. Decision: **Supabase Auth + GitHub OAuth**

Lý do (vs NextAuth, Clerk):
- Free 50k MAU
- Không cần service mới (đã có Supabase trong stack)
- RLS auto với `auth.uid()` SQL function
- Setup ~30 phút cho solo dev

### 2.2. Public vs Authenticated routes

| Route | Public | Auth required | Admin only |
|---|---|---|---|
| `/` Dashboard | ✅ | | |
| `/trending` | ✅ | | |
| `/movers` | ✅ | | |
| `/collections`, `/collections/[slug]` | ✅ | | |
| `/languages`, `/languages/[lang]` | ✅ | | |
| `/compare` | ✅ | | |
| `/repo/[owner]/[repo]` | ✅ (read) | (write actions) | |
| `/radar` | ✅ | | |
| `/digest` | ✅ | | |
| `/chat` | ✅ | | |
| `/login` | ✅ | | |
| `/watchlist` | | ✅ | |
| `/decisions` | | ✅ | |
| `/settings` | | | ✅ |
| `/api/cron/*` | (auth via CRON_SECRET) | | |
| `/api/watchlists/*` | | ✅ | |
| `/api/decisions/*` | | ✅ | |

### 2.3. Setup steps (solo dev, 30 phút)

```text
1. Supabase Dashboard → Authentication → Providers → Enable GitHub
2. https://github.com/settings/developers → New OAuth App
   - Application name: "Agent Radar"
   - Homepage URL: https://doscom-radar.vercel.app
   - Authorization callback URL:
     https://bkgzfuhprvqzmhqzlmvt.supabase.co/auth/v1/callback
3. Copy Client ID + Client Secret → paste vào Supabase GitHub provider
4. Add env: NEXT_PUBLIC_SITE_URL=https://doscom-radar.vercel.app
5. Tạo lib/supabase/auth.ts với signInWithGitHub() + signOut()
6. Tạo /login page (1 nút "Sign in with GitHub")
7. Tạo middleware.ts protect routes /watchlist, /decisions, /settings
8. Tạo /api/auth/callback/route.ts handle redirect
```

### 2.4. RLS quick rules

```sql
-- watchlist_items: chỉ owner đọc/sửa
alter table watchlist_items enable row level security;

create policy "users see own watchlist items"
  on watchlist_items for select
  using (auth.uid() = user_id);

create policy "users manage own watchlist items"
  on watchlist_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- radar_decisions: cũng chỉ owner
alter table radar_decisions enable row level security;

create policy "users see own decisions"
  on radar_decisions for all
  using (auth.uid() = decided_by)
  with check (auth.uid() = decided_by);
```

---

## 3. Doscom Focus Config (Q3)

### 3.1. File `lib/config/doscom-focus.ts`

```ts
// Doscom Holdings — internal company OS, AI agent dev, automation, ecommerce.
// Refine config dần khi thấy false positive/negative.
export const DOSCOM_FOCUS = {
  // High relevance — direct fit cho roadmap Doscom
  high: {
    topics: [
      // AI/Agent (top priority)
      "ai-agent", "agent", "agents", "llm", "rag", "mcp",
      "anthropic", "claude", "openai", "gpt",
      // Automation & workflow
      "automation", "workflow", "no-code", "low-code",
      // Dev productivity
      "devtool", "developer-tools",
      // Business apps (Doscom core)
      "crm", "erp", "hr", "ecommerce", "business",
      "internal-tool", "company-os",
      // Data & insights
      "analytics", "observability", "dashboard",
    ],
    languages: ["TypeScript", "Python"],
    collections: [
      "artificial-intelligence",
      "ai-coding-agent",
      "low-code-development-tool",
      "business-intelligence",
      "web-framework",
      "headless-cms",
    ],
  },
  // Medium — support infrastructure
  medium: {
    topics: [
      "data-pipeline", "etl", "monitoring",
      "kubernetes", "k8s", "serverless", "container",
      "vector-database", "embedding",
    ],
    languages: ["Go", "Rust", "Java"],
    collections: [
      "time-series-database",
      "graph-database",
      "apm-tool",
      "google-analytics-alternative",
    ],
  },
  // Low — không phải core business
  low: {
    topics: [
      "game", "gamedev", "godot",
      "crypto", "blockchain", "nft", "defi", "web3",
      "mobile-only", "ios-only", "android-only",
    ],
    languages: ["Solidity", "Move", "Cairo"],
    collections: [
      "game-engine",
      "javascript-game-engine",
    ],
  },
};

export type RelevanceTier = "high" | "medium" | "low" | "none";
```

### 3.2. Relevance score formula

```ts
// lib/scoring/relevance.ts
export function computeRelevance(repo: {
  topics: string[] | null;
  language: string | null;
  description: string | null;
  collectionSlugs: string[];
}): { score: number; tier: RelevanceTier; matchedTokens: string[] } {
  const topics = (repo.topics ?? []).map((t) => t.toLowerCase());
  const desc = (repo.description ?? "").toLowerCase();
  const matched: string[] = [];

  let highHit = 0,
    mediumHit = 0,
    lowHit = 0;

  // Topic match
  for (const t of DOSCOM_FOCUS.high.topics) {
    if (topics.includes(t) || desc.includes(t)) {
      highHit++;
      matched.push(`topic:${t}`);
    }
  }
  for (const t of DOSCOM_FOCUS.medium.topics) {
    if (topics.includes(t) || desc.includes(t)) {
      mediumHit++;
      matched.push(`topic:${t}`);
    }
  }
  for (const t of DOSCOM_FOCUS.low.topics) {
    if (topics.includes(t) || desc.includes(t)) {
      lowHit++;
      matched.push(`topic-low:${t}`);
    }
  }

  // Language
  if (repo.language && DOSCOM_FOCUS.high.languages.includes(repo.language)) {
    highHit++;
    matched.push(`lang:${repo.language}`);
  } else if (
    repo.language &&
    DOSCOM_FOCUS.medium.languages.includes(repo.language)
  ) {
    mediumHit++;
  } else if (
    repo.language &&
    DOSCOM_FOCUS.low.languages.includes(repo.language)
  ) {
    lowHit++;
  }

  // Collection
  for (const c of repo.collectionSlugs) {
    if (DOSCOM_FOCUS.high.collections.includes(c)) {
      highHit++;
      matched.push(`coll:${c}`);
    } else if (DOSCOM_FOCUS.medium.collections.includes(c)) mediumHit++;
    else if (DOSCOM_FOCUS.low.collections.includes(c)) lowHit++;
  }

  // Score: high hit = 30, medium = 15, low = -25 each
  let score = highHit * 30 + mediumHit * 15 - lowHit * 25;
  score = Math.max(0, Math.min(100, score));

  const tier: RelevanceTier =
    score >= 70 ? "high" : score >= 40 ? "medium" : score > 0 ? "low" : "none";

  return { score, tier, matchedTokens: matched };
}
```

---

## 4. Solo dev simplifications (Q4)

### 4.1. Schema simplify

V2 doc đề xuất `team_watchlists` + `watchlist_items`. Solo bỏ `team_watchlists`:

```sql
-- Simplified for solo
create table watchlist_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  repo_id         bigint not null references repositories(id) on delete cascade,
  status          text not null default 'follow' check (
    status in ('follow', 'review', 'test', 'adopt', 'ignore', 'caution')
  ),
  priority        text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  reason          text,
  next_review_at  date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, repo_id)
);

create table radar_decisions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  repo_id           bigint not null references repositories(id) on delete cascade,
  decision          text not null check (
    decision in ('follow', 'review', 'test', 'adopt', 'ignore', 'caution')
  ),
  previous_decision text,
  decision_reason   text not null,
  test_plan         text,
  risk_note         text,
  due_date          date,
  result_note       text,
  decided_at        timestamptz not null default now()
);
```

### 4.2. UI simplifications

| V2 §12 đề xuất | Solo simplify |
|---|---|
| §12.4 Watchlist filter "Owner" | ❌ Bỏ (chỉ có 1 user) |
| §9.4 Decision page "Owner Load" | ❌ Bỏ |
| §11.5 Decision reminder Slack/email | ❌ Bỏ Phase 3, badge UI thôi |
| §6.7 `team_watchlists` | ❌ Bỏ, dùng `user_id` trên items |
| Multi-watchlist | ❌ Bỏ, 1 watchlist/user |

---

## 5. Scoring formulas (gap-fill cho V2 §7)

V2 doc có weights nhưng thiếu công thức. Đây là implementation cụ thể:

### 5.1. Heat Score (giữ nguyên formula hiện tại)

```ts
// Đã có ở lib/heat.ts — không đổi
heat = round(min(velocity * 0.65 + scale * 0.35 + rankBonus, 1) * 100)
where:
  velocity = min(stars_gained / max(total_stars, 1), 1)
  scale    = min(log10(total_stars + 1) / 6, 1)
  rankBonus = max(0, (26 - rank) / 25) * 0.15
```

### 5.2. Growth Score

```ts
// lib/scoring/growth.ts
export function computeGrowth(metrics: {
  stars_delta_1d: number | null;
  stars_delta_7d: number | null;
  stars_delta_30d: number | null;
  forks_delta_7d: number | null;
  total_stars: number | null;
}): number {
  const total = metrics.total_stars ?? 1;
  const d1 = metrics.stars_delta_1d ?? 0;
  const d7 = metrics.stars_delta_7d ?? 0;
  const d30 = metrics.stars_delta_30d ?? 0;
  const f7 = metrics.forks_delta_7d ?? 0;

  // Daily velocity (% of total stars in last day)
  const dailyVel = (d1 / total) * 100;
  // 7-day momentum
  const weekVel = (d7 / total) * 100;
  // Sustained growth (30d)
  const monthVel = (d30 / total) * 100;
  // Fork engagement
  const forkRatio = f7 / Math.max(d7, 1);

  // Composite — emphasize 7d (signal vs noise)
  const score =
    Math.min(dailyVel * 5, 30) + // up to 30
    Math.min(weekVel * 2, 40) + // up to 40
    Math.min(monthVel * 1, 20) + // up to 20
    Math.min(forkRatio * 50, 10); // up to 10

  return Math.round(Math.max(0, Math.min(100, score)));
}
```

### 5.3. Activity Score

```ts
// lib/scoring/activity.ts
export function computeActivity(metrics: {
  commits_30d: number | null;
  prs_merged_30d: number | null;
  prs_open_30d: number | null;
  issues_closed_30d: number | null;
  pushed_within_days: number | null;
  latest_release_at: Date | null;
}): number {
  const c30 = metrics.commits_30d ?? 0;
  const m30 = metrics.prs_merged_30d ?? 0;
  const i30 = metrics.issues_closed_30d ?? 0;
  const pushDays = metrics.pushed_within_days ?? 999;
  const releaseAge = metrics.latest_release_at
    ? (Date.now() - metrics.latest_release_at.getTime()) / 86400000
    : 999;

  const commitScore = Math.min(c30 * 0.5, 30); // 60 commits → 30 pts
  const prScore = Math.min(m30 * 4, 25); // 6+ merged PRs → 25 pts
  const issueScore = Math.min(i30 * 2, 15); // 7+ closed issues → 15 pts
  const recencyScore = pushDays <= 7 ? 20 : pushDays <= 30 ? 10 : 0;
  const releaseScore = releaseAge <= 90 ? 10 : releaseAge <= 180 ? 5 : 0;

  return Math.round(commitScore + prScore + issueScore + recencyScore + releaseScore);
}
```

### 5.4. Community Score

```ts
// lib/scoring/community.ts
export function computeCommunity(metrics: {
  contributors_count: number | null;
  total_stars: number | null;
  prs_open_30d: number | null;
  issues_opened_30d: number | null;
  issues_closed_30d: number | null;
}): number {
  const contributors = metrics.contributors_count ?? 0;
  const stars = metrics.total_stars ?? 1;
  const prsOpen = metrics.prs_open_30d ?? 0;
  const opened = metrics.issues_opened_30d ?? 0;
  const closed = metrics.issues_closed_30d ?? 0;

  // Contributor diversity — log scale (1-1000+)
  const contribScore = Math.min((Math.log10(contributors + 1) / 3) * 40, 40);
  // Star-to-contributor ratio (low = healthy community)
  const ratioScore = stars / Math.max(contributors, 1);
  const healthScore = ratioScore < 100 ? 25 : ratioScore < 1000 ? 15 : 5;
  // Issue close ratio
  const closeRatio = closed / Math.max(opened, 1);
  const responseScore = Math.min(closeRatio * 25, 25);
  // External engagement (PRs from non-maintainers — proxy: high PR count)
  const engagementScore = Math.min(prsOpen, 10);

  return Math.round(
    contribScore + healthScore + responseScore + engagementScore,
  );
}
```

### 5.5. Maintenance Score

```ts
// lib/scoring/maintenance.ts
export function computeMaintenance(metrics: {
  pushed_at: Date | null;
  latest_release_at: Date | null;
  issues_closed_30d: number | null;
  issues_opened_30d: number | null;
  archived: boolean;
  disabled: boolean;
}): number {
  if (metrics.archived || metrics.disabled) return 0;

  const now = Date.now();
  const pushDays = metrics.pushed_at
    ? (now - metrics.pushed_at.getTime()) / 86400000
    : 999;
  const releaseDays = metrics.latest_release_at
    ? (now - metrics.latest_release_at.getTime()) / 86400000
    : 999;

  // Recent push (50% weight)
  const pushScore =
    pushDays <= 7 ? 50 :
    pushDays <= 30 ? 35 :
    pushDays <= 90 ? 20 :
    pushDays <= 180 ? 10 : 0;
  // Recent release (30% weight)
  const releaseScore =
    releaseDays <= 30 ? 30 :
    releaseDays <= 90 ? 20 :
    releaseDays <= 180 ? 10 : 0;
  // Issue responsiveness (20% weight)
  const closed = metrics.issues_closed_30d ?? 0;
  const opened = metrics.issues_opened_30d ?? 0;
  const responsiveness = closed / Math.max(opened, 1);
  const responseScore = Math.min(responsiveness * 20, 20);

  return Math.round(pushScore + releaseScore + responseScore);
}
```

### 5.6. Risk Score (penalty)

```ts
// lib/scoring/risk.ts — returns penalty 0..100
export function computeRiskPenalty(repo: {
  archived: boolean;
  disabled: boolean;
  fork: boolean;
  license_key: string | null;
  pushed_at: Date | null;
  latest_release_at: Date | null;
  contributors_count: number | null;
  stars_delta_1d: number | null;
  total_stars: number | null;
  commits_30d: number | null;
  issues_opened_30d: number | null;
  issues_closed_30d: number | null;
}): { penalty: number; flags: string[] } {
  const flags: string[] = [];
  let penalty = 0;

  if (repo.archived) {
    flags.push("archived");
    penalty += 80;
  }
  if (repo.disabled) {
    flags.push("disabled");
    penalty += 80;
  }
  if (!repo.license_key) {
    flags.push("no_license");
    penalty += 30;
  }
  if (repo.fork) {
    flags.push("forked_repo");
    penalty += 20;
  }

  const now = Date.now();
  if (repo.pushed_at) {
    const pushDays = (now - repo.pushed_at.getTime()) / 86400000;
    if (pushDays > 180) {
      flags.push("stale_repo");
      penalty += 25;
    }
  }
  if (repo.latest_release_at) {
    const days = (now - repo.latest_release_at.getTime()) / 86400000;
    if (days > 365) {
      flags.push("no_recent_release");
      penalty += 10;
    }
  }
  if ((repo.contributors_count ?? 0) <= 1) {
    flags.push("single_maintainer_risk");
    penalty += 15;
  }

  // Star spike without activity
  const d1 = repo.stars_delta_1d ?? 0;
  const total = repo.total_stars ?? 1;
  if (d1 / total > 0.3 && (repo.commits_30d ?? 0) < 5) {
    flags.push("star_spike_without_activity");
    penalty += 25;
  }

  // Issue backlog
  const opened = repo.issues_opened_30d ?? 0;
  const closed = repo.issues_closed_30d ?? 0;
  if (opened > 50 && closed / opened < 0.2) {
    flags.push("issue_backlog");
    penalty += 15;
  }

  return { penalty: Math.min(100, penalty), flags };
}
```

### 5.7. Radar Score (composite)

```ts
// lib/scoring/index.ts
export function computeRadarScore(scores: {
  growth: number;
  activity: number;
  community: number;
  maintenance: number;
  relevance: number;
  riskPenalty: number;
}): number {
  const weighted =
    scores.growth * 0.25 +
    scores.activity * 0.2 +
    scores.community * 0.2 +
    scores.maintenance * 0.15 +
    scores.relevance * 0.2;
  return Math.round(Math.max(0, Math.min(100, weighted - scores.riskPenalty)));
}

// Recommendation rule (V2 §7.3)
export function computeRecommendation(s: {
  radar: number;
  risk: number;
  maintenance: number;
  relevance: number;
  growth: number;
  flags: string[];
}): { recommendation: string; confidence: "high" | "medium" | "low" } {
  if (s.flags.includes("archived")) {
    return { recommendation: "ignore", confidence: "high" };
  }
  if (s.radar >= 80 && s.risk <= 25 && s.maintenance >= 60 && s.relevance >= 70) {
    return { recommendation: "adopt", confidence: "high" };
  }
  if (s.radar >= 65 && s.risk <= 40 && s.relevance >= 60) {
    return { recommendation: "test", confidence: s.flags.length === 0 ? "high" : "medium" };
  }
  if (s.growth > 70 && s.risk > 50) {
    return { recommendation: "caution", confidence: "medium" };
  }
  if (s.radar >= 50) {
    return { recommendation: "follow", confidence: "medium" };
  }
  return { recommendation: "ignore", confidence: "high" };
}
```

---

## 6. GraphQL query template

Single query thay 4-5 REST calls:

```ts
// lib/github-graphql.ts
const REPO_ENRICHMENT_QUERY = `
  query RepoEnrichment($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      databaseId
      nameWithOwner
      description
      homepageUrl
      url
      isArchived
      isDisabled
      isFork
      pushedAt
      createdAt
      updatedAt
      stargazerCount
      forkCount
      watchers { totalCount }
      defaultBranchRef { name }
      licenseInfo { key name spdxId }
      primaryLanguage { name }
      repositoryTopics(first: 20) {
        nodes { topic { name } }
      }
      releases(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes { publishedAt tagName }
      }
      defaultBranchRef {
        target {
          ... on Commit {
            history(since: $since) {
              totalCount
            }
          }
        }
      }
      pullRequests(states: MERGED, first: 1) { totalCount }
      issues(states: OPEN) { totalCount }
      mentionableUsers(first: 5) {
        totalCount
        nodes { login avatarUrl }
      }
    }
  }
`;
```

→ 1 call thay 5 REST calls. Quota: 200 repos/day × 1 call = 200/day << 5000/h.

---

## 7. Daily cron chain

Vì Vercel Hobby chỉ 2 cron, mình chain trong 1 endpoint:

```ts
// app/api/cron/daily/route.ts
export const runtime = "nodejs";
export const maxDuration = 60; // Hobby max
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Auth
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log: string[] = [];
  const start = Date.now();

  try {
    // 1. Snapshot trending (~5s)
    log.push("step:snapshot");
    const buckets = await fetchAllTrending();
    const inserted = await upsertSnapshots(...);
    log.push(`snapshot.ok inserted=${inserted}`);

    // 2. Enrich top 200 repos via GraphQL (~25s)
    log.push("step:enrich");
    const targets = await selectTopRepos(200);
    const enriched = await enrichRepos(targets); // batched, GraphQL
    log.push(`enrich.ok count=${enriched.length}`);

    // 3. Compute scores (~5s, pure CPU)
    log.push("step:score");
    const scored = await computeAndStoreScores(targets);
    log.push(`score.ok count=${scored}`);

    // 4. Generate AI insights for top 20 (~15s)
    log.push("step:insight");
    const top20 = await selectTopByRadarScore(20);
    const insights = await generateInsightsBatch(top20); // 20 sequential Claude calls
    log.push(`insight.ok count=${insights.length}`);

    // 5. Pruning (idempotent, runs once/week effectively)
    log.push("step:prune");
    const pruned = await pruneOldData();
    log.push(`prune.ok ${JSON.stringify(pruned)}`);

    return Response.json({
      ok: true,
      duration_ms: Date.now() - start,
      log,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        log,
        error: err instanceof Error ? err.message : String(err),
        duration_ms: Date.now() - start,
      },
      { status: 500 },
    );
  }
}
```

`vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/daily", "schedule": "0 1 * * *" }
  ]
}
```

→ Tổng ~50s, dưới 60s timeout. Đảm bảo idempotent (upsert, dedup).

---

## 8. AI Insight cap mechanism

```ts
// lib/actions.ts (thay generateInsight cũ)
export async function generateInsightsBatch(
  topRepos: { repo_id: number; full_name: string }[],
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = createAdminClient();

  // Skip nếu đã có insight cho hôm nay
  const { data: existing } = await supabase
    .from("repo_insights")
    .select("repo_id")
    .eq("insight_date", today);

  const existingSet = new Set((existing ?? []).map((r) => r.repo_id));
  const todo = topRepos.filter((r) => !existingSet.has(r.repo_id)).slice(0, 20);

  let count = 0;
  for (const r of todo) {
    try {
      const insight = await generateOneInsight(r.repo_id);
      await supabase.from("repo_insights").upsert({
        repo_id: r.repo_id,
        insight_date: today,
        ...insight,
        prompt_version: "v2.0",
        model: "claude-sonnet-4-6",
      });
      count++;
    } catch (err) {
      console.error(`insight ${r.full_name} failed:`, err);
      // continue, don't block other repos
    }
  }

  return count;
}
```

Hard cap **20 calls/day** = **600/tháng** ≈ $1.20/tháng (Sonnet 4.6) hoặc $0.20 (Haiku 4.5).

---

## 9. Pruning strategy

```sql
-- lib/storage.ts pruneOldData() — chạy daily, idempotent
delete from repo_metrics_daily
where metric_date < current_date - interval '90 days';

delete from repo_activity_events
where created_at < now() - interval '30 days';

delete from repo_insights
where insight_date < current_date - interval '180 days';

-- Drop repos không trending 30 ngày + không trong watchlist
delete from repositories r
where not exists (
  select 1 from trending_snapshots t
  where t.owner = r.owner and t.repo = r.repo
    and t.captured_at >= current_date - interval '30 days'
)
and not exists (
  select 1 from watchlist_items w where w.repo_id = r.id
);
```

---

## 10. Migration plan V1 → V2

### 10.1. Tổng quát

V1 hiện đang chạy. Migration phải zero-downtime, idempotent.

### 10.2. Steps

```text
Step 1 — Schema migration (idempotent SQL)
  - Tạo db/schema.v2.sql với create table if not exists cho 6 bảng mới
  - Run trên Supabase SQL Editor (1 lần)

Step 2 — Code deploy
  - Deploy code mới với storage.ts đã hỗ trợ cả V1 + V2 schema
  - Cron mới /api/cron/daily replace /api/cron/snapshot trong vercel.json

Step 3 — Backfill repositories table
  - Run script scripts/backfill-repositories.mjs
  - Đọc unique (owner, repo) từ trending_snapshots → insert vào repositories
  - Mark last_enriched_at = null → cron tiếp theo sẽ enrich

Step 4 — Watchlist localStorage migration
  - Trong /watchlist v2, nếu user đăng nhập lần đầu:
    - Đọc localStorage `agent.watchlist`
    - POST /api/watchlists/migrate — server insert vào watchlist_items
    - Sau khi success, clear localStorage
  - User chưa đăng nhập: vẫn dùng localStorage (backward compat)

Step 5 — Verify
  - Curl /api/cron/daily với CRON_SECRET → confirm step 1-5 chạy ok
  - Check repositories table có >=100 rows
  - Check repo_metrics_daily có ngày hôm nay
  - Check repo_scores có ngày hôm nay
  - Check repo_insights có 20 rows
```

### 10.3. Rollback

```text
Nếu V2 cron fail repeatedly:
  - Revert vercel.json về /api/cron/snapshot (V1)
  - Bảng V2 để đó (không xóa) — đợi fix code rồi enable lại
  - V1 trending_snapshots vẫn chạy độc lập, không phụ thuộc V2
```

---

## 11. Cost telemetry

Track API/AI usage để biết khi gần budget:

```sql
create table cost_telemetry (
  id              bigint generated always as identity primary key,
  recorded_at     timestamptz not null default now(),
  resource        text not null check (resource in (
    'github_graphql', 'github_rest', 'anthropic_input', 'anthropic_output',
    'supabase_egress'
  )),
  units           int not null,           -- requests for API, tokens for AI
  estimated_cost  numeric(10,6),          -- USD
  job_run_id      uuid,
  metadata        jsonb
);

create index cost_telemetry_recorded_idx on cost_telemetry (recorded_at desc);
create index cost_telemetry_resource_idx on cost_telemetry (resource, recorded_at desc);
```

Helper:
```ts
// lib/telemetry.ts
export async function trackCost(
  resource: string,
  units: number,
  cost: number,
  metadata?: Record<string, unknown>,
) {
  await createAdminClient()
    .from("cost_telemetry")
    .insert({ resource, units, estimated_cost: cost, metadata });
}
```

Settings page bổ sung block:
```text
This month:
  GitHub GraphQL: 6,200 calls / unlimited (free)
  Anthropic Sonnet: 480 input + 240 output tokens × 20 calls = $0.40
  Supabase egress: 87 MB / 2 GB
  Total: $0.40 / projected $0.50 monthly
```

---

## 12. Acceptance criteria điều chỉnh cho solo

### 12.1. V1.5 (Phase 1 done) — 5 ngày

```text
- repositories table có ít nhất 100 rows enriched
- repo_metrics_daily có ngày hôm nay với 100+ rows
- /repo/[owner]/[repo] hiển thị: forks, license, pushed_at, topics
- GraphQL client + smoke test pass
- /api/cron/daily chạy < 60s, success
- Build/typecheck pass
- Cost telemetry < $1/tháng
```

### 12.2. V1.7 (Phase 2 done) — +7 ngày = 12 ngày total

```text
- repo_scores có 100+ rows hôm nay
- /repo/[owner]/[repo] hiển thị Radar Score breakdown
- Dashboard có "Top Test Candidates" + "High Risk Popular"
- Compare table có Radar Score, Risk Score, License, Last Pushed columns
- Đã review thủ công top 20 — score hợp lý (>80% match expectation)
```

### 12.3. V1.9 (Phase 3 done — solo simplify) — +5 ngày = 17 ngày total

```text
- Auth GitHub OAuth chạy được
- /watchlist v2 dùng server-side (watchlist_items)
- Migration từ localStorage thành công
- /decisions page có queue/timeline
- Action buttons Follow/Test/Adopt/Ignore trên repo detail hoạt động
- RLS test: user A không thấy watchlist user B
```

### 12.4. V2.0 (Phase 4 done) — +5 ngày = 22 ngày total

```text
- repo_insights có 20 rows/ngày
- AI insight có evidence ≥ 3 + confidence
- JSON schema validation pass cho 100% insights
- Cost telemetry < $5/tháng
- Acceptance test: 5 repo được manual test (status='test'), có owner, deadline
```

---

## 13. Revised Roadmap (solo dev)

| Phase | Days | Output |
|---|---:|---|
| 0 — Stabilize | 1 | Smoke tests + lint + build pass |
| 0.5 — Configs | 1 | `lib/config/doscom-focus.ts` + acceptance criteria written |
| 1 — Enrichment | 5 | GraphQL client + repositories + repo_metrics_daily + cron daily |
| 2 — Scoring | 7 | 7 score modules + repo_scores + Dashboard updates |
| 3 — Auth + Watchlist + Decisions | 5 | GitHub OAuth + watchlist server + decisions page |
| 4 — AI Insight evidence | 5 | repo_insights + JSON validation + UI display |
| **Total V2** | **24 ngày** | Full V2 production |

Sau V2 (optional):
- Phase 5+: Lark/Slack alerts (1 ngày)
- Phase 6+: GH Archive (chỉ khi 1000+ repos)

---

## 14. Risk flag conditions (consolidated)

| Flag | Condition | Penalty |
|---|---|---:|
| `archived` | `repositories.archived = true` | 80 |
| `disabled` | `repositories.disabled = true` | 80 |
| `no_license` | `license_key is null` | 30 |
| `forked_repo` | `fork = true` | 20 |
| `stale_repo` | `pushed_at < now() - 180 days` | 25 |
| `no_recent_release` | `latest_release_at < now() - 365 days` | 10 |
| `single_maintainer_risk` | `contributors_count <= 1` | 15 |
| `star_spike_without_activity` | `stars_delta_1d / total_stars > 0.3 AND commits_30d < 5` | 25 |
| `issue_backlog` | `issues_opened_30d > 50 AND closed/opened < 0.2` | 15 |

Adopt block: nếu có `archived`, `disabled`, `no_license` → **không thể** recommend `adopt`.

---

## 15. Backtesting plan (gap-fill cho Phase 2)

Trước khi ship scoring lên prod:

```text
1. Tạo scripts/backtest-scoring.mjs
2. Lấy 50 repos đã có data trong repositories + repo_metrics_daily
3. Tính scores theo formulas
4. Print bảng: name | radar_score | recommendation | top 3 reasons
5. Manual review:
   - Repo nổi tiếng đáng adopt có recommendation='adopt'? (e.g., facebook/react, vercel/next.js)
   - Repo viral nhỏ có 'caution' hoặc 'follow'?
   - Repo stale có 'ignore'?
6. Nếu match >80% expectation → ship. Nếu không → tune weights/thresholds.
```

---

## 16. Implementation priorities (final order)

```text
0. Stabilize hiện trạng (smoke tests, build green)
0.5. Write config files (doscom-focus.ts, scoring-weights.ts)
1. Schema V2 SQL + apply lên Supabase
2. lib/github-graphql.ts client
3. /api/cron/daily endpoint (chained)
4. Backfill repositories từ trending_snapshots
5. Scoring modules (7 files: heat, growth, activity, community, maintenance, relevance, risk)
6. /api/cron/daily includes scoring step
7. Backtest harness + tune
8. Repo detail UI updates (score breakdown, license, pushed_at)
9. Dashboard "Top Test Candidates" + "High Risk Popular"
10. Compare table extended cols
11. Auth setup (Supabase + GitHub OAuth)
12. Watchlist server-side migration
13. /decisions page
14. Action buttons on repo detail
15. AI insight contract + validation
16. /api/cron/daily includes insight step
17. Repo detail UI: AI insight với evidence + confidence
18. Cost telemetry table + Settings page block
19. Acceptance test V2.0 — 5 repos in 'test' status
```

Không đảo thứ tự. Mỗi step phải pass CI (typecheck + build) trước khi sang step tiếp.

---

**Tổng**: 16 sections, ~24 ngày solo dev, free tier toàn bộ. Sau V2.0 mới cân nhắc paid (Vercel Pro $20/mo nếu cần >2 cron jobs hoặc longer functions).
