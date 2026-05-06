---
name: security-audit
description: Audit the codebase for OWASP Top 10 issues, leaked secrets, RLS gaps, and unsafe Claude tool definitions. Use when the user asks for a security review.
---

# Security audit skill

## Checks (in order)

1. **Secrets in repo**
   - Grep for `sk-`, `ANTHROPIC_API_KEY=`, `SUPABASE_SERVICE_ROLE_KEY=`, `DATABASE_URL=postgres`.
   - Any hardcoded value (not `process.env.*`) is **Critical**.

2. **Service-role key exposure**
   - Search for imports of `SUPABASE_SERVICE_ROLE_KEY` in any file under `app/` or `components/` that is not strictly server-only.
   - Any reference inside a `"use client"` file is **Critical**.

3. **Supabase RLS coverage**
   - For every table referenced in `lib/queries/` or `app/`, check `db/policies.sql` (or migrations) for `enable row level security` and a user-scoped policy.
   - Tables with no RLS are **High**.

4. **Anthropic tool safety**
   - For each tool in `lib/tools.ts`, verify the handler validates the shape of `input` before any side effect (DB write, file write, shell, HTTP).
   - Missing validation on a tool with side effects is **High**.

5. **Auth on mutation endpoints**
   - Every `app/api/**/route.ts` that performs mutation (POST/PUT/PATCH/DELETE) must check the user's session before acting.
   - Missing auth check is **Critical**.

6. **Injection surfaces**
   - SQL: only via Supabase client — no template strings.
   - HTML: no `dangerouslySetInnerHTML` without sanitization.
   - Shell: no `child_process.exec` with user input.

## Output

Group by severity (Critical / High / Medium / Low). Each finding: **file:line — issue — fix**.
End with one line: `Verdict: SAFE | NEEDS-FIX | BLOCKED`.

Do NOT modify code — only report.
