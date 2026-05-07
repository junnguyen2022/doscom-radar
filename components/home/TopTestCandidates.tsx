import Link from "next/link";
import { Beaker, Flame, ArrowRight, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LanguageDot } from "@/components/ui/LanguageDot";
import type { ScoredRepoSummary } from "@/lib/scoring-store";

export function TopTestCandidates({
  items,
  emptyHint,
}: {
  items: ScoredRepoSummary[];
  emptyHint?: string;
}) {
  if (items.length === 0) {
    return (
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Beaker className="h-5 w-5 text-blue-500" />
          Top Test Candidates
        </h2>
        <Card className="p-5 text-sm text-zinc-500 dark:text-zinc-400">
          {emptyHint ??
            "Chưa có recommendation nào — đợi cron daily chạy + scoring batch (~1 ngày)."}
        </Card>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Beaker className="h-5 w-5 text-blue-500" />
          Top Test Candidates
        </h2>
        <Link
          href="/trending"
          className="text-sm text-brand-600 hover:underline dark:text-brand-400"
        >
          Xem tất cả →
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((r) => (
          <Card key={r.repo_id} hoverable className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/repo/${r.owner}/${r.repo}`}
                    className="truncate font-semibold text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
                  >
                    {r.owner}/{r.repo}
                  </Link>
                  <Badge tone="brand" className="text-[10px]">
                    Test
                  </Badge>
                </div>
                {r.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                    {r.description}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  {r.language && (
                    <span className="inline-flex items-center gap-1 text-zinc-500">
                      <LanguageDot language={r.language} />
                      {r.language}
                    </span>
                  )}
                  {r.total_stars != null && (
                    <span className="text-zinc-500">
                      ★ {r.total_stars.toLocaleString()}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-0.5 text-orange-600 dark:text-orange-400">
                    <Flame className="h-3 w-3" />
                    {r.heat_score}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xl font-bold tabular-nums text-brand-600 dark:text-brand-400">
                  {r.radar_score}
                </div>
                <div className="text-[10px] text-zinc-500">radar</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function HighRiskPopular({
  items,
}: {
  items: ScoredRepoSummary[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <AlertTriangle className="h-5 w-5 text-rose-500" />
          High Risk + High Growth
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Đang nổi nhanh nhưng có rủi ro
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((r) => (
          <Card key={r.repo_id} hoverable className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/repo/${r.owner}/${r.repo}`}
                    className="truncate font-semibold text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
                  >
                    {r.owner}/{r.repo}
                  </Link>
                  <Badge tone="danger" className="text-[10px]">
                    Risk {r.risk_penalty}
                  </Badge>
                </div>
                {r.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                    {r.description}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {r.risk_flags.slice(0, 3).map((f) => (
                    <Badge key={f} tone="danger" className="text-[10px]">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {r.growth_score}
                </div>
                <div className="text-[10px] text-zinc-500">growth</div>
                <ArrowRight className="ml-auto mt-1 h-3 w-3 text-zinc-400" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
