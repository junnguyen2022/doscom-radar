---
description: First-time project setup
---

Bootstrap this project:

1. Run `npm install`. Report any peer-dep warnings to the user.
2. If `.env.local` does not exist, copy `.env.example` to `.env.local` and list the env vars the user must fill in (ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL).
3. Run `npm run typecheck` to verify the install succeeded. If it fails, surface the errors.
4. Print a checklist of next steps:
   - Create a Supabase project + get the URL and keys
   - Get an Anthropic API key from console.anthropic.com
   - Run `npm run dev` to start the local server at http://localhost:3000
