-- Phase 4 — AI Insight schema. Apply via Supabase SQL Editor.
-- Idempotent.
--
-- Reference: ARCHITECTURE_V2_DECISIONS.md §8.

create table if not exists public.repo_insights (
  id                bigint generated always as identity primary key,
  repo_id           bigint not null references public.repositories(id) on delete cascade,
  insight_date      date not null,
  -- Structured insight (per V2 §8.1 contract)
  summary           text not null,
  why_trending      text,
  technical_value   text,
  doscom_use_case   text,
  risk_note         text,
  recommendation    text check (recommendation in ('adopt', 'test', 'follow', 'caution', 'ignore')),
  confidence        text check (confidence in ('high', 'medium', 'low')),
  evidence          jsonb not null default '[]'::jsonb,
  -- Metadata
  prompt_version    text,
  model             text,
  generated_at      timestamptz not null default now(),
  unique (repo_id, insight_date)
);

create index if not exists repo_insights_repo_date_idx
  on public.repo_insights (repo_id, insight_date desc);
create index if not exists repo_insights_recommendation_idx
  on public.repo_insights (recommendation, insight_date desc);

alter table public.repo_insights enable row level security;

drop policy if exists "repo_insights_select_public" on public.repo_insights;
create policy "repo_insights_select_public"
  on public.repo_insights for select
  to anon, authenticated
  using (true);
