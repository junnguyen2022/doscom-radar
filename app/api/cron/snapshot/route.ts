import type { NextRequest } from "next/server";
import { fetchAllTrending, type Timeframe } from "@/lib/github-trending";
import {
  upsertSnapshots,
  currentBackend,
  type SnapshotRow,
} from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let buckets;
  try {
    buckets = await fetchAllTrending();
  } catch (err) {
    return Response.json(
      {
        error: "fetch_failed",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const rows: SnapshotRow[] = [];

  for (const [timeframe, repos] of Object.entries(buckets) as [
    Timeframe,
    (typeof buckets)["daily"],
  ][]) {
    for (const r of repos) {
      rows.push({
        captured_at: today,
        timeframe,
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
    return Response.json(
      { error: "no_rows_parsed", hint: "GitHub HTML may have changed" },
      { status: 502 },
    );
  }

  try {
    await upsertSnapshots(rows);
  } catch (err) {
    return Response.json(
      {
        error: "upsert_failed",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  return Response.json({
    ok: true,
    captured_at: today,
    backend: currentBackend(),
    counts: {
      daily: buckets.daily.length,
      weekly: buckets.weekly.length,
      monthly: buckets.monthly.length,
    },
    inserted: rows.length,
  });
}
