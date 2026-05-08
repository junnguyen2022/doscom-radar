import { historyForRepo } from "@/lib/storage";
import { getRepository, getLatestMetrics } from "@/lib/enrichment";
import { getLatestScoreForRepo } from "@/lib/scoring-store";
import { computeHeat } from "@/lib/heat";
import { parseRepos } from "@/lib/compare/parse-repos";
import { deriveConclusion, type CompareSubject } from "@/lib/compare/conclusion";
import { Sparkline } from "@/components/repo/Sparkline";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LanguageDot } from "@/components/ui/LanguageDot";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  GitCompare,
  Scale,
  Calendar,
  Tag,
  CheckCircle2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { CompareInput } from "./CompareInput";
import Link from "next/link";

export const dynamic = "force-dynamic";

type CompareRow = CompareSubject & {
  description: string | null;
  heat: number;
  rankHistory: number[];
  starsGained: number | null;
  rank: number | null;
  latestReleaseTag: string | null;
  latestReleaseAt: string | null;
  recommendation: string | null;
  confidence: string | null;
};

const REC_TONE: Record<
  string,
  "success" | "warning" | "danger" | "brand" | "neutral"
> = {
  adopt: "success",
  test: "brand",
  follow: "warning",
  caution: "danger",
  ignore: "neutral",
};

