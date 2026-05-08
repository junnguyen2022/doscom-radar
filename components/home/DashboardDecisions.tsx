// Dashboard sections for authenticated users.
// Watchlist Due Review + Decision Summary.

import Link from "next/link";
import {
  Calendar,
  ListChecks,
  ThumbsUp,
  Beaker,
  Eye,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getMyWatchlist } from "@/lib/watchlist-store";
import { getDecisionStats } from "@/lib/decisions-store";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const STATUS_TONE: Record<
  string,
  "warning" | "neutral" | "brand" | "success" | "danger"
> = {
  follow: "warning",
  review: "neutral",
  test: "brand",
  adopt: "success",
  caution: "danger",
  ignore: "neutral",
};

const STATUS_ICON: Record<string, typeof Eye> = {
  follow: Eye,
  review: CheckCircle2,
  test: Beaker,
  adopt: ThumbsUp,
  caution: AlertTriangle,
  ignore: XCircle,
};

function dueCategory(date: string | null): "overdue" | "this_week" | "later" | "none" {
  if (!date) return "none";
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  if (date < today) return "overdue";
  if (date <= week) return "this_week";
  return "later";
}

export async function DashboardDecisions() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [watchlist, stats] = await Promise.all([
    getMyWatchlist(),
    getDecisionStats(),
  ]);

  const overdue = watchlist.filter(
    (w) => dueCategory(w.next_review_at) === "overdue",
  );
  const dueThisWeek = watchlist.filter(
    (w) => dueCategory(w.next_review_at) === "this_week",
  );

  // If nothing tracked yet, show small CTA card
  if (stats.total === 0) {
    return (
      <section className="mb-8">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-brand-100 p-2 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
              <ListChecks className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">
                Bắt đầu theo dõi repos
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Click ★ trên repo bất kỳ hoặc dùng Decision Panel để track Follow/Test/Adopt.
              </p>
            </div>
            <Link
              href="/trending"
              className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Browse →
            </Link>
          </div>
        </Card>
      </section>
    );
  }

  const summary: { status: string; count: number }[] = [
    { status: "follow", count: stats.byDecision.follow ?? 0 },
    { status: "review", count: stats.byDecision.review ?? 0 },
    { status: "test", count: stats.byDecision.test ?? 0 },
    { status: "adopt", count: stats.byDecision.adopt ?? 0 },
    { status: "caution", count: stats.byDecision.caution ?? 0 },
    { status: "ignore", count: stats.byDecision.ignore ?? 0 },
  ].filter((s) => s.count > 0);

  return (
    <section className="mb-8 grid gap-4 lg:grid-cols-2">
      {/* Decision Summary */}
      <Card className="p-5">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
            <ListChecks className="h-4 w-4 text-brand-500" />
            Decision Summary
          </h2>
          <Link
            href="/decisions"
            className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Xem chi tiết →
          </Link>
        </header>
        <div className="grid grid-cols-3 gap-2">
          {summary.map((s) => {
            const Icon = STATUS_ICON[s.status] ?? Eye;
            return (
              <div
                key={s.status}
                className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="text-xs capitalize text-zinc-600 dark:text-zinc-400">
                    {s.status}
                  </span>
                </div>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums">
                  {s.count}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{stats.total} total tracking</span>
        </div>
      </Card>

      {/* Watchlist Due Review */}
      <Card className="p-5">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
            <Calendar
              className={
                overdue.length > 0
                  ? "h-4 w-4 text-rose-500"
                  : "h-4 w-4 text-amber-500"
              }
            />
            Watchlist Due Review
          </h2>
          <Link
            href="/watchlist"
            className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Xem tất cả →
          </Link>
        </header>

        {overdue.length === 0 && dueThisWeek.length === 0 ? (
          <p className="py-4 text-sm text-zinc-500 dark:text-zinc-400">
            Không có repo nào đến hạn tuần này. Đặt `next_review_at` trên Decision Panel để theo dõi.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {[...overdue, ...dueThisWeek].slice(0, 6).map((w) => {
              const cat = dueCategory(w.next_review_at);
              return (
                <li
                  key={w.id}
                  className="flex items-baseline justify-between gap-2 py-2 text-sm"
                >
                  <Link
                    href={`/repo/${w.owner}/${w.repo}`}
                    className="truncate text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
                  >
                    {w.owner}/{w.repo}
                  </Link>
                  <Badge
                    tone={STATUS_TONE[w.status] ?? "neutral"}
                    className="shrink-0 text-[10px]"
                  >
                    {w.status}
                  </Badge>
                  <span
                    className={`shrink-0 font-mono text-xs ${
                      cat === "overdue"
                        ? "font-semibold text-rose-600 dark:text-rose-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {w.next_review_at}
                    {cat === "overdue" && " ⚠"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {(overdue.length + dueThisWeek.length) > 6 && (
          <Link
            href="/decisions"
            className="mt-3 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline dark:text-brand-400"
          >
            +{overdue.length + dueThisWeek.length - 6} more
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </Card>
    </section>
  );
}
