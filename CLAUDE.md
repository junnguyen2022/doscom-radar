# Agent — AI Agent App

Next.js + Supabase + Anthropic SDK với tool calling.

## Tech stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (auth + Postgres) — helpers ở `lib/supabase/`
- Anthropic SDK (`@anthropic-ai/sdk`) — Claude với tool calling, xem `lib/anthropic.ts`

## Conventions
- Server Components mặc định; chỉ dùng `"use client"` khi cần state/effect/browser API
- Server Actions cho mutation; chỉ dùng API route khi cần streaming hoặc external webhook
- **Mọi gọi Anthropic API PHẢI bật prompt caching** (xem `skills/claude-api/`)
- DB query qua Supabase client — không có raw SQL string ngoài `db/` migrations

## File layout
- `app/` — Next.js App Router pages + API routes
- `components/` — React components
- `lib/` — shared utilities (anthropic, supabase, tools)
- `types/` — TypeScript types
- `db/` — SQL migrations (khi thêm)

## Security
- Secrets qua `.env.local` (gitignored). KHÔNG commit `.env*` trừ `.env.example`
- Validate input trước khi truyền vào Claude tools
- Bật Supabase RLS cho mọi user-scoped data

## Workflow
- `npm run dev` — local dev
- `npm run lint && npm run typecheck` — trước khi commit
- Conventional commits (feat/fix/chore/refactor/docs)

## Models in use
- Default agent: `claude-sonnet-4-6`
- Heavy reasoning: `claude-opus-4-7`
- Fast/cheap: `claude-haiku-4-5-20251001`

## Features

### GitHub trending tracker (`/trending`)
- Scrapes `github.com/trending` (daily/weekly/monthly), persists snapshots, computes daily movers (risers/fallers/new/dropped).
- Cron: Vercel Cron hits `GET /api/cron/snapshot` daily at 01:00 UTC, auth via `CRON_SECRET`.
- Scraper: `lib/github-trending.ts` (cheerio).
- Storage facade: `lib/storage.ts` auto-detects backend.
  - **Supabase mode** — used when `NEXT_PUBLIC_SUPABASE_URL` AND `SUPABASE_SERVICE_ROLE_KEY` are set. Writes via service-role; reads via service-role too.
  - **File mode** — fallback when those env vars are missing. Writes to `data/snapshots.json` (gitignored). Local demo only — does NOT persist on Vercel (filesystem is read-only/ephemeral). Use this for local dev before signing up Supabase.
- Known fragility: scraper depends on GitHub HTML class names (`article.Box-row`, `.float-sm-right`, `[itemprop="programmingLanguage"]`). If GitHub changes layout, scraper breaks — endpoint returns `502 no_rows_parsed`.

### Setup steps for trending

**Local file mode (zero-config demo):**
1. Set `CRON_SECRET=<any-string>` in `.env.local`.
2. `npm run dev`
3. `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/snapshot`
4. Open `http://localhost:3000/trending` — data renders, header shows `backend: file (local demo)`.

**Production / Supabase mode:**
1. Create Supabase project, run `db/schema.sql` in SQL Editor.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` in `.env.local` (and Vercel env for prod).
3. Storage facade auto-switches — header shows `backend: supabase`.
