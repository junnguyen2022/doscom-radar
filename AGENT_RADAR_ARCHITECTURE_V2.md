# Agent Radar — Kiến trúc dự án hoàn thiện V2

> **Project**: Agent Radar · GitHub Intelligence Dashboard · Doscom Holdings  
> **Phiên bản tài liệu**: V2.0 — hoàn thiện trước build phase tiếp theo  
> **Cập nhật**: 2026-05-06  
> **Mục tiêu**: Chuyển từ GitHub Trending Dashboard thành GitHub Radar Intelligence có dữ liệu sâu, scoring, decision workflow và AI insight có căn cứ.

---

## 0. Kết luận kiến trúc

Cấu trúc hiện tại của Agent Radar đã đủ để demo/MVP giao diện, nhưng chưa đủ để vận hành như một hệ thống phân tích GitHub nghiêm túc. Hướng đúng không phải làm lại từ đầu, mà là giữ nền hiện tại và bổ sung 4 lớp còn thiếu:

1. **GitHub REST enrichment** — bổ sung metadata thật: forks, issues, releases, license, pushed_at, topics, contributors.
2. **Scoring engine nhiều lớp** — tách Heat/Growth/Activity/Community/Maintenance/Risk/Relevance.
3. **Decision workflow** — biến watchlist từ “ghim repo” thành quy trình Follow → Review → Test → Adopt/Ignore.
4. **AI insight có evidence** — AI chỉ được kết luận dựa trên dữ liệu định lượng và phải có confidence.

Tên trạng thái kiến trúc nên chốt:

```text
Agent Radar V1.5 = GitHub Trending Intelligence Dashboard
Agent Radar V2.0 = GitHub Radar Intelligence Platform
```

Không nên nhảy ngay vào GH Archive/ClickHouse nếu GitHub REST enrichment, scoring và decision workflow chưa xong. Nếu chưa có logic đánh giá đúng, thêm dữ liệu lớn chỉ làm hệ thống phức tạp hơn mà chưa tạo giá trị ra quyết định.

---

## 1. Mục tiêu sản phẩm

### 1.1. Mục tiêu đúng

Agent Radar không chỉ để xem repo nào đang trending. Mục tiêu đúng là:

> Phát hiện sớm repo/công nghệ đang tăng trưởng, đánh giá chất lượng thật, cảnh báo rủi ro, đề xuất ứng dụng cho Doscom và tạo workflow để phòng Tech/CEO-COO ra quyết định.

### 1.2. Người dùng chính

| User | Nhu cầu | Output cần nhận |
|---|---|---|
| CEO/COO | Xem công nghệ/mã nguồn mở nào đáng quan tâm | Báo cáo ngắn, decision recommendation, rủi ro |
| Tech Lead | Chọn repo/tool để test hoặc adopt | Score, activity, maintenance, license, comparison |
| AI/Data Staff | Theo dõi AI agent, automation, data tools | Watchlist, category radar, daily/weekly digest |
| Analyst/Internal Ops | Tạo báo cáo xu hướng | Digest, export markdown, compare table |

### 1.3. Không làm trong giai đoạn này

```text
Không build social network.
Không build marketplace mã nguồn mở.
Không cố crawl toàn bộ GitHub ngay từ đầu.
Không làm real-time từng giây.
Không thêm nhiều page UI mới khi data/scoring chưa đủ.
Không để AI tự kết luận nếu thiếu evidence.
```

---

## 2. Đánh giá hiện trạng codebase

### 2.1. Hiện trạng tốt

Codebase hiện có nền MVP tốt:

- Next.js 15.5 App Router.
- TypeScript strict.
- Tailwind + UI primitives.
- Supabase/Postgres hoặc JSON fallback.
- Cheerio scraper cho GitHub Trending.
- Vercel Cron daily snapshot.
- Claude AI insight và chat.
- 18 routes gồm dashboard, trending, movers, collections, compare, repo analyze, radar, watchlist, digest, settings, chat.
- 138 collections curated từ OSSInsight.
- Tech Radar SVG, Compare, Languages aggregate, Digest export.

### 2.2. Điểm yếu cốt lõi

| Nhóm | Hiện tại | Vấn đề |
|---|---|---|
| Data | Chủ yếu `trending_snapshots` | Quá mỏng để phân tích repo thật |
| Scoring | Heat score dựa trên stars/rank | Chưa đo activity, community, maintenance, risk |
| Watchlist | localStorage | Không dùng được cho team, không có owner/status/review |
| AI Insight | Claude summary cached | Chưa có evidence contract/confidence/data grounding |
| Workflow | Xem dashboard | Chưa có quy trình ra quyết định Follow/Test/Adopt/Ignore |
| Roadmap | Có GH Archive | Dễ đi quá sớm vào data lớn trước khi lõi quyết định ổn |

---

## 3. Kiến trúc mục tiêu

### 3.1. Target architecture

```text
External Sources
  ├── GitHub Trending HTML
  ├── GitHub REST API
  ├── GitHub GraphQL API later
  ├── GH Archive later
  ├── OSSInsight Collections
  └── External signals later: HN, Product Hunt, Reddit, Hugging Face
        ↓
Source Layer / Ingestion
  ├── trending scraper
  ├── repository enrichment worker
  ├── activity feed worker
  └── historical event ingestion later
        ↓
Data Layer / Postgres
  ├── trending_snapshots
  ├── repositories
  ├── repo_metrics_daily
  ├── repo_activity_events
  ├── repo_scores
  ├── repo_insights
  ├── team_watchlists
  ├── watchlist_items
  └── radar_decisions
        ↓
Intelligence Layer
  ├── heat scoring
  ├── growth scoring
  ├── activity scoring
  ├── community scoring
  ├── maintenance scoring
  ├── risk detection
  ├── relevance classification
  └── AI insight generator with evidence
        ↓
Decision Layer
  ├── Follow
  ├── Review
  ├── Test
  ├── Adopt
  └── Ignore
        ↓
Presentation Layer
  ├── Dashboard
  ├── Trending
  ├── Movers
  ├── Repo Detail
  ├── Compare
  ├── Radar
  ├── Watchlist
  ├── Decisions
  ├── Digest
  └── Chat
```

### 3.2. Nguyên tắc thiết kế

| Nguyên tắc | Quy định |
|---|---|
| Data-first | Mọi insight phải có dữ liệu nền |
| AI hỗ trợ, không thay thế dữ liệu | AI chỉ diễn giải evidence, không được tự bịa |
| Decision-oriented | Mỗi repo cần recommendation: Follow/Test/Adopt/Ignore |
| Progressive scale | Postgres trước, ClickHouse/GH Archive sau |
| Team-operable | Watchlist phải có owner, status, review date |
| Security-first | Service role chỉ server-side, RLS rõ ràng |
| MVP discipline | Không thêm UI mới nếu lõi data/scoring chưa xong |

---

## 4. Tech stack khuyến nghị giữ lại

| Lớp | Công nghệ | Quyết định |
|---|---|---|
| Framework | Next.js 15.5 App Router | Giữ |
| Language | TypeScript strict | Giữ |
| UI | Tailwind + lucide-react | Giữ |
| DB | Supabase Postgres | Giữ làm production DB |
| Local fallback | JSON file | Giữ cho dev demo |
| AI | Anthropic SDK / Claude | Giữ nhưng thêm evidence contract |
| Scraper | Cheerio | Giữ nhưng coi là source dễ gãy |
| Cron | Vercel Cron | Giữ cho daily job |
| Auth | Supabase Auth | Bổ sung khi chuyển team workflow |
| Analytics DB | ClickHouse | Chưa làm ngay, để phase 60–90 ngày |
| GH Archive | BigQuery/ClickHouse ingestion | Sau REST enrichment + scoring |

---

## 5. Cấu trúc thư mục đề xuất sau bổ sung

