# Agent Radar — Kiến trúc dự án (V2 hoàn thiện)

> **Project**: GitHub Radar Intelligence Platform · Doscom Holdings
> **Path**: `C:\Users\ADMIN\.gemini\antigravity\Agent`
> **Live**: https://doscom-radar.vercel.app
> **Repo**: https://github.com/junnguyen2022/doscom-radar
> **Cập nhật**: 2026-05-07 — sau khi hoàn thành V2 Phase 0-4

> Companion docs:
> - `AGENT_RADAR_ARCHITECTURE_V2.md` — kiến trúc V2 đề xuất + roadmap (lịch sử)
> - `ARCHITECTURE_V2_DECISIONS.md` — locked decisions + implementation appendices

---

## 1. Tổng quan

**Agent Radar** = GitHub trending tracker + scoring engine + AI insight + decision workflow.

Pipeline mỗi ngày:

```
github.com/trending HTML
        ↓ scrape (cheerio)
trending_snapshots (47 rows × 3 timeframe)
        ↓ enrich (GitHub GraphQL, top 20 by rank)
repositories + repo_metrics_daily (metadata + metrics + 30d windows)
        ↓ score (lib/scoring/* — 7 modules)
repo_scores (heat/growth/activity/community/maintenance/relevance/risk + radar)
        ↓ AI insight (Claude Sonnet 4.6, top 5 by radar_score)
repo_insights (summary + 4 sections + evidence + recommendation/confidence)
```

User flow: dashboard → trending list → repo detail → ★ pin → ⚖ Follow/Test/Adopt/Ignore → log

---

## 2. Tech stack

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Framework | Next.js 15.5 (App Router) | Server Components mặc định |
| Language | TypeScript 5.6 (strict) | Path alias `@/*` |
| UI | Tailwind 3.4 + lucide-react + Inter font | Dark mode `class`-based |
| State (client) | React Context (theme/lang/watchlist/user) | Auth-aware |
| DB | Supabase Postgres | 7 tables (V1+V2+V3+V4) |
| Auth | Supabase Auth + GitHub OAuth | RLS-enforced |
| AI | Anthropic SDK (`claude-sonnet-4-6`) | Tool-use forced JSON, prompt caching |
| Scraper | Cheerio (parse HTML `github.com/trending`) | |
| GitHub data | GraphQL (1 query/repo) | + 4 search aliases for 30d windows |
| Cron | Vercel Cron daily 01:00 UTC | Chained: snapshot → enrich → score → insight |
| Hosting | Vercel Hobby | Free tier — 60s function timeout |

---

## 3. Cấu trúc thư mục đầy đủ (130 source files)

