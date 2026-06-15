// Brand Discovery — repo hợp DOSCOM/NOMA tìm chủ động qua GitHub Search,
// không giới hạn ở trending. Tab brand qua ?brand= (mặc định doscom).

import Link from "next/link";
import { ExternalLink, Star, Compass, Clock } from "lucide-react";
import { discoverForBrand } from "@/lib/github-search";
import { BRAND_LIST, type BrandId } from "@/lib/config/brand-core";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

function tierTone(tier: string): string {
  if (tier === "high")
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (tier === "medium")
    return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

function sinceLabel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 1) return "hôm nay";
  if (days < 30) return `${days} ngày trước`;
  if (days < 365) return `${Math.floor(days / 30)} tháng trước`;
  return `${Math.floor(days / 365)} năm trước`;
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.brand) ? sp.brand[0] : sp.brand;
  const brand: BrandId = raw === "noma" ? "noma" : "doscom";

  const result = await discoverForBrand(brand);

  return (
    <main>
      <PageHeader
        eyebrow="Brand Discovery"
        title="Khám phá repo theo thương hiệu"
        description="Tìm chủ động trên toàn GitHub (không chỉ trending) repo hợp DOSCOM/NOMA. Xếp theo độ phù hợp brand."
      />

      {/* Brand tabs */}
      <div className="mb-5 flex gap-2">
        {BRAND_LIST.map((b) => {
          const active = b.id === brand;
          return (
            <Link
              key={b.id}
              href={`/discover?brand=${b.id}`}
              className={
                active
                  ? "inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm"
                  : "inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3.5 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }
            >
              <Compass className="h-3.5 w-3.5" />
              {b.name}
            </Link>
          );
        })}
      </div>

      {result.error ? (
        <EmptyState
          icon={Compass}
          title="Không tìm được"
          description={`GitHub Search lỗi: ${result.error}. Kiểm tra GITHUB_TOKEN trên Vercel.`}
        />
      ) : result.repos.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="Chưa có repo khớp"
          description="Không có repo nào vượt ngưỡng cho brand này. Thử nới điều kiện trong lib/github-search.ts."
        />
      ) : (
        <>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            {result.repos.length} repo hợp <b>{result.brandName}</b> · nguồn:
            GitHub Search (cache 6h)
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {result.repos.map((r) => (
              <Card key={`${r.owner}/${r.repo}`} hoverable className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/repo/${r.owner}/${r.repo}`}
                    className="truncate font-semibold text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
                  >
                    {r.owner}/{r.repo}
                  </Link>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    title="Mở trên GitHub"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                {r.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {r.description}
                  </p>
                )}

                <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${tierTone(r.fit.tier)}`}
                    title={`Khớp: ${r.fit.matched.join(", ")}`}
                  >
                    fit {r.fit.score} · {r.fit.tier}
                  </span>
                  {r.language && (
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {r.language}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-zinc-500">
                    <Star className="h-3 w-3" />
                    {r.stars.toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1 text-zinc-500">
                    <Clock className="h-3 w-3" />
                    {sinceLabel(r.pushedAt)}
                  </span>
                </div>

                <p className="mt-2 truncate font-mono text-[10px] text-zinc-400">
                  khớp: {r.fit.matched.join(", ")}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
