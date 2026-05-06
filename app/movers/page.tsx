import { distinctDailyDates, dailyForDate } from "@/lib/storage";
import Link from "next/link";
import { computeMovers, type Mover } from "@/lib/movers";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Activity,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const dynamic = "force-dynamic";

function MoverList({
  items,
  kind,
}: {
  items: Mover[];
  kind: "rise" | "fall" | "new" | "drop";
}) {
  if (items.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
        — Không có —
      </p>
    );
  }
  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {items.map((m) => (
        <li
          key={`${m.owner}/${m.repo}`}
          className="flex items-baseline justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        >
          <Link
            href={`/repo/${m.owner}/${m.repo}`}
            className="truncate text-sm font-medium text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
          >
            {m.owner}/{m.repo}
          </Link>
          <span className="shrink-0 font-mono text-xs text-zinc-400">
            {kind === "rise" || kind === "fall"
              ? `#${m.yesterdayRank} → #${m.todayRank}`
              : kind === "new"
                ? `#${m.todayRank}`
                : `was #${m.yesterdayRank}`}
          </span>
          <span className="w-12 shrink-0 text-right text-xs font-bold tabular-nums">
            {kind === "rise" && m.rankDelta != null ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                ▲ {m.rankDelta}
              </span>
            ) : kind === "fall" && m.rankDelta != null ? (
              <span className="text-rose-600 dark:text-rose-400">
                ▼ {Math.abs(m.rankDelta)}
              </span>
            ) : kind === "new" ? (
              <span className="text-blue-600 dark:text-blue-400">NEW</span>
            ) : (
              <span className="text-zinc-500">OUT</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Bucket({
  title,
  count,
  items,
  kind,
  icon: Icon,
  color,
}: {
  title: string;
  count: number;
  items: Mover[];
  kind: "rise" | "fall" | "new" | "drop";
  icon: LucideIcon;
  color: "blue" | "emerald" | "rose" | "zinc";
}) {
  const HEADER_BG = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
    emerald:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400",
    zinc: "bg-zinc-50 text-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400",
  }[color];

  return (
    <Card className="overflow-hidden">
      <header
        className={`flex items-center justify-between gap-2 px-3 py-2.5 ${HEADER_BG}`}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <span className="font-mono text-xs font-bold">{count}</span>
      </header>
      <MoverList items={items} kind={kind} />
    </Card>
  );
}

export default async function MoversPage() {
  const dates = await distinctDailyDates();

  if (dates.length < 2) {
    return (
      <main>
        <PageHeader
          eyebrow="Movers"
          title="Biến động hàng ngày"
          description="So sánh rank hôm nay vs hôm qua để phát hiện trend mới."
        />
        <EmptyState
          icon={Activity}
          title="Chưa đủ dữ liệu"
          description={`Cần ít nhất 2 ngày snapshot để so sánh. Hiện có ${dates.length} ngày — đợi cron chạy ngày mai hoặc trigger thủ công ở /settings.`}
        />
      </main>
    );
  }

  const [today, yesterday] = await Promise.all([
    dailyForDate(dates[0]),
    dailyForDate(dates[1]),
  ]);
  const m = computeMovers(today, yesterday);

  return (
    <main>
      <PageHeader
        eyebrow="Movers"
        title="Biến động hàng ngày"
        description="So sánh rank hôm nay vs hôm qua."
        meta={
          <Badge tone="neutral">
            <span className="font-mono">
              {dates[1]} → {dates[0]}
            </span>
          </Badge>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Bucket
          title="New entries"
          count={m.newEntries.length}
          items={m.newEntries}
          kind="new"
          icon={Plus}
          color="blue"
        />
        <Bucket
          title="Risers"
          count={m.risers.length}
          items={m.risers}
          kind="rise"
          icon={ArrowUpRight}
          color="emerald"
        />
        <Bucket
          title="Fallers"
          count={m.fallers.length}
          items={m.fallers}
          kind="fall"
          icon={ArrowDownRight}
          color="rose"
        />
        <Bucket
          title="Dropped"
          count={m.dropped.length}
          items={m.dropped}
          kind="drop"
          icon={Minus}
          color="zinc"
        />
      </div>
    </main>
  );
}
