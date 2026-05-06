"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ExternalLink, Flame } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { LanguageDot } from "@/components/ui/LanguageDot";
import { WatchButton } from "@/components/watchlist/WatchButton";
import type { Classification } from "@/lib/classify";
import type { Timeframe } from "@/lib/github-trending";

const CLASS_TONE: Record<Classification, "success" | "warning" | "danger"> = {
  adopt: "success",
  monitor: "warning",
  caution: "danger",
};

export type TrendingTableRow = {
  rank: number;
  owner: string;
  repo: string;
  language: string | null;
  description: string | null;
  starsGained: number | null;
  totalStars: number | null;
  url: string;
  heat: number;
  classification: Classification;
  timeframe: Timeframe; // for filtering
};

export function TrendingTable({
  rows,
}: {
  rows: TrendingTableRow[];
}) {
  const [timeframe, setTimeframe] = useState<Timeframe>("daily");
  const [language, setLanguage] = useState<string>("All");

  const languages = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.language) set.add(r.language);
    }
    return ["All", ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    let r = rows.filter((x) => x.timeframe === timeframe);
    if (language !== "All") {
      r = r.filter((x) => x.language === language);
    }
    return r.sort((a, b) => a.rank - b.rank).slice(0, 20);
  }, [rows, timeframe, language]);

  const TIMEFRAMES: { key: Timeframe; label: string }[] = [
    { key: "daily", label: "Today" },
    { key: "weekly", label: "Past Week" },
    { key: "monthly", label: "Past Month" },
  ];

  return (
    <section className="mb-12">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Flame className="h-6 w-6 text-orange-500" />
            Trending Repos
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Top repos sắp xếp theo rank trên github.com/trending. Filter theo
            timeframe và ngôn ngữ.
          </p>
        </div>
      </div>

      {/* Timeframe + Language filters — OSSInsight style */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-zinc-100 p-0.5 text-sm dark:bg-zinc-800">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.key}
              onClick={() => setTimeframe(tf.key)}
              className={
                timeframe === tf.key
                  ? "rounded-md bg-white px-3 py-1 font-medium text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                  : "rounded-md px-3 py-1 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }
            >
              {tf.label}
            </button>
          ))}
        </div>

        <span className="ml-2 text-sm text-zinc-500 dark:text-zinc-400">
          Language:
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {languages.slice(0, 12).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={
                language === lang
                  ? "inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  : "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }
            >
              {lang !== "All" && <LanguageDot language={lang} size={8} />}
              {lang}
            </button>
          ))}
          {languages.length > 12 && (
            <select
              value={languages.slice(12).includes(language) ? language : ""}
              onChange={(e) => e.target.value && setLanguage(e.target.value)}
              className="rounded-md border-0 bg-transparent px-2 py-0.5 text-sm text-zinc-500 hover:text-zinc-900 focus:ring-1 focus:ring-brand-500 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <option value="">Others...</option>
              {languages.slice(12).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
          Không có repo nào với filter hiện tại.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="w-12 px-3 py-2.5 text-left">Rank</th>
                  <th className="px-3 py-2.5 text-left">Repository</th>
                  <th className="hidden px-3 py-2.5 text-right md:table-cell">
                    Total ★
                  </th>
                  <th className="px-3 py-2.5 text-right">Gained</th>
                  <th className="hidden px-3 py-2.5 text-right md:table-cell">
                    Heat
                  </th>
                  <th className="w-10 px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filtered.map((r) => (
                  <tr
                    key={`${r.owner}/${r.repo}`}
                    className="group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  >
                    <td className="px-3 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      #{r.rank}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/repo/${r.owner}/${r.repo}`}
                          className="font-semibold text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
                        >
                          {r.owner}/{r.repo}
                        </Link>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                          title="Open on GitHub"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <Badge tone={CLASS_TONE[r.classification]} className="text-[10px]">
                          {r.classification}
                        </Badge>
                      </div>
                      {r.description && (
                        <p className="mt-1 line-clamp-1 max-w-[600px] text-xs text-zinc-500 dark:text-zinc-400">
                          {r.description}
                        </p>
                      )}
                      {r.language && (
                        <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                          <LanguageDot language={r.language} size={8} />
                          {r.language}
                        </div>
                      )}
                    </td>
                    <td className="hidden px-3 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300 md:table-cell">
                      {r.totalStars != null ? r.totalStars.toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                      {r.starsGained != null
                        ? `+${r.starsGained.toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="hidden px-3 py-3 text-right tabular-nums font-bold text-orange-600 dark:text-orange-400 md:table-cell">
                      {r.heat}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <WatchButton owner={r.owner} repo={r.repo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
            <span>
              Showing {filtered.length} of{" "}
              {rows.filter((r) => r.timeframe === timeframe).length} ·{" "}
              {timeframe} · {language}
            </span>
            <Link
              href={`/trending?tf=${timeframe}${language !== "All" ? `&langs=${encodeURIComponent(language)}` : ""}`}
              className="font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Xem chi tiết & filter →
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