```text
Agent/
├── app/
│   ├── page.tsx
│   ├── trending/page.tsx
│   ├── movers/page.tsx
│   ├── collections/page.tsx
│   ├── collections/[slug]/page.tsx
│   ├── languages/page.tsx
│   ├── languages/[lang]/page.tsx
│   ├── compare/page.tsx
│   ├── repo/[owner]/[repo]/page.tsx
│   ├── radar/page.tsx
│   ├── watchlist/page.tsx
│   ├── decisions/page.tsx                 # NEW: decision workflow
│   ├── digest/page.tsx
│   ├── settings/page.tsx
│   ├── chat/page.tsx
│   └── api/
│       ├── chat/route.ts
│       ├── cron/snapshot/route.ts
│       ├── cron/enrich/route.ts           # NEW: enrich trending repos
│       ├── cron/score/route.ts            # NEW: calculate daily scores
│       ├── repos/[owner]/[repo]/route.ts  # NEW: repo detail API
│       ├── repos/[owner]/[repo]/insight/route.ts
│       ├── watchlists/route.ts            # NEW: team watchlist
│       ├── decisions/route.ts             # NEW: decision log
│       └── snapshots/latest/route.ts
│
├── components/
│   ├── repo/
│   ├── radar/
│   ├── watchlist/
│   ├── decisions/                        # NEW
│   │   ├── DecisionCard.tsx
│   │   ├── DecisionTimeline.tsx
│   │   └── DecisionStatusBadge.tsx
│   └── ui/
│
├── lib/
│   ├── github-trending.ts
│   ├── github-rest.ts                    # NEW: REST API client
│   ├── github-graphql.ts                 # LATER
│   ├── enrichment.ts                     # NEW
│   ├── classify.ts
│   ├── heat.ts
│   ├── scoring/
│   │   ├── index.ts
│   │   ├── growth.ts
│   │   ├── activity.ts
│   │   ├── community.ts
│   │   ├── maintenance.ts
│   │   ├── relevance.ts
│   │   └── risk.ts
│   ├── decision.ts                       # NEW
│   ├── insight-contract.ts               # NEW
│   ├── storage.ts
│   └── supabase/
│
├── db/
│   ├── schema.sql                        # current
│   ├── schema.v2.sql                     # NEW: extended schema
│   └── rls.v2.sql                        # NEW: RLS policies
│
├── scripts/
│   ├── smoke-trending.mjs
│   ├── smoke-enrichment.mjs              # NEW
│   ├── calculate-scores.mjs              # NEW
│   └── migrate-v2.mjs                    # optional
│
└── docs/
    ├── product-spec.md                   # NEW
    ├── scoring-model.md                  # NEW
    ├── api-contract.md                   # NEW
    ├── ai-insight-contract.md            # NEW
    └── implementation-roadmap.md         # NEW
```

---

## 6. Data model V2

### 6.1. Bảng hiện tại giữ lại: `trending_snapshots`

Bảng này tiếp tục dùng để lưu snapshot daily/weekly/monthly từ GitHub Trending.

```sql
create table if not exists public.trending_snapshots (
  id            bigint generated always as identity primary key,
  captured_at   date not null,
  timeframe     text not null check (timeframe in ('daily', 'weekly', 'monthly')),
  rank          int  not null check (rank between 1 and 25),
  owner         text not null,
  repo          text not null,
  language      text,
  description   text,
  stars_gained  int,
  total_stars   int,
  url           text not null,
  fetched_at    timestamptz not null default now(),
  unique (captured_at, timeframe, owner, repo)
);
```

### 6.2. Bảng mới: `repositories`

Lưu metadata chuẩn từ GitHub REST API.

```sql
create table if not exists public.repositories (
  id                    bigint generated always as identity primary key,
  github_id             bigint unique,
  owner                 text not null,
  repo                  text not null,
  full_name             text generated always as (owner || '/' || repo) stored,
  url                   text not null,
  html_url              text,
  description           text,
  homepage              text,
  language              text,
  topics                text[] default '{}',
  license_key           text,
  license_name          text,
  default_branch        text,
  visibility            text default 'public',
  archived              boolean default false,
  disabled              boolean default false,
  fork                  boolean default false,
  created_at            timestamptz,
  updated_at            timestamptz,
  pushed_at             timestamptz,
  last_enriched_at      timestamptz,
  raw                   jsonb,
  inserted_at           timestamptz not null default now(),
  modified_at           timestamptz not null default now(),
  unique (owner, repo)
);

create index if not exists repositories_full_name_idx on public.repositories (full_name);
create index if not exists repositories_language_idx on public.repositories (language);
create index if not exists repositories_pushed_at_idx on public.repositories (pushed_at desc);
create index if not exists repositories_topics_gin_idx on public.repositories using gin (topics);
```

### 6.3. Bảng mới: `repo_metrics_daily`

Lưu chỉ số định lượng theo ngày.

```sql
create table if not exists public.repo_metrics_daily (
  id                    bigint generated always as identity primary key,
  repo_id               bigint not null references public.repositories(id) on delete cascade,
  metric_date           date not null,
  total_stars           int,
  forks_count           int,
  watchers_count        int,
  open_issues_count     int,
  subscribers_count     int,
  network_count         int,
  size_kb               int,
  stars_delta_1d        int,
  stars_delta_7d        int,
  stars_delta_30d       int,
  forks_delta_7d        int,
  pushed_within_days    int,
  latest_release_at     timestamptz,
  contributors_count    int,
  commits_30d           int,
  prs_open_30d          int,
  prs_merged_30d        int,
  issues_opened_30d     int,
  issues_closed_30d     int,
  fetched_at            timestamptz not null default now(),
  unique (repo_id, metric_date)
);

create index if not exists repo_metrics_daily_repo_date_idx on public.repo_metrics_daily (repo_id, metric_date desc);
create index if not exists repo_metrics_daily_metric_date_idx on public.repo_metrics_daily (metric_date desc);
```

### 6.4. Bảng mới: `repo_activity_events`

Lưu activity gần đây để phục vụ repo detail và scoring activity.

```sql
create table if not exists public.repo_activity_events (
  id                    bigint generated always as identity primary key,
  repo_id               bigint not null references public.repositories(id) on delete cascade,
  github_event_id       text,
  event_type            text not null,
  actor_login           text,
  title                 text,
  url                   text,
  state                 text,
  created_at            timestamptz,
  closed_at             timestamptz,
  merged_at             timestamptz,
  raw                   jsonb,
  inserted_at           timestamptz not null default now(),
  unique (repo_id, github_event_id, event_type)
);

create index if not exists repo_activity_events_repo_created_idx on public.repo_activity_events (repo_id, created_at desc);
create index if not exists repo_activity_events_type_idx on public.repo_activity_events (event_type);
```

### 6.5. Bảng mới: `repo_scores`

Lưu điểm scoring theo ngày.

```sql
create table if not exists public.repo_scores (
  id                    bigint generated always as identity primary key,
  repo_id               bigint not null references public.repositories(id) on delete cascade,
  score_date            date not null,
  heat_score            numeric(5,2) default 0,
  growth_score          numeric(5,2) default 0,
  activity_score        numeric(5,2) default 0,
  community_score       numeric(5,2) default 0,
  maintenance_score     numeric(5,2) default 0,
  relevance_score       numeric(5,2) default 0,
  risk_score            numeric(5,2) default 0,
  risk_penalty          numeric(5,2) default 0,
  radar_score           numeric(5,2) default 0,
  recommendation        text check (recommendation in ('adopt', 'test', 'follow', 'ignore', 'caution')),
  confidence            text check (confidence in ('high', 'medium', 'low')),
  score_reason          text,
  calculated_at         timestamptz not null default now(),
  unique (repo_id, score_date)
);

create index if not exists repo_scores_score_date_idx on public.repo_scores (score_date desc);
create index if not exists repo_scores_radar_score_idx on public.repo_scores (score_date desc, radar_score desc);
create index if not exists repo_scores_recommendation_idx on public.repo_scores (recommendation);
```

