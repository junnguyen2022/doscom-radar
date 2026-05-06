import {
  allRowsForLatestDate,
  historyForRepo,
  currentBackend,
  type SnapshotRow,
} from "@/lib/storage";
import { computeHeat } from "@/lib/heat";
import { classify } from "@/lib/classify";
import { parseFilters } from "@/lib/filters";
import { getCollection } from "@/lib/collections";
import { RepoCard, type RepoCardData } from "@/components/repo/RepoCard";
import { FilterBar } from "@/components/filters/FilterBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { SearchX, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

function applyFilters(
  rows: SnapshotRow[],
  filters: ReturnType<typeof parseFilters>,
): RepoCardData[] {
  let filtered: RepoCardData[] = rows.map((r) => {
    const heat = computeHeat({
      starsGained: r.stars_gained,
      totalStars: r.total_stars,
      rank: r.rank,
    });
    const c = classify({
      starsGained: r.stars_gained,
      totalStars: r.total_stars,
      language: r.language,
    });
    return {
      rank: r.rank,
      owner: r.owner,
      repo: r.repo,
      language: r.language,
      description: r.description,
      starsGained: r.stars_gained,
      totalStars: r.total_stars,
      url: r.url,
      heat,
      classification: c,
    };
  });

  if (filters.languages.length) {
    filtered = filtered.filter(
      (r) => r.language && filters.languages.includes(r.language),
    );
  }

  if (filters.minTotalStars > 0) {
    filtered = filtered.filter(
      (r) => (r.totalStars ?? 0) >= filters.minTotalStars,
    );
  }

  if (filters.minStarsGained > 0) {
    filtered = filtered.filter(
      (r) => (r.starsGained ?? 0) >= filters.minStarsGained,
    );
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.owner.toLowerCase().includes(q) ||
        r.repo.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q),
    );
  }

  if (filters.classes.length < 3) {
    filtered = filtered.filter((r) =>
      filters.classes.includes(r.classification),
    );
  }

  if (filters.collection) {
    const c = getCollection(filters.collection);
    if (c) {
      const allowed = new Set(c.items.map((s) => s.toLowerCase()));
      filtered = filtered.filter((r) =>
        allowed.has(`${r.owner}/${r.repo}`.toLowerCase()),
      );
    }
  }

  filtered.sort((a, b) => {
    switch (filters.sort) {
      case "gained":
        return (b.starsGained ?? 0) - (a.starsGained ?? 0);
      case "total":
        return (b.totalStars ?? 0) - (a.totalStars ?? 0);
      case "rank":
        return a.rank - b.rank;
      default:
        return b.heat - a.heat;
    }
  });

  if (filters.topN > 0) filtered = filtered.slice(0, filters.topN);

  return filtered;
}

export default async function TrendingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const collection = filters.collection
    ? getCollection(filters.collection)
    : null;

  const { rows, capturedAt } = await allRowsForLatestDate(filters.timeframe);
  const cards = applyFilters(rows, filters);

  const availableLanguages = Array.from(
    new Set(rows.map((r) => r.language).filter((x): x is string => !!x)),
  ).sort();

  if (filters.timeframe === "daily" && cards.length > 0) {
    const topFive = cards.slice(0, 5);
    const histories = await Promise.all(
      topFive.map((c) => historyForRepo(c.owner, c.repo, "daily")),
    );
    histories.forEach((h, i) => {
      if (h.length > 1) topFive[i].rankHistory = h.map((s) => s.rank);
    });
  }

  return (
    <main>
      <PageHeader
        eyebrow="Trending"
        title={collection ? collection.name : "GitHub Trending"}
        description={
          capturedAt
            ? `Snapshot ${capturedAt} · ${rows.length} repos`
            : "Chưa có snapshot — vào /settings để chạy thủ công."
        }
        actions={
          <Badge tone={currentBackend() === "supabase" ? "success" : "warning"}>
            <span className="font-mono">backend: {currentBackend()}</span>
          </Badge>
        }
        meta={
          collection && (
            <Badge tone="brand">
              Collection: {collection.name} ({collection.items.length} items)
            </Badge>
          )
        }
      />

      <FilterBar current={filters} availableLanguages={availableLanguages} />

      {cards.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Không có repo phù hợp"
          description="Thử reset bộ lọc hoặc nới điều kiện. Có thể không có repo nào match collection + timeframe + classes hiện tại."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {cards.map((c) => (
            <RepoCard key={`${c.owner}/${c.repo}`} r={c} />
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" />
          Showing {cards.length} of {rows.length} repos
        </span>
        <span className="font-mono">
          sort: {filters.sort} · timeframe: {filters.timeframe}
        </span>
      </div>
    </main>
  );
}
