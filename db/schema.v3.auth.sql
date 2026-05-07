-- Phase 3 — Auth + Watchlist + Decisions schema.
-- Idempotent: safe to re-run.
-- Apply via Supabase SQL Editor.
--
-- Solo simplifications (per ARCHITECTURE_V2_DECISIONS.md §4):
-- - No team_watchlists table — each row directly references auth.users
-- - One watchlist per user (implicit via user_id)

-- ============================================================================
-- watchlist_items — repos a user has pinned with status + priority.
-- ============================================================================

create table if not exists public.watchlist_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  repo_id         bigint not null references public.repositories(id) on delete cascade,
  status          text not null default 'follow' check (
    status in ('follow', 'review', 'test', 'adopt', 'ignore', 'caution')
  ),
  priority        text not null default 'medium' check (
    priority in ('high', 'medium', 'low')
  ),
  reason          text,
  next_review_at  date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, repo_id)
);

create index if not exists watchlist_items_user_idx
  on public.watchlist_items (user_id, updated_at desc);
create index if not exists watchlist_items_user_status_idx
  on public.watchlist_items (user_id, status);
create index if not exists watchlist_items_review_idx
  on public.watchlist_items (next_review_at)
  where next_review_at is not null;

alter table public.watchlist_items enable row level security;

drop policy if exists "watchlist_items_select_own" on public.watchlist_items;
create policy "watchlist_items_select_own"
  on public.watchlist_items for select
  using (auth.uid() = user_id);

drop policy if exists "watchlist_items_insert_own" on public.watchlist_items;
create policy "watchlist_items_insert_own"
  on public.watchlist_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "watchlist_items_update_own" on public.watchlist_items;
create policy "watchlist_items_update_own"
  on public.watchlist_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "watchlist_items_delete_own" on public.watchlist_items;
create policy "watchlist_items_delete_own"
  on public.watchlist_items for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- radar_decisions — decision log for repos.
-- Append-only history; latest row per repo_id is the current state.
-- ============================================================================

create table if not exists public.radar_decisions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  repo_id             bigint not null references public.repositories(id) on delete cascade,
  decision            text not null check (
    decision in ('follow', 'review', 'test', 'adopt', 'ignore', 'caution')
  ),
  previous_decision   text,
  decision_reason     text not null,
  test_plan           text,
  risk_note           text,
  due_date            date,
  result_note         text,
  decided_at          timestamptz not null default now()
);

create index if not exists radar_decisions_user_idx
  on public.radar_decisions (user_id, decided_at desc);
create index if not exists radar_decisions_repo_idx
  on public.radar_decisions (repo_id, decided_at desc);
create index if not exists radar_decisions_user_decision_idx
  on public.radar_decisions (user_id, decision);
create index if not exists radar_decisions_due_idx
  on public.radar_decisions (due_date)
  where due_date is not null;

alter table public.radar_decisions enable row level security;

drop policy if exists "radar_decisions_select_own" on public.radar_decisions;
create policy "radar_decisions_select_own"
  on public.radar_decisions for select
  using (auth.uid() = user_id);

drop policy if exists "radar_decisions_insert_own" on public.radar_decisions;
create policy "radar_decisions_insert_own"
  on public.radar_decisions for insert
  with check (auth.uid() = user_id);

drop policy if exists "radar_decisions_update_own" on public.radar_decisions;
create policy "radar_decisions_update_own"
  on public.radar_decisions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
