---
name: code-review
description: Review changed code for correctness, security, and Next.js + Supabase + Anthropic SDK best practices. Use before committing or opening a PR.
---

# Code review skill

For every diff:

## Next.js (App Router)
- Server Components by default — `"use client"` only when state, effects, or browser APIs are needed.
- Files marked `"use client"` must NOT import `next/headers`, `next/server`, or any server-only module.
- Server Actions for mutations; API routes only for streaming or external webhooks.

## Supabase
- Every user-scoped query must rely on RLS, OR use the service role key intentionally and only on the server.
- `SUPABASE_SERVICE_ROLE_KEY` must NEVER appear in a Client Component or anything bundled to the browser.
- Use `lib/supabase/server.ts` in Server Components / Server Actions, `lib/supabase/client.ts` in Client Components.

## Anthropic SDK
- Prompt caching applied (see `skills/claude-api/`).
- Tool input validated in `lib/tools.ts` before side effects.
- No deprecated model strings.

## Security
- No hardcoded secrets (`grep` for `sk-`, `ANTHROPIC_`, `SUPABASE_`).
- User input sanitized before SQL templating, shell execution, or HTML rendering.
- No `eval`, `Function()`, or `dangerouslySetInnerHTML` without sanitization.

## Output format
For each issue: **file:line — severity (Critical/High/Medium/Low) — description — proposed fix**. Skip stylistic nits.