```
Agent/
├── CLAUDE.md, ARCHITECTURE.md (this), ARCHITECTURE_V2_DECISIONS.md, AGENT_RADAR_ARCHITECTURE_V2.md
├── package.json, tsconfig.json, tailwind.config.ts, next.config.mjs
├── postcss.config.mjs, vercel.json, .env.example, .gitignore
├── middleware.ts                       # NEW V3: refresh Supabase session
│
├── .claude/                            # Claude Code config
├── .mcp.json                           # MCP servers (postgres, github)
├── skills/ (5)                         # Auto-activated skills
├── agents/ (4)                         # Subagent definitions
│
├── db/                                 # 5 SQL schema files
│   ├── schema.sql                      # V1: trending_snapshots
│   ├── schema.v2.sql                   # V2 P1: repositories + repo_metrics_daily + cost_telemetry
│   ├── schema.v2.scoring.sql           # V2 P2: repo_scores
│   ├── schema.v3.auth.sql              # V2 P3: watchlist_items + radar_decisions
│   └── schema.v4.insights.sql          # V2 P4: repo_insights
│
├── scripts/ (5 mjs)                    # One-off tools
│   ├── build-collections.mjs           # YAML → TS converter
│   ├── smoke-trending.mjs              # Test scraper without DB
│   ├── backfill-repositories.mjs       # Bootstrap from trending_snapshots
│   ├── smoke-enrichment.mjs            # Test GraphQL enrich locally
│   └── backtest-scoring.mjs            # Verify scoring formulas
│
├── app/                                # Next.js App Router
│   ├── layout.tsx, globals.css         # Root with AppProvider, Nav, Footer, Inter
│   │
│   ├── page.tsx                        # Dashboard
│   ├── chat/page.tsx                   # Claude chat
│   ├── trending/page.tsx               # Filterable list
│   ├── movers/page.tsx                 # Risers/fallers/new/dropped
│   │
│   ├── collections/
│   │   ├── page.tsx, [slug]/page.tsx   # 138 OSSInsight collections
│   ├── languages/
│   │   ├── page.tsx, [lang]/page.tsx
│   ├── compare/page.tsx, CompareInput.tsx
│   ├── repo/[owner]/[repo]/page.tsx    # Repo analyze (full)
│   ├── radar/page.tsx                  # Tech Radar SVG
│   ├── watchlist/page.tsx              # Auth-aware (server/local)
│   ├── decisions/page.tsx              # NEW V3: Decision log
│   ├── digest/page.tsx, DigestClient.tsx
│   ├── settings/page.tsx, SettingsClient.tsx
│   ├── login/page.tsx, LoginButton.tsx # NEW V3: GitHub OAuth
│   │
│   └── api/
│       ├── chat/route.ts               # Streaming chat with Claude + tools
│       ├── snapshots/latest/route.ts   # Public read latest daily
│       ├── cron/snapshot/route.ts      # V1 cron (deprecated)
│       ├── cron/daily/route.ts         # V2 chained cron (CURRENT)
│       ├── auth/callback/route.ts      # V3: OAuth code exchange
│       ├── auth/signout/route.ts       # V3: session clear
│       ├── watchlists/items/route.ts   # V3: GET/POST/DELETE
│       └── decisions/route.ts          # V3: GET/POST
│
├── components/
│   ├── providers/AppProvider.tsx       # Context: theme/lang/watchlist/user. Auth-aware.
│   ├── nav/Nav.tsx                     # Glass nav 12 items + login/logout
│   ├── common/TextI18n.tsx
│   │
│   ├── ui/                             # Primitives (8)
│   │   ├── Badge, Button, Card, EmptyState
│   │   ├── LanguageDot (50 GitHub colors)
│   │   ├── PageHeader, Skeleton, StatCard
│   │
│   ├── filters/FilterBar.tsx
│   │
│   ├── repo/                           # Repo detail components
│   │   ├── RepoCard.tsx                # Used in lists
│   │   ├── Sparkline.tsx               # Inline rank-over-time SVG
│   │   ├── StarsHistoryChart.tsx       # Stars + Rank line charts
│   │   ├── SocialShare.tsx
│   │   ├── ScoreBreakdown.tsx          # NEW V2 P2: 7 progress bars
│   │   └── InsightCard.tsx             # NEW V2 P4: AI insight gradient card
│   │
│   ├── radar/TechRadar.tsx             # 4×4 SVG plot
│   │
│   ├── home/                           # Homepage sections
│   │   ├── Hero, AnimatedCounter, SnapshotHistoryChart
│   │   ├── HotCollections, TrendingTable, FAQ
│   │   └── TopTestCandidates.tsx       # NEW V2 P2: TopTestCandidates + HighRiskPopular
│   │
│   ├── decisions/DecisionPanel.tsx     # NEW V3: 6-button + form
│   ├── chat/ChatUI.tsx
│   └── watchlist/WatchButton.tsx       # Auth-aware (server vs localStorage)
│
├── lib/                                # Pure logic, no React
│   ├── github-trending.ts              # Cheerio scraper
│   ├── github-graphql.ts               # NEW V2 P1: GraphQL client (1 query + 4 search aliases)
│   ├── enrichment.ts                   # NEW V2 P1: pipeline (target select → batch → upsert)
│   │
│   ├── classify.ts                     # adopt/monitor/caution heuristic
│   ├── heat.ts                         # 0..100 composite
│   ├── radar.ts                        # Tech Radar quadrant + ring
│   ├── movers.ts                       # Compute risers/fallers/new/dropped
│   ├── digest.ts                       # Markdown generator
│   ├── filters.ts                      # URL params
│   ├── i18n.ts                         # VI/EN dictionary
│   │
│   ├── collections.ts                  # Helpers
│   ├── collections.data.ts             # 138 collections (auto-gen, 99KB)
│   │
│   ├── scoring/                        # NEW V2 P2: 7 score modules
│   │   ├── growth.ts, activity.ts, community.ts
│   │   ├── maintenance.ts, relevance.ts, risk.ts
│   │   └── index.ts                    # Composite + recommendation rule
│   ├── scoring-store.ts                # NEW V2 P2: bulk SQL + read helpers
│   │
│   ├── watchlist-store.ts              # NEW V3: server-side watchlist ops
│   ├── decisions-store.ts              # NEW V3: log + read decision history
│   │
│   ├── insight-contract.ts             # NEW V2 P4: types + Anthropic tool schema + validation
│   ├── insight-generator.ts            # NEW V2 P4: Claude tool-use call + parallel batch
│   │
│   ├── tools.ts                        # Claude tool registry
│   ├── anthropic.ts                    # Agent loop (chat)
│   ├── actions.ts                      # Server Actions
│   │
│   ├── config/                         # NEW V0.5: tunables
│   │   ├── doscom-focus.ts             # Topics × langs × collections (3 tier)
│   │   └── scoring-weights.ts          # Weights + thresholds + risk penalties
│   │
│   ├── storage.ts                      # Supabase OR JSON file facade
│   └── supabase/
│       ├── client.ts                   # Browser client (anon)
│       ├── server.ts                   # SSR client
│       ├── admin.ts                    # Service-role
│       └── auth.ts                     # NEW V3: getCurrentUser/profileFromUser
│
└── types/index.ts
```

