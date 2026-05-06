import fs from "node:fs/promises";
import path from "node:path";
import type { Timeframe } from "./github-trending";

export type SnapshotRow = {
  captured_at: string;
  timeframe: Timeframe;
  rank: number;
  owner: string;
  repo: string;
  language: string | null;
  description: string | null;
  stars_gained: number | null;
  total_stars: number | null;
  url: string;
};

// Auto-detect: Supabase if both env vars set, JSON file otherwise.
// File mode is for local demo only — won't persist on Vercel.
function backendMode(): "supabase" | "file" {
  return process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
    ? "supabase"
    : "file";
}

export function currentBackend(): "supabase" | "file" {
  return backendMode();
}

const FILE = path.join(process.cwd(), "data", "snapshots.json");
const keyOf = (r: SnapshotRow) =>
  `${r.captured_at}|${r.timeframe}|${r.owner}|${r.repo}`;

async function readJsonFile(): Promise<SnapshotRow[]> {
  try {
    const txt = await fs.readFile(FILE, "utf8");
    const parsed: unknown = JSON.parse(txt);
    return Array.isArray(parsed) ? (parsed as SnapshotRow[]) : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeJsonFile(rows: SnapshotRow[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(rows, null, 2));
}

export async function upsertSnapshots(newRows: SnapshotRow[]): Promise<void> {
  if (backendMode() === "supabase") {
    const { createAdminClient } = await import("./supabase/admin");
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("trending_snapshots")
      .upsert(newRows, { onConflict: "captured_at,timeframe,owner,repo" });
    if (error) throw new Error(error.message);
    return;
  }

  const existing = await readJsonFile();
  const map = new Map(existing.map((r) => [keyOf(r), r]));
  for (const r of newRows) map.set(keyOf(r), r);
  await writeJsonFile([...map.values()]);
}

export async function latestForTimeframe(
  timeframe: Timeframe,
  limit = 10,
): Promise<{ rows: SnapshotRow[]; capturedAt: string | null }> {
  if (backendMode() === "supabase") {
    const { createAdminClient } = await import("./supabase/admin");
    const supabase = createAdminClient();
    const { data: latest } = await supabase
      .from("trending_snapshots")
      .select("captured_at")
      .eq("timeframe", timeframe)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest) return { rows: [], capturedAt: null };
    const { data } = await supabase
      .from("trending_snapshots")
      .select("*")
      .eq("timeframe", timeframe)
      .eq("captured_at", latest.captured_at)
      .order("rank", { ascending: true })
      .limit(limit);
    return {
      rows: (data as SnapshotRow[]) ?? [],
      capturedAt: latest.captured_at as string,
    };
  }

  const all = await readJsonFile();
  const filtered = all.filter((r) => r.timeframe === timeframe);
  if (filtered.length === 0) return { rows: [], capturedAt: null };
  filtered.sort((a, b) => b.captured_at.localeCompare(a.captured_at));
  const latest = filtered[0].captured_at;
  const top = filtered
    .filter((r) => r.captured_at === latest)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit);
  return { rows: top, capturedAt: latest };
}

export async function dailyForDate(date: string): Promise<SnapshotRow[]> {
  if (backendMode() === "supabase") {
    const { createAdminClient } = await import("./supabase/admin");
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("trending_snapshots")
      .select("*")
      .eq("timeframe", "daily")
      .eq("captured_at", date)
      .order("rank", { ascending: true });
    return (data as SnapshotRow[]) ?? [];
  }

  const all = await readJsonFile();
  return all
    .filter((r) => r.timeframe === "daily" && r.captured_at === date)
    .sort((a, b) => a.rank - b.rank);
}

export async function historyForRepo(
  owner: string,
  repo: string,
  timeframe: Timeframe = "daily",
): Promise<SnapshotRow[]> {
  if (backendMode() === "supabase") {
    const { createAdminClient } = await import("./supabase/admin");
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("trending_snapshots")
      .select("*")
      .eq("owner", owner)
      .eq("repo", repo)
      .eq("timeframe", timeframe)
      .order("captured_at", { ascending: true });
    return (data as SnapshotRow[]) ?? [];
  }
  const all = await readJsonFile();
  return all
    .filter(
      (r) =>
        r.owner === owner && r.repo === repo && r.timeframe === timeframe,
    )
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at));
}