### 6.6. Bảng mới: `repo_insights`

Lưu AI insight có evidence.

```sql
create table if not exists public.repo_insights (
  id                    bigint generated always as identity primary key,
  repo_id               bigint not null references public.repositories(id) on delete cascade,
  insight_date          date not null,
  summary               text not null,
  why_trending          text,
  technical_value       text,
  doscom_use_case       text,
  risk_note             text,
  recommendation        text check (recommendation in ('adopt', 'test', 'follow', 'ignore', 'caution')),
  confidence            text check (confidence in ('high', 'medium', 'low')),
  evidence              jsonb not null default '[]'::jsonb,
  prompt_version        text,
  model                 text,
  generated_at          timestamptz not null default now(),
  unique (repo_id, insight_date)
);

create index if not exists repo_insights_repo_date_idx on public.repo_insights (repo_id, insight_date desc);
```

### 6.7. Bảng mới: `team_watchlists`

```sql
create table if not exists public.team_watchlists (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  description           text,
  owner_user_id         uuid,
  visibility            text not null default 'team' check (visibility in ('private', 'team', 'public')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
```

### 6.8. Bảng mới: `watchlist_items`

```sql
create table if not exists public.watchlist_items (
  id                    uuid primary key default gen_random_uuid(),
  watchlist_id          uuid not null references public.team_watchlists(id) on delete cascade,
  repo_id               bigint not null references public.repositories(id) on delete cascade,
  status                text not null default 'follow' check (status in ('follow', 'review', 'test', 'adopt', 'ignore', 'caution')),
  priority              text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  reason                text,
  owner_user_id         uuid,
  next_review_at        date,
  created_by            uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (watchlist_id, repo_id)
);

create index if not exists watchlist_items_status_idx on public.watchlist_items (status);
create index if not exists watchlist_items_next_review_idx on public.watchlist_items (next_review_at);
```

### 6.9. Bảng mới: `radar_decisions`

Ghi nhận quyết định để tránh app chỉ là dashboard xem cho vui.

```sql
create table if not exists public.radar_decisions (
  id                    uuid primary key default gen_random_uuid(),
  repo_id               bigint not null references public.repositories(id) on delete cascade,
  watchlist_item_id     uuid references public.watchlist_items(id) on delete set null,
  decision              text not null check (decision in ('follow', 'review', 'test', 'adopt', 'ignore', 'caution')),
  previous_decision     text,
  decision_reason       text not null,
  expected_value        text,
  test_plan             text,
  risk_note             text,
  owner_user_id         uuid,
  due_date              date,
  result_note           text,
  decided_by            uuid,
  decided_at            timestamptz not null default now()
);

create index if not exists radar_decisions_repo_idx on public.radar_decisions (repo_id, decided_at desc);
create index if not exists radar_decisions_decision_idx on public.radar_decisions (decision);
```

---

## 7. Scoring model V2

### 7.1. Tổng điểm

```text
Radar Score =
  25% Growth Score
+ 20% Activity Score
+ 20% Community Score
+ 15% Maintenance Score
+ 20% Relevance Score
- Risk Penalty
```

Heat Score vẫn giữ, nhưng chỉ dùng như tín hiệu nóng ngắn hạn. Không dùng Heat Score làm kết luận chất lượng repo.

### 7.2. Score contract

| Score | Mục tiêu | Dữ liệu cần |
|---|---|---|
| Heat Score | Repo đang nóng trên trending không | rank, stars_gained, total_stars |
| Growth Score | Repo tăng trưởng thật không | stars_delta_1d/7d/30d, forks_delta_7d |
| Activity Score | Repo có hoạt động kỹ thuật không | commits_30d, PRs, releases |
| Community Score | Cộng đồng có khỏe không | contributors, issues opened/closed, PRs |
| Maintenance Score | Maintainer còn duy trì không | pushed_at, latest_release_at, issue close ratio |
| Relevance Score | Có phù hợp với Doscom không | topics, language, description, collections |
| Risk Score | Có rủi ro không | archived, no license, stale, issue backlog, spike ảo |

### 7.3. Recommendation rule MVP

```text
Adopt:
  radar_score >= 80
  risk_score <= 25
  maintenance_score >= 60
  relevance_score >= 70

Test:
  radar_score >= 65
  risk_score <= 40
  relevance_score >= 60

Follow:
  radar_score >= 50
  hoặc Heat Score cao nhưng thiếu dữ liệu activity

Caution:
  Growth/Heat cao nhưng Risk Score cao

Ignore:
  radar_score < 50
  hoặc repo stale/archived/no-license rủi ro cao
```

### 7.4. Risk flags bắt buộc

| Risk flag | Điều kiện |
|---|---|
| `stale_repo` | `pushed_at` > 180 ngày |
| `no_license` | không có license |
| `archived` | repo archived |
| `issue_backlog` | open issues cao nhưng close ratio thấp |
| `star_spike_without_activity` | stars tăng mạnh nhưng commit/PR thấp |
| `single_maintainer_risk` | contributors thấp, activity phụ thuộc 1 người |
| `no_recent_release` | không có release trong 180 ngày |
| `forked_repo` | repo là fork, không phải upstream chính |

---

## 8. AI Insight Contract

AI insight không được viết tự do. Mỗi insight phải trả về đúng format.

### 8.1. Output JSON bắt buộc

```json
{
  "summary": "Repo này làm gì, viết tối đa 3 câu.",
  "why_trending": "Dữ liệu nào cho thấy repo đang tăng hoặc đáng chú ý.",
  "technical_value": "Giá trị kỹ thuật chính.",
  "doscom_use_case": "Doscom có thể ứng dụng vào đâu.",
  "risk_note": "Rủi ro kỹ thuật, pháp lý, maintain hoặc adoption.",
  "recommendation": "adopt | test | follow | caution | ignore",
  "confidence": "high | medium | low",
  "evidence": [
    {
      "type": "metric",
      "label": "stars_delta_7d",
      "value": 1234,
      "reason": "Tăng trưởng 7 ngày cao hơn nhóm cùng category."
    }
  ]
}
```

### 8.2. Quy định cho AI

```text
Không kết luận nếu thiếu dữ liệu.
Không dùng ngôn ngữ chắc chắn khi confidence thấp.
Không khuyến nghị Adopt nếu license thiếu hoặc repo stale.
Không dùng stars làm bằng chứng duy nhất.
Phải nêu ít nhất 3 evidence cho recommendation Test/Adopt.
Phải nêu risk_note kể cả khi khuyến nghị tích cực.
```

### 8.3. Prompt skeleton

```text
You are Agent Radar, a GitHub open-source intelligence analyst for Doscom Holdings.

Your job:
- Evaluate repository quality using only provided data.
- Separate facts from assumptions.
- Never invent metrics.
- Recommend one of: adopt, test, follow, caution, ignore.
- Provide evidence and confidence.

Context:
Doscom cares about AI, automation, data, devtools, e-commerce tech, internal operations.
Prioritize practical adoption, reliability, maintainability, license safety and team feasibility.

Repository data:
{{repo_json}}

Scoring data:
{{score_json}}

Recent activity:
{{activity_json}}

Return valid JSON only.
```

---

## 9. Decision workflow

### 9.1. Trạng thái

```text
Follow → Review → Test → Adopt
                  └→ Ignore
Follow → Caution → Review/Test/Ignore
```

### 9.2. Ý nghĩa từng trạng thái

| Status | Ý nghĩa | Owner cần làm gì |
|---|---|---|
| Follow | Repo đáng theo dõi | Gắn lý do, đặt ngày review |
| Review | Cần đánh giá sâu | Đọc docs, kiểm tra license, so sánh alternatives |
| Test | Đưa vào thử nghiệm | Có test plan, owner, deadline |
| Adopt | Có thể dùng chính thức/nội bộ | Có tiêu chí triển khai và rủi ro |
| Ignore | Bỏ qua | Ghi lý do để tránh review lặp |
| Caution | Có tín hiệu tốt nhưng rủi ro | Cần kiểm chứng trước khi test |

