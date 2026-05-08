// V2.5 §24.7 — Similar / Alternative repos block.
// Each card has a "Compare with this repo" button → /compare?repos=A,B.

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LanguageDot } from "@/components/ui/LanguageDot";
import { GitCompare, Star, Sparkles } from "lucide-react";
import type { SimilarRepo } from "@/lib/similar-repos";

const REC_TONE: Record<
  string,
  "success" | "warning" | "danger" | "brand" | "neutral"
> = {
  adopt: "success",
  test: "brand",
  follow: "warning",
  caution: "danger",
  ignore: "neutral",
};

export function SimilarRepos({
  source,
  similar,
}: {
  source: { owner: string; repo: string };
  similar: SimilarRepo[];
}) {
  if (similar.length === 0) {
    return (
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
          <Sparkles className="h-4 w-4 text-brand-500" />
          Similar / Alternative repos
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Chưa tìm được repo tương tự (cần topics hoặc language khớp).
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
          <Sparkles className="h-4 w-4 text-brand-500" />
          Similar / Alternative repos ({similar.length})
        </h2>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {similar.map((s) => {
          const compareHref = `/compare?repos=${encodeURIComponent(
            `${source.owner}/${source.repo},${s.owner}/${s.repo}`,
          )}`;
          return (
            <div
              key={`${s.owner}/${s.repo}`}
              className="rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:border-brand-300 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-brand-700"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/repo/${s.owner}/${s.repo}`}
                    className="block truncate font-medium text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
                  >
                    {s.owner}/{s.repo}
                  </Link>
                  {s.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                      {s.description}
                    </p>
                  )}
                </div>
                {s.recommendation && (
                  <Badge
                    tone={REC_TONE[s.recommendation] ?? "neutral"}
                    className="shrink-0 text-[10px] uppercase"
                  >
                    {s.recommendation}
                  </Badge>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                {s.language && (
                  <span className="inline-flex items-center gap-1">
                    <LanguageDot language={s.language} />
                    {s.language}
                  </span>
                )}
                {s.totalStars != null && (
                  <span className="inline-flex items-center gap-0.5">
                    <Star className="h-3 w-3" />
                    {s.totalStars.toLocaleString()}
                  </span>
                )}
                {s.radarScore != null && (
                  <span className="font-mono text-brand-600 dark:text-brand-400">
                    radar {s.radarScore}
                  </span>
                )}
              </div>

              <p className="mt-1 truncate text-[10px] text-zinc-400">
                {s.reason}
              </p>

              <Link
                href={compareHref}
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-brand-500 dark:hover:bg-brand-950/30 dark:hover:text-brand-300"
              >
                <GitCompare className="h-3 w-3" />
                Compare with this repo
              </Link>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