export async function allRowsForLatestDate(
  timeframe: Timeframe,
): Promise<{ rows: SnapshotRow[]; capturedAt: string | null }> {
  // Like latestForTimeframe but no limit — returns the full set for one date.
  if (backendMode() === "supabase") {
    const { createAdminClient } = await import("./supabase/admin");
    const supabase = createAdminClient();
    const { data: latest } = await supabase
      .from("trending_snapshots")
      .select("captured_at")
      .eq("timeframe", timeframe)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest) return { rows: [], capturedAt: null };
    const { data } = await supabase
      .from("trending_snapshots")
      .select("*")
      .eq("timeframe", timeframe)
      .eq("captured_at", latest.captured_at)
      .order("rank", { ascending: true });
    return {
      rows: (data as SnapshotRow[]) ?? [],
      capturedAt: latest.captured_at as string,
    };
  }

  const all = await readJsonFile();
  const filtered = all.filter((r) => r.timeframe === timeframe);
  if (filtered.length === 0) return { rows: [], capturedAt: null };
  filtered.sort((a, b) => b.captured_at.localeCompare(a.captured_at));
  const latest = filtered[0].captured_at;
  return {
    rows: filtered
      .filter((r) => r.captured_at === latest)
      .sort((a, b) => a.rank - b.rank),
    capturedAt: latest,
  };
}

export async function lastSnapshotInfo(): Promise<{
  capturedAt: string | null;
  totalRows: number;
}> {
  if (backendMode() === "supabase") {
    const { createAdminClient } = await import("./supabase/admin");
    const supabase = createAdminClient();
    const { data: latest } = await supabase
      .from("trending_snapshots")
      .select("captured_at")
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { count } = await supabase
      .from("trending_snapshots")
      .select("*", { count: "exact", head: true });
    return {
      capturedAt: (latest?.captured_at as string | undefined) ?? null,
      totalRows: count ?? 0,
    };
  }
  const all = await readJsonFile();
  if (all.length === 0) return { capturedAt: null, totalRows: 0 };
  const sorted = [...all].sort((a, b) =>
    b.captured_at.localeCompare(a.captured_at),
  );
  return { capturedAt: sorted[0].captured_at, totalRows: all.length };
}

export async function snapshotCountsByDate(
  timeframe: Timeframe = "daily",
  days: number = 14,
): Promise<{ date: string; count: number }[]> {
  if (backendMode() === "supabase") {
    const { createAdminClient } = await import("./supabase/admin");
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("trending_snapshots")
      .select("captured_at")
      .eq("timeframe", timeframe)
      .order("captured_at", { ascending: false });
    if (!data) return [];
    const counts = new Map<string, number>();
    for (const r of data) {
      const d = r.captured_at as string;
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-days)
      .map(([date, count]) => ({ date, count }));
  }
  const all = await readJsonFile();
  const counts = new Map<string, number>();
  for (const r of all) {
    if (r.timeframe !== timeframe) continue;
    counts.set(r.captured_at, (counts.get(r.captured_at) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-days)
    .map(([date, count]) => ({ date, count }));
}

export async function distinctDailyDates(): Promise<string[]> {
  if (backendMode() === "supabase") {
    const { createAdminClient } = await import("./supabase/admin");
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("trending_snapshots")
      .select("captured_at")
      .eq("timeframe", "daily")
      .order("captured_at", { ascending: false })
      .limit(100);
    return Array.from(
      new Set((data ?? []).map((d) => d.captured_at as string)),
    );
  }

  const all = await readJsonFile();
  const dates = new Set(
    all.filter((r) => r.timeframe === "daily").map((r) => r.captured_at),
  );
  return Array.from(dates).sort().reverse();
}
