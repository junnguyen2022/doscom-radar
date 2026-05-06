"use client";

import Link from "next/link";
import { ExternalLink, Flame, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Sparkline } from "@/components/repo/Sparkline";
import { LanguageDot } from "@/components/ui/LanguageDot";
import { WatchButton } from "@/components/watchlist/WatchButton";
import {
  type Classification,
  CLASS_LABEL,
} from "@/lib/classify";
import { useApp } from "@/components/providers/AppProvider";

export type RepoCardData = {
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
  rankHistory?: number[];
};

const CLASS_TONE: Record<Classification, "success" | "warning" | "danger"> = {
  adopt: "success",
  monitor: "warning",
  caution: "danger",
};

export function RepoCard({ r }: { r: RepoCardData }) {
  const { lang } = useApp();

  return (
    <Card hoverable className="p-4 group">
      <div className="flex items-start gap-3">
        {/* Rank */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 font-mono text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          #{r.rank}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/repo/${r.owner}/${r.repo}`}
              className="truncate font-semibold text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
            >
              {r.owner}/{r.repo}
            </Link>
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
              title="Open on GitHub"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {r.description && (
            <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
              {r.description}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs">
            <Badge tone={CLASS_TONE[r.classification]}>
              {CLASS_LABEL[r.classification][lang]}
            </Badge>

            {r.language && (
              <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                <LanguageDot language={r.language} />
                {r.language}
              </span>
            )}

            <span className="inline-flex items-center gap-1 font-medium text-orange-600 dark:text-orange-400">
              <Flame className="h-3 w-3" />
              {r.heat}
            </span>

            {r.starsGained != null && (
              <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                +{r.starsGained.toLocaleString()}
              </span>
            )}
            {r.totalStars != null && (
              <span className="text-zinc-500 dark:text-zinc-500">
                ★ {r.totalStars.toLocaleString()}
              </span>
            )}

            {r.rankHistory && r.rankHistory.length > 1 && (
              <span className="ml-auto" title="Rank over time">
                <Sparkline ranks={r.rankHistory} />
              </span>
            )}
          </div>
        </div>
        <WatchButton owner={r.owner} repo={r.repo} />
      </div>
    </Card>
  );
}
