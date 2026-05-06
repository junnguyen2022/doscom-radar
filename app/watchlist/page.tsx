"use client";

import { useEffect, useState } from "react";
import { Star, ExternalLink } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { RepoCard, type RepoCardData } from "@/components/repo/RepoCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { computeHeat } from "@/lib/heat";
import { classify } from "@/lib/classify";

type ApiRow = {
  rank: number;
  owner: string;
  repo: string;
  language: string | null;
  description: string | null;
  stars_gained: number | null;
  total_stars: number | null;
  url: string;
};

export default function WatchlistPage() {
  const { watchlist } = useApp();
  const [rows, setRows] = useState<ApiRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/snapshots/latest", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { rows: ApiRow[] }) => {
        if (!cancelled) setRows(j.rows);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (rows === null) {
    return (
      <main>
        <PageHeader
          eyebrow="Watchlist"
          title="Repos đang theo dõi"
          description="Repos bạn đã pin, lưu trong localStorage."
        />
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-full" />
              <div className="mt-3 flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
            </Card>
          ))}
        </div>
      </main>
    );
  }

  if (watchlist.length === 0) {
    return (
      <main>
        <PageHeader
          eyebrow="Watchlist"
          title="Repos đang theo dõi"
        />
        <EmptyState
          icon={Star}
          title="Chưa pin repo nào"
          description="Click ★ trên bất kỳ repo để theo dõi. Watchlist được lưu trong localStorage của browser này — không sync qua thiết bị."
        />
      </main>
    );
  }

  const watched = new Set(watchlist);
  const matches: RepoCardData[] = rows
    .filter((r) => watched.has(`${r.owner}/${r.repo}`))
    .map((r) => ({
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
    }));

  const missing = watchlist.filter(
    (k) => !rows.some((r) => `${r.owner}/${r.repo}` === k),
  );

  return (
    <main>
      <PageHeader
        eyebrow="Watchlist"
        title="Repos đang theo dõi"
        description={`${matches.length} đang trong top hôm nay · ${missing.length} chưa xuất hiện`}
      />

      {matches.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {matches.map((c) => (
            <RepoCard key={`${c.owner}/${c.repo}`} r={c} />
          ))}
        </div>
      )}

      {missing.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Đang theo dõi nhưng chưa lên top
          </h2>
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {missing.map((k) => (
              <li key={k}>
                <a
                  href={`https://github.com/${k}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 truncate rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
                >
                  <span className="truncate">{k}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