---

## 4. Routes (24 total)

### Public — không cần auth

| Route | Mục đích |
|---|---|
| `/` | Dashboard với Hero + AI Insight + Top Test Candidates + High Risk + Hot Collections + Trending Table + FAQ |
| `/trending` | Full filterable list (timeframe, lang, search, sort, classes, collection, min stars) |
| `/movers` | Risers/fallers/new/dropped buckets |
| `/collections` | 138 OSSInsight collections |
| `/collections/[slug]` | Collection detail + matched trending |
| `/languages` | Heat-bar aggregate |
| `/languages/[lang]` | Repos của 1 ngôn ngữ |
| `/compare` | Side-by-side bảng so sánh repos |
| `/repo/[owner]/[repo]` | **Repo analyze**: hero + AI Insight + Score Breakdown + Decision Panel + Decision History + dual charts + collections + snapshots table |
| `/radar` | Tech Radar SVG (4 quadrants × 4 rings) |
| `/digest` | Markdown export |
| `/chat` | Claude chat UI |
| `/login` | GitHub OAuth login button |

### Auth-required

| Route | Mục đích |
|---|---|
| `/watchlist` | Pinned repos (server-backed when auth) |
| `/decisions` | Decision queue + timeline (server) |
| `/settings` | Manual snapshot + env health |

### API

| Route | Type | Auth |
|---|---|---|
| `/api/chat` | POST streaming | Public |
| `/api/snapshots/latest` | GET | Public |
| `/api/cron/daily` | GET (chained: snapshot→enrich→score→insight) | Bearer CRON_SECRET |
| `/api/cron/snapshot` | GET (V1 deprecated) | Bearer CRON_SECRET |
| `/api/auth/callback` | OAuth code exchange | Public |
| `/api/auth/signout` | POST | Auth |
| `/api/watchlists/items` | GET/POST/DELETE | Auth |
| `/api/decisions` | GET/POST | Auth |

---

## 5. Database schema (7 tables)

| Table | Purpose | RLS |
|---|---|---|
| `trending_snapshots` | Daily/weekly/monthly snapshots from scraper | Public read |
| `repositories` | Canonical metadata from GraphQL | Public read |
| `repo_metrics_daily` | Time-series stars/forks/issues/PRs/30d windows | Public read |
| `cost_telemetry` | Track API/AI usage | Public read |
| `repo_scores` | Daily scores (heat/growth/activity/community/maintenance/relevance/risk + radar) | Public read |
| `repo_insights` | AI-generated insights (summary + 4 sections + evidence + recommendation/confidence) | Public read |
| `watchlist_items` | Per-user pinned repos | Owner-only (RLS via auth.uid) |
| `radar_decisions` | Append-only decision log per (user, repo) | Owner-only |

Indexes: time-based (`captured_at desc`, `score_date desc`), composite for queries (`(timeframe, captured_at desc, rank)`), and GIN for `topics[]`.

Pruning strategy (manual for now): `repo_metrics_daily` after 90 days, `repo_activity_events` after 30 days, `repo_insights` after 180 days.

---

## 6. Daily cron flow (~43-50s, fits 60s Vercel Hobby)

```
GET /api/cron/daily (Bearer CRON_SECRET)
  ↓
Step 1 — snapshot (~3s)
  fetchAllTrending() × 3 timeframes via cheerio
  upsert trending_snapshots
  ↓
Step 2 — enrich (~30s)
  selectEnrichmentTargets(cap=20) — top union of latest daily/weekly/monthly
  fetchEnrichmentBatch via GraphQL (1 query/repo + 4 search aliases for 30d windows)
  upsert repositories + repo_metrics_daily
  computeStarsDeltas() — 1d/7d/30d windows
  ↓
Step 3 — score (~1s)
  Bulk-load all data (3 queries)
  Compute 7 scores in memory + composite Radar + recommendation rule
  Single bulk upsert to repo_scores
  ↓
Step 4 — insight (~14s, parallel cap=5, time-guard 45s)
  Top N by radar_score
  Promise.allSettled(generateOne) — Claude Sonnet 4.6 tool-use
  Validate + tolerate (downgrade adopt → test if missing risk_note)
  Upsert repo_insights (idempotent — skip if today's exists)
```

