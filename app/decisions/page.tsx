import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  Beaker,
  ThumbsUp,
  XCircle,
  AlertTriangle,
  Calendar,
  ListChecks,
  Clock,
  Archive,
} from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  getMyDecisions,
  getDecisionStats,
  type DecisionType,
  type DecisionWithRepo,
} from "@/lib/decisions-store";
import { getMyWatchlist } from "@/lib/watchlist-store";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

const DECISION_META: Record<
  DecisionType,
  {
    label: string;
    tone: "warning" | "neutral" | "brand" | "success" | "danger";
    icon: typeof Eye;
  }
> = {
  follow: { label: "Follow", tone: "warning", icon: Eye },
  review: { label: "Review", tone: "neutral", icon: CheckCircle2 },
  test: { label: "Test", tone: "brand", icon: Beaker },
  adopt: { label: "Adopt", tone: "success", icon: ThumbsUp },
  caution: { label: "Caution", tone: "danger", icon: AlertTriangle },
  ignore: { label: "Ignore", tone: "neutral", icon: XCircle },
};

function dueCategory(date: string | null): "overdue" | "this_week" | "later" | "none" {
  if (!date) return "none";
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  if (date < today) return "overdue";
  if (date <= week) return "this_week";
  return "later";
}

function decisionsByLatestStatus(
  decisions: DecisionWithRepo[],
): Map<string, DecisionWithRepo> {
  // First decision per repo is the latest (sorted desc by decided_at)
  const latest = new Map<string, DecisionWithRepo>();
  for (const d of decisions) {
    const key = `${d.owner}/${d.repo}`;
    if (!latest.has(key)) latest.set(key, d);
  }
  return latest;
}

