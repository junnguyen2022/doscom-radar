import Link from "next/link";
import { allRowsForLatestDate } from "@/lib/storage";
import { computeHeat } from "@/lib/heat";
import { PageHeader } from "@/components/ui/PageHeader";
import { LanguageDot } from "@/components/ui/LanguageDot";
import { Flame } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LanguagesPage() {
  const [{ rows: daily }, { rows: weekly }, { rows: monthly }] =
    await Promise.all([
      allRowsForLatestDate("daily"),
      allRowsForLatestDate("weekly"),
      allRowsForLatestDate("monthly"),
    ]);

  const seen = new Set<string>();
  type Row = (typeof daily)[number];
  const dedupe: Row[] = [];
  for (const r of [...daily, ...weekly, ...monthly]) {
    const k = `${r.owner}/${r.repo}`;
    if (seen.has(k)) continue;
    seen.add(k);
    dedupe.push(r);
  }

  const stats = new Map<
    string,
    {
      count: number;
      heatSum: number;
      topRepo: { owner: string; repo: string; heat: number };
    }
  >();

  for (const r of dedupe) {
    const lang = r.language ?? "Unknown";
    const heat = computeHeat({
      starsGained: r.stars_gained,
      totalStars: r.total_stars,
      rank: r.rank,
    });
    const cur = stats.get(lang);
    if (!cur) {
      stats.set(lang, {
        count: 1,
        heatSum: heat,
        topRepo: { owner: r.owner, repo: r.repo, heat },
      });
    } else {
      cur.count++;
      cur.heatSum += heat;
      if (heat > cur.topRepo.heat) {
        cur.topRepo = { owner: r.owner, repo: r.repo, heat };
      }
    }
  }

  const sorted = [...stats.entries()].sort(
    (a, b) => b[1].heatSum - a[1].heatSum,
  );
  const totalRepos = dedupe.length;
  const maxHeatSum = sorted[0]?.[1].heatSum ?? 1;

  return (
    <main>
      <PageHeader
        eyebrow="Languages"
        title="Ngôn ngữ"
        description={`${sorted.length} ngôn ngữ · ${totalRepos} unique repos đang trending · sắp xếp theo tổng heat.`}
      />

      <div className="space-y-2">
        {sorted.map(([lang, s]) => {
          const pct = (s.heatSum / maxHeatSum) * 100;
          return (
            <Link
              key={lang}
              href={`/languages/${encodeURIComponent(lang)}`}
              className="group block rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-soft dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <LanguageDot language={lang} size={12} />
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {lang}
                  </span>
                </div>
                <div className="flex shrink-0 items-baseline gap-4 text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    <span className="font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {s.count}
                    </span>{" "}
                    repos
                  </span>
                  <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                    <Flame className="h-3 w-3 text-orange-500" />
                    <span className="font-bold tabular-nums text-orange-600 dark:text-orange-400">
                      {s.heatSum}
                    </span>
                  </span>
                  <span className="hidden truncate text-zinc-500 group-hover:text-brand-600 dark:text-zinc-400 dark:group-hover:text-brand-400 sm:inline-block sm:max-w-[200px]">
                    🔥 {s.topRepo.owner}/{s.topRepo.repo}
                  </span>
                </div>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 via-orange-400 to-rose-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
