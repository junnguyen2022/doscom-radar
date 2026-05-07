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
} from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  getMyDecisions,
  getDecisionStats,
  type DecisionType,
} from "@/lib/decisions-store";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

const DECISION_META: Record<
  DecisionType,
  { label: string; tone: "warning" | "neutral" | "brand" | "success" | "danger"; icon: typeof Eye }
> = {
  follow: { label: "Follow", tone: "warning", icon: Eye },
  review: { label: "Review", tone: "neutral", icon: CheckCircle2 },
  test: { label: "Test", tone: "brand", icon: Beaker },
  adopt: { label: "Adopt", tone: "success", icon: ThumbsUp },
  caution: { label: "Caution", tone: "danger", icon: AlertTriangle },
  ignore: { label: "Ignore", tone: "neutral", icon: XCircle },
};

export default async function DecisionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/decisions");

  const [decisions, stats] = await Promise.all([
    getMyDecisions({ limit: 100 }),
    getDecisionStats(),
  ]);

  const totalAdopt = stats.byDecision.adopt ?? 0;
  const totalTest = stats.byDecision.test ?? 0;
  const totalFollow = stats.byDecision.follow ?? 0;

  return (
    <main>
      <PageHeader
        eyebrow="Decisions"
        title="Decision Log"
        description="Quyết định Follow / Test / Adopt / Ignore cho từng repo. History append-only."
      />

      <section className="mb-8 grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard
          label="Total tracking"
          value={stats.total}
          icon={ListChecks}
        />
        <StatCard
          label="Adopt"
          value={totalAdopt}
          accent="emerald"
          icon={ThumbsUp}
        />
        <StatCard
          label="In test"
          value={totalTest}
          accent="brand"
          icon={Beaker}
        />
        <StatCard
          label="Due this week"
          value={stats.dueThisWeek}
          accent="amber"
          icon={Calendar}
        />
      </section>

      {decisions.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Chưa có decision nào"
          description="Mở repo bất kỳ → click Follow / Test / Adopt / Ignore trên Decision Panel."
        />
      ) : (
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
                      <Badge tone={meta?.tone ?? "neutral"} className="inline-flex items-center gap-1">
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
      )}
    </main>
  );
}
