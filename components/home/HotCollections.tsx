import Link from "next/link";
import { Flame, ArrowRight } from "lucide-react";
import type { Collection } from "@/lib/collections";
import type { SnapshotRow } from "@/lib/storage";

export function HotCollections({
  hotCollections,
}: {
  hotCollections: Array<{
    collection: Collection;
    matchedRows: SnapshotRow[];
  }>;
}) {
  if (hotCollections.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Flame className="h-6 w-6 text-orange-500" />
            Hot Collections
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Collections có nhiều repos đang trending hôm nay nhất.
          </p>
        </div>
        <Link
          href="/collections"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          Xem tất cả 138
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex gap-4">
          {hotCollections.map(({ collection, matchedRows }) => (
            <article
              key={collection.slug}
              className="group relative w-[300px] shrink-0 overflow-hidden rounded-xl border border-orange-200/70 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4 transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-lift dark:border-orange-900/40 dark:from-orange-950/30 dark:via-zinc-900 dark:to-amber-950/20 dark:hover:border-orange-800"
            >
              <div className="absolute right-0 top-0 rounded-bl-lg bg-gradient-to-r from-orange-500 to-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                🔥 {matchedRows.length}/{collection.items.length}
              </div>

              <Link
                href={`/collections/${collection.slug}`}
                className="mb-3 block truncate pr-16 font-semibold text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
              >
                {collection.name}
              </Link>

              <ul className="space-y-1.5">
                {matchedRows.slice(0, 4).map((r) => (
                  <li
                    key={`${r.owner}/${r.repo}`}
                    className="flex items-baseline justify-between gap-2 text-sm"
                  >
                    <Link
                      href={`/repo/${r.owner}/${r.repo}`}
                      className="truncate text-zinc-700 hover:text-brand-600 hover:underline dark:text-zinc-300 dark:hover:text-brand-400"
                    >
                      {r.owner}/{r.repo}
                    </Link>
                    <span className="shrink-0 font-mono text-xs text-zinc-500">
                      #{r.rank}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={`/collections/${collection.slug}`}
                className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-orange-600 transition-all hover:gap-2 dark:text-orange-400"
              >
                Xem collection
                <ArrowRight className="h-3 w-3" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
