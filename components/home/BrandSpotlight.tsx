import Link from "next/link";
import { Shield, Car, ArrowRight, Star } from "lucide-react";
import { Card } from "@/components/ui/Card";

export type BrandPick = {
  owner: string;
  repo: string;
  url: string;
  score: number;
  tier: string;
  stars: number | null;
  language: string | null;
};

export type BrandGroup = {
  brandId: "doscom" | "noma";
  brandName: string;
  items: BrandPick[];
};

const ICON = { doscom: Shield, noma: Car };
const ACCENT = {
  doscom: "text-indigo-600 dark:text-indigo-400",
  noma: "text-blue-600 dark:text-blue-400",
};

export function BrandSpotlight({ groups }: { groups: BrandGroup[] }) {
  return (
    <section className="mb-12">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
          🎯 Repo theo thương hiệu
        </h2>
        <Link
          href="/discover"
          className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          Khám phá thêm →
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => {
          const Icon = ICON[g.brandId];
          return (
            <Card key={g.brandId} className="p-4">
              <header className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${ACCENT[g.brandId]}`} />
                  <span className="text-sm font-semibold">{g.brandName}</span>
                </div>
                <Link
                  href={`/discover?brand=${g.brandId}`}
                  className="inline-flex items-center gap-0.5 text-xs text-zinc-500 hover:text-brand-600 dark:text-zinc-400 dark:hover:text-brand-400"
                >
                  Discovery <ArrowRight className="h-3 w-3" />
                </Link>
              </header>

              {g.items.length === 0 ? (
                <p className="py-3 text-sm text-zinc-400">
                  Tuần này chưa có repo trending khớp — xem{" "}
                  <Link
                    href={`/discover?brand=${g.brandId}`}
                    className="text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Discovery
                  </Link>{" "}
                  để tìm thêm.
                </p>
              ) : (
                <ul className="space-y-2">
                  {g.items.map((it) => (
                    <li
                      key={`${it.owner}/${it.repo}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <Link
                        href={`/repo/${it.owner}/${it.repo}`}
                        className="min-w-0 flex-1 truncate text-sm text-zinc-800 hover:text-brand-600 dark:text-zinc-200 dark:hover:text-brand-400"
                      >
                        {it.owner}/<span className="font-medium">{it.repo}</span>
                      </Link>
                      <span className="flex shrink-0 items-center gap-2 text-xs text-zinc-500">
                        <span
                          className={`rounded px-1.5 py-0.5 font-semibold ${
                            it.tier === "high"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {it.score}
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <Star className="h-3 w-3" />
                          {(it.stars ?? 0).toLocaleString()}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
