import { historyForRepo } from "@/lib/storage";
import { getRepository, getLatestMetrics } from "@/lib/enrichment";
import { getLatestScoreForRepo } from "@/lib/scoring-store";
import { computeHeat } from "@/lib/heat";
import { Sparkline } from "@/components/repo/Sparkline";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LanguageDot } from "@/components/ui/LanguageDot";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { GitCompare, Scale, Calendar, Tag } from "lucide-react";
import { CompareInput } from "./CompareInput";
import Link from "next/link";

export const dynamic = "force-dynamic";

type CompareRow = {
  key: string;
  owner: string;
  repo: string;
  found: boolean;
  language: string | null;
  description: string | null;
  rank: number | null;
  totalStars: number | null;
  starsGained: number | null;
  heat: number;
  rankHistory: number[];
  // Phase 2.1 V2 polish — extended cols
  forks: number | null;
  contributors: number | null;
  license: string | null;
  pushedAt: string | null;
  latestReleaseTag: string | null;
  latestReleaseAt: string | null;
  radarScore: number | null;
  riskPenalty: number | null;
  recommendation: string | null;
  confidence: string | null;
  riskFlags: string[];
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

async function loadCompareData(keys: string[]): Promise<CompareRow[]> {
  const valid = keys
    .map((k) => k.trim())
    .filter((k) => k.includes("/"))
    .map((k) => {
      const [owner, repo] = k.split("/");
      return { key: k, owner, repo };
    });

  // Fetch in parallel
  const fetches = await Promise.all(
    valid.map(async (v) => {
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

    if (!latest && !repository) {
      return {
        key: v.key,
        owner: v.owner,
        repo: v.repo,
        found: false,
        language: null,
        description: null,
        rank: null,
        totalStars: null,
        starsGained: null,
        heat: 0,
        rankHistory: [],
        forks: null,
        contributors: null,
        license: null,
        pushedAt: null,
        latestReleaseTag: null,
        latestReleaseAt: null,
        radarScore: null,
        riskPenalty: null,
        recommendation: null,
        confidence: null,
        riskFlags: [],
      };
    }

    const rank = latest?.rank ?? null;
    const totalStars = metrics?.total_stars ?? latest?.total_stars ?? null;
    const starsGained = latest?.stars_gained ?? null;

    return {
      key: v.key,
      owner: v.owner,
      repo: v.repo,
      found: true,
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
      latestReleaseTag: metrics?.latest_release_tag ?? null,
      latestReleaseAt: metrics?.latest_release_at ?? null,
      radarScore: score ? Number(score.radar_score) : null,
      riskPenalty: score ? Number(score.risk_penalty) : null,
      recommendation: score?.recommendation ?? null,
      confidence: score?.confidence ?? null,
      riskFlags: score?.risk_flags ?? [],
    };
  });
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const reposParam = Array.isArray(sp.repos) ? sp.repos[0] : sp.repos;
  const keys = (reposParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const data = keys.length > 0 ? await loadCompareData(keys) : [];

  return (
    <main>
      <PageHeader
        eyebrow="Compare"
        title="So sánh repos"
        description="Side-by-side với Radar Score, Risk, License, Maintenance — đánh giá adopt-readiness."
      />

      <CompareInput initialValue={keys.join(", ")} />

      {data.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={GitCompare}
            title="Chưa có repo nào"
            description="Nhập ít nhất 1 repo (vd: vercel/next.js, facebook/react) rồi nhấn Enter."
          />
        </div>
      ) : (
        <Card className="mt-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-3 text-left">Repo</th>
                  <th className="px-3 py-3 text-left">Lang</th>
                  <th className="px-3 py-3 text-right">Total ★</th>
                  <th className="px-3 py-3 text-right">Forks</th>
                  <th className="px-3 py-3 text-right">Contrib</th>
                  <th className="px-3 py-3 text-left">License</th>
                  <th className="px-3 py-3 text-left">Pushed</th>
                  <th className="px-3 py-3 text-left">Release</th>
                  <th className="px-3 py-3 text-right">Heat</th>
                  <th className="px-3 py-3 text-right">Radar</th>
                  <th className="px-3 py-3 text-right">Risk</th>
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
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-orange-600 dark:text-orange-400">
                      {r.found ? r.heat : "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-bold text-brand-600 dark:text-brand-400">
                      {r.radarScore != null ? r.radarScore : "—"}
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
      )}

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
    </main>
  );
}
