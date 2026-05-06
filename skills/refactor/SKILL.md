---
name: refactor
description: Refactor existing code without changing observable behavior — extract functions, rename, deduplicate, untangle types, split files. Use when the user asks to "clean up", "simplify", "extract", "rename", or "restructure".
---

# Refactor skill

## Rules
- **Behavior preserving**: tests must pass before AND after. If there are no tests, write a characterization test first.
- **One axis at a time**: rename OR extract OR move — not all three in one pass. Smaller diffs are easier to review and revert.
- **Three uses before abstracting**: don't extract a helper for two callers; wait for the third. Premature abstraction is harder to undo than duplication.
- **No drive-by changes**: if you spot an unrelated bug, file a TODO — don't fix it in the same diff.

## Common targets in this repo
- `lib/anthropic.ts` — agent loop is fine to extract steps from, but keep the `while` loop in one place; do not split the iteration across modules.
- `lib/tools.ts` — when a tool grows, move its handler to `lib/tools/<name>.ts` and re-export from `lib/tools.ts`.
- `components/chat/ChatUI.tsx` — split when a single concern (e.g. SSE parsing) crosses ~30 lines, not before.

## Before / after checklist
1. Run `npm run typecheck` before — capture baseline errors (should be 0).
2. Make the change.
3. Run `npm run typecheck` after — must still be 0.
4. Run any existing tests.
5. Diff: only the intended axis should be touched. Unrelated formatting/whitespace = revert.

## Stop signals
- Diff exceeds ~200 lines → split into multiple PRs.
- You're tempted to "also fix" something → stop, file a TODO.
- Tests start failing in unrelated modules → revert; the refactor wasn't behavior-preserving.
