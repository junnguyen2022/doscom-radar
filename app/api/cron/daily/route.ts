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
import { runScoringBatch } from "@/lib/scoring-store";
import { runInsightBatch } from "@/lib/insight-generator";

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
  // Cap reduced to 20 to leave headroom for AI insight step (60s timeout).
  // Was 50 → 30 → 20. GraphQL search aliases (4/repo) are heavier than expected.
  if (currentBackend() === "supabase") {
    const enrichResult = await timed("enrich", async () => {
      return await runEnrichment({ cap: 20, delayMs: 30 });
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

  // Step 3 — score (Phase 2, fast: ~1s)
  if (currentBackend() === "supabase") {
    const scoreResult = await timed("score", async () => {
      return await runScoringBatch();
    });
    results.push(scoreResult);
  } else {
    results.push({
      step: "score",
      ok: true,
      ms: 0,
      data: { skipped: "file mode — Supabase required" },
    });
  }

  // Step 4 — AI insights (Phase 4) — top 3 by radar_score
  // Each Claude call = 5-7s. Cap 3 keeps us under 60s function timeout.
  // Idempotent: subsequent cron runs cover the next 3 (skipping already-done).
  const elapsedBeforeInsight = Date.now() - start;
  if (currentBackend() === "supabase" && elapsedBeforeInsight < 45000) {
    const insightResult = await timed("insight", async () => {
      return await runInsightBatch(2);
    });
    results.push(insightResult);
  } else {
    results.push({
      step: "insight",
      ok: true,
      ms: 0,
      data: {
        skipped:
          currentBackend() !== "supabase"
            ? "file mode"
            : `time guard (elapsed ${elapsedBeforeInsight}ms)`,
      },
    });
  }

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