GraphQL quota: ~5 points/repo (1 main + 4 search), 20 repos = 100 pts/day, well under 5000/h.
Anthropic cost: ~5 calls × ~3000 input + ~800 output × Sonnet 4.6 ≈ $0.10/day = ~$3/month.

---

## 7. Scoring engine (Phase 2)

```
Radar Score = 25% Growth + 20% Activity + 20% Community
            + 15% Maintenance + 20% Relevance - Risk Penalty
```

| Score | Inputs |
|---|---|
| Heat | stars_gained, total_stars, rank |
| Growth | stars_delta_1d/7d/30d, forks_delta_7d, total_stars |
| Activity | commits_30d, prs_merged_30d, issues_closed_30d, push_recency, release_recency |
| Community | contributors_count, star/contributor ratio, issue close ratio, prs_open_30d |
| Maintenance | pushed_at, latest_release_at, close ratio. 0 nếu archived |
| Relevance | DOSCOM_FOCUS match (high/medium/low tier × topics+lang+collections) |
| Risk Penalty | 9 flags: archived, disabled, no_license, forked, stale, no_recent_release, single_maintainer (only <5k stars), star_spike, issue_backlog |

Recommendation rule:
- **Adopt**: radar≥80 + risk≤25 + maintenance≥60 + relevance≥70
- **Test**: radar≥65 + risk≤40 + relevance≥60
- **Caution**: growth>70 AND risk>50
- **Follow**: radar≥50
- **Ignore**: else

Hard blockers (override): `archived`/`disabled` → ignore. `no_license`/`disabled`/`archived` → cannot recommend adopt.

---

## 8. AI Insight contract (Phase 4)

Claude Sonnet 4.6 với forced tool-use. Output JSON validated:

```ts
{
  summary: string,             // 1-3 câu Vietnamese
  why_trending: string | null, // Why notable now
  technical_value: string | null,
  doscom_use_case: string | null,
  risk_note: string | null,    // Required khi adopt
  recommendation: 'adopt'|'test'|'follow'|'caution'|'ignore',
  confidence: 'high'|'medium'|'low',
  evidence: [{type, label, value, reason}, ...]
}
```

