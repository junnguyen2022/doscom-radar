"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Star,
  ExternalLink,
  Eye,
  CheckCircle2,
  Beaker,
  ThumbsUp,
  XCircle,
  AlertTriangle,
  Calendar,
  Filter,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { RepoCard, type RepoCardData } from "@/components/repo/RepoCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { computeHeat } from "@/lib/heat";
import { classify } from "@/lib/classify";

type SnapshotRow = {
  rank: number;
  owner: string;
  repo: string;
  language: string | null;
  description: string | null;
  stars_gained: number | null;
  total_stars: number | null;
  url: string;
};

type ServerItem = {
  id: string;
  user_id: string;
  repo_id: number;
  owner: string;
  repo: string;
  description: string | null;
  language: string | null;
  status: "follow" | "review" | "test" | "adopt" | "ignore" | "caution";
  priority: "high" | "medium" | "low";
  reason: string | null;
  next_review_at: string | null;
  created_at: string;
  updated_at: string;
};

type StatusFilter =
  | "all"
  | "follow"
  | "review"
  | "test"
  | "adopt"
  | "ignore"
  | "caution";
type PriorityFilter = "all" | "high" | "medium" | "low";
type DueFilter = "all" | "overdue" | "this_week" | "later" | "no_date";

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

function dueCategory(date: string | null): DueFilter {
  if (!date) return "no_date";
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  if (date < today) return "overdue";
  if (date <= week) return "this_week";
  return "later";
}

