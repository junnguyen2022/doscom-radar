import Link from "next/link";
import {
  listCollections,
  intersectWithTrending,
  trendingKeysFromRows,
} from "@/lib/collections";
import { allRowsForLatestDate } from "@/lib/storage";
import { PageHeader } from "@/components/ui/PageHeader";
import { Flame, FolderKanban } from "lucide-react";

export const dynamic = "force-dynamic";

function CollectionCard({
  c,
  matched,
  hot,
}: {
  c: { slug: string; name: string; items: string[] };
  matched: number;
  hot: boolean;
}) {
  const pct = (matched / c.items.length) * 100;

  return (
    <Link
      href={`/collections/${c.slug}`}
      className={`group relative block overflow-hidden rounded-xl border p-3.5 transition-all duration-200 hover:-translate-y-0.5 ${
        hot
          ? "border-orange-200/70 bg-gradient-to-br from-orange-50 to-amber-50 hover:border-orange-300 hover:shadow-lift dark:border-orange-900/40 dark:from-orange-950/30 dark:to-amber-950/20 dark:hover:border-orange-800"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-soft dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
      }`}
    >
      {hot && (
        <div className="absolute right-0 top-0 rounded-bl-lg bg-gradient-to-r from-orange-500 to-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          🔥 HOT
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold text-zinc-900 group-hover:text-brand-600 dark:text-zinc-100 dark:group-hover:text-brand-400">
          {c.name}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {hot ? (
          <>
            <span className="inline-flex items-center gap-1 font-mono font-bold text-orange-600 dark:text-orange-400">
              <Flame className="h-3 w-3" />
              {matched}
            </span>
            <span className="text-zinc-400">/ {c.items.length} repos</span>
          </>
        ) : (
          <span className="font-mono text-zinc-400 dark:text-zinc-500">
            {c.items.length} repos
          </span>
        )}
      </div>
      {hot && (
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-orange-100 dark:bg-orange-950/40">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500 transition-all"
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        </div>
      )}
    </Link>
  );
}

export default async function CollectionsIndex() {
  const collections = listCollections();
  const [{ rows: daily }, { rows: weekly }, { rows: monthly }] =
    await Promise.all([
      allRowsForLatestDate("daily"),
      allRowsForLatestDate("weekly"),
      allRowsForLatestDate("monthly"),
    ]);
  const trendingKeys = trendingKeysFromRows([...daily, ...weekly, ...monthly]);

  const enriched = collections
    .map((c) => {
      const { matched } = intersectWithTrending(c, trendingKeys);
      return { c, matched: matched.length };
    })
    .sort((a, b) => b.matched - a.matched || a.c.name.localeCompare(b.c.name));

  const withMatches = enriched.filter((e) => e.matched > 0);
  const withoutMatches = enriched.filter((e) => e.matched === 0);

  return (
    <main>
      <PageHeader
        eyebrow="Collections"
        title="Bộ sưu tập"
        description={`${collections.length} themed collections curated bởi PingCAP / OSSInsight. Các collection có repo đang trending sẽ được highlight.`}
      />

      {withMatches.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Có repo đang trending
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              ({withMatches.length})
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {withMatches.map(({ c, matched }) => (
              <CollectionCard
                key={c.slug}
                c={c}
                matched={matched}
                hot={true}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Tất cả collections
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            ({collections.length})
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {withoutMatches.map(({ c, matched }) => (
            <CollectionCard
              key={c.slug}
              c={c}
              matched={matched}
              hot={false}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
