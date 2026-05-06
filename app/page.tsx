import { Suspense } from "react";
import { Sparkles, Activity } from "lucide-react";
import {
  allRowsForLatestDate,
  distinctDailyDates,
  dailyForDate,
  lastSnapshotInfo,
  snapshotCountsByDate,
  type SnapshotRow,
} from "@/lib/storage";
import { computeHeat } from "@/lib/heat";
import { classify } from "@/lib/classify";
import { computeMovers } from "@/lib/movers";
import {
  listCollections,
  intersectWithTrending,
  trendingKeysFromRows,
} from "@/lib/collections";
import { generateInsight } from "@/lib/actions";
import { Hero } from "@/components/home/Hero";
import { HotCollections } from "@/components/home/HotCollections";
import {
  TrendingTable,
  type TrendingTableRow,
} from "@/components/home/TrendingTable";
import { FAQ } from "@/components/home/FAQ";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function AIInsight() {
  const text = await generateInsight();
  return (
    <article className="prose prose-sm max-w-none whitespace-pre-wrap text-zinc-700 dark:prose-invert dark:text-zinc-300">
      {text}
    </article>
  );
}

function rowsToTableRows(
  rows: SnapshotRow[],
  timeframe: "daily" | "weekly" | "monthly",
): TrendingTableRow[] {
  return rows.map((r) => ({
    rank: r.rank,
    owner: r.owner,
    repo: r.repo,
    language: r.language,
    description: r.description,
    starsGained: r.stars_gained,
    totalStars: r.total_stars,
    url: r.url,
    heat: computeHeat({
      starsGained: r.stars_gained,
      totalStars: r.total_stars,
      rank: r.rank,
    }),
    classification: classify({
      starsGained: r.stars_gained,
      totalStars: r.total_stars,
      language: r.language,
    }),
    timeframe,
  }));
}

export default async function Home() {
  const [
    { rows: daily, capturedAt },
    { rows: weekly },
    { rows: monthly },
    info,
    dates,
    history,
  ] = await Promise.all([
    allRowsForLatestDate("daily"),
    allRowsForLatestDate("weekly"),
    allRowsForLatestDate("monthly"),
    lastSnapshotInfo(),
    distinctDailyDates(),
    snapshotCountsByDate("daily", 14),
  ]);

  // Hot collections (top 8 by matched count)
  const allCollections = listCollections();
  const allRows = [...daily, ...weekly, ...monthly];
  const trendingKeys = trendingKeysFromRows(allRows);
  const dataByKey = new Map<string, SnapshotRow>();
  for (const r of [...monthly, ...weekly, ...daily]) {
    dataByKey.set(`${r.owner}/${r.repo}`.toLowerCase(), r);
  }

  const hotCollections = allCollections
    .map((c) => {
      const { matched } = intersectWithTrending(c, trendingKeys);
      const matchedRows = matched
        .map((k) => dataByKey.get(k.toLowerCase()))
        .filter((r): r is SnapshotRow => !!r)
        .sort((a, b) => a.rank - b.rank);
      return { collection: c, matchedRows };
    })
    .filter((x) => x.matchedRows.length > 0)
    .sort((a, b) => b.matchedRows.length - a.matchedRows.length)
    .slice(0, 8);

  // Movers preview
  let moversPreview: ReturnType<typeof computeMovers> | null = null;
  if (dates.length >= 2) {
    const [today, yesterday] = await Promise.all([
      dailyForDate(dates[0]),
      dailyForDate(dates[1]),
    ]);
    moversPreview = computeMovers(today, yesterday);
  }

  // Combine all rows for trending table (with timeframe label)
  const tableRows: TrendingTableRow[] = [
    ...rowsToTableRows(daily, "daily"),
    ...rowsToTableRows(weekly, "weekly"),
    ...rowsToTableRows(monthly, "monthly"),
  ];

  return (
    <main>
      <Hero
        totalEvents={info.totalRows}
        totalDays={dates.length}
        todayCount={daily.length}
        history={history}
        lastSnapshot={info.capturedAt ?? capturedAt}
      />

      {/* AI Insight + Movers row */}
      <section className="mb-12 grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* AI Insight — premium gradient card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-blue-50 dark:from-brand-950/30 dark:via-zinc-900 dark:to-blue-950/30">
          <div className="absolute inset-0 bg-grid opacity-50" />
          <div className="relative p-5">
            <header className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-blue-500 text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">
                  AI Insight hôm nay
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Claude Sonnet 4.6 · cached 1h
                </div>
              </div>
            </header>
            <Suspense
              fallback={
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-11/12" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              }
            >
              <AIInsight />
            </Suspense>
          </div>
        </Card>

        {/* Movers compact */}
        {moversPreview && (
          <Card className="p-4">
            <header className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">Biến động hôm nay</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  vs hôm qua
                </div>
              </div>
            </header>
            <ul className="space-y-1.5 text-sm">
              {[
                {
                  label: "🆕 New",
                  items: moversPreview.newEntries,
                  color: "text-blue-600 dark:text-blue-400",
                },
                {
                  label: "▲ Risers",
                  items: moversPreview.risers,
                  color: "text-emerald-600 dark:text-emerald-400",
                },
                {
                  label: "▼ Fallers",
                  items: moversPreview.fallers,
                  color: "text-rose-600 dark:text-rose-400",
                },
                {
                  label: "❌ Dropped",
                  items: moversPreview.dropped,
                  color: "text-zinc-500",
                },
              ].map((b) => (
                <li
                  key={b.label}
                  className="flex items-baseline justify-between"
                >
                  <span className={`font-medium ${b.color}`}>{b.label}</span>
                  <span className="font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                    {b.items.length}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/movers"
              className="mt-4 block text-center text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Xem chi tiết →
            </Link>
          </Card>
        )}
      </section>

      <HotCollections hotCollections={hotCollections} />

      <TrendingTable rows={tableRows} />

      <FAQ />
    </main>
  );
}
