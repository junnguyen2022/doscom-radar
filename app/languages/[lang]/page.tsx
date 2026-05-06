import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { allRowsForLatestDate, type SnapshotRow } from "@/lib/storage";
import { computeHeat } from "@/lib/heat";
import { classify } from "@/lib/classify";
import { RepoCard, type RepoCardData } from "@/components/repo/RepoCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LanguageDot } from "@/components/ui/LanguageDot";
import { Code2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LanguageDetail({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const lang = decodeURIComponent(rawLang);

  const [{ rows: daily }, { rows: weekly }, { rows: monthly }] =
    await Promise.all([
      allRowsForLatestDate("daily"),
      allRowsForLatestDate("weekly"),
      allRowsForLatestDate("monthly"),
    ]);

  const seen = new Set<string>();
  const matched: RepoCardData[] = [];
  for (const r of [...daily, ...weekly, ...monthly] satisfies SnapshotRow[]) {
    const k = `${r.owner}/${r.repo}`;
    if (seen.has(k)) continue;
    if ((r.language ?? "Unknown") !== lang) continue;
    seen.add(k);
    const heat = computeHeat({
      starsGained: r.stars_gained,
      totalStars: r.total_stars,
      rank: r.rank,
    });
    matched.push({
      rank: r.rank,
      owner: r.owner,
      repo: r.repo,
      language: r.language,
      description: r.description,
      starsGained: r.stars_gained,
      totalStars: r.total_stars,
      url: r.url,
      heat,
      classification: classify({
        starsGained: r.stars_gained,
        totalStars: r.total_stars,
        language: r.language,
      }),
    });
  }

  matched.sort((a, b) => b.heat - a.heat);

  return (
    <main>
      <Link
        href="/languages"
        className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-brand-600 dark:text-zinc-400 dark:hover:text-brand-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Languages
      </Link>

      <PageHeader
        eyebrow="Language"
        title={
          <span className="inline-flex items-center gap-2.5">
            <LanguageDot language={lang} size={16} />
            {lang}
          </span>
        }
        description={`${matched.length} unique repos đang trending · sort theo Heat.`}
      />

      {matched.length === 0 ? (
        <EmptyState
          icon={Code2}
          title="Không có repo nào"
          description="Không có repo nào với ngôn ngữ này trong snapshot hiện tại."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {matched.map((c) => (
            <RepoCard key={`${c.owner}/${c.repo}`} r={c} />
          ))}
        </div>
      )}
    </main>
  );
}