function relativeShort(iso: string | null): string {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

async function loadCompareData(input: string): Promise<CompareRow[]> {
  const { repos } = parseRepos(input);

  const fetches = await Promise.all(
    repos.map(async (v) => {
      const [hist, repository] = await Promise.all([
        historyForRepo(v.owner, v.repo, "daily"),
        getRepository(v.owner, v.repo),
      ]);
      const [metrics, score] = await Promise.all([
        repository ? getLatestMetrics(repository.id) : Promise.resolve(null),
        repository
          ? getLatestScoreForRepo(repository.id)
          : Promise.resolve(null),
      ]);
      return { v, hist, repository, metrics, score };
    }),
  );

  return fetches.map(({ v, hist, repository, metrics, score }) => {
    const latest = hist.at(-1);
    const found = !!(latest || repository);
    const rank = latest?.rank ?? null;
    const totalStars = metrics?.total_stars ?? latest?.total_stars ?? null;
    const starsGained = latest?.stars_gained ?? null;

    return {
      key: v.key,
      owner: v.owner,
      repo: v.repo,
      found,
      language: repository?.language ?? latest?.language ?? null,
      description: repository?.description ?? latest?.description ?? null,
      rank,
      totalStars,
      starsGained,
      heat: computeHeat({
        starsGained,
        totalStars,
        rank: rank ?? undefined,
      }),
      rankHistory: hist.map((s) => s.rank),
      forks: metrics?.forks_count ?? null,
      contributors: metrics?.contributors_count ?? null,
      license: repository?.license_name ?? repository?.license_key ?? null,
      pushedAt: repository?.pushed_at ?? null,
      archived: repository?.archived ?? false,
      latestReleaseTag: metrics?.latest_release_tag ?? null,
      latestReleaseAt: metrics?.latest_release_at ?? null,
      radarScore: score ? Number(score.radar_score) : null,
      riskPenalty: score ? Number(score.risk_penalty) : null,
      relevanceScore: score ? Number(score.relevance_score) : null,
      maintenanceScore: score ? Number(score.maintenance_score) : null,
      recommendation: score?.recommendation ?? null,
      confidence: score?.confidence ?? null,
      riskFlags: score?.risk_flags ?? [],
    };
  });
}

const COL_GROUPS = [
  { id: "identity", label: "Identity", cols: 2 },
  { id: "popularity", label: "Popularity", cols: 3 },
  { id: "license", label: "License & Maintenance", cols: 2 },
  { id: "release", label: "Release", cols: 1 },
  { id: "scoring", label: "Radar Score", cols: 3 },
  { id: "outcome", label: "Outcome", cols: 2 },
] as const;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const reposParam = Array.isArray(sp.repos) ? sp.repos[0] : sp.repos;
  const data = reposParam ? await loadCompareData(reposParam) : [];
  const conclusion = data.length > 0 ? deriveConclusion(data) : null;

  return (
    <main>
      <PageHeader
        eyebrow="Compare"
        title="So sánh repos"
        description="Side-by-side với Radar Score, Risk, License, Maintenance — đánh giá adopt-readiness."
      />

      <CompareInput initialValue={reposParam ?? ""} />

      {data.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={GitCompare}
            title="Chưa có repo nào"
            description="Nhập ít nhất 1 repo (owner/repo hoặc URL GitHub) hoặc chọn 1 preset."
          />
        </div>
      ) : (
        <>
          {conclusion && (
            <Card className="mt-6 border-l-4 border-l-brand-500 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-400">
                <CheckCircle2 className="h-4 w-4" />
                Kết luận
              </h2>
              <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {conclusion.vi.headline}
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {conclusion.bestForAdopt && (
                  <div className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200 dark:bg-emerald-950/20 dark:ring-emerald-900/40">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Best for adopt
                    </div>
                    <Link
                      href={`/repo/${conclusion.bestForAdopt.owner}/${conclusion.bestForAdopt.repo}`}
                      className="mt-1 block font-mono text-sm font-medium text-emerald-900 hover:underline dark:text-emerald-300"
                    >
                      {conclusion.bestForAdopt.owner}/
                      {conclusion.bestForAdopt.repo}
                    </Link>
                    <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                      {conclusion.bestForAdopt.reason}
                    </p>
                  </div>
                )}
                {conclusion.bestForMonitor && (
                  <div className="rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200 dark:bg-amber-950/20 dark:ring-amber-900/40">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      <Eye className="h-3.5 w-3.5" />
                      Worth monitoring
                    </div>
                    <Link
                      href={`/repo/${conclusion.bestForMonitor.owner}/${conclusion.bestForMonitor.repo}`}
                      className="mt-1 block font-mono text-sm font-medium text-amber-900 hover:underline dark:text-amber-300"
                    >
                      {conclusion.bestForMonitor.owner}/
                      {conclusion.bestForMonitor.repo}
                    </Link>
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                      {conclusion.bestForMonitor.reason}
                    </p>
                  </div>
                )}
              </div>
              {conclusion.riskCallouts.length > 0 && (
                <div className="mt-3 rounded-lg bg-rose-50 p-3 ring-1 ring-rose-200 dark:bg-rose-950/20 dark:ring-rose-900/40">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Cảnh báo rủi ro
                  </div>
                  <ul className="mt-1 space-y-0.5 text-xs text-rose-700 dark:text-rose-400">
                    {conclusion.riskCallouts.map((c) => (
                      <li key={`${c.owner}/${c.repo}`}>
                        <Link
                          href={`/repo/${c.owner}/${c.repo}`}
                          className="font-mono hover:underline"
                        >
                          {c.owner}/{c.repo}
                        </Link>
                        : {c.flags.join(", ")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {conclusion.notes.length > 0 && (
                <ul className="mt-3 space-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {conclusion.notes.map((n, i) => (
                    <li key={i}>• {n}</li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-100/70 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
                    {COL_GROUPS.map((g) => (
                      <th
                        key={g.id}
                        colSpan={g.cols}
                        className="border-r border-zinc-200 px-3 py-2 text-left last:border-r-0 dark:border-zinc-800"
                      >
                        {g.label}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                    {/* identity */}
                    <th className="px-3 py-3 text-left">Repo</th>
                    <th className="px-3 py-3 text-left">Lang</th>
                    {/* popularity */}
                    <th className="px-3 py-3 text-right">Total ★</th>
                    <th className="px-3 py-3 text-right">Forks</th>
                    <th className="px-3 py-3 text-right">Contrib</th>
                    {/* license & maintenance */}
                    <th className="px-3 py-3 text-left">License</th>
                    <th className="px-3 py-3 text-left">Pushed</th>
                    {/* release */}
                    <th className="px-3 py-3 text-left">Release</th>
                    {/* scoring */}
                    <th className="px-3 py-3 text-right">Radar</th>
                    <th className="px-3 py-3 text-right">Relevance</th>
                    <th className="px-3 py-3 text-right">Risk</th>
                    {/* outcome */}
                    <th className="px-3 py-3 text-left">Reco</th>
                    <th className="px-3 py-3 text-left">History</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {data.map((r) => (
                    <tr
                      key={r.key}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    >
                      <td className="px-3 py-3 font-medium">
                        <Link
                          href={`/repo/${r.owner}/${r.repo}`}
                          className="text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
                        >
                          {r.owner}/{r.repo}
                        </Link>
                        {!r.found && (
                          <span className="ml-2 text-xs text-rose-500">
                            not in DB
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {r.language ? (
                          <span className="inline-flex items-center gap-1.5">
                            <LanguageDot language={r.language} />
                            {r.language}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {r.totalStars != null
                          ? r.totalStars.toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                        {r.forks != null ? r.forks.toLocaleString() : "—"}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                        {r.contributors ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {r.license ? (
                          <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400">
                            <Scale className="h-3 w-3" />
                            {r.license.length > 12
                              ? r.license.slice(0, 12) + "…"
                              : r.license}
                          </span>
                        ) : (
                          <span className="text-rose-500">none</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {relativeShort(r.pushedAt)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {r.latestReleaseTag ? (
                          <span
                            className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"
                            title={
                              r.latestReleaseAt
                                ? `Released ${relativeShort(r.latestReleaseAt)}`
                                : ""
                            }
                          >
                            <Tag className="h-3 w-3" />
                            {r.latestReleaseTag.length > 10
                              ? r.latestReleaseTag.slice(0, 10) + "…"
                              : r.latestReleaseTag}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-bold text-brand-600 dark:text-brand-400">
                        {r.radarScore != null ? r.radarScore : "—"}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {r.relevanceScore != null ? (
                          <span
                            className={
                              r.relevanceScore >= 70
                                ? "font-semibold text-emerald-600 dark:text-emerald-400"
                                : r.relevanceScore >= 40
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-zinc-500"
                            }
                          >
                            {r.relevanceScore}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        className="px-3 py-3 text-right tabular-nums"
                        title={
                          r.riskFlags.length > 0
                            ? `Flags: ${r.riskFlags.join(", ")}`
                            : ""
                        }
                      >
                        {r.riskPenalty != null ? (
                          <span
                            className={
                              r.riskPenalty >= 50
                                ? "font-bold text-rose-600 dark:text-rose-400"
                                : r.riskPenalty >= 25
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                            }
                          >
                            {r.riskPenalty}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {r.recommendation && (
                          <Badge
                            tone={REC_TONE[r.recommendation] ?? "neutral"}
                            className="text-[10px]"
                          >
                            {r.recommendation}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {r.rankHistory.length > 1 ? (
                          <Sparkline
                            ranks={r.rankHistory}
                            width={60}
                            height={18}
                          />
                        ) : (
                          <span className="text-xs text-zinc-400">
                            {r.rankHistory.length === 1 ? "1pt" : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {data.some((r) => r.description) && (
            <section className="mt-6 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Descriptions
              </h2>
              {data
                .filter((r) => r.description)
                .map((r) => (
                  <Card key={r.key} className="p-4">
                    <div className="font-semibold">
                      {r.owner}/{r.repo}
                    </div>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {r.description}
                    </p>
                  </Card>
                ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
