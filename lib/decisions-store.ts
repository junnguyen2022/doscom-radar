// Server-side decision log operations. RLS-enforced via authenticated session client.

import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

export type DecisionType =
  | "follow"
  | "review"
  | "test"
  | "adopt"
  | "ignore"
  | "caution";

export type RadarDecision = {
  id: string;
  user_id: string;
  repo_id: number;
  decision: DecisionType;
  previous_decision: string | null;
  decision_reason: string;
  test_plan: string | null;
  risk_note: string | null;
  due_date: string | null;
  result_note: string | null;
  decided_at: string;
};

export type DecisionWithRepo = RadarDecision & {
  owner: string;
  repo: string;
  description: string | null;
};

export async function logDecision(input: {
  owner: string;
  repo: string;
  decision: DecisionType;
  decision_reason: string;
  test_plan?: string;
  risk_note?: string;
  due_date?: string;
}): Promise<RadarDecision | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const admin = createAdminClient();
  const { data: repo } = await admin
    .from("repositories")
    .select("id")
    .eq("owner", input.owner)
    .eq("repo", input.repo)
    .maybeSingle();

  if (!repo) {
    return { error: `Repo ${input.owner}/${input.repo} not in radar` };
  }

  // Find previous decision for context
  const { data: prev } = await supabase
    .from("radar_decisions")
    .select("decision")
    .eq("repo_id", repo.id)
    .eq("user_id", user.id)
    .order("decided_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("radar_decisions")
    .insert({
      user_id: user.id,
      repo_id: repo.id,
      decision: input.decision,
      previous_decision: prev?.decision ?? null,
      decision_reason: input.decision_reason,
      test_plan: input.test_plan ?? null,
      risk_note: input.risk_note ?? null,
      due_date: input.due_date ?? null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Also sync to watchlist_items.status
  await supabase
    .from("watchlist_items")
    .upsert(
      {
        user_id: user.id,
        repo_id: repo.id,
        status: input.decision,
      },
      { onConflict: "user_id,repo_id" },
    );

  return data as RadarDecision;
}

export async function getMyDecisions(opts: {
  limit?: number;
  decision?: DecisionType;
}): Promise<DecisionWithRepo[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let q = supabase
    .from("radar_decisions")
    .select("*")
    .eq("user_id", user.id)
    .order("decided_at", { ascending: false });

  if (opts.decision) q = q.eq("decision", opts.decision);
  if (opts.limit) q = q.limit(opts.limit);

  const { data: decisions } = await q;
  if (!decisions || decisions.length === 0) return [];

  const admin = createAdminClient();
  const repoIds = Array.from(new Set(decisions.map((d) => d.repo_id)));
  const { data: repos } = await admin
    .from("repositories")
    .select("id, owner, repo, description")
    .in("id", repoIds);

  const repoMap = new Map((repos ?? []).map((r) => [r.id, r]));

  return decisions.map((d) => {
    const r = repoMap.get(d.repo_id);
    return {
      ...d,
      owner: r?.owner ?? "",
      repo: r?.repo ?? "",
      description: r?.description ?? null,
    } as DecisionWithRepo;
  });
}

export async function getDecisionHistoryForRepo(
  owner: string,
  repo: string,
): Promise<RadarDecision[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data: r } = await admin
    .from("repositories")
    .select("id")
    .eq("owner", owner)
    .eq("repo", repo)
    .maybeSingle();
  if (!r) return [];

  const { data } = await supabase
    .from("radar_decisions")
    .select("*")
    .eq("user_id", user.id)
    .eq("repo_id", r.id)
    .order("decided_at", { ascending: false });

  return (data as RadarDecision[]) ?? [];
}

export async function getDecisionStats(): Promise<{
  total: number;
  byDecision: Record<string, number>;
  dueThisWeek: number;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { total: 0, byDecision: {}, dueThisWeek: 0 };

  const { data: items } = await supabase
    .from("watchlist_items")
    .select("status, next_review_at")
    .eq("user_id", user.id);

  if (!items) return { total: 0, byDecision: {}, dueThisWeek: 0 };

  const byDecision: Record<string, number> = {};
  let dueThisWeek = 0;
  const weekFromNow = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  for (const i of items) {
    byDecision[i.status] = (byDecision[i.status] ?? 0) + 1;
    if (
      i.next_review_at &&
      i.next_review_at >= today &&
      i.next_review_at <= weekFromNow
    ) {
      dueThisWeek++;
    }
  }

  return { total: items.length, byDecision, dueThisWeek };
}
