import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Flame,
  Star,
  TrendingUp,
  Activity,
  Award,
  FolderKanban,
  Clock,
} from "lucide-react";
import { historyForRepo } from "@/lib/storage";
import { computeHeat } from "@/lib/heat";
import { classify, CLASS_LABEL, type Classification } from "@/lib/classify";
import { collectionsForRepo } from "@/lib/collections";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LanguageDot } from "@/components/ui/LanguageDot";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import {
  StarsHistoryChart,
  RankHistoryChart,
} from "@/components/repo/StarsHistoryChart";
import { SocialShare } from "@/components/repo/SocialShare";
import { WatchButton } from "@/components/watchlist/WatchButton";
import { FolderOpen } from "lucide-react";

export const dynamic = "force-dynamic";

const CLASS_TONE: Record<Classification, "success" | "warning" | "danger"> = {
  adopt: "success",
  monitor: "warning",
  caution: "danger",
};

export default async function RepoDetail({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  const [daily, weekly, monthly] = await Promise.all([
    historyForRepo(owner, repo, "daily"),
    historyForRepo(owner, repo, "weekly"),
    historyForRepo(owner, repo, "monthly"),
  ]);

  if (daily.length === 0 && weekly.length === 0 && monthly.length === 0) {
    return (
      <main>
        <Link
          href="/trending"
          className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-brand-600 dark:text-zinc-400 dark:hover:text-brand-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Trending
        </Link>
        <h1 className="mt-3 text-3xl font-bold">
          {owner}/{repo}
        </h1>
        <div className="mt-6">
          <EmptyState
            icon={FolderOpen}
            title="Repo chưa từng trending"
            description="Repo này chưa từng xuất hiện trong snapshot nào của ta. Nhưng bạn vẫn có thể mở trên GitHub."
          />
          <div className="mt-4 text-center">
            <a
              href={`https://github.com/${owner}/${repo}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Open on GitHub
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </main>
    );
  }

  const latest = daily.at(-1) ?? weekly.at(-1) ?? monthly.at(-1)!;
  const heat = computeHeat({
    starsGained: latest.stars_gained,
    totalStars: latest.total_stars,
    rank: latest.rank,
  });
  const cls = classify({
    starsGained: latest.stars_gained,
    totalStars: latest.total_stars,
    language: latest.language,
  });

  const collections = collectionsForRepo(owner, repo);

  // Stars chart data — use daily snapshots (most granular)
  const starsHistory = daily
    .filter((s) => s.total_stars != null)
    .map((s) => ({ date: s.captured_at, value: s.total_stars! }));

  const rankHistory = daily.map((s) => ({
    date: s.captured_at,
    value: s.rank,
  }));

  const peakRank = daily.length > 0 ? Math.min(...daily.map((s) => s.rank)) : null;

  return (
    <main>
      <Link
        href="/trending"
        className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-brand-600 dark:text-zinc-400 dark:hover:text-brand-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Trending
      </Link>

      {/* Hero — OSSInsight-style */}
      <section className="relative -mx-4 mt-3 mb-8 overflow-hidden border-b border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-brand-50/40 px-4 py-8 dark:border-zinc-800 dark:from-zinc-900/50 dark:via-zinc-950 dark:to-brand-950/20 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Repository Analytics
          </p>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="flex flex-wrap items-center gap-2 text-3xl font-bold tracking-tight sm:text-4xl">
                <span className="text-zinc-900 dark:text-zinc-50">
                  {owner}
                  <span className="text-zinc-400 dark:text-zinc-600">/</span>
                  {repo}
                </span>
                <a
                  href={latest.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  title="Open on GitHub"
                  aria-label="Open on GitHub"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <WatchButton
                  owner={owner}
                  repo={repo}
                  className="text-2xl"
                />
              </h1>

              {latest.description && (
                <p className="mt-2 max-w-3xl text-base text-zinc-600 dark:text-zinc-400">
                  {latest.description}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <Badge tone={CLASS_TONE[cls]}>{CLASS_LABEL[cls].vi}</Badge>
                {latest.language && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    <LanguageDot language={latest.language} />
                    {latest.language}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                  <Flame className="h-3 w-3" />
                  Heat {heat}
                </span>
                {latest.total_stars != null && (
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    {latest.total_stars.toLocaleString()} total
                  </span>
                )}
              </div>
            </div>

            <SocialShare
              text={`${owner}/${repo} — heat ${heat} on Agent Radar`}
              path={`/repo/${owner}/${repo}`}
            />
          </div>
        </div>
      </section>

      {/* Stat cards row */}
      <section className="mb-8 grid gap-3 grid-cols-2 md:grid-cols-5">
        <StatCard
          label="Current rank"
          value={`#${latest.rank}`}
          accent="brand"
          icon={TrendingUp}
          hint={latest.captured_at}
        />
        <StatCard
          label="Total stars"
          value={
            latest.total_stars != null
              ? latest.total_stars.toLocaleString()
              : "—"
          }
          icon={Star}
          hint="GitHub total"
        />
        <StatCard
          label="Stars today"
          value={
            latest.stars_gained != null
              ? `+${latest.stars_gained.toLocaleString()}`
              : "—"
          }
          accent="emerald"
          icon={Activity}
          hint="Latest snapshot"
        />
        <StatCard
          label="Heat score"
          value={heat}
          accent="amber"
          icon={Flame}
          hint="0..100 composite"
        />
        <StatCard
          label="Peak rank"
          value={peakRank != null ? `#${peakRank}` : "—"}
          accent="rose"
          icon={Award}
          hint={`Across ${daily.length} snapshots`}
        />
      </section>

      {/* Tabs (visual only — single page) */}
      <nav className="mb-6 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        <a
          href="#overview"
          className="border-b-2 border-brand-600 px-4 py-2.5 text-sm font-medium text-brand-700 dark:border-brand-400 dark:text-brand-400"
        >
          Overview
        </a>
        <a
          href="#history"
          className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          History
        </a>
        <a
          href="#collections"
          className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Collections{" "}
          {collections.length > 0 && (
            <span className="ml-0.5 rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] dark:bg-zinc-800">
              {collections.length}
            </span>
          )}
        </a>
        <a
          href="#snapshots"
          className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Snapshots
        </a>
      </nav>

      {/* Overview — dual charts */}
      <section id="overview" className="mb-12 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <header className="mb-4 flex items-baseline justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Star className="h-4 w-4 text-amber-500" />
                Stars history
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Total stars qua các snapshot daily
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-400">
              {starsHistory.length} pts
            </span>
          </header>
          <StarsHistoryChart
            data={starsHistory}
            color="#f59e0b"
            yLabel="stars"
          />
        </Card>

        <Card className="p-5">
          <header className="mb-4 flex items-baseline justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Rank history
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Cao hơn = rank tốt hơn (rank 1 trên cùng)
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-400">
              {rankHistory.length} pts
            </span>
          </header>
          <RankHistoryChart data={rankHistory} />
        </Card>
      </section>

      {/* Collections this repo is in */}
      <section id="collections" className="mb-12">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <FolderKanban className="h-4 w-4 text-brand-500" />
          Collections ({collections.length})
        </h2>
        {collections.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400">
            Repo này chưa thuộc collection nào trong 138 collections của OSSInsight.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {collections.map((c) => (
              <Link
                key={c.slug}
                href={`/collections/${c.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-100 dark:border-brand-900/50 dark:bg-brand-950/40 dark:text-brand-300 dark:hover:bg-brand-950/60"
              >
                {c.name}
                <span className="text-[10px] opacity-70">
                  ({c.items.length})
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Snapshots table */}
      <section id="snapshots" className="mb-8">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-4 w-4 text-zinc-500" />
            All snapshots
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {daily.length + weekly.length + monthly.length} entries
          </span>
        </header>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-2.5 text-left">Date</th>
                  <th className="px-4 py-2.5 text-left">Timeframe</th>
                  <th className="px-4 py-2.5 text-right">Rank</th>
                  <th className="px-4 py-2.5 text-right">Gained</th>
                  <th className="px-4 py-2.5 text-right">Total ★</th>
                  <th className="px-4 py-2.5 text-right">Heat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {[...daily, ...weekly, ...monthly]
                  .sort((a, b) => b.captured_at.localeCompare(a.captured_at))
                  .map((s, i) => {
                    const h = computeHeat({
                      starsGained: s.stars_gained,
                      totalStars: s.total_stars,
                      rank: s.rank,
                    });
                    return (
                      <tr
                        key={i}
                        className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                          {s.captured_at}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge tone="neutral">{s.timeframe}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                          #{s.rank}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                          {s.stars_gained != null
                            ? `+${s.stars_gained.toLocaleString()}`
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {s.total_stars != null
                            ? s.total_stars.toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-orange-600 dark:text-orange-400">
                          {h}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        💡 Layout cảm hứng từ <a href="https://ossinsight.io" className="text-brand-600 hover:underline dark:text-brand-400">OSSInsight.io</a>. Một số metrics của họ (commits, contributors, geo, PR/issue analytics) cần GH Archive event stream — ta chỉ có trending snapshots.
      </p>
    </main>
  );
}
