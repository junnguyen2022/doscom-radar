-- Phase 2 — Scoring schema. Apply via Supabase SQL Editor.
-- Idempotent: safe to re-run.
--
-- Reference: ARCHITECTURE_V2_DECISIONS.md §5.

-- ============================================================================
-- repo_scores — daily score snapshot per repo.
-- Recommendation rule: see lib/config/scoring-weights.ts.
-- ============================================================================

create table if not exists public.repo_scores (
  id                    bigint generated always as identity primary key,
  repo_id               bigint not null references public.repositories(id) on delete cascade,
  score_date            date not null,
  -- Component scores (0..100)
  heat_score            numeric(5,2) default 0,
  growth_score          numeric(5,2) default 0,
  activity_score        numeric(5,2) default 0,
  community_score       numeric(5,2) default 0,
  maintenance_score     numeric(5,2) default 0,
  relevance_score       numeric(5,2) default 0,
  risk_penalty          numeric(5,2) default 0,
  -- Composite
  radar_score           numeric(5,2) default 0,
  -- Recommendation
  recommendation        text check (recommendation in ('adopt', 'test', 'follow', 'caution', 'ignore')),
  confidence            text check (confidence in ('high', 'medium', 'low')),
  risk_flags            text[] default '{}',
  relevance_tier        text check (relevance_tier in ('high', 'medium', 'low', 'none')),
  score_reason          text,
  calculated_at         timestamptz not null default now(),
  unique (repo_id, score_date)
);

create index if not exists repo_scores_score_date_idx
  on public.repo_scores (score_date desc);
create index if not exists repo_scores_radar_score_idx
  on public.repo_scores (score_date desc, radar_score desc);
create index if not exists repo_scores_recommendation_idx
  on public.repo_scores (recommendation, score_date desc);

alter table public.repo_scores enable row level security;

drop policy if exists "repo_scores_select_public" on public.repo_scores;
create policy "repo_scores_select_public"
  on public.repo_scores for select
  to anon, authenticated
  using (true);

-- ============================================================================
-- Add commits_30d field to repo_metrics_daily if missing.
-- (Already in schema.v2.sql but confirming idempotent.)
-- ============================================================================

-- (no-op — schema.v2.sql already has commits_30d)
