-- GitHub trending snapshots
-- One row per (captured_at, timeframe, owner/repo). Cron upserts daily.

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

create index if not exists trending_snapshots_captured_at_idx
  on public.trending_snapshots (captured_at desc);

create index if not exists trending_snapshots_timeframe_lookup_idx
  on public.trending_snapshots (timeframe, captured_at desc, rank);

alter table public.trending_snapshots enable row level security;

-- Public read: data is scraped from a public source, no PII.
drop policy if exists "trending_snapshots_select_anon" on public.trending_snapshots;
create policy "trending_snapshots_select_anon"
  on public.trending_snapshots
  for select
  to anon, authenticated
  using (true);

-- No insert/update/delete policies => only the service-role key (cron) can write.