Validation:
- `adopt` requires risk_note ≥5 chars + evidence ≥2 items
- Else: downgrade adopt → test (don't reject)
- Coerce `evidence` to array nếu Claude trả non-array
- Skip invalid evidence items rather than fail

System prompt cached (5min ephemeral). Prompt version `v2.0`. Stored in `repo_insights.prompt_version` + `model`.

---

## 9. Auth flow (Phase 3 — Supabase + GitHub OAuth)

```
User clicks "Sign in" → /login
  ↓
LoginButton.signInWithOAuth({ provider: 'github' })
  ↓
GitHub OAuth (authorize)
  ↓
Supabase callback
  ↓
/api/auth/callback?code=... → exchangeCodeForSession()
  ↓
Set session cookie → redirect to next
  ↓
middleware.ts refreshes session on every request
  ↓
AppProvider.user state populated → UI shows avatar
```

Migration: AppProvider auto-migrates localStorage watchlist → server when first login (POST /api/watchlists/items per item, then clear localStorage).

RLS rules:
- `watchlist_items`: SELECT/INSERT/UPDATE/DELETE require `auth.uid() = user_id`
- `radar_decisions`: same pattern
- Other tables: public SELECT (anon), service-role only writes

---

## 10. Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `CRON_SECRET` | ✅ | Cron auth (Bearer header) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ prod | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ prod | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ prod | Server-only writes (bypass RLS) |
| `GITHUB_TOKEN` | ✅ prod | GraphQL enrichment (PAT scope public_repo) |
| `ANTHROPIC_API_KEY` | ⚠ optional | AI Insight (Phase 4). Skip if missing. |
| `DATABASE_URL` | optional | Postgres MCP (dev only) |

When Supabase env unset, `lib/storage.ts` falls back to `data/snapshots.json` (local demo).

---

## 11. How to run

```bash
# Dev
cd C:\Users\ADMIN\.gemini\antigravity\Agent
npm install
cp .env.example .env.local                    # fill keys
npm run dev                                   # http://localhost:3000

# Manual cron trigger
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily

# Local smoke
node scripts/smoke-trending.mjs daily
node scripts/backfill-repositories.mjs        # populate from snapshots
node scripts/smoke-enrichment.mjs 10          # enrich 10 repos
node scripts/backtest-scoring.mjs 20          # verify scoring

# Production
npm run typecheck && npm run build
git push origin main                          # Vercel auto-deploys
```

---

## 12. Phase status (V2)

| Phase | Estimate | Status | Commit |
|---|---|---|---|
| 0 — Stabilize | 1 ngày | ✅ done | b85a893 |
| 0.5 — Configs | 1 ngày | ✅ done | b85a893 |
| 1 — Enrichment | 5 ngày | ✅ done | c4c24b7 → 7504138 |
| 2 — Scoring | 7 ngày | ✅ done | 21b8ad7 → 0367cf7 |
| 2.5 — Data quality | bonus | ✅ done | afc9468 |
| 3 — Auth + Watchlist + Decisions | 5 ngày | ✅ done | 993f567 |
| 4 — AI Insight evidence | 5 ngày | ✅ done | b43f2e0 → 14278cb |

Total: ~24 ngày work nominal. Hoàn thành trong vài session.

---

## 13. What's next (V3 ideas, not committed)

- **Real contributors count** — current uses GraphQL `mentionableUsers` which undercounts. Add REST API call for true count.
- **Tech Radar decision overlay** — show team's decisions on the radar plot
- **Email/Slack alerts** — when a watchlist repo crosses score thresholds
- **GH Archive ingestion** — for historical events (per V2 doc §15.5 Phase 5)
- **Comparison playground** — multi-repo charts with overlays
- **Export decision log** — CSV/PDF for stakeholder reports
- **Mobile drawer menu** — current nav OK on desktop, cramped on phone
- **Fix Vercel deploy occasional timeout** — currently runs at ~50-58s, sometimes hits 60s. Possibilities: split insight into separate cron (need Vercel Pro for 3 cron), or upstash queue.

---

## 14. Architecture decisions summary

1. **Storage facade auto-detect** — Supabase if env set, else JSON file. Zero-config dev.
2. **Force-dynamic everywhere** — fresh data, no ISR cache complexity.
3. **Bulk SQL in scoring batch** — 3 SELECTs + 1 UPSERT instead of N×3 (60s timeout fit).
4. **Parallel insight calls** — Promise.allSettled for max(call) latency vs sequential.
5. **Tool-use forced JSON** — Claude returns structured insight via tool, no text parsing.
6. **Tolerant validation** — coerce evidence array, downgrade adopt→test rather than fail.
7. **Per-user RLS** — watchlist + decisions strictly auth.uid() = user_id.
8. **Idempotent everything** — cron upserts, schema files, insights skip-if-exists.
9. **Time-guard cron** — skip late steps if elapsed > 45s to avoid timeout.
10. **No chart lib** — all SVG inline. Bundle stays ~110KB First Load.
11. **138 collections compile-time** — YAML→TS at build, no runtime fetch.
12. **localStorage watchlist fallback** — works without auth, auto-migrates on login.

---

## 15. Quick reference

### Add a new score

1. Create `lib/scoring/<name>.ts` with `compute<Name>Input` type + `compute<Name>()` function.
2. Add to `ScoringInput` type in `lib/scoring/index.ts`.
3. Add weight to `RADAR_WEIGHTS` in `lib/config/scoring-weights.ts` (+ verify sum=1).
4. Wire into `computeAllScores()`.
5. Add to `repo_scores` table (new column + idx) via migration.
6. Update `ScoreBreakdown.tsx` UI.
7. Run `scripts/backtest-scoring.mjs 20` to sanity-check.

### Add a new collection

Re-run `node scripts/build-collections.mjs` from `ossinsight-ref/configs/collections`. Auto-regenerates `lib/collections.data.ts`.

### Tune Doscom focus

Edit `lib/config/doscom-focus.ts` — 3 tiers (high/medium/low) × 3 axes (topics/languages/collections). Relevance scores recompute on next cron.

### Debug cron

Curl with auth — response includes `failures[]` with `{reason, detail}` per failure.

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://doscom-radar.vercel.app/api/cron/daily
```

---

**Tổng**: 130 source files, ~10000 lines TS/TSX, 24 routes, 7 DB tables, build ~110-180 KB First Load JS, deploy-ready, V2 complete.
