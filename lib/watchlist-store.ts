// Server-side watchlist operations. RLS-enforced via authenticated session client.
// User must be logged in for these to work.

import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

export type WatchlistStatus =
  | "follow"
  | "review"
  | "test"
  | "adopt"
  | "ignore"
  | "caution";

export type WatchlistPriority = "high" | "medium" | "low";

export type WatchlistItem = {
  id: string;
  user_id: string;
  repo_id: number;
  status: WatchlistStatus;
  priority: WatchlistPriority;
  reason: string | null;
  next_review_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WatchlistItemWithRepo = WatchlistItem & {
  owner: string;
  repo: string;
  description: string | null;
  language: string | null;
};

// Add a repo to the user's watchlist.
// Server-side resolves owner/repo → repo_id (must exist in repositories table).
export async function addToWatchlist(input: {
  owner: string;
  repo: string;
  status?: WatchlistStatus;
  priority?: WatchlistPriority;
  reason?: string;
}): Promise<WatchlistItem | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  // Look up repo_id (using admin to bypass RLS on repositories — public read anyway)
  const admin = createAdminClient();
  const { data: repo } = await admin
    .from("repositories")
    .select("id")
    .eq("owner", input.owner)
    .eq("repo", input.repo)
    .maybeSingle();

  if (!repo) {
    return { error: `Repo ${input.owner}/${input.repo} not in radar (try search /trending first)` };
  }

  const { data, error } = await supabase
    .from("watchlist_items")
    .upsert(
      {
        user_id: user.id,
        repo_id: repo.id,
        status: input.status ?? "follow",
        priority: input.priority ?? "medium",
        reason: input.reason ?? null,
      },
      { onConflict: "user_id,repo_id" },
    )
    .select()
    .single();

  if (error) return { error: error.message };
  return data as WatchlistItem;
}

export async function removeFromWatchlist(
  owner: string,
  repo: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const admin = createAdminClient();
  const { data: r } = await admin
    .from("repositories")
    .select("id")
    .eq("owner", owner)
    .eq("repo", repo)
    .maybeSingle();
  if (!r) return { ok: false, error: "repo_not_found" };

  const { error } = await supabase
    .from("watchlist_items")
    .delete()
    .eq("user_id", user.id)
    .eq("repo_id", r.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getMyWatchlist(): Promise<WatchlistItemWithRepo[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: items } = await supabase
    .from("watchlist_items")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (!items || items.length === 0) return [];

  const admin = createAdminClient();
  const repoIds = items.map((i) => i.repo_id);
  const { data: repos } = await admin
    .from("repositories")
    .select("id, owner, repo, description, language")
    .in("id", repoIds);

  const repoMap = new Map((repos ?? []).map((r) => [r.id, r]));

  return items.map((i) => {
    const r = repoMap.get(i.repo_id);
    return {
      ...i,
      owner: r?.owner ?? "",
      repo: r?.repo ?? "",
      description: r?.description ?? null,
      language: r?.language ?? null,
    } as WatchlistItemWithRepo;
  });
}

export async function isWatchedByUser(
  owner: string,
  repo: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const admin = createAdminClient();
  const { data: r } = await admin
    .from("repositories")
    .select("id")
    .eq("owner", owner)
    .eq("repo", repo)
    .maybeSingle();
  if (!r) return false;

  const { count } = await supabase
    .from("watchlist_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("repo_id", r.id);

  return (count ?? 0) > 0;
}