export default async function DecisionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/decisions");

  const [decisions, stats, watchlist] = await Promise.all([
    getMyDecisions({ limit: 200 }),
    getDecisionStats(),
    getMyWatchlist(),
  ]);

  const latestPerRepo = decisionsByLatestStatus(decisions);

  // Block 1: Decision Queue — items in 'review'/'test' status
  const queue = Array.from(latestPerRepo.values()).filter(
    (d) => d.decision === "review" || d.decision === "test",
  );

  // Block 2: Due This Week — watchlist items with next_review in next 7 days
  const dueThisWeek = watchlist.filter(
    (w) => dueCategory(w.next_review_at) === "this_week",
  );
  const overdue = watchlist.filter(
    (w) => dueCategory(w.next_review_at) === "overdue",
  );

  // Block 3: Adopted — latest status = 'adopt'
  const adopted = Array.from(latestPerRepo.values()).filter(
    (d) => d.decision === "adopt",
  );

  // Block 4: Ignored with Reasons — latest status = 'ignore'
  const ignored = Array.from(latestPerRepo.values()).filter(
    (d) => d.decision === "ignore",
  );

  const totalAdopt = adopted.length;
  const totalTest = stats.byDecision.test ?? 0;

  return (
    <main>
      <PageHeader
        eyebrow="Decisions"
        title="Decision Workflow"
        description="Quản lý quy trình Follow → Review → Test → Adopt cho từng repo. History append-only."
      />

      {/* Stat cards */}
      <section className="mb-8 grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard
          label="Tracking"
          value={stats.total}
          icon={ListChecks}
          hint="Repos in watchlist"
        />
        <StatCard
          label="In Queue"
          value={queue.length}
          accent="brand"
          icon={Clock}
          hint="review or test"
        />
        <StatCard
          label="Adopted"
          value={totalAdopt}
          accent="emerald"
          icon={ThumbsUp}
        />
        <StatCard
          label="Due this week"
          value={dueThisWeek.length}
          accent={overdue.length > 0 ? "rose" : "amber"}
          icon={Calendar}
          hint={overdue.length > 0 ? `${overdue.length} overdue` : undefined}
        />
      </section>

      {decisions.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Chưa có decision nào"
          description="Mở repo bất kỳ → click Follow / Test / Adopt / Ignore trên Decision Panel."
        />
      ) : (
        <div className="space-y-8">
          {/* Block 1: Decision Queue */}
          {queue.length > 0 && (
            <Block
              icon={Clock}
              iconColor="text-brand-500"
              title="Decision Queue"
              subtitle={`${queue.length} repos đang review/test, cần follow up`}
            >
              <div className="grid gap-2 md:grid-cols-2">
                {queue.map((d) => (
                  <DecisionMiniCard key={d.id} d={d} />
                ))}
              </div>
            </Block>
          )}

          {/* Block 2: Due This Week */}
          {(dueThisWeek.length > 0 || overdue.length > 0) && (
            <Block
              icon={Calendar}
              iconColor={overdue.length > 0 ? "text-rose-500" : "text-amber-500"}
              title="Due This Week"
              subtitle={`${dueThisWeek.length} đến hạn review · ${overdue.length} đã quá hạn`}
            >
              <div className="space-y-2">
                {[...overdue, ...dueThisWeek].map((w) => {
                  const cat = dueCategory(w.next_review_at);
                  return (
                    <div
                      key={w.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/repo/${w.owner}/${w.repo}`}
                          className="font-medium text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
                        >
                          {w.owner}/{w.repo}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-2 text-xs">
                          <Badge tone={DECISION_META[w.status as DecisionType]?.tone ?? "neutral"}>
                            {w.status}
                          </Badge>
                          {w.reason && (
                            <span className="truncate text-zinc-500 dark:text-zinc-400">
                              {w.reason}
                            </span>
                          )}
                        </div>
                      </div>
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
                    </div>
                  );
                })}
              </div>
            </Block>
          )}

          {/* Block 3: Adopted */}
          {adopted.length > 0 && (
            <Block
              icon={ThumbsUp}
              iconColor="text-emerald-500"
              title="Adopted Tools"
              subtitle={`${adopted.length} repos đã chốt dùng`}
            >
              <div className="grid gap-2 md:grid-cols-2">
                {adopted.map((d) => (
                  <DecisionMiniCard key={d.id} d={d} />
                ))}
              </div>
            </Block>
          )}

          {/* Block 4: Ignored */}
          {ignored.length > 0 && (
            <Block
              icon={Archive}
              iconColor="text-zinc-500"
              title="Ignored with Reasons"
              subtitle={`${ignored.length} repos đã loại — lưu lại để khỏi review lặp`}
            >
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {ignored.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-baseline justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/repo/${d.owner}/${d.repo}`}
                        className="font-medium text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
                      >
                        {d.owner}/{d.repo}
                      </Link>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {d.decision_reason}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-zinc-400">
                      {d.decided_at.slice(0, 10)}
                    </span>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {/* Block 5: Full Timeline */}
          <Block
            icon={ListChecks}
            iconColor="text-zinc-500"
            title="Full Decision Timeline"
            subtitle={`${decisions.length} decisions tổng cộng (append-only history)`}
          >
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Date</th>
                    <th className="px-4 py-2.5 text-left">Repo</th>
                    <th className="px-4 py-2.5 text-left">Decision</th>
                    <th className="px-4 py-2.5 text-left">Reason</th>
                    <th className="px-4 py-2.5 text-left">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {decisions.map((d) => {
                    const meta = DECISION_META[d.decision as DecisionType];
                    const Icon = meta?.icon ?? Eye;
                    return (
                      <tr
                        key={d.id}
                        className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                          {d.decided_at.slice(0, 10)}
                        </td>
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/repo/${d.owner}/${d.repo}`}
                            className="font-medium text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
                          >
                            {d.owner}/{d.repo}
                          </Link>
                          {d.previous_decision && (
                            <span className="ml-2 text-[10px] text-zinc-400">
                              (was {d.previous_decision})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge
                            tone={meta?.tone ?? "neutral"}
                            className="inline-flex items-center gap-1"
                          >
                            <Icon className="h-3 w-3" />
                            {meta?.label ?? d.decision}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 max-w-md truncate">
                          {d.decision_reason}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-zinc-500">
                          {d.due_date ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </Block>
        </div>
      )}
    </main>
  );
}

function Block({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  children,
}: {
  icon: typeof Clock;
  iconColor: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-3 flex items-center gap-2.5">
        <div className={`shrink-0 ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function DecisionMiniCard({ d }: { d: DecisionWithRepo }) {
  const meta = DECISION_META[d.decision as DecisionType];
  const Icon = meta?.icon ?? Eye;
  return (
    <Card className="p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/repo/${d.owner}/${d.repo}`}
              className="truncate font-medium text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
            >
              {d.owner}/{d.repo}
            </Link>
            <Badge
              tone={meta?.tone ?? "neutral"}
              className="inline-flex shrink-0 items-center gap-1 text-[10px]"
            >
              <Icon className="h-3 w-3" />
              {d.decision}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
            {d.decision_reason}
          </p>
          {d.due_date && (
            <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
              📅 Due {d.due_date}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
