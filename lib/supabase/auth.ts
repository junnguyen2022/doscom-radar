// Server-side helpers for Supabase Auth (GitHub OAuth).
// Used by Server Components, Server Actions, and Route Handlers.

import { createClient } from "./server";
import type { User } from "@supabase/supabase-js";

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized — login required");
  }
  return user;
}

export type SimpleProfile = {
  id: string;
  github_username: string | null;
  email: string | null;
  avatar_url: string | null;
};

// Extract a simple profile from Supabase user metadata.
// GitHub OAuth populates user_metadata with avatar_url, user_name, full_name, etc.
export function profileFromUser(user: User): SimpleProfile {
  const m = user.user_metadata ?? {};
  return {
    id: user.id,
    github_username:
      (m.user_name as string | undefined) ??
      (m.preferred_username as string | undefined) ??
      null,
    email: user.email ?? null,
    avatar_url: (m.avatar_url as string | undefined) ?? null,
  };
}
