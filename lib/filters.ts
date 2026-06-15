import type { Timeframe } from "./github-trending";
import type { Classification } from "./classify";

export type SortKey = "heat" | "gained" | "total" | "rank" | "brand";

export type BrandFilter = "" | "doscom" | "noma";

export type Filters = {
  timeframe: Timeframe;
  languages: string[];
  minTotalStars: number;
  minStarsGained: number;
  search: string;
  sort: SortKey;
  topN: number; // 0 = all
  classes: Classification[];
  collection: string; // collection slug, "" = no filter
  brand: BrandFilter; // "" = mọi brand
};

export const DEFAULT_FILTERS: Filters = {
  timeframe: "daily",
  languages: [],
  minTotalStars: 0,
  minStarsGained: 0,
  search: "",
  sort: "heat",
  topN: 0,
  classes: ["adopt", "monitor", "caution"],
  collection: "",
  brand: "",
};

export function parseFilters(
  sp: Record<string, string | string[] | undefined>,
): Filters {
  const get = (k: string): string | undefined => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const tf = get("tf");
  const timeframe: Timeframe =
    tf === "weekly" || tf === "monthly" ? tf : "daily";

  const langs = (get("langs") ?? "").split(",").filter(Boolean);

  const sortStr = get("sort");
  const sort: SortKey =
    sortStr === "gained" ||
    sortStr === "total" ||
    sortStr === "rank" ||
    sortStr === "brand"
      ? sortStr
      : "heat";

  const brandStr = get("brand");
  const brand: BrandFilter =
    brandStr === "doscom" || brandStr === "noma" ? brandStr : "";

  const classesStr = (get("classes") ?? "").split(",").filter(Boolean);
  const classes = classesStr.length
    ? (classesStr.filter((c) =>
        ["adopt", "monitor", "caution"].includes(c),
      ) as Classification[])
    : DEFAULT_FILTERS.classes;

  const minTotal = parseInt(get("minTotal") ?? "0", 10) || 0;
  const minGained = parseInt(get("minGained") ?? "0", 10) || 0;
  const topN = parseInt(get("topN") ?? "0", 10) || 0;

  return {
    timeframe,
    languages: langs,
    minTotalStars: minTotal,
    minStarsGained: minGained,
    search: (get("q") ?? "").trim(),
    sort,
    topN,
    classes,
    collection: (get("collection") ?? "").trim(),
    brand,
  };
}

export function filtersToQuery(f: Filters): string {
  const params = new URLSearchParams();
  if (f.timeframe !== "daily") params.set("tf", f.timeframe);
  if (f.languages.length) params.set("langs", f.languages.join(","));
  if (f.minTotalStars > 0) params.set("minTotal", String(f.minTotalStars));
  if (f.minStarsGained > 0) params.set("minGained", String(f.minStarsGained));
  if (f.search) params.set("q", f.search);
  if (f.sort !== "heat") params.set("sort", f.sort);
  if (f.topN > 0) params.set("topN", String(f.topN));
  if (f.classes.length !== 3) params.set("classes", f.classes.join(","));
  if (f.collection) params.set("collection", f.collection);
  if (f.brand) params.set("brand", f.brand);
  return params.toString();
}
