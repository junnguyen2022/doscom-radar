// Daily cron — chained job for V2.
// Runs: snapshot → enrich → (score → insight in later phases).
// Vercel Hobby allows 60s function timeout — design must fit.
// Reference: ARCHITECTURE_V2_DECISIONS.md §7.

import type { NextRequest } from "next/server";
import { fetchAllTrending, type Timeframe } from "@/lib/github-trending";
import {
  upsertSnapshots,
  currentBackend,
  type SnapshotRow,
} from "@/lib/storage";
import { runEnrichment } from "@/lib/enrichment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type StepResult = { step: string; ok: boolean; ms: number; data?: unknown; error?: string };

function authorize(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET) return false;
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function timed<T>(
  step: string,
  fn: () => Promise<T>,
): Promise<StepResult> {
  const start = Date.now();
  try {
    const data = await fn();
    return { step, ok: true, ms: Date.now() - start, data };
  } catch (err) {
    return {
      step,
      ok: false,
      ms: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const results: StepResult[] = [];

  // Step 1 — snapshot trending (~5s)
  const snapshotResult = await timed("snapshot", async () => {
    const buckets = await fetchAllTrending();
    const today = new Date().toISOString().slice(0, 10);
    const rows: SnapshotRow[] = [];
    for (const [tf, repos] of Object.entries(buckets) as [
      Timeframe,
      (typeof buckets)["daily"],
    ][]) {
      for (const r of repos) {
        rows.push({
          captured_at: today,
          timeframe: tf,
          rank: r.rank,
          owner: r.owner,
          repo: r.repo,
          language: r.language,
          description: r.description,
          stars_gained: r.starsGained,
          total_stars: r.totalStars,
          url: r.url,
        });
      }
    }
    if (rows.length === 0) {
      throw new Error("no_rows_parsed (GitHub HTML may have changed)");
    }
    await upsertSnapshots(rows);
    return {
      counts: {
        daily: buckets.daily.length,
        weekly: buckets.weekly.length,
        monthly: buckets.monthly.length,
      },
      inserted: rows.length,
    };
  });
  results.push(snapshotResult);

  // If snapshot failed, abort early — enrichment depends on it
  if (!snapshotResult.ok) {
    return Response.json(
      {
        ok: false,
        backend: currentBackend(),
        duration_ms: Date.now() - start,
        steps: results,
      },
      { status: 500 },
    );
  }

  // Step 2 — enrich top repos via GraphQL (~25s)
  // Skip if file mode (enrichment requires Supabase tables)
  if (currentBackend() === "supabase") {
    const enrichResult = await timed("enrich", async () => {
      return await runEnrichment({ cap: 100, delayMs: 80 });
    });
    results.push(enrichResult);
  } else {
    results.push({
      step: "enrich",
      ok: true,
      ms: 0,
      data: { skipped: "file mode — Supabase required" },
    });
  }

  // Step 3 — score (Phase 2, deferred)
  // Step 4 — AI insight (Phase 4, deferred)
  // Step 5 — pruning (later)

  const allOk = results.every((r) => r.ok);
  return Response.json(
    {
      ok: allOk,
      backend: currentBackend(),
      duration_ms: Date.now() - start,
      steps: results,
    },
    { status: allOk ? 200 : 500 },
  );
}