### 9.3. Trường bắt buộc khi đưa repo vào Test

```text
- Owner
- Mục tiêu test
- Use case cho Doscom
- Tiêu chí pass/fail
- Deadline
- Rủi ro chính
- Kết quả kỳ vọng
```

### 9.4. Decision page cần có

| Block | Nội dung |
|---|---|
| Decision Queue | Repo đang cần review/test |
| Due This Week | Repo đến hạn review |
| Adopted Tools | Repo đã chốt dùng |
| Ignored with Reasons | Repo đã loại và lý do |
| Owner Load | Ai đang phụ trách bao nhiêu repo |
| Decision Timeline | Lịch sử quyết định theo repo |

---

## 10. API Contract V2

### 10.1. Repo APIs

```text
GET /api/repos/:owner/:repo
GET /api/repos/:owner/:repo/metrics
GET /api/repos/:owner/:repo/scores
GET /api/repos/:owner/:repo/insights
GET /api/repos/:owner/:repo/activity
POST /api/repos/:owner/:repo/enrich
```

### 10.2. Radar APIs

```text
GET /api/radar/top-rising
GET /api/radar/top-ai-agents
GET /api/radar/top-devtools
GET /api/radar/high-risk-popular
GET /api/radar/categories/:category
GET /api/radar/recommendations?type=test
```

### 10.3. Watchlist APIs

```text
GET /api/watchlists
POST /api/watchlists
GET /api/watchlists/:id/items
POST /api/watchlists/:id/items
PATCH /api/watchlists/:id/items/:itemId
DELETE /api/watchlists/:id/items/:itemId
```

### 10.4. Decision APIs

```text
GET /api/decisions
POST /api/decisions
GET /api/decisions/:id
PATCH /api/decisions/:id
GET /api/repos/:owner/:repo/decisions
```

### 10.5. Cron APIs

```text
GET /api/cron/snapshot
GET /api/cron/enrich
GET /api/cron/score
GET /api/cron/insight
```

Tất cả cron routes phải có:

```text
Authorization: Bearer ${CRON_SECRET}
```

---

## 11. Data jobs

### 11.1. Job 1 — Snapshot trending

| Item | Nội dung |
|---|---|
| Frequency | Daily, có thể tăng lên 4 lần/ngày nếu cần |
| Source | github.com/trending daily/weekly/monthly |
| Output | `trending_snapshots` |
| Owner code | `lib/github-trending.ts`, `/api/cron/snapshot` |

### 11.2. Job 2 — Enrich repositories

| Item | Nội dung |
|---|---|
| Frequency | Sau snapshot hoặc hourly |
| Source | GitHub REST API |
| Output | `repositories`, `repo_metrics_daily` |
| Required | `GITHUB_TOKEN` |
| Limit rule | Chỉ enrich repo mới hoặc repo trong watchlist/top trending |

### 11.3. Job 3 — Calculate scores

| Item | Nội dung |
|---|---|
| Frequency | Sau enrich |
| Input | `repositories`, `repo_metrics_daily`, `trending_snapshots` |
| Output | `repo_scores` |
| Owner code | `lib/scoring/*` |

### 11.4. Job 4 — Generate AI insights

| Item | Nội dung |
|---|---|
| Frequency | Daily cho top repo hoặc on-demand |
| Input | Repo + metrics + scores + activity |
| Output | `repo_insights` |
| Cost control | Cache 24h/repo, chỉ generate top 100 hoặc watchlist |

### 11.5. Job 5 — Decision reminder later

| Item | Nội dung |
|---|---|
| Frequency | Daily |
| Input | `watchlist_items.next_review_at` |
| Output | UI alert, later Lark/Slack/email |

---

## 12. UI/UX cần chỉnh theo V2

### 12.1. Dashboard

Giữ layout hiện tại, nhưng thêm 4 block:

| Block | Mục tiêu |
|---|---|
| Top Test Candidates | Repo nên test nhất hôm nay |
| High Risk Popular | Repo nổi nhưng rủi ro cao |
| Watchlist Due Review | Repo đến hạn review |
| Decision Summary | Follow/Test/Adopt/Ignore tuần này |

### 12.2. Repo detail

Mỗi repo detail page phải có:

```text
1. Summary
2. Radar Score
3. Score breakdown
4. GitHub metrics
5. Activity feed
6. Risk flags
7. AI insight with evidence
8. Comparison suggestions
9. Decision history
10. Action buttons: Follow / Review / Test / Adopt / Ignore
```

### 12.3. Compare page

Thêm các cột:

| Cột | Vì sao cần |
|---|---|
| Radar Score | Tổng điểm |
| Risk Score | Tránh chọn repo rủi ro |
| License | Rủi ro pháp lý |
| Last pushed | Repo còn sống không |
| Latest release | Có release ổn định không |
| Contributors | Cộng đồng có thật không |
| Recommendation | Kết luận hành động |

### 12.4. Watchlist page

Chuyển từ localStorage sang server-side ở phase V2. Watchlist cần filter theo:

```text
Status
Owner
Priority
Next review date
Category
Recommendation
Risk level
```

### 12.5. New page: Decisions

Route đề xuất:

```text
/decisions
```

Chức năng:

```text
- Xem toàn bộ quyết định theo repo
- Tạo quyết định mới
- Gắn owner
- Đặt deadline review/test
- Ghi kết quả test
- Export decision log
```

---

## 13. Security / RLS

### 13.1. Key rules

```text
SUPABASE_SERVICE_ROLE_KEY chỉ dùng trong server route/server action.
Không import admin client vào client component.
Không log token/env ra console.
Cron endpoints phải kiểm tra Authorization header.
Manual snapshot chỉ admin được chạy khi có Supabase Auth.
```

### 13.2. RLS guideline

| Table | Public read | Auth read | Auth write | Service write |
|---|---:|---:|---:|---:|
| trending_snapshots | Yes | Yes | No | Yes |
| repositories | Yes | Yes | No | Yes |
| repo_metrics_daily | Yes | Yes | No | Yes |
| repo_scores | Yes | Yes | No | Yes |
| repo_insights | Yes/Team | Yes | No | Yes |
| team_watchlists | No | Yes | Yes | Yes |
| watchlist_items | No | Yes | Yes | Yes |
| radar_decisions | No | Yes | Yes | Yes |

### 13.3. RLS sample

```sql
alter table public.repositories enable row level security;

create policy "repositories public read"
  on public.repositories
  for select
  using (true);

alter table public.team_watchlists enable row level security;

create policy "authenticated can read team watchlists"
  on public.team_watchlists
  for select
  to authenticated
  using (true);

create policy "authenticated can insert team watchlists"
  on public.team_watchlists
  for insert
  to authenticated
  with check (true);
```

---

## 14. Environment variables V2

| Variable | Required | Phase | Mô tả |
|---|---|---|---|
| `CRON_SECRET` | Required | Cron | Bảo vệ cron endpoints |
| `NEXT_PUBLIC_SUPABASE_URL` | Required prod | DB | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required prod | Client DB | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Required prod | Server writes | Secret, server-only |
| `GITHUB_TOKEN` | Required V1.5 | Enrichment | PAT scope public repo |
| `ANTHROPIC_API_KEY` | Optional/Required AI | Insight/chat | Claude API |
| `DATABASE_URL` | Optional | MCP/dev | Direct Postgres |
| `APP_BASE_URL` | Recommended | Cron/link | Production URL |
| `AI_INSIGHT_DAILY_LIMIT` | Optional | Cost control | Giới hạn số insight/ngày |

---

## 15. Roadmap triển khai

### 15.1. Phase 0 — Stabilize hiện trạng

**Thời gian**: 1–2 ngày

