---
name: text-writer
description: Write user-facing copy — UI strings, error messages, marketing landing copy, README sections, release notes. Use when the task is producing prose for humans, not code.
---

# Text writer skill

## Voice
- Direct, concrete, second-person ("You can…").
- No marketing fluff ("revolutionary", "seamless", "cutting-edge").
- No emoji unless the user asks.
- If the source language of the conversation is Vietnamese, write Vietnamese; otherwise English. Never mix in the same paragraph.

## Length
- UI strings: ≤ 6 words where possible.
- Error messages: state what failed + what the user should do, in one sentence.
- README intros: ≤ 2 sentences before the first heading.
- Release notes: bullet per change, lead with the verb (Added / Fixed / Changed / Removed).

## Anchors in this repo
- App copy lives in components themselves (no i18n yet) — when writing, edit the component directly.
- README.md (if present) is the user-facing entry point; CLAUDE.md is for Claude Code only.

## Anti-patterns
- "We are excited to announce…"
- "Simply click the button"
- Multi-paragraph error messages
- Burying the action verb at the end of a sentence