export default function WatchlistPage() {
  const { user, authLoaded, watchlist } = useApp();
  const [serverItems, setServerItems] = useState<ServerItem[] | null>(null);
  const [snapshotRows, setSnapshotRows] = useState<SnapshotRow[] | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");

  // Fetch server items when authenticated
  useEffect(() => {
    if (!authLoaded) return;
    if (!user) {
      setServerItems(null);
      return;
    }
    fetch("/api/watchlists/items", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { items: ServerItem[] }) => setServerItems(j.items ?? []))
      .catch(() => setServerItems([]));
  }, [user, authLoaded]);

  // Fetch latest snapshots (used for anon mode + heat enrichment for auth mode)
  useEffect(() => {
    fetch("/api/snapshots/latest", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { rows: SnapshotRow[] }) => setSnapshotRows(j.rows ?? []))
      .catch(() => setSnapshotRows([]));
  }, []);

  const snapshotByKey = useMemo(() => {
    const map = new Map<string, SnapshotRow>();
    for (const r of snapshotRows ?? []) {
      map.set(`${r.owner}/${r.repo}`, r);
    }
    return map;
  }, [snapshotRows]);

  // Loading
  if (!authLoaded || snapshotRows === null) {
    return (
      <main>
        <PageHeader
          eyebrow="Watchlist"
          title="Repos đang theo dõi"
          description="Repos bạn đã pin."
        />
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-full" />
            </Card>
          ))}
        </div>
      </main>
    );
  }

  // ============================================================================
  // Auth mode — full server data with filters
  // ============================================================================
  if (user) {
    if (serverItems === null) {
      return (
        <main>
          <PageHeader
            eyebrow="Watchlist"
            title="Repos đang theo dõi"
            description="Đang tải..."
          />
          <Skeleton className="h-32 w-full" />
        </main>
      );
    }

    const filtered = serverItems.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (priorityFilter !== "all" && item.priority !== priorityFilter)
        return false;
      if (dueFilter !== "all" && dueCategory(item.next_review_at) !== dueFilter)
        return false;
      return true;
    });

    const statusCounts: Record<string, number> = {};
    for (const i of serverItems) {
      statusCounts[i.status] = (statusCounts[i.status] ?? 0) + 1;
    }

    return (
      <main>
        <PageHeader
          eyebrow="Watchlist"
          title="Repos đang theo dõi"
          description={`${serverItems.length} đã pin · ${filtered.length} hiện tại sau filter · sync server`}
        />

        {serverItems.length === 0 ? (
          <EmptyState
            icon={Star}
            title="Chưa pin repo nào"
            description="Click ★ trên bất kỳ repo để theo dõi. Watchlist của bạn sync giữa devices khi đăng nhập."
          />
        ) : (
          <>
            {/* Filters */}
            <Card className="mb-6 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  <Filter className="h-3.5 w-3.5" />
                  Filters:
                </div>

                {/* Status pills */}
                <div className="flex flex-wrap items-center gap-1">
                  <FilterPill
                    label="All"
                    active={statusFilter === "all"}
                    count={serverItems.length}
                    onClick={() => setStatusFilter("all")}
                  />
                  {(
                    [
                      "follow",
                      "review",
                      "test",
                      "adopt",
                      "caution",
                      "ignore",
                    ] as StatusFilter[]
                  ).map((s) => (
                    <FilterPill
                      key={s}
                      label={s}
                      active={statusFilter === s}
                      count={statusCounts[s] ?? 0}
                      onClick={() => setStatusFilter(s)}
                    />
                  ))}
                </div>

                <div className="ml-auto flex items-center gap-2 text-xs">
                  <select
                    value={priorityFilter}
                    onChange={(e) =>
                      setPriorityFilter(e.target.value as PriorityFilter)
                    }
                    className="rounded-md border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="all">Priority: all</option>
                    <option value="high">high</option>
                    <option value="medium">medium</option>
                    <option value="low">low</option>
                  </select>
                  <select
                    value={dueFilter}
                    onChange={(e) => setDueFilter(e.target.value as DueFilter)}
                    className="rounded-md border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="all">Due: all</option>
                    <option value="overdue">overdue</option>
                    <option value="this_week">this week</option>
                    <option value="later">later</option>
                    <option value="no_date">no date</option>
                  </select>
                </div>
              </div>
            </Card>

            {filtered.length === 0 ? (
              <EmptyState
                icon={Filter}
                title="Không repo nào match filter"
                description="Thử reset filter hoặc đổi tiêu chí."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filtered.map((item) => (
                  <ServerItemCard
                    key={item.id}
                    item={item}
                    snapshot={snapshotByKey.get(`${item.owner}/${item.repo}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    );
  }

  // ============================================================================
  // Anon mode — localStorage fallback (no filters available, just list)
  // ============================================================================
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
          description="Click ★ trên bất kỳ repo để theo dõi. Đăng nhập để sync giữa devices và quản lý status/priority/due date."
        />
      </main>
    );
  }

  const watchedSet = new Set(watchlist);
  const matches: RepoCardData[] = (snapshotRows ?? [])
    .filter((r) => watchedSet.has(`${r.owner}/${r.repo}`))
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
    (k) => !(snapshotRows ?? []).some((r) => `${r.owner}/${r.repo}` === k),
  );

  return (
    <main>
      <PageHeader
        eyebrow="Watchlist"
        title="Repos đang theo dõi"
        description={`${matches.length} đang trong top hôm nay · ${missing.length} chưa xuất hiện · localStorage (đăng nhập để sync server)`}
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

function FilterPill({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
        active
          ? "bg-brand-600 text-white"
          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      }`}
    >
      <span className="capitalize">{label}</span>
      <span
        className={`tabular-nums text-[10px] ${active ? "opacity-90" : "opacity-60"}`}
      >
        {count}
      </span>
    </button>
  );
}

function ServerItemCard({
  item,
  snapshot,
}: {
  item: ServerItem;
  snapshot?: SnapshotRow;
}) {
  const Icon = STATUS_ICON[item.status] ?? Eye;
  const tone = STATUS_TONE[item.status];
  const due = dueCategory(item.next_review_at);
  const inTopToday = !!snapshot;

  return (
    <Card hoverable className="p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/repo/${item.owner}/${item.repo}`}
              className="truncate font-semibold text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
            >
              {item.owner}/{item.repo}
            </Link>
            <Badge tone={tone} className="inline-flex items-center gap-1">
              <Icon className="h-3 w-3" />
              {item.status}
            </Badge>
            {item.priority === "high" && (
              <Badge tone="danger" className="text-[10px]">
                ⚡ high
              </Badge>
            )}
          </div>

          {item.description && (
            <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
              {item.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            {item.language && <span>{item.language}</span>}
            {inTopToday && snapshot && (
              <span className="text-orange-600 dark:text-orange-400">
                🔥 #{snapshot.rank} hôm nay
              </span>
            )}
            {item.next_review_at && (
              <span
                className={`inline-flex items-center gap-1 ${
                  due === "overdue"
                    ? "font-semibold text-rose-600 dark:text-rose-400"
                    : due === "this_week"
                      ? "text-amber-600 dark:text-amber-400"
                      : ""
                }`}
              >
                <Calendar className="h-3 w-3" />
                Review {item.next_review_at}
                {due === "overdue" && " (overdue)"}
              </span>
            )}
          </div>

          {item.reason && (
            <p className="mt-2 rounded bg-zinc-50 px-2 py-1 text-xs italic text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              💭 {item.reason}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
