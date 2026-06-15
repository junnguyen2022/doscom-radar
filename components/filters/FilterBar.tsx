"use client";

import { Search, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/AppProvider";
import { t } from "@/lib/i18n";
import {
  type Filters,
  type SortKey,
  type BrandFilter,
  filtersToQuery,
} from "@/lib/filters";
import type { Classification } from "@/lib/classify";
import type { Timeframe } from "@/lib/github-trending";
import { Card } from "@/components/ui/Card";

export function FilterBar({
  current,
  availableLanguages,
}: {
  current: Filters;
  availableLanguages: string[];
}) {
  const router = useRouter();
  const { lang } = useApp();

  function update(patch: Partial<Filters>) {
    const next = { ...current, ...patch };
    const qs = filtersToQuery(next);
    router.push(qs ? `?${qs}` : "?");
  }

  function reset() {
    router.push(window.location.pathname);
  }

  const TIMEFRAMES: { key: Timeframe; label: string }[] = [
    { key: "daily", label: t("today", lang) },
    { key: "weekly", label: t("this_week", lang) },
    { key: "monthly", label: t("this_month", lang) },
  ];

  const SORTS: { key: SortKey; label: string }[] = [
    { key: "heat", label: t("heat", lang) },
    { key: "gained", label: t("stars_gained", lang) },
    { key: "total", label: t("total_stars", lang) },
    { key: "rank", label: t("rank", lang) },
    { key: "brand", label: "Brand fit" },
  ];

  const BRANDS: { key: BrandFilter; label: string }[] = [
    { key: "", label: lang === "vi" ? "Tất cả" : "All" },
    { key: "doscom", label: "DOSCOM" },
    { key: "noma", label: "NOMA" },
  ];

  const TOPS = [10, 20, 50, 0];

  const CLASSES: {
    key: Classification;
    key_t: "cls_adopt" | "cls_monitor" | "cls_caution";
  }[] = [
    { key: "adopt", key_t: "cls_adopt" },
    { key: "monitor", key_t: "cls_monitor" },
    { key: "caution", key_t: "cls_caution" },
  ];

  return (
    <Card className="mb-6 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Timeframe pills */}
        <div className="flex rounded-lg bg-zinc-100 p-0.5 text-xs dark:bg-zinc-800">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.key}
              type="button"
              onClick={() => update({ timeframe: tf.key })}
              className={
                current.timeframe === tf.key
                  ? "rounded-md bg-white px-3 py-1.5 font-medium text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                  : "rounded-md px-3 py-1.5 text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder={t("search_placeholder", lang)}
            defaultValue={current.search}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                update({ search: (e.target as HTMLInputElement).value });
              }
            }}
            className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-500"
          />
        </div>

        {/* Sort */}
        <select
          value={current.sort}
          onChange={(e) => update({ sort: e.target.value as SortKey })}
          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {t("sort_by", lang)}: {s.label}
            </option>
          ))}
        </select>

        {/* TopN */}
        <select
          value={current.topN}
          onChange={(e) => update({ topN: parseInt(e.target.value, 10) })}
          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        >
          {TOPS.map((n) => (
            <option key={n} value={n}>
              {t("show_top", lang)}: {n === 0 ? t("all", lang) : `Top ${n}`}
            </option>
          ))}
        </select>

        {/* Min total stars */}
        <input
          type="number"
          min={0}
          step={1000}
          placeholder="Min ★"
          defaultValue={current.minTotalStars || ""}
          onBlur={(e) =>
            update({ minTotalStars: parseInt(e.target.value, 10) || 0 })
          }
          className="w-24 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
          title={t("min_total_stars", lang)}
        />

        {/* Min gained */}
        <input
          type="number"
          min={0}
          step={50}
          placeholder="Min +★"
          defaultValue={current.minStarsGained || ""}
          onBlur={(e) =>
            update({ minStarsGained: parseInt(e.target.value, 10) || 0 })
          }
          className="w-24 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
          title={t("min_gained", lang)}
        />

        <button
          type="button"
          onClick={reset}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <RotateCcw className="h-3 w-3" />
          {t("reset", lang)}
        </button>
      </div>

      {/* Classification chips */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Phân loại:
        </span>
        {CLASSES.map((c) => {
          const enabled = current.classes.includes(c.key);
          const tones: Record<typeof c.key, string> = {
            adopt: enabled
              ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50"
              : "border border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-500",
            monitor: enabled
              ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50"
              : "border border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-500",
            caution: enabled
              ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/50"
              : "border border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-500",
          };
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                const next = enabled
                  ? current.classes.filter((x) => x !== c.key)
                  : [...current.classes, c.key];
                update({ classes: next.length ? next : current.classes });
              }}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-all ${tones[c.key]}`}
            >
              {t(c.key_t, lang)}
            </button>
          );
        })}
      </div>

      {/* Brand filter */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {lang === "vi" ? "Thương hiệu" : "Brand"}:
        </span>
        {BRANDS.map((b) => {
          const active = current.brand === b.key;
          return (
            <button
              key={b.key || "all"}
              type="button"
              onClick={() => update({ brand: b.key })}
              className={
                active
                  ? "rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm"
                  : "rounded-full border border-zinc-300 px-2.5 py-0.5 text-xs text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
              }
            >
              {b.label}
            </button>
          );
        })}
      </div>

      {/* Languages */}
      {availableLanguages.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {t("language", lang)}:
          </span>
          {availableLanguages.map((l) => {
            const enabled = current.languages.includes(l);
            return (
              <button
                key={l}
                type="button"
                onClick={() => {
                  const next = enabled
                    ? current.languages.filter((x) => x !== l)
                    : [...current.languages, l];
                  update({ languages: next });
                }}
                className={
                  enabled
                    ? "rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm"
                    : "rounded-full border border-zinc-300 px-2.5 py-0.5 text-xs text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
                }
              >
                {l}
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
