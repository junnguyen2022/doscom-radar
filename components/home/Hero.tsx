import Link from "next/link";
import { ArrowRight, ExternalLink, Sparkles, TrendingUp } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";
import { SnapshotHistoryChart } from "./SnapshotHistoryChart";

export function Hero({
  totalEvents,
  totalDays,
  todayCount,
  history,
  lastSnapshot,
}: {
  totalEvents: number;
  totalDays: number;
  todayCount: number;
  history: { date: string; count: number }[];
  lastSnapshot: string | null;
}) {
  return (
    <section className="relative -mx-4 mb-10 overflow-hidden border-b border-zinc-200 bg-zinc-50 px-4 py-10 dark:border-zinc-800 dark:bg-zinc-900/30 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="absolute -left-32 bottom-0 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[3fr_2fr] lg:items-center">
        {/* Left — headline */}
        <div>
          <p className="mb-3 font-mono text-sm text-zinc-500 dark:text-zinc-400">
            <span className="text-brand-600 dark:text-brand-400">SELECT</span>{" "}
            <span className="text-zinc-900 dark:text-zinc-100">
              trending_repos
            </span>{" "}
            <span className="text-brand-600 dark:text-brand-400">FROM</span>{" "}
            <AnimatedCounter
              value={totalEvents}
              className="font-bold text-orange-600 dark:text-orange-400"
            />{" "}
            <span>snapshots</span>
          </p>

          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl lg:text-[56px]">
            GitHub Trending,{" "}
            <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-orange-500 bg-clip-text text-transparent">
              tracked daily
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-base text-zinc-600 dark:text-zinc-400 sm:text-lg">
            Snapshot github.com/trending mỗi ngày, phân loại tự động (adopt /
            monitor / caution), phát hiện movers, tổng hợp 138 collections, và
            insight bằng Claude — tất cả trong một dashboard.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/trending"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              <TrendingUp className="h-4 w-4" />
              Xem trending
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/collections"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              138 Collections
            </Link>
            <a
              href="https://github.com/pingcap/ossinsight"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              <ExternalLink className="h-4 w-4" />
              Source on GitHub
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-brand-500" />
              AI Insight bằng Claude
            </span>
            <span>• Cập nhật cron daily 01:00 UTC</span>
            {lastSnapshot && (
              <span className="font-mono">
                • Last: <span className="text-zinc-700 dark:text-zinc-300">{lastSnapshot}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right — live-ish chart */}
        <div className="relative rounded-2xl border border-zinc-200 bg-white p-5 shadow-card dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-card-dark">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Snapshot history
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {totalDays} ngày · daily timeframe
            </span>
          </div>

          <SnapshotHistoryChart data={history} />

          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Today
              </div>
              <div className="mt-0.5 text-xl font-bold tabular-nums text-orange-600 dark:text-orange-400">
                {todayCount}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Total
              </div>
              <div className="mt-0.5 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {totalEvents.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Days
              </div>
              <div className="mt-0.5 text-xl font-bold tabular-nums text-brand-600 dark:text-brand-400">
                {totalDays}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
