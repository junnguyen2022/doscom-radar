import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, Flame } from "lucide-react";
import {
  getCollection,
  intersectWithTrending,
  trendingKeysFromRows,
} from "@/lib/collections";
import { allRowsForLatestDate } from "@/lib/storage";
import { computeHeat } from "@/lib/heat";
import { classify, CLASS_LABEL } from "@/lib/classify";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LanguageDot } from "@/components/ui/LanguageDot";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { WatchButton } from "@/components/watchlist/WatchButton";
import type { Classification } from "@/lib/classify";

export const dynamic = "force-dynamic";

const CLASS_TONE: Record<Classification, "success" | "warning" | "danger"> = {
  adopt: "success",
  monitor: "warning",
  caution: "danger",
};

export default async function CollectionDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) notFound();

  const [{ rows: daily }, { rows: weekly }, { rows: monthly }] =
    await Promise.all([
      allRowsForLatestDate("daily"),
      allRowsForLatestDate("weekly"),
      allRowsForLatestDate("monthly"),
    ]);
  const allRows = [...daily, ...weekly, ...monthly];
  const trendingKeys = trendingKeysFromRows(allRows);
  const { matched, unmatched } = intersectWithTrending(collection, trendingKeys);

  const dataByKey = new Map<string, (typeof allRows)[number]>();
  for (const r of [...monthly, ...weekly, ...daily]) {
    dataByKey.set(`${r.owner}/${r.repo}`.toLowerCase(), r);
  }

  return (
    <main>
      <Link
        href="/collections"
        className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-brand-600 dark:text-zinc-400 dark:hover:text-brand-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Collections
      </Link>

      <PageHeader
        eyebrow="Collection"
        title={collection.name}
        description={`${collection.items.length} repos curated · ${matched.length} đang trending hôm nay`}
        actions={
          matched.length > 0 ? (
            <Link href={`/trending?collection=${collection.slug}`}>
              <Button variant="secondary">
                Xem trên /trending
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          ) : null
        }
      />

      {matched.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Đang trending
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              ({matched.length})
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {matched.map((repoKey) => {
              const r = dataByKey.get(repoKey.toLowerCase());
              if (!r) return null;
              const heat = computeHeat({
                starsGained: r.stars_gained,
                totalStars: r.total_stars,
                rank: r.rank,
              });
              const cls = classify({
                starsGained: r.stars_gained,
                totalStars: r.total_stars,
                language: r.language,
              });
              return (
                <Card key={repoKey} hoverable className="p-3.5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 font-mono text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      #{r.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/repo/${r.owner}/${r.repo}`}
                        className="block truncate font-semibold text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
                      >
                        {r.owner}/{r.repo}
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <Badge tone={CLASS_TONE[cls]}>
                          {CLASS_LABEL[cls].vi}
                        </Badge>
                        {r.language && (
                          <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                            <LanguageDot language={r.language} />
                            {r.language}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 font-medium text-orange-600 dark:text-orange-400">
                          <Flame className="h-3 w-3" />
                          {heat}
                        </span>
                        {r.total_stars != null && (
                          <span className="text-zinc-500 dark:text-zinc-500">
                            ★ {r.total_stars.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <WatchButton owner={r.owner} repo={r.repo} />
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          Curated list ({unmatched.length} không trong trending hôm nay)
        </h2>
        <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {unmatched.map((item) => (
            <li key={item}>
              <a
                href={`https://github.com/${item}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 truncate rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
              >
                <span className="truncate">{item}</span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
