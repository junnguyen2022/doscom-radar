---
name: claude-api
description: Build, debug, and tune Anthropic Claude API integrations in this project. Use when adding or modifying any code that imports `@anthropic-ai/sdk`, including tool use, prompt caching, streaming, and model selection.
---

# Claude API skill

When writing or modifying Anthropic SDK code in this repo:

## Always
- **Prompt caching**: add `cache_control: { type: "ephemeral" }` to the system prompt and to stable tool definitions. The cache TTL is 5 minutes.
- **Pin a model**: use one of `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`. Never use `claude-3-*` (deprecated).
- **Tool loop**: when `tools` are passed, loop until `response.stop_reason !== "tool_use"`. Append the assistant message and `tool_result` blocks to `messages` each iteration.
- **Validate tool input**: every handler in `lib/tools.ts` must validate `input` before performing side effects.
- **Read API key from env**: `process.env.ANTHROPIC_API_KEY` — never hardcode.

## Never
- Hardcode API keys.
- Use deprecated models (`claude-3-*`, `claude-2`).
- Skip prompt caching on system prompts > ~1024 tokens.
- Trust tool input shape — always validate.

## File anchors
- Client + agent loop: `lib/anthropic.ts`
- Tool registry + handlers: `lib/tools.ts`
- HTTP endpoint: `app/api/chat/route.ts`

## Default model selection
- User-facing chat: `claude-sonnet-4-6` (balanced speed/quality)
- Heavy reasoning, long context: `claude-opus-4-7`
- High-volume / fast classification: `claude-haiku-4-5-20251001`