| Việc | Output |
|---|---|
| Chạy smoke test scraper | Confirm GitHub Trending parse ổn |
| Kiểm tra cron auth | Không có route cron hở |
| Kiểm tra service-role import | Không leak client |
| Review build/lint/typecheck | Build xanh |
| Backup schema hiện tại | Có rollback |

### 15.2. Phase 1 — V1.5 Data Enrichment

**Thời gian**: 3–7 ngày

| Việc | Output |
|---|---|
| Thêm `repositories` | Metadata repo chuẩn |
| Thêm `repo_metrics_daily` | Snapshot metric hằng ngày |
| Build `lib/github-rest.ts` | GitHub REST client |
| Build `/api/cron/enrich` | Enrich repo tự động |
| Update repo detail page | Hiển thị forks/license/pushed/release/issues |
| Add smoke test | Test enrich 5 repo |

### 15.3. Phase 2 — Scoring V2

**Thời gian**: 5–10 ngày

| Việc | Output |
|---|---|
| Thêm `repo_scores` | Lưu điểm theo ngày |
| Viết `lib/scoring/*` | Growth/Activity/Community/Maintenance/Risk |
| Build `/api/cron/score` | Chạy scoring tự động |
| Update Dashboard | Top Test Candidates, High Risk Popular |
| Update Compare | Score breakdown |
| Review thủ công top 50 | Điều chỉnh score rule |

### 15.4. Phase 3 — Decision Workflow

**Thời gian**: 7–14 ngày

| Việc | Output |
|---|---|
| Thêm `team_watchlists` | Watchlist server-side |
| Thêm `watchlist_items` | Status/owner/review date |
| Thêm `radar_decisions` | Decision log |
| Build `/watchlist` V2 | Team workflow |
| Build `/decisions` | Decision queue |
| Add action buttons ở repo detail | Follow/Test/Adopt/Ignore |

### 15.5. Phase 4 — AI Insight with Evidence

**Thời gian**: 5–10 ngày

| Việc | Output |
|---|---|
| Thêm `repo_insights` | Lưu insight |
| Viết prompt contract | JSON output có evidence |
| Build insight generator | AI bám score/metric |
| Add confidence | high/medium/low |
| Add insight review | Manual correction later |

### 15.6. Phase 5 — Scale Data later

**Thời gian**: 30–90 ngày sau khi V1.5/V2 chạy ổn

| Việc | Khi nào làm |
|---|---|
| GH Archive ingestion | Khi cần lịch sử event sâu |
| ClickHouse | Khi Postgres query chậm hoặc dữ liệu > vài triệu events |
| Live events firehose | Khi cần near-real-time theo watchlist |
| External signals | Khi GitHub-only không đủ |
| Lark/Slack alerts | Khi decision workflow đã có owner rõ |

---

## 16. KPI triển khai

### 16.1. KPI 7 ngày

| KPI | Mục tiêu |
|---|---:|
| GitHub REST enrichment chạy được | Có |
| Repo metadata lưu vào DB | >= 100 repo |
| `repositories` schema hoàn tất | Có |
| `repo_metrics_daily` schema hoàn tất | Có |
| Repo detail dùng dữ liệu enrich | Có |
| Build/lint/typecheck pass | Có |
| Không leak service-role | 0 lỗi |

### 16.2. KPI 30 ngày

| KPI | Mục tiêu |
|---|---:|
| Repo được theo dõi | 1.000–5.000 |
| Repo có scoring V2 | >= 1.000 |
| Repo trong watchlist team | >= 50 |
| Repo có decision status | 100% watchlist |
| Repo có AI insight | Top 100 |
| Báo cáo tuần | 1 report/tuần |
| Repo được test thực tế | 3–5 repo/tháng |

### 16.3. KPI chất lượng insight

| KPI | Mục tiêu |
|---|---:|
| Insight có evidence >= 3 điểm dữ liệu | >= 90% |
| Insight bị đánh giá sai nghiêm trọng | < 5% |
| Recommendation có confidence | 100% |
| Adopt/Test không có risk_note | 0 trường hợp |

---

## 17. Rủi ro và xử lý

| Rủi ro | Mức độ | Cách xử lý |
|---|---:|---|
| GitHub Trending HTML đổi | Cao | Smoke test, selector fallback, alert khi no_rows_parsed |
| GitHub API rate limit | Cao | Enrich theo batch, cache, chỉ enrich repo top/watchlist |
| AI hallucination | Cao | Evidence contract, JSON schema validation, confidence |
| Dashboard đẹp nhưng không hành động | Cao | Bắt buộc decision workflow |
| Scoring sai | Cao | Review thủ công top 50 mỗi tuần đầu |
| Watchlist localStorage mất dữ liệu | Trung bình | Chuyển server-side |
| GH Archive làm quá sớm | Trung bình | Chỉ làm sau V1.5/V2 ổn |
| Service key leak | Cao | Server-only admin client, audit imports |
| License rủi ro | Trung bình | License phải là field bắt buộc trước Test/Adopt |

---

## 18. Implementation checklist cho dev

### 18.1. Backend/Data

```text
[ ] Tạo db/schema.v2.sql
[ ] Tạo bảng repositories
[ ] Tạo bảng repo_metrics_daily
[ ] Tạo bảng repo_activity_events
[ ] Tạo bảng repo_scores
[ ] Tạo bảng repo_insights
[ ] Tạo bảng team_watchlists
[ ] Tạo bảng watchlist_items
[ ] Tạo bảng radar_decisions
[ ] Update storage facade để đọc/write repositories
[ ] Viết github-rest client
[ ] Viết enrichTrendingRepos()
[ ] Viết calculateRepoScores()
[ ] Viết generateRepoInsight()
```

### 18.2. API

```text
[ ] /api/cron/enrich
[ ] /api/cron/score
[ ] /api/repos/[owner]/[repo]
[ ] /api/repos/[owner]/[repo]/metrics
[ ] /api/repos/[owner]/[repo]/scores
[ ] /api/repos/[owner]/[repo]/insights
[ ] /api/watchlists
[ ] /api/watchlists/[id]/items
[ ] /api/decisions
```

### 18.3. Frontend

```text
[ ] Repo detail hiển thị score breakdown
[ ] Repo detail hiển thị license/pushed/release/issues
[ ] Repo detail có action buttons Follow/Test/Adopt/Ignore
[ ] Watchlist server-side
[ ] Decisions page
[ ] Dashboard thêm Top Test Candidates
[ ] Dashboard thêm High Risk Popular
[ ] Compare thêm scoring/risk/license
[ ] Digest thêm recommendation/evidence
```

### 18.4. AI

```text
[ ] Tạo insight JSON schema
[ ] Validate JSON output
[ ] Chỉ generate khi có đủ metrics
[ ] Cache insight theo repo/date
[ ] Lưu evidence vào repo_insights
[ ] Hiển thị confidence trên UI
```

### 18.5. Security

```text
[ ] Kiểm tra không import admin client vào client component
[ ] Cron route check Authorization header
[ ] RLS bật cho bảng mới
[ ] User write chỉ cho authenticated
[ ] Service role chỉ server-only
[ ] Không log env/token
```

---

## 19. Acceptance criteria

### 19.1. Đạt chuẩn V1.5 khi

```text
- Enrich được ít nhất 100 repo trending bằng GitHub REST API.
- Repo detail hiển thị metadata thật: forks, open issues, license, pushed_at, topics.
- Có bảng repositories và repo_metrics_daily.
- Có cron enrich bảo vệ bằng CRON_SECRET.
- Build/lint/typecheck pass.
```

### 19.2. Đạt chuẩn V2.0 khi

```text
- Có scoring nhiều lớp.
- Có watchlist server-side.
- Có decision workflow Follow/Review/Test/Adopt/Ignore.
- Có AI insight với evidence và confidence.
- Có decision log.
- Có ít nhất 50 repo được đánh giá và 5 repo được đưa vào test plan.
```

---

## 20. Quyết định ưu tiên cuối cùng

