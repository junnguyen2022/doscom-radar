import { historyForRepo } from "@/lib/storage";
import { computeHeat } from "@/lib/heat";
import { classify, CLASS_LABEL } from "@/lib/classify";
import { Sparkline } from "@/components/repo/Sparkline";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LanguageDot } from "@/components/ui/LanguageDot";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { GitCompare } from "lucide-react";
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
  classification: ReturnType<typeof classify>;
  rankHistory: number[];
};

const CLASS_TONE: Record<
  ReturnType<typeof classify>,
  "success" | "warning" | "danger"
> = {
  adopt: "success",
  monitor: "warning",
  caution: "danger",
};

async function loadCompareData(keys: string[]): Promise<CompareRow[]> {
  const valid = keys
    .map((k) => k.trim())
    .filter((k) => k.includes("/"))
    .map((k) => {
      const [owner, repo] = k.split("/");
      return { key: k, owner, repo };
    });

  const histories = await Promise.all(
    valid.map((v) => historyForRepo(v.owner, v.repo, "daily")),
  );

  return valid.map(({ key, owner, repo }, i) => {
    const hist = histories[i];
    const latest = hist.at(-1);
    if (!latest) {
      return {
        key,
        owner,
        repo,
        found: false,
        language: null,
        description: null,
        rank: null,
        totalStars: null,
        starsGained: null,
        heat: 0,
        classification: "monitor" as const,
        rankHistory: [],
      };
    }
    return {
      key,
      owner,
      repo,
      found: true,
      language: latest.language,
      description: latest.description,
      rank: latest.rank,
      totalStars: latest.total_stars,
      starsGained: latest.stars_gained,
      heat: computeHeat({
        starsGained: latest.stars_gained,
        totalStars: latest.total_stars,
        rank: latest.rank,
      }),
      classification: classify({
        starsGained: latest.stars_gained,
        totalStars: latest.total_stars,
        language: latest.language,
      }),
      rankHistory: hist.map((s) => s.rank),
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
        description="Side-by-side. Nhập owner/repo, ngăn cách bằng dấu phẩy."
      />

      <CompareInput initialValue={keys.join(", ")} />

      {data.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={GitCompare}
            title="Chưa có repo nào"
            description="Nhập ít nhất 1 repo (ví dụ: vercel/next.js, facebook/react) rồi nhấn Enter."
          />
        </div>
      ) : (
        <Card className="mt-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 text-left">Repo</th>
                  <th className="px-4 py-3 text-left">Lang</th>
                  <th className="px-4 py-3 text-left">Class</th>
                  <th className="px-4 py-3 text-right">Rank</th>
                  <th className="px-4 py-3 text-right">Total ★</th>
                  <th className="px-4 py-3 text-right">Gained</th>
                  <th className="px-4 py-3 text-right">Heat</th>
                  <th className="px-4 py-3 text-left">History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {data.map((r) => (
                  <tr
                    key={r.key}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/repo/${r.owner}/${r.repo}`}
                        className="text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
                      >
                        {r.owner}/{r.repo}
                      </Link>
                      {!r.found && (
                        <span className="ml-2 text-xs text-rose-500">
                          not in snapshots
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.language ? (
                        <span className="inline-flex items-center gap-1.5">
                          <LanguageDot language={r.language} />
                          {r.language}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.found && (
                        <Badge tone={CLASS_TONE[r.classification]}>
                          {CLASS_LABEL[r.classification].vi}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.rank != null ? `#${r.rank}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.totalStars != null
                        ? r.totalStars.toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {r.starsGained != null
                        ? `+${r.starsGained.toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-orange-600 dark:text-orange-400">
                      {r.found ? r.heat : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {r.rankHistory.length > 1 ? (
                        <Sparkline ranks={r.rankHistory} width={80} height={20} />
                      ) : (
                        <span className="text-xs text-zinc-400">
                          {r.rankHistory.length === 1 ? "1 pt" : "—"}
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
