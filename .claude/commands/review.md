---
description: Code-review the current branch using the code-reviewer subagent
---

Review uncommitted + branch changes:

1. Run `git status` and `git diff main...HEAD` to gather the diff.
2. Delegate to the `code-reviewer` agent with the full diff as context.
3. Print the agent's report verbatim. Do NOT auto-fix — leave fixes to the user.
