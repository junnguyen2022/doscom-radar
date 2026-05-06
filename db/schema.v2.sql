-- Agent Radar V2 schema — additive to db/schema.sql.
-- Idempotent: safe to re-run.
-- Apply via Supabase SQL Editor.

-- ============================================================================
-- Repositories — canonical repo metadata from GitHub GraphQL.
-- ============================================================================

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
  github_created_at     timestamptz,
  github_updated_at     timestamptz,
  pushed_at             timestamptz,
  last_enriched_at      timestamptz,
  raw                   jsonb,
  inserted_at           timestamptz not null default now(),
  modified_at           timestamptz not null default now(),
  unique (owner, repo)
);

create index if not exists repositories_full_name_idx
  on public.repositories (full_name);
create index if not exists repositories_language_idx
  on public.repositories (language);
create index if not exists repositories_pushed_at_idx
  on public.repositories (pushed_at desc);
create index if not exists repositories_topics_gin_idx
  on public.repositories using gin (topics);
create index if not exists repositories_last_enriched_idx
  on public.repositories (last_enriched_at nulls first);

alter table public.repositories enable row level security;

drop policy if exists "repositories_select_public" on public.repositories;
create policy "repositories_select_public"
  on public.repositories for select
  to anon, authenticated
  using (true);

-- ============================================================================
-- Repo metrics daily — time-series snapshot of stars, forks, issues, PRs.
-- Pruned after 90 days (see ARCHITECTURE_V2_DECISIONS.md §9).
-- ============================================================================

create table if not exists public.repo_metrics_daily (
  id                    bigint generated always as identity primary key,
  repo_id               bigint not null references public.repositories(id) on delete cascade,
  metric_date           date not null,
  total_stars           int,
  forks_count           int,
  watchers_count        int,
  open_issues_count     int,
  subscribers_count     int,
  size_kb               int,
  stars_delta_1d        int,
  stars_delta_7d        int,
  stars_delta_30d       int,
  forks_delta_7d        int,
  pushed_within_days    int,
  latest_release_at     timestamptz,
  latest_release_tag    text,
  contributors_count    int,
  commits_30d           int,
  prs_open_30d          int,
  prs_merged_30d        int,
  issues_opened_30d     int,
  issues_closed_30d     int,
  fetched_at            timestamptz not null default now(),
  unique (repo_id, metric_date)
);

create index if not exists repo_metrics_daily_repo_date_idx
  on public.repo_metrics_daily (repo_id, metric_date desc);
create index if not exists repo_metrics_daily_metric_date_idx
  on public.repo_metrics_daily (metric_date desc);

alter table public.repo_metrics_daily enable row level security;

drop policy if exists "repo_metrics_daily_select_public" on public.repo_metrics_daily;
create policy "repo_metrics_daily_select_public"
  on public.repo_metrics_daily for select
  to anon, authenticated
  using (true);

-- ============================================================================
-- Cost telemetry — track API/AI usage to stay under free-tier budgets.
-- ============================================================================

create table if not exists public.cost_telemetry (
  id              bigint generated always as identity primary key,
  recorded_at     timestamptz not null default now(),
  resource        text not null check (resource in (
    'github_graphql', 'github_rest',
    'anthropic_input_tokens', 'anthropic_output_tokens',
    'supabase_egress_bytes'
  )),
  units           int not null,
  estimated_cost  numeric(12, 6),
  job_run_id      uuid,
  metadata        jsonb
);

create index if not exists cost_telemetry_recorded_idx
  on public.cost_telemetry (recorded_at desc);
create index if not exists cost_telemetry_resource_idx
  on public.cost_telemetry (resource, recorded_at desc);

alter table public.cost_telemetry enable row level security;

-- Public read — no PII, useful for /settings dashboard
drop policy if exists "cost_telemetry_select_public" on public.cost_telemetry;
create policy "cost_telemetry_select_public"
  on public.cost_telemetry for select
  to anon, authenticated
  using (true);