Thứ tự làm đúng:

```text
1. Schema V2
2. GitHub REST enrichment
3. Scoring V2
4. Repo detail/Compare update
5. Watchlist server-side
6. Decision workflow
7. AI insight with evidence
8. Alerts/report automation
9. GH Archive/ClickHouse
```

Không đổi thứ tự này nếu mục tiêu là tạo sản phẩm dùng được trong vận hành nội bộ Doscom.

---

# Phụ lục A — Kiến trúc hiện tại đã cung cấp

Dưới đây là nội dung kiến trúc hiện tại được giữ lại để đối chiếu với bản V2.

---

# Agent Radar — Kiến trúc dự án

> **Project**: GitHub trending tracker · Doscom Holdings  
> **Path**: `C:\Users\ADMIN\.gemini\antigravity\Agent`  
> **Cập nhật lần cuối**: 2026-05-06

---

## 1. Tổng quan & mục đích

**Agent Radar** là một dashboard theo dõi GitHub trending hàng ngày — snapshot `github.com/trending` (daily / weekly / monthly), phân loại tự động repos, phát hiện movers, tổng hợp 138 collections curated bởi PingCAP/OSSInsight, và sinh AI insight bằng Claude.

Layout & một số ý tưởng (collections, compare, languages, analyze page) lấy cảm hứng từ [OSSInsight.io](https://ossinsight.io) (Apache 2.0).

---

## 2. Tech stack

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Framework | Next.js 15.5 (App Router) | Server Components mặc định |
| Language | TypeScript 5.6 (strict) | Path alias `@/*` |
| UI | Tailwind 3.4 + lucide-react + Inter font | dark mode `class`-based |
| State (client) | React Context (theme/lang/watchlist) | localStorage persist |
| DB | Supabase (Postgres) **hoặc** JSON file | Auto-detect trong `lib/storage.ts` |
| Auth | Supabase RLS public-read; service-role cho writes | Anon key safe to expose |
| AI | Anthropic SDK (`claude-sonnet-4-6`) | Prompt caching enabled |
| Scraper | Cheerio (parse HTML `github.com/trending`) | Server-side only |
| Cron | Vercel Cron (`vercel.json`, daily 01:00 UTC) | Auth `Authorization: Bearer ${CRON_SECRET}` |
| MCP (dev) | Postgres + GitHub MCP | Defined trong `.mcp.json` |

---

## 3. Cấu trúc thư mục đầy đủ (85 source files)

```
Agent/
├── CLAUDE.md                            # Project memory cho Claude Code
├── ARCHITECTURE.md                      # File này
├── package.json                         # Dependencies (Next, React, Anthropic, Supabase, Cheerio, Lucide)
├── tsconfig.json                        # TS config (strict, paths @/*)
├── next.config.mjs                      # Next.js config (default)
├── tailwind.config.ts                   # Brand color (violet), shadows, animations, fontFamily
├── postcss.config.mjs
├── vercel.json                          # Cron schedule "0 1 * * *"
├── .env.example                         # 7 env vars
├── .gitignore                           # Node, Next, env, data/*.json
├── next-env.d.ts                        # Auto-generated by Next.js
│
├── .claude/                             # Claude Code config
│   ├── settings.json                    # Permissions, env, hooks
│   └── commands/
│       ├── bootstrap.md                 # /bootstrap slash command
│       └── review.md                    # /review slash command
│
├── .mcp.json                            # MCP server config (postgres, github)
│
├── skills/                              # Auto-activated Claude Code skills
│   ├── claude-api/SKILL.md              # Anthropic SDK guidelines
│   ├── code-review/SKILL.md             # Review checklist
│   ├── refactor/SKILL.md                # Refactor rules
│   ├── security-audit/SKILL.md          # OWASP + RLS audit
│   └── text-writer/SKILL.md             # UI copy guidelines
│
├── agents/                              # Subagent definitions (Markdown frontmatter)
│   ├── code-reviewer.md
│   ├── devops-sre.md
│   ├── security-auditor.md
│   └── test-writer.md
│
├── db/
│   └── schema.sql                       # Supabase: trending_snapshots + RLS
│
├── scripts/                             # One-off tools
│   ├── build-collections.mjs            # YAML→TS converter (138 OSSInsight collections)
│   └── smoke-trending.mjs               # Test scraper without DB
│
├── data/                                # Local file-storage fallback (gitignored)
│   └── snapshots.json                   # Auto-created when Supabase env unset
│
├── app/                                 # Next.js App Router
│   ├── layout.tsx                       # Root: AppProvider, Nav, Footer, Inter font, theme no-flash
│   ├── globals.css                      # Tailwind + Inter + glass + scrollbar + shimmer + bg-grid
│   │
│   ├── page.tsx                         # / Dashboard
│   ├── chat/page.tsx                    # /chat — Claude chat UI
│   ├── trending/page.tsx                # /trending — full filterable list
│   ├── movers/page.tsx                  # /movers — risers/fallers/new/dropped
│   │
│   ├── collections/
│   │   ├── page.tsx                     # /collections — 138 cards (hot vs cold)
│   │   └── [slug]/page.tsx              # /collections/ai — detail with matched + curated
│   │
│   ├── languages/
│   │   ├── page.tsx                     # /languages — heat-bar aggregate
│   │   └── [lang]/page.tsx              # /languages/Python — repos của 1 lang
│   │
│   ├── compare/
│   │   ├── page.tsx                     # /compare?repos=a,b,c — side-by-side table
│   │   └── CompareInput.tsx             # Client-side input form
│   │
│   ├── repo/[owner]/[repo]/page.tsx     # /repo/o/r — OSSInsight-style analyze page
│   ├── radar/page.tsx                   # /radar — Tech Radar SVG (4×4)
│   ├── watchlist/page.tsx               # /watchlist — pinned (localStorage)
│   │
│   ├── digest/
│   │   ├── page.tsx                     # /digest — render Markdown digest
│   │   └── DigestClient.tsx             # Client copy/download buttons
│   │
│   ├── settings/
│   │   ├── page.tsx                     # /settings — backend status + env health
│   │   └── SettingsClient.tsx           # Manual snapshot trigger (Server Action)
│   │
│   └── api/
│       ├── chat/route.ts                # POST: streaming chat with Claude + tools
│       ├── cron/snapshot/route.ts       # GET: scrape + upsert (cron-only, auth)
│       └── snapshots/latest/route.ts    # GET: latest daily rows (for client watchlist)
│
├── components/
│   ├── providers/
│   │   └── AppProvider.tsx              # Context: theme, lang, watchlist (localStorage)
│   │
│   ├── nav/
│   │   └── Nav.tsx                      # Glass sticky nav, 11 items, theme/lang toggle
│   │
│   ├── ui/                              # Primitives
│   │   ├── Badge.tsx                    # Tone variants (success/warning/danger/hot/brand/neutral)
│   │   ├── Button.tsx                   # variants (primary/secondary/ghost/danger) + sizes
│   │   ├── Card.tsx                     # rounded-xl + soft shadow + hover lift option
│   │   ├── EmptyState.tsx               # icon + title + description + action
│   │   ├── LanguageDot.tsx              # 50 GitHub language colors
│   │   ├── PageHeader.tsx               # eyebrow + title + description + actions + meta
│   │   ├── Skeleton.tsx                 # Shimmer animation
│   │   └── StatCard.tsx                 # Big number + icon + accent (default/brand/emerald/amber/rose/blue)
│   │
│   ├── filters/
│   │   └── FilterBar.tsx                # Timeframe pills, search, sort, classes, languages, min stars
│   │
│   ├── repo/
│   │   ├── RepoCard.tsx                 # Rank pill + lang dot + classification + heat + watch button
│   │   ├── Sparkline.tsx                # Inline rank-over-time SVG
│   │   ├── StarsHistoryChart.tsx        # Big SVG line chart (stars + rank variants)
│   │   └── SocialShare.tsx              # X/LinkedIn/Reddit (custom SVG icons)
│   │
│   ├── radar/
│   │   └── TechRadar.tsx                # Full-page Tech Radar SVG (4 quadrants × 4 rings)
│   │
│   ├── home/                            # Homepage-specific (OSSInsight-style)
│   │   ├── Hero.tsx                     # Eyebrow query + headline + chart card
│   │   ├── AnimatedCounter.tsx          # Number tween animation
│   │   ├── SnapshotHistoryChart.tsx     # Bar chart (14 days)
│   │   ├── HotCollections.tsx           # Horizontal scroll cards
│   │   ├── TrendingTable.tsx            # Table with timeframe + language tabs
│   │   └── FAQ.tsx                      # Accordion (8 questions)
│   │
│   ├── chat/
│   │   └── ChatUI.tsx                   # Streaming chat with Claude (ReadableStream)
│   │
│   ├── watchlist/
│   │   └── WatchButton.tsx              # Star icon, localStorage toggle
│   │
│   └── common/
│       └── TextI18n.tsx                 # `<T k="key" />` helper + useT hook
│
├── lib/                                 # Pure logic (no React)
│   ├── github-trending.ts               # Cheerio scraper (daily/weekly/monthly)
│   ├── classify.ts                      # adopt/monitor/caution heuristic + labels + colors
│   ├── heat.ts                          # Composite 0..100 score (velocity × scale + rank bonus)
│   ├── radar.ts                         # Quadrant + ring placement (Tech Radar)
│   ├── movers.ts                        # Compute risers/fallers/new/dropped
│   ├── digest.ts                        # Markdown generator
│   ├── filters.ts                       # URL search-params parsing/serialization
│   ├── i18n.ts                          # VI/EN dictionary (40+ keys)
│   ├── collections.ts                   # Helpers (list, get, intersect with trending)
│   ├── collections.data.ts              # 138 collections, 2904 repos (auto-gen, 99 KB)
│   ├── tools.ts                         # Claude tool registry (get_current_time, echo)
│   ├── anthropic.ts                     # Agent loop with prompt caching (5min ephemeral)
│   ├── actions.ts                       # Server Actions (runSnapshot, generateInsight cached 1h)
│   ├── storage.ts                       # Storage facade (Supabase OR JSON file, auto-detect)
│   └── supabase/
│       ├── client.ts                    # Browser client (anon key)
│       ├── server.ts                    # SSR client (anon key + cookies)
│       └── admin.ts                     # Service-role (server-only, bypass RLS)
│
└── types/
    └── index.ts                         # Shared types (ChatMessage, Role)
```

---

## 4. Routes (18 total)

| Route | Type | Mục đích |
|---|---|---|
| `/` | Dynamic | Dashboard — Hero, AI Insight, Hot Collections, Trending Table, FAQ |
| `/trending` | Dynamic | Full filterable list (timeframe, lang, search, sort, classes, collection) |
| `/movers` | Dynamic | Rank delta — 4 buckets (new/risers/fallers/dropped) |
| `/collections` | Dynamic | 138 collection cards (hot vs cold) |
| `/collections/[slug]` | Dynamic | Collection detail (matched + curated) |
| `/languages` | Dynamic | Heat-bar aggregate by language |
| `/languages/[lang]` | Dynamic | Repos của 1 ngôn ngữ |
| `/compare` | Dynamic | Side-by-side table (URL param `?repos=a,b,c`) |
| `/repo/[owner]/[repo]` | Dynamic | **OSSInsight-style analyze page** — hero, 5 stat cards, dual charts, collections, snapshots table |
| `/radar` | Dynamic | Tech Radar SVG (4 quadrants × 4 rings) |
| `/watchlist` | Static | Pinned repos (localStorage, client-side fetch) |
| `/digest` | Dynamic | Markdown export (copy/download) |
| `/settings` | Dynamic | Manual snapshot trigger + env health |
| `/chat` | Static | Claude chat UI |
| `/api/chat` | Dynamic | POST streaming chat endpoint |
| `/api/cron/snapshot` | Dynamic | GET cron endpoint (auth via CRON_SECRET) |
| `/api/snapshots/latest` | Dynamic | GET latest daily rows (for watchlist client) |
| `/_not-found` | Static | 404 |

---

## 5. Data flow

```
github.com/trending (HTML)
        ↓
   lib/github-trending.ts (cheerio scrape)
        ↓
   /api/cron/snapshot (auth) ───────────────┐
        ↓                                   │
   lib/storage.ts (auto-detect)             │
        ├── Supabase (prod)                 │
        │   └── trending_snapshots table    │
        │       (RLS public-read,           │
        │        service-role writes)       │
        └── data/snapshots.json (dev)       │
                                            │
   Pages read from storage facade ←─────────┘
        ↓
   Server Components (force-dynamic)
        ↓
   Client interactivity:
        - AppProvider (theme/lang/watchlist localStorage)
        - WatchButton, FilterBar, CompareInput
        - TrendingTable language tabs
        - FAQ accordion
        - SettingsClient manual trigger (Server Action)
```

---

## 6. Database schema

```sql
-- db/schema.sql
create table public.trending_snapshots (
  id            bigint generated always as identity primary key,
  captured_at   date not null,
  timeframe     text not null check (timeframe in ('daily', 'weekly', 'monthly')),
  rank          int  not null check (rank between 1 and 25),
  owner         text not null,
  repo          text not null,
  language      text,
  description   text,
  stars_gained  int,
  total_stars   int,
  url           text not null,
  fetched_at    timestamptz not null default now(),
  unique (captured_at, timeframe, owner, repo)
);

-- Indexes
trending_snapshots_captured_at_idx     -- (captured_at desc)
trending_snapshots_timeframe_lookup_idx -- (timeframe, captured_at desc, rank)

-- RLS
alter table trending_snapshots enable row level security;
-- Public read (anon + authenticated)
-- Writes only via service-role key (cron)
```

---

## 7. Environment variables

| Variable | Required | Phase nào | Mô tả |
|---|---|---|---|
| `CRON_SECRET` | ✅ | Snapshot cron | Any random string (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_SUPABASE_URL` | ⚠️ | Production | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⚠️ | Production | Public, safe to expose to browser |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ | Production | **Secret** — bypass RLS, server-only |
| `ANTHROPIC_API_KEY` | Optional | AI Insight + chat | `sk-ant-...` từ console.anthropic.com |
| `DATABASE_URL` | Optional | Postgres MCP (dev) | Direct Postgres connection string |
| `GITHUB_TOKEN` | Optional | GitHub MCP (dev) | PAT với scope `public_repo` |

**Khi không có Supabase env**: storage tự động fallback sang `data/snapshots.json` (local demo).

---

## 8. Cách chạy

### Setup lần đầu

```bash
cd C:\Users\ADMIN\.gemini\antigravity\Agent
npm install
cp .env.example .env.local                    # rồi điền keys
node scripts/smoke-trending.mjs daily         # verify scraper (không cần DB)
```

### Development

```bash
npm run dev                                   # http://localhost:3000

# Manual snapshot (yêu cầu CRON_SECRET trong .env.local)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/snapshot
```

### Production build local

```bash
npm run build && npm start                    # http://localhost:3000
```

### Type check + lint

```bash
npm run typecheck                             # tsc --noEmit
npm run lint                                  # next lint
```

### Re-build collections data (nếu OSSInsight update)

```bash
node scripts/build-collections.mjs            # rebuild lib/collections.data.ts
```

---

## 9. Deploy lên Vercel

1. Push repo lên GitHub
2. Vercel → "Import Project" → chọn repo
3. **Environment Variables**: paste 4 cái core (`CRON_SECRET`, 3 Supabase) + optional (`ANTHROPIC_API_KEY`)
4. Deploy → Vercel đọc `vercel.json` → cron tự chạy daily 01:00 UTC
5. (Nếu chưa có DB) tạo Supabase project + chạy `db/schema.sql` trong SQL Editor

**Lưu ý cho Vercel cron**: Vercel tự gửi header `Authorization: Bearer ${CRON_SECRET}` đến endpoint nếu env có set. Đừng skip step này.

---

## 10. Architecture decisions đáng chú ý

### Lý do từng quyết định

1. **Storage facade** (`lib/storage.ts`)  
   Auto-detect Supabase vs file. Cùng API, swap không sửa caller code. Cho phép dev local zero-config trước khi setup Supabase.

2. **Force-dynamic mọi page**  
   Luôn fresh data. Cache ở storage layer (Supabase response cache + cron upsert dedupe).

3. **Server Components mặc định**  
   Chỉ "use client" cho components cần state/effect/browser API:
   - `FilterBar`, `CompareInput`, `TrendingTable`, `FAQ` (interactivity state)
   - `ChatUI` (streaming + state)
   - `WatchButton`, `AppProvider` (localStorage)
   - `AnimatedCounter` (RAF animation)
   - `Nav` (usePathname)
   - `RepoCard` (uses `useApp()` for lang)
   - `DigestClient`, `SettingsClient` (clipboard, server action)

4. **No chart lib**  
   Tất cả SVG inline (`Sparkline`, `SnapshotHistoryChart`, `StarsHistoryChart`, `RankHistoryChart`, `TechRadar`). Bundle nhẹ (~110KB First Load) + flexible.

5. **i18n light-weight**  
   Không react-intl/i18next. Just `lib/i18n.ts` dictionary + `t(key, lang)` function. Đủ cho ~40 keys.

6. **138 collections compile-time**  
   YAML → TS file (`scripts/build-collections.mjs`), no runtime parsing, no fetch. Bundle vào client như static data.

7. **AI Insight cached 1h**  
   `unstable_cache` với key `["ai-insight"]`, revalidate 3600s. Reduce Anthropic spend (1 call/h × 24h = 24 calls/day max).

8. **Heat score = velocity × scale + rank bonus**  
   `(stars_gained / total_stars) × 0.65 + log10(total_stars+1)/6 × 0.35 + rank_bonus`. Repo nhỏ-spike-mạnh không lấn át repo lớn-active-đều.

9. **OSSInsight credit**  
   Footer + `/collections/[slug]` page có credit + license link. Tôn trọng Apache 2.0.

10. **Watchlist localStorage (no auth)**  
    Trade-off: không cần signup/server state. Cost: không sync giữa devices. Acceptable cho personal/team-internal tool.

11. **Service-role key cho writes**  
    Cron upsert qua service-role bypass RLS. Anon role chỉ select. Secret này phải gitignored, deploy qua Vercel env, **không** được expose qua client component.

12. **`force-dynamic` thay vì ISR**  
    ISR phức tạp vì Supabase data đổi qua cron. Dynamic + storage caching là đơn giản hơn và đủ nhanh.

---

## 11. Trạng thái roadmap

### ✅ Đã làm

- Scraper (cheerio) + cron + storage facade auto-detect
- Heat score + adopt/monitor/caution classification
- Movers (risers/fallers/new/dropped) với rank delta
- 138 collections (port từ OSSInsight YAML)
- Tech Radar SVG (4 quadrants × 4 rings, hover detail panel)
- Compare side-by-side với URL param sharing
- Languages aggregate page với heat-bar
- Repo analyze page (OSSInsight-style) với Stars + Rank charts
- Markdown digest export (copy/download)
- AI Insight bằng Claude (cached 1h)
- Watchlist localStorage
- Dark mode + VI/EN toggle
- Chat UI (Claude streaming với tools)
- Glass nav với 11 routes + theme/lang toggle
- Animated counter cho hero stats

### ❌ Chưa làm (roadmap)

| Phase | Scope | Effort | Cần gì thêm |
|---|---|---|---|
| 1 | GitHub REST enrichment (forks, PR/issue counts, contributors avatars) | 4h | `GITHUB_TOKEN` PAT |
| 2 | Per-repo activity feed (recent commits/PRs/issues) | 1.5 ngày | `GITHUB_TOKEN` + bảng `repo_events` |
| 3 | Live events firehose ("What's happening NOW") | 3 ngày | Background worker + SSE |
| 4 | GH Archive ingestion (match OSSInsight scale) | 1-2 tuần | Storage 50-100GB + ETL pipeline |
| — | Email/Slack alerts khi watchlist repo lên top | 1 ngày | Email provider (Resend/Sendgrid) |
| — | Auth admin (chỉ admin chạy được manual snapshot) | 1 ngày | Supabase Auth |
| — | Mobile drawer menu | 4h | — |
| — | Audit log of "decisions" | 1 ngày | Bảng `radar_decisions` + `/decisions` page |
| — | Cmd+K command palette | 1 ngày | — |

---

## 12. Tài nguyên ngoài

| | URL/Path |
|---|---|
| Project source | `C:\Users\ADMIN\.gemini\antigravity\Agent` |
| OSSInsight reference | `C:\Users\ADMIN\.gemini\antigravity\ossinsight-ref` (read-only, 64MB clone) |
| Supabase project | `https://bkgzfuhprvqzmhqzlmvt.supabase.co` |
| OSSInsight live | https://ossinsight.io |
| OSSInsight repo | https://github.com/pingcap/ossinsight (Apache 2.0) |
| GitHub trending source | https://github.com/trending (scraped) |

---

## 13. File đáng chú ý theo size

| File | Lines | Vai trò |
|---|---|---|
| `lib/collections.data.ts` | ~3000 | 138 collections × ~21 repos avg (auto-gen) |
| `app/page.tsx` | ~250 | Dashboard composition |
| `app/repo/[owner]/[repo]/page.tsx` | ~280 | OSSInsight-style analyze page |
| `components/home/TrendingTable.tsx` | ~200 | Table với language tabs |
| `components/radar/TechRadar.tsx` | ~180 | Tech Radar SVG |
| `app/trending/page.tsx` | ~170 | Full filter logic |
| `components/filters/FilterBar.tsx` | ~190 | Multi-filter UI |
| `components/repo/StarsHistoryChart.tsx` | ~150 | SVG line chart |

---

## 14. Quick reference

### Khi cần thêm tính năng

| Cần làm | Chỗ sửa |
|---|---|
| Thêm filter cho `/trending` | `lib/filters.ts` (parse) + `components/filters/FilterBar.tsx` (UI) + `app/trending/page.tsx` (apply) |
| Thêm classification rule mới | `lib/classify.ts` |
| Thay đổi heat formula | `lib/heat.ts` |
| Thêm route mới | `app/<name>/page.tsx` + `components/nav/Nav.tsx` (nav) + `lib/i18n.ts` (label) |
| Thêm storage backend | Implement methods trong `lib/storage.ts`, add to `backendMode()` |
| Update collections | Re-run `node scripts/build-collections.mjs` từ ossinsight-ref |
| Đổi cron schedule | `vercel.json` field `crons[0].schedule` (cron expression) |
| Đổi brand color | `tailwind.config.ts` field `colors.brand` |

### Debug

| Vấn đề | Check |
|---|---|
| Cron 401 | `CRON_SECRET` env có set không? Header có đúng `Bearer ${secret}`? |
| Cron 502 `no_rows_parsed` | GitHub HTML đã đổi class names. Update `lib/github-trending.ts` selectors |
| `/trending` 500 | Supabase env missing → fallback file mode? Check `currentBackend()` ở /settings |
| AI insight không có | `ANTHROPIC_API_KEY` chưa set, hoặc Anthropic API down |
| Watchlist mất | localStorage clear hoặc browser khác |
| Movers section ẩn | Cần ≥ 2 ngày snapshot. Cron chỉ chạy 1 lần/day |

---

**Tổng**: 85 source files, ~6500 lines TS/TSX, 18 routes, build ~110 KB First Load JS, deploy-ready.
